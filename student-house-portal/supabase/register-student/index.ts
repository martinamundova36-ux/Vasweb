import {queueExistingRegistrationReceipt} from './receipt.js';
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
 if(Number(request.headers.get("content-length")||"0")>8192) return safeResponse({error:"payload_too_large"},413,origin);
 try {
  if(!(request.headers.get("content-type")||"").toLowerCase().includes("application/json"))
    return safeResponse({error:"json_required"},415,origin);
  const body=await request.json();
  if(!body || typeof body!=="object")return safeResponse({error:"invalid_request"},400,origin);
  if(body.website) return safeResponse({ok:true},200,origin);
  const first_name=asText(body.first_name,80);
  const last_name=asText(body.last_name,80);
  const email=asText(body.email,254).toLowerCase();
  const room_number=asText(body.room_number,30);
  // Contract numbers and verified room assignments are written by reception only.
  // Ignore any attempted contract_number in public submissions.
  const accommodation_from=asText(body.accommodation_from,10);
  const accommodation_to=asText(body.accommodation_to,10);
  const permanent_address=asText(body.permanent_address,500);
  const nationality=asText(body.nationality,80);
  const telephone=asText(body.telephone,60);
  const gender=asText(body.gender,16);
  const date_of_birth=asText(body.date_of_birth,10);
  const school=asText(body.school,250);
  const parent_contact_email=asText(body.parent_contact_email,254);
  const preferred_room_type=asText(body.preferred_room_type,120);
  const arrival=asText(body.expected_arrival,10);
  const genderValid=['','male','female','other'].includes(gender);
  const parentValid=!parent_contact_email||/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(parent_contact_email);
  if(![true,"true"].includes(body.privacy_acknowledged) || first_name.length<1 || last_name.length<1 ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !genderValid || !parentValid ||
    (date_of_birth&&(!isDate(date_of_birth)||date_of_birth>new Date().toISOString().slice(0,10))) ||
    (arrival&&(!isDate(arrival)||arrival>accommodation_to)) ||
    !isDate(accommodation_from)||!isDate(accommodation_to)||accommodation_to<=accommodation_from) {
     return safeResponse({error:"invalid_fields"},400,origin);
  }
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("cf-connecting-ip") || "unidentified";
  const secretKey=await crypto.subtle.importKey("raw",encoder.encode(SECRET),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signature=await crypto.subtle.sign("HMAC",secretKey,encoder.encode(forwarded));
  const p_hash=Array.from(new Uint8Array(signature)).map(v=>v.toString(16).padStart(2,"0")).join("");
  const {data:allowed,error:rateError}=await client.rpc("registration_rate_allowed",{p_hash});
  if(rateError){console.error("registration_rate_failure",rateError.code);return safeResponse({error:"temporarily_unavailable"},503,origin)}
  if(!allowed)return safeResponse({error:"too_many_requests"},429,origin);
  const since = new Date(Date.now()-14*24*60*60*1000).toISOString();
  const {data:recent,error:recentError}=await client.from("registration_requests")
    .select("id,email,status,correction_token_hash,correction_expires_at").eq("tenant_id",tenantId).eq("email",email)
    .in("status",["pending","correction_requested"]).gte("created_at",since).order("created_at",{ascending:false}).limit(1);
  if(recentError){console.error("registration_duplicate_check",recentError.code);return safeResponse({error:"temporarily_unavailable"},503,origin)}
  if(recent?.length){
   try{await queueExistingRegistrationReceipt(client,tenantId,recent[0]);}
   catch{console.error("registration_receipt_queue_failed");return safeResponse({error:"temporarily_unavailable"},503,origin);}
   return safeResponse({ok:true},200,origin);
  }
  const {data:created,error:registrationError}=await client.from("registration_requests")
    .insert({tenant_id:tenantId,first_name,last_name,email,room_number:room_number||null,
      contract_number:null,accommodation_from,accommodation_to,status:"pending"})
    .select("id").single();
  if(registrationError||!created?.id){console.error("registration_insert_failed",registrationError?.code);return safeResponse({error:"temporarily_unavailable"},503,origin)}
  // These answers are private to reception until approval, then copied into
  // the authenticated student's editable questionnaire in one approval transaction.
  const {error:questionnaireError}=await client.from("registration_enquiries").insert({
    registration_id:created.id,tenant_id:tenantId,
    permanent_address,date_of_birth:date_of_birth||null,nationality,gender,
    identity_document_number:"",telephone,parent_contact_email,
    school,iban:"",preferred_room_type,preferred_duration_months:null,
    preferred_from:arrival||accommodation_from,preferred_to:accommodation_to
  });
  if(questionnaireError){
    console.error("registration_enquiry_insert_failed",questionnaireError.code);
    // Roll back the public request if its private questionnaire could not be stored.
    const {error:rollbackError}=await client.from("registration_requests").delete().eq("id",created.id).eq("tenant_id",tenantId);
    if(rollbackError)console.error("registration_rollback_failed",rollbackError.code);
    return safeResponse({error:"temporarily_unavailable"},503,origin);
  }
  return safeResponse({ok:true},201,origin);
 }catch(e){console.error("registration_invalid_request",e instanceof Error?e.name:"error");return safeResponse({error:"invalid_request"},400,origin)}
});