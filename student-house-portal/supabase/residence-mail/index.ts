import {createClient} from 'npm:@supabase/supabase-js@2.119.0';
import nodemailer from 'npm:nodemailer@7.0.10';

const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
const base='https://www.webu.sk/student-house-portal/';
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
// This endpoint accepts no recipient or message from callers. Only RLS-protected,
// server-enqueued events may be sent. An atomic lease limits all callers together.
Deno.serve(async req=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const password=Deno.env.get('RESIDENCE_SMTP_PASSWORD')?.replace(/\s+/g,'');
 if(!password)return Response.json({ok:false,error:'smtp_not_configured'},{status:503});
 const {data:jobs,error}=await db.rpc('residence_mail_claim');
 if(error){console.error('mail_claim_failed',error.code);return Response.json({ok:false},{status:503});}
 if(!jobs?.length)return Response.json({ok:true});
 const {data:config,error:configError}=await db.from('residence_mail_config').select('tenant_id,smtp_host,smtp_port,smtp_user,sender_email,sender_name');
 if(configError)return Response.json({ok:false},{status:503});
 for(const job of jobs){
  const c=config?.find(c=>c.tenant_id===job.tenant_id);
  let result='configuration_missing',messageId:string|null=null;
  if(c){
   const transport=nodemailer.createTransport({host:c.smtp_host,port:c.smtp_port,secure:c.smtp_port===465,requireTLS:c.smtp_port!==465,auth:{user:c.smtp_user,pass:password},connectionTimeout:12000,socketTimeout:15000});
   try{
    let link=job.link||base+(job.audience==='admin'?'admin/':'student/');
    if(job.auth_link_type){
     const redirect=base+(job.audience==='admin'?'admin/':job.auth_link_type==='recovery'?'student/?step=profile':'questionnaire/');
     const {data,error}=await db.auth.admin.generateLink({type:job.auth_link_type,email:job.recipient,options:{redirectTo:redirect}});
     if(error||!data?.properties?.action_link)throw new Error('auth_link_failed');
     link=data.properties.action_link;
    }
    const text=job.body+'\n\n'+link;
    const info=await transport.sendMail({from:{name:c.sender_name,address:c.sender_email},to:job.recipient,subject:job.subject,text,html:'<h2>Student House Bratislava</h2><p>'+escape(job.body).replace(/\n/g,'<br>')+'</p><p><a href="'+escape(link)+'">Otvoriť / Open / Открыть / Відкрити</a></p>',messageId:'<residence-'+job.id+'@webu.sk>'});
    if(!info.accepted?.length)throw new Error('smtp_not_accepted');
    result='accepted';messageId=info.messageId;
   }catch(e){
    // Do not log transport errors: they may contain addresses or credentials.
    const failure=e as {code?:string;responseCode?:number;name?:string};
    const safeCodes=['EAUTH','ECONNECTION','ETIMEDOUT','ESOCKET','EMESSAGE','EENVELOPE','ETLS','EDNS'];
    const code=safeCodes.includes(failure.code||'')?failure.code:failure.name==='TypeError'?'TypeError':'unknown';
    const response=Number.isInteger(failure.responseCode)?String(failure.responseCode):'0';
    result=e instanceof Error&&e.message==='auth_link_failed'?'auth_link_failed':'smtp_'+code+'_'+response;
    console.error('residence_mail_transport',code,response);
   }finally{transport.close();}
  }
  const {error:finishError}=await db.rpc('residence_mail_finish',{p_id:job.id,p_lease:job.lease,p_result:result,p_message_id:messageId});
  if(finishError)console.error('mail_result_store_failed',finishError.code);
 }
 // SMTP acceptance is recorded internally; it is never labelled inbox delivery.
 return Response.json({ok:true});
});
