import {test} from 'node:test';
import assert from 'node:assert/strict';
import {queueExistingRegistrationReceipt} from '../student-house-portal/supabase/register-student/receipt.js';
const now=Date.parse('2026-11-13T20:00:00Z');
function fixture(responses){
 const calls=[];
 const client={from(table){const query={table,filters:[],action:'read'};calls.push(query);
 const chain={select(){return this;},eq(k,v){query.filters.push([k,v]);return this;},is(k,v){query.filters.push([k,v]);return this;},gte(k,v){query.filters.push([k,v]);return this;},or(v){query.filters.push(['or',v]);return this;},limit(){return this;},update(payload){query.action='update';query.payload=payload;return this;},insert(payload){query.action='insert';query.payload=payload;return this;},upsert(payload,options){query.action='upsert';query.payload=payload;query.options=options;return this;},then(resolve,reject){return Promise.resolve(responses.shift()||{data:[],error:null}).then(resolve,reject);}};return chain;}};
 return {client,calls};
}
const entry={id:'request-a',email:'synthetic@example.invalid',status:'pending'};
test('Pending duplicate queues receipt to stored email without creating another request',async()=>{
 const f=fixture([{data:[]},{error:null}]);await queueExistingRegistrationReceipt(f.client,'tenant-a',entry,now);
 assert.equal(f.calls.length,2);assert.equal(f.calls[1].table,'residence_mail_outbox');assert.equal(f.calls[1].payload.recipient,entry.email);
 assert.equal(f.calls[1].payload.auth_link_type,undefined);assert.equal(f.calls[1].payload.link,null);assert.equal(f.calls[1].options.ignoreDuplicates,true);
 assert.equal(f.calls.some(c=>c.table==='registration_requests'),false);
});
test('Correction duplicate resends the current secure link, preserving correction state',async()=>{
 const f=fixture([{data:[]},{data:[{link:'https://www.webu.sk/student-house-portal/correction/#token=synthetic'}]},{error:null}]);
 await queueExistingRegistrationReceipt(f.client,'tenant-a',{...entry,status:'correction_requested',correction_token_hash:'hash',correction_expires_at:'2026-11-20T20:00:00Z'},now);
 assert.match(f.calls[2].payload.subject,/oprava registrácie/);assert.match(f.calls[2].payload.link,/#token=synthetic/);
 assert.equal(f.calls.some(c=>c.table==='registration_requests'),false);
});
test('Repeated request within fifteen minutes does not send another message',async()=>{
 const f=fixture([{data:[{id:'already-queued'}]}]);await queueExistingRegistrationReceipt(f.client,'tenant-a',entry,now);
 assert.equal(f.calls.length,1);assert.deepEqual(f.calls[0].filters.find(([k])=>k==='created_at'),['created_at','2026-11-13T19:45:00.000Z']);
});
test('Expired correction is renewed only through a conditional update and mailed to stored address',async()=>{
 const f=fixture([{data:[]},{data:[{id:entry.id}]},{error:null}]);
 await queueExistingRegistrationReceipt(f.client,'tenant-a',{...entry,status:'correction_requested',correction_token_hash:'old',correction_expires_at:'2026-11-01T20:00:00Z'},now);
 assert.equal(f.calls[1].action,'update');assert.deepEqual(f.calls[1].filters.find(([key])=>key==='correction_token_hash'),['correction_token_hash','old']);
 assert.equal(f.calls[1].payload.status,undefined);assert.equal(f.calls[1].payload.correction_reason,undefined);
 assert.match(f.calls[2].payload.link,/#token=[A-Za-z0-9_-]{43}$/);assert.equal(f.calls[2].payload.recipient,entry.email);
});
test('Mail queue failure is surfaced instead of a false success',async()=>{
 const f=fixture([{data:[]},{error:{code:'failure'}}]);
 await assert.rejects(()=>queueExistingRegistrationReceipt(f.client,'tenant-a',entry,now),/receipt_queue_failed/);
});
