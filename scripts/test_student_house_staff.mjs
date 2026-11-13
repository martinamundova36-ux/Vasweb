import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {buildRegisterGroups} from '../student-house-portal/room-register.js';
import { filterResidents, filterRegistrations, residentFiles, renderStaffScreen } from '../student-house-portal/staff.js';

// In-memory DOM and synthetic records only. These are integration tests, not browser/login tests.
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.attributes={};this._text='';this.value='';this.disabled=false;this.connected=false;}
 set textContent(value){this._text=String(value);this.children=[];}
 get textContent(){return this._text+this.children.map(x=>x.textContent).join(' ');}
 get isConnected(){return this.connected||!!this.parent?.isConnected;}
 setAttribute(k,v){this.attributes[k]=v;}
 append(...items){for(const item of items){item.parent=this;this.children.push(item);if(this.tagName==='select'&&this.children.length===1)this.value=item.value;}}
 replaceChildren(...items){for(const c of this.children)c.parent=null;this.children=[];this._text='';this.append(...items);}
 addEventListener(name,fn){this.listeners[name]=fn;}
 reportValidity(){return true;}
 querySelectorAll(tag){return this.children.flatMap(c=>[...(c.tagName===tag?[c]:[]),...c.querySelectorAll(tag)]);}
 querySelector(tag){return this.querySelectorAll(tag)[0];}
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
 const ctx={root,notice:new Element('p'),lang:'sk',tenant,role:'reception',section,day:x=>x||'—',success:'Saved',refresh:()=>{},isCurrent:()=>true,fileLink:()=>{},list:async table=>table==='residents'?[{...person}]:table==='registration_requests'?[{...registration}]:table==='rooms'?[{name:'125',category:'M2',capacity:2}]:[],
 db:{from:()=>({update(value){this.value=value;return this;},eq(){return this;},select:async function(){return {data:[{id:registration.id,...this.value}]};}}),functions:{invoke:async(name,input)=>{calls.push({name,...input});return {data:{ok:true},error:null};}}},...overrides};return {ctx,calls,root};
}
const findButton=(root,label)=>root.querySelectorAll('button').find(b=>b.textContent===label);
async function approveFixture(f){
 findButton(f.root,'Overiť a schváliť registráciu').listeners.click();
 const prepare=findButton(f.root,'Pripraviť predpisy na kontrolu');
 const form=prepare.parent;const rent=form.querySelectorAll('input')[0];rent.value='300';
 prepare.listeners.click();form.onsubmit({preventDefault(){}});await tick();
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
 assert.match(f.ctx.notice.textContent,/Doručenie.*nie je overené/);assert.equal(findButton(f.root,'Overiť a schváliť registráciu'),undefined);
});
test('Rejected approval confirmation performs no write',async()=>{
 const f=fixture('registrations');await renderStaffScreen(f.ctx);globalThis.confirm=()=>false;
 await approveFixture(f);globalThis.confirm=()=>true;assert.equal(f.calls.length,0);
});
test('Email limit is visible, does not approve, and prevents blind retry',async()=>{
 let calls=0;const f=fixture('registrations',{db:{from:()=>({update(value){this.value=value;return this;},eq(){return this;},select:async function(){return {data:[{id:registration.id,...this.value}]};}}),functions:{invoke:async()=>{calls++;return {data:{error:'over_email_send_rate_limit'}};}}}});
 await renderStaffScreen(f.ctx);const button=findButton(f.root,'Overiť a schváliť registráciu');await approveFixture(f);
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
test('Changing the rent after calendar preparation clearly requests a new preview',async()=>{
 const f=fixture('registrations');await renderStaffScreen(f.ctx);
 findButton(f.root,'Overiť a schváliť registráciu').listeners.click();
 const prepare=findButton(f.root,'Pripraviť predpisy na kontrolu'),form=prepare.parent,rent=form.querySelectorAll('input')[0];
 rent.value='300';prepare.listeners.click();
 assert.ok(findButton(form,'Schváliť overenú zmluvu a predpisy'));
 rent.value='350';rent.listeners.input();
 assert.match(form.textContent,/Nájomné alebo deň splatnosti sa zmenili/);
 assert.equal(findButton(form,'Schváliť overenú zmluvu a predpisy'),undefined);
 form.onsubmit({preventDefault(){}});
 assert.ok(findButton(form,'Schváliť overenú zmluvu a predpisy'));
 assert.equal(f.calls.length,0);
});
test('Reloaded registrations can show the current staff member’s recent database-confirmed approval',async()=>{
 const approved={...registration,status:'invited',reviewed_by:'staff-reload',reviewed_at:new Date().toISOString()};
 const f=fixture('registrations',{userId:'staff-reload',list:async table=>table==='registration_requests'?[approved]:table==='rooms'?[{name:'125',capacity:2}]:[]});
 await renderStaffScreen(f.ctx);
 assert.match(f.ctx.notice.textContent,/✓ Registrácia úspešne schválená/);
 assert.match(f.ctx.notice.textContent,/Doručenie pozvánky treba overiť samostatne/);
});
test('A future approved resident appears in the Excel year of their stay',()=>{
 const data={rooms:[{id:'room-001',name:'001',capacity:2}],residents:[{...person,id:'future',verified_room_number:'001',accommodation_from:'2027-02-01',accommodation_to:'2027-07-01'}],tenancies:[{resident_id:'future',room_id:'room-001',starts_on:'2027-02-01',ends_on:'2027-07-01'}]};
 assert.equal(buildRegisterGroups({...data,year:2026})[0].entries.filter(e=>e.person).length,0);
 assert.equal(buildRegisterGroups({...data,year:2027})[0].entries.filter(e=>e.person).length,1);
 assert.equal(buildRegisterGroups({...data,year:2027})[0].entries.find(e=>e.person).person.id,'future');
});

test('Approval opens the missing contract editor; saving persists the number before calendar preparation',async()=>{
 const request={...registration,contract_number:null};let savedPayload;
 const f=fixture('registrations',{list:async table=>table==='registration_requests'?[request]:table==='residents'?[]:table==='rooms'?[{name:'125',capacity:2}]:[],db:{from:()=>({update(payload){savedPayload=payload;return this;},eq(){return this;},select:async()=>({data:[{id:request.id,contract_number:'VERIFIED-555'}],error:null})}),functions:{invoke:async()=>({data:{ok:true}})}}});
 await renderStaffScreen(f.ctx);findButton(f.root,'Overiť a schváliť registráciu').listeners.click();
 const editor=f.root.querySelectorAll('details').find(e=>e.querySelectorAll('input').some(i=>i.attributes['aria-label']==='Číslo zmluvy'));
 assert.ok(findButton(f.root,'Pripraviť predpisy na kontrolu'));
 const field=editor.querySelector('input');field.value='VERIFIED-555';const form=editor.querySelector('form');
 await form.listeners.submit({preventDefault(){}});
 assert.deepEqual(savedPayload,{contract_number:'VERIFIED-555'});assert.match(f.root.textContent,/VERIFIED-555/);
 findButton(f.root,'Overiť a schváliť registráciu').listeners.click();
 assert.ok(findButton(f.root,'Pripraviť predpisy na kontrolu'));
});
test('A failed contract save preserves the entered value and editor instead of asking for it again',async()=>{
 const request={...registration,contract_number:null};
 const f=fixture('registrations',{list:async table=>table==='registration_requests'?[request]:table==='rooms'?[{name:'125',capacity:2}]:[],db:{from:()=>({update(){return this;},eq(){return this;},select:async()=>({data:null,error:{code:'42501'}})})}});
 await renderStaffScreen(f.ctx);findButton(f.root,'Overiť a schváliť registráciu').listeners.click();
 const editor=f.root.querySelectorAll('details').find(e=>e.querySelectorAll('input').some(i=>i.attributes['aria-label']==='Číslo zmluvy'));
 const field=editor.querySelector('input');field.value='KEEP-THIS-555';await editor.querySelector('form').listeners.submit({preventDefault(){}});
 assert.equal(field.value,'KEEP-THIS-555');assert.ok(f.root.querySelectorAll('input').includes(field));
 assert.match(editor.textContent,/nepodarilo uložiť/);
 assert.equal(findButton(editor,'Uložiť overené číslo zmluvy').disabled,false);
});

test('Unified approval saves contract, room and dates before invoking approval and keeps the long calendar collapsed',async()=>{
 const writes=[];let payload;
 const request={...registration,contract_number:null,accommodation_to:'2034-03-13'};
 const f=fixture('registrations',{list:async table=>table==='registration_requests'?[request]:table==='rooms'?[{name:'125',capacity:2}]:[],db:{from:()=>({update(value){writes.push('assignment');payload=value;return this;},eq(){return this;},select:async()=>({data:[{id:request.id,...payload}]})}),functions:{invoke:async()=>{writes.push('approval');return {data:{ok:true}};}}}});
 await renderStaffScreen(f.ctx);findButton(f.root,'Overiť a schváliť registráciu').listeners.click();
 const prepare=findButton(f.root,'Pripraviť predpisy na kontrolu'),form=prepare.parent;
 form.querySelectorAll('input')[0].value='300';form.querySelectorAll('input').find(i=>i.attributes['aria-label']==='Číslo zmluvy').value='REAL-555';
 prepare.listeners.click();const schedule=form.querySelector('div'),calendar=schedule.querySelector('details');
 assert.ok(calendar);assert.notEqual(calendar.open,true);assert.equal(schedule.children[1].tagName,'button');
 form.onsubmit({preventDefault(){}});await tick();assert.deepEqual(writes,['assignment','approval']);assert.equal(payload.contract_number,'REAL-555');assert.equal(payload.accommodation_to,'2034-03-13');
});
test('Failed unified assignment save preserves all terms and never invokes approval',async()=>{
 let calls=0;const f=fixture('registrations',{db:{from:()=>({update(){return this;},eq(){return this;},select:async()=>({error:{code:'42501'}})}),functions:{invoke:async()=>{calls++;return {data:{ok:true}};}}}});
 await renderStaffScreen(f.ctx);await approveFixture(f);assert.equal(calls,0);
 const prepare=findButton(f.root,'Pripraviť predpisy na kontrolu');assert.equal(prepare.parent.querySelector('input').value,'300');assert.equal(prepare.disabled,false);assert.ok(findButton(f.root,'Schváliť overenú zmluvu a predpisy'));
});
