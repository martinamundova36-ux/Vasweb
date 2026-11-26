import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
try {
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:844}});
  const html=await fs.readFile('student-house-portal/booking/index.html','utf8');
  let attempts=0,success=false;
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname==='booking.test')return route.fulfill({contentType:'text/html',body:html});
   if(url.pathname.endsWith('/register-student')){
    attempts++;
    return route.fulfill({status:success?201:500,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:success})});
   }
   return route.abort();
  });
  await page.goto('https://booking.test/student-house-portal/booking/?lang=sk');
  const set=async(id,value)=>page.locator('#'+id).fill(value);
  const pick=async(id,value)=>page.locator('#'+id).selectOption(value);
  const read=async id=>page.locator('#'+id).inputValue();
  await set('first','Synthetic');await set('last','Test');await set('email','synthetic@example.invalid');
  await pick('dial','SK');await set('phone','900000000');await pick('school','other');await set('schoolOther','Synthetic University');
  await pick('nationality','SK');await set('birth','2000-01-01');await pick('gender','female');
  await pick('room','Mansard 2');await pick('roomUsage','shared');
  const months=await page.locator('#month option').evaluateAll(xs=>xs.map(x=>x.value).filter(Boolean));
  const start=months[0],other=months[1],arrival=start+'-15';
  await pick('month',start);await pick('months','5');
  const allowed=await page.locator('#arrival option').evaluateAll(xs=>xs.map(x=>x.value).filter(Boolean));
  const [y,m]=start.split('-').map(Number);
  assert.equal(allowed.length,new Date(Date.UTC(y,m,0)).getUTCDate());
  assert.ok(allowed.every(x=>x.startsWith(start+'-')));
  await pick('arrival',arrival);
  await page.locator('#gdpr').check();await page.locator('#nonbinding').check();
  const ids=['first','last','email','dial','phone','school','schoolOther','nationality','birth','gender','room','roomUsage','month','months','arrival'];
  const snapshot=async()=>Promise.all(ids.map(read));
  const original=await snapshot();
  for(const lang of ['en','ru','uk','sk']){
   await pick('lang',lang);assert.deepEqual(await snapshot(),original);
  }
  await pick('months','10');assert.equal(await read('arrival'),arrival);
  await pick('months','5');assert.deepEqual(await snapshot(),original);
  await pick('month',other);assert.equal(await read('arrival'),arrival);
  assert.equal(await page.locator('#arrival').evaluate(el=>el.validity.valid),false);
  assert.ok((await page.locator('#arrivalHelp').innerText()).length>20);
  await page.locator('#submit').click();assert.equal(attempts,0);
  assert.equal(await read('arrival'),arrival);assert.equal(await read('first'),'Synthetic');
  await pick('month',start);assert.deepEqual(await snapshot(),original);
  await page.locator('#submit').click();await page.locator('#status.error').waitFor();
  assert.equal(attempts,1);assert.deepEqual(await snapshot(),original);
  assert.equal(await page.locator('#gdpr').isChecked(),true);
  success=true;await page.locator('#submit').click();await page.locator('#status.success').waitFor();
  assert.equal(attempts,2);assert.equal(await read('first'),'');assert.equal(await read('arrival'),'');
  await page.close();console.log('PASS booking draft preservation '+width+'px');
 }
}finally{await browser.close();}
