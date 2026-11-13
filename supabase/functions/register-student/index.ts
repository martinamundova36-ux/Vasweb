import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const client = createClient(SUPABASE_URL,SECRET,{auth:{persistSession:false}});
// Compatibility for the existing Student House registration until its domain goes live.
const LEGACY_TENANT = "ae045243-98f0-4f22-a736-d33a92f9ba61";
const LEGACY_ORIGINS = new Set(["https://www.webu.sk","https://webu.sk"]);
// A registration can target another residence only through a previously verified HTTPS domain.
async function resolveTenant(origin:string):Promise<string|null> {
 if(!origin || LEGACY_ORIGINS.has(origin))return LEGACY_TENANT;
 let url:URL;
 try{url=new URL(origin);}catch{return null;}
 if(url.protocol!=="https:" || url.port || url.username || url.password || url.origin!==origin)return null;
 const {data:domain,error}=await client.from("organization_domains")
  .select("tenant_id").eq("hostname",url.hostname.toLowerCase()).not("verified_at","is",null).maybeSingle();
 if(error){console.error("registration_domain_lookup_failure",error.code);throw new Error("domain_lookup_failed");}
 if(!domain)return null;
 const {data:org,error:orgError}=await client.from("organizations")
  .select("id").eq("id",domain.tenant_id).eq("active",true).maybeSingle();
 if(orgError){console.error("registration_org_lookup_failure",orgError.code);throw new Error("org_lookup_failed");}
 return org?.id||null;
}
const encoder = new TextEncoder();

function asText(x:unknown,max:number):string {
 return typeof x==="string" ? x.trim().normalize("NFC").slice(0,max) : "";
}
function isDate(s:string):boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const n=Date.parse(s+"T12:00:00Z");
 return Number.isFinite(n) && new Date(n).toISOString().startsWith(s);
}
function cors(origin:string):Record<string,string> {
 return {"Access-Control-Allow-Origin":origin||"https://www.webu.sk","Vary":"Origin","Access-Control-Allow-Headers":"content-type, apikey, authorization, x-client-info, x-retry-count, traceparent, tracestate, baggage","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
}
function safeResponse(body:unknown,status:number,origin:string) {
 return new Response(JSON.stringify(body),{status,headers:cors(origin)});
}

Deno.serve(async(request:Request)=>{
 const origin=request.headers.get("origin")||"";
 let tenantId:string|null=null;
 try{tenantId=await resolveTenant(origin);}catch{
  return new Response(JSON.stringify({error:"temporarily_unavailable"}),{status:503,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
 }
 if(!tenantId)return new Response(JSON.stringify({error:"origin_forbidden"}),{status:403,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
 if(request.method!=="POST") return safeResponse({error:"method_not_allowed"},405,origin);
 const multipart=(request.headers.get("content-type")||"").toLowerCase().includes("multipart/form-data");
 if(Number(request.headers.get("content-length")||"0")>(multipart?3300000:8192)) return safeResponse({error:"payload_too_large"},413,origin);
 try {
  const data=multipart?await request.formData():null;
  const body:any=data?Object.fromEntries([...data.entries()].filter(([,v])=>typeof v==="string")):await request.json();
  if(!body || typeof body!=="object")return safeResponse({error:"invalid_request"},400,origin);
  // The photo can only be viewed with an actual reception/admin session.
  if(body.action==="registration_photo"){
    const rid=asText(body.registration_id,80);
    if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(rid))return safeResponse({error:"invalid_request"},400,origin);
    const authorization=request.headers.get("authorization")||"";
    if(!/^Bearer \S+$/i.test(authorization))return safeResponse({error:"unauthorized"},401,origin);
    const session=createClient(SUPABASE_URL,Deno.env.get("SUPABASE_ANON_KEY")!,{
      global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}
    });
    const {data:{user},error:authError}=await session.auth.getUser();
    if(authError||!user)return safeResponse({error:"unauthorized"},401,origin);
    const {data:membership,error:membershipError}=await session.from("organization_memberships")
      .select("role").eq("tenant_id",tenantId).eq("user_id",user.id).eq("active",true).maybeSingle();
    if(membershipError||!membership||!["reception","org_admin"].includes(membership.role))
      return safeResponse({error:"forbidden"},403,origin);
    const {data:question,error:questionError}=await client.from("registration_enquiries")
      .select("photo_object_path").eq("registration_id",rid).eq("tenant_id",tenantId).maybeSingle();
    if(questionError||!question?.photo_object_path)return safeResponse({error:"not_found"},404,origin);
    const {data:link,error:linkError}=await client.storage.from("residence-portal-files")
      .createSignedUrl(question.photo_object_path,90);
    if(linkError||!link?.signedUrl)return safeResponse({error:"unavailable"},503,origin);
    await client.from("audit_logs").insert({
      tenant_id:tenantId,actor_id:user.id,action:"REGISTRATION_PHOTO_VIEWED",
      entity:"registration_enquiries",entity_id:rid
    });
    return safeResponse({ok:true,url:link.signedUrl},200,origin);
  }
  if(body.website) return safeResponse({ok:true},200,origin);
  const first_name=asText(body.first_name,80);
  const last_name=asText(body.last_name,80);
  const email=asText(body.email,254).toLowerCase();
  const room_number=asText(body.room_number,30);
  const contract_number=asText(body.contract_number,60);
  const accommodation_from=asText(body.accommodation_from,10);
  const accommodation_to=asText(body.accommodation_to,10);
  if(![true,'true'].includes(body.privacy_acknowledged) || first_name.length<1 || last_name.length<1 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || room_number.length<1 || contract_number.length<5 ||
    !isDate(accommodation_from)||!isDate(accommodation_to)||accommodation_to<=accommodation_from) {
     return safeResponse({error:"invalid_fields"},400,origin);
  }
  const photo=data?.get("student_photo");
  const image=photo instanceof File?photo:null;
  if(photo && !image)return safeResponse({error:"invalid_photo"},400,origin);
  if(image && (image.size<1||image.size>3000000||!["image/jpeg","image/png"].includes(image.type)))
    return safeResponse({error:"invalid_photo"},400,origin);
  let photoBytes:Uint8Array|null=null;
  if(image){
    photoBytes=new Uint8Array(await image.arrayBuffer());
    const jpeg=photoBytes.length>2&&photoBytes[0]===255&&photoBytes[1]===216&&photoBytes[2]===255;
    const png=photoBytes.length>7&&[137,80,78,71,13,10,26,10].every((v,i)=>photoBytes![i]===v);
    if(!((jpeg&&image.type==="image/jpeg")||(png&&image.type==="image/png")))
      return safeResponse({error:"invalid_photo"},400,origin);
  }
  const optional={
    permanent_address:asText(body.permanent_address,500),
    date_of_birth:asText(body.date_of_birth,10)||null,
    nationality:asText(body.nationality,80),
    gender:asText(body.gender,50),
    identity_document_number:asText(body.identity_document_number,100),
    telephone:asText(body.telephone,60),
    parent_contact_email:asText(body.parent_contact_email,254),
    school:asText(body.school,250),
    iban:asText(body.iban,80),
    preferred_room_type:asText(body.preferred_room_type,80),
    preferred_duration_months:body.preferred_duration_months?Number(body.preferred_duration_months):null,
    preferred_from:asText(body.preferred_from,10)||null,
    preferred_to:asText(body.preferred_to,10)||null
  };
  if((optional.date_of_birth&&!isDate(optional.date_of_birth))||
     (optional.preferred_from&&!isDate(optional.preferred_from))||
     (optional.preferred_to&&!isDate(optional.preferred_to))||
     (optional.preferred_from&&optional.preferred_to&&optional.preferred_to<optional.preferred_from)||
     (optional.preferred_duration_months!==null&&![5,10,12].includes(optional.preferred_duration_months))||
     (optional.parent_contact_email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(optional.parent_contact_email))||
     (optional.gender&&!["male","female","other"].includes(optional.gender)))
    return safeResponse({error:"invalid_questionnaire"},400,origin);
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("cf-connecting-ip") || "unidentified";
  const secretKey=await crypto.subtle.importKey("raw",encoder.encode(SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=await crypto.subtle.sign("HMAC",secretKey,encoder.encode(forwarded));
  const p_hash=Array.from(new Uint8Array(signature)).map(v=>v.toString(16).padStart(2,"0")).join("");
  const {data:allowed,error:rateError}=await client.rpc("registration_rate_allowed",{p_hash});
  if(rateError){console.error("registration_rate_failure",rateError.code);return safeResponse({error:"temporarily_unavailable"},503,origin)}
  if(!allowed)return safeResponse({error:"too_many_requests"},429,origin);
  const since = new Date(Date.now()-20*60*1000).toISOString();
  const {data:recent,error:recentError}=await client.from("registration_requests").select("id").eq("tenant_id",tenantId).eq("email",email).eq("contract_number",contract_number).gte("created_at",since).limit(1);
  if(recentError){console.error("registration_duplicate_check",recentError.code);return safeResponse({error:"temporarily_unavailable"},503,origin)}
  if(recent?.length)return safeResponse({ok:true},200,origin);
  const {data:created,error}=await client.from("registration_requests")
    .insert({tenant_id:tenantId,first_name,last_name,email,room_number,contract_number,accommodation_from,accommodation_to,status:"pending"})
    .select("id").single();
  if(error||!created){console.error("registration_insert_failed",error?.code);return safeResponse({error:"temporarily_unavailable"},503,origin);}
  let photoPath:string|null=null;
  if(image&&photoBytes){
    photoPath="private/registration-enquiries/"+tenantId+"/"+created.id+"/"+crypto.randomUUID()+(image.type==="image/png"?".png":".jpg");
    const {error:storedError}=await client.storage.from("residence-portal-files").upload(photoPath,photoBytes,{
      contentType:image.type,cacheControl:"60",upsert:false
    });
    if(storedError){
      console.error("enquiry_photo_upload_failed",storedError.name);
      await client.from("registration_requests").delete().eq("id",created.id).eq("tenant_id",tenantId);
      return safeResponse({error:"photo_upload_failed"},503,origin);
    }
  }
  const {error:questionnaireError}=await client.from("registration_enquiries").insert({
    ...optional,tenant_id:tenantId,registration_id:created.id,
    photo_object_path:photoPath,photo_content_type:photoPath?image?.type:null,
    photo_size_bytes:photoPath?image?.size:null
  });
  if(questionnaireError){
    console.error("enquiry_save_failed",questionnaireError.code);
    if(photoPath)await client.storage.from("residence-portal-files").remove([photoPath]);
    await client.from("registration_requests").delete().eq("id",created.id).eq("tenant_id",tenantId);
    return safeResponse({error:"temporarily_unavailable"},503,origin);
  }
  return safeResponse({ok:true,questionnaire_saved:true,photo_saved:!!photoPath},201,origin);
 }catch(e){console.error("registration_invalid_request",e instanceof Error?e.name:"error");return safeResponse({error:"invalid_request"},400,origin)}
});