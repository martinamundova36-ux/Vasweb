import {test} from 'node:test';
import assert from 'node:assert/strict';
import {advanceRentDueDate,paymentHighlightRows,chargeBalance} from '../student-house-portal/ledger.js';

test('Rent is due in advance, including the year boundary and leap February',()=>{
 assert.equal(advanceRentDueDate('2026-12'),'2026-11-01');
 assert.equal(advanceRentDueDate('2027-01'),'2026-12-01');
 assert.equal(advanceRentDueDate('2028-03',28),'2028-02-28');
 for(const period of ['2026-00','2026-13','2026-1','invalid'])assert.throws(()=>advanceRentDueDate(period));
 for(const day of [0,29,1.5,NaN])assert.throws(()=>advanceRentDueDate('2026-12',day));
});
test('November dashboard includes December rent due on 1 November',()=>{
 const rows=[{id:'nov',period:'2026-11',due_on:'2026-10-01',remaining:0},{id:'dec',period:'2026-12',due_on:'2026-11-01',remaining:30000},{id:'jan',period:'2027-01',due_on:'2026-12-01',remaining:30000}];
 assert.deepEqual(paymentHighlightRows(rows,'2026-11-13').map(r=>r.id),['dec']);
 assert.equal(rows[0].id,'nov');
 rows[1].remaining=0;
 assert.deepEqual(paymentHighlightRows(rows,'2026-11-13').map(r=>r.id),['jan']);
});
test('Partial payment stays visible; reversed payments reopen the balance',()=>{
 const charge={id:'dec',period:'2026-12',due_on:'2026-11-01',amount:'300.00'};
 const allocations=[{charge_id:'dec',payment_id:'p',amount:'100.00'}];
 assert.equal(chargeBalance(charge,allocations,[]).remaining,20000);
 assert.equal(chargeBalance(charge,allocations,[{payment_id:'p'}]).remaining,30000);
 assert.equal(paymentHighlightRows([{...charge,...chargeBalance(charge,allocations,[])}],'2026-11-13').length,1);
});
test('Paid charge due this month remains visible when nothing is outstanding',()=>{
 const rows=[{period:'2026-12',due_on:'2026-11-01',remaining:0},{period:'2026-11',due_on:'2026-10-01',remaining:0}];
 assert.deepEqual(paymentHighlightRows(rows,'2026-11-13'),[rows[0]]);
 assert.deepEqual(paymentHighlightRows([],'2026-11-13'),[]);
});
