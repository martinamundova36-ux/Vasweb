// Actual pinned Supabase browser SDK; Auth/Data HTTP transports are isolated synthetic fixtures.
import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const sdk=process.env.SUPABASE_SDK_PATH?await fs.readFile(process.env.SUPABASE_SDK_PATH,'utf8'):await(await fetch('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0')).text();
const adminKey='sb-ydqchayscxntqdkzkynv-auth-token',studentKey='sb-ydqchayscxntqdkzkynv-student-auth-token';
function session(mode){const id=mode==='admin'?'10000000-0000-0000-0000-000000000001':'10000000-0000-0000-0000-000000000002';const exp=Math.floor(Date.now()/1000)+3600;const user={id,aud:'authenticated',role:'authenticated',email:mode+'@example.invalid',app_metadata:{},user_metadata:{}};return {access_token:Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp})).toString('base64url')+'.synthetic',refresh_token:'synthetic-'+mode,token_type:'bearer',expires_in:3600,expires_at:exp,user};}
const admin=session('admin'),student=session('student');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
try{
for(const width of [390,1440]){
 const context=await browser.newContext({viewport:{width,height:844}});
 await context.addInitScript(({adminKey,studentKey,admin,student})=>{if(!localStorage.getItem('synthetic-seeded')){localStorage.setItem(adminKey,JSON.stringify(admin));localStorage.setItem(studentKey,JSON.stringify(student));localStorage.setItem('synthetic-seeded','yes');}},{adminKey,studentKey,admin,student});
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'text/javascript',body:sdk});
  if(url.hostname==='portal.test'){
   const path=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
   try{return route.fulfill({contentType:path.endsWith('.js')?'text/javascript':'text/html',body:await fs.readFile('.'+path)});}catch{return route.fulfill({status:404,body:''});}
  }
  if(url.hostname==='ydqchayscxntqdkzkynv.supabase.co'){
   const bearer=route.request().headers().authorization||'';
   const isAdmin=bearer.includes(admin.access_token),identity=isAdmin?admin:student;
   const reply=data=>route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
   if(url.pathname==='/auth/v1/user')return reply(identity.user);
   if(url.pathname==='/auth/v1/token')return reply(student);
   if(url.pathname==='/auth/v1/logout')return reply({});
   if(url.pathname.startsWith('/rest/v1/')){
    const table=url.pathname.split('/').pop();return reply(({organization_memberships:[{tenant_id:'t',role:isAdmin?'org_admin':'student'}],organizations:[{id:'t',name:'Synthetic House'}],residents:[{id:'p',user_id:student.user.id,full_name:'SYNTHETIC Student',email:student.user.email}],rooms:[]})[table]||[]);
   }
  }
  return route.abort();
 });
 const page=await context.newPage();
 await page.goto('https://portal.test/student-house-portal/admin/');
 await page.locator('#app:not(.hide)').waitFor();assert.match(await page.locator('#zone').innerText(),/Administrácia/);assert.equal(await page.locator('#user').innerText(),admin.user.email);
 await page.locator('#switchPortal').click();
 await page.locator('#login:not(.hide)').waitFor();assert.equal(await page.locator('#app').isVisible(),false);assert.equal(await page.locator('#sign').innerText(),'Študentské prihlásenie');
 await page.locator('#email').fill(student.user.email);await page.locator('#password').fill('synthetic-test-only-password');await page.locator('#signbtn').click();
 await page.locator('#app:not(.hide)').waitFor();assert.equal(await page.locator('#zone').innerText(),'Moja študentská zóna');assert.equal(await page.locator('#user').innerText(),student.user.email);assert.equal(await page.locator('#tabs button').filter({hasText:'Registrácie'}).count(),0);
 const staffTab=await context.newPage();await staffTab.goto('https://portal.test/student-house-portal/admin/');await staffTab.locator('#app:not(.hide)').waitFor();assert.equal(await staffTab.locator('#user').innerText(),admin.user.email);
 await page.goto('https://portal.test/student-house-portal/student/?view=reception');await page.locator('#app:not(.hide)').waitFor();assert.equal(await page.locator('#zone').innerText(),'Moja študentská zóna');
 await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:studentKey,value:admin});await page.reload();await page.waitForFunction(()=>document.querySelector('#error').textContent.length>0);assert.equal(await page.locator('#app').isVisible(),false);
 assert.equal(await staffTab.locator('#user').innerText(),admin.user.email);assert.ok(await staffTab.locator('#app').isVisible());
 await context.close();
}
console.log('PASS actual Supabase SDK, same-browser admin/student switching, forced student sign-in, independent parallel tabs, hostile view query and wrong-role stored session (two viewports; synthetic HTTP only)');
}finally{await browser.close()}
