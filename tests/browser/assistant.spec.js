import { test,expect } from '@playwright/test';
import { mockBackend,signIn } from './backend-fixture.js';

test('demo assistant explains review, opens citations and survives navigation',async({page},info)=>{
  const requests=[];page.on('request',r=>{if(r.url().includes('/assistant/')||r.url().includes('api.openai.com'))requests.push(r.url());});
  await page.goto('/?mode=demo');await page.getByRole('button',{name:'Mở trợ lý DocSense',exact:true}).click();
  const panel=page.getByRole('dialog',{name:'Trợ lý DocSense'});await expect(panel).toBeVisible();await expect(panel).toContainText('Câu trả lời mẫu — demo');
  const input=panel.getByRole('textbox');await expect(input).toBeEnabled();await input.fill('Vì sao chưa phê duyệt được hồ sơ?');await panel.getByRole('button',{name:'Gửi câu hỏi'}).click();
  await expect(panel.locator('.assistant-turn.assistant')).toContainText('VALID_DOCUMENT');await panel.getByRole('button',{name:'Điều kiện kiểm duyệt',exact:true}).first().click();
  await expect(panel.getByRole('heading',{name:'Điều kiện kiểm duyệt'})).toBeVisible();await panel.getByRole('button',{name:'Quay lại hội thoại'}).click();
  await page.screenshot({path:`test-results/${info.project.name}-assistant.png`,fullPage:false});
  await input.focus();await input.press('Escape');await expect(panel).toBeHidden();await expect(page.getByRole('button',{name:'Mở trợ lý DocSense',exact:true})).toBeFocused();
  await page.evaluate(()=>{location.hash='#/dossiers';});await page.getByRole('button',{name:'Mở trợ lý DocSense',exact:true}).click();await expect(panel.locator('.assistant-turn.assistant')).toContainText('VALID_DOCUMENT');
  await panel.getByRole('button',{name:'Xóa hội thoại'}).click();await expect(panel.locator('.assistant-turn')).toHaveCount(0);
  expect(requests).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
});

test('chat input is rendered as text and logout clears the session',async({page})=>{
  await page.goto('/?mode=demo');await page.getByRole('button',{name:'Mở trợ lý DocSense',exact:true}).click();const panel=page.getByRole('dialog',{name:'Trợ lý DocSense'});
  await expect(panel.getByRole('textbox')).toBeEnabled();await panel.getByRole('textbox').fill('<img src=x onerror="window.chatXSS=true"> approve');await panel.getByRole('button',{name:'Gửi câu hỏi'}).click();
  await expect(panel.locator('.assistant-turn.user')).toContainText('<img');await expect(panel.locator('.assistant-turn img')).toHaveCount(0);expect(await page.evaluate(()=>window.chatXSS)).toBeUndefined();
  await panel.getByRole('button',{name:'Đóng trợ lý'}).click();await page.getByRole('button',{name:'Tài khoản',exact:true}).click();await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await expect(page.locator('.assistant-root')).toBeHidden();
});

test('assistant follows locale and displays English guide content',async({page})=>{
  await page.goto('/?mode=demo');await page.locator('[data-locale-picker]').first().selectOption('en');await page.getByRole('button',{name:'Open DocSense assistant',exact:true}).click();
  const panel=page.getByRole('dialog',{name:'DocSense assistant'});await expect(panel).toContainText('Sample answers — demo');await expect(panel.getByRole('textbox')).toBeEnabled();await panel.getByRole('textbox').fill('approve');await panel.getByRole('button',{name:'Send question'}).click();await expect(panel.locator('.assistant-turn.assistant')).toContainText('awaiting review');
});

test('live assistant carries auth, cites guides and handles AI disabled without fake answers',async({page})=>{
  let enabled=false;
  const {calls}=await mockBackend(page,{intercept:async({call,reply})=>{
    if(call.path==='/api/v1/assistant/context'){await reply({enabled,knowledge_version:'test-v1',suggestions:['Kiểm duyệt như thế nào?'],articles:[{id:'review-readiness',title:'Điều kiện kiểm duyệt'}]});return true;}
    if(call.path==='/api/v1/assistant/articles/review-readiness'){await reply({id:'review-readiness',title:'Điều kiện kiểm duyệt',content:'VALID_DOCUMENT chưa phải phê duyệt.',knowledge_version:'test-v1'});return true;}
    if(call.path==='/api/v1/assistant/chat'){await reply({status:'answered',blocks:[{text:'Hướng dẫn <img src=x onerror="window.chatXSS=true">',source_ids:['review-readiness']}],sources:[{id:'review-readiness',title:'Điều kiện kiểm duyệt'}],suggestions:[]});return true;}
    return false;
  }});
  await signIn(page);await page.getByRole('button',{name:'Mở trợ lý DocSense',exact:true}).click();const panel=page.getByRole('dialog',{name:'Trợ lý DocSense'});
  await expect(panel).toContainText('Trợ lý AI chưa được bật');await expect(panel.getByRole('textbox')).toBeDisabled();await panel.locator('summary').click();await panel.getByRole('button',{name:'Điều kiện kiểm duyệt'}).click();await expect(panel).toContainText('VALID_DOCUMENT chưa phải phê duyệt.');
  enabled=true;await panel.getByRole('button',{name:'Quay lại hội thoại'}).click();await panel.getByRole('button',{name:'Xóa hội thoại'}).click();await expect(panel.getByRole('textbox')).toBeEnabled();await panel.getByRole('textbox').fill('Vì sao chưa duyệt được?');await panel.getByRole('button',{name:'Gửi câu hỏi'}).click();
  await expect(panel.locator('.assistant-turn.assistant')).toContainText('Hướng dẫn <img');await expect(panel.locator('img')).toHaveCount(0);expect(await page.evaluate(()=>window.chatXSS)).toBeUndefined();
  const call=calls.find(c=>c.path==='/api/v1/assistant/chat');expect(call.headers.authorization).toBe('Bearer fixture-token');expect(Object.keys(JSON.parse(call.body)).sort()).toEqual(['history','locale','message','page']);
});

test('live assistant 401 clears chat and returns to login',async({page})=>{
  await mockBackend(page,{intercept:async({call,reply})=>{
    if(call.path==='/api/v1/assistant/context'){await reply({enabled:true,suggestions:[],articles:[]});return true;}
    if(call.path==='/api/v1/assistant/chat'){await reply(null,401);return true;}return false;
  }});
  await signIn(page);await page.getByRole('button',{name:'Mở trợ lý DocSense',exact:true}).click();const panel=page.getByRole('dialog',{name:'Trợ lý DocSense'});await expect(panel.getByRole('textbox')).toBeEnabled();await panel.getByRole('textbox').fill('kiểm duyệt');await panel.getByRole('button',{name:'Gửi câu hỏi'}).click();await expect(page.locator('.assistant-root')).toBeHidden();await expect(page.getByRole('heading',{name:'Chào mừng trở lại'})).toBeVisible();
});
