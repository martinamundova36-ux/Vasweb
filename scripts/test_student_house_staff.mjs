import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
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
 db:{functions:{invoke:async(name,input)=>{calls.push({name,...input});return {data:{ok:true},error:null};}}},...overrides};return {ctx,calls,root};
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
 let calls=0;const f=fixture('registrations',{db:{functions:{invoke:async()=>{calls++;return {data:{error:'over_email_send_rate_limit'}};}}}});
 await renderStaffScreen(f.ctx);const button=findButton(f.root,'Overiť a schváliť registráciu');await approveFixture(f);
 assert.match(f.ctx.notice.textContent,/dočasne obmedzené/);assert.equal(button.disabled,true);assert.equal(calls,1);
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
