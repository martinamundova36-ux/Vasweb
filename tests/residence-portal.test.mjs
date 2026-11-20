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
