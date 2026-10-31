import { test,expect } from '@playwright/test';
import { mockBackend,signIn,ids } from './backend-fixture.js';

function reviewFixture(bundle) {
  bundle.dossier.version=14;
  bundle.fields[0]={...bundle.fields[0],label:'Ngày ký hợp đồng',type:'date',required:true,value:'2026-10-31',validation:'VALID'};
  bundle.issues=[{id:'acknowledged',rule_code:'field:required',code:'FIELD_NEEDS_VERIFICATION',status:'ACKNOWLEDGED',severity:'WARNING',message:'Cảnh báo đã được kiểm tra',evidence:[]}];
}

test('approval stays disabled after warning acknowledgement until required fields are valid',async({page},info)=>{
  const {calls,bundle}=await mockBackend(page);reviewFixture(bundle);
  bundle.fields[0].value='';bundle.fields[0].validation='MISSING';
  await signIn(page);await page.evaluate(id=>{location.hash='/detail/'+id+'?tab=issues';},ids.dossier);
  await expect(page.getByRole('button',{name:'Phê duyệt',exact:true})).toBeDisabled();
  await expect(page.locator('.decision-panel')).toContainText('Cần bổ sung hoặc sửa các trường bắt buộc chưa hợp lệ trong tab Tài liệu.');
  await expect(page.locator('.decision-panel')).toContainText('Ngày ký hợp đồng');
  await page.locator('.decision-panel').screenshot({path:`test-results/${info.project.name}-review-readiness.png`});
  await page.getByRole('button',{name:'Kiểm tra dữ liệu trích xuất',exact:true}).click();
  await expect(page.locator('.field-label')).toContainText('Ngày ký hợp đồng');
  await expect(page.getByRole('button',{name:'Sửa',exact:true})).toBeEnabled();
  expect(calls.filter(call=>call.path.endsWith('/decisions'))).toHaveLength(0);
});

test('approval 409 at the same version explains required fields and prevents a blind resubmit',async({page})=>{
  const {calls,bundle}=await mockBackend(page,{intercept:({call,reply,bundle})=>{
    if(call.path.endsWith('/decisions')){
      bundle.fields[0].value='';bundle.fields[0].validation='MISSING';reply(null,409);return true;
    }
    return false;
  }});reviewFixture(bundle);
  await signIn(page);await page.evaluate(id=>{location.hash='/detail/'+id+'?tab=issues';},ids.dossier);
  await page.getByRole('button',{name:'Phê duyệt',exact:true}).click();
  await page.getByLabel('Kết luận kiểm duyệt').fill('Đã kiểm tra');
  await page.getByRole('button',{name:'Xác nhận quyết định',exact:true}).click();
  await expect(page.locator('#form-error')).toContainText('trường bắt buộc');
  await expect(page.locator('#form-error')).not.toContainText('đã thay đổi');
  await expect(page.getByRole('button',{name:'Xác nhận quyết định',exact:true})).toBeDisabled();
  expect(calls.filter(call=>call.path.endsWith('/decisions'))).toHaveLength(1);
  expect(JSON.parse(calls.find(call=>call.path.endsWith('/decisions')).body).expected_version).toBe(14);
  await page.getByRole('button',{name:'Hủy',exact:true}).click();
  await expect(page.getByRole('button',{name:'Phê duyệt',exact:true})).toBeDisabled();
  await expect(page.locator('.detail-meta')).toContainText('Lượt xử lý 14');
});

test('approval with valid required fields and acknowledged warnings submits the current version',async({page})=>{
  const {calls,bundle}=await mockBackend(page,{intercept:({call,reply,bundle})=>{
    if(call.path.endsWith('/decisions')){
      bundle.dossier.status='APPROVED_DOCUMENT';bundle.dossier.version=15;reply({action:'APPROVE',version:14});return true;
    }
    return false;
  }});reviewFixture(bundle);
  await signIn(page);await page.evaluate(id=>{location.hash='/detail/'+id+'?tab=issues';},ids.dossier);
  await page.getByRole('button',{name:'Phê duyệt',exact:true}).click();
  await page.getByLabel('Kết luận kiểm duyệt').fill('Đã kiểm tra');
  await page.getByRole('button',{name:'Xác nhận quyết định',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.page-heading .badge')).toHaveText('Đã phê duyệt');
  const decisions=calls.filter(call=>call.path.endsWith('/decisions'));
  expect(decisions).toHaveLength(1);
  expect(JSON.parse(decisions[0].body)).toEqual({action:'APPROVE',reason:'Đã kiểm tra',expected_version:14});
});
