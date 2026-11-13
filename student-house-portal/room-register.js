import {chargeBalance, cents} from './ledger.js';
import {csvCell,validateRoomImport} from './rooms.js';

const EXPECTED_ROOMS=64;
const labels={
sk:{seq:'Č.',beds:'Lôžka',bedHelp:'Každé lôžko má vlastný riadok. Priradenie študenta ku konkrétnemu lôžku vyžaduje overenie recepciou.',title:'EVIDENCIA UBYTOVANIA – EXCEL PREHĽAD',desc:'Všetky izby na jednom mieste. Mesiace posúvaj doprava; zobrazené sú iba overené predpisy a prijaté platby.',room:'Číslo izby',category:'Typ izby',capacity:'Kapacita',nationality:'Národnosť',gender:'Pohlavie',telephone:'Telefón',first:'Meno',last:'Priezvisko',email:'E-mail',contract:'Číslo zmluvy',from:'Od',to:'Do',arrival:'Skutočný príchod',total:'Spolu za rok',action:'Údaje',missing:'Neoverená izba',placeholder:'Zatiaľ neevidovaná izba – doplň jej skutočné číslo a typ.',known:'Evidovaných izieb',missingCount:'Neoverené izby',search:'Hľadať izbu, meno alebo e-mail',year:'Rok splátkového kalendára',csv:'Stiahnuť Excel (CSV)',save:'Uložiť',cancel:'Zrušiť',edit:'Upraviť',open:'Profil',load:'Načítavam…',empty:'Žiadne záznamy podľa filtra.',due:'Na úhradu',late:'Po splatnosti',paid:'Uhradené',partial:'Čiastočne uhradené',plan:'Dohodnuté splátky',missingCharge:'Bez predpisu',notApplicable:'—',sum:'Predpis / uhradené',remaining:'zostáva',editHelp:'Údaje o zmluve, mene, e-maile a platbách sa menia len po overení recepciou. Tu môžeš doplniť národnosť a reálny príchod.',nationalityHelp:'Zadaj len overený údaj, neodhaduj ho podľa mena.',saveError:'Údaje sa nepodarilo uložiť. Skontroluj oprávnenia a pripojenie.',saveOk:'Údaje boli uložené.',importLabel:'Import nových izieb (CSV)',importHelp:'Súbor musí obsahovať name;category;capacity. Importuje iba nové a overené izby.',importConfirm:'Importovať nové izby?',importFail:'Import sa nepodaril. Skontroluj formát a duplicity.',importOver:'Počet evidovaných izieb by prekročil 64. Over skutočný zoznam.',filter:'Zobrazených izieb'},
en:{seq:'No.',beds:'Beds',bedHelp:'Every bed has its own row. A specific bed assignment must be verified by reception.',title:'ACCOMMODATION REGISTER – EXCEL VIEW',desc:'All rooms in one register. Scroll horizontally to see the months; only verified charges and payments are shown.',room:'Room',category:'Room type',capacity:'Beds',nationality:'Nationality',gender:'Gender',telephone:'Telephone',first:'First name',last:'Last name',email:'E-mail',contract:'Contract',from:'From',to:'To',arrival:'Actual arrival',total:'Year total',action:'Details',missing:'Unverified room',placeholder:'Room not yet verified – add its real room number and type.',known:'Recorded rooms',missingCount:'Rooms to verify',search:'Search room, resident or email',year:'Payment calendar year',csv:'Download Excel (CSV)',save:'Save',cancel:'Cancel',edit:'Edit',open:'Profile',load:'Loading…',empty:'No matching records.',due:'Due',late:'Overdue',paid:'Paid',partial:'Partly paid',plan:'Approved installments',missingCharge:'No charge',notApplicable:'—',sum:'Charged / paid',remaining:'remaining',editHelp:'Names, contracts, email and payments are changed only after reception verification. Nationality and actual arrival can be added here.',nationalityHelp:'Enter verified information only; do not infer nationality from a name.',saveError:'Could not save. Check access and connection.',saveOk:'Saved.',importLabel:'Import new rooms (CSV)',importHelp:'File format: name;category;capacity. Only new verified rooms are added.',importConfirm:'Import verified rooms?',importFail:'Import failed. Check format and duplicates.',importOver:'This would exceed the expected 64 rooms. Verify the room list.',filter:'Rooms shown'},
ru:{seq:'№',beds:'Мест',bedHelp:'Каждому месту выделена отдельная строка; назначение конкретного места проверяет ресепшен.',title:'РЕЕСТР ПРОЖИВАНИЯ — ТАБЛИЦА',desc:'Все комнаты в одной таблице. Месяцы находятся справа; показываются только проверенные начисления и оплаты.',room:'Комната',category:'Тип комнаты',capacity:'Мест',nationality:'Гражданство',gender:'Пол',telephone:'Телефон',first:'Имя',last:'Фамилия',email:'Почта',contract:'Договор',from:'С',to:'По',arrival:'Фактический заезд',total:'Всего за год',action:'Данные',missing:'Не проверено',placeholder:'Неподтверждённая комната — укажите фактический номер и тип.',known:'В базе',missingCount:'Требуют проверки',search:'Поиск комнаты, имени или почты',year:'Год графика',csv:'Скачать Excel (CSV)',save:'Сохранить',cancel:'Отмена',edit:'Изменить',open:'Профиль',load:'Загрузка…',empty:'Нет записей.',due:'К оплате',late:'Просрочено',paid:'Оплачено',partial:'Частично оплачено',plan:'Согласованные платежи',missingCharge:'Нет начисления',notApplicable:'—',sum:'Начислено / оплачено',remaining:'осталось',editHelp:'Имя, договор, почту и оплаты рецепция исправляет после проверки. Здесь можно добавить гражданство и дату заезда.',nationalityHelp:'Только проверенные данные.',saveError:'Не удалось сохранить.',saveOk:'Сохранено.',importLabel:'Импорт комнат (CSV)',importHelp:'name;category;capacity, только новые проверенные комнаты.',importConfirm:'Импортировать комнаты?',importFail:'Ошибка импорта.',importOver:'Более 64 комнат. Проверьте список.',filter:'Комнат показано'},
uk:{seq:'№',beds:'Ліжка',bedHelp:'Кожне ліжко має окремий рядок; призначення конкретного ліжка перевіряє рецепція.',title:'РЕЄСТР ПРОЖИВАННЯ — ТАБЛИЦЯ',desc:'Усі кімнати в одному реєстрі. Місяці праворуч, лише перевірені нарахування й оплати.',room:'Кімната',category:'Тип кімнати',capacity:'Місць',nationality:'Громадянство',gender:'Стать',telephone:'Телефон',first:'Ім’я',last:'Прізвище',email:'Пошта',contract:'Договір',from:'З',to:'До',arrival:'Фактичний приїзд',total:'Усього за рік',action:'Дані',missing:'Не перевірено',placeholder:'Непідтверджена кімната — додайте фактичний номер і тип.',known:'У базі',missingCount:'Потрібно перевірити',search:'Пошук кімнати, імені або пошти',year:'Рік графіка',csv:'Завантажити Excel (CSV)',save:'Зберегти',cancel:'Скасувати',edit:'Змінити',open:'Профіль',load:'Завантаження…',empty:'Немає записів.',due:'До сплати',late:'Прострочено',paid:'Сплачено',partial:'Частково сплачено',plan:'Узгоджені платежі',missingCharge:'Без нарахування',notApplicable:'—',sum:'Нараховано / сплачено',remaining:'залишилось',editHelp:'Ім’я, договір, пошту і платежі змінюють тільки після перевірки рецепції. Тут можна додати громадянство і дату приїзду.',nationalityHelp:'Вносьте лише перевірені дані.',saveError:'Не вдалося зберегти.',saveOk:'Збережено.',importLabel:'Імпорт кімнат (CSV)',importHelp:'name;category;capacity, лише нові перевірені кімнати.',importConfirm:'Імпортувати?',importFail:'Помилка імпорту.',importOver:'Більше 64 кімнат. Перевірте перелік.',filter:'Показано кімнат'}
};
const genderName=(value,lang)=>{
 const names={sk:{female:'Žena',male:'Muž',other:'Neuvádza'},en:{female:'Female',male:'Male',other:'Not specified'},ru:{female:'Женщина',male:'Мужчина',other:'Не указано'},uk:{female:'Жінка',male:'Чоловік',other:'Не вказано'}};
 return (names[lang]||names.sk)[value]||'—';
};
const monthTitle=(year,month,lang)=>new Date(year,month-1,1).toLocaleDateString(lang==='en'?'en-GB':lang==='ru'?'ru-RU':lang==='uk'?'uk-UA':'sk-SK',{month:'short'});
const localDate=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Bratislava'});
const formatDate=(value,lang)=>value?new Date(String(value).slice(0,10)+'T12:00:00').toLocaleDateString(lang==='en'?'en-GB':'sk-SK'):'—';
const formatMoney=(n,lang)=>new Intl.NumberFormat(lang==='en'?'en-GB':'sk-SK',{style:'currency',currency:'EUR'}).format(Number(n)||0);
const key=(s)=>String(s||'').normalize('NFC').trim().toLocaleLowerCase();
const dateInYear=(from,to,year)=>(!from||from<=year+'-12-31')&&(!to||to>=year+'-01-01');
const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
const button=(value,fn,cls='btn-secondary')=>{const n=el('button',cls,value);n.type='button';n.addEventListener('click',fn);return n};
const cell=(value,cls)=>{const n=el('td',cls,value??'—');return n};
const displayNames=(person,request)=>{
 if(request?.first_name&&request?.last_name)return [request.first_name,request.last_name];
 const text=String(person?.full_name||'').trim(),first=text.split(/\s+/).shift()||'—';
 return [first,text.slice(first.length).trim()||'—'];
};

// Room order and bed labels are transcribed from the original register's last 19 rooms.
// A repeated label (e.g. 305 A) is a display label, not a verified assigned bed ID.
const VERIFIED_TAIL=['211','212','213','214','215','216','217','305','306','307','308','309','310','311','312','313','314','315','101'];
const VERIFIED_LABELS={
 '305':['305 A','305 A','305 B'],
 '306':['306 A','306 B'],'307':['307 A','307 B'],'308':['308 A','308 B'],
 '310':['310 A','310 B','310 B'],'311':['311 C','311 C','311 P'],
 '314':['314 1','314 1']
};
function sortedRooms(rooms) {
 const tail=new Set(VERIFIED_TAIL);
 const first=rooms.filter(r=>!tail.has(String(r.name))).sort((a,b)=>String(a.name).localeCompare(String(b.name),'sk',{numeric:true}));
 const byName=new Map(rooms.map(r=>[String(r.name),r]));
 return [...first,...VERIFIED_TAIL.map(name=>byName.get(name)).filter(Boolean)];
}
function bedName(room,index) {
 // The windowless room 101 is shown without a bed suffix in the source register.
 if(String(room.name)==='101')return '101';
 const known=VERIFIED_LABELS[String(room.name)];
 return known?.[index]||String(room.name)+' '+(index+1);
}
export function buildRegisterGroups({rooms=[],tenancies=[],residents=[],registrations=[],details=[],enquiries=[],year,expected=EXPECTED_ROOMS}){
 const firstDay=String(year)+'-01-01',lastDay=String(year)+'-12-31';
 const people=new Map(residents.map(x=>[x.id,x])),detailMap=new Map(details.map(x=>[x.resident_id,x])),questionMap=new Map(enquiries.map(x=>[x.resident_id,x]));
 const approved=registrations.filter(r=>r.status==='invited');
 const approvedFor=p=>approved.find(r=>r.contract_number&&r.contract_number===p.verified_contract_number&&key(r.email)===key(p.email))||approved.find(r=>key(r.email)===key(p.email)&&r.first_name);
 const sorted=sortedRooms(rooms);
 const groups=sorted.map((room,pos)=>{
  const stays=tenancies.filter(t=>t.room_id===room.id&&t.starts_on<=lastDay&&t.ends_on>=firstDay),seen=new Set();
  const entries=stays.flatMap(t=>{
   const person=people.get(t.resident_id);
   if(!person||seen.has(person.id))return [];
   seen.add(person.id);return [{person,stay:t,reg:approvedFor(person),detail:detailMap.get(person.id),enquiry:questionMap.get(person.id)}];
  });
  for(const person of residents){
   if(key(person.verified_room_number)!==key(room.name)||tenancies.some(t=>t.resident_id===person.id)||!dateInYear(person.accommodation_from,person.accommodation_to,String(year))||seen.has(person.id))continue;
   seen.add(person.id);entries.push({person,stay:null,reg:approvedFor(person),detail:detailMap.get(person.id),enquiry:questionMap.get(person.id)});
  }
  entries.sort((a,b)=>String(a.person.full_name).localeCompare(String(b.person.full_name),'sk'));
  const capacity=Math.max(1,Number(room.capacity)||1);
  // Preserve the three displayed rows in the original 305 (Š2+2) register;
  // its physical capacity remains 4 and is never silently changed.
  const sourceRows=String(room.name)==='305'?3:capacity;
  while(entries.length<sourceRows)entries.push({person:null,stay:null,reg:null,detail:null});
  entries.forEach((e,i)=>{e.bedIndex=i+1;e.bedLabel=i<sourceRows?bedName(room,i):String(room.name)+' · '+(i+1);e.verifiedBedLabel=!!VERIFIED_LABELS[String(room.name)]?.[i]});
  return {room,order:pos+1,entries,placeholder:false};
 });
 for(let i=groups.length;i<expected;i++)groups.push({room:{id:null,name:'#'+(i+1),category:'',capacity:null},order:i+1,entries:[{person:null,bedLabel:'#'+(i+1)}],placeholder:true});
 return groups;
}
function stayApplies(entry,period){
 if(!entry.person)return false;
 const from=entry.stay?.starts_on||entry.person.accommodation_from;
 const to=entry.stay?.ends_on||entry.person.accommodation_to;
 return !!from&&!!to&&from.slice(0,7)<=period&&to.slice(0,7)>=period;
}
export function periodLedger({entry,year,month,charges=[],allocations=[],reversals=[],plans=[]}){
 const period=String(year)+'-'+String(month).padStart(2,'0');
 if(!entry.person)return {kind:'none',charged:0,paid:0,remaining:0};
 const relevant=charges.filter(c=>c.resident_id===entry.person.id&&c.period===period&&c.kind==='rent');
 if(!relevant.length)return {kind:stayApplies(entry,period)?'missing':'none',charged:0,paid:0,remaining:0};
 let charged=0,paid=0,remaining=0;
 for(const item of relevant){const summary=chargeBalance(item,allocations,reversals);charged+=cents(item.amount);paid+=summary.paid;remaining+=summary.remaining;}
 const today=localDate();
 const hasPlan=plans.some(p=>relevant.some(c=>c.id===p.charge_id));
 const late=relevant.some(c=>c.due_on<today);
 const kind=remaining<=0?'paid':hasPlan?'plan':late?'late':paid>0?'partial':'due';
 return {kind,charged,paid,remaining,due:relevant.map(c=>c.due_on).sort()[0],count:relevant.length};
}
const monthCell=(state,lang,w)=>{
 const value=state.kind==='none'?'—':state.kind==='missing'?w.missingCharge:formatMoney(state.charged/100,lang);
 const c=cell(value,'month-cell month-'+state.kind);
 if(['paid','partial','due','late','plan'].includes(state.kind)){
  c.append(el('span','month-status-label',w[state.kind]));
  if(state.remaining>0&&state.remaining!==state.charged)c.append(el('span','month-status-label',formatMoney(state.remaining/100,lang)+' '+w.remaining));
  c.title=w.sum+': '+formatMoney(state.charged/100,lang)+' / '+formatMoney(state.paid/100,lang)+' · '+formatDate(state.due,lang);
 } else if(state.kind==='missing')c.title=w.missingCharge;
 return c;
};

export async function renderExcelRegister(ctx){
 const w=labels[ctx.lang]||labels.sk;
 const [rooms,tenancies,residents,registrations,details,enquiries,charges,allocations,reversals,plans]=await Promise.all(
  ['rooms','tenancies','residents','registration_requests','resident_staff_details','resident_enquiries','rent_charges','payment_allocations','payment_reversals','installment_plans'].map(name=>ctx.list(name))
 );
 if(!ctx.isCurrent())return;
 const root=el('section','room-register');
 const title=el('h3','',w.title),intro=el('p','muted',w.desc);
 const counter=el('p','room-register-count',w.known+': '+rooms.length+' / '+EXPECTED_ROOMS+' · '+w.beds+': '+rooms.reduce((total,r)=>total+(Number(r.capacity)||0),0)+(rooms.length<EXPECTED_ROOMS?' · '+w.missingCount+': '+(EXPECTED_ROOMS-rooms.length):''));
 const controls=el('div','room-register-controls');
 const search=el('input');search.type='search';search.placeholder=w.search;search.setAttribute('aria-label',w.search);
 const yearLabel=el('label','',w.year),yearSelect=el('select');yearSelect.setAttribute('aria-label',w.year);
 const nowYear=Number(localDate().slice(0,4));
 const yearSet=new Set([nowYear-1,nowYear,nowYear+1,nowYear+2,...tenancies.flatMap(t=>[Number(t.starts_on?.slice(0,4)),Number(t.ends_on?.slice(0,4))])].filter(y=>Number.isInteger(y)&&y>=2020&&y<=2100));
 for(const y of [...yearSet].sort((a,b)=>a-b)){const o=el('option','',String(y));o.value=String(y);o.selected=y===nowYear;yearSelect.append(o)}
 yearLabel.append(yearSelect);
 const exportButton=button(w.csv,()=>exportRows());
 controls.append(search,yearLabel,exportButton);
 const importArea=el('details','room-register-import');
 const summary=el('summary','',w.importLabel),help=el('p','muted',w.importHelp);
 const upload=el('input');upload.type='file';upload.accept='.csv,text/csv';upload.setAttribute('aria-label',w.importLabel);
 importArea.append(summary,help,upload);
 const notice=el('p','room-register-notice');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
 const wrap=el('div','room-register-scroll');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',w.title);
 const table=el('table','room-register-table');wrap.append(table);
 const count=el('p','muted');
 root.append(title,intro,counter,el('p','muted',w.bedHelp),controls,importArea,notice,count,wrap);ctx.root.append(root);
 const headings=[w.seq,w.room,w.category,w.capacity,w.nationality,w.gender,w.first,w.last,w.email,w.telephone,w.contract,w.from,w.to,w.arrival,...Array.from({length:12},(_,i)=>monthTitle(Number(yearSelect.value),i+1,ctx.lang)),w.total,w.action];
 let entries=[];
 const selectedYear=()=>Number(yearSelect.value)||nowYear;
 const lineValues=(group,entry)=>{
  const person=entry.person,stay=entry.stay;
  const [first,last]=displayNames(person,entry.reg);
  const sum=Array.from({length:12},(_,month)=>periodLedger({entry,year:selectedYear(),month:month+1,charges,allocations,reversals,plans}));
  const charged=sum.reduce((n,s)=>n+s.charged,0),paid=sum.reduce((n,s)=>n+s.paid,0);
  return {group,entry,first,last,sum,charged,paid,
   values:[group.order,entry.bedLabel||group.room.name,group.room.category||'—',group.room.capacity??'—',entry.detail?.nationality||entry.enquiry?.nationality||'—',genderName(entry.enquiry?.gender,ctx.lang),person?first:'—',person?last:'—',person?.email||'—',entry.enquiry?.telephone||'—',person?.verified_contract_number||'—',
    stay?.starts_on||person?.accommodation_from||'—',stay?.ends_on||person?.accommodation_to||'—',entry.detail?.actual_arrival_on||'—',
    ...sum.map(s=>s.kind==='none'?'—':s.kind==='missing'?w.missingCharge:formatMoney(s.charged/100,ctx.lang)+' / '+formatMoney(s.paid/100,ctx.lang)+' ('+w[s.kind]+')'),
    charged?formatMoney(charged/100,ctx.lang)+' / '+formatMoney(paid/100,ctx.lang):'—','']
  };
 };
 function filteredRows(){
  const all=buildRegisterGroups({rooms,tenancies,residents,registrations,details,enquiries,year:selectedYear()});
  const needle=key(search.value);
  return all.filter(g=>!needle||key([g.room.name,g.room.category,...g.entries.flatMap(e=>[e.bedLabel,e.person?.full_name,e.person?.email,e.person?.verified_contract_number])].join(' ')).includes(needle));
 }
 function paint(){
  if(!ctx.isCurrent())return;
  const groups=filteredRows();
  entries=groups.flatMap(g=>g.entries.map(e=>lineValues(g,e)));
  count.textContent=w.filter+': '+groups.length+' / '+Math.max(EXPECTED_ROOMS,rooms.length);
  headings.splice(14,12,...Array.from({length:12},(_,i)=>monthTitle(selectedYear(),i+1,ctx.lang)));
  table.replaceChildren();
  const header=el('thead'),headerLine=el('tr');
  headings.forEach(h=>{const th=el('th','',h);th.scope='col';headerLine.append(th);});header.append(headerLine);table.append(header);
  const body=el('tbody');table.append(body);
  if(!entries.length){const tr=el('tr'),td=cell(w.empty);td.colSpan=headings.length;tr.append(td);body.append(tr);return;}
  let groupNumber=-1;
  for(const record of entries){
   const {group,entry,first,last,sum,charged,paid}=record;
   const tr=el('tr',group.placeholder?'register-placeholder':group.order%2===0?'register-room-tinted':'register-room-clear');
   if(group!==entries[groupNumber]?.group){groupNumber=entries.indexOf(record);tr.classList.add('register-first');}
   tr.append(cell(group.order+'.','register-order'),cell((entry.bedLabel||group.room.name)+(group.placeholder?' · '+w.missing:''),'register-fixed-room'),cell(group.room.category||'—'),cell(group.room.capacity??'—'));
   tr.append(cell(entry.detail?.nationality||entry.enquiry?.nationality||'—'),cell(genderName(entry.enquiry?.gender,ctx.lang)),cell(entry.person?first:'—'),cell(entry.person?last:'—'));
   const email=cell(entry.person?.email||'—');email.classList.add('register-email');tr.append(email,cell(entry.enquiry?.telephone||'—'));
   tr.append(cell(entry.person?.verified_contract_number||'—'),cell(formatDate(entry.stay?.starts_on||entry.person?.accommodation_from,ctx.lang)),cell(formatDate(entry.stay?.ends_on||entry.person?.accommodation_to,ctx.lang)),cell(formatDate(entry.detail?.actual_arrival_on,ctx.lang)));
   for(const state of sum)tr.append(monthCell(state,ctx.lang,w));
   tr.append(cell(charged?formatMoney(charged/100,ctx.lang)+' / '+formatMoney(paid/100,ctx.lang):'—','register-total'));
   const action=el('td','register-actions');
   if(group.placeholder){action.append(el('span','muted',w.placeholder));}
   else if(entry.person){action.append(button(w.edit,()=>openEditor(action,entry)));if(ctx.openResidents)action.append(button(w.open,ctx.openResidents));}
   else action.append(el('span','muted','—'));
   tr.append(action);body.append(tr);
  }
 }
 function openEditor(host,entry){
  const person=entry.person;
  if(!person||!ctx.isCurrent())return;
  const form=el('form','register-edit');
  const nationality=el('input');nationality.type='text';nationality.maxLength=100;nationality.value=entry.detail?.nationality||'';nationality.placeholder=w.nationality;
  const arrival=el('input');arrival.type='date';arrival.value=entry.detail?.actual_arrival_on||'';arrival.setAttribute('aria-label',w.arrival);
  const labelA=el('label','',w.nationality);labelA.append(nationality);
  const labelB=el('label','',w.arrival);labelB.append(arrival);
  const save=el('button','',w.save);save.type='submit';
  const cancel=button(w.cancel,paint);
  const instructions=el('p','small',w.editHelp);
  form.append(instructions,labelA,el('p','small',w.nationalityHelp),labelB,save,cancel);
  host.replaceChildren(form);
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(!ctx.isCurrent())return;save.disabled=true;cancel.disabled=true;notice.textContent='';
   const newEntry={tenant_id:ctx.tenant,resident_id:person.id,nationality:nationality.value.trim()||null,actual_arrival_on:arrival.value||null};
   try{
    const {data,error}=await ctx.db.from('resident_staff_details').upsert(newEntry,{onConflict:'tenant_id,resident_id'}).select('tenant_id,resident_id,nationality,actual_arrival_on');
    if(error||!data||data.length!==1)throw Error('save');
    entry.detail={...entry.detail,...data[0]};const found=details.findIndex(x=>x.resident_id===person.id);
    if(found>=0)details[found]=entry.detail;else details.push(entry.detail);
    notice.textContent=w.saveOk;paint();
   }catch{notice.textContent=w.saveError;save.disabled=false;cancel.disabled=false;}
  });
 }
 function exportRows(){
  const year=selectedYear();
  const header=[w.seq,w.room,w.category,w.capacity,w.nationality,w.gender,w.first,w.last,w.email,w.telephone,w.contract,w.from,w.to,w.arrival,
   ...Array.from({length:12},(_,i)=>monthTitle(year,i+1,ctx.lang)),w.total];
  const lines=[header,...entries.map(r=>r.values.slice(0,-1))];
  const output='\uFEFF'+lines.map(line=>line.map(csvCell).join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([output],{type:'text/csv;charset=utf-8'}));
  const a=el('a');a.href=url;a.download='student-house-register-'+year+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
 }
 upload.addEventListener('change',async()=>{
  const file=upload.files?.[0];if(!file||!ctx.isCurrent())return;
  try{
   if(file.size>100000)throw Error('size');
   const rows=validateRoomImport(await file.text(),rooms);
   if(rows.length+rooms.length>EXPECTED_ROOMS){notice.textContent=w.importOver;return;}
   if(!confirm(w.importConfirm+' '+rows.length))return;
   upload.disabled=true;
   const {data,error}=await ctx.db.from('rooms').insert(rows.map(r=>({...r,tenant_id:ctx.tenant}))).select('id');
   if(error||data?.length!==rows.length)throw Error('insert');
   ctx.refresh();
  }catch(e){notice.textContent=w.importFail;}finally{upload.disabled=false;upload.value='';}
 });
 search.addEventListener('input',paint);yearSelect.addEventListener('change',paint);paint();
}
