import test from 'node:test';
import assert from 'node:assert/strict';
import { dossierView } from '../src/backend-service.js';
import { approvalReadiness } from '../src/review-readiness.js';

const ready={status:'VALID_DOCUMENT',issues:[],checklist:[],invalidRequiredFields:[]};
test('acknowledging every warning does not make empty or invalid required fields approvable',()=>{
  const dossier=dossierView({dossier:{...ready,version:14},fields:[
    {id:'missing',label:'Ngày ký hợp đồng',required:true,value:'',validation:'MISSING'},
    {id:'invalid',label:'Số giấy tờ bên bán',required:true,value:'masked-value',validation:'INVALID_FORMAT'},
    {id:'valid-zero',label:'Amount',required:true,value:'0',validation:'VALID'},
    {id:'optional',required:false,value:'',validation:'MISSING'}
  ],issues:[{id:'warning',status:'ACKNOWLEDGED',severity:'WARNING'}]});
  assert.deepEqual(dossier.invalidRequiredFields.map(field=>field.id),['missing','invalid']);
  assert.doesNotMatch(JSON.stringify(dossier.invalidRequiredFields),/masked-value/);
  assert.equal(approvalReadiness(dossier).allowed,false);
  assert.match(approvalReadiness(dossier).message,/trường bắt buộc/);
  assert.equal(approvalReadiness({...dossier,invalidRequiredFields:[]}).allowed,true);
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
