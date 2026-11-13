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
  if(['send_profile_invite','activate_profile'].includes(body.action)){
    const tenant=body.tenant_id;
    if(typeof tenant!=='string'||!/^[0-9a-f-]{36}$/i.test(tenant))return reply({error:'invalid_tenant'},400);
    const {data:membership,error:membershipError}=await client.from('organization_memberships')
      .select('role').eq('tenant_id',tenant).eq('user_id',user.id).eq('active',true).maybeSingle();
    if(membershipError||membership?.role!=='student')return reply({error:'forbidden'},403);
    const {data:resident,error:residentError}=await client.from('residents')
      .select('id,email,profile_password_activated_at').eq('tenant_id',tenant).eq('user_id',user.id).eq('active',true).maybeSingle();
    if(residentError||!resident||resident.email.toLowerCase()!==user.email?.toLowerCase())return reply({error:'forbidden'},403);
    const {data:answers,error:answersError}=await client.from('resident_enquiries')
      .select('student_submitted_at').eq('tenant_id',tenant).eq('resident_id',resident.id).maybeSingle();
    const {data:photos,error:photoError}=await client.from('residence_portal_files')
      .select('id').eq('tenant_id',tenant).eq('resident_id',resident.id)
      .eq('user_id',user.id).eq('kind','profile_photo').eq('active',true).limit(1);
    if(answersError||photoError||!answers?.student_submitted_at||!photos?.length)
      return reply({error:'questionnaire_not_completed'},409);
    if(body.action==='send_profile_invite'){
      if(resident.profile_password_activated_at)return reply({ok:true,already_active:true});
      const {error:mailError}=await service.auth.resetPasswordForEmail(user.email!,{
        redirectTo:portalOrigin+'/student-house-portal/student/'
      });
      if(mailError){console.error('profile_invite_delivery_failed',mailError.code);return reply({error:'email_failed'},503);}
      return reply({ok:true,email_sent:true});
    }
    if(resident.profile_password_activated_at)return reply({ok:true,already_active:true});
    const {error:updateError}=await service.from('residents')
      .update({profile_password_activated_at:new Date().toISOString()})
      .eq('tenant_id',tenant).eq('id',resident.id).eq('user_id',user.id);
    if(updateError)return reply({error:'activation_failed'},503);
    return reply({ok:true,profile_activated:true});
  }
  if(!['invite','resend_student_access'].includes(body.action))return reply({error:'invalid_action'},400);
  if(body.action==='invite'&&(typeof body.email!=='string'||body.email.length>254||!/^\S+@\S+\.\S+$/.test(body.email)||typeof body.name!=='string'||body.name.trim().length<1||body.name.length>200))return reply({error:'invalid_data'},400);

  const role=body.role;if(!['student','reception','org_admin'].includes(role))return reply({error:'invalid_role'},400);
  const tenant=body.tenant_id;
  if(typeof tenant!=='string'||!/^[0-9a-f-]{36}$/i.test(tenant))return reply({error:'invalid_tenant'},400);
  const {data:m,error:roleError}=await client.from('organization_memberships').select('role').eq('tenant_id',tenant).eq('user_id',user.id).eq('active',true).maybeSingle();
  const {data:p}=await client.from('platform_admins').select('user_id').eq('user_id',user.id).maybeSingle();
  if(roleError||!(m?.role==='org_admin'||(m?.role==='reception'&&role==='student')||(p&&role==='org_admin')))return reply({error:'forbidden'},403);

  if(body.action==='resend_student_access'){
    if(role!=='student'||typeof body.registration_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.registration_id))
      return reply({error:'invalid_data'},400);
    const {data:record,error:recordError}=await client.from('registration_requests')
      .select('email,status').eq('tenant_id',tenant).eq('id',body.registration_id)
      .eq('status','invited').maybeSingle();
    if(recordError||!record)return reply({error:'approved_registration_not_found'},404);
    // Before the questionnaire, send a password-free link back to Step 2.
    // After submission, send the profile password creation email.
    const {data:account}=await service.from('residents')
      .select('id').eq('tenant_id',tenant).eq('email',record.email).eq('active',true).maybeSingle();
    const {data:answers}=account?await service.from('resident_enquiries')
      .select('student_submitted_at').eq('tenant_id',tenant).eq('resident_id',account.id).maybeSingle():{data:null};
    const {error:deliveryError}=answers?.student_submitted_at
      ?await service.auth.resetPasswordForEmail(record.email,{
        redirectTo:portalOrigin+'/student-house-portal/student/'
      })
      :await service.auth.signInWithOtp({email:record.email,options:{
        shouldCreateUser:false,emailRedirectTo:portalOrigin+'/student-house-portal/questionnaire/'
      }});
    if(deliveryError){
      console.error('student_access_resend_failed',deliveryError.code);
      return reply({error:'invitation_failed'},503);
    }
    return reply({ok:true,email_sent:true});
  }

  // Any resident may submit a public request, but only verified reception staff can approve it.
  // Do not accept contract dates/numbers from a browser acting as an unverified resident.
  let registration:Record<string,string>|null=null;
  if(role==='student'&&body.registration_id){
    if(typeof body.registration_id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.registration_id))return reply({error:'invalid_registration'},400);
    const {data:request,error:requestError}=await client.from('registration_requests')
      .select('id,tenant_id,email,first_name,last_name,room_number,contract_number,accommodation_from,accommodation_to,status')
      .eq('id',body.registration_id).eq('tenant_id',tenant).eq('status','pending').maybeSingle();
    if(requestError||!request||request.email.toLowerCase()!==String(body.email).trim().toLowerCase())return reply({error:'registration_not_pending'},409);
    // Never invite a student before staff have verified the contract and assigned a real room.
    if(typeof request.contract_number!=='string'||request.contract_number.trim().length<5||
       typeof request.room_number!=='string'||!request.room_number.trim())
      return reply({error:'reception_assignment_required'},409);
    const {data:confirmedRoom,error:roomError}=await client.from('rooms')
      .select('id').eq('tenant_id',tenant).eq('name',request.room_number).maybeSingle();
    if(roomError||!confirmedRoom)return reply({error:'reception_assignment_required'},409);
    registration=request;
  }

  if(registration&&(!Number.isFinite(body.verified_monthly_rent)||body.verified_monthly_rent<=0||!Number.isInteger(body.verified_due_day)||body.verified_due_day<1||body.verified_due_day>28||!Array.isArray(body.verified_schedule)||!body.verified_schedule.length||body.verified_schedule.length>121))return reply({error:'verified_schedule_required'},400);

  const email=String(body.email).trim().toLowerCase();
  const residentName=registration ? (registration.first_name+' '+registration.last_name).trim() : body.name.trim();
  const redirect=portalOrigin+'/student-house-portal/'+(role==='student'?'questionnaire/':'?view=reception');
  let uid:string|undefined,existingUser=false,emailSent=false;
  // New registrations have NO password. Reception approves the room, signed
  // contract data and monthly rent. New email accounts receive a one-time invite.
  // Older applicants who previously created an Auth account receive a password
  // setup/recovery link only after the approval transaction succeeds.
  if(registration){
    for(let page=1;page<=100&&!uid;page++){
      const {data,error:listError}=await service.auth.admin.listUsers({page,perPage:100});
      if(listError)throw listError;
      const matched=data.users.find(u=>u.email?.toLowerCase()===email);
      if(matched){uid=matched.id;existingUser=true;}
      if(data.users.length<100)break;
    }
  }
  if(!uid){
    const {data:inv,error:inviteError}=await service.auth.admin.inviteUserByEmail(email,{redirectTo:redirect});
    uid=inv?.user?.id;
    if(inviteError){
      const code=String(inviteError.code||'');
      const duplicate=code==='email_exists'||code==='user_already_exists'||/already (been )?registered|already exists/i.test(inviteError.message||'');
      if(!duplicate)return reply({error:'invitation_failed'},503);
      existingUser=true;
      for(let page=1;page<=100&&!uid;page++){
        const {data,error:listError}=await service.auth.admin.listUsers({page,perPage:100});
        if(listError)throw listError;
        uid=data.users.find(u=>u.email?.toLowerCase()===email)?.id;
        if(data.users.length<100)break;
      }
    }else emailSent=true;
  }
  if(!uid)return reply({error:'user_not_resolved'},503);
  // Staff invites to an existing account retain the old recovery workflow.
  // Student accounts created by the old form are not re-invited before approval.
  if(existingUser&&!registration){
    const {error:resetError}=await service.auth.resetPasswordForEmail(email,{redirectTo:redirect});
    if(resetError)return reply({error:'password_email_failed'},503);
    emailSent=true;
  }
  if(registration){
    const {error:approvalError}=await service.rpc('residence_approve_registration',{
      p_actor:user.id,p_tenant:tenant,p_registration:registration.id,p_user:uid,
      p_monthly_rent:body.verified_monthly_rent,p_due_day:body.verified_due_day,p_schedule:body.verified_schedule
    });
    if(approvalError)return reply({error:'approval_conflict'},409);
    if(existingUser){
      // Legacy accounts use an email magic link for the questionnaire.
      // They are not forced to set/reset their password until it is submitted.
      const {error:welcomeError}=await service.auth.signInWithOtp({email,options:{
        shouldCreateUser:false,emailRedirectTo:redirect
      }});
      if(welcomeError)console.error('student_access_email_failed',welcomeError.code);
      else emailSent=true;
    }
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
  return reply({ok:true,email_sent:emailSent,existing_account:existingUser});

 }catch(e){console.error('manage_request_failed');return reply({error:'request_failed'},400)}
});
