import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)('playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox']});
try{
 for(const width of [390,1440]){
  const page=await browser.newPage({viewport:{width,height:844}});
  const html=await fs.readFile('student-house-portal/parking/index.html','utf8');
  let payload;
  await page.route('**/*',route=>route.request().url().startsWith('https://parking.test')?route.fulfill({contentType:'text/html',body:html}):route.request().url().includes('/parking-request')? (route.request().method()==='OPTIONS'?route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'content-type','access-control-allow-methods':'POST'}}):(payload=route.request().postDataJSON(),route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({ok:true})})) :route.abort());
  await page.goto('https://parking.test/?lang=sk');
  const f=id=>page.locator('#'+id);
  assert.ok(await f('dial').locator('option').count()>200);
  await f('dial').selectOption('UA');await f('phone').fill('501234567');
  await f('months').fill('6');await f('paymentMode').selectOption('monthly');
  for(const l of ['en','ru','uk','sk']){
   await f('lang').selectOption(l);
   assert.equal(await f('dial').inputValue(),'UA');
   assert.equal(await f('phone').inputValue(),'501234567');assert.equal(await f('paymentMode').inputValue(),'monthly');
   assert.match(await f('total').innerText(),/300/);
   assert.match(await f('vatLine').innerText(),/69/);
   assert.match(await f('grossLine').innerText(),/369/);
  }
  await f('first').fill('Synthetic');await f('last').fill('Test');await f('email').fill('synthetic@example.invalid');
  await f('residentType').selectOption('student_house');await f('unitNumber').fill('109');await f('address').fill('Testovacia 1, 811 01 Bratislava, Slovensko');await f('plate').fill('TEST123');await f('consent').check();await f('acknowledge').check();
  await f('send').click();await page.locator('#status.success').waitFor();
  assert.equal(payload.telephone,'+380501234567');assert.equal(payload.months,6);assert.equal(payload.resident_type,'student_house');assert.equal(payload.unit_number,'109');assert.equal(payload.permanent_address,'Testovacia 1, 811 01 Bratislava, Slovensko');assert.match(payload.note,/^\[Platba: mesačne\]/);
  await page.close();
 }
}finally{await browser.close();}
