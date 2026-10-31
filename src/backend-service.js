import { ApiError } from './api.js';
import { reconciliationIssues } from './reconciliation-view.js';
import { approvalReadiness } from './review-readiness.js';

const array = value => Array.isArray(value) ? value : [];
const key = value => encodeURIComponent(value);
const query = values => {
  const params = new URLSearchParams();
  for (const [name,value] of Object.entries(values)) if (value !== '' && value !== null && value !== undefined) params.set(name,String(value));
  return params.size ? '?' + params : '';
};
const userView = user => ({ ...user, name:user.full_name, userId:user.id, companyId:user.company_id, status:user.active===true?'active':'suspended', permissions:array(user.permissions) });

export function auditView(row,me,members=[]) {
  const knownName=id=>{
    const member=members.find(user=>(user.userId||user.id)===id) || ((me?.userId||me?.id)===id?me:null);
    return member?.full_name?.trim()||member?.name?.trim()||member?.username?.trim()||'';
  };
  const isSystem=row.actor_id==='00000000-0000-0000-0000-000000000000';
  const actorName=isSystem?'':row.actor_name?.trim()||knownName(row.actor_id);
  let target=row.resource_id;
  if(row.resource==='user')target=(row.resource_id===row.actor_id?actorName:'')||knownName(row.resource_id)||target;
  if(row.resource==='company'&&row.resource_id===(me?.companyId||me?.company_id))target=me?.company?.name||target;
  return {...row,description:row.resource+' · '+target,actor:actorName,actorIsSystem:isSystem,reference:row.dossier_id,at:row.created_at,dossierId:row.dossier_id};
}

// For the access editor only. Authorization always uses /auth/me permissions.
export const roleDefaults = {
  broker:['dossier:create','dossier:read','dossier:upload'],
  legal_specialist:['dossier:create','dossier:read','dossier:read_all','dossier:upload','dossier:correct','dossier:review','dossier:reopen','dossier:image_view','pii:view','audit:read'],
  notary:['dossier:read','dossier:image_view','pii:view'],
  manager:['dossier:read','dossier:read_all','dossier:assign','dashboard:read','audit:read'],
  company_admin:['user:manage','catalog:manage','dossier:create','dossier:read','dossier:read_all','dossier:upload','dossier:assign','dossier:correct','dossier:review','dossier:reopen','dossier:image_view','pii:view','audit:read','dashboard:read']
};

export function catalogView(item, kind) {
  const def = item.definition || {};
  return { ...def, code:item.code, version:item.current_version, active:item.active,
    fields:array(def.fields), specialRequirements:array(def.special_requirements),
    documents:array(def.documents).map(doc=>({...doc,code:doc.document_type,triggerReason:doc.trigger_reason})),
    rules:array(def.rules).map(rule=>({...rule,id:rule.code,leftType:rule.left.document_type,leftField:rule.left.field_key,rightType:rule.right.document_type,rightField:rule.right.field_key})), kind };
}

export function dossierView(bundle) {
  const d = bundle.dossier || bundle;
  const configuration = d.configuration || {};
  const schemas = array(configuration.documents);
  const allFiles = array(bundle.files);
  const files = allFiles.filter(file=>!file.superseded_by);
  const fileById = new Map(allFiles.map(file=>[file.id,file]));
  const groups = array(bundle.document_groups);
  const fields = array(bundle.fields);
  const batches = [...new Set(files.map(file=>file.batch_id))];
  return { ...d, name:d.title, reference:d.id, typeCode:d.dossier_type, typeName:configuration.definition?.name || d.dossier_type,
    assigneeId:d.assignee_id, createdBy:d.creator_id, createdAt:d.created_at, configVersion:d.dossier_type_version,
    files:files.map(file=>{
      // Groups reference derived PDFs; extracted fields retain the original file
      // and page. Join through group UUIDs rather than guessing from page overlap.
      const fileGroups=groups.filter(group=>group.file_id===file.id || !file.source_file_id&&fileById.get(group.file_id)?.source_file_id===file.id);
      const groupIds=new Set(fileGroups.map(group=>group.id));
      return {...file,name:file.original_name,typeCode:file.document_type,
        typeName:schemas.find(doc=>doc.code===file.document_type)?.definition?.name || (fileGroups.length>1?'Nhiều nhóm tài liệu':file.document_type),
        batch:batches.indexOf(file.batch_id)+1,sourceFileId:file.source_file_id,sourcePages:array(file.source_pages),error:file.error_message,
        fields:fields.filter(field=>field.file_id===file.id || file.source_file_id===field.file_id&&groupIds.has(field.document_group_id)).map(field=>({...field,
          schemaKey:field.key,key:field.id,source:{page:field.page,excerpt:field.raw_text,boundingBox:field.bounding_box}})),
        groups:fileGroups};
    }),
    checklist:array(bundle.checklist).map(req=>({...req,code:req.document_type,triggerReason:req.reason})),
    invalidRequiredFields:fields.filter(field=>field.required&&(!field.value||field.validation!=='VALID')).map(field=>({id:field.id,label:field.label||'Trường bắt buộc',fileId:field.file_id})),
    issues:reconciliationIssues(bundle.issues,{configuration,files:allFiles,groups,fields}),
    history:array(bundle.decisions).map(decision=>({action:decision.action,description:decision.reason,actor:decision.actor_id,at:decision.created_at})),
    decisions:array(bundle.decisions) };
}

// Keep the transport DTOs at this boundary; cached reads feed the existing views.
// Loads commit together, so an aborted navigation cannot replace a newer page.
export function createBackendService(client) {
  let actor = null, epoch = 0;
  let cache = freshCache();
  function freshCache() { return { documents:[],types:[],members:[],rows:[],detail:null,audit:[],page:{total:0,limit:20,offset:0},stats:null,activity:null }; }
  const data = async (path, options) => (await client.request('/api/v1'+path,options)).data;
  async function all(path, options) {
    const rows=[];
    for (let offset=0;;) {
      const page=await data(path+query({limit:100,offset}),options);
      if (!Array.isArray(page?.items) || !Number.isFinite(page.total)) throw new ApiError('Danh sách backend không đúng hợp đồng.',502);
      rows.push(...page.items);offset+=page.items.length;
      if (offset>=page.total) return rows;
      if (!page.items.length) throw new ApiError('Phân trang backend không nhất quán.',502);
    }
  }
  const currentVersion = id => {
    if (cache.detail?.id !== id) throw new Error('Tải lại hồ sơ trước khi thay đổi.');
    return cache.detail.version;
  };
  async function mutate(id, suffix, body, method='POST') {
    const expected_version=currentVersion(id);
    try { return await data(`/dossiers/${key(id)}${suffix}`,{method,body:{...body,expected_version}}); }
    catch (error) {
      if (error.status===409) {
        cache.detail=dossierView(await data(`/dossiers/${key(id)}`));
        let message='Hồ sơ đã thay đổi hoặc không cho phép thao tác. Đã tải phiên bản mới; hãy kiểm tra lại trước khi gửi.';
        if(suffix==='/decisions'&&body.action==='APPROVE'&&cache.detail.version===expected_version) {
          const readiness=approvalReadiness(cache.detail);
          message=readiness.allowed?'Máy chủ chưa cho phép phê duyệt hồ sơ. Kiểm tra dữ liệu và kết quả đối soát trước khi gửi lại.':readiness.message;
        }
        const conflict=new ApiError(message,409,error.requestId);
        conflict.reloadRequired=true;throw conflict;
      }
      throw error;
    }
  }
  async function saveCatalog(path,body,updating) {
    try { return await data(path,{method:updating?'PUT':'POST',body}); }
    catch(error) { if(error.status===409)error.reloadRequired=true;throw error; }
  }
  const service = {
    live:true,
    get session() { return actor; },
    assistantContext:(locale,page,{signal}={})=>data(`/assistant/context${query({locale,page})}`,{signal,track:false}),
    assistantArticle:(id,locale,{signal}={})=>data(`/assistant/articles/${key(id)}${query({locale})}`,{signal,track:false}),
    assistantChat:(body,{signal}={})=>data('/assistant/chat',{method:'POST',body,signal,timeoutMs:70000,track:false}),
    get company() { const company=actor?.company;return company?{...company,initials:company.name.split(/\s+/).slice(0,2).map(word=>word[0]).join('')}:null; },
    get pagination() { return cache.page; },
    can(permission) {
      if (permission==='users:manage') permission='user:manage';
      if (permission==='dossier:classify') permission='dossier:correct';
      if (permission==='user:manage') return actor?.role==='company_admin';
      return Boolean(actor?.permissions.includes(permission));
    },
    async login(identifier,password) {
      const version=++epoch;
      const result=await data('/auth/login',{method:'POST',body:{username_or_email:identifier.trim(),password}});
      if (version!==epoch) throw new ApiError('Yêu cầu đăng nhập đã hết hiệu lực.',499);
      if (!result?.access_token || result.token_type!=='Bearer' || !result.user?.id) throw new ApiError('Phản hồi đăng nhập không hợp lệ.',502);
      client.setAccessToken(result.access_token);
      try {
        const me=await data('/auth/me');
        if (version!==epoch) throw new ApiError('Phiên đăng nhập đã thay đổi.',499);
        actor=userView(me);cache=freshCache();
      } catch (error) { if(version===epoch)service.logout();throw error; }
      return actor;
    },
    signup(input) { return data('/auth/signup',{method:'POST',body:input}); },
    logout() { epoch++;actor=null;cache=freshCache();client.clearSession(); },
    async load(view,{signal,background=false,accept=()=>true}={}) {
      const version=epoch, options={signal,track:!background}, next={...cache};
      let me=actor;
      if (!background) {
        me=userView(await data('/auth/me',options));
        const results=await Promise.all([
          me.permissions.includes('dossier:read')?all('/document-types',options):[],
          me.permissions.includes('dossier:read')?all('/dossier-types',options):[],
          me.role==='company_admin'?all('/auth/users',options):[me]
        ]);
        next.documents=results[0].map(item=>catalogView(item,'documents'));
        next.types=results[1].map(item=>catalogView(item,'dossiers'));next.members=results[2].map(userView);
      }
      const filters={search:view.search,status:view.status,dossier_type:view.type,assignee_id:view.assignee,
        from:view.from,to:view.to,timezone:'Asia/Ho_Chi_Minh',limit:20,offset:view.offset||0};
      if (view.page==='dossiers' || view.page==='review') {
        const page=await data((view.page==='review'?'/dossiers/review-queue':'/dossiers')+query(filters),options);
        next.rows=array(page.items).map(dossierView);next.page={total:page.total,limit:page.limit,offset:page.offset};
      } else if (view.page==='detail') {
        next.detail=dossierView(await data(`/dossiers/${key(view.id)}`,options));
      } else if (view.page==='dashboard') {
        const metric=view.metric||'current';
        const metrics={from:view.from,to:view.to,timezone:'Asia/Ho_Chi_Minh',dossier_type:view.type};
        const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
        const start=new Date(today+'T00:00:00Z');start.setUTCDate(start.getUTCDate()-6);
        const chartMetric=metric==='current'?'transitions':metric;
        const [stats,activity,page]=await Promise.all([
          data('/dashboard/statuses'+query({...metrics,metric}),options),
          data('/dashboard/statuses'+query({...metrics,from:view.from||start.toISOString().slice(0,10),to:view.to||today,metric:chartMetric}),options),
          data('/dossiers?limit=5&offset=0',options)
        ]);
        const totals=stats.totals??{};
        next.stats={...stats,totals,counts:totals,total:Object.values(totals).reduce((sum,n)=>sum+n,0)};
        next.activity={...activity,series:array(activity.daily)};next.rows=array(page.items).map(dossierView);
      } else if (view.page==='audit') {
        const page=await data('/audit-logs'+query({action:view.auditAction,actor_id:view.auditActor,resource_id:view.auditResource,dossier_id:view.auditDossier,
          from:view.auditFrom,to:view.auditTo,limit:20,offset:view.offset||0}),options);
        next.audit=array(page.items).map(row=>auditView(row,me,next.members));
        next.page={total:page.total,limit:page.limit,offset:page.offset};
      }
      if(signal?.aborted || version!==epoch || !actor || !accept()) return false;
      actor=me;cache=next;return true;
    },
    listMembers:()=>cache.members,
    listDocumentTypes:()=>cache.documents,
    listDossierTypes:()=>cache.types,
    listDossiers:()=>cache.rows,
    getDossier:id=>cache.detail?.id===id?cache.detail:null,
    stats:filters=>filters?.metric==='activity'?cache.activity:cache.stats,
    audit:()=>cache.audit,
    async createDossier({name,typeCode,assigneeId,priority=0}) {
      const result=await data('/dossiers',{method:'POST',body:{title:name,dossier_type:typeCode,priority:Number(priority)}});
      // Creation and assignment are separate backend operations. Keep the created ID
      // visible even if assignment must be retried from the detail screen.
      cache.detail=dossierView(result);
      if(assigneeId) {
        try { await mutate(result.id,'/assignment',{assignee_id:assigneeId},'PATCH'); }
        catch(error) { return {...result,assignmentError:error.message}; }
      }
      return result;
    },
    assign:(id,assigneeId,priority)=>mutate(id,'/assignment',{assignee_id:assigneeId||null,...(priority!==undefined?{priority:Number(priority)}:{})},'PATCH'),
    async upload(id,files,typeCode,{role='',replacesFileId=''}={}) {
      const body=new FormData();
      for(const file of files) {
        body.append('files',file,file.name);
        if(typeCode)body.append('document_types',typeCode);
        if(role)body.append('roles',role);
        if(replacesFileId)body.append('replaces_file_ids',replacesFileId);
      }
      const result=await data(`/dossiers/${key(id)}/files`,{method:'POST',body,timeoutMs:30000});
      return array(result.files).map(file=>({...file,success:file.status==='UPLOADED',duplicate:file.status==='DUPLICATE'}));
    },
    classifyFile:(id,fileId,typeCode,role='',groupId=null)=>mutate(id,`/files/${key(fileId)}/classification`,{document_type:typeCode,role,...(groupId?{document_group_id:groupId}:{})},'PATCH'),
    retryFile:(id,fileId)=>mutate(id,`/files/${key(fileId)}/retry`,{}),
    correctField:(id,fileId,fieldId,value,reason,note)=>mutate(id,`/fields/${key(fieldId)}`,{value,reason,note},'PATCH'),
    acknowledgeIssue:(id,issueId,reason)=>mutate(id,`/issues/${key(issueId)}/acknowledge`,{reason}),
    review:(id,action,reason)=>mutate(id,'/decisions',{action:action==='SUPPLEMENT'?'REQUEST_CHANGES':action,reason}),
    reopen:(id,reason)=>mutate(id,'/reopen',{reason}),
    addRequirement:(id,typeCode,reason,role='',minCount=1)=>mutate(id,'/requirements',{document_type:typeCode,reason,role,min_count:Number(minCount)}),
    removeRequirement:(id,requirementId,reason)=>mutate(id,`/requirements/${key(requirementId)}`,{reason},'DELETE'),
    async reveal(id,fileId,fieldId) {
      const fields=await data(`/dossiers/${key(id)}/pii/reveal`,{method:'POST',body:{field_ids:[fieldId]}});
      const field=array(fields).find(item=>item.id===fieldId);
      if(!field)throw new ApiError('Backend không trả trường được yêu cầu.',502);
      return field.value;
    },
    async viewOriginal(id,fileId) { return (await client.request(`/api/v1/dossiers/${key(id)}/files/${key(fileId)}/content`,{responseType:'blob',timeoutMs:30000})).data; },
    async createMember({name,email,role,username,password}) { return data('/auth/users',{method:'POST',body:{full_name:name,email,role,username,password,permissions:[]}}); },
    updateMember(id,{role,status,permissions}) {
      if(!['active','suspended'].includes(status))throw new ApiError('Chọn trạng thái thành viên hợp lệ.',400);
      return data(`/auth/users/${key(id)}/access`,{method:'PATCH',body:{role,active:status==='active',permissions}});
    },
    async saveDocumentType(input) {
      const current=cache.documents.find(item=>item.code===input.code);
      const special=array(input.specialRequirements).map((item,index)=>typeof item==='string'?{...current?.specialRequirements[index],description:item,severity:current?.specialRequirements[index]?.severity||'WARNING'}:item);
      const result=await saveCatalog('/document-types'+(input.code?'/'+key(input.code):''),{name:input.name,description:input.description,fields:input.fields,special_requirements:special,expected_version:current?.version||0},Boolean(input.code));
      return catalogView(result,'documents');
    },
    async saveDossierType(input) {
      const current=cache.types.find(item=>item.code===input.code);
      const documents=input.documents.map((doc,position)=>{
        const old=current?.documents.find(item=>item.code===doc.code&&(doc.key?item.key===doc.key:item.role===(doc.role||'')));
        return {document_type:doc.code,key:doc.key||old?.key||'',schema_version:doc.schema_version||old?.schema_version||cache.documents.find(item=>item.code===doc.code)?.version,
          position,required:doc.required,conditional:doc.conditional,min_count:doc.min_count||old?.min_count||1,role:doc.role??old?.role??'',trigger_reason:doc.triggerReason,condition:doc.conditional?(doc.condition??old?.condition):undefined};
      });
      const reference=(ref,type,field)=>({document_type:type??ref?.document_type,field_key:field??ref?.field_key,role:ref?.role,subject_field:ref?.subject_field});
      const rules=input.rules.map(rule=>({
        code:rule.code||'',name:rule.name,
        left:reference(rule.left,rule.leftType,rule.leftField),right:reference(rule.right,rule.rightType,rule.rightField),
        operator:rule.operator,severity:rule.severity,message:rule.message,remediation:rule.remediation
      }));
      const result=await saveCatalog('/dossier-types'+(input.code?'/'+key(input.code):''),{name:input.name,description:input.description,documents,rules,expected_version:current?.version||0},Boolean(input.code));
      return catalogView(result,'dossiers');
    },
    archiveCatalog:(kind,code)=>data(`/${kind==='documents'?'document-types':'dossier-types'}/${key(code)}`,{method:'DELETE'}),
    suggestDocumentFields:description=>data('/document-types/suggestions',{method:'POST',body:{description},timeoutMs:125000}),
    suggestComparisonRules:(code,description)=>data(`/dossier-types/${key(code)}/comparison-rules/suggestions`,{method:'POST',body:{description},timeoutMs:125000}),
    suggestCatalog(kind,description,code) {
      if(kind==='documents')return service.suggestDocumentFields(description);
      if(code)return service.suggestComparisonRules(code,description);
      return data('/dossier-types/suggestions',{method:'POST',body:{description},timeoutMs:125000});
    }
  };
  return service;
}
