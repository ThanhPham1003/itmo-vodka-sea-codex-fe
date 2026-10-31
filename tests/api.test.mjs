import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createAppServer } from '../scripts/server.mjs';
const listen=async server=>{server.listen(0,'127.0.0.1');await once(server,'listening');return 'http://127.0.0.1:'+server.address().port;};
const close=server=>new Promise(resolve=>server.close(resolve));

test('health proxy preserves actual upstream envelope and request ID',async()=>{
  const requestId='3bf507a6-37a6-4162-a253-69a831ea123c';
  const upstream=createServer((req,res)=>{assert.equal(req.url,'/health');res.writeHead(200,{'Content-Type':'application/json','X-Request-ID':requestId});res.end(JSON.stringify({code:200,message:'Service is running',data:{status:'ok'}}));});
  const backend=await listen(upstream),frontend=createAppServer({backend}),base=await listen(frontend);
  try{const response=await fetch(base+'/backend/health');assert.equal(response.status,200);assert.equal(response.headers.get('x-request-id'),requestId);assert.deepEqual(await response.json(),{code:200,message:'Service is running',data:{status:'ok'}});}
  finally{await close(frontend);await close(upstream);}
});
test('auth entry URLs redirect to hash routes without exposing arbitrary files',async()=>{
  const server=createAppServer(),base=await listen(server);
  try{
    for(const [path,location] of [['/login','/#/login'],['/signup','/#/signup'],['/login?mode=demo','/?mode=demo#/login']]){
      const response=await fetch(base+path,{redirect:'manual'});
      assert.equal(response.status,302);assert.equal(response.headers.get('location'),location);
      assert.equal(response.headers.get('cache-control'),'no-store');
      const landed=await fetch(new URL(location,base));assert.equal(landed.status,200);assert.match(await landed.text(),/src\/app.js/);
    }
    assert.equal((await fetch(base+'/login',{method:'POST',redirect:'manual'})).status,405);
    assert.equal((await fetch(base+'/.env')).status,404);
    assert.equal((await fetch(base+'/unknown-route')).status,404);
  }finally{await close(server);}
});
test('no fake success for unavailable backend or business APIs; source files are not served',async()=>{
  const server=createAppServer({backend:'http://127.0.0.1:1'}),base=await listen(server);
  try{
    const health=await fetch(base+'/backend/health');assert.equal(health.status,503);assert.equal((await health.json()).data,null);
    assert.equal((await fetch(base+'/api/v1/auth/login')).status,503);
    for(const path of ['/.git/config','/package.json','/docs/BACKEND_INTEGRATION.md','/src/../package.json'])assert.equal((await fetch(base+path)).status,404,path);
    const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/src\/app.js/);
    assert.equal((await fetch(base+'/src/styles.css')).status,200);
    assert.equal((await fetch(base+'/backend/health',{method:'POST'})).status,405);
  }finally{await close(server);}
});

test('API proxy streams multipart and preserves upstream status without forwarding untrusted tenant headers',async()=>{
  let received;
  const upstream=createServer(async(req,res)=>{
    const parts=[];for await(const chunk of req)parts.push(chunk);
    received={url:req.url,method:req.method,headers:req.headers,body:Buffer.concat(parts).toString()};
    res.writeHead(409,{'Content-Type':'application/json','X-Request-ID':'3bf507a6-37a6-4162-a253-69a831ea123c'});
    res.end(JSON.stringify({code:409,message:'Resource has changed',data:null}));
  });
  const backend=await listen(upstream),server=createAppServer({backend}),base=await listen(server);
  try{
    const form=new FormData();form.append('files',new File(['file-content'],'sample.pdf',{type:'application/pdf'}));
    const response=await fetch(base+'/api/v1/transport-test?version=2',{method:'POST',body:form,headers:{Authorization:'Bearer sample-token','X-Company-ID':'untrusted','Cookie':'session=do-not-forward','X-Request-ID':'3bf507a6-37a6-4162-a253-69a831ea123c'}});
    assert.equal(response.status,409);assert.equal((await response.json()).code,409);
    assert.equal(received.url,'/api/v1/transport-test?version=2');assert.equal(received.method,'POST');
    assert.equal(received.headers.authorization,'Bearer sample-token');assert.equal(received.headers['x-company-id'],undefined);assert.equal(received.headers.cookie,undefined);
    assert.match(received.headers['content-type'],/^multipart\/form-data; boundary=/);assert.match(received.body,/file-content/);assert.match(received.body,/sample.pdf/);
  }finally{await close(server);await close(upstream);}
});

test('unknown business routes retain real backend 404 and health requests carry no credentials',async()=>{
  let headers;
  const upstream=createServer((req,res)=>{
    headers=req.headers;
    res.writeHead(404,{'Content-Type':'application/json'});res.end(JSON.stringify({code:404,message:'Resource not found',data:null}));
  });
  const backend=await listen(upstream),server=createAppServer({backend}),base=await listen(server);
  try{
    const response=await fetch(base+'/api/v1/auth/login',{method:'POST',body:'{}',headers:{'Content-Type':'application/json'}});
    assert.equal(response.status,404);assert.equal((await response.json()).message,'Resource not found');
    await fetch(base+'/backend/health',{headers:{Authorization:'Bearer must-not-forward',Cookie:'test=private'}});
    assert.equal(headers.authorization,undefined);assert.equal(headers.cookie,undefined);
  }finally{await close(server);await close(upstream);}
});

test('backend redirects cannot forward credentials to another origin',async()=>{
  const upstream=createServer((req,res)=>{res.writeHead(302,{Location:'https://example.test/collect'});res.end();});
  const backend=await listen(upstream),server=createAppServer({backend}),base=await listen(server);
  try{const response=await fetch(base+'/api/v1/transport-test',{headers:{Authorization:'Bearer sample'}});assert.equal(response.status,502);assert.equal((await response.json()).data,null);}
  finally{await close(server);await close(upstream);}
});

test('production static root serves the generated frontend',async()=>{
  const {mkdtemp,cp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const root=await mkdtemp(join(tmpdir(),'folio-static-'));
  for(const file of ['index.html','src','assets'])await cp(file,join(root,file),{recursive:true});
  const server=createAppServer({root}),base=await listen(server);
  try{for(const file of ['/','/src/auth.css','/src/auth-view.js','/assets/logo.svg'])assert.equal((await fetch(base+file)).status,200,file);}
  finally{await close(server);await rm(root,{recursive:true,force:true});}
});
