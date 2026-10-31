import test from 'node:test';
import assert from 'node:assert/strict';
import { dossierView } from '../src/backend-service.js';
import { approvalReadiness, reviewOutstandingCount, requiredFieldsToReview } from '../src/review-readiness.js';
import { translateText } from '../src/i18n.js';

const ready={status:'VALID_DOCUMENT',issues:[],checklist:[],invalidRequiredFields:[]};
test('required-information summary has readable English singular and plural labels',()=>{
  assert.equal(translateText('1 thông tin bắt buộc cần xử lý'),'1 required item needs attention');
  assert.equal(translateText('5 thông tin bắt buộc cần xử lý'),'5 required items need attention');
});
test('unrelated acknowledgements do not accept a different required field',()=>{
  const dossier=dossierView({dossier:{...ready,version:14},fields:[
    {id:'missing',label:'Ngày ký hợp đồng',required:true,value:'',validation:'MISSING'},
    {id:'invalid',label:'Số giấy tờ bên bán',required:true,value:'masked-value',validation:'INVALID_FORMAT'},
    {id:'valid-zero',label:'Amount',required:true,value:'0',validation:'VALID'},
    {id:'optional',required:false,value:'',validation:'MISSING'}
  ],issues:[{id:'warning',status:'ACKNOWLEDGED',severity:'WARNING'}]});
  assert.deepEqual(dossier.invalidRequiredFields.map(field=>field.id),['missing','invalid']);
  assert.doesNotMatch(JSON.stringify(dossier.invalidRequiredFields),/masked-value/);
  assert.equal(approvalReadiness(dossier).allowed,false);
  assert.equal(reviewOutstandingCount(dossier),2);
  assert.match(approvalReadiness(dossier).message,/thông tin bắt buộc/);
  assert.equal(approvalReadiness({...dossier,invalidRequiredFields:[]}).allowed,true);
});

test('each required-field warning accepted with reviewer and reason enables final approval',()=>{
  const reviewer='11111111-1111-4111-8111-111111111111';
  const dossier={...ready,invalidRequiredFields:[{id:'date'},{id:'identity'}],issues:['date','identity'].map(id=>({id:'issue-'+id,rule_code:'field:'+id,code:'FIELD_NEEDS_VERIFICATION',severity:'WARNING',status:'ACKNOWLEDGED',acknowledged_by:reviewer,acknowledgement:'Checked original and accepted',evidence:[{field_id:id}]}))};
  assert.equal(approvalReadiness(dossier).allowed,true);assert.equal(reviewOutstandingCount(dossier),0);assert.deepEqual(requiredFieldsToReview(dossier),[]);
  for(const patch of [{status:'OPEN'},{acknowledged_by:null},{acknowledgement:''},{rule_code:'field:another'},{evidence:[{field_id:'another'}]},{severity:'BLOCKER'}]){
    const changed={...dossier,issues:[{...dossier.issues[0],...patch},dossier.issues[1]]};
    assert.equal(approvalReadiness(changed).allowed,false,JSON.stringify(patch));assert.equal(requiredFieldsToReview(changed).length,1);
  }
  assert.equal(approvalReadiness({...dossier,issues:[...dossier.issues,{status:'OPEN',severity:'BLOCKER'}]}).allowed,false);
});

test('outstanding total includes invalid required fields after acknowledgement without counting field warnings twice',()=>{
  const dossier={...ready,invalidRequiredFields:[{id:'date'},{id:'seller'}],issues:[
    {id:'date-warning',code:'FIELD_NEEDS_VERIFICATION',rule_code:'field:date',status:'OPEN',severity:'WARNING'},
    {id:'seller-warning',code:'FIELD_NEEDS_VERIFICATION',evidence:[{field_id:'seller'}],status:'OPEN',severity:'WARNING'},
    {id:'info',status:'OPEN',severity:'INFO'}
  ]};
  assert.equal(reviewOutstandingCount(dossier),2);
  assert.equal(reviewOutstandingCount({...dossier,issues:dossier.issues.map(issue=>({...issue,status:'ACKNOWLEDGED'}))}),2);
  assert.equal(reviewOutstandingCount({...dossier,issues:[...dossier.issues,{id:'comparison',status:'OPEN',severity:'BLOCKER'}]}),3);
  assert.equal(reviewOutstandingCount({...ready,issues:[{status:'PENDING_DOCUMENTS',severity:'INFO'}]}),1);
  assert.equal(reviewOutstandingCount(ready),0);
});

test('approval readiness agrees with warning, blocker, pending-document and checklist guards',()=>{
  for(const issue of [{status:'OPEN',severity:'WARNING'},{status:'OPEN',severity:'BLOCKER'},{status:'PENDING_DOCUMENTS',severity:'INFO'}]) {
    assert.equal(approvalReadiness({...ready,issues:[issue]}).allowed,false);
  }
  for(const issue of [{status:'ACKNOWLEDGED',severity:'WARNING'},{status:'RESOLVED',severity:'BLOCKER'},{status:'OPEN',severity:'INFO'}]) {
    assert.equal(approvalReadiness({...ready,issues:[issue]}).allowed,true);
  }
  assert.equal(approvalReadiness({...ready,checklist:[{status:'MISSING_DOCUMENT',required:true}]}).allowed,false);
  assert.equal(approvalReadiness({...ready,checklist:[{status:'PENDING_CONDITION',required:false}]}).allowed,false);
  assert.equal(approvalReadiness({...ready,checklist:[{status:'NOT_REQUIRED',required:true}]}).allowed,true);
  for(const status of ['PROCESSING','MISSING_DOCUMENT','INVALID_DOCUMENT','APPROVED_DOCUMENT','REJECTED'])assert.equal(approvalReadiness({...ready,status}).allowed,false);
});
