import { test, expect } from '@playwright/test';

for (const viewport of [{width:1366,height:768},{width:1024,height:600},{width:390,height:667},{width:844,height:390}]) {
  test(`sidebar account stays accessible at ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);
    await page.goto('/?mode=demo');
    if(await page.locator('.mobile-toggle').isVisible())await page.getByRole('button',{name:'Mở menu',exact:true}).click();
    const account=page.locator('.sidebar .user-button');
    await expect(account).toBeInViewport({ratio:1});
    await account.click();
    await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();
  });
}
