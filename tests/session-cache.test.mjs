import test from 'node:test';
import assert from 'node:assert/strict';
import {createSessionCache} from '../src/session-cache.js';
import {ApiClient} from '../src/api.js';
import {createBackendService} from '../src/backend-service.js';

const key='docsense:session:v1';
const future=new Date(Date.now()+3600000).toISOString();
const me={id:'user-1',company_id:'company-1',full_name:'Current member',role:'broker',permissions:['dossier:read'],active:true,company:{name:'Current company'}};
const response=(data,status=200)=>new Response(JSON.stringify({code:status,message:'API response',data}),{status});
function fixture(){
  const values=new Map();
  const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  return {values,storage,cache:createSessionCache({storage})};
}

test('session cache rejects expired/malformed records and stores only token and expiry',()=>{
  const {values,cache}=fixture();
  cache.write('token',future);
  assert.deepEqual(JSON.parse(values.get(key)),{version:1,accessToken:'token',expiresAt:future});
  assert.deepEqual(cache.read(),{accessToken:'token',expiresAt:future});
  for(const raw of ['bad-json','null',JSON.stringify({version:1,accessToken:'token',expiresAt:'invalid'}),JSON.stringify({version:1,accessToken:'token',expiresAt:new Date(0).toISOString()}),JSON.stringify({version:1,accessToken:'bad token',expiresAt:future})]){
    values.set(key,raw);assert.equal(cache.read(),null);assert.equal(values.has(key),false);
  }
  cache.write('token',undefined);assert.equal(values.has(key),false);
  const denied=createSessionCache({storage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');},removeItem(){throw Error('blocked');}}});
  assert.doesNotThrow(()=>denied.write('token',future));assert.equal(denied.read(),null);
});

test('new client restores the credential but fetches identity and permissions from me',async()=>{
  const {cache}=fixture();
  new ApiClient({sessionCache:cache}).setAccessToken('saved-token',future);
  const calls=[];
  const client=new ApiClient({sessionCache:cache,fetchImpl:async(path,options)=>{calls.push({path,options});return response(me);}});
  const service=createBackendService(client);
  assert.equal(service.session,null);assert.equal(await service.restoreSession(),true);
  assert.equal(calls[0].path,'/api/v1/auth/me');assert.equal(calls[0].options.headers.get('Authorization'),'Bearer saved-token');
  assert.equal(service.session.name,me.full_name);assert.equal(service.can('user:manage'),false);assert.equal(service.can('dossier:read'),true);
  service.logout();assert.equal(cache.read(),null);assert.equal(service.session,null);
  assert.equal(await service.restoreSession(),false);assert.equal(calls.length,1);
});

test('401 clears saved sessions while temporary failure allows a later restore',async()=>{
  const {cache}=fixture();cache.write('saved-token',future);
  let status=503;
  const service=createBackendService(new ApiClient({sessionCache:cache,fetchImpl:async()=>response(status===200?me:null,status)}));
  await assert.rejects(service.restoreSession(),error=>error.status===503);
  assert.equal(service.session,null);assert.ok(cache.read());
  status=200;assert.equal(await service.restoreSession(),true);
  status=401;assert.equal(await service.restoreSession(),false);assert.equal(cache.read(),null);assert.equal(service.session,null);
});

test('logout during restore discards late identity and cannot restore the saved token',async()=>{
  const {cache}=fixture();cache.write('saved-token',future);
  let finish;
  const service=createBackendService(new ApiClient({sessionCache:cache,fetchImpl:()=>new Promise(resolve=>{finish=resolve;})}));
  const pending=service.restoreSession();service.logout();finish(response(me));
  await assert.rejects(pending,error=>error.status===499);assert.equal(service.session,null);assert.equal(cache.read(),null);
});

test('an old unauthorized response cannot delete a newer cached session',async()=>{
  const {cache}=fixture();let finish;
  const client=new ApiClient({sessionCache:cache,fetchImpl:()=>new Promise(resolve=>{finish=resolve;})});
  client.setAccessToken('old-token',future);
  const pending=client.request('/api/v1/auth/me');client.setAccessToken('new-token',future);finish(response(null,401));
  await assert.rejects(pending,error=>error.status===499);assert.equal(cache.read().accessToken,'new-token');
});
