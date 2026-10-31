import { test,expect } from '@playwright/test';
import { mockBackend,openNav } from './backend-fixture.js';

test('language switches both ways, keeps form input and survives navigation and reload',async({page})=>{
  await page.goto('/');await page.getByLabel('Tên đăng nhập hoặc email').fill('my-account');await page.getByLabel('Mật khẩu',{exact:true}).fill('keep-my-draft');
  await page.getByLabel('Ngôn ngữ / Language').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page.getByRole('heading',{name:'Welcome back'})).toBeVisible();await expect(page.getByLabel('Username or email')).toHaveValue('my-account');await expect(page.getByLabel('Password',{exact:true})).toHaveValue('keep-my-draft');
  await page.getByRole('button',{name:'Create a workspace'}).click();await expect(page.getByRole('heading',{name:'Create your company workspace'})).toBeVisible();await expect(page.getByLabel('Company name',{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByRole('heading',{name:'Create your company workspace'})).toBeVisible();
  await page.getByLabel('Ngôn ngữ / Language').selectOption('vi');await expect(page.getByRole('heading',{name:'Tạo không gian doanh nghiệp'})).toBeVisible();
});
test('English covers workspace, dialogs, validation and mobile navigation without translating user data',async({page})=>{
  await page.goto('/?mode=demo');await page.getByLabel('Ngôn ngữ / Language').selectOption('en');
  await expect(page.getByRole('heading',{name:/Hello,/})).toBeVisible();
  await page.getByRole('button',{name:'Create dossier',exact:true}).click();const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('heading',{name:'Create a dossier'})).toBeVisible();await dialog.getByLabel('Dossier title').fill('Tổng quan');
  await page.getByLabel('Ngôn ngữ / Language').selectOption('vi');await expect(dialog.getByLabel('Tên gợi nhớ của hồ sơ')).toHaveValue('Tổng quan');
  await page.getByLabel('Ngôn ngữ / Language').selectOption('en');await dialog.getByRole('button',{name:'Create dossier',exact:true}).click();
  await expect(page.locator('h1')).toHaveText('Tổng quan');await expect(page.getByRole('button',{name:/^Documents \d/})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});
test('switching back after an English request failure restores button and error text',async({page})=>{
  await mockBackend(page,{intercept:({call,reply})=>{if(call.path.endsWith('/login')){reply(null,401);return true;}return false;}});
  await page.goto('/');await page.getByLabel('Ngôn ngữ / Language').selectOption('en');await page.getByLabel('Username or email').fill('wrong');await page.getByLabel('Password',{exact:true}).fill('wrong-password');
  await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.locator('#auth-error')).toContainText('Request failed');await expect(page.getByRole('button',{name:'Sign in',exact:true})).toBeEnabled();
  await page.getByLabel('Ngôn ngữ / Language').selectOption('vi');await expect(page.getByRole('button',{name:'Đăng nhập',exact:true})).toBeEnabled();await expect(page.getByLabel('Mật khẩu',{exact:true})).toHaveValue('wrong-password');
});
test('English navigation and editors work across the workspace on desktop and mobile',async({page},info)=>{
  await page.goto('/?mode=demo');await page.getByLabel('Ngôn ngữ / Language').selectOption('en');
  await page.screenshot({path:`test-results/${info.project.name}-english-dashboard.png`,fullPage:true});
  for(const [label,title] of [['Dossiers','Every dossier has a journey.'],['Review','Review carefully. Decide clearly.'],['Members','The right people for the right work.'],['Dossier settings',"Your company's workflow."],['Activity log','Every change leaves a record.'],['Backend connection','A clear view of your connection.']]) {
    await openNav(page,label);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();
  }
  await openNav(page,'Dossier settings');
  await page.locator('[data-catalog="documents"]').click();await page.getByRole('button',{name:'Add document type',exact:true}).click();await expect(page.getByLabel('Display name')).toBeVisible();await expect(page.getByLabel('Field label')).toBeVisible();
  await page.getByRole('button',{name:'Save version',exact:true}).click();await expect(page.locator('.field-error')).toContainText('Please fill out this field.');
});
