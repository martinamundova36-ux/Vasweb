import {attachAccommodationAddendum} from './accommodation-addendum.js?v=20261127-addendum-required-details';
import {advanceRentDueDate} from './ledger.js';
import {downloadWorkbook} from './excel.js?v=20261126-register';
import {chargeBalance, cents, installmentBalances} from './ledger.js';
import {buildStudentHouseSchedule} from './installment-document.js?v=20261127-addendum-required-details';
const normalized=value=>String(value??'').trim().toLowerCase().normalize('NFC').replace(/\s+/g,' ');
const searchText=value=>String(value??'').normalize('NFD').replace(/[\p{M}\p{Cf}]/gu,'').toLocaleLowerCase().trim().replace(/\s+/g,' ');
// Names may have alternate Latin transliterations (Kyrylo/Kyrilo) or a minor typo.
const nameVariant=value=>searchText(value).replace(/y/g,'i');
const oneNameEdit=(a,b)=>{
 if(a.length<5||b.length<5||Math.abs(a.length-b.length)>1)return false;
 if(a===b)return true;
 if(a.length===b.length){
  const diff=[];for(let i=0;i<a.length;i++)if(a[i]!==b[i])diff.push(i);
  return diff.length===1||(diff.length===2&&diff[1]===diff[0]+1&&a[diff[0]]===b[diff[1]]&&a[diff[1]]===b[diff[0]]);
 }
 const longer=a.length>b.length?a:b,shorter=a.length>b.length?b:a;
 let i=0;while(i<shorter.length&&longer[i]===shorter[i])i++;
 return longer.slice(0,i)+longer.slice(i+1)===shorter;
};
const matchesRegisterName=(query,first,last)=>{
 const terms=nameVariant(query).split(' ').filter(Boolean);
 const name=nameVariant([first,last].filter(Boolean).join(' '));
 const words=name.split(' ').filter(Boolean);
 return terms.length>0&&words.length>0&&terms.every(term=>name.includes(term)||words.some(word=>oneNameEdit(term,word)));
};
const roomNumber=value=>{
 const text=normalized(value);
 const match=text.match(/^(\d{1,4})([a-z])?(?: \d{1,2}(?: ?([a-z]))?)?$/);
 return match?String(Number(match[1]))+(match[2]??match[3]??''):text;
};
const monthFor=value=>{
 const match=normalized(value).match(/^(0[1-9]|1[0-2])\/(\d{2})$/);
 return match?'20'+match[2]+'-'+match[1]:null;
};
const feeFields={deposit:'deposit_eur',administration_fee:'administration_fee_eur',refrigerator_fee:'refrigerator_fee_eur',verification_fee:'verification_fee_eur'};
const fees=new Map([['depozit','deposit'],['admin. poplatok','administration_fee'],['poplatok chladnička','refrigerator_fee'],['overovací poplatok','verification_fee']]);
const addendumColumns=['Dodatok č.','Dodatok od','Dodatok do','Nájomné podľa dodatku'];
const extraColumns=['Číslo zmluvy','Dátum narodenia','Trvalé bydlisko','Číslo OP alebo pasu','Kontakt rodiča','Vysoká škola','IBAN študenta','Dĺžka pobytu (mesiace)','Skutočný príchod','Dodatočná chladnička','Stav registrácie','Stav dotazníka','Dátum odoslania dotazníka','Stav dokumentov','Aktivácia profilu','Preferovaný typ izby','Interné poznámky recepcie','Predpísané v období (€)','Priradené úhrady v období (€)','Zostáva uhradiť v období (€)','Nedoplatok po splatnosti (€)','Nepriradené prijaté platby (€)','Splatnosti a úhrady v období','Stav kalendára'];
const words={
 sk:['Excel evidencia ubytovania','Späť do administrácie','','Hľadať podľa mena, priezviska alebo izby','Stiahnuť Excel','Upraviť bunku','Hodnota','Poznámka','Uložiť','Zrušiť','Uloženie zlyhalo.','Riadkov','Importovaná evidencia'],
 en:['Accommodation register','Back to administration','','Search by first name, surname or room','Download Excel','Edit cell','Value','Note','Save','Cancel','Could not save.','Rows','Imported register'],
 ru:['Реестр проживания','Назад в администрацию','','Поиск по имени, фамилии или комнате','Скачать Excel','Изменить ячейку','Значение','Примечание','Сохранить','Отмена','Не удалось сохранить.','Строк','Импортированный реестр'],
 uk:['Реєстр проживання','Назад до адміністрації','','Пошук за ім’ям, прізвищем або кімнатою','Завантажити Excel','Редагувати клітинку','Значення','Примітка','Зберегти','Скасувати','Не вдалося зберегти.','Рядків','Імпортований реєстр']
};
const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined&&text!==null)x.textContent=String(text);return x;};
const btn=(text,fn)=>{const x=el('button',text);x.type='button';x.onclick=fn;return x;};
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
async function loadImport(db,tenant){
 const {data,error}=await db.from('student_house_excel_imports').select('source_sha,sheet_order,sheet_name,payload,imported_at').eq('tenant_id',tenant).order('imported_at',{ascending:false}).order('sheet_order');
 if(error)throw error;
 if(!data?.length)return {sheets:[],edits:new Map(),writable:false};
 const sha=data[0].source_sha,sheets=data.filter(x=>x.source_sha===sha).sort((a,b)=>a.sheet_order-b.sheet_order);
 const edits=new Map();let writable=true;
 for(let start=0;;start+=500){
  const result=await db.from('student_house_excel_import_edits').select('sheet_order,row_number,column_number,value,note').eq('tenant_id',tenant).eq('source_sha',sha).order('sheet_order').order('row_number').order('column_number').range(start,start+499);
  if(result.error){writable=false;break;}
  for(const item of result.data||[])edits.set(item.sheet_order+':'+item.row_number+':'+item.column_number,item);
  if((result.data||[]).length<500)break;
 }

 return {sha,sheets,edits,writable};
}

function importHeaders(sheet){
 const header=sheet.payload.rows[0]?.[1]||[];
 const width=Math.max(...sheet.payload.rows.map(([,values])=>values.length));
 return [...Array.from({length:width},(_,i)=>header[i]),...[...fees.keys(),...extraColumns,...addendumColumns].filter(label=>!header.some(v=>normalized(v)===normalized(label)))];
}

function addendumBinding(db,tenant,sha,sheet,row,edits){
 if(typeof row!=='number'||!sha)return {};
 const columns=addendumColumns.map(label=>importHeaders(sheet).indexOf(label)+1);
 const read=column=>edits.get(sheet.sheet_order+':'+row+':'+column)?.value;
 return {
  addendumNumber:read(columns[0]),addendumFrom:read(columns[1]),addendumTo:read(columns[2]),addendumRent:read(columns[3]),
  async saveAddendum(data){
   const values=[Number(data.number),data.from,data.to,data.rent];
   const changes=columns.map((column_number,i)=>({tenant_id:tenant,source_sha:sha,sheet_order:sheet.sheet_order,row_number:row,column_number,value:values[i],note:''}));
   const {error}=await db.from('student_house_excel_import_edits').upsert(changes,{onConflict:'tenant_id,source_sha,sheet_order,row_number,column_number'});
   if(error)throw Error('Dodatok sa do evidencie nepodarilo zapísať.');
   for(const item of changes)edits.set(item.sheet_order+':'+item.row_number+':'+item.column_number,item);
  }
 };
}

export async function listImportedStudents(db,tenant,profiles,{includeVerified=false}={}){
 const {sha,sheets,edits,writable}=await loadImport(db,tenant);
 const identity=(name,email,room)=>JSON.stringify([normalized(name),normalized(email),email?roomNumber(room):normalized(room)]);
 const stayKey=(key,from)=>JSON.stringify([key,from??'']);
 const verified=new Set(profiles.filter(p=>p.email&&p.accommodation_from).map(p=>stayKey(identity(p.full_name,p.email,p.verified_room_number),p.accommodation_from)));
 const entries=new Map();
 const amountOf=value=>{
  const text=String(value??'').trim().replace(',','.');
  return /^\d+(?:\.\d{1,2})?$/.test(text)?Number(text):null;
 };
 const monthOfDate=value=>/^\d{4}-(0[1-9]|1[0-2])-\d{2}$/.test(value)?value.slice(0,7):'';
 for(const sheet of [...sheets].reverse()){
  const header=sheet.payload.rows[0]?.[1]||[];
  if(!header.some(monthFor))continue;
  const columns=['meno','priezvisko','izba','email'].map(label=>header.findIndex(value=>normalized(value)===label));
  if(columns.some(i=>i<0))continue;
  for(const [row,values] of sheet.payload.rows.slice(1)){
   const cell=i=>{
    const edit=edits.get(sheet.sheet_order+':'+row+':'+(i+1));
    return String((edit?edit.value:values[i])??'').trim();
   };
   const get=label=>cell(header.findIndex(value=>normalized(value)===label));
   const [first,last,room,email]=columns.map(cell);
   const name=first+' '+last;
   if(!first||!last||!/^\d/.test(room)||/\b(personál|personal|staff|recepcia|zamestnanec)\b/i.test(name))continue;
   const from=get('od'),to=get('do'),contractNumber=get('kód izby')||get('číslo zmluvy');
   const key=stayKey(identity(name,email,room),from);
   if(verified.has(key)&&!includeVerified)continue;
   if(!entries.has(key))entries.set(key,{id:'excel:'+sheet.sheet_order+':'+row,name,room,email,sheet:sheet.sheet_name,from,to,contractNumber,roomType:get('typ izby')||get('typ'),linked:verified.has(key),...(writable?addendumBinding(db,tenant,sha,sheet,row,edits):{}),monthly:null,deposit:null,administrationFee:null,paymentStatus:'',months:new Map()});
   const entry=entries.get(key);
   if((entry.from&&from&&entry.from!==from)||(entry.to&&to&&entry.to!==to))continue;
   const arrival=get('skutočný príchod')||get('príchod');
   if(/^\d{4}-\d{2}-\d{2}$/.test(arrival)&&!entry.actualArrival)entry.actualArrival=arrival;
   entry.roomType||=get('typ izby')||get('typ');
   entry.from||=from;entry.to||=to;entry.contractNumber||=contractNumber;
   entry.monthly??=amountOf(get('splátky'));
   entry.deposit??=amountOf(get('depozit'));
   entry.administrationFee??=amountOf(get('admin. poplatok'));
   entry.paymentStatus||=get('stav platby')||get('uhradené')||get('zaplatené');
   header.forEach((label,i)=>{
    const month=monthFor(label),value=cell(i);
    if(month&&value&&!entry.months.has(month))entry.months.set(month,value);
   });
  }
 }
 return [...entries.values()].map(({monthly,months,deposit,...entry})=>{
  const from=monthOfDate(entry.from),to=monthOfDate(entry.to);
  const items=[];
  if(from&&to&&from<=to){
   if(deposit>0)items.push({initial:true,amount:deposit,kind:'deposit',description:'Depozit'});
   items.push({initial:true,amount:100,kind:'administration_fee',description:'Administratívny poplatok'});
   const month=new Date(from+'-01T12:00:00Z');
   for(let count=0;count<24&&month.toISOString().slice(0,7)<=to;count++){
    const period=month.toISOString().slice(0,7);
    const amount=months.has(period)?amountOf(months.get(period)):monthly;
    if(amount>0)items.push({initial:count===0,...(count===0?{}:{due_on:advanceRentDueDate(period)}),amount,kind:'rent',period,description:'Nájom za '+period+' · izba '+entry.room});
    month.setUTCMonth(month.getUTCMonth()+1);
   }
  }
  const missingFees=deposit===null?['Depozit']:[];
  return {...entry,monthly,deposit,items,missingFees};
 }).sort((a,b)=>a.name.localeCompare(b.name,'sk')||a.room.localeCompare(b.room,'sk'));
}

export function registerStayStatus(start,end,today){
 const valid=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
 if(!valid(start)||!valid(end)||start>end)return 'unknown';
 if(end<today)return 'ended';
 if(start>today)return 'future';
 return 'current';
}

export async function renderImportedExcel({root,db,tenant,lang,isCurrent,onBack,focus,list,onRefresh}){
 const w=words[lang]||words.sk;
 const imported=await loadImport(db,tenant).catch(()=>null);
 if(!isCurrent())return true;
 if(!imported?.sheets.length){root.append(el('p','Evidenciu sa nepodarilo načítať.'));return false;}
 const {sha,sheets,edits,writable}=imported;

 const syncedCells=new Map(), receipts=new Map(), residentRows=new Map(), appendRows=new Map(), extraHeaders=new Map();
 const cellKey=(sheet,row,i)=>sheet.sheet_order+':'+row+':'+(i+1);
 const baseWidth=sheet=>Math.max(...sheet.payload.rows.map(([,values])=>values.length));
 for(const sheet of sheets){
  const header=sheet.payload.rows[0]?.[1]||[];
  if(!header.some(monthFor)||!header.some(h=>normalized(h)==='izba'))continue;
  extraHeaders.set(sheet.sheet_order,[...fees.keys(),...extraColumns,...addendumColumns].filter(h=>!header.some(v=>normalized(h)===normalized(v))));
 }
 let syncError=false, missingCalendars=0;
 try{
  const [people,stays,charges,plans,items,details,enquiries,reviews,registrations,registrationAnswers,rooms,files,payments,allocations,reversals]=await Promise.all(
   ['residents','tenancies','rent_charges','installment_plans','installment_items','resident_staff_details','resident_enquiries','resident_enquiry_reviews','registration_requests','registration_enquiries','rooms','residence_portal_files','payments','payment_allocations','payment_reversals'].map(list));
  const emailCounts=new Map();
  for(const p of people.filter(p=>p.active&&!p.archived_at)){const email=normalized(p.email);emailCounts.set(email,(emailCounts.get(email)||0)+1);}
  const reversed=new Set(reversals.map(x=>x.payment_id));
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bratislava'}).format(new Date());
  for(const person of people.filter(p=>p.active&&!p.archived_at)){
   const requests=registrations.filter(r=>normalized(r.email)===normalized(person.email)&&r.contract_number===person.verified_contract_number&&['approved','invited'].includes(r.status));
   const request=requests.length===1?requests[0]:null;
   const submitted=registrationAnswers.find(a=>a.registration_id===request?.id);
   const own=charges.filter(c=>c.resident_id===person.id);
   const stay=stays.find(t=>t.resident_id===person.id&&t.starts_on===person.accommodation_from&&t.ends_on===person.accommodation_to);
   const detail=details.find(d=>d.resident_id===person.id);
   const review=reviews.find(r=>r.resident_id===person.id);
   const answers=enquiries.find(e=>e.resident_id===person.id);
   const verifiedEnquiry=review?.review_status==='approved'&&answers?.student_submitted_at&&Date.parse(review.requested_at)>=Date.parse(answers.student_submitted_at)?answers:null;
   const enquiry=verifiedEnquiry??submitted;
   const room=rooms.find(r=>r.id===stay?.room_id);
   const from=String(person.accommodation_from??'').slice(0,7),to=String(person.accommodation_to??'').slice(0,7);
   if(!from||!to||!person.verified_room_number||!normalized(person.email))continue;
   let schedule=[],calendarStatus='Pripravený';
   try{
    schedule=buildStudentHouseSchedule({accommodation_from:person.accommodation_from,accommodation_to:person.accommodation_to,monthly_rent:stay?.rent,deposit:detail?.deposit_eur,admin_fee:detail?.administration_fee_eur,refrigerator_fee:detail?.refrigerator_fee_eur,verification_fee:detail?.verification_fee_eur},own,plans,items,person.id);
   }catch(error){calendarStatus=error.message;missingCalendars++;}
   const names=String(person.full_name??'').trim().split(/\s+/);
   const first=request?.first_name??names[0],last=request?.last_name??names.slice(1).join(' ');
   const ownPayments=payments.filter(p=>p.resident_id===person.id&&!reversed.has(p.id));
   const paymentIds=new Set(ownPayments.map(p=>p.id));
   const ownAllocations=allocations.filter(a=>paymentIds.has(a.payment_id));
   for(const sheet of sheets.filter(s=>extraHeaders.has(s.sheet_order))){
    const header=sheet.payload.rows[0][1],months=header.map(monthFor).filter(Boolean);
    if(!months.some(m=>m>=from&&m<=to))continue;
    const headers=[...Array.from({length:baseWidth(sheet)},(_,i)=>header[i]),...extraHeaders.get(sheet.sheet_order)];
    const index=name=>headers.findIndex(h=>normalized(h)===name);
    const raw=(row,values,name)=>{
     const i=index(name),edit=edits.get(cellKey(sheet,row,i));
     return edit?edit.value:values[i];
    };
    const sameEmail=sheet.payload.rows.slice(1).filter(([row,v])=>normalized(raw(row,v,'email'))===normalized(person.email));
    const contractName=normalized(person.full_name);
    const matches=sameEmail.filter(([row,v])=>{
     const name=normalized([raw(row,v,'meno'),raw(row,v,'priezvisko')].filter(Boolean).join(' '));
     return name&&name===contractName&&roomNumber(raw(row,v,'izba'))===roomNumber(person.verified_room_number);
    });
    const appended=appendRows.get(sheet.sheet_order)||[];
    const row=matches.length===1&&emailCounts.get(normalized(person.email))===1?matches[0][0]:null;

    // A record without a verified import match remains a separate resident row.
    // Never claim a free bed or overwrite an ambiguous imported record.
    const target=row??'resident:'+person.id;
    if(row===null){appended.push([target,[]]);appendRows.set(sheet.sheet_order,appended);}
    residentRows.set(cellKey(sheet,target,0),{person,detail,stay});
    const monthCharges=own.filter(c=>months.includes(c.period));
    const monthSchedule=schedule.filter(c=>months.includes(c.period));
    const paymentBalance=c=>chargeBalance(c,ownAllocations,[]).paid;
    const sum=(items,amount)=>items.reduce((total,item)=>total+amount(item),0);
    const paid=sum(monthCharges,paymentBalance),total=sum(monthCharges,c=>cents(c.amount));
    if(monthCharges.length)receipts.set(cellKey(sheet,target,0),{person,charges:monthCharges.map(c=>({...c,remaining:cents(c.amount)-paymentBalance(c)}))});
    const dueDetails=monthCharges.flatMap(charge=>{
     const entries=monthSchedule.filter(item=>item.id===charge.id);
     if(!entries.length&&Number(charge.amount)>0)return installmentBalances([{...charge,description:charge.kind+' '+charge.period}],paymentBalance(charge));
     return installmentBalances(entries,paymentBalance(charge));
    });
    const unallocated=sum(ownPayments.filter(p=>months.includes(p.received_on?.slice(0,7))),p=>cents(p.amount)-sum(ownAllocations.filter(a=>a.payment_id===p.id),a=>cents(a.amount)));
    const data={
     izba:row===null?person.verified_room_number:null,'typ izby':room?.category,'typ':room?.category,
     meno:first,priezvisko:last,email:person.email,'národnosť':enquiry?.nationality??detail?.nationality,
     príchod:submitted?.preferred_from,pohlavie:enquiry?.gender,'tel.č.':enquiry?.telephone,od:person.accommodation_from,do:person.accommodation_to,
     'kód izby':detail?.room_code,'číslo zmluvy':person.verified_contract_number,
     'dátum narodenia':enquiry?.date_of_birth,'trvalé bydlisko':enquiry?.permanent_address,
     'číslo op alebo pasu':enquiry?.identity_document_number,'kontakt rodiča':enquiry?.parent_contact_email,
     'vysoká škola':enquiry?.school,'iban študenta':enquiry?.iban,
     'dĺžka pobytu (mesiace)':(Number(to.slice(0,4))-Number(from.slice(0,4)))*12+Number(to.slice(5))-Number(from.slice(5))+1,
     'skutočný príchod':detail?.actual_arrival_on,
     'dodatočná chladnička':typeof enquiry?.own_refrigerator==='boolean'?(enquiry.own_refrigerator?'Áno':'Nie'):null,
     'stav registrácie':request?.status,'stav dotazníka':review?.review_status,
     'dátum odoslania dotazníka':answers?.student_submitted_at,'preferovaný typ izby':enquiry?.preferred_room_type,
     'stav dokumentov':files.filter(f=>f.resident_id===person.id&&f.active).map(f=>f.kind+(f.review_status?' · '+f.review_status:'')).join('\n'),
     'aktivácia profilu':person.profile_password_activated_at||'Čaká na aktiváciu',
     'predpísané v období (€)':monthCharges.length?total/100:null,'priradené úhrady v období (€)':monthCharges.length?paid/100:null,
     'zostáva uhradiť v období (€)':monthCharges.length?Math.max(0,total-paid)/100:null,'nepriradené prijaté platby (€)':unallocated/100,
     'nedoplatok po splatnosti (€)':monthCharges.length?sum(dueDetails.filter(i=>i.due_on<today),i=>i.remaining)/100:null,
     'splatnosti a úhrady v období':dueDetails.sort((a,b)=>a.due_on.localeCompare(b.due_on)).map(i=>i.due_on+' · '+i.description+' · '+i.amount+' € · prijaté '+(i.paid/100).toFixed(2)+' €').join('\n'),
     splátky:monthSchedule.filter(i=>plans.some(p=>p.charge_id===i.id)).map(i=>i.due_on+' · '+i.amount+' €').join('\n'),
     'stav kalendára':calendarStatus
    };
    headers.forEach((label,i)=>{
     const key=normalized(label),month=monthFor(label),kind=fees.get(key);
     const entries=monthCharges.filter(c=>month?c.kind==='rent'&&c.period===month:kind&&c.kind===kind);
     const confirmedFee=kind&&months.includes(from)&&detail?.[feeFields[kind]];
     const value=entries.length===1?Number(entries[0].amount):confirmedFee===0||confirmedFee==='0.00'?0:data[key];
     if(['typ','typ izby'].includes(key)&&row!==null){
      const original=matches[0][1];
      const importedType=raw(row,original,'typ izby')||raw(row,original,'typ');
      if(String(importedType??'').trim())return;
     }
     if(value!==null&&value!==undefined&&value!=='')syncedCells.set(cellKey(sheet,target,i),value);
    });
   }
  }
 }catch{syncError=true;syncedCells.clear();appendRows.clear();receipts.clear();residentRows.clear();}
 if(!isCurrent())return true;
 const section=el('section');section.className='sh-imported-register';
 const style=el('style',`
 .sh-imported-register .import-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0}
 .sh-imported-register .import-toolbar input{flex:1 1 14rem}
 .sh-imported-register .import-name-results:not([hidden]){padding:12px 16px;margin:8px 0;border:1px solid #cbd8e8;border-radius:10px;background:#f4f8fd}
 .sh-imported-register .import-name-results button{display:block;margin:6px 0;background:#fff;color:#142b4d;border:1px solid #cbd8e8;max-width:100%;white-space:normal;text-align:left}
 .sh-imported-register .import-scroll{width:100%;max-height:72vh;overflow:auto;border:1px solid #cbd8e8;border-radius:10px}
 .sh-imported-register table{width:max-content;min-width:100%;border-collapse:separate;border-spacing:0;font-size:14px}
 .sh-imported-register th,.sh-imported-register td{min-width:80px;padding:8px 12px;border-right:1px solid #d5e1ef;border-bottom:1px solid #d5e1ef;white-space:pre-wrap;max-width:370px;overflow-wrap:anywhere;vertical-align:middle}
 .sh-imported-register th{background:#c5dfb4;position:sticky;top:0;z-index:2;color:#142b4d}
 .sh-imported-register tbody tr:nth-child(odd) td{background:#e2efda}
 .sh-imported-register .import-cell{background:transparent;color:#142b4d;font:inherit;border:0;border-radius:0;padding:3px;min-height:28px;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere;width:100%}
 .sh-imported-register .import-cell:focus-visible{outline:2px solid #17643c}
 .sh-imported-register .import-comment{color:#a52134;font-weight:bold;margin-left:5px}
 .sh-imported-register dialog{width:min(520px,92vw);border:1px solid #a6b5c6;border-radius:12px;padding:20px}
 .sh-imported-register dialog textarea{display:block;width:100%;min-height:70px;box-sizing:border-box;margin-bottom:10px}
 `);
 const tools=el('div');tools.className='import-toolbar';tools.append(btn(w[1],onBack));
 const tabs=el('div');tabs.className='import-toolbar room-register-controls';
 const search=el('input');search.type='search';search.placeholder=w[3];search.className='import-search';search.setAttribute('aria-label',w[3]);
 const stayLabels=({
  sk:['Stav pobytu','Všetky záznamy','Aktuálne pobyty','Budúce pobyty','Ukončené pobyty','Bez dátumov pobytu'],
  en:['Stay status','All records','Current stays','Upcoming stays','Ended stays','Missing stay dates'],
  ru:['Статус проживания','Все записи','Текущие проживания','Будущие проживания','Завершённые проживания','Даты не указаны'],
  uk:['Статус проживання','Усі записи','Поточні проживання','Майбутні проживання','Завершені проживання','Дати не вказано']
 })[lang]||['Stav pobytu','Všetky záznamy','Aktuálne pobyty','Budúce pobyty','Ukončené pobyty','Bez dátumov pobytu'];
 const stayFilter=el('select'),filterLabel=el('label',stayLabels[0]);
 stayFilter.className='import-stay-status';filterLabel.append(stayFilter);
 ['all','current','future','ended','unknown'].forEach((key,i)=>{
  const option=el('option',stayLabels[i+1]);option.value=key;stayFilter.append(option);
 });
 stayFilter.value=focus?.status||'all';
 const filterBar=el('div');filterBar.className='import-toolbar';filterBar.append(filterLabel,search);
 const results=el('div');results.className='import-name-results';results.hidden=true;results.setAttribute('aria-live','polite');
 const searchMessages={
  sk:['Výsledky vo všetkých semestroch','Žiadne záznamy','Izba','Vymazať vyhľadávanie','Meno, priezvisko, izba, e-mail alebo číslo zmluvy'],
  en:['Results across all semesters','No records found','Room','Clear search','Name, room, email or contract number'],
  ru:['Результаты по всем семестрам','Записи не найдены','Комната','Очистить поиск','Имя, фамилия, комната, e-mail или номер договора'],
  uk:['Результати за всіма семестрами','Записів не знайдено','Кімната','Очистити пошук','Ім’я, прізвище, кімната, e-mail або номер договору']
 };
 const searchLabels=searchMessages[lang]||searchMessages.sk;
 search.placeholder=searchLabels[4]||words.sk[3];
 search.setAttribute('aria-label',search.placeholder);
 const clear=btn(searchLabels[3]||'Vymazať vyhľadávanie',()=>{
  search.value='';stayFilter.value='all';paint();search.focus();
 });
 filterBar.append(clear);
 const count=el('p');count.setAttribute('aria-live','polite');
 const scroll=el('div');scroll.className='import-scroll room-register-scroll';scroll.tabIndex=0;
 let selected=sheets.find(x=>x.sheet_name===focus?.sheet)||sheets.find(x=>x.sheet_name===(focus?.year===2027?'od 02 2027':'od 09 2026'))||sheets[0];
 search.value=focus?.search??focus?.room??'';
 const tabButtons=new Map();
 const get=(sheet,row,i,value)=>syncedCells.get(cellKey(sheet,row,i))??(edits.has(cellKey(sheet,row,i))?edits.get(cellKey(sheet,row,i)).value:value??'');
 const noteFor=(sheet,row,i)=>edits.get(cellKey(sheet,row,i))?.note??sheet.payload.comments?.[col(i)+row]??'';
 const valuesFor=(sheet,row,values)=>Array.from({length:baseWidth(sheet)+(extraHeaders.get(sheet.sheet_order)?.length||0)},(_,i)=>get(sheet,row,i,values[i]));
 const headersFor=sheet=>[...Array.from({length:baseWidth(sheet)},(_,i)=>sheet.payload.rows[0][1][i]),...(extraHeaders.get(sheet.sheet_order)||[])];
 const columnsFor=sheet=>{
  const typeLabels=new Set(['š2','d2','d2v','sui2','š1+1','š2+2','m','manž.posteľ']);
  const header=headersFor(sheet),typeIndex=header.findIndex(v=>['typ','typ izby'].includes(normalized(v)));
  return header.map((_,i)=>i).filter(i=>typeIndex<0||i<=typeIndex||(!typeLabels.has(normalized(header[i]).replace(/\s+/g,''))&&!['typ','typ izby'].includes(normalized(header[i]))));
 };
 const recordsFor=sheet=>[...sheet.payload.rows.slice(1),...(appendRows.get(sheet.sheet_order)||[])];
 const noteRows=()=>sheets.flatMap(sheet=>Object.entries(sheet.payload.comments||{}).map(([ref,note])=>[sheet.sheet_name,ref,note]));
 function exportSheet(sheet){
  const columns=columnsFor(sheet),headers=headersFor(sheet),records=recordsFor(sheet),automaticCells=new Set();
  const rows=records.map(([row,values],position)=>columns.map((i,exportIndex)=>{
   if(syncedCells.has(cellKey(sheet,row,i)))automaticCells.add(col(exportIndex)+(position+2));
   return get(sheet,row,i,values[i]);
  }));
  return {name:sheet.sheet_name,rows:[columns.map(i=>headers[i]),...rows],automaticCells};
 }
 tools.append(btn(w[4],()=>downloadWorkbook('Student-House-evidencia',[
  ...sheets.map(exportSheet),
  {name:'Pôvodné poznámky',rows:[['Hárok','Bunka','Poznámka'],...noteRows()]},
  {name:'Úpravy evidencie',rows:[['Hárok','Riadok','Stĺpec','Hodnota','Poznámka'],...Array.from(edits.values()).map(e=>[sheets.find(s=>s.sheet_order===e.sheet_order)?.sheet_name,e.row_number,e.column_number,e.value,e.note])]}
 ])));
 for(const sheet of sheets){const t=btn(sheet.sheet_name,()=>{selected=sheet;paint();});tabButtons.set(sheet.sheet_order,t);tabs.append(t);}
 function edit(sheet,row,i,original){
  const dialog=el('dialog'),form=el('form'),value=el('textarea'),note=el('textarea'),status=el('p');
  form.dataset.liveDirty='true';
  const before=get(sheet,row,i,original);value.value=String(before??'');value.maxLength=7900;note.value=noteFor(sheet,row,i);note.maxLength=8000;
  const valueLabel=el('label',w[6]),noteLabel=el('label',w[7]);valueLabel.append(value);noteLabel.append(note);
  const save=el('button',w[8]);save.type='submit';
  form.append(el('h3',w[5]+' · '+col(i)+row),valueLabel,noteLabel,status,btn(w[9],()=>dialog.close()),save);
  dialog.append(form);section.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
  form.onsubmit=async e=>{
   e.preventDefault();if(save.disabled)return;save.disabled=true;
   const newValue=value.value===String(before??'')?before:typeof before==='number'&&/^-?\d+(?:[.,]\d+)?$/.test(value.value.trim())?Number(value.value.replace(',','.')):value.value;
   const item={tenant_id:tenant,source_sha:sha,sheet_order:sheet.sheet_order,row_number:row,column_number:i+1,value:newValue??'',note:note.value};
   const {error}=await db.from('student_house_excel_import_edits').upsert(item,{onConflict:'tenant_id,source_sha,sheet_order,row_number,column_number'});
   if(error){status.textContent=w[10];save.disabled=false;return;}
   edits.set(sheet.sheet_order+':'+row+':'+(i+1),item);dialog.close();paint();
  };
 }
 function editVerifiedFees({person,detail}){
  const dialog=el('dialog'),form=el('form'),status=el('p'),changes=[];
  form.dataset.liveDirty='true';
  form.append(el('h3','Zmluvné poplatky · '+person.full_name),el('p','Zmena aktualizuje predpis. Nula zruší poplatok bez priradenej úhrady alebo splátkovej dohody.'));
  for(const [name,kind] of fees){
   const key=feeFields[kind],label=el('label',name+' (€)'),value=el('input');
   value.type='number';value.min='0';value.max='100000';value.step='0.01';value.value=detail?.[key]??'';
   changes.push({key,value,previous:value.value});
   label.append(value);form.append(label);
  }
  const cancel=btn(w[9],()=>dialog.close()),save=el('button','Potvrdiť zmenu poplatkov');save.type='submit';
  form.append(status,cancel,save);dialog.append(form);section.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
  form.onsubmit=async event=>{
   event.preventDefault();
   if(save.disabled||!isCurrent()||!form.reportValidity())return;
   const changed=changes.filter(({value,previous})=>value.value!==previous);
   if(!changed.length){dialog.close();return;}
   if(changed.some(({value})=>value.value==='')){status.textContent='Na zrušenie poplatku zadaj nulu.';return;}
   save.disabled=true;cancel.disabled=true;
   try{
    const payload=Object.fromEntries(changed.map(({key,value})=>[key,cents(value.value)/100]));
    const {data,error}=await db.from('resident_staff_details').update(payload).eq('tenant_id',tenant).eq('resident_id',person.id).eq('updated_at',detail.updated_at).select('resident_id');
    if(error||data?.length!==1)throw Error(error?.message||'stale_details');
    delete form.dataset.liveDirty;dialog.close();onRefresh();
   }catch{status.textContent='Zmenu sa nepodarilo uložiť. Skontroluj úhrady alebo splátkové dohody a obnov evidenciu.';save.disabled=false;cancel.disabled=false;}
  };
 }
 function correctMonthlyRent({person,stay}){
  const dialog=el('dialog'),form=el('form'),status=el('p'),value=el('input');
  form.dataset.liveDirty='true';
  const label=el('label','Overené mesačné nájomné (€)');
  value.type='number';value.required=true;value.min='0.01';value.max='100000';value.step='0.01';value.value=stay.rent;
  label.append(value);
  const cancel=btn(w[9],()=>dialog.close()),save=el('button','Potvrdiť zmenu nájomného');save.type='submit';
  form.append(el('h3','Oprava zmluvného nájomného · '+person.full_name),
   el('p','Zadaj schválenú sumu zmluvného nájomného. Oprava je dostupná pre kompletný kalendár bez úhrady alebo dohody k nájomnému.'),
   label,status,cancel,save);
  dialog.append(form);section.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
  form.onsubmit=async event=>{
   event.preventDefault();
   if(save.disabled||!isCurrent()||!form.reportValidity())return;
   save.disabled=true;cancel.disabled=true;
   try{
    const amount=cents(value.value)/100;
    const {data,error}=await db.from('tenancies').update({rent:amount}).eq('tenant_id',tenant).eq('resident_id',person.id).eq('id',stay.id).eq('rent',stay.rent).select('id');
    if(error||data?.length!==1)throw Error(error?.message||'stale_tenancy');
    delete form.dataset.liveDirty;dialog.close();onRefresh();
   }catch(error){
    status.textContent=error.message.includes('rent_has_payment_or_installment_plan')
      ?'K nájomnému je priradená úhrada alebo splátková dohoda. Evidovaný kalendár vyžaduje individuálnu opravu.'
      :'Nájomné sa nepodarilo aktualizovať. Obnov evidenciu a skontroluj úplnosť predpisov.';
    save.disabled=false;cancel.disabled=false;
   }
  };
 }
 function recordReceipt({person,charges}){
  const dialog=el('dialog'),form=el('form'),target=el('select'),value=el('input'),received=el('input'),method=el('select'),reference=el('input'),status=el('p');
  form.dataset.liveDirty='true';
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bratislava'}).format(new Date());
  const open=charges.filter(c=>c.remaining>0).sort((a,b)=>a.due_on.localeCompare(b.due_on));
  for(const c of open)target.append(new Option(c.period+' · '+c.kind+' · zostáva '+(c.remaining/100).toFixed(2)+' €',c.id));
  target.append(new Option('Prijatá platba bez priradenia',''));
  value.type='number';value.required=true;value.min='0.01';value.step='0.01';
  const selectedCharge=()=>open.find(c=>c.id===target.value);
  const setAmount=()=>{const c=selectedCharge();value.value=c?String(c.remaining/100):'';};
  target.onchange=setAmount;setAmount();
  received.type='date';received.required=true;received.value=today;received.max=today;
  method.append(new Option('Bankový prevod','bank'),new Option('Hotovosť','cash'));
  reference.required=true;reference.minLength=2;reference.maxLength=100;
  const save=el('button','Potvrdiť prijatú platbu');save.type='submit';
  const cancel=btn(w[9],()=>dialog.close());
  form.append(el('h3','Prijatá platba · '+person.full_name),el('p','Suma nad zostatok predpisu zostane nepriradená.'));
  for(const [title,control] of [['Predpis',target],['Prijatá suma (€)',value],['Dátum prijatia',received],['Spôsob platby',method],['Jedinečná referencia dokladu',reference]]){
   const label=el('label',title);label.append(control);form.append(label);
  }
  form.append(status,cancel,save);dialog.append(form);section.append(dialog);
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
  form.onsubmit=async event=>{
   event.preventDefault();
   if(save.disabled||!isCurrent()||!form.reportValidity())return;
   save.disabled=true;cancel.disabled=true;
   try{
    const amount=cents(value.value),charge=selectedCharge();
    if(amount<=0||reference.value.trim().length<2)throw Error('invalid_payment');
    const {data,error}=await db.rpc('record_payment',{p_tenant:tenant,p_resident:person.id,p_amount:amount/100,p_received:received.value,p_method:method.value,p_reference:reference.value.trim(),p_allocations:charge?[{charge_id:charge.id,amount:Math.min(amount,charge.remaining)/100}]:[]});
    if(error||!data)throw Error('payment');
    delete form.dataset.liveDirty;dialog.close();onRefresh();
   }catch{status.textContent='Platba sa neuložila. Skontroluj referenciu a aktuálny zostatok.';save.disabled=false;cancel.disabled=false;}
  };
 }
 function findRows(query){
  const hits=new Map();
  if(!query)return hits;
  for(const sheet of sheets){
   const headers=headersFor(sheet).map(searchText);
   const first=headers.indexOf('meno'),last=headers.indexOf('priezvisko'),room=headers.indexOf('izba');
   const identifiers=headers.flatMap((label,i)=>/^(izba|c(islo)?\.? izby|e[ -]?mail|kod izby|c(islo)?\.? zmluvy)$/.test(label)?[i]:[]);
   const matchesName=values=>matchesRegisterName(query,values[first],values[last]);
   for(const [row,values] of recordsFor(sheet)){
    const actual=valuesFor(sheet,row,values);
    const imported=headers.map((_,i)=>edits.has(cellKey(sheet,row,i))?edits.get(cellKey(sheet,row,i)).value:values[i]);
    const name=[actual[first],actual[last]].filter(Boolean).join(' ');
    if(!name)continue;
    if(matchesName(actual)||matchesName(imported)||identifiers.some(i=>searchText(actual[i]).includes(query)||searchText(imported[i]).includes(query))){
     hits.set(cellKey(sheet,row,0),{sheet,row,name,room:actual[room]});
    }
   }
  }
  return hits;
 }
 function paintResults(query,hits){
  results.replaceChildren();results.hidden=!query;clear.disabled=!query&&stayFilter.value==='all';
  if(results.hidden)return;
  results.append(el('strong',searchLabels[0]+': '+hits.size));
  if(!hits.size){results.append(el('p',searchLabels[1]));return;}
  for(const hit of hits.values()){
   const action=btn(hit.name+' · '+searchLabels[2]+' '+(hit.room||'—')+' · '+hit.sheet.sheet_name,()=>{
    selected=hit.sheet;stayFilter.value='all';paint(hit.row);
   });
   results.append(action);
  }
 }
 function paint(focusedRow){
  for(const [id,t] of tabButtons){const active=id===selected.sheet_order;t.setAttribute('aria-pressed',String(active));t.style.background=active?'#142b4d':'#ffffff';t.style.color=active?'#ffffff':'#142b4d';t.style.border='1px solid #142b4d';}
  const q=searchText(search.value),hits=findRows(q);
  paintResults(q,hits);
  const sheet=selected,rows=recordsFor(sheet);
  section.dataset.sheet=sheet.sheet_name;
  const table=el('table'),head=table.createTHead().insertRow(),body=table.createTBody();
  const header=headersFor(sheet),visibleColumns=columnsFor(sheet);
  const fromIndex=header.findIndex(v=>normalized(v)==='od'),toIndex=header.findIndex(v=>normalized(v)==='do');
  const hasStayDates=fromIndex>=0&&toIndex>=0;
  const indexOf=label=>header.findIndex(value=>normalized(value)===label);
  const roomIndex=indexOf('izba');
  filterLabel.hidden=!hasStayDates;
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bratislava'}).format(new Date());
  for(const i of visibleColumns){const cell=el('th',header[i]??'');cell.scope='col';head.append(cell);}
  if(extraHeaders.has(sheet.sheet_order))head.append(el('th','Finančná evidencia'));
  let shown=0,target;
  for(const [row,values] of rows){
   const actual=valuesFor(sheet,row,values);
   if(hasStayDates&&stayFilter.value!=='all'&&registerStayStatus(actual[fromIndex],actual[indexOf('dodatok do')]||actual[toIndex],today)!==stayFilter.value)continue;
   if(q&&!hits.has(cellKey(sheet,row,0))&&!actual.some((v,i)=>searchText(v).includes(q)||searchText(noteFor(sheet,row,i)).includes(q)))continue;
   shown++;const tr=body.insertRow();
   if(row===focusedRow){target=tr;tr.tabIndex=-1;tr.style.outline='2px solid #17643c';tr.style.outlineOffset='-2px';}
   for(const i of visibleColumns){
    const cell=el('td'),n=noteFor(sheet,row,i),v=actual[i];
    const synced=syncedCells.has(cellKey(sheet,row,i));
    const control=writable&&!synced&&typeof row==='number'?btn(v??'',()=>edit(sheet,row,i,values[i])):el('span',v??'');
    if(synced){control.title='Údaj zo systému / Synchronized field';cell.style.boxShadow='inset 3px 0 #17643c';}
    control.className='import-cell';if(n){control.title=n;control.append(el('span',' •'));control.lastChild.className='import-comment';}
    cell.append(control);
    if(hasStayDates&&i===roomIndex){
     const name=[actual[indexOf('meno')],actual[indexOf('priezvisko')]].map(v=>String(v??'').trim()).filter(Boolean).join(' ');
     const contract=actual[indexOf('kód izby')]||actual[indexOf('číslo zmluvy')];
     const resident=residentRows.get(cellKey(sheet,row,0));
     const rent=resident?.stay?.rent??String(actual[indexOf('splátky')]??'').replace(',','.');
     if(name){
      const binding=writable?addendumBinding(db,tenant,sha,sheet,row,edits):{};
      const stored=binding.saveAddendum;
      if(stored)binding.saveAddendum=async data=>{await stored(data);paint();};
      attachAccommodationAddendum(cell,{...binding,name,contract,room:String(v||''),roomType:actual[indexOf('typ izby')]||actual[indexOf('typ')],email:actual[indexOf('email')],address:actual[indexOf('trvalé bydlisko')],birth:actual[indexOf('dátum narodenia')],nationality:actual[indexOf('národnosť')],identity:actual[indexOf('číslo op alebo pasu')],phone:actual[indexOf('tel.č.')],parent:actual[indexOf('kontakt rodiča')],school:actual[indexOf('vysoká škola')],iban:actual[indexOf('iban študenta')],originalEnd:actual[toIndex],rent},tenant);
     }
    }
    tr.append(cell);
   }
   if(extraHeaders.has(sheet.sheet_order)){const cell=tr.insertCell(),key=cellKey(sheet,row,0),receipt=receipts.get(key),resident=residentRows.get(key);
     if(receipt)cell.append(btn('Evidovať platbu',()=>recordReceipt(receipt)));
     if(resident?.detail&&receipt?.charges.some(c=>c.kind==='rent'))cell.append(btn('Upraviť poplatky',()=>editVerifiedFees(resident)));
     if(resident?.stay)cell.append(btn('Opraviť nájomné',()=>correctMonthlyRent(resident)));

   }
  }
  count.textContent=w[11]+': '+shown+' / '+rows.length;scroll.replaceChildren(table);
  if(target){target.focus({preventScroll:true});(target.cells[roomIndex]??target).scrollIntoView({block:'center',inline:'nearest'});}
 }
 section.append(style,el('h3',w[0]),tools,el('p',syncError?'Údaje zo systému sa nepodarilo načítať. Zobrazené sú pôvodné hodnoty.':syncedCells.size?'Zelené označenie: údaje zo systému. Mesačné bunky zobrazujú predpisy. Záznamy bez jednoznačnej zhody v importe sa zobrazujú samostatne. Kalendáre na kontrolu: '+missingCalendars+'.':'Evidencia zatiaľ nemá overené údaje študentov zo systému.'),tabs,filterBar,results,count,scroll);root.append(section);const searchChanged=()=>paint();search.addEventListener('input',searchChanged);stayFilter.onchange=searchChanged;paint();return true;
}
