import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {Script} from 'node:vm';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const portal=readFileSync(resolve(root,'student-house-portal/index.html'),'utf8');
const backend=readFileSync(resolve(root,'supabase/functions/register-student/index.ts'),'utf8');

test('login offers student, registration and reception destinations',()=>{
  for(const id of ['entryChooser','chooseStudent','chooseStaff','chooseRegistration']){
    assert.match(portal,new RegExp('id="'+id+'"'));
  }
});

test('students cannot choose room number before reception assigns it',()=>{
  assert.doesNotMatch(portal,/id="regRoom"/);
  assert.doesNotMatch(portal,/\$\(['"]regRoom['"]\)/);
  assert.match(portal,/room_number:''/);
  assert.match(backend,/const room_number=asText\(body\.room_number,30\)/);
  assert.doesNotMatch(backend,/room_number\.length\s*<\s*1/);
});

test('stay dates and expected arrival are submitted in registration',()=>{
  for(const id of ['regFrom','regTo','regArrival'])assert.match(portal,new RegExp('id="'+id+'"'));
  assert.match(portal,/expected_arrival:\$\("regArrival"\)\.value/);
  assert.match(backend,/expected_arrival:arrival/);
});

test('inline portal JavaScript parses without syntax errors',()=>{
  const scripts=[...portal.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length>0);
  for(const [,code] of scripts)new Script(code,{filename:'student-house-portal/index.html'});
});

test('every statically referenced DOM ID exists',()=>{
  const ids=new Set([...portal.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map(m=>m[1]));
  const referenced=[...portal.matchAll(/\$\(\s*["']([^"']+)["']\s*\)/g)].map(m=>m[1]);
  const missing=[...new Set(referenced.filter(id=>!ids.has(id)))];
  assert.deepEqual(missing,[]);
});

test('generated staff and student entry pages match registration security',()=>{
  for(const entry of ['student','admin']){
    const page=readFileSync(resolve(root,'student-house-portal',entry,'index.html'),'utf8');
    assert.doesNotMatch(page,/id="regRoom"/);
    assert.doesNotMatch(page,/\$\(['"]regRoom['"]\)/);
    assert.match(page,/room_number:''/);
    for(const [,code] of page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)){
      new Script(code,{filename:entry+'/index.html'});
    }
  }
});

test('documents map questionnaire passport number and refund IBAN without inventing values',async()=>{
  const code=readFileSync(resolve(root,'student-house-portal/residence-document.js'),'utf8');
  const mod=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
  const contract=mod.fieldsForDocument('contract_draft',{}, {identity_document_number:'TEST-PASSPORT'});
  assert.equal(contract.passport_number,'TEST-PASSPORT');
  assert.ok(mod.documentFields.contract_draft.includes('passport_number'));
  const refund=mod.fieldsForDocument('deposit_template',{}, {iban:'TEST-IBAN'});
  assert.equal(refund.refund_iban,'TEST-IBAN');
  assert.equal(mod.fieldsForDocument('deposit_template',{},{}).refund_iban,undefined);
});

test('reception register loads registration data and never treats planned arrival as confirmed',()=>{
  const source=readFileSync(resolve(root,'student-house-portal/room-register.js'),'utf8');
  assert.match(source,/'registration_enquiries'\]\.map/);
  assert.match(source,/reg\.contract_number===person\.verified_contract_number/);
  assert.match(source,/e\.registration_id===reg\.id&&e\.tenant_id===person\.tenant_id/);
  assert.doesNotMatch(source,/actual_arrival_on\s*:\s*(?:q|reg|verifiedRegistration)\./);
});
