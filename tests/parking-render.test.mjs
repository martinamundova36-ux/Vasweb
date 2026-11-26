import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const code=await fs.readFile('student-house-portal/parking-register-20261126.js','utf8');
const original=await fs.readFile('student-house-portal/parking-register.js','utf8');
test('versioned parking module matches canonical source',()=>assert.equal(code,original));
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.style={};this.classList={toggle(){}};this.dataset={};this.value='';this.attrs={};this.events={};}
 append(...xs){this.children.push(...xs);if(this.tagName==='select'&&this.children.length===1)this.value=this.children[0].value;}
 setAttribute(k,v){this.attrs[k]=v;} addEventListener(k,v){this.events[k]=v;}
 replaceChildren(...xs){this.children=xs;} createTHead(){const x=new Element('thead');this.append(x);return x;} createTBody(){const x=new Element('tbody');this.append(x);return x;} insertRow(){const x=new Element('tr');this.append(x);return x;}
 get rows(){return this.children;} get cells(){return this.children;}
 insertBefore(x,y){const i=this.children.indexOf(y);if(i<0)this.children.push(x);else this.children.splice(i,0,x);}
}
const doc={createElement:t=>new Element(t)};
const render=new Function('document','providerDetails',code.replace(/^import .*$/gm,'').replace(/export function/g,'function')+'\nreturn renderParkingRegister;')(doc,()=>null);
const noop=async()=>{};
for(const lang of ['sk','en','ru','uk'])for(const populated of [false,true]){
 test('parking render '+lang+' '+populated,()=>{
  const root=new Element('div');
  const request={id:'test',first_name:'Synthetic',last_name:'Test',vehicle_registration:'TEST123',resident_type:'student_house',unit_number:'109',start_on:'2027-01-01',end_on:'2027-05-31',months:5,total_eur:250,created_at:'2026-11-26',note:'',status:'pending'};
  const row={id:1,year:2027,source_row:1,entry:'Synthetic Test  TEST123',request_id:'test',resident_type:'student_house',unit_number:'109',months:Array(12).fill(null),planned_months:Array.from({length:12},(_,i)=>i<5?61.5:null)};
  const oldRow={id:2,year:2026,source_row:2,entry:'Legacy  TEST456',months:[50,50,null,50,'note',null,null,null,null,null,null,null],planned_months:null};
  render(root,lang,populated?[request]:[],populated?[row,oldRow]:[oldRow],noop,noop,'test',noop,noop,noop);
  const nodes=[];function walk(n){if(n&&typeof n==='object'){nodes.push(n);for(const x of n.children??[])walk(x);}}walk(root);
  const grid=nodes.filter(n=>n.tagName==='table').at(-1);
  assert.equal(grid.children[0].children[0].children.length,17);
  if(populated)assert.equal(grid.children[1].children[0].children.length,17);
  const tab=nodes.find(n=>n.tagName==='button'&&n.textContent==='2026');assert.ok(tab);tab.events.click();
  assert.ok(root.children.length>0);
 });
}
