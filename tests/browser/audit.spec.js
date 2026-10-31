import {test,expect} from '@playwright/test';
import {mockBackend,signIn,openNav,fixtureUser,ids} from './backend-fixture.js';

test('audit displays actor names for non-admins, including historical and system events',async({page},info)=>{
  const other='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const user={...fixtureUser,role:'legal_specialist',permissions:['dossier:read','audit:read']};
  const rows=[
    {id:'event-1',actor_id:other,actor_name:'Nguyễn Văn Bình',action:'LOGIN',resource:'user',resource_id:other,created_at:'2026-10-31T08:00:00Z'},
    {id:'event-2',actor_id:ids.user,actor_name:'Fixture Admin',action:'COMPANY_REGISTERED',resource:'company',resource_id:ids.company,created_at:'2026-10-31T07:00:00Z'},
    {id:'event-3',actor_id:'00000000-0000-0000-0000-000000000000',actor_name:'',action:'PROCESSED',resource:'file',resource_id:ids.file,created_at:'2026-10-31T06:00:00Z'},
    {id:'event-4',actor_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',actor_name:'',action:'LOGIN',resource:'user',resource_id:ids.user,created_at:'2026-10-31T05:00:00Z'},
  ];
  const {calls}=await mockBackend(page,{user,intercept:async({call,reply})=>{if(call.path==='/api/v1/audit-logs'){await reply({items:rows,total:rows.length,limit:20,offset:0});return true;}return false;}});
  await signIn(page);await openNav(page,'Nhật ký hoạt động');
  const result=page.locator('#audit-results');await expect(result.locator('.audit-row')).toHaveCount(4);
  await expect(result.locator('.audit-row').nth(0).locator('small')).toHaveText('Nguyễn Văn Bình');await expect(result.locator('.audit-row').nth(0)).not.toContainText(other);
  await expect(result.locator('.audit-row').nth(1)).toContainText('company · Company supplied by API');await expect(result.locator('.audit-row').nth(2).locator('small')).toHaveText('Hệ thống');await expect(result.locator('.audit-row').nth(3).locator('small')).toHaveText('Thành viên không còn khả dụng');
  await page.screenshot({path:`test-results/${info.project.name}-audit-usernames.png`,fullPage:false});
  await page.locator('[data-locale-picker]').first().selectOption('en');await expect(result.locator('.audit-row').nth(2).locator('small')).toHaveText('System');await expect(result.locator('.audit-row').nth(3).locator('small')).toHaveText('Unavailable member');await expect(result.locator('.audit-row').nth(0).locator('small')).toHaveText('Nguyễn Văn Bình');
  await page.locator('#audit-search').fill('Nguyễn Văn Bình');await expect(result.locator('.audit-row')).toHaveCount(1);expect(calls.some(c=>c.path==='/api/v1/auth/users')).toBe(false);
});
