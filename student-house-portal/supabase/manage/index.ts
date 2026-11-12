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
  const {data:m}=await client.from('organization_memberships').select('role').eq('tenant_id',body.tenant_id).eq('user_id',user.id).eq('active',true).maybeSingle();
  const {data:p}=await client.from('platform_admins').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!(m?.role==='org_admin'||(m?.role==='reception'&&role==='student')||(p&&role==='org_admin')))return reply({error:'forbidden'},403);
  // Redirects are never accepted from user input. Configure the single trusted origin server-side.
  const redirect=portalOrigin+'/student-house-portal/';if(!redirect)return reply({error:'portal_origin_not_configured'},503);
  const {data:inv,error:inviteError}=await service.auth.admin.inviteUserByEmail(body.email,{redirectTo:redirect});
  let uid=inv?.user?.id;
  if(inviteError){
   if(!['email_exists','user_already_exists'].includes(inviteError.code||''))throw inviteError;
   for(let page=1;page<=100&&!uid;page++){
    const {data,error}=await service.auth.admin.listUsers({page,perPage:100});if(error)throw error;
    uid=data.users.find(u=>u.email?.toLowerCase()===String(body.email).toLowerCase())?.id;
    if(data.users.length<100)break;
   }
  }
  if(!uid)throw new Error('user_not_resolved');
  const {data:existing}=await service.from('organization_memberships').select('role').eq('tenant_id',body.tenant_id).eq('user_id',uid).maybeSingle();
  if(existing)return reply({error:'membership_exists'},409);
  const {error:provisionError}=await service.rpc('provision_member',{p_actor:user.id,p_tenant:body.tenant_id,p_user:uid,p_role:role,p_name:body.name.trim(),p_email:body.email.trim().toLowerCase()});if(provisionError)throw provisionError;
  // Room numbers are verified by reception, never read from student-controlled JWT metadata.
  if(role==='student' && typeof body.room_number==='string'){
    const room=body.room_number.trim().normalize('NFC');
    if(room && room.length<=30){
      const {error:roomError}=await service.from('residents').update({verified_room_number:room})
        .eq('tenant_id',body.tenant_id).eq('user_id',uid);
      if(roomError){console.error('resident_room_update_failed',roomError.code);throw roomError}
    }
  }
  return reply({ok:true});
 }catch(e){console.error('manage_request_failed');return reply({error:'request_failed'},400)}
});
