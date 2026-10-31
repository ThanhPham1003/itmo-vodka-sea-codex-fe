import { test,expect } from '@playwright/test';
import { mockBackend,signIn,ids } from './backend-fixture.js';

test('reconciliation uses readable titles and pinned field labels while acknowledgement keeps its issue UUID',async({page},info)=>{
  const groupId='99999999-9999-4999-8999-999999999999';
  const warningId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const {calls,bundle}=await mockBackend(page,{intercept:({call,reply,bundle})=>{
    if(call.path===`/api/v1/dossiers/${ids.dossier}/issues/${warningId}/acknowledge`) {
      bundle.issues[0].status='ACKNOWLEDGED';reply(null);return true;
    }
    return false;
  }});
  bundle.files[0].original_name='giay-to-goc.pdf';
  bundle.document_groups=[{id:groupId,file_id:ids.file,document_type:'identity',pages:[1],needs_confirmation:true}];
  bundle.dossier.configuration.definition.rules=[{code:'rule_internal',name:'Đối chiếu họ tên bên bán',left:{document_type:'identity',field_key:'full-name'},right:{document_type:'identity',field_key:'full-name'}}];
  bundle.dossier.configuration.documents[0].definition={name:'Giấy tờ định danh',fields:[{key:'full-name',label:'Họ và tên'}]};
  const evidence={file_id:ids.file,document_group_id:groupId,field_id:ids.field,field_key:'full-name',page:1,value:'••••••'};
  bundle.issues=[
    {id:warningId,rule_code:`classification:${groupId}`,code:'CLASSIFICATION_UNCERTAIN',status:'OPEN',severity:'WARNING',message:'Cần xác nhận loại giấy tờ và đối tượng của tài liệu.',evidence:[{file_id:ids.file,document_group_id:groupId,page:0,value:''}]},
    {id:'field-issue',rule_code:`field:${ids.field}`,code:'FIELD_NEEDS_VERIFICATION',status:'OPEN',severity:'WARNING',message:'Cần xác minh trường: Họ và tên',evidence:[evidence]},
    {id:'special-issue',rule_code:`special:${groupId}:check_internal`,code:'SPECIAL_CHECK',status:'OPEN',severity:'WARNING',message:'Kiểm tra giấy tờ còn hiệu lực',evidence:[{file_id:ids.file,document_group_id:groupId,value:''}]},
    {id:'comparison-issue',rule_code:'rule_internal',code:'MISMATCH',status:'OPEN',severity:'WARNING',message:'Dữ liệu chưa khớp',evidence:[evidence,evidence]}
  ];
  await signIn(page);await page.evaluate(id=>{location.hash='/detail/'+id+'?tab=issues';},ids.dossier);
  const rows=page.locator('.rule-row');
  await expect(rows).toHaveCount(4);
  await expect(rows.locator('.rule-name strong')).toHaveText(['Xác nhận loại giấy tờ và đối tượng','Xác minh trường dữ liệu','Kiểm tra yêu cầu đặc biệt','Đối chiếu họ tên bên bán']);
  expect((await rows.allTextContents()).join(' ')).not.toMatch(/classification:|field:|special:|rule_internal/);
  await expect(rows.first().locator('.rule-values>div')).toHaveCount(1);
  await expect(rows.first().locator('.rule-values')).toContainText('giay-to-goc.pdf');
  await expect(rows.first().locator('.rule-values')).not.toContainText('Chưa có dữ liệu');
  await expect(rows.nth(1).locator('.rule-values')).toContainText('Giấy tờ định danh · Họ và tên');
  await expect(rows.nth(1).locator('.rule-values')).toContainText('••••••');
  await expect(rows.last().locator('.rule-values>div')).toHaveCount(2);
  await expect(page.getByRole('button',{name:'Phê duyệt',exact:true})).toBeDisabled();
  await page.screenshot({path:`test-results/${info.project.name}-reconciliation.png`,fullPage:true});
  await page.getByLabel('Ngôn ngữ / Language').selectOption('en');
  await expect(rows.first().locator('.rule-name strong')).toHaveText('Confirm document type and subject');
  await expect(rows.last().locator('.rule-name strong')).toHaveText('Đối chiếu họ tên bên bán');
  await expect(rows.nth(1).locator('.rule-values')).toContainText('Giấy tờ định danh · Họ và tên');
  await page.getByLabel('Ngôn ngữ / Language').selectOption('vi');
  await rows.first().getByRole('button',{name:'Xác nhận cảnh báo',exact:true}).click();
  await page.getByLabel('Căn cứ / lý do chấp nhận').fill('Đã kiểm tra giấy tờ gốc');
  await page.getByRole('button',{name:'Xác nhận',exact:true}).click();
  await expect.poll(()=>calls.filter(call=>call.path.endsWith(`/issues/${warningId}/acknowledge`)).length).toBe(1);
  const request=calls.find(call=>call.path.endsWith(`/issues/${warningId}/acknowledge`));
  expect(JSON.parse(request.body)).toEqual({reason:'Đã kiểm tra giấy tờ gốc',expected_version:4});
});
