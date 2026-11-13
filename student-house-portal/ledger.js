export function cents(value){
 const m=String(value).match(/^(\d+)(?:\.(\d{1,2}))?$/);if(!m)throw Error('invalid_money');
 const n=Number(m[1])*100+Number((m[2]||'').padEnd(2,'0'));if(!Number.isSafeInteger(n))throw Error('invalid_money');return n;
}
export function chargeBalance(charge,allocations,reversals){
 const reversed=new Set(reversals.map(r=>r.payment_id));
 const paid=allocations.filter(a=>a.charge_id===charge.id&&!reversed.has(a.payment_id)).reduce((n,a)=>n+cents(a.amount),0);
 return {paid,remaining:cents(charge.amount)-paid};
}

// Verified money is distributed to agreed installments by due date, with stable ties.
export function installmentBalances(items,paid){
 let available=paid;
 return [...items].sort((a,b)=>String(a.due_on).localeCompare(String(b.due_on))||String(a.id).localeCompare(String(b.id))).map(item=>{
  const amount=cents(item.amount),received=Math.min(amount,Math.max(0,available));available-=received;
  return {...item,paid:received,remaining:amount-received};
 });
}

// Calendar arithmetic uses UTC only for date-only values; no DST-sensitive durations.
export function advanceRentDueDate(period, dueDay=1){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)||!Number.isInteger(dueDay)||dueDay<1||dueDay>28)throw Error('invalid_schedule_date');
 const [year,month]=period.split('-').map(Number);
 if(year<1000||year>9999)throw Error('invalid_schedule_date');
 return new Date(Date.UTC(year,month-2,dueDay)).toISOString().slice(0,10);
}
// Highlight the oldest unpaid due date, including rent payable one month ahead.
export function paymentHighlightRows(rows,today){
 const unpaid=rows.filter(r=>r.remaining>0).sort((a,b)=>String(a.due_on).localeCompare(String(b.due_on))||String(a.period).localeCompare(String(b.period)));
 if(unpaid.length)return unpaid.filter(r=>r.due_on===unpaid[0].due_on);
 return rows.filter(r=>String(r.due_on).slice(0,7)===today.slice(0,7));
}
