export function cents(value){
 const m=String(value).match(/^(\d+)(?:\.(\d{1,2}))?$/);if(!m)throw Error('invalid_money');
 const n=Number(m[1])*100+Number((m[2]||'').padEnd(2,'0'));if(!Number.isSafeInteger(n))throw Error('invalid_money');return n;
}
export function chargeBalance(charge,allocations,reversals){
 const reversed=new Set(reversals.map(r=>r.payment_id));
 const paid=allocations.filter(a=>a.charge_id===charge.id&&!reversed.has(a.payment_id)).reduce((n,a)=>n+cents(a.amount),0);
 return {paid,remaining:cents(charge.amount)-paid};
}
