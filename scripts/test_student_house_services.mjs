import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bratislavaInstant,bratislavaLocalDateTime,serviceStates,cleaningStates,serviceWords} from '../student-house-portal/service-requests.js';
test('Reception appointments use Bratislava time regardless of computer timezone',()=>{
 assert.equal(bratislavaInstant('2026-11-20T10:00'),'2026-11-20T09:00:00.000Z');
 assert.equal(bratislavaInstant('2027-07-20T10:00'),'2027-07-20T08:00:00.000Z');
 assert.equal(bratislavaLocalDateTime('2027-07-20T08:00:00Z'),'2027-07-20T10:00');
 assert.throws(()=>bratislavaInstant('2027-03-28T02:30'));
 assert.throws(()=>bratislavaInstant('2026-02-30T10:00'));
});
test('All four portal languages cover operational states',()=>{
 for(const lang of ['sk','en','ru','uk']){
  const t=serviceWords(lang);for(const state of [...serviceStates,...cleaningStates])assert.ok(t.statuses[state],lang+': '+state);
  assert.notEqual(t.public,t.internal);
 }
});
