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
test('no fake success for unavailable backend or business APIs; source files are not served',async()=>{
  const server=createAppServer({backend:'http://127.0.0.1:1'}),base=await listen(server);
  try{
    const health=await fetch(base+'/backend/health');assert.equal(health.status,503);assert.equal((await health.json()).data,null);
    for(const path of ['/api/v1/auth/login','/.git/config','/package.json','/docs/BACKEND_INTEGRATION.md','/src/../package.json'])assert.equal((await fetch(base+path)).status,404,path);
    const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/src\/app.js/);
    assert.equal((await fetch(base+'/src/styles.css')).status,200);
    assert.equal((await fetch(base+'/backend/health',{method:'POST'})).status,405);
  }finally{await close(server);}
});
