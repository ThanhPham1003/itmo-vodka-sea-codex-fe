import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../src/api.js';
import { createBackendService, dossierView, catalogView, auditView } from '../src/backend-service.js';
import { liveDocumentPreview } from '../src/document-view.js';
import { translateText } from '../src/i18n.js';

const uid='11111111-1111-4111-8111-111111111111';
const did='22222222-2222-4222-8222-222222222222';
const fid='33333333-3333-4333-8333-333333333333';
const actor={id:uid,company_id:did,full_name:'Test Admin',role:'company_admin',active:true,permissions:['user:manage','dossier:read','dossier:correct','catalog:manage'],company:{id:did,name:'Test Company'}};
const bundle={dossier:{id:did,title:'Case',version:7,dossier_type:'case',configuration:{documents:[]}},files:[{id:fid,batch_id:uid,original_name:'sample.pdf',source_pages:[1,2]}],document_groups:[],fields:[{id:'field-1',file_id:fid,key:'name',document_group_id:'group-1'},{id:'field-2',file_id:fid,key:'name',document_group_id:'group-2'}],checklist:[],issues:[],decisions:[]};
const response=(data,status=200)=>new Response(JSON.stringify({code:status,message:'Test response',data}),{status,headers:{'Content-Type':'application/json'}});

test('audit uses server actor names and resolves legacy self events without displaying UUIDs',()=>{
  const other='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const row={actor_id:other,actor_name:'Nguyễn Văn Bình',resource:'user',resource_id:other,action:'LOGIN'};
  const view=auditView(row,actor);assert.equal(view.actor,'Nguyễn Văn Bình');assert.equal(view.description,'Thành viên · Nguyễn Văn Bình');assert.equal(view.actor_id,other);
  const self=auditView({...row,actor_id:uid,actor_name:undefined,resource_id:uid},actor);assert.equal(self.actor,'Test Admin');assert.equal(self.description,'Thành viên · Test Admin');
  const missing=auditView({...row,actor_name:''},actor);assert.equal(missing.actor,'');assert.equal(missing.actorIsSystem,false);
  const system=auditView({...row,actor_id:'00000000-0000-0000-0000-000000000000',actor_name:''},actor);assert.equal(system.actorIsSystem,true);assert.equal(system.actor,'');
  const company=auditView({...row,resource:'company',resource_id:did},actor);assert.equal(company.description,'Công ty · Test Company');
});
function setup(handler=()=>response(null),catalogs={}) {
  const calls=[];
  const client=new ApiClient({fetchImpl:async(path,init)=>{
    calls.push({path,init});
    if(path==='/api/v1/auth/login')return response({access_token:'test-token',token_type:'Bearer',user:actor});
    if(path==='/api/v1/auth/me')return response(actor);
    if(path.includes('document-types?')||path.includes('dossier-types?')||path.includes('/auth/users?')) {
      const items=path.includes('document-types?')?catalogs.documents||[]:path.includes('dossier-types?')?catalogs.dossiers||[]:catalogs.users||[];
      return response({items,total:items.length,limit:100,offset:0});
    }
    return handler(path,init);
  }});
  return {client,service:createBackendService(client),calls};
}
test('login is public, resolves me, keeps the company and maps effective permissions',async()=>{
  const {service,calls}=setup();await service.login(' admin ','long-password');
  assert.equal(new Headers(calls[0].init.headers).has('Authorization'),false);
  assert.deepEqual(JSON.parse(calls[0].init.body),{username_or_email:'admin',password:'long-password'});
  assert.equal(new Headers(calls[1].init.headers).get('Authorization'),'Bearer test-token');
  assert.equal(service.company.name,'Test Company');assert.equal(service.can('user:manage'),true);assert.equal(service.can('dossier:classify'),true);
  service.logout();assert.equal(service.session,null);assert.deepEqual(service.listDossiers(),[]);
});
test('bad login does not invalidate an existing session or send its token',async()=>{
  let expired=0,headers;
  const client=new ApiClient({onUnauthenticated:()=>expired++,fetchImpl:async(_path,init)=>{headers=init.headers;return response(null,401);}});
  client.setAccessToken('existing-token');await assert.rejects(client.request('/api/v1/auth/login',{method:'POST',body:{username_or_email:'wrong',password:'wrong'}}),error=>error.status===401);
  assert.equal(expired,0);assert.equal(headers.has('Authorization'),false);
});
test('list sends server-side history filters, timezone and pagination without filtering current status locally',async()=>{
  const {service,calls}=setup(()=>response({items:[bundle.dossier],total:42,limit:20,offset:20}));await service.login('admin','long-password');
  await service.load({page:'dossiers',search:'hello',status:'APPROVED_DOCUMENT',type:'case',from:'2026-10-01',to:'2026-10-31',assignee:uid,offset:20});
  const url=new URL(calls.at(-1).path,'https://example.test');
  assert.equal(url.searchParams.get('dossier_type'),'case');assert.equal(url.searchParams.get('assignee_id'),uid);assert.equal(url.searchParams.get('timezone'),'Asia/Ho_Chi_Minh');assert.equal(url.searchParams.get('offset'),'20');
  assert.equal(service.listDossiers()[0].id,did);assert.equal(service.pagination.total,42);
});
test('corrections use field UUID and version; 409 reloads detail without replaying mutation',async()=>{
  let attempts=0;
  const {service,calls}=setup((path,init)=>{
    if(init.method==='PATCH'){attempts++;return response(null,409);}
    return response({...bundle,dossier:{...bundle.dossier,version:attempts?8:7}});
  });
  await service.login('admin','long-password');await service.load({page:'detail',id:did});
  await assert.rejects(service.correctField(did,fid,'field-2','fixed','OCR_ERROR','note'),error=>error.status===409);
  const mutation=calls.find(call=>call.init.method==='PATCH');
  assert.equal(mutation.path,`/api/v1/dossiers/${did}/fields/field-2`);
  assert.deepEqual(JSON.parse(mutation.init.body),{expected_version:7,value:'fixed',reason:'OCR_ERROR',note:'note'});
  assert.equal(attempts,1);assert.equal(service.getDossier(did).version,8);
});
test('upload repeats multipart metadata and preserves duplicate and partial errors',async()=>{
  let upload;
  const {service}=setup((_path,init)=>{upload=init.body;return response({batch_id:uid,files:[{id:fid,name:'a.pdf',status:'DUPLICATE'},{name:'b.pdf',status:'REJECTED',error:'Unreadable'}]});});
  const files=['a.pdf','b.pdf'].map(name=>new File(['sample'],name,{type:'application/pdf'}));
  const result=await service.upload(did,files,'identity',{role:'seller'});
  assert.equal(upload.getAll('files').length,2);assert.deepEqual(upload.getAll('document_types'),['identity','identity']);assert.deepEqual(upload.getAll('roles'),['seller','seller']);
  assert.equal(result[0].duplicate,true);assert.equal(result[0].success,false);assert.equal(result[1].error,'Unreadable');
});
test('field identifiers stay distinct for repeated schema keys across document groups',()=>{
  const d=dossierView(bundle);assert.deepEqual(d.files[0].fields.map(field=>field.key),['field-1','field-2']);
  assert.deepEqual(d.files[0].fields.map(field=>field.schemaKey),['name','name']);
});
test('protected content uses Bearer headers and returns a blob; HTML is rejected',async()=>{
  let headers;
  const client=new ApiClient({fetchImpl:async(_path,init)=>{headers=init.headers;return new Response('image',{headers:{'Content-Type':'image/png'}});}});
  client.setAccessToken('private-token');const blob=await createBackendService(client).viewOriginal(did,fid);
  assert.equal(blob.type,'image/png');assert.equal(headers.get('Authorization'),'Bearer private-token');
  const invalid=new ApiClient({fetchImpl:async()=>new Response('<html>',{headers:{'Content-Type':'text/html'}})});
  await assert.rejects(invalid.request(`/api/v1/dossiers/${did}/files/${fid}/content`,{responseType:'blob'}),error=>error.status===502);
});
test('a response arriving after logout cannot restore protected data',async()=>{
  let resolve;
  const {service}=setup(()=>new Promise(done=>{resolve=done;}));await service.login('admin','long-password');
  const pending=service.load({page:'detail',id:did},{background:true});service.logout();resolve(response(bundle));
  await assert.rejects(pending,error=>error.status===499);assert.equal(service.getDossier(did),null);
});
test('English handles UI messages and dynamic counts without changing unknown company content',()=>{
  assert.equal(translateText('Chào mừng trở lại'),'Welcome back');assert.equal(translateText('Trang 2 / 5'),'Page 2 / 5');
  assert.equal(translateText('24 hồ sơ'),'24 dossiers');assert.equal(translateText('An Phát Land'),'An Phát Land');
  assert.equal(translateText('Mật khẩu xác nhận không khớp.'),'The passwords do not match.');
});
test('catalog edits preserve repeated roles, pinned schemas, typed conditions and subject references',async()=>{
  const definition={name:'Sale',description:'Before',documents:[
    {key:'seller',document_type:'identity',role:'seller',schema_version:2,min_count:2,required:true},
    {key:'buyer',document_type:'identity',role:'buyer',schema_version:2,min_count:1,required:false,conditional:true,trigger_reason:'When married',condition:{document_type:'identity',role:'seller',field_key:'married',operator:'equals',value:'true'}}
  ],rules:[{code:'names',name:'Name',left:{document_type:'identity',field_key:'name',role:'seller',subject_field:'id'},right:{document_type:'identity',field_key:'name',role:'buyer',subject_field:'id'},operator:'TEXT_EQUALS',severity:'WARNING',message:'Names do not match',remediation:'Check the original documents'}]};
  const {service,calls}=setup((_path,init)=>response({code:'sale',current_version:6,definition:JSON.parse(init.body)}),{documents:[{code:'identity',current_version:3,definition:{name:'Identity',fields:[]}}],dossiers:[{code:'sale',current_version:5,definition}]});
  await service.login('admin','long-password');await service.load({page:'catalog'});
  const selected=service.listDossierTypes()[0];await service.saveDossierType({...selected,description:'After'});
  const body=JSON.parse(calls.at(-1).init.body);assert.equal(body.expected_version,5);assert.equal(body.description,'After');
  assert.deepEqual(body.documents.map(doc=>[doc.key,doc.role,doc.schema_version,doc.min_count]),[['seller','seller',2,2],['buyer','buyer',2,1]]);
  assert.deepEqual(body.documents[1].condition,definition.documents[1].condition);assert.deepEqual(body.rules[0].left,definition.rules[0].left);
  assert.deepEqual(body.rules,definition.rules,'UI aliases must not leak into strict backend rule DTOs');
});
test('new comparison rules serialize only API fields and retain edited references and subject joins',async()=>{
  const {service,calls}=setup((_path,init)=>response({code:'new-sale',current_version:1,definition:JSON.parse(init.body)}));
  const rule={code:'',id:'editor-id',name:'Compare document numbers',leftType:'contract',leftField:'seller-number',rightType:'identity',rightField:'id-number',
    left:{document_type:'old-type',field_key:'old-field',role:'seller',subject_field:'seller-name',editorOnly:true},
    right:{document_type:'old-type',field_key:'old-field',role:'owner',subject_field:'full-name',editorOnly:true},
    operator:'DIGITS_EQUAL',severity:'WARNING',message:'Numbers do not match',remediation:'Check the original documents',editorOnly:true};
  await service.saveDossierType({name:'Sale',description:'Draft',documents:[],rules:[rule]});
  assert.equal(calls.at(-1).init.method,'POST');
  const body=JSON.parse(calls.at(-1).init.body);
  assert.equal(body.expected_version,0);
  assert.deepEqual(body.rules,[{code:'',name:'Compare document numbers',
    left:{document_type:'contract',field_key:'seller-number',role:'seller',subject_field:'seller-name'},
    right:{document_type:'identity',field_key:'id-number',role:'owner',subject_field:'full-name'},
    operator:'DIGITS_EQUAL',severity:'WARNING',message:'Numbers do not match',remediation:'Check the original documents'}]);
  assert.equal(rule.left.document_type,'old-type','serializing must not mutate the editor draft');
  assert.equal(rule.id,'editor-id');
});
test('background completion rejected while an editor is open does not change the revision',async()=>{
  let version=7;
  const {service}=setup(()=>response({...bundle,dossier:{...bundle.dossier,version}}));await service.login('admin','long-password');await service.load({page:'detail',id:did});
  version=8;const loaded=await service.load({page:'detail',id:did},{background:true,accept:()=>false});
  assert.equal(loaded,false);assert.equal(service.getDossier(did).version,7);
});
test('approval conflicts at the same revision explain invalid required fields without replaying the decision',async()=>{
  let decisions=0;
  const {service,calls}=setup((path)=>{
    if(path.endsWith('/decisions')){decisions++;return response(null,409);}
    return response({...bundle,dossier:{...bundle.dossier,status:'VALID_DOCUMENT',version:14},fields:[{id:'missing',file_id:fid,label:'Signing date',required:true,value:'',validation:'MISSING'}],issues:[{id:'warning',status:'ACKNOWLEDGED',severity:'WARNING'}]});
  });
  await service.login('admin','long-password');await service.load({page:'detail',id:did});
  await assert.rejects(service.review(did,'APPROVE','Checked'),error=>{
    assert.equal(error.status,409);assert.equal(error.reloadRequired,true);
    assert.match(error.message,/thông tin bắt buộc/);assert.doesNotMatch(error.message,/đã thay đổi/i);return true;
  });
  assert.equal(decisions,1);assert.equal(service.getDossier(did).version,14);
  assert.deepEqual(service.getDossier(did).invalidRequiredFields.map(field=>field.label),['Signing date']);
  assert.equal(JSON.parse(calls.find(call=>call.path.endsWith('/decisions')).init.body).expected_version,14);
});
test('nullable dashboard maps, permissions and detail arrays match the 1a3ee15 contract',async()=>{
  const {service}=setup(path=>path.startsWith('/api/v1/dashboard/statuses')
    ?response({metric:'current',totals:null,daily:[{date:'2026-10-31',counts:null}]})
    :response({items:[],total:0,limit:5,offset:0}));
  await service.login('admin','long-password');await service.load({page:'dashboard'});
  assert.equal(service.stats().total,0);assert.deepEqual(service.stats().counts,{});
  assert.equal(service.stats({metric:'activity'}).series[0].counts,null);
  const detail=dossierView({dossier:{...bundle.dossier,configuration:{documents:null}},files:null,fields:null,document_groups:null,checklist:null,issues:null,decisions:null});
  for(const name of ['files','checklist','issues','decisions','history'])assert.deepEqual(detail[name],[]);
  const catalog=catalogView({definition:{fields:null,documents:null,rules:null,special_requirements:null}},'documents');
  for(const name of ['fields','documents','rules','specialRequirements'])assert.deepEqual(catalog[name],[]);
});
test('mixed PDF groups are available on the source while derived fields keep their own group and original page',()=>{
  const source=bundle.files[0],first='derived-1',second='derived-2';
  const detail=dossierView({...bundle,
    files:[source,{id:first,source_file_id:source.id,original_name:'document-1.pdf',source_pages:[1]},{id:second,source_file_id:source.id,original_name:'document-2.pdf',source_pages:[2]}],
    document_groups:[{id:'group-1',file_id:first,pages:[1]},{id:'group-2',file_id:second,pages:[2]}],
    fields:[{...bundle.fields[0],page:1},{...bundle.fields[1],page:2}]
  });
  assert.deepEqual(detail.files[0].groups.map(group=>group.id),['group-1','group-2']);
  assert.deepEqual(detail.files[0].fields.map(field=>field.id),['field-1','field-2']);
  assert.deepEqual(detail.files[1].fields.map(field=>field.id),['field-1']);
  assert.deepEqual(detail.files[2].fields.map(field=>field.id),['field-2']);
  assert.equal(detail.files[2].fields[0].source.page,2);
  const preview=liveDocumentPreview(detail,detail.files[2],{evidencePage:2,previewMime:'application/pdf',previewUrl:'blob:fixture'},()=>true);
  assert.match(preview,/#page=1/);assert.match(preview,/Trang 2/);
});
test('derived PDFs join fields by group UUID rather than by overlapping source pages',()=>{
  const detail=dossierView({...bundle,
    files:[bundle.files[0],{id:'derived',source_file_id:fid,source_pages:[1]}],
    document_groups:[{id:'group-1',file_id:'derived',pages:[1]},{id:'group-2',file_id:fid,pages:[1]}],
    fields:bundle.fields.map(field=>({...field,page:1}))
  });
  assert.deepEqual(detail.files[1].fields.map(field=>field.id),['field-1']);
});
test('access updates send explicit false and reject a missing status instead of deactivating implicitly',async()=>{
  const {service,calls}=setup(()=>response({...actor,active:false,permissions:null}),{users:[{...actor,active:false,permissions:null},{...actor,id:'unknown-active',active:null,permissions:null}]});await service.login('admin','long-password');
  await service.load({page:'members'});assert.deepEqual(service.listMembers().map(user=>user.status),['suspended','suspended']);assert.deepEqual(service.listMembers().map(user=>user.permissions),[[],[]]);
  const updated=await service.updateMember(uid,{role:'manager',status:'suspended',permissions:[]});
  assert.equal(updated.active,false);assert.deepEqual(JSON.parse(calls.at(-1).init.body),{role:'manager',active:false,permissions:[]});
  const count=calls.length;
  assert.throws(()=>service.updateMember(uid,{role:'manager',status:null,permissions:[]}),error=>error.status===400);
  assert.equal(calls.length,count);
});
test('each AI action posts its description to the corresponding suggestion endpoint',async()=>{
  const {service,calls}=setup(()=>response({draft:true}));await service.login('admin','long-password');
  await service.suggestDocumentFields('Identity fields');await service.suggestComparisonRules('sale','Compare owner names');
  assert.deepEqual(calls.slice(-2).map(call=>[call.path,call.init.method,JSON.parse(call.init.body)]),[
    ['/api/v1/document-types/suggestions','POST',{description:'Identity fields'}],
    ['/api/v1/dossier-types/sale/comparison-rules/suggestions','POST',{description:'Compare owner names'}]
  ]);
});


test('unsaved dossier rule suggestions serialize selected versions and repeated roles without saving',async()=>{
  const {service,calls}=setup(()=>response({draft:true,rules:[]}));await service.login('admin','long-password');
  await service.suggestDraftComparisonRules('Compare names',{name:'Draft',description:'Current description',documents:[
    {code:'identity',schema_version:3,role:'buyer',required:true,min_count:2},
    {code:'identity',schema_version:3,role:'seller',required:false,conditional:true,triggerReason:'Seller present',min_count:1}
  ]});
  assert.equal(calls.at(-1).path,'/api/v1/dossier-types/comparison-rules/suggestions');
  const body=JSON.parse(calls.at(-1).init.body);
  assert.equal(body.description,'Compare names');assert.equal(body.definition.name,'Draft');
  assert.deepEqual(body.definition.rules,[]);
  assert.deepEqual(body.definition.documents.map(doc=>[doc.document_type,doc.schema_version,doc.role,doc.position,doc.min_count]),[
    ['identity',3,'buyer',0,2],['identity',3,'seller',1,1]
  ]);
  assert.equal(body.definition.documents[1].trigger_reason,'Seller present');
  assert.equal(calls.some(call=>call.path==='/api/v1/dossier-types'&&call.init.method==='POST'),false);
});
