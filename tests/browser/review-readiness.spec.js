import { test,expect } from '@playwright/test';
import { mockBackend,signIn,ids } from './backend-fixture.js';

function reviewFixture(bundle) {
  bundle.dossier.version=14;
  bundle.fields[0]={...bundle.fields[0],label:'Ngày ký hợp đồng',type:'date',required:true,value:'2026-10-31',validation:'VALID'};
  bundle.issues=[{id:'acknowledged',rule_code:'field:'+ids.field,code:'FIELD_NEEDS_VERIFICATION',status:'ACKNOWLEDGED',severity:'WARNING',message:'Cảnh báo đã được kiểm tra',acknowledged_by:ids.user,acknowledgement:'Đã kiểm tra và chấp nhận',evidence:[{field_id:ids.field}]}];
}

test('approval stays disabled while a required-field warning is unconfirmed',async({page},info)=>{
  const {calls,bundle}=await mockBackend(page);reviewFixture(bundle);
  bundle.fields[0].value='';bundle.fields[0].validation='MISSING';
  bundle.issues[0].status='OPEN';
  await signIn(page);await page.evaluate(id=>{location.hash='/detail/'+id+'?tab=issues';},ids.dossier);
  await expect(page.getByRole('button',{name:'Phê duyệt',exact:true})).toBeDisabled();
  await expect(page.locator('.panel-heading .count-label')).toHaveText('1 cần xử lý');
  await expect(page.locator('.review-required-notice')).toContainText('1 thông tin bắt buộc cần xử lý');
  await expect(page.locator('.review-required-notice')).toContainText('xác nhận chấp nhận từng cảnh báo kèm lý do');
  await expect(page.locator('.decision-panel')).toContainText('Cần kiểm tra và xác nhận các thông tin bắt buộc còn cảnh báo');
  await expect(page.locator('.decision-panel')).toContainText('Ngày ký hợp đồng');
  await page.locator('.decision-panel').screenshot({path:`test-results/${info.project.name}-review-readiness.png`});
  await page.getByRole('button',{name:'Kiểm tra dữ liệu trích xuất',exact:true}).click();
  await expect(page.locator('.field-label')).toContainText('Ngày ký hợp đồng');
  await expect(page.getByRole('button',{name:'Sửa',exact:true})).toBeEnabled();
  expect(calls.filter(call=>call.path.endsWith('/decisions'))).toHaveLength(0);
});

test('missing-field link selects the correct document and a valid correction enables approval',async({page},info)=>{
  const targetFile='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const {calls,bundle}=await mockBackend(page,{intercept:({call,reply,bundle})=>{
    if(call.method==='PATCH'&&call.path.endsWith('/fields/'+ids.field)){
      const input=JSON.parse(call.body);bundle.fields[0].value=input.value;bundle.fields[0].validation='VALID';bundle.fields[0].confidence=1;bundle.fields[0].corrected=true;bundle.issues[0].status='RESOLVED';bundle.dossier.version=15;reply(null);return true;
    }
    return false;
  }});reviewFixture(bundle);
  bundle.files.push({...bundle.files[0],id:targetFile,original_name:'Hợp đồng cần kiểm tra.pdf'});
  bundle.fields[0].file_id=targetFile;bundle.fields[0].value='';bundle.fields[0].validation='MISSING';
  bundle.issues[0].status='OPEN';
  await signIn(page);await page.evaluate(id=>{location.hash='/detail/'+id+'?tab=issues';},ids.dossier);
  await expect(page.getByRole('button',{name:'Phê duyệt',exact:true})).toBeDisabled();
  await page.locator('.review-required-notice').getByRole('button',{name:'Ngày ký hợp đồng',exact:true}).click();
  await expect(page.locator('.document-item.selected')).toContainText('Hợp đồng cần kiểm tra.pdf');
  await expect(page.locator('.field-row.is-focused')).toContainText('Ngày ký hợp đồng');
  await page.locator('.field-row.is-focused').getByRole('button',{name:'Sửa',exact:true}).click();
  await page.getByLabel('Giá trị mới',{exact:true}).fill('2026-10-31');await page.getByLabel('Ghi chú',{exact:true}).fill('Đã đối chiếu giấy tờ gốc');
  await page.getByRole('button',{name:'Lưu và đối soát lại',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button',{name:'Đối soát & kiểm duyệt',exact:true}).click();
  await expect(page.locator('.review-required-notice')).toHaveCount(0);await expect(page.locator('.panel-heading .count-label')).toHaveText('0 cần xử lý');await expect(page.getByRole('button',{name:'Phê duyệt',exact:true})).toBeEnabled();
  expect(calls.filter(call=>call.path.endsWith('/decisions'))).toHaveLength(0);
  await page.screenshot({path:`test-results/${info.project.name}-review-corrected.png`,fullPage:false});
});

test('approval 409 at the same version explains required fields and prevents a blind resubmit',async({page})=>{
  const {calls,bundle}=await mockBackend(page,{intercept:({call,reply,bundle})=>{
    if(call.path.endsWith('/decisions')){
      bundle.fields[0].value='';bundle.fields[0].validation='MISSING';bundle.issues[0].status='OPEN';reply(null,409);return true;
    }
    return false;
  }});reviewFixture(bundle);
  await signIn(page);await page.evaluate(id=>{location.hash='/detail/'+id+'?tab=issues';},ids.dossier);
  await page.getByRole('button',{name:'Phê duyệt',exact:true}).click();
  await page.getByLabel('Kết luận kiểm duyệt').fill('Đã kiểm tra');
  await page.getByRole('button',{name:'Xác nhận quyết định',exact:true}).click();
  await expect(page.locator('#form-error')).toContainText('thông tin bắt buộc');
  await expect(page.locator('#form-error')).not.toContainText('đã thay đổi');
  await expect(page.getByRole('button',{name:'Xác nhận quyết định',exact:true})).toBeDisabled();
  expect(calls.filter(call=>call.path.endsWith('/decisions'))).toHaveLength(1);
  expect(JSON.parse(calls.find(call=>call.path.endsWith('/decisions')).body).expected_version).toBe(14);
  await page.getByRole('button',{name:'Hủy',exact:true}).click();
  await expect(page.getByRole('button',{name:'Phê duyệt',exact:true})).toBeDisabled();
  await expect(page.locator('.detail-meta')).toContainText('Lượt xử lý 14');
});

test('approval with valid required fields and acknowledged warnings submits the current version',async({page})=>{
  const {calls,bundle}=await mockBackend(page,{intercept:({call,reply,bundle})=>{
    if(call.path.endsWith('/decisions')){
      bundle.dossier.status='APPROVED_DOCUMENT';bundle.dossier.version=15;reply({action:'APPROVE',version:14});return true;
    }
    return false;
  }});reviewFixture(bundle);
  await signIn(page);await page.evaluate(id=>{location.hash='/detail/'+id+'?tab=issues';},ids.dossier);
  await page.getByRole('button',{name:'Phê duyệt',exact:true}).click();
  await page.getByLabel('Kết luận kiểm duyệt').fill('Đã kiểm tra');
  await page.getByRole('button',{name:'Xác nhận quyết định',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.page-heading .badge')).toHaveText('Đã phê duyệt');
  const decisions=calls.filter(call=>call.path.endsWith('/decisions'));
  expect(decisions).toHaveLength(1);
  expect(JSON.parse(decisions[0].body)).toEqual({action:'APPROVE',reason:'Đã kiểm tra',expected_version:14});
});

test('all five accepted required-field warnings allow approval without editing extracted data',async({page})=>{
  const {calls,bundle}=await mockBackend(page,{intercept:({call,reply,bundle})=>{
    if(call.path.endsWith('/decisions')){bundle.dossier.status='APPROVED_DOCUMENT';bundle.dossier.version=15;reply({action:'APPROVE',version:14});return true;}return false;
  }});reviewFixture(bundle);
  const labels=['Ngày ký hợp đồng','Số giấy tờ bên bán','Địa chỉ bên bán','Địa chỉ bên mua','Phương thức thanh toán'];
  bundle.fields=labels.map((label,index)=>({...bundle.fields[0],id:'required-'+index,label,value:'',validation:'MISSING'}));
  bundle.issues=bundle.fields.map(field=>({id:'issue-'+field.id,rule_code:'field:'+field.id,code:'FIELD_NEEDS_VERIFICATION',severity:'WARNING',status:'ACKNOWLEDGED',message:'Đã kiểm tra',acknowledged_by:ids.user,acknowledgement:'Đã đối chiếu và chấp nhận giấy tờ',evidence:[{field_id:field.id,file_id:ids.file,page:1}]}));
  await signIn(page);await page.evaluate(id=>{location.hash='/detail/'+id+'?tab=issues';},ids.dossier);
  await expect(page.locator('.review-required-notice')).toHaveCount(0);
  await expect(page.locator('.panel-heading .count-label')).toHaveText('0 cần xử lý');
  await expect(page.locator('.decision-panel')).toContainText('Bạn có thể phê duyệt hồ sơ');
  await page.getByRole('button',{name:'Phê duyệt',exact:true}).click();
  await page.getByLabel('Kết luận kiểm duyệt').fill('Các mục đã được kiểm tra và chấp nhận');
  await page.getByRole('button',{name:'Xác nhận quyết định',exact:true}).click();
  await expect(page.locator('.page-heading .badge')).toHaveText('Đã phê duyệt');
  expect(calls.filter(call=>call.path.endsWith('/decisions'))).toHaveLength(1);
  expect(calls.some(call=>call.method==='PATCH'&&call.path.includes('/fields/'))).toBe(false);
});
