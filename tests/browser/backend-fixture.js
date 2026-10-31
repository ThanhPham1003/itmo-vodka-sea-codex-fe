export const ids={user:'11111111-1111-4111-8111-111111111111',company:'22222222-2222-4222-8222-222222222222',dossier:'33333333-3333-4333-8333-333333333333',file:'44444444-4444-4444-8444-444444444444',field:'55555555-5555-4555-8555-555555555555',requirement:'66666666-6666-4666-8666-666666666666'};
export const fixtureUser={id:ids.user,company_id:ids.company,full_name:'Fixture Admin',email:'admin@example.test',username:'admin',role:'company_admin',active:true,
  permissions:['user:manage','catalog:manage','dashboard:read','audit:read','pii:view','dossier:read','dossier:read_all','dossier:create','dossier:upload','dossier:assign','dossier:correct','dossier:review','dossier:reopen','dossier:image_view'],company:{id:ids.company,name:'Company supplied by API'}};
export function fixtureBundle() {
  return {dossier:{id:ids.dossier,title:'Server dossier',priority:2,dossier_type:'sale',dossier_type_version:1,version:4,status:'VALID_DOCUMENT',creator_id:ids.user,assignee_id:ids.user,created_at:'2026-10-31T01:00:00Z',configuration:{definition:{name:'Sale',documents:[],rules:[]},documents:[{code:'identity',version:1,definition:{name:'Custom identity',fields:[]}}]}},
    checklist:[{id:ids.requirement,document_type:'identity',name:'Custom identity',required:true,min_count:1,status:'EXTRACTED'}],
    files:[{id:ids.file,original_name:'original.png',mime:'image/png',document_type:'identity',status:'EXTRACTED',batch_id:ids.file,source_pages:[1],model_version:'fixture-model',schema_version:1}],
    fields:[{id:ids.field,file_id:ids.file,key:'full-name',label:'Sensitive name',type:'text',value:'••••••',raw_text:'••••••',confidence:0.99,pii:true,page:1,bounding_box:[0.1,0.2,0.4,0.3]}],document_groups:[],issues:[],decisions:[]};
}
export async function mockBackend(page,{user=fixtureUser,intercept=()=>null}={}) {
  const calls=[],bundle=fixtureBundle();
  await page.route('**/api/v1/**',async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method();
    const call={path,method,url,body:request.postData(),headers:request.headers()};calls.push(call);
    const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',headers:{'X-Request-ID':ids.user},body:JSON.stringify({code:status,message:status<400?'OK':'Request failed',data})});
    if(await intercept({route,call,reply,bundle}))return;
    const list=items=>({items,total:items.length,limit:Number(url.searchParams.get('limit')||20),offset:Number(url.searchParams.get('offset')||0)});
    if(path==='/api/v1/auth/login')return reply({access_token:'fixture-token',token_type:'Bearer',expires_at:new Date(Date.now()+3600000).toISOString(),user});
    if(path==='/api/v1/auth/signup')return reply(user,201);
    if(path==='/api/v1/auth/me')return reply(user);
    if(path==='/api/v1/auth/users')return reply(method==='POST'?user:list([user]),method==='POST'?201:200);
    if(path==='/api/v1/document-types')return reply(list([{code:'identity',current_version:1,active:true,definition:{name:'Custom identity',description:'Provided by API',fields:[{key:'full-name',label:'Sensitive name',type:'text',pii:true,required:true}],special_requirements:[]}}]));
    if(path==='/api/v1/dossier-types')return reply(list([{code:'sale',current_version:1,active:true,definition:{name:'Sale',documents:[{key:'identity',document_type:'identity',schema_version:1,required:true,min_count:1}],rules:[]}}]));
    if(path==='/api/v1/dashboard/statuses')return reply({metric:url.searchParams.get('metric'),totals:{PROCESSING:0,MISSING_DOCUMENT:0,INVALID_DOCUMENT:0,VALID_DOCUMENT:1,APPROVED_DOCUMENT:0,REJECTED:0},daily:[{date:'2026-10-31',counts:{VALID_DOCUMENT:1}}]});
    if(path==='/api/v1/dossiers'||path==='/api/v1/dossiers/review-queue')return reply(method==='POST'?bundle.dossier:list([bundle.dossier]),method==='POST'?201:200);
    if(path===`/api/v1/dossiers/${ids.dossier}`)return reply(bundle);
    if(path.endsWith('/pii/reveal'))return reply([{...bundle.fields[0],value:'Private API value'}]);
    if(path.endsWith('/content'))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')});
    if(path==='/api/v1/audit-logs')return reply(list([]));
    return reply(null,404);
  });
  return {calls,bundle};
}
export async function signIn(page) {
  await page.goto('/');await page.getByLabel('Tên đăng nhập hoặc email').fill('admin');await page.getByLabel('Mật khẩu',{exact:true}).fill('long-password');await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await page.locator('.sidebar').waitFor();await page.locator('.page-loading').waitFor({state:'hidden'});
}
export async function openNav(page,label) {
  const english=await page.locator('html').getAttribute('lang')==='en';
  if(await page.locator('.mobile-toggle').isVisible())await page.getByRole('button',{name:english?'Open menu':'Mở menu',exact:true}).click();
  await page.locator('.sidebar').getByRole('button',{name:label,exact:true}).click();
}
