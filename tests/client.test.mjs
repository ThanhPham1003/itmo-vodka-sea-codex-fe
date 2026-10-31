import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient, ApiError } from '../src/api.js';

// Contract fixtures exercise transport only; these paths do not claim a business
// endpoint exists in the scaffold backend.
const fixturePath = '/api/v1/contract-fixture';
const responseId = '80404d7e-ef70-4d73-aa3a-b9cc43f538a6';
const reply = (status = 200, data = { ready:true }, message = 'Fixture response') => new Response(
  JSON.stringify({ code:status, message, data }),
  { status, headers:{ 'Content-Type':'application/json', 'X-Request-ID':responseId } }
);
const headersOf = init => new Headers(init.headers);

test('fetch is invoked with the browser global receiver',async()=>{
  const client=new ApiClient({fetchImpl:async function(){assert.equal(this,globalThis);return reply();}});
  assert.equal((await client.request(fixturePath)).status,200);
});

test('request activity tracks concurrent responses and returns to idle after an error',async()=>{
  const pending=[],responses=[];
  const client=new ApiClient({onRequestStateChange:state=>pending.push(state.pending),fetchImpl:()=>new Promise(resolve=>responses.push(resolve))});
  const first=client.request(fixturePath),second=client.request(fixturePath);
  responses[0](reply());await first;
  responses[1](reply(503,null,'Fixture unavailable'));await assert.rejects(second,ApiError);
  assert.deepEqual(pending,[1,2,1,0]);
});

test('API client keeps requests same-origin and inside the allowed API routes', async () => {
  let calls = 0;
  const client = new ApiClient({ fetchImpl:async () => { calls++; return reply(); } });
  client.setAccessToken('private-test-token');
  for (const path of [
    'https://example.test/api/v1/contract-fixture', '//example.test/api/v1/contract-fixture',
    '/outside', '/api/v1/../private', '/api/v1/%2e%2e/private',
    '/api/v1/\\example.test', '/backend/health/../private'
  ]) {
    await assert.rejects(async () => client.request(path), undefined, path);
  }
  assert.equal(calls, 0, 'rejected URLs must never receive a token or network request');
});

test('JSON requests carry a memory-only Bearer token and a UUID request ID', async () => {
  const calls = [];
  const client = new ApiClient({ fetchImpl:async (path, init) => { calls.push({ path, init }); return reply(201, { id:'fixture-id' }); } });
  client.setAccessToken('private-test-token');
  const result = await client.request(fixturePath, { method:'POST', body:{ name:'Dữ liệu minh họa' } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].path, fixturePath);
  assert.equal(calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(calls[0].init.body), { name:'Dữ liệu minh họa' });
  const headers = headersOf(calls[0].init);
  assert.equal(headers.get('Authorization'), 'Bearer private-test-token');
  assert.match(headers.get('Content-Type'), /^application\/json/);
  assert.match(headers.get('X-Request-ID'), /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.equal(result.status, 201);
  assert.equal(result.requestId, responseId);
  assert.deepEqual(result.data, { id:'fixture-id' });
});

test('FormData is passed through without overriding its multipart boundary', async () => {
  let captured;
  const client = new ApiClient({ fetchImpl:async (_path, init) => { captured=init; return reply(); } });
  const data = new FormData();
  data.append('files', new Blob(['sample'], { type:'application/pdf' }), 'sample.pdf');
  await client.request(fixturePath, { method:'POST', body:data });
  assert.strictEqual(captured.body, data);
  assert.equal(headersOf(captured).has('Content-Type'), false);
});

test('401 clears credentials and notifies the caller once without retrying a mutation', async () => {
  const calls = [];
  let expired = 0;
  const client = new ApiClient({
    onUnauthenticated:() => { expired++; },
    fetchImpl:async (_path, init) => { calls.push(init); return calls.length===1 ? reply(401, null, 'Authentication required') : reply(); }
  });
  client.setAccessToken('expired-test-token');
  await assert.rejects(client.request(fixturePath, { method:'POST', body:{ change:true } }), error => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 401);
    assert.equal(error.requestId, responseId);
    return true;
  });
  assert.equal(calls.length, 1, 'an unauthorized POST must not be replayed');
  assert.equal(expired, 1);
  await client.request(fixturePath);
  assert.equal(headersOf(calls[1]).has('Authorization'), false);
});

test('403 preserves the session and carries backend error correlation information', async () => {
  const calls=[];
  let expired=0;
  const client = new ApiClient({ onUnauthenticated:() => { expired++; }, fetchImpl:async (_path, init) => {
    calls.push(init); return calls.length===1 ? reply(403, null, 'Permission denied') : reply();
  } });
  client.setAccessToken('active-test-token');
  await assert.rejects(client.request(fixturePath), error => {
    assert.equal(error.status, 403);
    assert.equal(error.requestId, responseId);
    assert.match(error.message, /Permission denied/);
    return true;
  });
  await client.request(fixturePath);
  assert.equal(expired, 0);
  assert.equal(headersOf(calls[1]).get('Authorization'), 'Bearer active-test-token');
});

test('clearSession removes credentials from subsequent requests', async () => {
  let captured;
  const client = new ApiClient({ fetchImpl:async (_path, init) => { captured=init; return reply(); } });
  client.setAccessToken('active-test-token');
  client.clearSession();
  await client.request(fixturePath);
  assert.equal(headersOf(captured).has('Authorization'), false);
});

test('malformed JSON and invalid response envelopes are rejected as protocol errors', async () => {
  const bodies = [
    '<html>Wrong upstream</html>',
    JSON.stringify({ data:{ ready:true } }),
    JSON.stringify({ code:201, message:'Wrong status', data:null }),
    JSON.stringify({ code:200, message:42, data:null }),
    JSON.stringify({ code:200, message:'Missing data property' })
  ];
  for (const body of bodies) {
    const client = new ApiClient({ fetchImpl:async () => new Response(body, { status:200, headers:{ 'X-Request-ID':responseId } }) });
    await assert.rejects(client.request(fixturePath), error => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 502);
      assert.equal(error.requestId, responseId);
      return true;
    });
  }
});

test('network failure and timeout become service-unavailable errors without retries', async () => {
  let calls=0;
  const offline = new ApiClient({ fetchImpl:async () => { calls++; throw new TypeError('network failure'); } });
  await assert.rejects(offline.request(fixturePath), error => error instanceof ApiError && error.status===503);
  assert.equal(calls, 1);
  const slow = new ApiClient({ timeoutMs:5, fetchImpl:(_path, init) => new Promise((_resolve, reject) => {
    if(init.signal.aborted) reject(init.signal.reason);
    else init.signal.addEventListener('abort', () => reject(init.signal.reason), { once:true });
  }) });
  // Keep an event-loop handle alive because AbortSignal.timeout uses an unref timer.
  const keepAlive=setInterval(() => {}, 50);
  try { await assert.rejects(slow.request(fixturePath), error => error instanceof ApiError && error.status===503); }
  finally { clearInterval(keepAlive); }
});

test('health is a public verified call and never receives the session token', async () => {
  let captured;
  const client = new ApiClient({ fetchImpl:async (path, init) => { captured={ path, init }; return reply(200, { status:'ok' }, 'Service is running'); } });
  client.setAccessToken('private-test-token');
  const result=await client.health();
  assert.equal(captured.path, '/backend/health');
  assert.equal(headersOf(captured.init).has('Authorization'), false);
  assert.equal(result.code, 200);
  assert.deepEqual(result.data, { status:'ok' });
  assert.equal(result.message, 'Service is running');
  assert.equal(result.requestId, responseId);
  assert.ok(Number.isFinite(Date.parse(result.checkedAt)));
});

test('health rejects a generic success envelope that does not prove liveness', async () => {
  const client = new ApiClient({ fetchImpl:async () => reply(200, { status:'unknown' }) });
  await assert.rejects(client.health(), error => error instanceof ApiError && error.status===502);
});
