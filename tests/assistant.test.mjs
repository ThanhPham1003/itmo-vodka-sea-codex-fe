import test from 'node:test';
import assert from 'node:assert/strict';
import { AssistantState,boundedHistory } from '../src/assistant-state.js';
import { createDemoAssistant } from '../src/assistant-demo.js';
import { createBackendService } from '../src/backend-service.js';

const answer={status:'answered',blocks:[{text:'Guidance',source_ids:['review-readiness']}],sources:[],suggestions:[]};
function state(service={}){const s=new AssistantState({assistantContext:async()=>({enabled:true,suggestions:[],articles:[]}),assistantChat:async()=>answer,...service});s.update({key:'company:user:1',locale:'vi',page:{name:'detail',tab:'issues'}});return s;}
test('bounded history respects both per-message and overall Unicode budgets',()=>{
  const turns=Array.from({length:20},(_,i)=>({role:i%2?'assistant':'user',content:'ệ'.repeat(4000)}));
  const history=boundedHistory(turns);assert.equal(history.length,6);assert.equal(history.reduce((n,m)=>n+Array.from(m.content).length,0),12000);assert.ok(history.every(m=>Array.from(m.content).length===2000));
});
test('chat request includes only bounded conversation and page enums',async()=>{
  let body;const s=state({assistantChat:async input=>{body=input;return answer;}});await s.loadContext();await s.send('  Why approve?  ');
  assert.deepEqual(body,{message:'Why approve?',locale:'vi',page:{name:'detail',tab:'issues'},history:[]});assert.equal(s.turns.length,2);assert.equal(s.pending,false);
  assert.equal(JSON.stringify(body).includes('company:user'),false);
});
test('session changes abort and discard stale answers',async()=>{
  let resolve,signal;const s=state({assistantChat:(_,{signal:provided})=>{signal=provided;return new Promise(r=>resolve=r);}});await s.loadContext();const pending=s.send('review');assert.equal(s.pending,true);
  s.update({key:'another-company:user:2',locale:'vi',page:{name:'dossiers'}});assert.equal(signal.aborted,true);resolve(answer);await pending;assert.deepEqual(s.turns,[]);assert.equal(s.pending,false);
});
test('cancel, clear and locale switch discard late responses without persisting history',async()=>{
  for(const action of ['cancel','reset','locale']){
    let resolve;const s=state({assistantChat:()=>new Promise(r=>resolve=r)});await s.loadContext();const pending=s.send('review');
    if(action==='locale')s.update({key:s.sessionKey,locale:'en',page:{name:'detail'}});else s[action]();
    resolve(answer);await pending;assert.equal(s.pending,false);assert.ok(!s.turns.some(t=>t.role==='assistant'));if(action==='reset')assert.deepEqual(s.turns,[]);
  }
});
test('disabled, busy and invalid requests never call AI; provider errors are visible',async()=>{
  let calls=0;const s=state({assistantChat:async()=>{calls++;throw Object.assign(new Error('Unavailable'),{status:503,requestId:'request-1'});}});
  s.context={enabled:false};await s.send('review');assert.equal(calls,0);s.context.enabled=true;await s.send('x'.repeat(2001));assert.equal(calls,0);
  await s.send('review');assert.equal(s.pending,false);assert.match(s.error,/request-1/);assert.equal(calls,1);
});
test('demo answers and citations are local with explicit knowledge version',async()=>{
  const demo=createDemoAssistant();const context=await demo.assistantContext('en');assert.ok(context.knowledge_version.endsWith('.demo'));
  const reply=await demo.assistantChat({message:'approve',locale:'en'});assert.match(reply.blocks[0].text,/VALID_DOCUMENT/);assert.equal(reply.sources[0].id,'review-readiness');
  const article=await demo.assistantArticle(reply.sources[0].id,'en');assert.match(article.content,/cannot approve/);
});
test('live service uses authenticated same-origin endpoints with extended chat timeout',async()=>{
  const calls=[];const client={request:async(path,options={})=>{calls.push({path,...options});return {data:{enabled:true}};}};
  const service=createBackendService(client);const controller=new AbortController();await service.assistantContext('en','detail',{signal:controller.signal});await service.assistantArticle('review-readiness','en');await service.assistantChat({message:'review',locale:'en'},{signal:controller.signal});
  assert.equal(calls[0].path,'/api/v1/assistant/context?locale=en&page=detail');assert.equal(calls[1].path,'/api/v1/assistant/articles/review-readiness?locale=en');assert.equal(calls[2].timeoutMs,70000);assert.equal(calls[2].track,false);assert.equal(calls[2].signal,controller.signal);
});
