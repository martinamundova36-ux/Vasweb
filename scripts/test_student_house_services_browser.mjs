// Isolated browser/UI integration test. No production login, tenant data or email sending.
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium,webkit}=require('playwright');
for(const engine of [chromium,webkit]){
const browser=await engine.launch({...(engine===chromium?{executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']}:{}),headless:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 page.on('dialog',dialog=>dialog.accept());
 const source=readFileSync('student-house-portal/service-requests.js','utf8');
 await page.route('http://residence.test/**',route=>route.fulfill({contentType:route.request().url().endsWith('.js')?'text/javascript':'text/html',body:route.request().url().endsWith('.js')?source:'<main id="root"></main><script type="module">import {renderServiceRequests} from "/services.js";window.renderServiceRequests=renderServiceRequests;</script>'}));
 await page.goto('http://residence.test/');await page.waitForFunction(()=>!!window.renderServiceRequests);
 async function fixture(staff,cleaning=false){
  await page.evaluate(async ({staff,cleaning})=>{
   window.saved=[];window.refreshes=0;
   const record={id:'request-a',resident_id:'resident-a',tenant_id:'tenant-a',subject:'Broken light',description:'Synthetic maintenance problem',status:cleaning?'requested':'new',staff_note:'',urgent:true,created_at:'2026-11-13T10:00:00Z',updated_at:'2026-11-13T10:00:00Z',preferred_date:'2026-11-20',preferred_window:'morning',cleaning_type:'standard',price_eur:null,scheduled_at:null};
   const resident={id:'resident-a',full_name:'Synthetic Student',verified_room_number:'125'};
   const query={update(payload){window.saved.push({action:'update',payload});return this;},eq(key,value){return this;},select(){return Promise.resolve({data:[{id:record.id}],error:null});},insert(payload){window.saved.push({action:'insert',payload});return this;}};
   await window.renderServiceRequests({root:document.getElementById('root'),db:{from:table=>query,rpc:async()=>({data:[{id:'slot-a',starts_at:'2027-07-20T08:00:00.000Z',ends_at:'2027-07-20T09:00:00.000Z',resource:'Synthetic cleaner',remaining:1}],error:null})},list:async table=>table==='residents'?[resident]:table==='service_request_messages'?(staff?[{request_id:record.id,id:'private-a',created_at:'2026-11-13T11:00:00Z',body:'Private synthetic note',is_internal:true,message_kind:'reply'}]:[]):[record],tenant:'tenant-a',staff,cleaning,resident,userId:staff?'staff-a':'student-a',lang:'en',isCurrent:()=>true,refresh:()=>{window.refreshes++;},day:x=>x,money:x=>x+' EUR'});
  },{staff,cleaning});
 }
 await fixture(true);
 await page.locator('article > form select').selectOption('waiting_parts');
 await page.locator('article > form textarea').fill('Parts ordered');
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 assert.equal(await page.evaluate(()=>saved[0].payload.status),'waiting_parts');
 await page.getByText('History and messages',{exact:true}).click();
 await page.getByLabel('Internal note – reception only',{exact:true}).check();
 await page.locator('details textarea').fill('Internal only test');
 await page.getByRole('button',{name:'Send message',exact:true}).click();
 assert.equal(await page.evaluate(()=>saved[1].payload.is_internal),true);
 await fixture(false);
 assert.equal(await page.getByText('Private synthetic note',{exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Save changes',exact:true}).count(),0);
 assert.equal(await page.getByLabel('Internal note – reception only',{exact:true}).count(),0);
 await page.getByLabel('Subject',{exact:true}).fill('Synthetic broken door');
 await page.getByLabel('Problem description',{exact:true}).fill('Door will not close');
 await page.getByRole('button',{name:'Submit request',exact:true}).click();
 assert.equal(await page.evaluate(()=>saved[0].payload.resident_id),'resident-a');
 assert.equal(await page.evaluate(()=>saved[0].payload.category),'maintenance');
 assert.equal(await page.evaluate(()=>refreshes),1,'Successful submission must refresh persisted data');
 await fixture(false,true);
 await page.getByLabel('Available cleaning appointments',{exact:true}).selectOption('slot-a');
 await page.getByLabel('Cleaning type',{exact:true}).selectOption('deep');
 await page.getByRole('button',{name:'Submit request',exact:true}).click();
 assert.equal(await page.evaluate(()=>saved[0].payload.cleaning_type),'deep');
 assert.equal(await page.evaluate(()=>saved[0].payload.slot_id),'slot-a');
 assert.equal(await page.evaluate(()=>refreshes),1);
 await fixture(true,true);
 await page.getByLabel('Status',{exact:true}).selectOption('proposed');
 await page.getByLabel('Proposed or confirmed appointment',{exact:true}).selectOption('slot-a');
 await page.getByRole('button',{name:'Save changes',exact:true}).click();
 assert.equal(await page.evaluate(()=>saved[0].payload.scheduled_at),'2027-07-20T08:00:00.000Z');
 console.log('PASS: mobile browser forms, staff status update, internal note submission, student controls, cleaning type, alternate appointment in Bratislava timezone. Synthetic UI only.');
}finally{await browser.close();}

}
