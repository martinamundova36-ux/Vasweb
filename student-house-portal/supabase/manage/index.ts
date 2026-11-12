import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
const url=Deno.env.get('SUPABASE_URL')!;
const portalOrigin='https://www.webu.sk';
const service=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
Deno.serve(async(req)=>{
 const origin=req.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':portalOrigin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Content-Type':'application/json','Cache-Control':'no-store'};
 if(origin&&origin!==portalOrigin)return new Response('Forbidden',{status:403});
 if(req.method==='OPTIONS')return new Response(null,{headers});
 const reply=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers});
 try{
  if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
  const bearer=req.headers.get('Authorization');if(!bearer)return reply({error:'unauthorized'},401);
  const client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:bearer}},auth:{persistSession:false}});
  const {data:{user},error}=await client.auth.getUser();if(error||!user)return reply({error:'unauthorized'},401);
  // Every privileged action must also pass current DB authorization/session checks.
  const body=await req.json();
  if(body.action==='download'){
   const {data:doc,error}=await client.from('documents').select('id,tenant_id,object_path').eq('id',body.document_id).eq('upload_complete',true).single();if(error||!doc)return reply({error:'forbidden'},403);
   const {data,error:signError}=await service.storage.from('residence-private').createSignedUrl(doc.object_path,60);if(signError)throw signError;
   const {error:auditError}=await service.from('audit_logs').insert({tenant_id:doc.tenant_id,actor_id:user.id,action:'DOWNLOAD_SIGNED_60S',entity:'documents',entity_id:doc.id});if(auditError)throw auditError;
   return reply({url:data.signedUrl});
  }
  if(body.action!=='invite')return reply({error:'invalid_action'},400);
  if(typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email)||typeof body.name!=='string'||body.name.trim().length<1||body.name.length>200)return reply({error:'invalid_data'},400);

  const role=body.role;if(!['student','reception','org_admin'].includes(role))return reply({error:'invalid_role'},400);
  const tenant=body.tenant_id;
  if(typeof tenant!=='string'||!/^[0-9a-f-]{36}$/i.test(tenant))return reply({error:'invalid_tenant'},400);
  const {data:m,error:roleError}=await client.from('organization_memberships').select('role').eq('tenant_id',tenant).eq('user_id',user.id).eq('active',true).maybeSingle();
  const {data:p}=await client.from('platform_admins').select('user_id').eq('user_id',user.id).maybeSingle();
  if(roleError||!(m?.role==='org_admin'||(m?.role==='reception'&&role==='student')||(p&&role==='org_admin')))return reply({error:'forbidden'},403);

  // Any resident may submit a public request, but only verified reception staff can approve it.
  // Do not accept contract dates/numbers from a browser acting as an unverified resident.
  let registration:Record<string,string>|null=null;
  if(role==='student'&&body.registration_id){
    if(typeof body.registration_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.registration_id))return reply({error:'invalid_registration'},400);
    const {data:request,error:requestError}=await client.from('registration_requests')
      .select('id,tenant_id,email,first_name,last_name,room_number,contract_number,accommodation_from,accommodation_to,status')
      .eq('id',body.registration_id).eq('tenant_id',tenant).eq('status','pending').maybeSingle();
    if(requestError||!request||request.email.toLowerCase()!==String(body.email).trim().toLowerCase())return reply({error:'registration_not_pending'},409);
    registration=request;
  }

  if(registration&&(!Number.isFinite(body.verified_monthly_rent)||body.verified_monthly_rent<=0||!Number.isInteger(body.verified_due_day)||body.verified_due_day<1||body.verified_due_day>28||!Array.isArray(body.verified_schedule)||!body.verified_schedule.length||body.verified_schedule.length>121))return reply({error:'verified_schedule_required'},400);

  const email=String(body.email).trim().toLowerCase();
  const residentName=registration ? (registration.first_name+' '+registration.last_name).trim() : body.name.trim();
  const redirect=portalOrigin+'/student-house-portal/'+(role==='student'?'':'?view=reception');
  let uid:string|undefined,existingUser=false;
  const {data:inv,error:inviteError}=await service.auth.admin.inviteUserByEmail(email,{redirectTo:redirect});
  uid=inv?.user?.id;
  if(inviteError){
    const code=String(inviteError.code||'');
    const duplicate=code==='email_exists'||code==='user_already_exists'||/already (been )?registered|already exists/i.test(inviteError.message||'');
    if(!duplicate)return reply({error:'invitation_failed'},503);
    existingUser=true;
    for(let page=1;page<=100&&!uid;page++){
      const {data,error}=await service.auth.admin.listUsers({page,perPage:100});if(error)throw error;
      uid=data.users.find(u=>u.email?.toLowerCase()===email)?.id;
      if(data.users.length<100)break;
    }
  }
  if(!uid)return reply({error:'user_not_resolved'},503);
  // Never claim the registration was approved if the invitation/recovery email cannot be delivered.
  if(existingUser){
    const {error:resetError}=await service.auth.resetPasswordForEmail(email,{redirectTo:redirect});
    if(resetError)return reply({error:'password_email_failed'},503);
  }
  if(registration){
    const {error:approvalError}=await service.rpc('residence_approve_registration',{
      p_actor:user.id,p_tenant:tenant,p_registration:registration.id,p_user:uid,
      p_monthly_rent:body.verified_monthly_rent,p_due_day:body.verified_due_day,p_schedule:body.verified_schedule
    });
    if(approvalError)return reply({error:'approval_conflict'},409);
  }else{
    const {data:existing,error:checkError}=await service.from('organization_memberships').select('role').eq('tenant_id',tenant).eq('user_id',uid).maybeSingle();
    if(checkError)throw checkError;
    if(existing)return reply({error:'membership_exists'},409);
    const {error:provisionError}=await service.rpc('provision_member',{p_actor:user.id,p_tenant:tenant,p_user:uid,p_role:role,p_name:residentName,p_email:email});
    if(provisionError)throw provisionError;
    if(role==='student'){
      const room=String(body.room_number||'').trim().normalize('NFC').slice(0,30);
      const {data:residentRows,error:residentError}=await service.from('residents').update({verified_room_number:room})
        .eq('tenant_id',tenant).eq('user_id',uid).select('id');
      if(residentError||!residentRows?.length)throw new Error('verified_resident_update_failed');
    }
  }
  const {error:profileError}=await service.from('profiles').update({display_name:residentName}).eq('id',uid);
  if(profileError)console.error('profile_display_name_update_failed',profileError.code);

  const {error:auditError}=await service.from('audit_logs').insert({
    tenant_id:tenant,actor_id:user.id,action:'RESIDENT_ACCESS_APPROVED',entity:'organization_memberships',entity_id:uid
  });if(auditError)console.error('invite_audit_failed',auditError.code);
  return reply({ok:true,email_sent:true});

 }catch(e){console.error('manage_request_failed');return reply({error:'request_failed'},400)}
});
