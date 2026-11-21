// Calendar months covered by the verified contract, using the same inclusive-month
// convention as residence_approve_registration_verified. No financial rows are created here.
export function stayPeriods(from,to){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||!/^\d{4}-\d{2}-\d{2}$/.test(to||'')||to<from)return [];
 for(const value of [from,to]){
  const d=new Date(value+'T12:00:00Z');
  if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==value)return [];
 }
 let [y,m]=from.slice(0,7).split('-').map(Number);
 const [ey,em]=to.slice(0,7).split('-').map(Number);
 const span=(ey-y)*12+em-m+1;
 if(span<1||span>121)return [];
 const rows=[];
 for(let i=0;i<span;i++){
  rows.push(String(y).padStart(4,'0')+'-'+String(m).padStart(2,'0'));
  if(++m===13){m=1;y++;}
 }
 return rows;
}
export function missingStayRentMonths(tenancies=[],charges=[]){
 const seen=new Set(),existing=new Set(charges.filter(c=>c.kind==='rent').map(c=>c.tenant_id+':'+c.resident_id+':'+c.period));
 const missing=[];
 for(const stay of tenancies){
  for(const period of stayPeriods(stay.starts_on,stay.ends_on)){
   const key=stay.tenant_id+':'+stay.resident_id+':'+period;
   if(seen.has(key)||existing.has(key))continue;
   seen.add(key);missing.push({tenant_id:stay.tenant_id,resident_id:stay.resident_id,period,stay});
  }
 }
 return missing.sort((a,b)=>a.period.localeCompare(b.period));
}
