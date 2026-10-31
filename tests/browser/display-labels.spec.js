import {test,expect} from '@playwright/test';
import {mockBackend,signIn,openNav,ids,fixtureUser} from './backend-fixture.js';

const docCode='doc_380659a24fb54e8c8ac2c43f836abb01';
const typeCode='dossier_79a00f42888f4bd19f1f514ee06d3583';
const fieldKey='field_82f97e692cac41a78fc1f41786d9ce90';
const ruleCode='rule_1578d7cd62fc4f7a8a4b016318dd6176';
const schema={name:'Căn cước bản đầu',fields:[{key:fieldKey,label:'Họ tên bản đầu',type:'text',required:true,pii:true}],special_requirements:[]};
const definition={name:'Bộ hồ sơ mua nhà',documents:[{key:'requirement_1578d7cd62fc4f7a8a4b016318dd6176',document_type:docCode,schema_version:1,required:true,min_count:1}],rules:[{code:ruleCode,name:'Kiểm tra họ tên',left:{document_type:docCode,field_key:fieldKey},right:{document_type:docCode,field_key:fieldKey},operator:'TEXT_EQUALS',severity:'WARNING'}]};
const type={code:typeCode,current_version:1,active:true,definition,document_schemas:[{code:docCode,version:1,definition:schema}]};
const noIDs=async locator=>expect(await locator.innerText()).not.toMatch(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b|\b(?:doc|dossier|field|rule|requirement)_[0-9a-f]{32}\b/i);

test('catalog and editor show labels while saves keep exact backend identifiers',async({page},info)=>{
  const {calls}=await mockBackend(page,{intercept:({call,reply})=>{
    if(call.path==='/api/v1/document-types'){reply({items:[{code:docCode,current_version:2,active:true,definition:{...schema,name:'Căn cước đổi tên',fields:[{...schema.fields[0],label:'Họ tên đổi nhãn'}]}}],total:1});return true;}
    if(call.path==='/api/v1/dossier-types'){reply({items:[type],total:1});return true;}
    if(call.path===`/api/v1/dossier-types/${typeCode}`&&call.method==='PUT'){reply({...type,current_version:2,definition:JSON.parse(call.body)});return true;}
    return false;
  }});
  await signIn(page);await openNav(page,'Cấu hình hồ sơ');
  await expect(page.locator('.catalog-rule')).toContainText('Căn cước bản đầu · Họ tên bản đầu');await noIDs(page.locator('main'));
  await page.getByRole('button',{name:'Chỉnh sửa',exact:true}).click();
  const dialog=page.getByRole('dialog');await noIDs(dialog);
  await expect(dialog.locator('[name="rule-leftField-0"] option:checked')).toHaveText('Họ tên bản đầu');
  await dialog.getByRole('button',{name:'Lưu phiên bản',exact:true}).click();await expect(dialog).toHaveCount(0);
  const body=JSON.parse(calls.find(call=>call.method==='PUT').body);
  expect(body.documents[0].document_type).toBe(docCode);expect(body.documents[0].schema_version).toBe(1);
  expect(body.rules[0].code).toBe(ruleCode);expect(body.rules[0].left.field_key).toBe(fieldKey);
  await page.locator('[data-catalog="documents"]').click();await noIDs(page.locator('main'));
  await expect(page.locator('.field-table')).toContainText('Họ tên đổi nhãn');await expect(page.locator('.field-table')).toContainText('Văn bản');
  await page.screenshot({path:`test-results/${info.project.name}-catalog-labels.png`,fullPage:false,animations:'disabled'});
});

test('GET consumers show dossier, people, group and audit names across pages',async({page})=>{
  const {calls,bundle}=await mockBackend(page,{intercept:({call,reply})=>{
    if(call.path==='/api/v1/audit-logs'){reply({items:[{id:ids.field,actor_id:ids.user,actor_name:'Người kiểm duyệt',resource:'dossier',resource_id:ids.dossier,resource_name:'Nhà ở đường 18',dossier_id:ids.dossier,dossier_title:'Nhà ở đường 18',action:'DOSSIER_REVIEWED',created_at:'2026-10-31T08:00:00Z'}],total:1});return true;}return false;
  }});
  bundle.dossier.title='Nhà ở đường 18';bundle.dossier.assignee_name='Chuyên viên phụ trách';
  bundle.dossier.configuration={definition,documents:type.document_schemas};
  bundle.files[0].document_type=docCode;
  bundle.document_groups=[{id:ids.requirement,file_id:ids.file,document_type:docCode,role:'Bên mua',pages:[1]}];
  bundle.decisions=[{id:ids.field,actor_id:ids.user,actor_name:'Người kiểm duyệt',action:'REQUEST_CHANGES',reason:'Kiểm tra bản gốc',created_at:'2026-10-31T08:00:00Z'}];
  await signIn(page);await noIDs(page.locator('main'));
  for(const label of ['Hồ sơ','Kiểm duyệt','Thành viên']){await openNav(page,label);await noIDs(page.locator('main'));}
  await page.goto(`/#/detail/${ids.dossier}`);await expect(page.locator('.detail-meta')).toContainText('Chuyên viên phụ trách');
  await noIDs(page.locator('main'));
  await page.locator('[data-tab="history"]').click();await expect(page.locator('.timeline')).toContainText('Người kiểm duyệt');await noIDs(page.locator('main'));
  await page.locator('[data-tab="documents"]').click();await expect(page.locator('#classify-group')).toContainText('Căn cước bản đầu');await noIDs(page.locator('main'));
  await page.locator('[data-tab="issues"]').click();await noIDs(page.locator('main'));
  await openNav(page,'Nhật ký hoạt động');await expect(page.locator('#audit-results')).toContainText('Hồ sơ · Nhà ở đường 18');await noIDs(page.locator('main'));
  await page.locator('#audit-results [data-open]').click();await expect(page).toHaveURL(new RegExp(ids.dossier));
  expect(calls.some(call=>call.path===`/api/v1/dossiers/${ids.dossier}`)).toBe(true);
});

test('non-admin assignment shows the name and preserves the selected UUID in its request',async({page})=>{
  const user={...fixtureUser,role:'manager',permissions:['dossier:read','dossier:assign']};
  const {calls,bundle}=await mockBackend(page,{user,intercept:({call,reply})=>{
    if(call.path.endsWith('/assignment')&&call.method==='PATCH'){reply(null);return true;}return false;
  }});
  bundle.dossier.assignee_name='Chuyên viên phụ trách';
  await signIn(page);await page.goto(`/#/detail/${ids.dossier}`);
  await page.getByRole('button',{name:'Thay đổi',exact:true}).click();
  const dialog=page.getByRole('dialog');await noIDs(dialog);
  await expect(dialog.locator('select[name="assigneeId"] option:checked')).toHaveText('Chuyên viên phụ trách');
  await expect(dialog.locator('[name="assigneeById"]')).toHaveValue('');
  await dialog.getByRole('button',{name:'Lưu phân công',exact:true}).click();await expect(dialog).toHaveCount(0);
  expect(JSON.parse(calls.find(call=>call.method==='PATCH').body).assignee_id).toBe(ids.user);
  expect(calls.some(call=>call.path==='/api/v1/auth/users')).toBe(false);
});
