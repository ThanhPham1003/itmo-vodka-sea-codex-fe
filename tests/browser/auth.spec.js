import { test, expect } from '@playwright/test';

test('default opens the live login screen and never submits an invented auth API',async({page},info)=>{
  const calls=[];page.on('request',request=>{if(request.url().includes('/api/v1/'))calls.push(request.url());});
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();
  await expect(page.getByText('Đang chờ API xác thực',{exact:true})).toBeVisible();
  await page.getByLabel('Tên đăng nhập hoặc email').fill('user@example.test');
  await page.getByLabel('Mật khẩu',{exact:true}).fill('sample-password');
  await expect(page.getByRole('button',{name:'Đăng nhập · Chờ API'})).toBeDisabled();
  await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click();
  await expect(page.getByLabel('Mật khẩu',{exact:true})).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'Ẩn mật khẩu',exact:true}).click();
  await expect(page.getByLabel('Mật khẩu',{exact:true})).toHaveAttribute('type','password');
  await page.locator('#live-auth-form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
  expect(calls).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  await page.screenshot({path:`test-results/${info.project.name}-login.png`,fullPage:true});
});
test('signup has company and admin fields, correct route, and no unsupported request',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Tạo không gian mới'}).click();
  await expect(page).toHaveURL(/#\/signup$/);
  await expect(page.getByRole('heading',{name:'Tạo không gian doanh nghiệp'})).toBeVisible();
  for(const name of ['Tên công ty','Tên pháp lý công ty','Mã số thuế','Email quản trị','Tên đăng nhập','Xác nhận mật khẩu'])await expect(page.getByLabel(name,{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Đăng ký · Chờ API'})).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
});
test('entering demo is explicit and logout clears the memory session and protected pages',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Dùng bản demo'}).click();
  await expect(page).toHaveURL(/mode=demo/);await expect(page.getByRole('heading',{name:/Xin chào/})).toBeVisible();
  await page.getByRole('button',{name:'Tài khoản',exact:true}).click();await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();
  await page.evaluate(()=>{location.hash='/dossiers';});
  await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCount(0);
});
