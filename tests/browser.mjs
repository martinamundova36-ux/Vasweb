import {createRequire} from 'node:module';
const {chromium}=createRequire(import.meta.url)('playwright');
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
let passed=0;
try{
 for(const role of ['student','org_admin','reception'])for(const mode of ['student','reception'])for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='cdn.jsdelivr.net')return route.fulfill({contentType:'text/javascript',body:`window.supabase={createClient:(u,k,o)=>{window.testStorageKey=o.auth.storageKey;const tables={organization_memberships:[{tenant_id:'t',role:'${role}'}],organizations:[{id:'t',name:'SYNTHETIC QA'}],residents:[{id:'p',user_id:'u',full_name:'Synthetic Student',email:'qa@example.invalid',active:true}],rooms:[{id:'r',name:'TEST-1',category:'Test',capacity:2}],tenancies:[],registration_requests:[],announcements:[]};const auth={getUser:async()=>({data:{user:{id:'u',email:'qa@example.invalid'}}}),onAuthStateChange:()=>{},signOut:async()=>({error:null})};return{auth,from:table=>{const q=new Proxy({then:(ok)=>Promise.resolve({data:tables[table]||[],error:null}).then(ok)},{get:(t,p)=>p==='then'?t.then:()=>q});return q;}}}}`});
   if(url.hostname==='portal.test'){
    const path=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
    try{return route.fulfill({contentType:path.endsWith('.js')?'text/javascript':'text/html',body:await fs.readFile('.'+path)});}catch{return route.fulfill({status:404,body:''});}
   }
   return route.abort();
  });
  await page.goto('https://portal.test/student-house-portal/'+(mode==='reception'?'admin/?view=register':'student/?view=reception'));
  const allowed=mode==='student'?role==='student':role!=='student';
  if(allowed){
   await page.locator('#tabs button').first().waitFor();
   const title=await page.locator('#zone').innerText();
   assert.ok(role==='student'?title.includes('študentská'):!title.includes('študentská'));
   for(const code of ['en','ru','uk','sk']){await page.locator('#appLang').selectOption(code);await page.waitForFunction(c=>document.documentElement.lang===c,code);assert.ok(await page.locator('#app').isVisible());assert.equal(await page.evaluate(()=>window.testStorageKey),(mode==='reception'?'sb-ydqchayscxntqdkzkynv-auth-token':'sb-ydqchayscxntqdkzkynv-student-auth-token'));}
   if(role!=='student'){
    await page.locator('#tabs button').filter({hasText:'Izby'}).click();
    await page.locator('.room-grid tbody tr').first().waitFor();
    assert.equal(await page.locator('.room-grid tbody tr').count(),64);
    if(width===390)assert.ok(await page.locator('.room-grid table').evaluate(t=>t.parentElement.scrollWidth>t.parentElement.clientWidth));
   }
  }else{
   await page.waitForFunction(()=>document.querySelector('#error').textContent.length>0);
   assert.equal(await page.locator('#tabs button').count(),0);
   assert.ok(await page.locator('#login').isVisible());
  }
  assert.equal(errors.length,0,errors.join('\n'));passed++;await page.close();
 }
 console.log(`PASS ${passed} Chromium role/entrypoint/mobile scenarios (synthetic SDK; no real email or Auth claims)`);
}finally{await browser.close()}
