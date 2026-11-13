// Send only to the email already stored on the existing request. Never expose its
// status, correction reason or token in the public registration response.
export async function queueExistingRegistrationReceipt(client,tenantId,entry,now=Date.now()){
 const bucket=Math.floor(now/(15*60*1000));
 const dedupe='registration-receipt-resend:'+entry.id+':'+bucket;
 const {data:queued,error:queueReadError}=await client.from('residence_mail_outbox').select('id')
  .eq('tenant_id',tenantId).eq('recipient',entry.email).eq('audience','student')
  .gte('created_at',new Date(now-15*60*1000).toISOString())
  .or('dedupe.like.registration-receipt-resend:'+entry.id+':%,dedupe.like.registration-correction:'+entry.id+':%,dedupe.like.registration_requests:'+entry.id+':%').limit(1);
 if(queueReadError)throw Error('receipt_lookup_failed');
 if(queued?.length)return;
 let subject='Student House: registrácia prijatá / registration received';
 let body='Tvoja registrácia je zaevidovaná a čaká na kontrolu recepciou. Po schválení ti príde samostatná pozvánka na dotazník. / Your registration is on file and awaits reception review. After approval, a separate invitation will open the questionnaire. / Заявка зарегистрирована и ожидает проверки. / Заявку зареєстровано, вона очікує перевірки.';
 let link=null;
 if(entry.status==='correction_requested'){
  subject='Student House: oprava registrácie / registration correction';
  body='Tvoja pôvodná registrácia bola vrátená na opravu. Otvor bezpečný odkaz nižšie a oprav údaje. Nevytváraj novú registráciu. / Your original registration needs corrections. Open the secure link below to update it instead of registering again. / Исправьте исходную заявку по защищённой ссылке. / Виправте початкову заявку за захищеним посиланням.';
  if(Date.parse(entry.correction_expires_at)>now&&entry.correction_token_hash){
   const {data:original,error}=await client.from('residence_mail_outbox').select('link')
    .eq('tenant_id',tenantId).eq('dedupe','registration-correction:'+entry.id+':'+entry.correction_token_hash).limit(1);
   if(error)throw Error('correction_mail_lookup_failed');
   link=original?.[0]?.link||null;
  }
  if(!link){
   // Reissue an expired/missing correction link to the verified stored address.
   // Keep the request, reception's reason and approval state intact.
   const bytes=crypto.getRandomValues(new Uint8Array(32));
   const token=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
   const hash=Array.from(new Uint8Array(digest)).map(v=>v.toString(16).padStart(2,'0')).join('');
   let update=client.from('registration_requests').update({correction_token_hash:hash,correction_expires_at:new Date(now+7*24*3600*1000).toISOString(),correction_requested_at:new Date(now).toISOString()})
    .eq('tenant_id',tenantId).eq('id',entry.id).eq('status','correction_requested');
   update=entry.correction_token_hash?update.eq('correction_token_hash',entry.correction_token_hash):update.is('correction_token_hash',null);
   const {data:saved,error}=await update.select('id');
   if(error||!saved?.length)throw Error('correction_reissue_conflict');
   link='https://www.webu.sk/student-house-portal/correction/#token='+token;
   // Preserve the token-to-mail association for subsequent retries.
   const {error:originalError}=await client.from('residence_mail_outbox').insert({tenant_id:tenantId,dedupe:'registration-correction:'+entry.id+':'+hash,audience:'student',recipient:entry.email,subject,body,link});
   if(originalError)throw Error('correction_receipt_queue_failed');
   return;
  }
 }
 const {error}=await client.from('residence_mail_outbox').upsert({tenant_id:tenantId,dedupe,audience:'student',recipient:entry.email,subject,body,link},{onConflict:'dedupe',ignoreDuplicates:true});
 if(error)throw Error('receipt_queue_failed');
}
