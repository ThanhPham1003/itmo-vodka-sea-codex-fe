import {test,expect} from '@playwright/test';
import {mockBackend,signIn,fixtureUser,ids} from './backend-fixture.js';

const key='docsense:session:v1';
test('F5 keeps the session and route but reloads permissions and clears revealed data',async({page})=>{
  const user={...fixtureUser};
  const {calls}=await mockBackend(page,{user});await signIn(page);
  await page.goto(`/#/detail/${ids.dossier}?tab=documents`);
  await page.getByRole('button',{name:'Hiện Sensitive name'}).click();await expect(page.locator('.field-value')).toContainText('Private API value');
  const saved=await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)),key);
  expect(Object.keys(saved).sort()).toEqual(['accessToken','expiresAt','version']);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain('fixture-token');
  user.role='broker';user.permissions=['dossier:read','dossier:upload'];
  await page.reload();await expect(page.locator('.field-value')).toContainText('••••••');
  await expect(page.locator('#app')).not.toContainText('Private API value');
  await expect(page).toHaveURL(new RegExp(`/detail/${ids.dossier}\\?tab=documents`));
  await expect(page.locator('.sidebar').getByRole('button',{name:'Thành viên',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Hiện Sensitive name'})).toHaveCount(0);
  expect(calls.filter(call=>call.path==='/api/v1/auth/login')).toHaveLength(1);
  expect(calls.filter(call=>call.path==='/api/v1/auth/me').at(-1).headers.authorization).toBe('Bearer fixture-token');
});

test('logout and token expiration clear the saved session across reload',async({page})=>{
  const {calls}=await mockBackend(page);await signIn(page);
  await page.getByRole('button',{name:'Tài khoản',exact:true}).click();await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  expect(await page.evaluate(key=>sessionStorage.getItem(key),key)).toBeNull();
  await page.reload();await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();
  await signIn(page);
  await page.evaluate(key=>{const saved=JSON.parse(sessionStorage.getItem(key));saved.expiresAt=new Date(0).toISOString();sessionStorage.setItem(key,JSON.stringify(saved));},key);
  const before=calls.length;await page.reload();await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();
  expect(await page.evaluate(key=>sessionStorage.getItem(key),key)).toBeNull();
  expect(calls.slice(before).some(call=>call.path==='/api/v1/auth/me')).toBe(false);
});

test('temporary restore failure keeps the cache and retry resumes without another login',async({page})=>{
  let unavailable=false;
  const {calls}=await mockBackend(page,{intercept:({call,reply})=>{
    if(unavailable&&call.path==='/api/v1/auth/me'){reply(null,503);return true;}return false;
  }});
  await signIn(page);unavailable=true;await page.reload();
  await expect(page.getByRole('heading',{name:'Không thể khôi phục phiên đăng nhập'})).toBeVisible();
  await expect(page.locator('.sidebar')).toHaveCount(0);
  expect(await page.evaluate(key=>Boolean(sessionStorage.getItem(key)),key)).toBe(true);
  unavailable=false;await page.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(page.locator('.sidebar')).toBeVisible();
  expect(calls.filter(call=>call.path==='/api/v1/auth/login')).toHaveLength(1);
});

test('401 during restore removes the cache and returns to login',async({page})=>{
  let expired=false;
  await mockBackend(page,{intercept:({call,reply})=>{
    if(expired&&call.path==='/api/v1/auth/me'){reply(null,401);return true;}return false;
  }});
  await signIn(page);expired=true;await page.reload();
  await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();
  expect(await page.evaluate(key=>sessionStorage.getItem(key),key)).toBeNull();
  await expect(page.locator('.sidebar')).toHaveCount(0);
});
