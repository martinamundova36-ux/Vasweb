import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:844}});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='cdn.jsdelivr.net')return route.fulfill({
    contentType:'text/javascript',
    body:"window.supabase={createClient:()=>({auth:{onAuthStateChange:()=>{},getUser:async()=>({data:{user:null},error:null})}})}"
   });
   if(u.hostname==='portal.test'){
    const file='.'+(u.pathname.endsWith('/')?u.pathname+'index.html':u.pathname);
    try{return route.fulfill({contentType:'text/html',body:await fs.readFile(file)});}
    catch{return route.fulfill({status:404,body:''});}
   }
   return route.abort();
  });
  await page.goto('https://portal.test/student-house-portal/student/?view=register');
  await page.locator('#regDuration').waitFor();
  assert.ok(await page.locator('#registration').isVisible(),'Direct registration opens registration');
  assert.equal(await page.locator('#regRoom').count(),0,'Specific room is assigned only by reception');
  assert.equal(await page.locator('#regContract').count(),0,'Contract number is staff-only');
  assert.equal(await page.locator('#regRoomType option').count(),7);
  assert.deepEqual(await page.locator('#regDuration option').evaluateAll(xs=>xs.map(x=>x.value)),['','5','10','12']);
  assert.equal(await page.locator('#regDuration').getAttribute('required'),'');
  assert.equal(await page.locator('#regArrival').getAttribute('required'),'');
  assert.equal(await page.locator('#regTo').getAttribute('readonly'),'');
  await page.locator('#regFrom').fill('2026-11-11');
  for(const [months,end] of [['5','2027-03-31'],['10','2027-08-31'],['12','2027-10-31']]){
   await page.locator('#regDuration').selectOption(months);
   assert.equal(await page.locator('#regTo').inputValue(),end);
  }
  await page.locator('#regArrival').fill('2026-11-15');
  await page.locator('#regRoomType').selectOption('D2');
  for(const code of ['en','ru','uk','sk']){
   await page.locator('#lang').selectOption(code);
   assert.equal(await page.locator('#regRoom').count(),0);
   assert.equal(await page.locator('#regRoomType').inputValue(),'D2');
   assert.equal(await page.locator('#regDuration').inputValue(),'12');
   assert.equal(await page.locator('#regArrival').inputValue(),'2026-11-15');
   assert.equal(await page.locator('#regTo').inputValue(),'2027-10-31');
  }
  if(errors.length)throw new Error('Browser runtime error: '+errors.join('; '));
  await page.close();
  console.log('PASS '+width+'px: registration opened; reception-only assignment, 5/10/12 months, dates, all four languages');
 }
}finally{await browser.close()}
