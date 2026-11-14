import {stripTypeScriptTypes} from 'node:module';
import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const source=stripTypeScriptTypes(fs.readFileSync('student-house-portal/supabase/manage/index.ts','utf8').replace(/^import .*\n/,''));
async function scenario(config={}){
 let handler;const calls=[];
 const query=table=>new Proxy({}, {get:(_,name)=>name==='then'?(ok=>Promise.resolve({data:table==='organization_memberships'?{role:config.role||'reception'}:table==='documents'?(config.documentAllowed?{id:'d',tenant_id:'t',object_path:'t/private.pdf'}:null):table==='registration_requests'?{id:'50000000-0000-0000-0000-000000000001',email:'qa@example.invalid',status:'invited',first_name:'QA',last_name:'Student',room_number:'TEST',contract_number:'TEST-C1',accommodation_from:'2026-11-01',accommodation_to:'2026-11-30'}:table==='rooms'?{id:'r',name:'TEST'}:null,error:null}).then(ok)):()=>query(table)});
 const serviceQuery=table=>new Proxy({}, {get:(_,name)=>name==='then'?(ok=>Promise.resolve({data:table==='residents'?(config.body?.action==='activate_approved_login'?{user_id:'u'}:[{id:'r'}]):table==='organization_memberships'?{role:'student',active:true}:null,error:null}).then(ok)):()=>serviceQuery(table)});
 const service={
  auth:{
   admin:{
    listUsers:async()=>({data:{users:config.existingAccount?[{id:'u',email:'qa@example.invalid'}]:[]},error:null}),
    createUser:async()=>{calls.push('create_user');return {data:{user:{id:'u'}},error:null};},
    deleteUser:async()=>{calls.push('delete_user');return {error:null};},
    getUserById:async()=>({data:{user:{id:'u',email:'qa@example.invalid',email_confirmed_at:config.alreadyConfirmed?'2026-11-14T12:00:00Z':null}},error:null}),
    updateUserById:async()=>{calls.push('confirm_email');return {data:{},error:null};},
    inviteUserByEmail:async()=>{
     calls.push('email');
     return {data:{user:{id:'u'}},error:null};
    }
   },
   signInWithOtp:async()=>{calls.push('magiclink');return {error:config.mailFailure?{code:'over_email_send_rate_limit'}:null};}
  },
  from:serviceQuery,
  storage:{from:()=>({createSignedUrl:async()=>{calls.push('sign');return {data:{signedUrl:'https://private.test/synthetic'},error:null};}})},
  rpc:async(name,args)=>{calls.push(name);if(name==='residence_account_has_password')return {data:config.hasPassword===true,error:null};return {error:config.rpcFailure?{}:null};}
 };
 const client={auth:{getUser:async()=>({data:{user:config.unauthorized?null:{id:'actor'}},error:null})},from:query};
 const context={Response,console:{error(){}},createClient:(u,k)=>k==='service'?service:client,Deno:{env:{get:k=>k==='SUPABASE_SERVICE_ROLE_KEY'?'service':'public'},serve:fn=>handler=fn}};
 vm.runInNewContext(source,context);
 const body={action:'invite',role:'student',verified_assignment:{contract_number:'TEST-C1',room_number:'TEST',accommodation_from:'2026-11-01',accommodation_to:'2026-11-30'},tenant_id:'30000000-0000-0000-0000-000000000001',registration_id:'50000000-0000-0000-0000-000000000001',email:'qa@example.invalid',name:'QA Student',verified_monthly_rent:300,verified_due_day:5,verified_schedule:[{period:'2026-11',amount:300,due_on:'2026-11-05'}],...config.body};
 const response=await handler(new Request('https://edge.test/manage',{method:'POST',headers:{Origin:'https://www.webu.sk',Authorization:'Bearer synthetic','Content-Type':'application/json'},body:JSON.stringify(body)}));
 return {status:response.status,body:await response.json(),calls};
}
let r=await scenario({unauthorized:true});assert.equal(r.status,401);assert.deepEqual(r.calls,[]);
r=await scenario({role:'student'});assert.equal(r.status,403);assert.deepEqual(r.calls,[]);
r=await scenario({body:{verified_schedule:[]}});assert.equal(r.status,400);assert.deepEqual(r.calls,[]);
r=await scenario({body:{verified_assignment:{contract_number:'x',room_number:'TEST',accommodation_from:'2026-11-01',accommodation_to:'2026-11-30'}}});
assert.equal(r.status,400);assert.deepEqual(r.calls,[]);
r=await scenario({mailFailure:true});
assert.equal(r.status,200,'Approval must not be lost when a post-commit email fails');
assert.equal(r.body.ok,true);assert.equal(r.body.email_sent,false);
assert.deepEqual(r.calls,['create_user','residence_approve_registration_verified','residence_account_has_password','magiclink']);
r=await scenario({rpcFailure:true});
assert.equal(r.status,409);assert.equal(r.body.ok,undefined);
assert.deepEqual(r.calls,['create_user','residence_approve_registration_verified','delete_user'],'Do not email before a failed approval; clean up only the fresh identity');
r=await scenario();assert.equal(r.status,200);
assert.deepEqual(r.calls,['create_user','residence_approve_registration_verified','residence_account_has_password','magiclink'],'Invite must follow DB commit');
assert.equal(r.body.ok,true);assert.equal(r.body.email_sent,true);
r=await scenario({existingAccount:true});
assert.equal(r.status,200);assert.deepEqual(r.calls,['residence_approve_registration_verified','residence_account_has_password','magiclink'],'Preserve existing Auth credentials');
r=await scenario({existingAccount:true,hasPassword:true});
assert.equal(r.status,200);assert.equal(r.body.login_ready,true);
assert.equal(r.body.email_sent,false,'Approved password accounts do not need an email invitation');
assert.deepEqual(r.calls,['residence_approve_registration_verified','residence_account_has_password','confirm_email']);
r=await scenario({body:{action:'activate_approved_login'},hasPassword:true});
assert.equal(r.status,200);assert.equal(r.body.login_ready,true);
assert.deepEqual(r.calls,['residence_account_has_password','confirm_email']);
r=await scenario({body:{action:'activate_approved_login'},hasPassword:false});
assert.equal(r.status,409);assert.deepEqual(r.calls,['residence_account_has_password']);
r=await scenario({body:{registration_id:undefined,room_number:'TEST'}});
assert.equal(r.status,200);assert.deepEqual(r.calls,['email','provision_member'],'Keep legacy manual staff invitations');
r=await scenario({body:{action:'download',document_id:'d'}});assert.equal(r.status,403);assert.deepEqual(r.calls,[]);
r=await scenario({documentAllowed:true,body:{action:'download',document_id:'d'}});assert.equal(r.status,200);assert.deepEqual(r.calls,['sign']);
console.log('PASS 14 manage handler scenarios, post-approval invitation, rollback cleanup, and legacy staff invitations');
