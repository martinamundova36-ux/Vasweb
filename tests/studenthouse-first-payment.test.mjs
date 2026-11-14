import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {operationalSheets} from '../student-house-portal/operational-export.js';

const column=(sheet,label)=>sheet.rows[1][sheet.rows[0].indexOf(label)];
const base={
 residents:[{id:'synthetic',full_name:'Test Student',email:'synthetic@example.invalid',verified_room_number:'124',accommodation_from:'2027-01-01'}],
 enquiries:[{resident_id:'synthetic',date_of_birth:'2001-02-01',gender:'female',nationality:'SK',telephone:'000',permanent_address:'Test Street',identity_document_number:'TEST',school:'Test University',preferred_room_type:'M2',preferred_duration_months:5,preferred_from:'2027-01-01',preferred_to:'2027-06-01',own_refrigerator:false}],
 tenancies:[{resident_id:'synthetic',rent:300,starts_on:'2027-01-01'}],
 details:[{resident_id:'synthetic',deposit_eur:600,administration_fee_eur:100}],
 charges:[
  {id:'rent',resident_id:'synthetic',kind:'rent',period:'2027-01',amount:300,due_on:'2026-12-01'},
  {id:'deposit',resident_id:'synthetic',kind:'deposit',period:'2027-01',amount:600,due_on:'2026-12-01'},
  {id:'admin',resident_id:'synthetic',kind:'administration_fee',period:'2027-01',amount:100,due_on:'2026-12-01'}
 ],
 allocations:[{charge_id:'rent',payment_id:'payment',amount:300}],
 reversals:[]
};
test('first payment combines first rent, refundable 2x-rent deposit and 100 euro admin charge',()=>{
 const sheet=operationalSheets(base)[0];
 assert.equal(column(sheet,'Mesačné nájomné EUR'),300);
 assert.equal(column(sheet,'Depozit EUR'),600);
 assert.equal(column(sheet,'Admin poplatok EUR'),100);
 assert.equal(column(sheet,'Prvá platba predpis EUR'),1000);
 assert.equal(column(sheet,'Prvá platba uhradené EUR'),300);
 assert.equal(column(sheet,'Prvá platba zostáva EUR'),700);
 assert.equal(column(sheet,'Vlastná chladnička'),'Nie');
 assert.equal(column(sheet,'Chýbajúce povinné polia'),'Kompletné');
});
test('incomplete answers remain visibly missing and are not fabricated',()=>{
 const incomplete={...base,enquiries:[{...base.enquiries[0],gender:'',own_refrigerator:null}]};
 const sheet=operationalSheets(incomplete)[0];
 assert.match(column(sheet,'Chýbajúce povinné polia'),/pohlavie/);
 assert.match(column(sheet,'Chýbajúce povinné polia'),/vlastná chladnička/);
 assert.equal(column(sheet,'Vlastná chladnička'),'Nezadané');
});
test('approved registrations create identifiable deposit and fee charges, not fake payments',()=>{
 const sql=fs.readFileSync('student-house-portal/supabase/migrations/20261114180000_first_payment_and_own_refrigerator.sql','utf8');
 assert.match(sql,/round\(p_monthly_rent\*2,2\)/);
 assert.match(sql,/'deposit'/);
 assert.match(sql,/'administration_fee',100/);
 assert.match(sql,/first_due_on/);
 assert.doesNotMatch(sql,/insert into public.payments\s*\(/i);
});
