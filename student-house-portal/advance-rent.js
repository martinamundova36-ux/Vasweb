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
