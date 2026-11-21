// Connected UI journey with an isolated in-memory backend and reserved .invalid emails.
// Never contacts production Supabase, sends real messages, or creates real payments.
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],executablePath:process.env.CHROMIUM_PATH||undefined});
const tenant='qa-house',student='qa-student',admin='qa-admin',person='qa-resident',request='qa-registration';
const email='student.journey@example.invalid',staffEmail='reception.journey@example.invalid',password='Synthetic-only-2026!';
const from='2026-11-01',arrival='2026-11-11',to='2027-08-31';
const mail=[],calls=[],tables={organizations:[{id:tenant,name:'QA Student House'}],organization_memberships:[{tenant_id:tenant,user_id:admin,role:'org_admin',active:true}],rooms:[{id:'qa-room',tenant_id:tenant,name:'QA-125',category:'M2',capacity:2}]};
const rows=t=>tables[t]??(tables[t]=[]);
const stamp=()=>new Date().toISOString();
const users={[admin]:{id:admin,email:staffEmail},[student]:{id:student,email}};
const result=data=>({data,error:null});
const addFile=(kind,original_name,extra={})=>{const x={id:'file-'+rows('residence_portal_files').length,tenant_id:tenant,resident_id:person,user_id:student,kind,original_name,created_at:stamp(),active:true,review_status:'pending',...extra};rows('residence_portal_files').push(x);return x;};
const state=async(_,q)=>{
 if(q.op==='login'){const u=q.email===staffEmail?admin:q.email===email&&rows('registration_requests').length?student:null;return u&&q.password===password?result({user:users[u]}):{data:null,error:{code:'invalid_credentials'}};}
 if(q.op==='rpc')return result([]);
 if(q.op==='query'){
  const all=rows(q.table);
  let found=all.filter(x=>(q.filters||[]).every(([op,k,v])=>op==='in'?v.includes(x[k]):op==='is'?(x[k]??null)===v:op==='neq'?x[k]!==v:x[k]===v));
  if(q.action==='upsert'||q.action==='insert'){
   const v=q.value;const match=q.action==='upsert'&&all.find(x=>v.resident_id?x.resident_id===v.resident_id:x.id===v.id);
   const row=match?Object.assign(match,v):{id:'qa-'+q.table+'-'+all.length,...v};if(!match)all.push(row);found=[row];
  }else if(q.action==='update'){found.forEach(x=>Object.assign(x,q.value));}
  if(q.limit!=null)found=found.slice(0,q.limit);
  return result(q.single?structuredClone(found[0]??null):structuredClone(found));
 }
 if(q.op==='invoke'){
  const b=q.body||{};calls.push({name:q.name,body:b});
  if(q.name==='manage'&&b.action==='invite'){
   assert.equal(q.user,admin);assert.equal(b.registration_id,request);
   assert.equal(b.verified_assignment.contract_number,'QA-2026-001');assert.equal(b.verified_assignment.room_number,'QA-125');
   assert.equal(b.verified_assignment.actual_arrival_on,arrival);
   assert.equal(b.verified_assignment.accommodation_to,to);
   assert.equal(b.verified_schedule.length,10);assert.ok(b.verified_schedule.every(x=>x.amount===300));
   rows('registration_requests')[0].status='invited';
   rows('organization_memberships').push({tenant_id:tenant,user_id:student,role:'student',active:true});
   rows('residents').push({id:person,tenant_id:tenant,user_id:student,full_name:'QA Nina Testova',email,active:true,verified_room_number:'QA-125',verified_contract_number:'QA-2026-001',accommodation_from:from,accommodation_to:to,profile_password_activated_at:null});
   rows('resident_staff_details').push({tenant_id:tenant,resident_id:person,actual_arrival_on:arrival});
   rows('tenancies').push({id:'qa-stay',tenant_id:tenant,resident_id:person,room_id:'qa-room',starts_on:from,ends_on:to});
   for(const x of b.verified_schedule)rows('rent_charges').push({id:'charge-'+x.period,tenant_id:tenant,resident_id:person,...x});
   for(const k of ['contract_draft','rules_template','gdpr_template','certificate_draft','deposit_template','schedule_draft'])addFile(k,'QA-'+k+'.pdf');
   mail.push({to:email,subject:'QA registration approved',simulated:true});
   return result({ok:true,login_ready:true});
  }
  if(q.name==='residence-files'){
   if(b.action==='upload'){assert.equal(q.user,student);addFile(b.kind,b.fileName||'QA-file');return result({ok:true});}
   if(b.action==='review'){assert.equal(q.user,admin);const x=rows('residence_portal_files').find(x=>x.id===b.file_id);assert.ok(x);x.review_status=b.status;return result({ok:true});}
   if(b.action==='download')return result({ok:true,url:'https://qa.supabase.co/qa-file'});
  }
  return result({ok:true});
 }
 throw Error('Unknown test operation '+q.op);
};
const sdk=String.raw`window.supabase={createClient:()=>{let u=null;const api=q=>window.qaBackend({...q,user:u?.id});return {
 auth:{signInWithPassword:async x=>{const r=await api({op:'login',...x});u=r.data?.user||null;return r;},getUser:async()=>({data:{user:u}}),onAuthStateChange:()=>{},signOut:async()=>{u=null;return {error:null};}},
 channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel:async()=>{},
 rpc:(name,args)=>api({op:'rpc',name,args}),
 functions:{invoke:(name,{body})=>{if(body instanceof FormData){const file=body.get('file');body={...Object.fromEntries([...body].filter(([k])=>k!=='file')),fileName:file?.name};}return api({op:'invoke',name,body});}},
 from:table=>{const q={op:'query',table,filters:[]};const p=new Proxy({}, {get:(_,k)=>{
 if(k==='then')return (yes,no)=>api(q).then(yes,no);
 if(k==='eq'||k==='neq'||k==='is'||k==='in')return (a,b)=>{q.filters.push([k,a,b]);return p;};
 if(k==='limit')return n=>{q.limit=n;return p;};
 if(k==='maybeSingle'||k==='single')return ()=>{q.single=true;return p;};
 if(k==='upsert'||k==='insert'||k==='update')return v=>{q.action=k;q.value=v;return p;};
 return ()=>p;
 }});return p;}
};}};`;
try{
 const ctx=await browser.newContext({viewport:{width:1440,height:900}});
 await ctx.exposeBinding('qaBackend',state);
 await ctx.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'text/javascript',body:sdk});
  if(url.hostname==='portal.test'){
   const path=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
   try{return route.fulfill({contentType:path.endsWith('.js')?'text/javascript':'text/html',body:await fs.readFile('.'+path)});}catch{return route.fulfill({status:404,body:''});}
  }
  if(url.hostname==='ydqchayscxntqdkzkynv.supabase.co'&&url.pathname.endsWith('/register-student')){
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'POST,OPTIONS'}});
   const v=route.request().postDataJSON();
   assert.equal(v.email,email);assert.equal(v.password,password);assert.equal(v.preferred_duration_months,10);assert.equal(v.accommodation_to,to);assert.equal(v.expected_arrival,arrival);assert.equal(v.room_number,'');assert.equal(v.privacy_acknowledged,true);
   const {password:pw,password_confirmation:pc,...safe}=v;
   rows('registration_requests').push({id:request,tenant_id:tenant,...safe,status:'pending',created_at:stamp()});
   rows('registration_enquiries').push({registration_id:request,tenant_id:tenant,preferred_duration_months:10,preferred_from:arrival,preferred_to:to});
   mail.push({to:email,subject:'QA registration received',simulated:true});
   return route.fulfill({status:201,headers:{'access-control-allow-origin':'*'},contentType:'application/json',body:JSON.stringify({ok:true})});
  }
  if(url.hostname==='qa.supabase.co')return route.fulfill({status:200,body:'QA test only'});
  return route.abort();
 });
 const p=await ctx.newPage(),a=await ctx.newPage();
 for(const [role,page] of [['student',p],['admin',a]])page.on('pageerror',err=>console.error('QA UI error',role,err.message));
 for(const page of [p,a])page.on('dialog',d=>d.accept());
 const go=async(page,path)=>page.goto('https://portal.test/student-house-portal/'+path);
 const sign=async(page,who)=>{await page.locator('#email').fill(who);await page.locator('#password').fill(password);await page.locator('#signbtn').click();};
 const tab=async(page,label)=>page.locator('#tabs button').filter({hasText:label}).click();
 await go(p,'');await p.locator('#chooseRegistration').click();
 for(const [id,val] of Object.entries({regFirst:'QA Nina',regLast:'Testova',regEmail:email,regPhone:'+421900000000',regBirth:'02.01.2001',regNationality:'Slovak',regFrom:from,regPassword:password,regPasswordConfirm:password}))await p.locator('#'+id).fill(val);
 await p.locator('#regRoomType').selectOption('M2');await p.locator('#regDuration').selectOption('10');await p.locator('#regArrival').fill(arrival);
 assert.equal(await p.locator('#regTo').inputValue(),to);await p.locator('#regPrivacy').check();await p.locator('#regSend').click();
 await p.locator('#registrationPending:not(.hide)').waitFor();assert.equal(rows('registration_requests').length,1);console.log('QA STEP 1 registration and simulated receipt');
 await go(p,'student/?signin=1');await sign(p,email);await p.waitForFunction(()=>document.querySelector('#error').textContent.length>0);assert.equal(await p.locator('#app').isVisible(),false);console.log('QA STEP 2 pending student denied');
 await go(a,'');await a.locator('#chooseStaff').click();await sign(a,staffEmail);await a.locator('#app:not(.hide)').waitFor();await tab(a,'Registrácie');
 const form=a.locator('.registration-approval-form');await form.waitFor();
 await form.getByLabel('Číslo zmluvy',{exact:true}).fill('QA-2026-001');await form.locator('select').selectOption('QA-125');
 await form.getByLabel('Mesačný nájom (€)',{exact:true}).fill('300');await form.getByLabel('Skutočný príchod',{exact:true}).fill(arrival);
 await form.getByRole('button',{name:'Schváliť registráciu',exact:true}).click();
 await a.getByText('✓ Registrácia úspešne schválená',{exact:true}).waitFor();assert.equal(rows('rent_charges').length,10);assert.equal(rows('payments').length,0);console.log('QA STEP 3 admin approval, real arrival and full calendar (no payment)');
 await go(p,'student/?signin=1');await sign(p,email);await p.locator('.enquiry-form').waitFor();
 for(const [k,v] of Object.entries({permanent_address:'QA test address',date_of_birth:'2001-01-02',nationality:'Slovak',identity_document_number:'QA-PASSPORT',telephone:'+421900000000',parent_contact_email:'parent@example.invalid',school:'QA University',iban:'QA-TEST-ONLY'}))await p.locator('#enquiry-'+k).fill(v);
 await p.locator('.enquiry-grid select').nth(0).selectOption('female');await p.locator('.enquiry-grid select').nth(1).selectOption('no');
 await p.locator('.enquiry-form input[type=file]').setInputFiles({name:'QA-photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVZkAAAAASUVORK5CYII=','base64')});
 await p.getByRole('button',{name:'Uložiť dotazník a fotografiu'}).click();await p.locator('.enquiry-form .staff-approval-success').waitFor();assert.equal(rows('resident_enquiries')[0].own_refrigerator,false);console.log('QA STEP 4 questionnaire submitted and photo captured');
 await tab(a,'Študenti');await a.getByRole('button',{name:'Otvoriť profil',exact:true}).click();
 await a.getByRole('button',{name:'Schváliť správne vyplnený dotazník'}).click();await a.getByText('✓ Dotazník schválený',{exact:true}).waitFor();assert.equal(rows('resident_enquiry_reviews')[0].review_status,'approved');console.log('QA STEP 5 reception questionnaire approval');
 await p.getByRole('button',{name:'Otvoriť môj profil'}).click();await p.locator('#tabs button').filter({hasText:'Dokumenty'}).waitFor();await tab(p,'Dokumenty');
 await p.locator('.document-flow-card').first().waitFor();assert.equal(await p.locator('.document-flow-card').count(),6);
 const pdf={name:'QA-not-a-legal-document.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n% synthetic test payload - not an official document\n%%EOF')};
 for(let i=0;i<6;i++){
  const card=p.locator('.document-flow-card').nth(i);await card.locator('input[type=file]').setInputFiles(pdf);await card.getByRole('button',{name:'Nahrať súbor',exact:true}).click();await card.locator('.document-flow-submitted').waitFor();
 }
 assert.equal(rows('residence_portal_files').filter(x=>x.kind.startsWith('signed_')).length,6);
 await tab(a,'Dokumenty');for(let i=0;i<6;i++){await a.getByRole('button',{name:'Schváliť',exact:true}).first().click();await a.waitForFunction(n=>[...document.querySelectorAll('button')].filter(b=>b.textContent==='Schváliť').length===n,5-i);}
 assert.equal(rows('residence_portal_files').filter(x=>x.kind.startsWith('signed_')&&x.review_status==='approved').length,6);
 await tab(p,'Platby');await tab(p,'Dokumenty');assert.equal(await p.locator('.document-flow-card .status-approved').count(),6);
 assert.equal(rows('payments').length,0);assert.equal(mail.length,2);
 console.log('QA STEP 6 five signed document uploads plus schedule, staff review and student visibility; simulated mail only');
 console.log('QA JOURNEY PASS: single linked synthetic student, separate reception, full calendar, questionnaire/photo and documents; no production writes.');
 await ctx.close();
}finally{await browser.close();}
