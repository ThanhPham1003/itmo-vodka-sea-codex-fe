import { test,expect } from '@playwright/test';
import { mockBackend,signIn,openNav } from './backend-fixture.js';

test('the add-document dialog exposes AI suggestions where the user creates the type',async({page})=>{
  await mockBackend(page);await signIn(page);await openNav(page,'Cấu hình hồ sơ');
  await page.locator('[data-catalog="documents"]').click();await page.getByRole('button',{name:'Thêm loại giấy tờ',exact:true}).click();
  await expect(page.getByRole('dialog').getByLabel('Mô tả cho AI')).toHaveCount(0);
  await expect(page.getByRole('dialog').getByRole('button',{name:'Gợi ý bằng AI',exact:true})).toBeVisible({timeout:1500});
});

test('the demo add-document dialog explains why AI requires a company account',async({page})=>{
  await page.goto('/?mode=demo');await openNav(page,'Cấu hình hồ sơ');
  await page.locator('[data-catalog="documents"]').click();await page.getByRole('button',{name:'Thêm loại giấy tờ',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByRole('button',{name:'Gợi ý bằng AI',exact:true})).toBeVisible({timeout:1500});
  await expect(dialog.getByRole('button',{name:'Gợi ý bằng AI',exact:true})).toBeDisabled();
  await expect(dialog).toContainText('Đăng nhập tài khoản công ty để dùng gợi ý AI.');
});

test('document field suggestions show animated waiting and remain a draft until saved',async({page},info)=>{
  let pending;
  const {calls}=await mockBackend(page,{intercept:({call,reply})=>{
    if(call.path==='/api/v1/document-types/suggestions'){pending=reply;return true;}
    if(call.path==='/api/v1/document-types'&&call.method==='POST'){const definition=JSON.parse(call.body);reply({code:'new-identity',current_version:1,active:true,definition},201);return true;}return false;
  }});
  await signIn(page);await openNav(page,'Cấu hình hồ sơ');await page.locator('[data-catalog="documents"]').click();await page.getByRole('button',{name:'Thêm loại giấy tờ',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('Tên hiển thị').fill('CCCD nội bộ');await dialog.getByLabel('Mô tả nhận diện giấy tờ').fill('Gợi ý các trường trên CCCD');await dialog.getByRole('button',{name:'Gợi ý bằng AI',exact:true}).click();
  await expect(page.locator('.network-wait-card.is-ai-waiting')).toBeVisible();await expect(page.locator('#network-status')).toContainText('AI đang tạo gợi ý');
  await expect(page.locator('.network-ai-orbit')).toHaveCSS('animation-name','docsense-loading');
  await page.emulateMedia({reducedMotion:'reduce'});await expect(page.locator('.network-ai-orbit')).toHaveCSS('animation-name','none');
  await page.screenshot({path:`test-results/${info.project.name}-ai-wait.png`});
  await expect(dialog.getByRole('button',{name:'Lưu phiên bản',exact:true})).toBeDisabled();
  await pending({draft:true,definition:{name:'AI identity',description:'Schema proposed by AI',fields:[{key:'',label:'Số định danh',type:'identifier',required:true,pii:true}],special_requirements:[{code:'',description:'Kiểm tra hạn sử dụng',severity:'BLOCKER'}]}});
  await expect(page.locator('.network-wait-overlay')).toHaveCount(0);await expect(dialog.locator('#catalog-ai-result')).toContainText('Đã nhận gợi ý trường');
  await expect(dialog.getByLabel('Tên hiển thị')).toHaveValue('CCCD nội bộ');await expect(dialog.getByLabel('Tên trường',{exact:true})).toHaveValue('Số định danh');
  expect(calls.filter(call=>call.path==='/api/v1/document-types'&&call.method==='POST')).toHaveLength(0);
  expect(JSON.parse(calls.find(call=>call.path==='/api/v1/document-types/suggestions').body)).toEqual({description:'CCCD nội bộ\nGợi ý các trường trên CCCD'});
  await dialog.getByRole('button',{name:'Lưu phiên bản',exact:true}).click();await expect(dialog).toHaveCount(0);
  const saved=JSON.parse(calls.find(call=>call.path==='/api/v1/document-types'&&call.method==='POST').body);expect(saved.special_requirements[0].severity).toBe('BLOCKER');expect(saved.fields[0].pii).toBe(true);
});

test('comparison-rule suggestions call the selected dossier endpoint and require an explicit save',async({page})=>{
  const {calls}=await mockBackend(page,{intercept:({call,reply})=>{
    if(call.path==='/api/v1/dossier-types/sale/comparison-rules/suggestions'){reply({draft:true,configuration_version:1,rules:[{code:'',name:'Quy tắc AI đề xuất',left:{document_type:'identity',field_key:'full-name'},right:{document_type:'identity',field_key:'full-name'},operator:'TEXT_EQUALS',severity:'WARNING'}]});return true;}
    if(call.path==='/api/v1/dossier-types/sale'&&call.method==='PUT'){reply({code:'sale',current_version:2,active:true,definition:JSON.parse(call.body)});return true;}return false;
  }});
  await signIn(page);await openNav(page,'Cấu hình hồ sơ');await page.getByRole('button',{name:'Gợi ý quy tắc bằng AI',exact:true}).click();
  const dialog=page.getByRole('dialog');
  await expect(dialog.getByLabel('Mô tả cho AI')).toHaveCount(0);
  await dialog.getByLabel('Tên hiển thị').fill('Bộ hồ sơ mua bán');
  await dialog.getByLabel('Mô tả nghiệp vụ').fill('So sánh thông tin chủ sở hữu');
  await dialog.getByRole('button',{name:'Thêm quy tắc',exact:true}).click();await dialog.getByLabel('Tên quy tắc').fill('Quy tắc đang soạn');
  await dialog.getByRole('button',{name:'Gợi ý quy tắc bằng AI',exact:true}).click();await expect(dialog.locator('#catalog-ai-result')).toContainText('Đã thêm gợi ý quy tắc');
  await expect(dialog.getByLabel('Tên quy tắc').first()).toHaveValue('Quy tắc đang soạn');await expect(dialog.getByLabel('Tên quy tắc').last()).toHaveValue('Quy tắc AI đề xuất');
  expect(JSON.parse(calls.find(call=>call.path==='/api/v1/dossier-types/sale/comparison-rules/suggestions').body)).toEqual({description:'Bộ hồ sơ mua bán\nSo sánh thông tin chủ sở hữu'});
  expect(calls.filter(call=>call.method==='PUT')).toHaveLength(0);expect(calls.some(call=>call.path==='/api/v1/document-types/suggestions')).toBe(false);
  await dialog.getByRole('button',{name:'Lưu phiên bản',exact:true}).click();await expect(dialog).toHaveCount(0);
  const saved=JSON.parse(calls.find(call=>call.method==='PUT').body);expect(saved.expected_version).toBe(1);expect(saved.rules).toHaveLength(2);
});

test('AI failure ends waiting and preserves the editable document draft',async({page})=>{
  await mockBackend(page,{intercept:({call,reply})=>{if(call.path==='/api/v1/document-types/suggestions'){reply(null,503);return true;}return false;}});
  await signIn(page);await openNav(page,'Cấu hình hồ sơ');await page.locator('[data-catalog="documents"]').click();await page.getByRole('button',{name:'Thêm loại giấy tờ',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('Tên hiển thị').fill('Giữ bản nháp');await dialog.getByLabel('Tên trường',{exact:true}).fill('Trường đang soạn');
  await dialog.getByLabel('Mô tả nhận diện giấy tờ').fill('Gợi ý trường');await dialog.getByRole('button',{name:'Gợi ý bằng AI',exact:true}).click();
  await expect(dialog.locator('#catalog-ai-error')).toContainText('Request failed');await expect(dialog.getByRole('button',{name:'Gợi ý bằng AI',exact:true})).toBeEnabled();
  await expect(dialog.getByLabel('Tên hiển thị')).toHaveValue('Giữ bản nháp');await expect(dialog.getByLabel('Tên trường',{exact:true})).toHaveValue('Trường đang soạn');await expect(page.locator('.network-wait-overlay')).toHaveCount(0);
});
