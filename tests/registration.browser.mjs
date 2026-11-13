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
  await page.locator('#regRoom').waitFor();
  assert.ok(await page.locator('#registration').isVisible(),'Direct registration link should open registration');
  assert.equal(await page.locator('#regRoom').evaluate(el=>el.tagName),'SELECT','Room number must be a dropdown');
  assert.equal(await page.locator('#regRoomType').evaluate(el=>el.tagName),'SELECT','Room type must be a dropdown');
  assert.equal(await page.locator('#regRoomType option').count(),7,'Six public room types plus no preference');
  assert.equal(await page.locator('#regRoom option').count(),65,'All 64 rooms plus no preference');
  const types=[['M2',4],['Š1+1',5],['SUI 2',13],['D2',19],['Š2',17],['D2V',7]];
  for(const [type,count] of types){
   await page.locator('#regRoomType').selectOption(type);
   assert.equal(await page.locator('#regRoom option').count(),count,'Wrong room choices for '+type);
  }
  await page.locator('#regRoomType').selectOption('M2');
  await page.locator('#regRoom').selectOption('124');
  assert.equal(await page.locator('#regRoom').inputValue(),'124');
  await page.locator('#regRoomType').selectOption('D2');
  assert.equal(await page.locator('#regRoom').inputValue(),'','Incompatible room must clear');
  for(const code of ['en','ru','uk','sk']){
   await page.locator('#lang').selectOption(code);
   assert.equal(await page.locator('#regRoom').evaluate(x=>x.tagName),'SELECT');
   assert.equal(await page.locator('#regRoom option').count(),19,'Language switch should preserve D2 filter');
  }
  if(errors.length)throw new Error('Browser runtime error: '+errors.join('; '));
  await page.close();
  console.log('PASS '+width+'px: registration opened; 64 room numbers filtered by six room types, all four languages');
 }
}finally{await browser.close()}
