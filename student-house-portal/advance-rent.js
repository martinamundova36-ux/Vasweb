const monthKey=(year,month)=>String(year).padStart(4,'0')+'-'+String(month+1).padStart(2,'0');
export function advanceSchedule(tenancy,firstDue){
 const start=tenancy.starts_on,end=tenancy.ends_on,rent=Math.round(Number(tenancy.rent)*100);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end)||end<=start||
    !Number.isSafeInteger(rent)||rent<=0||!/^\d{4}-\d{2}-\d{2}$/.test(firstDue)||firstDue>=start)return [];
 const [year,month]=start.split('-').map(Number),startMonth=monthKey(year,month-1);
 const rows=[{due_on:firstDue,amount:(rent*3+10000)/100,period:startMonth,
  description:'Nájom '+startMonth+' + depozit 2× nájom + administratívny poplatok 100 €'}];
 for(let offset=1;offset<=120;offset++){
  const d=new Date(Date.UTC(year,month-1+offset,1)),prev=new Date(Date.UTC(year,month-2+offset,1));
  const period=monthKey(d.getUTCFullYear(),d.getUTCMonth());
  if(period+'-01'>=end)return rows;
  rows.push({due_on:monthKey(prev.getUTCFullYear(),prev.getUTCMonth())+'-01',amount:rent/100,period,description:'Nájom '+period});
 }
 return [];
}

export function applyAgreedRentSplits(schedule,charges,plans,items){
 const cents=value=>Math.round(Number(value)*100);
 return schedule.flatMap((entry,index)=>{
  const matches=plans.filter(plan=>charges.some(charge=>charge.id===plan.charge_id&&charge.kind==='rent'&&charge.period===entry.period));
  if(!matches.length)return [entry];
  if(matches.length!==1||index===0)throw Error('Skontroluj schválený plán pre nájom '+entry.period+'.');
  const plan=matches[0],related=items.filter(item=>item.plan_id===plan.id);
  if(!related.length||related.some(item=>!/^\d{4}-\d{2}-\d{2}$/.test(item.due_on)||!(cents(item.amount)>0))||
     related.reduce((sum,item)=>sum+cents(item.amount),0)!==cents(entry.amount))throw Error('Sumy schválenej dohody pre nájom '+entry.period+' treba skontrolovať.');
  const byDate=new Map();
  for(const item of related)byDate.set(item.due_on,(byDate.get(item.due_on)||0)+cents(item.amount));
  return [...byDate].sort(([a],[b])=>a.localeCompare(b)).map(([due_on,amount])=>({
   ...entry,due_on,amount:amount/100,description:entry.description+' · dohodnutá splatnosť'
  }));
 }).sort((a,b)=>a.due_on.localeCompare(b.due_on));
}
