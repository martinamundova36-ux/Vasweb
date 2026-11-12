import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

// Existing WEBU Residence project. Privileged keys remain server-side only.
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const publicKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const BUCKET = "residence-portal-files";
const LEGACY = new Set(["https://www.webu.sk", "https://webu.sk"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const templates = new Set(["rules_template", "gdpr_template"]);
const uploads = new Set(["profile_photo", "signed_rules", "signed_gdpr", "resident_document", ...templates]);
const imageTypes = new Set(["image/jpeg", "image/png"]);
const allTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);

async function allowedOrigin(origin: string): Promise<boolean> {
  if (LEGACY.has(origin)) return true;
  let url: URL;
  try { url = new URL(origin); } catch { return false; }
  if (url.protocol !== "https:" || url.origin !== origin || url.port) return false;
  const { data, error } = await admin.from("organization_domains")
    .select("tenant_id").eq("hostname", url.hostname.toLowerCase())
    .not("verified_at", "is", null).maybeSingle();
  if (error || !data) return false;
  const { data: organization } = await admin.from("organizations")
    .select("active").eq("id", data.tenant_id).maybeSingle();
  return organization?.active === true;
}
function response(origin: string, body: unknown, status = 200) {
  const headers: Record<string,string> = {
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    "Vary":"Origin",
    "Access-Control-Allow-Headers":"authorization, apikey, x-client-info, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS"
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(body), { status, headers });
}
function textField(v: FormDataEntryValue | null, max: number): string {
  return typeof v === "string" ? v.trim().normalize("NFC").slice(0,max) : "";
}
function fail(origin:string,status:number,error:string){ return response(origin,{error},status); }
function detectMime(bytes: Uint8Array): string | null {
  if (bytes.length>=5 && String.fromCharCode(...bytes.slice(0,5))==="%PDF-") return "application/pdf";
  if (bytes.length>=3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return "image/jpeg";
  if (bytes.length>=8 && bytes[0]===0x89 && bytes[1]===0x50 && bytes[2]===0x4e && bytes[3]===0x47 && bytes[4]===0x0d && bytes[5]===0x0a && bytes[6]===0x1a && bytes[7]===0x0a) return "image/png";
  return null;
}
function cleanName(name:string):string { return name.replace(/[^a-zA-Z0-9._ -]/g,"_").slice(0,150)||"document"; }

Deno.serve(async req => {
  const origin=req.headers.get("origin")||"";
  try{
    if(origin && !(await allowedOrigin(origin)))return fail("",403,"origin_forbidden");
    if(req.method==="OPTIONS"){
      const res=response(origin,{ok:true},200);
      return new Response(null,{status:204,headers:res.headers});
    }
    if(req.method!=="POST")return fail(origin,405,"method_not_allowed");
    if(Number(req.headers.get("content-length")||0)>7500000)return fail(origin,413,"payload_too_large");
    const bearer=req.headers.get("authorization")||"";
    if(!/^Bearer \S+$/i.test(bearer))return fail(origin,401,"unauthorized");
    const client=createClient(supabaseUrl,publicKey,{
      global:{headers:{Authorization:bearer}},
      auth:{persistSession:false,autoRefreshToken:false}
    });
    const {data:{user},error:userError}=await client.auth.getUser();
    if(userError||!user)return fail(origin,401,"unauthorized");
    const isMultipart=(req.headers.get("content-type")||"").toLowerCase().includes("multipart/form-data");
    const body:any=isMultipart?await req.formData():await req.json();
    const get=(name:string)=>isMultipart?textField(body.get(name),1100):typeof body[name]==="string"?String(body[name]).trim():"";
    const tenant=get("tenant_id");
    if(!UUID.test(tenant))return fail(origin,400,"invalid_tenant");
    const {data:membership,error:membershipError}=await client.from("organization_memberships")
      .select("role").eq("tenant_id",tenant).eq("user_id",user.id).eq("active",true).maybeSingle();
    if(membershipError||!membership)return fail(origin,403,"forbidden");
    const staff=membership.role==="reception"||membership.role==="org_admin";
    const action=get("action");
    if(action==="upload"){
      if(!isMultipart)return fail(origin,400,"multipart_required");
      const kind=get("kind");
      if(!uploads.has(kind))return fail(origin,400,"invalid_kind");
      if((templates.has(kind)||kind==="resident_document")&&!staff)return fail(origin,403,"staff_only");
      const file=body.get("file");
      if(!(file instanceof File)||file.size===0)return fail(origin,400,"file_required");
      const max=kind==="profile_photo"?3000000:6000000;
      if(file.size>max)return fail(origin,413,"file_too_large");
      if(!allTypes.has(file.type))return fail(origin,400,"file_type_not_supported");
      if(templates.has(kind)&&file.type!=="application/pdf")return fail(origin,400,"pdf_required");
      if(kind==="profile_photo"&&!imageTypes.has(file.type))return fail(origin,400,"image_required");
      // File signatures must match the MIME declared by the browser.
      const bytes=new Uint8Array(await file.arrayBuffer());
      const actual=detectMime(bytes);
      if(!actual||actual!==file.type)return fail(origin,400,"file_signature_invalid");
      const recipientId=kind==="resident_document"?get("resident_id"):"";
      if(kind==="resident_document"&&!UUID.test(recipientId))return fail(origin,400,"resident_required");
      const {data:resident,error:residentError}=templates.has(kind)?{data:null,error:null}:await client.from("residents")
        .select("id,user_id").eq("tenant_id",tenant).eq("user_id",kind==="resident_document"?"00000000-0000-0000-0000-000000000000":user.id)
        .eq("active",true).maybeSingle();
      let person=resident;
      if(kind==="resident_document"){
        const result=await client.from("residents").select("id,user_id").eq("tenant_id",tenant).eq("id",recipientId).eq("active",true).maybeSingle();
        if(result.error||!result.data)return fail(origin,403,"verified_resident_required");
        person=result.data;
      }else if(residentError)return fail(origin,503,"resident_lookup_failed");
      if(!templates.has(kind)&&!person)return fail(origin,403,"verified_resident_required");
      const ownerId=kind==="resident_document"?person!.user_id:user.id;
      const extension=actual==="application/pdf"?"pdf":actual==="image/png"?"png":"jpg";
      const objectId=crypto.randomUUID();
      const objectPath=templates.has(kind)
        ? "templates/"+tenant+"/"+kind+"/"+objectId+"."+extension
        : kind==="resident_document"
          ? "private/"+tenant+"/"+ownerId+"/"+objectId+"."+extension
          : kind==="profile_photo"
            ? "photos/"+tenant+"/"+user.id+"/"+objectId+"."+extension
            : "signed/"+tenant+"/"+user.id+"/"+kind+"/"+objectId+"."+extension;
      const {error:storedError}=await admin.storage.from(BUCKET).upload(objectPath,bytes,{
        contentType:actual,cacheControl:"60",upsert:false
      });
      if(storedError){console.error("residence_file_storage_failure",storedError.name);return fail(origin,503,"storage_failed");}
      const isSingle=templates.has(kind)||kind==="profile_photo";
      const previousIds:string[]=[];
      if(isSingle){
        let query=admin.from("residence_portal_files").select("id").eq("tenant_id",tenant).eq("kind",kind).eq("active",true);
        if(kind==="profile_photo")query=query.eq("user_id",user.id);
        const {data:old,error:oldReadError}=await query;
        if(oldReadError){await admin.storage.from(BUCKET).remove([objectPath]);return fail(origin,503,"save_failed");}
        previousIds.push(...(old||[]).map(x=>x.id));
        if(previousIds.length){
          const {error:deactivateError}=await admin.from("residence_portal_files").update({active:false})
            .in("id",previousIds).eq("tenant_id",tenant);
          if(deactivateError){await admin.storage.from(BUCKET).remove([objectPath]);return fail(origin,503,"save_failed");}
        }
      }
      const {data:record,error:savedError}=await admin.from("residence_portal_files").insert({
        tenant_id:tenant,
        user_id:templates.has(kind)?null:ownerId,
        resident_id:person?.id||null,
        kind,object_path:objectPath,original_name:cleanName(file.name||"document."+extension),
        content_type:actual,size_bytes:file.size,uploaded_by:user.id,
        review_status:kind.startsWith("signed_")?"pending":"not_applicable",active:true
      }).select("id,kind,review_status").single();
      if(savedError){
        console.error("residence_file_record_failure",savedError.code);
        await admin.storage.from(BUCKET).remove([objectPath]);
        if(previousIds.length)await admin.from("residence_portal_files").update({active:true}).in("id",previousIds).eq("tenant_id",tenant);
        return fail(origin,503,"save_failed");
      }
      const {error:auditError}=await admin.from("audit_logs").insert({tenant_id:tenant,actor_id:user.id,action:"PORTAL_FILE_UPLOADED",entity:"residence_portal_files",entity_id:record.id});
      if(auditError)console.error("residence_file_audit_failed",auditError.code);
      return response(origin,{ok:true,file:record},201);
    }
    if(action==="download"){
      const fileId=get("file_id");
      if(!UUID.test(fileId))return fail(origin,400,"invalid_file");
      const {data:record,error}=await client.from("residence_portal_files")
        .select("id,tenant_id,kind,object_path,original_name,active").eq("tenant_id",tenant).eq("id",fileId).maybeSingle();
      if(error||!record)return fail(origin,403,"forbidden");
      const {data:link,error:signedError}=await admin.storage.from(BUCKET).createSignedUrl(
        record.object_path,90,record.kind==="profile_photo"?undefined:{download:record.original_name}
      );
      if(signedError||!link?.signedUrl)return fail(origin,503,"download_unavailable");
      const {error:auditError}=await admin.from("audit_logs").insert({tenant_id:tenant,actor_id:user.id,action:"PORTAL_FILE_SIGNED_DOWNLOAD",entity:"residence_portal_files",entity_id:fileId});
      if(auditError)return fail(origin,503,"audit_unavailable");
      return response(origin,{ok:true,url:link.signedUrl});
    }
    if(action==="review"){
      if(!staff)return fail(origin,403,"staff_only");
      const fileId=get("file_id"), status=get("status"),note=get("staff_note");
      if(!UUID.test(fileId)||!["approved","rejected"].includes(status)||note.length>1000)return fail(origin,400,"invalid_review");
      const {data:record,error:readError}=await client.from("residence_portal_files")
        .select("id,kind").eq("tenant_id",tenant).eq("id",fileId).maybeSingle();
      if(readError||!record||!["signed_rules","signed_gdpr"].includes(record.kind))return fail(origin,403,"forbidden");
      const {error:updatedError}=await admin.from("residence_portal_files")
        .update({review_status:status,staff_note:note,reviewed_by:user.id,reviewed_at:new Date().toISOString()})
        .eq("tenant_id",tenant).eq("id",fileId);
      if(updatedError)return fail(origin,503,"review_failed");
      const {error:auditError}=await admin.from("audit_logs").insert({tenant_id:tenant,actor_id:user.id,action:"PORTAL_FILE_REVIEWED_"+status.toUpperCase(),entity:"residence_portal_files",entity_id:fileId});
      if(auditError)console.error("residence_file_review_audit_failed",auditError.code);
      return response(origin,{ok:true});
    }
    return fail(origin,400,"invalid_action");
  }catch(error){
    console.error("residence_files_request_failed",error instanceof Error?error.name:"unknown");
    return fail(origin,400,"request_failed");
  }
});