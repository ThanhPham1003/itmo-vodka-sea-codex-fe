import test from 'node:test';
import assert from 'node:assert/strict';
import {catalogDocument,catalogReferenceLabel} from '../src/display-labels.js';
import {catalogView,dossierView,auditView} from '../src/backend-service.js';

test('catalog labels use pinned schemas and never fall back to technical field codes',()=>{
  const type=catalogView({code:'dossier_internal',definition:{documents:[{document_type:'doc_internal',schema_version:1}]},document_schemas:[{code:'doc_internal',version:1,definition:{name:'Giấy tờ cũ',fields:[{key:'field_internal',label:'Nhãn cũ'}]}}]},'dossiers');
  const current=[{code:'doc_internal',version:2,name:'Tên mới',fields:[{key:'field_internal',label:'Nhãn mới'}]}];
  const ref={document_type:'doc_internal',field_key:'field_internal',role:'Bên mua'};
  assert.equal(catalogReferenceLabel(type,ref,current),'Giấy tờ cũ · Nhãn cũ · Bên mua');
  assert.equal(catalogDocument(type,'doc_internal',current).version,1);
  assert.equal(catalogReferenceLabel({...type,documentSchemas:[]},ref,current),'Loại giấy tờ không còn khả dụng · Trường dữ liệu không còn khả dụng · Bên mua');
});

test('GET display adapters retain action identifiers without displaying them as labels',()=>{
  const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const view=dossierView({dossier:{id,title:'Nhà ở',dossier_type:'dossier_internal',assignee_id:id,assignee_name:'Người phụ trách'},files:[{id,document_type:'doc_internal'}],document_groups:[{id,file_id:id,document_type:'doc_internal'}],decisions:[{actor_id:id,actor_name:'Người kiểm duyệt'}]});
  assert.equal(view.id,id);assert.equal(view.assigneeId,id);assert.equal(view.assigneeName,'Người phụ trách');assert.equal(view.reference,'');
  assert.equal(view.typeName,'Loại hồ sơ không còn khả dụng');assert.equal(view.files[0].typeName,'Chưa phân loại');assert.equal(view.files[0].groups[0].typeName,'Chưa phân loại');
  assert.equal(view.history[0].actor,'Người kiểm duyệt');
  assert.equal(dossierView({decisions:[{actor_id:id}]}).history[0].actor,'Thành viên không còn khả dụng');
  const audit=auditView({resource:'file',resource_id:id,resource_name:'Hợp đồng.pdf',dossier_id:id,dossier_title:'Nhà ở',actor_id:id,actor_name:'Chuyên viên'});
  assert.equal(audit.description,'Tài liệu · Hợp đồng.pdf');assert.equal(audit.reference,'Nhà ở');assert.equal(audit.dossierId,id);
  const missing=auditView({resource:'file',resource_id:id,dossier_id:id,actor_id:id});
  assert.equal(missing.description,'Tài liệu');assert.equal(missing.reference,'');assert.equal(missing.actor,'');
});
