import { test,expect } from '@playwright/test';
import { mockBackend,signIn,openNav,ids,fixtureUser } from './backend-fixture.js';

test('login uses the API tenant and real lists; logout clears credentials and protected views',async({page})=>{
  const {calls}=await mockBackend(page);await signIn(page);
  await expect(page.getByRole('heading',{name:/Xin chào/})).toBeVisible();
  await expect(page.locator('.tenant-card')).toContainText('Company supplied by API');
  await openNav(page,'Hồ sơ');await expect(page.locator('#dossier-results')).toContainText('Server dossier');
  const protectedCall=calls.find(call=>call.path==='/api/v1/dossiers');expect(protectedCall.headers.authorization).toBe('Bearer fixture-token');
  expect(calls.find(call=>call.path.endsWith('/login')).headers.authorization).toBeUndefined();
  await page.getByRole('button',{name:'Tài khoản',exact:true}).click();await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();
  expect(await page.evaluate(()=>Object.values(localStorage).some(value=>value.includes('fixture-token')))).toBe(false);
  await page.reload();await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();
});
test('signup submits the nested company DTO and returns to sign in without assuming a token',async({page})=>{
  const {calls}=await mockBackend(page);await page.goto('/#/signup');
  for(const [label,value] of [['Tên công ty','Synthetic Company'],['Tên người đại diện','First Admin'],['Email quản trị','admin@example.test'],['Tên đăng nhập','synthetic-admin'],['Mật khẩu','twelve-chars-password'],['Xác nhận mật khẩu','twelve-chars-password']])await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByRole('button',{name:'Đăng ký doanh nghiệp'}).click();await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();
  const body=JSON.parse(calls.find(call=>call.path.endsWith('/signup')).body);expect(body.company.name).toBe('Synthetic Company');expect(body.full_name).toBe('First Admin');expect(body.email).toBe('admin@example.test');expect(body).not.toHaveProperty('confirmPassword');expect(calls.some(call=>call.path.endsWith('/login'))).toBe(false);
});
test('detail masks PII, explicitly reveals it and fetches protected original content',async({page})=>{
  const {calls}=await mockBackend(page);await signIn(page);await page.reload();
  // A page reload intentionally clears the memory-only session.
  await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();await signIn(page);
  await page.evaluate(id=>{location.hash='/detail/'+id+'?tab=documents';},ids.dossier);
  await expect(page.locator('.field-value')).toContainText('••••••');await expect(page.locator('#app')).not.toContainText('Private API value');
  await page.getByRole('button',{name:'Hiện Sensitive name'}).click();await expect(page.locator('.field-value')).toContainText('Private API value');
  await page.getByRole('button',{name:'Xem bản gốc',exact:true}).click();await expect(page.locator('.source-image img')).toHaveAttribute('src',/^blob:/);
  expect(calls.find(call=>call.path.endsWith('/content')).headers.authorization).toBe('Bearer fixture-token');
  await page.getByRole('button',{name:'Tổng quan',exact:true}).last().click();await page.getByRole('button',{name:/^Tài liệu \d/}).click();await expect(page.locator('.field-value')).not.toContainText('Private API value');
});
test('409 reloads the revision, prevents a blind resubmit and does not repeat the mutation',async({page})=>{
  const {calls}=await mockBackend(page,{intercept:({call,reply,bundle})=>{if(call.path.includes('/fields/')){bundle.dossier.version=5;reply(null,409);return true;}return false;}});
  await signIn(page);await page.evaluate(id=>{location.hash='/detail/'+id+'?tab=documents';},ids.dossier);
  await page.getByRole('button',{name:'Sửa',exact:true}).click();await page.getByLabel('Giá trị mới').fill('Correction');await page.getByLabel('Ghi chú').fill('Checked source');await page.getByRole('button',{name:'Lưu và đối soát lại'}).click();
  await expect(page.locator('#form-error')).toContainText('Đã tải phiên bản mới');await expect(page.getByRole('button',{name:'Lưu và đối soát lại'})).toBeDisabled();
  const mutations=calls.filter(call=>call.path.includes('/fields/'));expect(mutations).toHaveLength(1);expect(JSON.parse(mutations[0].body).expected_version).toBe(4);
  await page.getByRole('button',{name:'Hủy',exact:true}).click();await expect(page.locator('.detail-meta')).toContainText('Lượt xử lý 5');
});
test('broker uses server permissions and never requests the company user directory',async({page})=>{
  const {calls}=await mockBackend(page,{user:{...fixtureUser,role:'broker',permissions:['dossier:read','dossier:create','dossier:upload']}});await signIn(page);
  await expect(page.locator('#dossier-results')).toContainText('Server dossier');expect(calls.some(call=>call.path==='/api/v1/auth/users')).toBe(false);
  await expect(page.locator('nav').getByRole('button',{name:'Thành viên',exact:true})).toHaveCount(0);
});
test('upload shows independent duplicate and rejected results without claiming OCR completion',async({page})=>{
  const {calls}=await mockBackend(page,{intercept:({call,reply})=>{
    if(call.path.endsWith('/files')&&call.method==='POST'){reply({batch_id:ids.file,files:[{id:ids.file,name:'a.pdf',status:'DUPLICATE'},{name:'b.pdf',status:'REJECTED',error:'Unsupported file content'}]});return true;}return false;
  }});
  await signIn(page);await page.evaluate(id=>{location.hash='/detail/'+id;},ids.dossier);await page.getByRole('button',{name:'Thêm tài liệu'}).click();
  await page.locator('input[type="file"]').setInputFiles([{name:'a.pdf',mimeType:'application/pdf',buffer:Buffer.from('a')},{name:'b.pdf',mimeType:'application/pdf',buffer:Buffer.from('b')}]);
  await page.getByRole('button',{name:'Tải tài liệu lên'}).click();await expect(page.locator('#upload-results')).toContainText('Trùng nội dung');await expect(page.locator('#upload-results')).toContainText('Unsupported file content');await expect(page.getByRole('button',{name:'Hoàn tất',exact:true})).toBeVisible();
  expect(calls.filter(call=>call.path.endsWith('/files')&&call.method==='POST')).toHaveLength(1);
});
test('pagination and date filters use server history query parameters',async({page})=>{
  const {calls}=await mockBackend(page,{intercept:({call,reply,bundle})=>{
    if(call.path==='/api/v1/dossiers'&&call.method==='GET'){const offset=Number(call.url.searchParams.get('offset')||0);reply({items:[bundle.dossier],total:21,limit:20,offset});return true;}return false;
  }});
  await signIn(page);await openNav(page,'Hồ sơ');await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(page.locator('.pagination')).toContainText('21–21 / 21');
  await page.getByRole('button',{name:'Ngày chuyển trạng thái'}).click();await page.getByLabel('Từ ngày').fill('2026-10-01');await page.getByLabel('Đến ngày').fill('2026-10-31');await page.getByRole('button',{name:'Áp dụng',exact:true}).click();
  await expect.poll(()=>calls.filter(call=>call.path==='/api/v1/dossiers').at(-1).url.searchParams.get('from')).toBe('2026-10-01');
  const url=calls.filter(call=>call.path==='/api/v1/dossiers').at(-1).url;expect(url.searchParams.get('to')).toBe('2026-10-31');expect(url.searchParams.get('offset')).toBe('0');expect(url.searchParams.get('timezone')).toBe('Asia/Ho_Chi_Minh');
});
test('401 ends the session while 403 keeps the account and shows the API error',async({page})=>{
  let status=403;
  const {calls}=await mockBackend(page,{intercept:({call,reply})=>{if(call.path==='/api/v1/audit-logs'){reply(null,status);return true;}return false;}});
  await signIn(page);await openNav(page,'Nhật ký hoạt động');await expect(page.getByRole('heading',{name:'Không thể tải dữ liệu'})).toBeVisible();await expect(page.locator('.sidebar')).toBeVisible();
  status=401;await page.getByRole('button',{name:'Tải lại',exact:true}).click();await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();await expect(page.locator('.sidebar')).toHaveCount(0);
  expect(calls.filter(call=>call.path==='/api/v1/audit-logs')).toHaveLength(2);
});
test('nullable metrics and detail arrays render empty states in both languages',async({page})=>{
  await mockBackend(page,{intercept:({call,reply,bundle})=>{
    if(call.path==='/api/v1/dashboard/statuses'){reply({metric:'current',totals:null,daily:[{date:'2026-10-31',counts:null}]});return true;}
    if(call.path===`/api/v1/dossiers/${ids.dossier}`){reply({...bundle,files:null,fields:null,document_groups:null,checklist:null,issues:null,decisions:null});return true;}
    return false;
  }});
  await signIn(page);await expect(page.getByRole('heading',{name:/Xin chào/})).toBeVisible();await expect(page.locator('.stat-value').first()).toContainText('00');
  await page.getByLabel('Ngôn ngữ / Language').selectOption('en');await expect(page.getByRole('heading',{name:/Hello,/})).toBeVisible();
  await page.evaluate(id=>{location.hash='/detail/'+id+'?tab=documents';},ids.dossier);await expect(page.getByRole('heading',{name:'No documents yet'}).first()).toBeVisible();
  await page.getByLabel('Ngôn ngữ / Language').selectOption('vi');await expect(page.getByRole('heading',{name:'Chưa có tài liệu'}).first()).toBeVisible();
  await expect(page.getByRole('heading',{name:'Không thể mở nội dung'})).toHaveCount(0);
});
test('mixed PDF classification requires a group and derived views retain the original source page',async({page})=>{
  const derived1='77777777-7777-4777-8777-777777777777',derived2='88888888-8888-4888-8888-888888888888';
  const group1='99999999-9999-4999-8999-999999999999',group2='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const {calls,bundle}=await mockBackend(page,{intercept:({call,reply})=>{
    if(call.path.endsWith('/classification')){reply(null,202);return true;}return false;
  }});
  bundle.files=[{...bundle.files[0],original_name:'mixed.pdf',mime:'application/pdf',document_type:'',source_pages:[1,2]},
    {...bundle.files[0],id:derived1,original_name:'document-1.pdf',mime:'application/pdf',source_file_id:ids.file,source_pages:[1]},
    {...bundle.files[0],id:derived2,original_name:'document-2.pdf',mime:'application/pdf',source_file_id:ids.file,source_pages:[2]}];
  bundle.document_groups=[{id:group1,file_id:derived1,document_type:'identity',role:'seller',pages:[1]},{id:group2,file_id:derived2,document_type:'identity',role:'buyer',pages:[2]}];
  bundle.fields=[{...bundle.fields[0],label:'Seller name',document_group_id:group1},
    {...bundle.fields[0],id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',label:'Buyer name',document_group_id:group2,page:2}];
  await signIn(page);await page.evaluate(id=>{location.hash='/detail/'+id+'?tab=documents';},ids.dossier);
  await expect(page.locator('#classify-group option')).toHaveCount(3);
  await page.getByRole('button',{name:'Xác nhận phân loại',exact:true}).click();await expect(page.locator('#toast')).toContainText('Chọn nhóm tài liệu');
  expect(calls.filter(call=>call.path.endsWith('/classification'))).toHaveLength(0);
  await page.locator('#classify-group').selectOption(group2);await expect(page.locator('#classify-role')).toHaveValue('buyer');await expect(page.locator('#classify-select')).toHaveValue('identity');
  await page.getByRole('button',{name:'Xác nhận phân loại',exact:true}).click();await expect.poll(()=>calls.filter(call=>call.path.endsWith('/classification')).length).toBe(1);
  const body=JSON.parse(calls.find(call=>call.path.endsWith('/classification')).body);expect(body.document_group_id).toBe(group2);expect(body.expected_version).toBe(4);expect(body.role).toBe('buyer');
  await page.locator(`[data-doc="${derived2}"]`).click();await expect(page.locator('.page-indicator')).toHaveText('Trang 2');
  await expect(page.locator('.field-row')).toHaveCount(1);await expect(page.locator('.field-label')).toContainText('Buyer name');await expect(page.locator('#classify-group')).toHaveValue(group2);
  await page.getByLabel('Ngôn ngữ / Language').selectOption('en');await expect(page.locator('.page-indicator')).toHaveText('Page 2');
});
