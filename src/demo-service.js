/**
 * Browser-only demonstration of the backend blueprint, NOT a security boundary.
 * The real backend currently exposes GET /health only. No business method below
 * sends a request or performs OCR. State is discarded on page reload.
 */
export const roles = {
  company_admin: 'Quản trị công ty', legal_specialist: 'Chuyên viên pháp lý',
  broker: 'Nhân viên tiếp nhận', manager: 'Quản lý công ty',
  notary: 'Công chứng viên', platform_admin: 'Quản trị nền tảng'
};
export const companies = [
  { id:'0ef5271a-234e-4f59-a916-df7cd9703ee1', name:'An Phát Land', initials:'AP' },
  { id:'038bde26-2bc1-46d6-b7ab-8aa9a07ea255', name:'Minh Khang Realty', initials:'MK' }
];
export const dossierStatuses = ['PROCESSING','MISSING_DOCUMENT','INVALID_DOCUMENT','VALID_DOCUMENT','APPROVED_DOCUMENT','REJECTED'];
const reasonCodes = ['OCR_ERROR','SOURCE_ERROR','ADMIN_UNIT_CHANGE','OTHER'];
const id = () => crypto.randomUUID();
const clone = value => structuredClone(value);
const now = () => new Date().toISOString();
const dayKey = value => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const addDays = (date, amount) => { const at=new Date(date+'T12:00:00Z');at.setUTCDate(at.getUTCDate()+amount);return at.toISOString().slice(0,10); };
const mask = value => String(value ?? '').replace(/[\p{L}\p{N}]/gu, '•');
const requireText = (value, label) => {
  const text = String(value ?? '').trim();
  if (!text) throw new Error(`${label} không được để trống.`);
  return text;
};
const rolePermissions = {
  company_admin:['dossier:read','dossier:create','dossier:upload','dossier:correct','dossier:classify','dossier:review','dossier:reopen','dossier:assign','dossier:image_view','pii:view','dashboard:read','audit:read','users:manage','catalog:manage'],
  legal_specialist:['dossier:read','dossier:create','dossier:upload','dossier:correct','dossier:classify','dossier:review','dossier:reopen','dossier:image_view','pii:view','audit:read'],
  broker:['dossier:read','dossier:create','dossier:upload'],
  manager:['dossier:read','dossier:assign','dashboard:read','audit:read'],
  notary:['dossier:read','dossier:image_view','pii:view'],
  platform_admin:[]
};

function fieldsFor(code, customer, index = 0) {
  const basic = [
    { key:'ho-ten', label:'Họ và tên', type:'text', value:customer, pii:true },
    { key:'so-hieu', label:code === 'cccd' ? 'Số căn cước' : 'Số hiệu giấy tờ', type:'text', value:code === 'cccd' ? `07909600${String(1284 + index).padStart(4,'0')}` : `CS ${82914 + index}`, pii:code === 'cccd' }
  ];
  if (code !== 'cccd') basic.push({ key:'dien-tich',label:'Diện tích (m²)',type:'number',value:'86.5',pii:false });
  return basic.map(f => ({ ...f, confidence:0.98, source:{ page:1, excerpt:`${f.label}: ${f.value}` } }));
}
function makeCatalog() {
  const documentTypes = [
    { code:'cccd',name:'Căn cước công dân',description:'Giấy tờ định danh chủ thể giao dịch, hai mặt cùng một tài liệu.',version:1,fields:fieldsFor('cccd','').map(({key,label,type,pii})=>({key,label,type,pii,required:true})),specialRequirements:[] },
    { code:'giay-chung-nhan',name:'Giấy chứng nhận',description:'Giấy chứng nhận quyền sử dụng đất, quyền sở hữu nhà ở.',version:2,fields:fieldsFor('giay-chung-nhan','').map(({key,label,type,pii})=>({key,label,type,pii,required:true})),specialRequirements:[] },
    { code:'hop-dong',name:'Hợp đồng chuyển nhượng',description:'Thông tin các bên và bất động sản trong giao dịch.',version:1,fields:fieldsFor('hop-dong','').map(({key,label,type,pii})=>({key,label,type,pii,required:true})),specialRequirements:[] },
    { code:'ket-hon',name:'Giấy chứng nhận kết hôn',description:'Giấy tờ phát sinh khi giao dịch có tài sản chung vợ chồng.',version:1,fields:[{key:'ho-ten',label:'Họ và tên',type:'text',pii:true,required:true}],specialRequirements:[] }
  ];
  const documents = documentTypes.map((d,i) => ({code:d.code,required:i<3,conditional:i===3,triggerReason:i===3?'Chủ sở hữu đã kết hôn và tài sản chung':'',name:d.name}));
  const rules = [
    { id:id(),name:'Họ tên chủ sở hữu',leftType:'cccd',leftField:'ho-ten',rightType:'giay-chung-nhan',rightField:'ho-ten',operator:'TEXT_EQUALS',severity:'BLOCKER' },
    { id:id(),name:'Diện tích chuyển nhượng',leftType:'giay-chung-nhan',leftField:'dien-tich',rightType:'hop-dong',rightField:'dien-tich',operator:'NUMBER_EQUAL',severity:'BLOCKER' }
  ];
  return { documentTypes, dossierTypes:[
    { code:'mua-ban',name:'Mua bán nhà đất',description:'Tiếp nhận và kiểm tra hồ sơ chuyển nhượng bất động sản.',version:2,documents:clone(documents),rules:clone(rules) },
    { code:'cho-thue',name:'Cho thuê bất động sản',description:'Xác minh các bên và giấy tờ tài sản cho thuê.',version:1,documents:clone(documents),rules:clone(rules) }
  ] };
}

function sameValue(left, right, operator) {
  if (operator === 'TEXT_EQUALS') return String(left).trim().normalize('NFC').toLocaleLowerCase('vi') === String(right).trim().normalize('NFC').toLocaleLowerCase('vi');
  if (operator === 'DIGITS_EQUAL') {
    const a=String(left).replace(/\D/g,''),b=String(right).replace(/\D/g,'');
    return a && b ? a === b : null;
  }
  if (operator === 'NUMBER_EQUAL') {
    const parse = value => { const text=String(value).trim().replace(',','.'); return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : NaN; };
    const a=parse(left),b=parse(right);return Number.isFinite(a)&&Number.isFinite(b) ? Math.abs(a-b)<0.000001 : null;
  }
  if (operator === 'DATE_EQUAL') {
    const parse = value => {
      const text=String(value).trim(); let parts;
      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) parts=text.split('-').map(Number);
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {const [day,month,year]=text.split('/').map(Number);parts=[year,month,day];}
      else return null;
      const [y,m,d]=parts,at=new Date(Date.UTC(y,m-1,d));
      return at.getUTCFullYear()===y&&at.getUTCMonth()===m-1&&at.getUTCDate()===d ? at.getTime() : null;
    };
    const a=parse(left),b=parse(right);return a!==null&&b!==null ? a===b : null;
  }
  return null;
}

function reconcile(dossier, preserveAcknowledgements = true) {
  const previous = preserveAcknowledgements ? dossier.issues : [];
  dossier.checklist.forEach(item => {
    if (item.conditional && item.status === 'NOT_REQUIRED') return;
    const files=dossier.files.filter(f=>f.typeCode===item.code);
    item.status=files.some(f=>f.status==='EXTRACTED')?'EXTRACTED':files.some(f=>['UPLOADED','PROCESSING'].includes(f.status))?'PROCESSING':files.some(f=>f.status==='FAILED')?'FAILED':item.conditional&&!item.required?'PENDING_CONDITION':'MISSING_DOCUMENT';
  });
  dossier.issues=dossier._snapshot.rules.map(rule=>{
    const leftFiles=dossier.files.filter(f=>f.typeCode===rule.leftType&&f.status==='EXTRACTED');
    const rightFiles=dossier.files.filter(f=>f.typeCode===rule.rightType&&f.status==='EXTRACTED');
    const issue={ id:rule.id,name:rule.name,status:'PENDING_DOCUMENTS',severity:'INFO',left:{label:dossier._documentSchemas.find(t=>t.code===rule.leftType)?.name||rule.leftType,value:'',pii:false},right:{label:dossier._documentSchemas.find(t=>t.code===rule.rightType)?.name||rule.rightType,value:'',pii:false},message:'Chờ đủ tài liệu nguồn để đánh giá.' };
    if (!leftFiles.length||!rightFiles.length)return issue;
    // Never select an arbitrary high-confidence document when a source is ambiguous.
    if (leftFiles.length!==1||rightFiles.length!==1) return {...issue,status:'OPEN',severity:'WARNING',message:'Có nhiều tài liệu cùng loại. Cần xác minh đúng chủ thể trước khi đối soát.'};
    const left=leftFiles[0].fields.find(f=>f.key===rule.leftField),right=rightFiles[0].fields.find(f=>f.key===rule.rightField);
    issue.left.value=left?.value||'';issue.left.pii=left?.pii||false;issue.right.value=right?.value||'';issue.right.pii=right?.pii||false;
    if (!left||!right||String(left.value).trim()===''||String(right.value).trim()==='') return {...issue,status:'OPEN',severity:'WARNING',message:'Thiếu giá trị trường cần đối chiếu; cần chuyên viên xác minh.'};
    const result=sameValue(left.value,right.value,rule.operator);
    if (Math.min(left.confidence,right.confidence)<0.8||result===null) {
      const old=previous.find(i=>i.id===rule.id&&i.status==='ACKNOWLEDGED');
      return {...issue,status:old?'ACKNOWLEDGED':'OPEN',severity:'WARNING',message:old?.message||'Độ tin cậy thấp hoặc giá trị chưa chuẩn hóa được. Cần chuyên viên xác minh.'};
    }
    return {...issue,status:result?'RESOLVED':'OPEN',severity:result?'INFO':rule.severity,message:result?'Hai nguồn dữ liệu khớp nhau.':'Giá trị giữa hai nguồn không khớp. Cần sửa dữ liệu hoặc bổ sung bằng chứng.'};
  });
  if (['APPROVED_DOCUMENT','REJECTED'].includes(dossier.status))return;
  if(dossier.files.some(f=>['UPLOADED','PROCESSING'].includes(f.status)))dossier.status='PROCESSING';
  else if(dossier.files.some(f=>f.status==='FAILED'||f.status==='UNKNOWN')||dossier.issues.some(i=>i.status==='OPEN'&&i.severity==='BLOCKER'))dossier.status='INVALID_DOCUMENT';
  else if(dossier.checklist.some(i=>i.status==='PENDING_CONDITION'||i.required&&!['EXTRACTED','NOT_REQUIRED'].includes(i.status)))dossier.status='MISSING_DOCUMENT';
  else dossier.status='VALID_DOCUMENT';
}

function seedCompany(company,index) {
  const {documentTypes,dossierTypes}=makeCatalog();
  const names=['Nguyễn Minh Anh','Trần Hoàng Nam','Lê Thảo Nguyên','Phạm Gia Huy','Vũ Ngọc Linh','Đặng Đức Anh'];
  const memberRoles=['company_admin','legal_specialist','broker','manager','notary','broker'];
  const members=names.map((name,i)=>({id:id(),name,email:['minhanh','hoangnam','thaonguyen','giahuy','ngoclinh','ducanh'][i]+'@'+(index?'minhkhang':'anphat')+'.vn',role:memberRoles[i],status:'active',permissions:[]}));
  const customers=index?['Hoàng Minh Đức','Dương Thị Lan','Nguyễn Hữu Tín','Lâm Nhật Hào']:['Nguyễn Văn Thành','Trần Thị Thanh Hà','Lê Hoàng Phúc','Phạm Minh Tuấn','Võ Ngọc Mai','Đặng Quốc Bảo','Bùi Thị Hương','Đỗ Anh Khoa','Ngô Thanh Tùng','Lý Minh Châu','Phan Đức Huy','Mai Thảo Vy'];
  const dossiers=customers.map((customer,i)=>{
    const type=dossierTypes[i%3===1?1:0];const createdAt=new Date(Date.UTC(2026,9,31-Math.floor(i/2),2,15)).toISOString();
    const dossier={id:id(),reference:`${company.initials}-2026-${String(128+i).padStart(4,'0')}`,name:customer,typeCode:type.code,typeName:type.name,status:'PROCESSING',createdAt,createdBy:members[2].id,assigneeId:members[1].id,configVersion:type.version,version:1,files:[],checklist:type.documents.map(d=>({...clone(d),status:d.conditional?'NOT_REQUIRED':'MISSING_DOCUMENT'})),issues:[],history:[],decisions:[],_snapshot:clone(type),_documentSchemas:clone(documentTypes)};
    const count=[3,2,3,3,1,3,3,3,1,3,2,3][i];
    dossier.files=documentTypes.slice(0,count).map((t,j)=>({id:id(),name:['CCCD_chu_so_huu.pdf','Giay_chung_nhan.pdf','Hop_dong_chuyen_nhuong.pdf'][j],typeCode:t.code,typeName:t.name,status:i===6&&j===1?'FAILED':i===4||i===10?'UPLOADED':'EXTRACTED',confidence:i===5&&j===0?.68:.98,batch:j===2?2:1,sourcePages:[1],error:i===6&&j===1?'Không đọc được trang 1. Đây là lỗi mô phỏng.':null,fields:fieldsFor(t.code,customer,i),_hash:null}));
    if(i===2)dossier.files[1].fields.find(f=>f.key==='ho-ten').value='Lê Hoàng Phước';
    if(i===5)dossier.files[0].fields.forEach(f=>f.confidence=.68);
    reconcile(dossier);
    if([3,7].includes(i))dossier.status='APPROVED_DOCUMENT';
    if(i===9)dossier.status='REJECTED';
    dossier.history.push({id:id(),action:'CREATE_DOSSIER',description:'Tạo hồ sơ và chụp phiên bản cấu hình '+type.version,actor:members[2].name,at:createdAt,statusFrom:null,statusTo:'PROCESSING'});
    dossier.history.push({id:id(),action:'STATUS_CHANGED',description:'Cập nhật trạng thái từ dữ liệu minh họa',actor:'Hệ thống mô phỏng',at:new Date(new Date(createdAt).getTime()+3600000).toISOString(),statusFrom:'PROCESSING',statusTo:dossier.status});
    if(dossier.status==='APPROVED_DOCUMENT')dossier.decisions.push({decision:'APPROVE',reason:'Đã kiểm tra dữ liệu mẫu.',actor:members[1].name,at:createdAt,version:1});
    return dossier;
  });
  return {members,documentTypes,dossierTypes,dossiers,events:[]};
}

export function createDemo() {
  const stores=Object.fromEntries(companies.map((company,index)=>[company.id,seedCompany(company,index)]));
  let session=null;
  const getStore=()=>{if(!session)throw new Error('Vui lòng đăng nhập phiên mô phỏng.');return stores[session.companyId];};
  const refreshSession=()=>{
    if(!session||session.role==='platform_admin')return session;
    const member=stores[session.companyId]?.members.find(m=>m.id===session.userId);
    if(!member||member.status!=='active'){session=null;return null;}
    session={...session,name:member.name,role:member.role,permissions:[...(rolePermissions[member.role]||[]),...(member.permissions||[])]};return session;
  };
  const can=permission=>{
    const actor=refreshSession();
    if(!actor||actor.role==='platform_admin'||permission==='users:manage'&&actor.role!=='company_admin')return false;
    return actor.role==='company_admin'&&['pii:view','dashboard:read'].includes(permission)||actor.permissions.includes(permission);
  };
  const requirePermission=permission=>{if(!can(permission))throw new Error('Bạn không có quyền thực hiện thao tác này.');};
  const memberById=userId=>getStore().members.find(m=>m.id===userId);
  const actorAllowed=d=>{
    if(!session||session.role==='platform_admin')return false;
    if(session.role==='broker')return d.createdBy===session.userId;
    if(['legal_specialist','notary'].includes(session.role))return d.assigneeId===session.userId;
    return true;
  };
  const findDossier=dossierId=>{
    requirePermission('dossier:read');const d=getStore().dossiers.find(x=>x.id===dossierId);
    if(!d||!actorAllowed(d))throw new Error('Không tìm thấy hồ sơ trong phạm vi được cấp quyền.');return d;
  };
  const writable=d=>{if(['APPROVED_DOCUMENT','REJECTED'].includes(d.status))throw new Error('Hồ sơ đã khóa. Cần mở lại với lý do trước khi thay đổi.');};
  const findFile=(d,fileId)=>{const file=d.files.find(f=>f.id===fileId);if(!file)throw new Error('Không tìm thấy tệp trong hồ sơ.');return file;};
  const log=(d,action,description,from)=>{
    const event={id:id(),action,description,actor:session.name,at:now(),...(from?{statusFrom:from,statusTo:d.status}:d&&action==='CREATE_DOSSIER'?{statusFrom:null,statusTo:d.status}:{})};
    if(d)d.history.push(event);
    getStore().events.push({...clone(event),reference:d?.reference||'—',dossierId:d?.id||null});
  };
  const update=(d,action,description)=>{const previous=d.status;d.version++;reconcile(d,false);log(d,action,description,previous);};
  const dto=d=>{
    const copy=clone(d);delete copy._snapshot;delete copy._documentSchemas;
    copy.files.forEach(f=>{delete f._hash;f.fields.forEach(field=>{if(field.pii){field.value=mask(field.value);field.source.excerpt=mask(field.source.excerpt);}});});
    copy.issues.forEach(issue=>{for(const side of ['left','right'])if(issue[side]?.pii)issue[side].value=mask(issue[side].value);});
    return copy;
  };
  const publicMember=m=>clone(m);
  const codeFrom=name=>name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+id().slice(0,5);
  const schemaFor=(d,code)=>d._documentSchemas.find(t=>t.code===code);
  const makeFileFields=(d,code)=>{
    const defaults=fieldsFor(code,d.name);
    return schemaFor(d,code).fields.map(field=>({key:field.key,label:field.label,type:field.type,pii:field.pii,value:defaults.find(f=>f.key===field.key)?.value||'Dữ liệu mẫu',confidence:.96,source:{page:1,excerpt:'Giá trị mẫu được sinh trong trình duyệt, không phải OCR.'}}));
  };
  const service={
    get session(){const actor=refreshSession();return actor?clone(actor):null;},
    registerCompany(input){
      const companyName=requireText(input.name,'Tên công ty'),adminName=requireText(input.adminName,'Họ tên quản trị viên');
      const adminEmail=requireText(input.adminEmail,'Email quản trị viên').toLowerCase();
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail))throw new Error('Email quản trị viên không hợp lệ.');
      if(Object.values(stores).some(s=>s.members.some(m=>m.email.toLowerCase()===adminEmail)))throw new Error('Email quản trị viên đã được sử dụng.');
      const username=requireText(input.username,'Tên đăng nhập');
      if(Object.values(stores).some(s=>s.members.some(m=>m.username===username)))throw new Error('Tên đăng nhập đã được sử dụng.');
      if(String(input.password||'').length<8)throw new Error('Mật khẩu mẫu cần ít nhất 8 ký tự.');
      const registration=requireText(input.businessRegistrationNumber,'Mã số doanh nghiệp');
      if(companies.some(c=>c.businessRegistrationNumber===registration))throw new Error('Mã số doanh nghiệp đã tồn tại.');
      const company={id:id(),name:companyName,initials:companyName.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase(),legalName:requireText(input.legalName,'Tên pháp lý'),businessRegistrationNumber:registration,email:String(input.email||''),phone:String(input.phone||''),address:String(input.address||'')};
      const admin={id:id(),name:adminName,email:adminEmail,username,role:'company_admin',status:'active',permissions:[]};
      // Construct everything before inserting either record; password is never stored.
      const {documentTypes,dossierTypes}=makeCatalog();
      stores[company.id]={members:[admin],documentTypes,dossierTypes,dossiers:[],events:[]};companies.push(company);
      session={userId:admin.id,companyId:company.id,role:admin.role,name:adminName,permissions:clone(rolePermissions.company_admin)};
      log(null,'REGISTER_COMPANY','Tạo công ty và tài khoản quản trị đầu tiên trong phiên mô phỏng.');return clone(session);
    },
    login(companyId,role){
      if(!stores[companyId]||!roles[role])throw new Error('Công ty hoặc vai trò không hợp lệ.');
      const member=stores[companyId].members.find(m=>m.role===role&&m.status==='active');
      if(role!=='platform_admin'&&!member)throw new Error('Không có tài khoản đang hoạt động với vai trò này.');
      session={userId:member?.id||id(),companyId,role,name:member?.name||'Quản trị nền tảng',permissions:[...(rolePermissions[role]||[]),...(member?.permissions||[])]};
      return clone(session);
    },
    logout(){session=null;},
    can,
    listDossiers(filters={}){
      requirePermission('dossier:read');
      const within=date=>(!filters.from||date>=filters.from)&&(!filters.to||date<=filters.to);
      return getStore().dossiers.filter(d=>{
        if(!actorAllowed(d)||filters.search&&!(d.reference+' '+d.name).toLocaleLowerCase('vi').includes(filters.search.toLocaleLowerCase('vi'))||filters.type&&d.typeCode!==filters.type||filters.assignee&&d.assigneeId!==filters.assignee)return false;
        if(filters.metric==='transitions')return d.history.some(event=>event.statusTo&&(!filters.status||event.statusTo===filters.status)&&within(dayKey(event.at)));
        return (!filters.status||d.status===filters.status)&&within(dayKey(d.createdAt));
      }).map(dto);
    },
    getDossier(dossierId){return dto(findDossier(dossierId));},
    stats({from,to,type,metric='current'}={}){
      requirePermission('dashboard:read');
      const dossiers=getStore().dossiers.filter(d=>actorAllowed(d)&&(!type||d.typeCode===type));
      const counts=Object.fromEntries(dossierStatuses.map(status=>[status,0]));
      const bins=new Map();
      const end=to||dayKey(now()),start=from||addDays(end,-6);
      for(let date=start,days=0;date<=end&&days<366;date=addDays(date,1),days++)bins.set(date,Object.fromEntries(dossierStatuses.map(status=>[status,0])));
      const within=date=>(!from||date>=from)&&(!to||date<=to);
      const eligible=new Set();
      for(const d of dossiers){
        if(metric==='current'){
          const date=dayKey(d.createdAt);if(!within(date))continue;eligible.add(d.id);counts[d.status]++;
          if(!bins.has(date))bins.set(date,Object.fromEntries(dossierStatuses.map(s=>[s,0])));bins.get(date)[d.status]++;
        }else{
          const seen=new Set();const seenDays=new Set();
          for(const event of d.history){const date=dayKey(event.at);if(!event.statusTo||!within(date))continue;eligible.add(d.id);
            if(!seen.has(event.statusTo)){counts[event.statusTo]++;seen.add(event.statusTo);}
            if(!bins.has(date))bins.set(date,Object.fromEntries(dossierStatuses.map(s=>[s,0])));
            const key=date+event.statusTo;if(!seenDays.has(key)){bins.get(date)[event.statusTo]++;seenDays.add(key);}
          }
        }
      }
      return {total:eligible.size,counts,series:[...bins].sort(([a],[b])=>a.localeCompare(b)).map(([date,counts])=>({date,counts}))};
    },
    listMembers(){return getStore().members.map(publicMember);},
    listDocumentTypes(){return clone(getStore().documentTypes);},
    listDossierTypes(){return clone(getStore().dossierTypes);},
    audit(filters={}){
      requirePermission('audit:read');
      const historical=getStore().dossiers.filter(actorAllowed).flatMap(d=>d.history.map(e=>({...clone(e),reference:d.reference,dossierId:d.id})));
      const scopedEvents=getStore().events.filter(e=>!e.dossierId||getStore().dossiers.some(d=>d.id===e.dossierId&&actorAllowed(d)));
      return [...new Map([...historical,...scopedEvents].map(e=>[e.id,e])).values()].filter(e=>(!filters.action||e.action===filters.action)&&(!filters.search||(e.actor+' '+e.reference+' '+e.description).toLocaleLowerCase('vi').includes(filters.search.toLocaleLowerCase('vi')))).sort((a,b)=>b.at.localeCompare(a.at));
    },
    createDossier(input){
      requirePermission('dossier:create');const type=getStore().dossierTypes.find(t=>t.code===input.typeCode);if(!type)throw new Error('Loại hồ sơ không thuộc catalog công ty.');
      const assignee=input.assigneeId?memberById(input.assigneeId):null;if(input.assigneeId&&(!assignee||assignee.status!=='active'))throw new Error('Người phụ trách không hợp lệ.');
      const dossier={id:id(),reference:companies.find(c=>c.id===session.companyId).initials+'-2026-'+String(1000+getStore().dossiers.length),name:requireText(input.name,'Tên hồ sơ'),typeCode:type.code,typeName:type.name,status:'PROCESSING',createdAt:now(),createdBy:session.userId,assigneeId:assignee?.id||null,configVersion:type.version,version:1,files:[],checklist:type.documents.map(d=>({...clone(d),name:getStore().documentTypes.find(t=>t.code===d.code).name,status:d.conditional?'PENDING_CONDITION':'MISSING_DOCUMENT'})),issues:[],history:[],decisions:[],_snapshot:clone(type),_documentSchemas:clone(getStore().documentTypes)};
      reconcile(dossier);getStore().dossiers.unshift(dossier);log(dossier,'CREATE_DOSSIER','Tạo hồ sơ theo phiên bản cấu hình '+type.version);return dto(dossier);
    },
    assign(dossierId,assigneeId){requirePermission('dossier:assign');const d=findDossier(dossierId),target=memberById(assigneeId);if(!target||target.status!=='active')throw new Error('Người được phân công phải đang hoạt động trong công ty.');d.assigneeId=assigneeId;log(d,'ASSIGN_DOSSIER','Phân công hồ sơ cho '+target.name);return dto(d);},
    async upload(dossierId,files,documentTypeCode=''){
      requirePermission('dossier:upload');const d=findDossier(dossierId);writable(d);
      const actorKey=session.companyId+':'+session.userId;
      const list=Array.from(files);if(!list.length)throw new Error('Chọn ít nhất một tệp.');if(list.length>10)throw new Error('Tối đa 10 tệp trong một đợt tiếp nhận.');
      if(documentTypeCode&&!d.checklist.some(c=>c.code===documentTypeCode))throw new Error('Loại giấy tờ không thuộc cấu hình hồ sơ.');
      const batch=Math.max(0,...d.files.map(f=>f.batch))+1;
      const results=[];
      for(const file of list){
        try{
          if(!file.size)throw new Error('Tệp rỗng.');if(file.size>20*1024*1024)throw new Error('Tệp vượt quá 20 MiB.');
          if(!/\.(pdf|jpe?g|png)$/i.test(file.name)||file.type&&!['application/pdf','image/jpeg','image/png'].includes(file.type))throw new Error('Chỉ nhận PDF, JPEG hoặc PNG.');
          const bytes=await file.arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
          if(!session||session.companyId+':'+session.userId!==actorKey)throw new Error('Phiên làm việc đã thay đổi; vui lòng thử tải lại.');
          if(d.files.some(f=>f._hash===hash))throw new Error('Tệp trùng nội dung với tài liệu đã tiếp nhận.');
          const schema=documentTypeCode?schemaFor(d,documentTypeCode):null;
          const uploaded={id:id(),name:file.name,typeCode:documentTypeCode,typeName:schema?.name||'Chưa phân loại',status:schema?'EXTRACTED':'UNKNOWN',confidence:schema?.96:0,batch,sourcePages:[1],fields:schema?makeFileFields(d,documentTypeCode):[],_hash:hash,error:null};
          d.files.push(uploaded);results.push({name:file.name,id:uploaded.id,status:uploaded.status,success:true});
        }catch(error){results.push({name:file.name,status:'FAILED',success:false,error:error.message});}
      }
      if(results.some(r=>r.success)&&session&&session.companyId+':'+session.userId===actorKey)update(d,'UPLOAD_FILES',`Tiếp nhận đợt ${batch}: ${results.filter(r=>r.success).length} tệp mô phỏng; không chạy OCR thực tế.`);
      return results;
    },
    retryFile(dossierId,fileId){requirePermission('dossier:upload');const d=findDossier(dossierId);writable(d);const file=findFile(d,fileId);if(file.status!=='FAILED')throw new Error('Chỉ tệp xử lý lỗi mới được thử lại.');file.status=file.typeCode?'EXTRACTED':'UNKNOWN';file.error=null;if(file.typeCode)file.fields=makeFileFields(d,file.typeCode);update(d,'RETRY_FILE','Thử xử lý lại tệp mô phỏng '+file.name);return dto(d);},
    classifyFile(dossierId,fileId,typeCode){requirePermission('dossier:classify');const d=findDossier(dossierId);writable(d);const schema=schemaFor(d,typeCode);if(!schema||!d.checklist.some(c=>c.code===typeCode))throw new Error('Loại giấy tờ không thuộc phiên bản cấu hình hồ sơ.');const file=findFile(d,fileId);file.typeCode=typeCode;file.typeName=schema.name;file.status='EXTRACTED';file.fields=makeFileFields(d,typeCode);file.confidence=.96;update(d,'CLASSIFY_DOCUMENT','Đổi phân loại và mô phỏng trích xuất lại '+file.name);return dto(d);},
    correctField(dossierId,fileId,key,value,reasonCode,note=''){
      requirePermission('dossier:correct');const d=findDossier(dossierId);writable(d);if(!reasonCodes.includes(reasonCode))throw new Error('Chọn mã lý do điều chỉnh hợp lệ.');if(reasonCode==='OTHER'&&!String(note).trim())throw new Error('Lý do khác cần ghi chú.');
      const file=findFile(d,fileId),field=file.fields.find(f=>f.key===key);if(!field)throw new Error('Không tìm thấy trường dữ liệu.');field.value=requireText(value,'Giá trị mới');field.confidence=1;field.corrected=true;field.source.excerpt='Giá trị đã được chuyên viên xác minh.';
      update(d,'CORRECT_FIELD',`Điều chỉnh trường ${field.label} · ${reasonCode}${note?' · '+note:''}`);return dto(d);
    },
    acknowledgeIssue(dossierId,issueId,reason){requirePermission('dossier:review');const d=findDossier(dossierId);writable(d);const issue=d.issues.find(i=>i.id===issueId);if(!issue||issue.status!=='OPEN'||issue.severity!=='WARNING')throw new Error('Chỉ cảnh báo đang mở mới được xác nhận.');const text=requireText(reason,'Lý do xác nhận');issue.status='ACKNOWLEDGED';issue.message=text;log(d,'ACKNOWLEDGE_WARNING','Xác nhận cảnh báo '+issue.name+' · '+text);return dto(d);},
    review(dossierId,decision,reason){
      requirePermission('dossier:review');const d=findDossier(dossierId);writable(d);const text=requireText(reason,'Ý kiến kiểm duyệt');if(!['APPROVE','REJECT','SUPPLEMENT'].includes(decision))throw new Error('Quyết định không hợp lệ.');
      if(decision==='APPROVE'&&(d.status!=='VALID_DOCUMENT'||d.checklist.some(c=>(c.required||c.status==='PENDING_CONDITION')&&!['EXTRACTED','NOT_REQUIRED'].includes(c.status))||d.issues.some(i=>['OPEN','PENDING_DOCUMENTS'].includes(i.status))))throw new Error('Chỉ duyệt khi đủ tài liệu, không còn quy tắc chờ, sai lệch hoặc cảnh báo chưa xử lý.');
      const previous=d.status;d.status=decision==='APPROVE'?'APPROVED_DOCUMENT':decision==='REJECT'?'REJECTED':d.checklist.some(c=>c.required&&c.status!=='EXTRACTED')?'MISSING_DOCUMENT':'INVALID_DOCUMENT';
      d.decisions.push({decision,reason:text,actor:session.name,at:now(),version:d.version});log(d,'REVIEW_'+decision,'Quyết định kiểm duyệt: '+text,previous);return dto(d);
    },
    reopen(dossierId,reason){requirePermission('dossier:reopen');const d=findDossier(dossierId);if(d.status!=='APPROVED_DOCUMENT')throw new Error('Chỉ được mở lại hồ sơ đã phê duyệt; hồ sơ từ chối là trạng thái cuối.');requireText(reason,'Lý do mở lại');const previous=d.status;d.status='PROCESSING';d.version++;reconcile(d,false);log(d,'REOPEN_DOSSIER','Mở lại hồ sơ: '+reason,previous);return dto(d);},
    reveal(dossierId,fileId,key){requirePermission('pii:view');const d=findDossier(dossierId),file=findFile(d,fileId),field=file.fields.find(f=>f.key===key);if(!field||!field.pii)throw new Error('Không tìm thấy trường PII.');log(d,'VIEW_PII','Xem thông tin nhạy cảm: '+field.label);return field.value;},
    viewOriginal(dossierId,fileId){requirePermission('dossier:image_view');const d=findDossier(dossierId),file=findFile(d,fileId);log(d,'VIEW_ORIGINAL','Xem bản minh họa tài liệu: '+file.name);return {simulated:true,name:file.name,message:'Không có tệp gốc thật trong bản demo.'};},
    createMember(input){requirePermission('users:manage');const name=requireText(input.name,'Họ tên'),email=requireText(input.email,'Email').toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Địa chỉ email không hợp lệ.');if(!roles[input.role]||input.role==='platform_admin')throw new Error('Vai trò không thể cấp trong công ty.');if(Object.values(stores).some(s=>s.members.some(m=>m.email.toLowerCase()===email)))throw new Error('Email đã tồn tại trong hệ thống.');const member={id:id(),name,email,role:input.role,status:'invited',permissions:[]};getStore().members.push(member);log(null,'CREATE_MEMBER','Tạo lời mời mô phỏng cho '+name);return publicMember(member);},
    updateMember(userId,input){
      requirePermission('users:manage');const member=memberById(userId);if(!member)throw new Error('Không tìm thấy thành viên.');const nextRole=input.role||member.role,nextStatus=input.status||member.status;
      if(!roles[nextRole]||nextRole==='platform_admin')throw new Error('Vai trò không thể cấp trong công ty.');if(!['active','invited','suspended','left'].includes(nextStatus))throw new Error('Trạng thái thành viên không hợp lệ.');
      if(member.role==='company_admin'&&member.status==='active'&&(nextRole!=='company_admin'||nextStatus!=='active')&&getStore().members.filter(m=>m.role==='company_admin'&&m.status==='active').length===1)throw new Error('Không thể vô hiệu hóa quản trị viên hoạt động cuối cùng.');
      const assigned=getStore().dossiers.filter(d=>d.assigneeId===member.id);let transfer;
      if(assigned.length&&nextStatus!=='active'){transfer=memberById(input.transferId);if(!transfer||transfer.id===member.id||transfer.status!=='active')throw new Error('Cần chọn thành viên hoạt động nhận chuyển giao hồ sơ.');}
      if(transfer)assigned.forEach(d=>{d.assigneeId=transfer.id;log(d,'TRANSFER_DOSSIER','Chuyển hồ sơ từ '+member.name+' sang '+transfer.name);});
      Object.assign(member,{role:nextRole,status:nextStatus,permissions:Array.isArray(input.permissions)?clone(input.permissions):member.permissions});log(null,'UPDATE_MEMBER_ACCESS','Cập nhật quyền truy cập của '+member.name);
      if(member.id===session.userId){if(member.status!=='active')session=null;else session={...session,role:member.role,permissions:[...(rolePermissions[member.role]||[]),...member.permissions]};}
      return publicMember(member);
    },
    saveDocumentType(input){
      requirePermission('catalog:manage');const name=requireText(input.name,'Tên loại giấy tờ');const previous=input.code?getStore().documentTypes.find(t=>t.code===input.code):null;if(input.code&&!previous)throw new Error('Không tìm thấy loại giấy tờ.');
      if(!Array.isArray(input.fields)||!input.fields.length)throw new Error('Cần ít nhất một trường trích xuất.');const keys=new Set();
      const fields=input.fields.map(field=>{const label=requireText(field.label,'Nhãn trường');if(!['text','number','date','boolean'].includes(field.type))throw new Error('Kiểu trường không hợp lệ.');const key=field.key||codeFrom(label);if(keys.has(key))throw new Error('Mã trường không được trùng trong schema.');keys.add(key);return {...clone(field),key,label,pii:Boolean(field.pii),required:Boolean(field.required)};});
      const type={code:previous?.code||codeFrom(name),name,description:String(input.description||''),version:(previous?.version||0)+1,fields,specialRequirements:clone(input.specialRequirements||[])};
      if(previous)getStore().documentTypes.splice(getStore().documentTypes.indexOf(previous),1,type);else getStore().documentTypes.push(type);log(null,'SAVE_DOCUMENT_TYPE','Lưu cấu hình giấy tờ '+name+' phiên bản '+type.version);return clone(type);
    },
    saveDossierType(input){
      requirePermission('catalog:manage');const name=requireText(input.name,'Tên loại hồ sơ'),previous=input.code?getStore().dossierTypes.find(t=>t.code===input.code):null;if(input.code&&!previous)throw new Error('Không tìm thấy loại hồ sơ.');
      if(!Array.isArray(input.documents)||!input.documents.length)throw new Error('Chọn ít nhất một loại giấy tờ.');const seen=new Set();
      const documents=input.documents.map(doc=>{const schema=getStore().documentTypes.find(t=>t.code===doc.code);if(!schema||seen.has(doc.code))throw new Error('Loại giấy tờ không hợp lệ hoặc bị trùng.');seen.add(doc.code);if(doc.conditional&&!String(doc.triggerReason||'').trim())throw new Error('Giấy tờ điều kiện cần mô tả điều kiện áp dụng.');return {...clone(doc),name:schema.name,required:Boolean(doc.required),conditional:Boolean(doc.conditional)};});
      const rules=(input.rules||[]).map(rule=>{const left=getStore().documentTypes.find(t=>t.code===rule.leftType),right=getStore().documentTypes.find(t=>t.code===rule.rightType);if(!seen.has(rule.leftType)||!seen.has(rule.rightType))throw new Error('Nguồn luật phải thuộc danh sách giấy tờ của loại hồ sơ.');const a=left.fields.find(f=>f.key===rule.leftField),b=right.fields.find(f=>f.key===rule.rightField);if(!a||!b)throw new Error('Trường nguồn đối soát không tồn tại.');const kinds={TEXT_EQUALS:'text',DIGITS_EQUAL:'text',NUMBER_EQUAL:'number',DATE_EQUAL:'date'};if(!kinds[rule.operator]||a.type!==kinds[rule.operator]||b.type!==kinds[rule.operator])throw new Error('Phép so sánh không tương thích với kiểu trường.');if(!['BLOCKER','WARNING','INFO'].includes(rule.severity))throw new Error('Mức độ quy tắc không hợp lệ.');return {...clone(rule),id:rule.id||id(),name:requireText(rule.name,'Tên quy tắc')};});
      const type={code:previous?.code||codeFrom(name),name,description:String(input.description||''),version:(previous?.version||0)+1,documents,rules};if(previous)getStore().dossierTypes.splice(getStore().dossierTypes.indexOf(previous),1,type);else getStore().dossierTypes.push(type);log(null,'SAVE_DOSSIER_TYPE','Lưu cấu hình bộ hồ sơ '+name+' phiên bản '+type.version);return clone(type);
    },
    addRequirement(dossierId,typeCode,reason){requirePermission('dossier:upload');const d=findDossier(dossierId);writable(d);requireText(reason,'Lý do phát sinh');const item=d.checklist.find(c=>c.code===typeCode);if(!item||!item.conditional)throw new Error('Chỉ thêm yêu cầu điều kiện đã có trong snapshot hồ sơ.');item.required=true;item.status='MISSING_DOCUMENT';item.triggerReason=reason;update(d,'ADD_REQUIREMENT','Thêm yêu cầu: '+item.name+' · '+reason);return dto(d);},
    removeRequirement(dossierId,typeCode,reason){requirePermission('dossier:upload');const d=findDossier(dossierId);writable(d);requireText(reason,'Lý do không áp dụng');const item=d.checklist.find(c=>c.code===typeCode);if(!item||!item.conditional)throw new Error('Không thể loại bỏ giấy tờ bắt buộc.');item.required=false;item.status='NOT_REQUIRED';update(d,'REMOVE_REQUIREMENT','Không áp dụng: '+item.name+' · '+reason);return dto(d);}
  };
  service.login(companies[0].id,'company_admin');
  return service;
}
export const demo=createDemo();
