import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=stripTypeScriptTypes(fs.readFileSync('student-house-portal/supabase/manage/index.ts','utf8').replace(/^import .*\n/,''));
async function scenario(config={}){
 let handler;const calls=[];
 const query=table=>new Proxy({}, {get:(_,name)=>name==='then'?(ok=>Promise.resolve({data:table==='organization_memberships'?{role:config.role||'reception'}:table==='documents'?(config.documentAllowed?{id:'d',tenant_id:'t',object_path:'t/private.pdf'}:null):table==='registration_requests'?{id:'50000000-0000-0000-0000-000000000001',email:'qa@example.invalid',first_name:'QA',last_name:'Student',room_number:'TEST',contract_number:'TEST-C1',accommodation_from:'2026-11-01',accommodation_to:'2026-11-30'}:table==='rooms'?{id:'r',name:'TEST'}:null,error:null}).then(ok)):()=>query(table)});
 const serviceQuery=table=>new Proxy({}, {get:(_,name)=>name==='then'?(ok=>Promise.resolve({data:table==='residents'?[{id:'r'}]:null,error:null}).then(ok)):()=>serviceQuery(table)});
 const service={
  auth:{admin:{inviteUserByEmail:async()=>{
   calls.push('email');
   return config.mailFailure?{error:{code:'over_email_send_rate_limit'}}:{data:{user:{id:'u'}}};
  }}},
  from:serviceQuery,
  storage:{from:()=>({createSignedUrl:async()=>{calls.push('sign');return {data:{signedUrl:'https://private.test/synthetic'},error:null};}})},
  rpc:async(name,args)=>{calls.push(name);return {error:config.rpcFailure?{}:null};}
 };
 const client={auth:{getUser:async()=>({data:{user:config.unauthorized?null:{id:'actor'}},error:null})},from:query};
 const context={Response,console:{error(){}},createClient:(u,k)=>k==='service'?service:client,Deno:{env:{get:k=>k==='SUPABASE_SERVICE_ROLE_KEY'?'service':'public'},serve:fn=>handler=fn}};
 vm.runInNewContext(source,context);
 const body={action:'invite',role:'student',tenant_id:'30000000-0000-0000-0000-000000000001',registration_id:'50000000-0000-0000-0000-000000000001',email:'qa@example.invalid',name:'QA Student',verified_monthly_rent:300,verified_due_day:5,verified_schedule:[{period:'2026-11',amount:300,due_on:'2026-11-05'}],...config.body};
 const response=await handler(new Request('https://edge.test/manage',{method:'POST',headers:{Origin:'https://www.webu.sk',Authorization:'Bearer synthetic','Content-Type':'application/json'},body:JSON.stringify(body)}));
 return {status:response.status,body:await response.json(),calls};
}
let r=await scenario({unauthorized:true});assert.equal(r.status,401);assert.deepEqual(r.calls,[]);
r=await scenario({role:'student'});assert.equal(r.status,403);assert.deepEqual(r.calls,[]);
r=await scenario({body:{verified_schedule:[]}});assert.equal(r.status,400);assert.deepEqual(r.calls,[]);
r=await scenario({mailFailure:true});assert.equal(r.status,503);assert.deepEqual(r.calls,['email']);
r=await scenario({rpcFailure:true});assert.equal(r.status,409);assert.equal(r.body.ok,undefined);
r=await scenario();assert.equal(r.status,200);assert.deepEqual(r.calls,['email','residence_approve_registration']);assert.equal(r.body.ok,true);
r=await scenario({body:{registration_id:undefined,room_number:'TEST'}});assert.equal(r.status,200);assert.deepEqual(r.calls,['email','provision_member']);
r=await scenario({body:{action:'download',document_id:'d'}});assert.equal(r.status,403);assert.deepEqual(r.calls,[]);
r=await scenario({documentAllowed:true,body:{action:'download',document_id:'d'}});assert.equal(r.status,200);assert.deepEqual(r.calls,['sign']);
console.log('PASS 9 manage handler scenarios, including legacy invitation and private signed-download preservation (synthetic transport)');
