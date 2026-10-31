import { test, expect } from '@playwright/test';

async function navigate(page, name) {
  const toggle=page.getByRole('button',{name:'Mở menu',exact:true});
  if(await toggle.isVisible())await toggle.click();
  await page.locator('.sidebar').getByRole('button',{name,exact:true}).click();
}

test('page entrance is 360ms and reduced motion disables movement',async({page})=>{
  await page.goto('/?mode=demo');
  await navigate(page,'Hồ sơ');
  const content=page.locator('#main-content');
  await expect(content).toHaveClass(/page-enter/);
  await expect(content).toHaveCSS('animation-duration','0.36s');
  await page.emulateMedia({reducedMotion:'reduce'});
  await navigate(page,'Tổng quan');
  await expect(page.locator('#main-content')).toHaveCSS('animation-name','none');
  await page.locator('.stat-card').first().hover();
  await expect(page.locator('.stat-card').first()).toHaveCSS('transform','none');
});

test('login artwork moves slowly and respects the reduced-motion preference',async({page})=>{
  await page.goto('/');
  await expect.poll(()=>page.evaluate(()=>{
    const image=document.querySelector('.auth-illustration');
    const story=document.querySelector('.auth-story');
    return [getComputedStyle(image).animationName,getComputedStyle(story,'::before').animationName].some(name=>name!=='none');
  })).toBeTruthy();
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.auth-illustration')).toHaveCSS('animation-name','none');
  expect(await page.locator('.auth-story').evaluate(el=>getComputedStyle(el,'::before').animationName)).toBe('none');
});

test('cards lift two pixels on hover without moving their surrounding layout',async({page})=>{
  await page.goto('/?mode=demo');
  const card=page.locator('.stat-card').first();
  await card.hover();
  await expect.poll(()=>card.evaluate(el=>new DOMMatrixReadOnly(getComputedStyle(el).transform).m42)).toBe(-2);
});

test('mobile drawer closes with Escape and returns focus to its trigger',async({page,viewport})=>{
  test.skip(viewport.width>=760,'Drawer is only presented at mobile widths.');
  await page.goto('/?mode=demo');
  const trigger=page.locator('.mobile-toggle');
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('body')).toHaveClass(/menu-open/);
  await expect(page.locator('.sidebar')).toHaveClass(/open/);
  expect(await page.locator('.mobile-backdrop').evaluate(el=>getComputedStyle(el).backdropFilter)).not.toBe('none');
  await page.keyboard.press('Escape');
  await expect(page.locator('.mobile-backdrop')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  await expect(page.getByRole('button',{name:'Mở menu',exact:true})).toHaveAttribute('aria-expanded','false');
  await expect(page.getByRole('button',{name:'Mở menu',exact:true})).toBeFocused();
});

test('selecting an extracted field highlights and focuses its source evidence',async({page})=>{
  await page.goto('/?mode=demo');
  await navigate(page,'Hồ sơ');
  await page.getByRole('button',{name:/Nguyễn Văn Thành AP-2026/}).click();
  await page.getByRole('button',{name:/Tài liệu 3/}).click();
  await page.locator('[data-source="ho-ten"]').click();
  const evidence=page.locator('.paper [data-source-field="ho-ten"]');
  await expect(evidence).toHaveClass(/source-highlight/);
  await expect(evidence).toBeFocused();
  await expect(page.locator('.field-row.is-focused')).toContainText('Họ và tên');
  await expect(page.locator('.preview-toolbar')).toContainText('Trang 1 / 1');
  // Evidence navigation must keep the sensitive value masked until explicit reveal.
  await expect(evidence).toContainText('•');
});

test('demo intake exposes per-file progress and retains completion until acknowledged',async({page})=>{
  await page.goto('/?mode=demo');
  await page.getByRole('button',{name:'Tạo hồ sơ',exact:true}).click();
  await page.getByRole('textbox',{name:'Tên gợi nhớ của hồ sơ'}).fill('Hồ sơ kiểm tra tiến trình');
  await page.getByRole('button',{name:'Tạo hồ sơ',exact:true}).last().click();
  await page.getByRole('button',{name:'Thêm tài liệu',exact:true}).click();
  await page.locator('#upload-files').setInputFiles({name:'cccd-progress.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4 simulated intake progress')});
  await page.getByRole('combobox',{name:'Loại giấy tờ',exact:true}).selectOption('cccd');
  await page.getByRole('button',{name:'Tiếp nhận mô phỏng',exact:true}).click();
  const progress=page.getByRole('progressbar').first();
  await expect(progress).toBeVisible();
  await expect(progress).toHaveAttribute('aria-valuenow','100');
  await expect(page.locator('.modal')).toContainText(/mô phỏng/i);
  await expect(page.locator('.modal')).toContainText('cccd-progress.pdf');
  await page.getByRole('button',{name:'Hoàn tất',exact:true}).click();
  await expect(page.locator('.modal')).toHaveCount(0);
  await expect(page.locator('.document-item')).toContainText('cccd-progress.pdf');
});

test('waiting for a server response ends on error and supports a successful retry',async({page},info)=>{
  const requests=[];
  await page.route('**/backend/health',route=>{requests.push(route);});
  await page.goto('/?mode=demo#/connection');
  const loading=page.locator('#network-status .is-visible, #network-status.is-visible');
  const status=page.locator('#network-status [role="status"], #network-status[role="status"]');
  await page.locator('[data-action="health"]').click();
  await expect.poll(()=>requests.length).toBe(1);
  await expect(loading).toBeVisible();
  await expect(status).toContainText('Đang chờ phản hồi từ máy chủ');
  await expect(loading).toHaveCSS('opacity','1');
  await page.screenshot({path:`test-results/${info.project.name}-server-wait.png`,fullPage:true});
  await expect(page.locator('[data-action="health"]')).toBeDisabled();
  await requests[0].fulfill({status:503,contentType:'application/json',body:JSON.stringify({code:503,message:'Dịch vụ kiểm thử đang bận.',data:null})});
  await expect(loading).toHaveCount(0);
  await expect(page.getByText('Dịch vụ kiểm thử đang bận.',{exact:true})).toBeVisible();
  await expect(page.locator('[data-action="health"]')).toBeEnabled();

  await page.locator('[data-action="health"]').click();
  await expect.poll(()=>requests.length).toBe(2);
  await expect(loading).toBeVisible();
  await requests[1].fulfill({status:200,contentType:'application/json',body:JSON.stringify({code:200,message:'Service is running',data:{status:'ok'}})});
  await expect(loading).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Backend đang hoạt động',exact:true})).toBeVisible();
});

test('the server waiting screen remains until the last concurrent request settles',async({page})=>{
  const requests=[];
  await page.route('**/backend/health',route=>{requests.push(route);});
  await page.goto('/?mode=demo');
  await page.evaluate(async()=>{
    const {apiClient}=await import('/src/api.js');
    window.docsenseRequestResults=[];
    for(let i=0;i<2;i++)void apiClient.health().then(
      result=>window.docsenseRequestResults.push(result.data.status),
      error=>window.docsenseRequestResults.push(error.message)
    );
  });
  await expect.poll(()=>requests.length).toBe(2);
  const loading=page.locator('#network-status .is-visible, #network-status.is-visible');
  await expect(loading).toBeVisible();
  const response={status:200,contentType:'application/json',body:JSON.stringify({code:200,message:'Service is running',data:{status:'ok'}})};
  await requests[0].fulfill(response);
  await expect.poll(()=>page.evaluate(()=>window.docsenseRequestResults.length)).toBe(1);
  await expect(loading).toBeVisible();
  await requests[1].fulfill(response);
  await expect.poll(()=>page.evaluate(()=>window.docsenseRequestResults.length)).toBe(2);
  await expect(loading).toHaveCount(0);
});

test('required form validation marks and focuses the field that needs attention',async({page})=>{
  await page.goto('/?mode=demo');
  await page.getByRole('button',{name:'Tạo hồ sơ',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Tạo hồ sơ',exact:true}).click();
  const name=dialog.getByRole('textbox',{name:'Tên gợi nhớ của hồ sơ'});
  await expect(name).toHaveAttribute('aria-invalid','true');
  await expect(name).toBeFocused();
  await expect(dialog.locator('.field-error')).toBeVisible();
});
