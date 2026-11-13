import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.119.0";

// Basic registration can be returned before approval. No account is created or
// role granted by these endpoints. The editable link is a 256-bit bearer secret.
const url=Deno.env.get("SUPABASE_URL")!;
const service=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const origins=new Set(["https://www.webu.sk","https://webu.sk"]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Contract numbers are reception-owned and MUST NOT be included in a student correction token.
const fields=["first_name","last_name","email","room_number","accommodation_from","accommodation_to"] as const;
const encoder=new TextEncoder();
const digest=async(secret:string)=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(secret)))].map(x=>x.toString(16).padStart(2,"0")).join("");
const reply=(origin:string,body:unknown,status=200)=>{
 const headers:Record<string,string>={
  "Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Pragma":"no-cache",
  "Vary":"Origin","Referrer-Policy":"no-referrer",
  "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods":"POST, OPTIONS"
 };
 if(origins.has(origin))headers["Access-Control-Allow-Origin"]=origin;
 return new Response(JSON.stringify(body),{status,headers});
};
const txt=(v:unknown,max:number)=>typeof v==="string"?v.trim().normalize("NFC").slice(0,max+1):"";
function dateOK(s:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const d=new Date(s+"T12:00:00Z");return Number.isFinite(d.valueOf())&&d.toISOString().startsWith(s);
}
async function authenticatedStaff(bearer:string,tenant:string){
 if(!/^Bearer \S+$/i.test(bearer)||!UUID.test(tenant))return null;
 const db=createClient(url,Deno.env.get("SUPABASE_ANON_KEY")!,{
  global:{headers:{Authorization:bearer}},auth:{persistSession:false,autoRefreshToken:false}
 });
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user)return null;
 const {data:role,error:roleError}=await db.from("organization_memberships")
  .select("role").eq("tenant_id",tenant).eq("user_id",user.id).eq("active",true).maybeSingle();
 return !roleError&&["org_admin","reception"].includes(role?.role)?user:null;
}
Deno.serve(async(req:Request)=>{
 const origin=req.headers.get("origin")||"";
 if(origin&&!origins.has(origin))return reply("",{error:"origin_forbidden"},403);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:reply(origin,{}).headers});
 if(req.method!=="POST")return reply(origin,{error:"method_not_allowed"},405);
 if(Number(req.headers.get("content-length")||0)>7000)return reply(origin,{error:"payload_too_large"},413);
 try{
  const input=await req.json();
  if(!input||typeof input!=="object"||Array.isArray(input))return reply(origin,{error:"invalid_request"},400);
  const action=txt(input.action,30);
  if(action==="issue"){
   const tenant=txt(input.tenant_id,40),registration=txt(input.registration_id,40);
   const reason=txt(input.reason,1200);
   if(!UUID.test(tenant)||!UUID.test(registration)||reason.length<10||reason.length>1200)
    return reply(origin,{error:"invalid_fields"},400);
   const user=await authenticatedStaff(req.headers.get("authorization")||"",tenant);
   if(!user)return reply(origin,{error:"forbidden"},403);
   const {data:row,error:readError}=await service.from("registration_requests")
    .select("id,status,email,first_name,last_name").eq("id",registration).eq("tenant_id",tenant).maybeSingle();
   if(readError||!row||!["pending","correction_requested"].includes(row.status))
    return reply(origin,{error:"not_pending"},409);
   const bytes=crypto.getRandomValues(new Uint8Array(32));
   const secret=btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
   const hash=await digest(secret);
   const expires=new Date(Date.now()+7*24*3600*1000).toISOString();
   const now=new Date().toISOString();
   const {data:saved,error:saveError}=await service.from("registration_requests").update({
    status:"correction_requested",correction_reason:reason,correction_token_hash:hash,
    correction_expires_at:expires,correction_requested_at:now,correction_completed_at:null,
    reviewed_by:user.id,reviewed_at:now
   }).eq("tenant_id",tenant).eq("id",registration)
     .in("status",["pending","correction_requested"]).select("id").maybeSingle();
   if(saveError||!saved)return reply(origin,{error:"not_pending"},409);
   const {error:auditError}=await service.from("audit_logs").insert({
    tenant_id:tenant,actor_id:user.id,action:"REGISTRATION_CORRECTION_REQUESTED",
    entity:"registration_requests",entity_id:registration
   });
   if(auditError)console.error("registration_correction_audit_failed",auditError.code);
   const link="https://www.webu.sk/student-house-portal/correction/#token="+secret;
   const {error:mailError}=await service.from('residence_mail_outbox').insert({
    tenant_id:tenant,dedupe:'registration-correction:'+registration+':'+hash,
    audience:'student',recipient:row.email,
    subject:'Student House: oprava registrácie / registration correction',
    body:'Recepcia vrátila registráciu na opravu. Otvor odkaz do 7 dní. / Reception returned your registration for correction. Open the link within 7 days. / Заявку нужно исправить. Ссылка действует 7 дней. / Заявку потрібно виправити. Посилання діє 7 днів.',link
   });
   if(mailError)console.error('registration_correction_mail_queue_failed',mailError.code);
   return reply(origin,{ok:true,recipient:row.email,
    name:[row.first_name,row.last_name].join(" "),expires_at:expires,email_queued:!mailError,link
   });
  }
  if(action!=="load"&&action!=="submit")return reply(origin,{error:"invalid_action"},400);
  const secret=txt(input.token,128);
  if(!/^[A-Za-z0-9_-]{43}$/.test(secret))return reply(origin,{error:"invalid_or_expired"},404);
  const hash=await digest(secret);
  const {data:entry,error:lookupError}=await service.from("registration_requests")
   .select("id,tenant_id,status,correction_reason,correction_expires_at,first_name,last_name,email,room_number,accommodation_from,accommodation_to")
   .eq("correction_token_hash",hash).eq("status","correction_requested")
   .gt("correction_expires_at",new Date().toISOString()).maybeSingle();
  if(lookupError||!entry)return reply(origin,{error:"invalid_or_expired"},404);
  if(action==="load"){
   const editable=Object.fromEntries(fields.map(k=>[k,entry[k]]));
   return reply(origin,{ok:true,reason:entry.correction_reason,expires_at:entry.correction_expires_at,fields:editable});
  }
  const updated:Record<string,string>={};
  for(const key of fields)updated[key]=txt(input[key],key==="email"?254:key==="room_number"?30:key.startsWith("accommodation_")?10:80);
  updated.email=updated.email.toLowerCase();
  if(!updated.first_name||updated.first_name.length>80||!updated.last_name||updated.last_name.length>80
   ||!EMAIL.test(updated.email)||updated.email.length>254
   ||updated.room_number.length>30
   ||!dateOK(updated.accommodation_from)||!dateOK(updated.accommodation_to)
   ||updated.accommodation_to<=updated.accommodation_from)
    return reply(origin,{error:"invalid_fields"},400);
  // Registration remains pending until an authorised receptionist has verified
  // the contract. The correction token is consumed atomically and cannot be reused.
  const {data:corrected,error:saveError}=await service.from("registration_requests").update({
    ...updated,room_number:updated.room_number||null,status:"pending",correction_token_hash:null,correction_expires_at:null,
    correction_completed_at:new Date().toISOString(),reviewed_by:null,reviewed_at:null
  }).eq("id",entry.id).eq("tenant_id",entry.tenant_id).eq("status","correction_requested")
    .eq("correction_token_hash",hash).gt("correction_expires_at",new Date().toISOString())
    .select("id").maybeSingle();
  if(saveError||!corrected)return reply(origin,{error:"invalid_or_expired"},409);
  // This is a change to the existing request, not a second registration.
  return reply(origin,{ok:true,status:"pending"});
 }catch(error){
  console.error("registration_correction_error",error instanceof Error?error.name:"error");
  return reply(origin,{error:"request_failed"},400);
 }
});
