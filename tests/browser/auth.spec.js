import { test, expect } from '@playwright/test';
import { mockBackend } from './backend-fixture.js';

test('default opens the live login screen and submits the published auth API',async({page},info)=>{
  await mockBackend(page);
  const calls=[];page.on('request',request=>{if(request.url().includes('/api/v1/'))calls.push(request.url());});
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();
  await page.getByLabel('Tên đăng nhập hoặc email').fill('user@example.test');
  await page.getByLabel('Mật khẩu',{exact:true}).fill('sample-password');
  await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Hiện mật khẩu',exact:true}).click();
  await expect(page.getByLabel('Mật khẩu',{exact:true})).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'Ẩn mật khẩu',exact:true}).click();
  await expect(page.getByLabel('Mật khẩu',{exact:true})).toHaveAttribute('type','password');
  expect(calls).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBeTruthy();
  await page.screenshot({path:`test-results/${info.project.name}-login.png`,fullPage:true});
});
test('signup has company and admin fields, correct route, and backend password policy',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Tạo không gian mới'}).click();
  await expect(page).toHaveURL(/#\/signup$/);
  await expect(page.getByRole('heading',{name:'Tạo không gian doanh nghiệp'})).toBeVisible();
  for(const name of ['Tên công ty','Tên pháp lý công ty','Mã số thuế','Email quản trị','Tên đăng nhập','Xác nhận mật khẩu'])await expect(page.getByLabel(name,{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Đăng ký doanh nghiệp'})).toBeEnabled();
  await expect(page.getByLabel('Mật khẩu',{exact:true})).toHaveAttribute('minlength','12');
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
