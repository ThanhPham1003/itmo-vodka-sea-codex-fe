import test from 'node:test';
import assert from 'node:assert/strict';
import { dossierView } from '../src/backend-service.js';

const configuration={
  definition:{rules:[{code:'rule_technical',name:'Đối chiếu họ tên bên bán',left:{document_type:'doc_contract',field_key:'field_seller'},right:{document_type:'doc_identity',field_key:'field_name'}}]},
  documents:[
    {code:'doc_contract',definition:{name:'Hợp đồng',fields:[{key:'field_seller',label:'Họ tên bên bán'}]}},
    {code:'doc_identity',definition:{name:'Căn cước',fields:[{key:'field_name',label:'Họ và tên'}]}}
  ]
};
const files=[{id:'original',original_name:'giay-to.pdf',document_type:''},{id:'derived',source_file_id:'original',original_name:'document-1.pdf',document_type:'doc_identity'}];
const groups=[{id:'group-id',file_id:'derived',document_type:'doc_identity',pages:[2]}];
const fields=[{id:'field-id',file_id:'original',document_group_id:'group-id',key:'field_name',label:'Legacy label',value:'Never copy this private value'}];
const evidence={file_id:'derived',document_group_id:'group-id',field_id:'field-id',field_key:'field_name',page:2,value:'••••••'};
function view(issues,overrides={}) { return dossierView({dossier:{configuration},files,document_groups:groups,fields,issues,...overrides}).issues; }

test('system issues show readable titles while retaining action identifiers and source documents',()=>{
  const input=[
    {id:'classification-issue',rule_code:'classification:group-id',code:'CLASSIFICATION_UNCERTAIN',status:'OPEN',severity:'WARNING',evidence:[{file_id:'derived',document_group_id:'group-id',value:''}]},
    {id:'field-issue',rule_code:'field:field-id',code:'FIELD_NEEDS_VERIFICATION',evidence:[evidence]},
    {id:'special-issue',rule_code:'special:group-id:check-id',code:'SPECIAL_CHECK',evidence:[{...evidence,field_key:'',field_id:''}]}
  ];
  const issues=view(input);
  assert.deepEqual(issues.map(issue=>issue.name),['Xác nhận loại giấy tờ và đối tượng','Xác minh trường dữ liệu','Kiểm tra yêu cầu đặc biệt']);
  assert.deepEqual(issues.map(issue=>issue.id),input.map(issue=>issue.id));
  assert.deepEqual(issues.map(issue=>issue.rule_code),input.map(issue=>issue.rule_code));
  assert.equal(issues[0].left.value,'giay-to.pdf');
  assert.equal(issues[0].left.label,'Căn cước');
  assert.equal(issues[0].left.page,2);
  assert.equal(issues[1].left.label,'Căn cước · Họ và tên');
  assert.equal(issues[1].left.value,'••••••');
  for(const issue of issues){assert.equal(issue.singleSource,true);assert.equal(issue.right,null);}
  assert.equal(input[0].evidence[0].value,'','presentation does not mutate source data');
});

test('comparison rules and labels resolve from the pinned snapshot even without evidence',()=>{
  const [issue]=view([{id:'comparison-issue',rule_code:'rule_technical',code:'PENDING_DOCUMENTS',evidence:null}]);
  assert.equal(issue.name,'Đối chiếu họ tên bên bán');
  assert.equal(issue.nameIsUserContent,true);
  assert.equal(issue.singleSource,false);
  assert.equal(issue.left.label,'Hợp đồng · Họ tên bên bán');
  assert.equal(issue.right.label,'Căn cước · Họ và tên');
  assert.equal(issue.left.value,'');
  assert.equal(issue.right.value,'');
});

test('missing snapshot references have safe fallback titles and never reconstruct private evidence',()=>{
  const [unknown,field,legacy]=view([
    {id:'unknown',rule_code:'rule_unknown_uuid',code:'FUTURE_CHECK',evidence:[]},
    {id:'field',rule_code:'field:field-id',code:'FIELD_NEEDS_VERIFICATION',evidence:[{...evidence,value:''}]},
    {id:'legacy',rule_code:'classification:group-id',evidence:[]}
  ],{dossier:{configuration:{documents:null,definition:{rules:null}}}});
  assert.equal(unknown.name,'Kiểm tra đối soát');
  assert.equal(field.left.label,'Legacy label');
  assert.equal(field.left.value,'');
  assert.equal(legacy.name,'Xác nhận loại giấy tờ và đối tượng');
  assert.equal(legacy.singleSource,true);
  assert.doesNotMatch(JSON.stringify([unknown,field,legacy]),/Never copy this private value/);
});
