import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildRegisterGroups} from '../student-house-portal/room-register.js';
import { filterResidents, filterRegistrations, residentFiles, renderStaffScreen } from '../student-house-portal/staff.js';

// In-memory DOM and synthetic records only. These are integration tests, not browser/login tests.
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.attributes={};this.style={};this._text='';this.value='';this.disabled=false;this.connected=false;}
 set textContent(value){this._text=String(value);this.children=[];}
 get textContent(){return this._text+this.children.map(x=>x.textContent).join(' ');}
 get isConnected(){return this.connected||!!this.parent?.isConnected;}
 setAttribute(k,v){this.attributes[k]=v;}
 append(...items){for(const item of items){item.parent=this;this.children.push(item);if(this.tagName==='select'&&this.children.length===1)this.value=item.value;}}
 replaceChildren(...items){for(const c of this.children)c.parent=null;this.children=[];this._text='';this.append(...items);}
 addEventListener(name,fn){this.listeners[name]=fn;}
 reportValidity(){return true;}
 querySelectorAll(tag){return this.children.flatMap(c=>[...((tag==='[role=alert]'?c.attributes.role==='alert':c.tagName===tag)?[c]:[]),...c.querySelectorAll(tag)]);}
 querySelector(tag){return this.querySelectorAll(tag)[0];}
 remove(){const p=this.parent;if(p){p.children=p.children.filter(x=>x!==this);this.parent=null;}}
 replaceWith(other){const parent=this.parent;if(!parent)return;const i=parent.children.indexOf(this);parent.children[i]=other;other.parent=parent;this.parent=null;}
}
globalThis.document={createElement:tag=>new Element(tag)};
globalThis.confirm=()=>true;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const tenant='tenant-a';
const person={id:'resident-a',tenant_id:tenant,user_id:'user-a',full_name:'Žofia Šťastná',email:'zofia@example.invalid',active:true,verified_room_number:'125',verified_contract_number:'TEST-001',accommodation_from:'2026-09-01',accommodation_to:'2027-06-30'};
const registration={id:'request-a',tenant_id:tenant,first_name:'Žofia',last_name:'Šťastná',email:person.email,room_number:'125',contract_number:'TEST-001',status:'pending',accommodation_from:'2026-09-01',accommodation_to:'2027-06-30',created_at:'2026-11-12'};
function fixture(section,overrides={}){
 const root=new Element('div');root.connected=true;
 const calls=[];
 const ctx={root,notice:new Element('p'),lang:'sk',tenant,role:'reception',section,day:x=>x||'—',success:'Saved',refresh:()=>{},isCurrent:()=>true,fileLink:()=>{},list:async table=>table==='residents'?[{...person}]:table==='registration_requests'?[{...registration}]:table==='registration_enquiries'?[{registration_id:registration.id,preferred_duration_months:10,preferred_from:'2026-09-11'}]:table==='rooms'?[{name:'125',category:'M2',capacity:2}]:[],
 db:{rpc:async()=>({data:[]}),from:()=>({update(value){this.value=value;return this;},eq(){return this;},select:async function(){return {data:[{id:registration.id,...this.value}]};}}),functions:{invoke:async(name,input)=>{calls.push({name,...input});return {data:{ok:true},error:null};}}},...overrides};return {ctx,calls,root};
}
const findButton=(root,label)=>root.querySelectorAll('button').find(b=>b.textContent===label);
const approvalForm=root=>root.querySelectorAll('form').find(x=>x.className?.includes('registration-approval-form'));
const fieldByLabel=(form,name)=>form.querySelectorAll('label').find(l=>l._text===name)?.children[0];
const prepareApproval=f=>{
 const form=approvalForm(f.root);assert.ok(form,'Unified approval form exists');
 fieldByLabel(form,'Mesačný nájom (€)').value='300';
 fieldByLabel(form,'Mesačný nájom (€)').listeners.input();
 return form;
};
async function approveFixture(f){
 const form=prepareApproval(f);form.listeners.submit({preventDefault(){}});await tick();
}

test('Search handles Slovak diacritics, multiple fields, status and empty results',()=>{
 const rows=[person,{...person,id:'b',active:false,full_name:'Peter Nový',verified_room_number:'200'}];
 assert.equal(filterResidents(rows,'zofia 125').length,1);assert.equal(filterResidents(rows,'TEST-001','inactive')[0].id,'b');
 assert.equal(filterResidents(rows,'nikto').length,0);assert.equal(filterResidents(rows,'','active').length,1);
 assert.equal(rows[0].id,'resident-a');
});
test('Pending registrations default excludes invited and rejected requests',()=>{
 assert.deepEqual(filterRegistrations([registration,{...registration,id:'b',status:'invited'}]).map(x=>x.id),['request-a']);
 assert.equal(filterRegistrations([registration],'stastna 125').length,1);
});
test('Private document association excludes other tenants, residents and inactive files',()=>{
 const file={id:'one',tenant_id:tenant,resident_id:person.id,user_id:person.user_id,active:true};
 const files=[file,{...file,id:'foreign-tenant',tenant_id:'tenant-b'},{...file,id:'foreign-resident',resident_id:'another'},{...file,id:'old',active:false},{...file,id:'photo',resident_id:null}];
 assert.deepEqual(residentFiles(files,person).map(x=>x.id),['one','photo']);
});
test('Student and unknown roles cannot load staff records',async()=>{
 for(const role of ['student','unknown']){let reads=0;const f=fixture('residents',{role,list:async()=>{reads++;return [];}});await renderStaffScreen(f.ctx);assert.equal(reads,0);assert.equal(f.root.querySelectorAll('input').length,0);}
});
test('Registration approval uses existing server endpoint with tenant and student role',async()=>{
 const f=fixture('registrations');await renderStaffScreen(f.ctx);
 await approveFixture(f);
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].name,'manage');assert.equal(f.calls[0].body.tenant_id,tenant);
 assert.equal(f.calls[0].body.registration_id,registration.id);assert.equal(f.calls[0].body.role,'student');
 assert.match(f.ctx.notice.textContent,/Doručenie.*nie je overené/);assert.equal(findButton(f.root,'Schváliť registráciu'),undefined);
});
test('Rejected approval confirmation performs no write',async()=>{
 const f=fixture('registrations');await renderStaffScreen(f.ctx);globalThis.confirm=()=>false;
 await approveFixture(f);globalThis.confirm=()=>true;assert.equal(f.calls.length,0);
});
test('Email limit is visible, does not approve, and prevents blind retry',async()=>{
 let calls=0;const f=fixture('registrations',{db:{from:()=>({update(value){this.value=value;return this;},eq(){return this;},select:async function(){return {data:[{id:registration.id,...this.value}]};}}),functions:{invoke:async()=>{calls++;return {data:{error:'over_email_send_rate_limit'}};}}}});
 await renderStaffScreen(f.ctx);const button=findButton(f.root,'Schváliť registráciu');await approveFixture(f);
 assert.match(f.ctx.notice.textContent,/dočasne obmedzené/);assert.equal(button.disabled,false);assert.equal(calls,1);
});
test('Profile shows contract, room and dates with private document status',async()=>{
 const f=fixture('residents');await renderStaffScreen(f.ctx);findButton(f.root,'Otvoriť profil').listeners.click();await tick();
 assert.match(f.root.textContent,/TEST-001/);assert.match(f.root.textContent,/2027-06-30/);assert.match(f.root.textContent,/Zatiaľ nenahrané/);
 assert.ok(findButton(f.root,'Späť na študentov'));
});
test('Late results do not populate a former tenant screen',async()=>{
 let finish;const f=fixture('residents',{list:()=>new Promise(resolve=>finish=resolve)});const done=renderStaffScreen(f.ctx);f.ctx.isCurrent=()=>false;finish([person]);await done;
 assert.equal(findButton(f.root,'Otvoriť profil'),undefined);
});
test('Portal JavaScript parses and restricts staff roles explicitly',()=>{
 const source=fs.readFileSync(new URL('../student-house-portal/index.html',import.meta.url),'utf8');
 new vm.Script(source.match(/<script>\n([\s\S]*?)<\/script>/)[1]);
 assert.ok(source.includes("['org_admin','reception'].includes(member.role)"));
});

test('Approval shows a check mark and opens the approved room in the correct calendar year',async()=>{
 let opened;
 const f=fixture('registrations',{userId:'receipt-staff',openRooms:(room,date)=>{opened={room,date};}});
 await renderStaffScreen(f.ctx);await approveFixture(f);
 assert.match(f.ctx.notice.textContent,/✓ Registrácia úspešne schválená/);
 assert.match(f.ctx.notice.textContent,/Študent, izba a splátkový kalendár sú uložené/);
 assert.equal(f.ctx.notice.className,'staff-notice staff-approval-success');
 findButton(f.ctx.notice,'Otvoriť študenta v Excel evidencii').listeners.click();
 assert.deepEqual(opened,{room:'125',date:'2026-09-01'});
 assert.equal(f.root.querySelector('select').value,'invited');
 assert.match(f.root.textContent,/✓ Schválená/);
});
test('Failed approval never displays a success check or Excel confirmation',async()=>{
 const f=fixture('registrations',{userId:'failed-staff',openRooms:()=>{},db:{from:()=>({update(value){this.value=value;return this;},eq(){return this;},select:async function(){return {data:[{id:registration.id,...this.value}]};}}),functions:{invoke:async()=>({data:{error:'approval_conflict'}})}}});
 await renderStaffScreen(f.ctx);await approveFixture(f);
 assert.doesNotMatch(f.ctx.notice.textContent,/✓ Registrácia úspešne schválená/);
 assert.equal(findButton(f.ctx.notice,'Otvoriť študenta v Excel evidencii'),undefined);
});
test('Changing rent immediately updates all ten full monthly charges',async()=>{
 const f=fixture('registrations');await renderStaffScreen(f.ctx);const form=prepareApproval(f);
 const rent=fieldByLabel(form,'Mesačný nájom (€)');
 assert.match(form.textContent,/3000\.00/);
 rent.value='350';rent.listeners.input();
 assert.match(form.textContent,/3500\.00/);
 assert.equal(form.querySelector('details').querySelector('div').children.length,10);
 assert.equal(f.calls.length,0);
});
test('Reloaded registrations can show the current staff member’s recent database-confirmed approval',async()=>{
 const approved={...registration,status:'invited',reviewed_by:'staff-reload',reviewed_at:new Date().toISOString()};
 const f=fixture('registrations',{userId:'staff-reload',list:async table=>table==='registration_requests'?[approved]:table==='rooms'?[{name:'125',capacity:2}]:[]});
 await renderStaffScreen(f.ctx);
 assert.match(f.ctx.notice.textContent,/✓ Registrácia úspešne schválená/);
 assert.match(f.ctx.notice.textContent,/Doručenie pozvánky nie je overené/);
});
test('A future approved resident appears in the Excel year of their stay',()=>{
 const data={rooms:[{id:'room-001',name:'001',capacity:2}],residents:[{...person,id:'future',verified_room_number:'001',accommodation_from:'2027-02-01',accommodation_to:'2027-07-01'}],tenancies:[{resident_id:'future',room_id:'room-001',starts_on:'2027-02-01',ends_on:'2027-07-01'}]};
 assert.equal(buildRegisterGroups({...data,year:2026})[0].entries.filter(e=>e.person).length,0);
 assert.equal(buildRegisterGroups({...data,year:2027})[0].entries.filter(e=>e.person).length,1);
 assert.equal(buildRegisterGroups({...data,year:2027})[0].entries.find(e=>e.person).person.id,'future');
});

test('Missing contract blocks approval until entered in the same form',async()=>{
 const request={...registration,contract_number:null};
 const f=fixture('registrations',{list:async table=>table==='registration_requests'?[request]:table==='registration_enquiries'?[{registration_id:request.id,preferred_duration_months:10}]:table==='rooms'?[{name:'125',capacity:2}]:[]});
 await renderStaffScreen(f.ctx);const form=prepareApproval(f);
 form.listeners.submit({preventDefault(){}});await tick();assert.equal(f.calls.length,0);
 fieldByLabel(form,'Číslo zmluvy').value='VERIFIED-555';
 form.listeners.submit({preventDefault(){}});await tick();assert.equal(f.calls.length,1);
 assert.equal(f.calls[0].body.verified_assignment.contract_number,'VERIFIED-555');
});
test('Missing or invalid stay duration blocks approval without guessing data',async()=>{
 for(const duration of [null,6]){
 const f=fixture('registrations',{list:async table=>table==='registration_requests'?[registration]:table==='registration_enquiries'?[{registration_id:registration.id,preferred_duration_months:duration}]:table==='rooms'?[{name:'125',capacity:2}]:[]});
 await renderStaffScreen(f.ctx);assert.equal(approvalForm(f.root),undefined);
 assert.match(f.root.textContent,/Chýba platná dĺžka pobytu/);
 assert.ok(findButton(f.root,'Vrátiť študentovi na opravu'));assert.equal(f.calls.length,0);
 }
});
test('Unified approval sends contract, room, actual arrival and full calendar atomically',async()=>{
 const writes=[];let payload;const request={...registration,contract_number:null,room_number:null};
 const f=fixture('registrations',{list:async table=>table==='registration_requests'?[request]:table==='registration_enquiries'?[{registration_id:request.id,preferred_duration_months:10,preferred_from:'2026-09-11'}]:table==='rooms'?[{name:'125',capacity:2}]:[],db:{rpc:async()=>({data:[]}),from:()=>({update(){writes.push('partial-write');return this;},eq(){return this;},select:async()=>({data:[]})}),functions:{invoke:async(_name,args)=>{writes.push('approval');payload=args.body;return {data:{ok:true}};}}}});
 await renderStaffScreen(f.ctx);const form=prepareApproval(f);
 fieldByLabel(form,'Číslo zmluvy').value='REAL-555';fieldByLabel(form,'Pridelená izba').value='125';fieldByLabel(form,'Skutočný príchod').value='2026-09-11';
 assert.notEqual(form.querySelector('details').open,true);
 form.listeners.submit({preventDefault(){}});await tick();
 assert.deepEqual(writes,['approval']);
 assert.equal(payload.verified_assignment.contract_number,'REAL-555');
 assert.equal(payload.verified_assignment.room_number,'125');
 assert.equal(payload.verified_assignment.actual_arrival_on,'2026-09-11');
 assert.equal(payload.verified_assignment.accommodation_to,'2027-06-30');
 assert.equal(payload.verified_schedule.length,10);
 assert.equal(payload.verified_schedule[0].period,'2026-09');
 assert.equal(payload.verified_schedule[9].period,'2027-06');
 assert.ok(payload.verified_schedule.every(row=>row.amount===300));
});
test('Failed atomic approval preserves fields and allows safe retry',async()=>{
 let calls=0;const f=fixture('registrations',{db:{from:()=>({update(){throw Error('unexpected partial write')}}),functions:{invoke:async()=>{calls++;return {data:{error:'approval_conflict'}};}}}});
 await renderStaffScreen(f.ctx);const form=prepareApproval(f);
 fieldByLabel(form,'Skutočný príchod').value='2026-09-11';
 form.listeners.submit({preventDefault(){}});await tick();assert.equal(calls,1);
 assert.equal(fieldByLabel(form,'Mesačný nájom (€)').value,'300');
 assert.equal(fieldByLabel(form,'Číslo zmluvy').value,'TEST-001');
 assert.equal(fieldByLabel(form,'Skutočný príchod').value,'2026-09-11');
 assert.equal(findButton(f.root,'Schváliť registráciu').disabled,false);
 assert.doesNotMatch(f.ctx.notice.textContent,/✓ Registrácia úspešne schválená/);
 form.listeners.submit({preventDefault(){}});await tick();assert.equal(calls,2);
});
test('Automatic refresh preserves a resident profile and forms even after focus leaves the page',()=>{
 const html=fs.readFileSync('student-house-portal/index.html','utf8');
 const body=html.match(/function editingRecord\(\)\{([\s\S]*?)\n\}/)[1];
 const run=(preserved,focused=false)=>vm.runInNewContext('(function(){'+body+'})()',{
  $:()=>({querySelector:()=>preserved,contains:()=>focused}),document:{activeElement:focused?{matches:()=>true,closest:()=>null}:null}
 });
 assert.equal(run({className:'staff-profile'}),true);
 assert.equal(run({className:'staff-form'}),true);
 assert.equal(run({dataset:{liveDirty:'true'}}),true);
 assert.equal(run(null,true),true);
 assert.equal(run(null,false),false);
});

test('Questionnaire approval locks both decisions, retries inline and reloads from the saved review',async()=>{
 const submitted={student_submitted_at:'2026-11-20T18:00:00Z',gender:'female',own_refrigerator:false,permanent_address:'Test',date_of_birth:'2000-01-01',nationality:'Test',identity_document_number:'Test',telephone:'Test',school:'Test'};
 let review=null,writes=0,finish;
 const open=async()=>{
  const f=fixture('residents',{db:{from:table=>({
   select(){return this;},eq(){return this;},limit:async()=>({data:[{id:'test-photo'}]}),
   maybeSingle:async()=>({data:table==='resident_enquiries'?submitted:review}),
   upsert(value){writes++;this.value=value;return this;},
   single(){return new Promise(resolve=>{finish=ok=>{if(ok)review=this.value;resolve(ok?{data:review}:{error:Error('test')});};});}
  })}});
  await renderStaffScreen(f.ctx);findButton(f.root,'Otvoriť profil').listeners.click();await tick();
  return f;
 };
 const f=await open();
 const approve=findButton(f.root,'Schváliť správne vyplnený dotazník');
 const sendBack=findButton(f.root,'Poslať späť zle vyplnený dotazník');
 const first=approve.listeners.click();await tick();
 assert.equal(approve.textContent,'Ukladá sa…');
 assert.equal(sendBack.disabled,true);
 await approve.listeners.click();assert.equal(writes,1);
 finish(false);await first;
 assert.match(f.root.textContent,/Zmenu sa nepodarilo uložiť/);
 assert.equal(approve.disabled,false);
 const retry=approve.listeners.click();await tick();finish(true);await retry;
 assert.match(f.root.textContent,/✓ Dotazník schválený/);
 assert.equal(findButton(f.root,'Schváliť správne vyplnený dotazník'),undefined);
 const reloaded=await open();
 assert.match(reloaded.root.textContent,/✓ Dotazník schválený/);
 submitted.student_submitted_at='2099-11-20T19:00:00Z';
 const corrected=await open();
 assert.ok(findButton(corrected.root,'Schváliť správne vyplnený dotazník'));
});
