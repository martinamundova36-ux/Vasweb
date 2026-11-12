import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2.119.0";
const url=Deno.env.get("SUPABASE_URL")!;
const publicKey=Deno.env.get("SUPABASE_ANON_KEY")!;
const service=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false}});
const allowed=new Set(["https://www.webu.sk","https://webu.sk"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const date=(v:unknown)=>{if(typeof v!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const n=Date.parse(v+"T12:00:00Z");return Number.isFinite(n)&&new Date(n).toISOString().startsWith(v)};
const amount=(v:unknown):number|null=>{const s=String(v??"");if(!/^\d{1,6}(\.\d{1,2})?$/.test(s))return null;const n=Number(s);return n>0&&n<=100000?n:null};
Deno.serve(async req=>{
 const origin=req.headers.get("origin")||"";
 const cors={"Access-Control-Allow-Origin":origin||"https://www.webu.sk","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST,OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Vary":"Origin"};
 const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:cors});
 if(origin&&!allowed.has(origin))return new Response("Forbidden",{status:403});
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return reply({error:"method_not_allowed"},405);
 if(Number(req.headers.get("content-length")||"0")>12000)return reply({error:"payload_too_large"},413);
 try{
  const bearer=req.headers.get("authorization")||"";
  if(!/^Bearer \S+$/i.test(bearer))return reply({error:"unauthorized"},401);
  const client=createClient(url,publicKey,{global:{headers:{Authorization:bearer}},auth:{persistSession:false}});
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return reply({error:"unauthorized"},401);
  const b=await req.json();
  if(!b||typeof b!=="object"||!uuid.test(String(b.tenant_id||"")))return reply({error:"invalid_request"},400);
  const tenant=b.tenant_id;
  const {data:membership,error:membershipError}=await client.from("organization_memberships").select("role").eq("tenant_id",tenant).eq("user_id",user.id).eq("active",true).maybeSingle();
  if(membershipError||!["org_admin","reception"].includes(membership?.role||""))return reply({error:"forbidden"},403);
  let rpc:string,payload:Record<string,unknown>;
  if(b.action==="charge"){
   if(!uuid.test(String(b.resident_id||""))||!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(b.period||""))||!date(b.due_on)||amount(b.amount)===null)return reply({error:"invalid_charge"},400);
   rpc="residence_record_charge";
   payload={p_actor:user.id,p_tenant:tenant,p_resident:b.resident_id,p_period:b.period,p_amount:amount(b.amount),p_due_on:b.due_on};
  }else if(b.action==="payment"){
   if(!uuid.test(String(b.resident_id||""))||!date(b.received_on)||amount(b.amount)===null||!["bank","cash","other"].includes(b.method)||typeof b.reference!=="string"||b.reference.trim().length<2||b.reference.length>100)return reply({error:"invalid_payment"},400);
   rpc="residence_record_payment";
   payload={p_actor:user.id,p_tenant:tenant,p_resident:b.resident_id,p_amount:amount(b.amount),p_received_on:b.received_on,p_method:b.method,p_reference:b.reference.trim()};
  }else if(b.action==="plan"){
   if(!uuid.test(String(b.charge_id||""))||typeof b.title!=="string"||b.title.trim().length<2||b.title.length>150||!Array.isArray(b.items)||b.items.length<2||b.items.length>24)return reply({error:"invalid_plan"},400);
   let total=0;
   const items:Record<string,unknown>[]=[];
   for(const x of b.items){const n=amount(x?.amount);if(!n||!date(x?.due_on))return reply({error:"invalid_installment"},400);total+=Math.round(n*100);items.push({amount:n.toFixed(2),due_on:x.due_on})}
   if(total>10000000)return reply({error:"invalid_plan"},400);
   rpc="residence_create_installment_plan";
   payload={p_actor:user.id,p_tenant:tenant,p_charge:b.charge_id,p_title:b.title.trim(),p_items:items};
  }else return reply({error:"invalid_action"},400);
  const {data,error}=await service.rpc(rpc,payload);
  if(error){console.error("residence_finance_failure",rpc,error.code);return reply({error:error.code==="23505"?"duplicate_record":"save_failed"},error.code==="23505"?409:400)}
  return reply({ok:true,id:data},201);
 }catch(e){console.error("residence_finance_request_failed",e instanceof Error?e.name:"unknown");return reply({error:"invalid_request"},400)}
});