import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemo, companies } from '../src/demo-service.js';

test('tenant scope and platform role cannot access tenant dossiers', () => {
  const demo=createDemo();const ap=demo.listDossiers()[0];
  demo.login(companies[1].id,'company_admin');
  assert.throws(()=>demo.getDossier(ap.id),/Không tìm thấy/);
  assert.equal(demo.listDossiers().length,4);
  demo.login(companies[0].id,'platform_admin');
  assert.throws(()=>demo.listDossiers(),/không có quyền/);
});

test('broker receives masked fields and cannot correct, approve or reveal PII', () => {
  const demo=createDemo();demo.login(companies[0].id,'broker');
  const dossier=demo.listDossiers().find(d=>d.status==='VALID_DOCUMENT'),file=dossier.files[0],field=file.fields.find(f=>f.pii);
  assert.ok(field.value.includes('•'));
  assert.ok(!field.source.excerpt.includes(dossier.name));
  assert.throws(()=>demo.correctField(dossier.id,file.id,field.key,'Other','OCR_ERROR'),/không có quyền/);
  assert.throws(()=>demo.review(dossier.id,'APPROVE','Kiểm tra'),/không có quyền/);
  assert.throws(()=>demo.reveal(dossier.id,file.id,field.key),/không có quyền/);
});

test('missing source remains pending, not matched or blocker', () => {
  const demo=createDemo();const dossier=demo.listDossiers().find(d=>d.status==='MISSING_DOCUMENT');
  const pending=dossier.issues.find(i=>i.status==='PENDING_DOCUMENTS');
  assert.ok(pending);assert.equal(pending.severity,'INFO');
  assert.throws(()=>demo.review(dossier.id,'APPROVE','Đủ điều kiện'),/Chỉ duyệt/);
});

test('low confidence creates a warning; approval waits for explicit acknowledgement', () => {
  const demo=createDemo();const dossier=demo.listDossiers().find(d=>d.status==='VALID_DOCUMENT'&&d.issues.some(i=>i.severity==='WARNING'));
  const warning=dossier.issues.find(i=>i.severity==='WARNING');
  assert.equal(warning.status,'OPEN');
  assert.throws(()=>demo.review(dossier.id,'APPROVE','Đủ điều kiện'),/Chỉ duyệt/);
  assert.throws(()=>demo.acknowledgeIssue(dossier.id,warning.id,''),/không được để trống/);
  demo.acknowledgeIssue(dossier.id,warning.id,'Đã đối chiếu bằng chứng trong bản demo.');
  assert.equal(demo.review(dossier.id,'APPROVE','Đã kiểm tra đầy đủ.').status,'APPROVED_DOCUMENT');
});

test('blocker cannot be waived; correction with reason reruns reconciliation', () => {
  const demo=createDemo();const dossier=demo.listDossiers().find(d=>d.status==='INVALID_DOCUMENT'&&d.issues.some(i=>i.severity==='BLOCKER'));
  const blocker=dossier.issues.find(i=>i.severity==='BLOCKER');
  assert.throws(()=>demo.acknowledgeIssue(dossier.id,blocker.id,'Bỏ qua'),/Chỉ cảnh báo/);
  const file=dossier.files.find(f=>f.typeCode==='giay-chung-nhan');
  assert.throws(()=>demo.correctField(dossier.id,file.id,'ho-ten',dossier.name,'OTHER'),/cần ghi chú/);
  const result=demo.correctField(dossier.id,file.id,'ho-ten',dossier.name,'OCR_ERROR');
  assert.equal(result.status,'VALID_DOCUMENT');
  assert.ok(result.issues.every(i=>i.status==='RESOLVED'));
  const audit=demo.audit().find(e=>e.action==='CORRECT_FIELD');assert.ok(audit);assert.ok(!audit.description.includes(dossier.name));
});

test('PII reveal is explicit and audited, and never changes the default masked DTO', () => {
  const demo=createDemo(),dossier=demo.listDossiers()[0],file=dossier.files[0],field=file.fields.find(f=>f.pii);
  const raw=demo.reveal(dossier.id,file.id,field.key);
  assert.ok(raw);assert.notEqual(raw,field.value);
  assert.equal(demo.getDossier(dossier.id).files[0].fields.find(f=>f.key===field.key).value,field.value);
  assert.ok(demo.audit().some(e=>e.action==='VIEW_PII'&&e.dossierId===dossier.id));
});

test('approved data stays locked until a reasoned reopen; earlier decisions stay', () => {
  const demo=createDemo(),dossier=demo.listDossiers().find(d=>d.status==='APPROVED_DOCUMENT'),file=dossier.files[0];
  assert.throws(()=>demo.correctField(dossier.id,file.id,'ho-ten','Khác','OCR_ERROR'),/đã khóa/);
  assert.throws(()=>demo.reopen(dossier.id,''),/không được để trống/);
  const reopened=demo.reopen(dossier.id,'Bổ sung kiểm tra giấy tờ mới');
  assert.notEqual(reopened.status,'APPROVED_DOCUMENT');
  assert.equal(reopened.version,dossier.version+1);assert.equal(reopened.decisions.length,dossier.decisions.length);
});

test('catalog updates do not change a dossier snapshot or checklist', () => {
  const demo=createDemo(),dossier=demo.listDossiers()[0];
  const type=demo.listDossierTypes().find(t=>t.code===dossier.typeCode);
  demo.saveDossierType({...type,name:'Loại đã đổi',documents:type.documents.filter(d=>d.code!=='ket-hon')});
  const after=demo.getDossier(dossier.id);
  assert.equal(after.configVersion,dossier.configVersion);assert.equal(after.typeName,dossier.typeName);assert.deepEqual(after.checklist,dossier.checklist);
  const fresh=demo.createDossier({name:'Mới',typeCode:type.code});assert.equal(fresh.configVersion,type.version+1);assert.equal(fresh.typeName,'Loại đã đổi');
});

test('last company admin cannot be removed', () => {
  const demo=createDemo(),admin=demo.listMembers().find(m=>m.role==='company_admin');
  assert.throws(()=>demo.updateMember(admin.id,{role:'broker'}),/quản trị viên hoạt động cuối cùng/);
  assert.throws(()=>demo.updateMember(admin.id,{status:'suspended'}),/quản trị viên hoạt động cuối cùng/);
});

test('upload validates each file independently, preserves batch, detects content duplicates', async () => {
  const demo=createDemo(),dossier=demo.createDossier({name:'Tải bổ sung',typeCode:demo.listDossierTypes()[0].code});
  const file=(name,content)=>new File([content],name,{type:'application/pdf'});
  const result=await demo.upload(dossier.id,[file('ok.pdf','one'),file('wrong.exe','two')],'cccd');
  assert.equal(result[0].success,true);assert.equal(result[1].success,false);
  const duplicate=await demo.upload(dossier.id,[file('different-name.pdf','one')],'cccd');assert.equal(duplicate[0].success,false);assert.match(duplicate[0].error,/trùng nội dung/);
  await demo.upload(dossier.id,[file('next.pdf','three')],'giay-chung-nhan');
  assert.deepEqual(demo.getDossier(dossier.id).files.map(f=>f.batch),[1,2]);
});

test('registration is atomic in memory and never stores a password', () => {
  const demo=createDemo(),before=companies.length;
  assert.throws(()=>demo.registerCompany({name:'Mới'}),/không được để trống/);assert.equal(companies.length,before);
  const session=demo.registerCompany({name:'Demo Test',legalName:'Công ty Demo Test',businessRegistrationNumber:crypto.randomUUID(),adminName:'Test Admin',adminEmail:crypto.randomUUID()+'@example.test',username:crypto.randomUUID(),password:'sample-password'});
  assert.equal(session.role,'company_admin');assert.equal(demo.listDossiers().length,0);assert.equal(demo.listMembers().length,1);
  assert.ok(!JSON.stringify(demo.listMembers()).includes('sample-password'));
});

test('chart drill-down uses transitions rather than current state and date of creation', () => {
  const demo=createDemo();
  const stats=demo.stats({metric:'transitions',from:'2026-10-25',to:'2026-10-31'});
  const allProcessing=demo.listDossiers({metric:'transitions',status:'PROCESSING',from:'2026-10-25',to:'2026-10-31'});
  assert.equal(allProcessing.length,stats.counts.PROCESSING);
  assert.ok(allProcessing.some(d=>d.status==='APPROVED_DOCUMENT'));
  assert.ok(allProcessing.length>demo.listDossiers({status:'PROCESSING'}).length);
  for(const day of stats.series)for(const status of ['PROCESSING','MISSING_DOCUMENT','INVALID_DOCUMENT','VALID_DOCUMENT','APPROVED_DOCUMENT','REJECTED']){
    const drilldown=demo.listDossiers({metric:'transitions',status,from:day.date,to:day.date});
    assert.equal(drilldown.length,day.counts[status]);
  }
});

test('chart contains zero days and ends at the selected day', () => {
  const demo=createDemo();const stats=demo.stats({metric:'transitions',to:'2026-10-31'});
  assert.equal(stats.series.length,7);assert.equal(stats.series[0].date,'2026-10-25');assert.equal(stats.series.at(-1).date,'2026-10-31');
  assert.ok(Object.values(stats.series[0].counts).every(n=>n===0));
});

test('a rejected dossier is terminal and cannot be reopened', () => {
  const demo=createDemo(),dossier=demo.listDossiers().find(d=>d.status==='REJECTED');
  assert.throws(()=>demo.reopen(dossier.id,'Thử mở lại'),/hồ sơ từ chối là trạng thái cuối/);
  assert.equal(demo.getDossier(dossier.id).status,'REJECTED');
});

test('member management remains reserved to company admin even with extra permission', () => {
  const demo=createDemo(),manager=demo.listMembers().find(m=>m.role==='manager');
  demo.updateMember(manager.id,{permissions:['users:manage']});demo.login(companies[0].id,'manager');
  assert.equal(demo.can('users:manage'),false);
  assert.throws(()=>demo.createMember({name:'X',email:'x@example.test',role:'broker'}),/không có quyền/);
  assert.throws(()=>demo.updateMember(manager.id,{role:'company_admin'}),/không có quyền/);
});

test('unresolved conditional requirements keep complete-source dossier out of review queue', async () => {
  const demo=createDemo(),dossier=demo.createDossier({name:'Điều kiện cần xác định',typeCode:demo.listDossierTypes()[0].code});
  for(const [i,code] of ['cccd','giay-chung-nhan','hop-dong'].entries())await demo.upload(dossier.id,[new File(['condition-'+i],code+'.pdf',{type:'application/pdf'})],code);
  const complete=demo.getDossier(dossier.id);assert.ok(complete.issues.every(i=>i.status==='RESOLVED'));
  assert.equal(complete.status,'MISSING_DOCUMENT');assert.ok(complete.checklist.some(c=>c.status==='PENDING_CONDITION'));
  assert.throws(()=>demo.review(dossier.id,'APPROVE','Đã kiểm tra'),/Chỉ duyệt/);
  assert.equal(demo.removeRequirement(dossier.id,'ket-hon','Đã xác minh tài sản riêng trong demo.').status,'VALID_DOCUMENT');
});
