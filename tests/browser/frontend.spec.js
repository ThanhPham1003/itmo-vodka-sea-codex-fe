import { test, expect } from '@playwright/test';

async function nav(page,name){
  if(await page.locator('.mobile-toggle').isVisible())await page.getByRole('button',{name:'Mở menu',exact:true}).click();
  await page.locator('.sidebar').getByRole('button',{name,exact:true}).click();
}
test.beforeEach(async({page})=>{await page.goto('/');});
test('dashboard and all permitted screens render without errors or horizontal overflow',async({page},info)=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await expect(page.getByRole('heading',{name:/Xin chào/})).toBeVisible();
  await expect(page.locator('.hero')).toBeVisible();
  await page.screenshot({path:`test-results/${info.project.name}-dashboard.png`,fullPage:true});
  for(const name of ['Hồ sơ','Kiểm duyệt','Thành viên','Cấu hình hồ sơ','Nhật ký hoạt động','Kết nối backend']){
    await nav(page,name);await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('heading',{name:'Không thể mở nội dung'})).toHaveCount(0);
    const overflow=await page.evaluate(()=>({width:window.innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>el.getBoundingClientRect().right>window.innerWidth+1&&getComputedStyle(el).position!=='fixed').slice(0,12).map(el=>({tag:el.tagName,class:el.className,width:el.getBoundingClientRect().width,right:el.getBoundingClientRect().right}))}));
    expect(overflow.scroll<=overflow.width+1,name+' overflows: '+JSON.stringify(overflow)).toBeTruthy();
  }
  expect(errors).toEqual([]);
});
test('search, no-results, filters and dossier details work',async({page})=>{
  await nav(page,'Hồ sơ');
  await page.getByRole('textbox',{name:'Tìm hồ sơ'}).fill('Nguyễn Văn Thành');
  await expect(page.locator('#dossier-results tbody tr')).toHaveCount(1);
  await page.getByRole('textbox',{name:'Tìm hồ sơ'}).fill('KHONG-TON-TAI');
  await expect(page.getByRole('heading',{name:'Chưa có hồ sơ phù hợp'})).toBeVisible();
  await page.getByRole('button',{name:'Xóa bộ lọc'}).click();
  await page.getByRole('button',{name:/Nguyễn Văn Thành AP-2026/}).click();
  await expect(page.getByRole('heading',{name:'Nguyễn Văn Thành',exact:true})).toBeVisible();
  await page.getByRole('button',{name:/Tài liệu 3/}).click();
  await expect(page.getByRole('heading',{name:'Dữ liệu trích xuất'})).toBeVisible();
});
test('PII is masked by default and revealing creates an audit event',async({page})=>{
  await nav(page,'Hồ sơ');await page.getByRole('button',{name:/Nguyễn Văn Thành AP-2026/}).click();
  await page.getByRole('button',{name:/Tài liệu 3/}).click();
  await expect(page.locator('.field-value').first()).toContainText('•');
  await page.getByRole('button',{name:'Hiện Họ và tên',exact:true}).click();
  await expect(page.locator('.field-value').first()).toContainText('Nguyễn Văn Thành');
  await nav(page,'Nhật ký hoạt động');await page.locator('#audit-action').selectOption('VIEW_PII');
  await expect(page.locator('#audit-results')).toContainText('Xem thông tin nhạy cảm');
});
test('legal decision is confirmed, recorded and locks the dossier',async({page})=>{
  await nav(page,'Kiểm duyệt');
  await page.locator('.legal-card').filter({hasText:'Nguyễn Văn Thành'}).getByRole('button',{name:'Kiểm tra',exact:true}).click();
  await page.getByRole('button',{name:'Phê duyệt',exact:true}).click();
  await page.getByRole('textbox',{name:'Kết luận kiểm duyệt'}).fill('Đã đối chiếu đầy đủ tài liệu mẫu.');
  await page.getByRole('button',{name:'Xác nhận quyết định'}).click();
  await expect(page.locator('.page-heading .badge')).toHaveText('Đã phê duyệt');
  await expect(page.getByRole('button',{name:'Thêm tài liệu'})).toHaveCount(0);
  await page.getByRole('button',{name:'Mở lại hồ sơ'}).click();
  await page.getByRole('textbox',{name:'Lý do mở lại'}).fill('Bổ sung thẩm định theo yêu cầu.');
  await page.getByRole('button',{name:'Xác nhận mở lại'}).click();
  await expect(page.locator('.page-heading .badge')).toHaveText('Chờ kiểm duyệt');
});
test('broker demo has no review, PII reveal, members or catalog access',async({page})=>{
  await page.getByRole('button',{name:'Tài khoản',exact:true}).click();
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  await page.getByLabel('Tài khoản mẫu').selectOption('broker');
  await page.getByRole('button',{name:'Vào không gian demo'}).click();
  await expect(page.locator('.sidebar').getByRole('button',{name:'Kiểm duyệt',exact:true})).toHaveCount(0);
  await expect(page.locator('.sidebar').getByRole('button',{name:'Thành viên',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:/Nguyễn Văn Thành AP-2026/}).click();
  await page.getByRole('button',{name:/Tài liệu 3/}).click();
  await expect(page.getByRole('button',{name:'Hiện Họ và tên',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Sửa',exact:true})).toHaveCount(0);
});
test('create, upload, classify and preserve intake batches',async({page})=>{
  await page.getByRole('button',{name:'Tạo hồ sơ',exact:true}).click();
  await page.getByRole('textbox',{name:'Tên gợi nhớ của hồ sơ'}).fill('Căn hộ demo kiểm thử');
  await page.getByRole('button',{name:'Tạo hồ sơ',exact:true}).last().click();
  await expect(page.getByRole('heading',{name:'Căn hộ demo kiểm thử'})).toBeVisible();
  await page.getByRole('button',{name:'Thêm tài liệu',exact:true}).click();
  await page.locator('#upload-files').setInputFiles({name:'cccd-demo.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 demo')});
  await page.getByRole('combobox',{name:'Loại giấy tờ',exact:true}).selectOption('cccd');
  await page.getByRole('button',{name:'Tiếp nhận mô phỏng'}).click();
  await expect(page.locator('.document-item')).toContainText('cccd-demo.pdf');
});
test('catalog editor creates a custom type without JSON and preserves generated code',async({page})=>{
  await nav(page,'Cấu hình hồ sơ');
  await page.getByRole('button',{name:/Loại giấy tờ/}).click();
  await page.getByRole('button',{name:'Thêm loại giấy tờ',exact:true}).click();
  await page.getByRole('textbox',{name:'Tên hiển thị'}).fill('Giấy ủy quyền mẫu');
  await page.getByRole('textbox',{name:'Mô tả nhận diện giấy tờ'}).fill('Giấy tờ xác nhận ủy quyền cho giao dịch.');
  await page.getByRole('button',{name:'Thêm trường',exact:true}).click();
  await page.getByRole('textbox',{name:'Tên trường',exact:true}).last().fill('Ngày hiệu lực');
  await page.getByRole('combobox',{name:'Kiểu dữ liệu',exact:true}).last().selectOption('date');
  await page.getByRole('button',{name:'Lưu phiên bản',exact:true}).click();
  await expect(page.locator('.catalog-node.selected')).toContainText('Giấy ủy quyền mẫu');
  await expect(page.locator('.field-table')).toContainText('Ngày hiệu lực');
});
test('company registration creates an empty tenant and only one admin',async({page})=>{
  await page.getByRole('button',{name:'Tài khoản',exact:true}).click();
  await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  await page.getByRole('button',{name:'Tạo không gian mới'}).click();
  await page.getByRole('textbox',{name:'Tên công ty',exact:true}).fill('Công ty kiểm thử');
  await page.getByRole('textbox',{name:'Mã số thuế'}).fill('0101234567');
  await page.getByRole('textbox',{name:'Tên pháp lý công ty'}).fill('Công ty TNHH Kiểm Thử');
  await page.getByRole('textbox',{name:'Tên người đại diện'}).fill('Nguyễn Văn An');
  await page.getByRole('textbox',{name:'Email quản trị'}).fill('new-admin@example.test');
  await page.getByRole('textbox',{name:'Tên đăng nhập'}).fill('newadmin');
  await page.getByLabel('Mật khẩu minh họa').fill('demo-password-123');
  await page.getByRole('button',{name:'Tạo công ty mô phỏng'}).click();
  await expect(page.getByRole('heading',{name:/Xin chào/})).toBeVisible();
  await nav(page,'Thành viên');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('.tenant-card')).toContainText('Công ty kiểm thử');
});
