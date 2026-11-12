// Existing authenticated client; RLS and audit triggers authorize every room mutation.
export function parseCSV(text) {
 const rows=[];let row=[],cell='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 const delimiter=text.split(/\r?\n/,1)[0].includes(';')?';':',';
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell)throw Error('csv');else quoted=!quoted;}
  else if(c===delimiter&&!quoted){row.push(cell);cell='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(quoted)throw Error('csv');
 row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 return rows;
}
export const csvCell=value=>'"'+String(value??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';
export function validateRoomImport(text,existing){
 const rows=parseCSV(text),header=rows.shift();
 if(!header||header.join(';')!=='name;category;capacity'||!rows.length||rows.length>64)throw Error('header');
 const seen=new Set(existing.map(r=>r.name.trim().toLocaleLowerCase()));
 return rows.map(row=>{
  const [name,category,cap]=row.map(x=>x.trim());
  if(row.length!==3||!name||name.length>100||!category||category.length>100||!/^\d+$/.test(cap)||Number(cap)<1||Number(cap)>20||seen.has(name.toLocaleLowerCase()))throw Error('row');
  seen.add(name.toLocaleLowerCase());return {name,category,capacity:Number(cap)};
 });
}
export function roomRows(rooms,tenancies,residents,today){
 const people=new Map(residents.map(p=>[p.id,p]));
 return rooms.map(room=>{
  const stays=tenancies.filter(t=>t.room_id===room.id&&t.starts_on<=today&&t.ends_on>=today);
  return {...room,stays:stays.map(t=>({...t,person:people.get(t.resident_id)})),occupancy:stays.length===0?'free':stays.length>=room.capacity?'full':'partial'};
 });
}
const words={
 sk:['SPRÁVA IZIEB – 64 IZIEB','Hľadať izbu alebo študenta','Všetky','Voľné','Obsadené','Čiastočne obsadené','Izba','Typ','Kapacita','Obsadenosť','Študent','E-mail','Zmluva','Príchod','Odchod','Nájomné','Export CSV','Import nových izieb','Uložiť','Zrušiť','Číslo a údaje vyžadujú potvrdenie správcom','Zmenu sa nepodarilo uložiť. Obnovte prehľad.','Import vyžaduje hlavičku name;category;capacity, unikátne nové izby a kapacitu 1–20. Existujúce izby sa neprepisujú.','Importovať overené nové izby?','Úprava','Aktuálna obsadenosť podľa dnešného dátumu; nepriradené evidenčné pozície nie sú potvrdené voľné izby.'],
 en:['ROOM MANAGEMENT – 64 ROOMS','Search room or student','All','Available','Occupied','Partially occupied','Room','Type','Capacity','Occupancy','Student','Email','Contract','Arrival','Departure','Rent','Export CSV','Import new rooms','Save','Cancel','Room number and details require administrator confirmation','Unable to save. Refresh the list.','Import requires name;category;capacity, unique new rooms and capacity 1–20. Existing rooms are never overwritten.','Import validated new rooms?','Edit','Current occupancy as of today; unconfirmed inventory positions are not confirmed available rooms.'],
 ru:['УПРАВЛЕНИЕ КОМНАТАМИ — 64 КОМНАТЫ','Поиск комнаты или студента','Все','Свободна','Занята','Частично занята','Комната','Тип','Мест','Занятость','Студент','Почта','Договор','Заезд','Выезд','Аренда','Экспорт CSV','Импорт новых комнат','Сохранить','Отмена','Номер и данные требуют подтверждения администратора','Не удалось сохранить. Обновите список.','Заголовок: name;category;capacity. Только новые уникальные комнаты, вместимость 1–20. Существующие комнаты не изменяются.','Импортировать проверенные новые комнаты?','Изменить','Занятость на сегодня. Неподтверждённые позиции не считаются свободными комнатами.'],
 uk:['КЕРУВАННЯ КІМНАТАМИ — 64 КІМНАТИ','Пошук кімнати або студента','Усі','Вільна','Зайнята','Частково зайнята','Кімната','Тип','Місць','Зайнятість','Студент','Пошта','Договір','Заїзд','Виїзд','Оренда','Експорт CSV','Імпорт нових кімнат','Зберегти','Скасувати','Номер і дані потребують підтвердження адміністратора','Не вдалося зберегти. Оновіть перелік.','Заголовок: name;category;capacity. Лише нові унікальні кімнати, місткість 1–20. Наявні кімнати не змінюються.','Імпортувати перевірені нові кімнати?','Змінити','Зайнятість на сьогодні. Непідтверджені позиції не є підтвердженими вільними кімнатами.']
};
export async function renderRoomGrid(ctx){
 const w=words[ctx.lang]||words.sk;
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const button=(text,fn)=>{const b=el('button',text);b.type='button';b.addEventListener('click',fn);return b;};
 const [rooms,stays,people,charges,allocations,reversals,files,cleaning]=await Promise.all(['rooms','tenancies','residents','rent_charges','payment_allocations','payment_reversals','residence_portal_files','cleaning_bookings'].map(table=>ctx.list(table)));
 if(!ctx.isCurrent())return;
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Bratislava',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const data=roomRows(rooms,stays,people,today);
 const extra=({sk:['Platby','Dokumenty','Upratovanie'],en:['Payments','Documents','Cleaning'],ru:['Платежи','Документы','Уборка'],uk:['Платежі','Документи','Прибирання']})[ctx.lang]||['Platby','Dokumenty','Upratovanie'];
 const financial=person=>{
  const ownCharges=charges.filter(c=>c.resident_id===person?.id),ids=new Set(ownCharges.map(c=>c.id));
  const reversed=new Set(reversals.map(r=>r.payment_id));
  const due=ownCharges.reduce((sum,c)=>sum+Math.round(Number(c.amount)*100),0);
  const paid=allocations.filter(a=>ids.has(a.charge_id)&&!reversed.has(a.payment_id)).reduce((sum,a)=>sum+Math.round(Number(a.amount)*100),0);
  return ownCharges.length?`${(paid/100).toFixed(2)} / ${(due/100).toFixed(2)}`:'—';
 };
 const details=r=>[
  r.stays.map(t=>financial(t.person)).join('\n'),
  r.stays.map(t=>files.filter(f=>f.active&&(f.resident_id===t.resident_id||f.user_id===t.person?.user_id)).map(f=>f.kind+': '+f.review_status).join(', ')||'—').join('\n'),
  r.stays.map(t=>cleaning.filter(c=>c.resident_id===t.resident_id).map(c=>c.status+' '+(c.scheduled_at||c.preferred_date||'')).join(', ')||'—').join('\n')
 ];
 const root=el('section');root.className='room-grid';ctx.root.append(root);
 root.append(el('h3',w[0]),el('p',w[25]));
 const summary=el('p',`64 · ${w[6]}: ${rooms.length} · ${w[4]}: ${data.filter(r=>r.occupancy==='full').length} · ${w[3]}: ${data.filter(r=>r.occupancy==='free').length} · ${w[10]}: ${data.reduce((n,r)=>n+r.stays.length,0)}`);root.append(summary);
 const search=el('input');search.type='search';search.placeholder=w[1];search.setAttribute('aria-label',w[1]);
 const filter=el('select');filter.setAttribute('aria-label',w[9]);
 for(const [value,label] of [['all',w[2]],['free',w[3]],['full',w[4]],['partial',w[5]]]){const o=el('option',label);o.value=value;filter.append(o);}
 const sort=el('select');sort.setAttribute('aria-label',w[6]);
 for(const [value,label] of [['name',w[6]],['occupancy',w[9]],['starts_on',w[13]],['ends_on',w[14]]]){const o=el('option',label);o.value=value;sort.append(o);}
 const notice=el('p');notice.setAttribute('role','status');
 const wrap=el('div');wrap.style.overflowX='auto';wrap.tabIndex=0;wrap.setAttribute('aria-label',w[0]);
 const table=el('table');table.style.minWidth='1150px';wrap.append(table);
 const headers=w.slice(6,16).concat(extra,w[24]);
 const exportCSV=button(w[16],()=>{
  const records=[headers.slice(0,-1),...visible().flatMap(r=>r.stays.length?r.stays.map(t=>[r.name,r.category,r.capacity,r.occupancy,t.person?.full_name,t.person?.email,t.person?.verified_contract_number,t.starts_on,t.ends_on,t.rent,...details({...r,stays:[t]})]):[[r.name,r.category,r.capacity,r.occupancy]])];
  const url=URL.createObjectURL(new Blob(['\uFEFF'+records.map(r=>r.map(csvCell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=el('a');a.href=url;a.download='student-house-rooms.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 const upload=el('input');upload.type='file';upload.accept='.csv,text/csv';upload.setAttribute('aria-label',w[17]);
 upload.addEventListener('change',async()=>{
  const file=upload.files[0];if(!file||!ctx.isCurrent())return;
  try{if(file.size>100000)throw Error('size');const rows=validateRoomImport(await file.text(),rooms);if(!confirm(w[23]+' '+rows.length))return;
   upload.disabled=true;const {data:added,error}=await ctx.db.from('rooms').insert(rows.map(r=>({...r,tenant_id:ctx.tenant}))).select('id');
   if(error||added?.length!==rows.length)throw Error('save');if(ctx.isCurrent())ctx.refresh();
  }catch{notice.textContent=w[22];}finally{upload.disabled=false;upload.value='';}
 });
 root.append(search,filter,sort,exportCSV,el('p',w[22]),upload,notice,wrap);
 function visible(){return data.filter(r=>(filter.value==='all'||r.occupancy===filter.value)&&[r.name,...r.stays.flatMap(t=>[t.person?.full_name,t.person?.email,t.person?.verified_contract_number])].join(' ').toLocaleLowerCase().includes(search.value.toLocaleLowerCase())).sort((a,b)=>String(sort.value==='name'?a.name:sort.value==='occupancy'?a.occupancy:a.stays[0]?.[sort.value]||'').localeCompare(String(sort.value==='name'?b.name:sort.value==='occupancy'?b.occupancy:b.stays[0]?.[sort.value]||''),ctx.lang,{numeric:true}));}
 function paint(){
  table.replaceChildren();const head=el('thead'),tr=el('tr');for(const title of headers){const th=el('th',title);th.scope='col';tr.append(th);}head.append(tr);table.append(head);const body=el('tbody');table.append(body);
  for(const r of visible()){
   const line=el('tr');const cells=[r.name,r.category,r.capacity,w[r.occupancy==='free'?3:r.occupancy==='full'?4:5],...['full_name','email','verified_contract_number'].map(k=>r.stays.map(t=>t.person?.[k]||'—').join('\n')),...['starts_on','ends_on','rent'].map(k=>r.stays.map(t=>t[k]).join('\n'))];
   cells.push(...details(r));
   cells.forEach(value=>{const td=el('td',String(value??''));td.style.whiteSpace='pre-line';line.append(td);});
   const action=el('td');action.append(button(w[24],()=>edit(r,line)));line.append(action);body.append(line);
  }
  if(!search.value&&filter.value==='all')for(let i=rooms.length;i<64;i++){const line=el('tr'),cell=el('td',`#${i+1} — ${w[20]}`);cell.colSpan=headers.length;line.append(cell);body.append(line);}
 }
 function edit(r,line){
  const name=el('input');name.value=r.name;name.maxLength=100;name.setAttribute('aria-label',w[6]);
  const category=el('input');category.value=r.category;category.maxLength=100;category.setAttribute('aria-label',w[7]);
  const capacity=el('input');capacity.type='number';capacity.min='1';capacity.max='20';capacity.value=r.capacity;capacity.setAttribute('aria-label',w[8]);
  [name,category,capacity].forEach((input,i)=>line.children[i].replaceChildren(input));
  const save=button(w[18],async()=>{
   if(!ctx.isCurrent())return;
   if(!name.value.trim()||!category.value.trim()||!Number.isInteger(Number(capacity.value))||Number(capacity.value)<Math.max(1,r.stays.length)||Number(capacity.value)>20){notice.textContent=w[21];return;}
   save.disabled=true;
   const {data:updated,error}=await ctx.db.from('rooms').update({name:name.value.trim(),category:category.value.trim(),capacity:Number(capacity.value)}).eq('id',r.id).eq('tenant_id',ctx.tenant).eq('name',r.name).eq('category',r.category).eq('capacity',r.capacity).select('id');
   if(!ctx.isCurrent())return;
   if(error||updated?.length!==1){notice.textContent=w[21];save.disabled=false;return;}ctx.refresh();
  });line.lastChild.replaceChildren(save,button(w[19],paint));
 }
 [search,filter,sort].forEach(n=>n.addEventListener('input',paint));paint();
}
