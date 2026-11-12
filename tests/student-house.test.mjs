import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('student-house-portal/rooms.js','utf8');
const {parseCSV,csvCell,validateRoomImport,roomRows}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('CSV handles BOM, quoted delimiters, multiline values and quotes',()=>{
 assert.deepEqual(parseCSV('\uFEFFname;category;capacity\r\n"A;1";"type\n""B""";2'),[['name','category','capacity'],['A;1','type\n"B"','2']]);
 assert.throws(()=>parseCSV('name;"unclosed'));
});
test('imports validate all rows before writes and never overwrite existing rooms',()=>{
 const existing=[{name:'101'}];
 assert.throws(()=>validateRoomImport('name;category;capacity\n101;Double;2',existing));
 assert.throws(()=>validateRoomImport('name;category;capacity\n102;Double;2\n102;Double;2',existing));
 for(const capacity of ['0','21','2.5','x'])assert.throws(()=>validateRoomImport(`name;category;capacity\n102;Double;${capacity}`,existing));
 assert.deepEqual(validateRoomImport('name;category;capacity\n102;Double;2',existing),[{name:'102',category:'Double',capacity:2}]);
});
test('Excel export neutralizes spreadsheet formulas',()=>{
 for(const c of ['=','+','-','@','\t','\r'])assert.ok(csvCell(c+'1').startsWith('"\''));
 assert.equal(csvCell('a"b'),'"a""b"');
});
test('room inventory retains all residents and only current stays',()=>{
 const rooms=[{id:'a',capacity:2},{id:'b',capacity:1}];
 const stays=[{id:1,room_id:'a',resident_id:'p',starts_on:'2026-01-01',ends_on:'2026-12-31'},{id:2,room_id:'a',resident_id:'q',starts_on:'2026-11-12',ends_on:'2026-11-12'},{id:3,room_id:'b',starts_on:'2025-01-01',ends_on:'2025-12-31'}];
 const rows=roomRows(rooms,stays,[{id:'p'},{id:'q'}],'2026-11-12');
 assert.equal(rows[0].stays.length,2);assert.equal(rows[0].occupancy,'full');assert.equal(rows[1].occupancy,'free');
});
const html=fs.readFileSync('student-house-portal/index.html','utf8');
test('all inline application JavaScript parses',()=>{for(const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(m[1])new vm.Script(m[1]);});
test('entrypoint role gates and session stores are separate',()=>{
 const code=html.slice(html.indexOf('const staffEntryMode='),html.indexOf('const portalMessages='));
 for(const staff of [false,true]){const context={URLSearchParams,location:{search:staff?'?view=reception':''}};
 vm.createContext(context);vm.runInContext(code+';globalThis.result={key:portalStorageKey,roles:["student","org_admin","reception","platform_admin",null].map(portalRoleAllowed)}',context);
 assert.equal(JSON.stringify(context.result.roles),JSON.stringify(staff?[false,true,true,false,false]:[true,false,false,false,false]));
 assert.equal(context.result.key.includes('-student-auth-token'),!staff);
 }
});
const ledger=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('student-house-portal/ledger.js','utf8')).toString('base64'));
test('charge balances exclude reversed allocations and retain partial payments',()=>{
 assert.equal(ledger.cents('0.29'),29);assert.throws(()=>ledger.cents('1.001'));
 const charge={id:'c',amount:'100.00'},allocations=[{charge_id:'c',payment_id:'p',amount:'30.00'},{charge_id:'c',payment_id:'q',amount:'20.00'}];
 assert.deepEqual(ledger.chargeBalance(charge,allocations,[{payment_id:'p'}]),{paid:2000,remaining:8000});
});
