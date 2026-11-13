// Existing operational tables, tenant-scoped queries and RLS remain authoritative.
const dictionaries={
 sk:{requests:'Poruchy a požiadavky',cleaning:'Objednať upratovanie',help:'Odoslanie žiadosti neznamená potvrdený termín ani cenu.',empty:'Zatiaľ žiadne žiadosti.',room:'Izba',unassigned:'Nepriradená',reference:'Číslo požiadavky',created:'Vytvorené',history:'História a správy',public:'Odpoveď viditeľná študentovi',internal:'Interná poznámka – iba recepcia',send:'Odoslať správu',save:'Uložiť zmeny',new:'Nová požiadavka',subject:'Predmet',description:'Popis problému',category:'Typ požiadavky',urgent:'Urgentný problém',date:'Požadovaný dátum',window:'Preferovaný čas',notes:'Poznámka',price:'Potvrdená cena (€)',scheduled:'Navrhnutý alebo potvrdený termín',type:'Druh upratovania',submit:'Odoslať žiadosť',success:'Uložené.',failed:'Nepodarilo sa uložiť. Skús to znova.',status:'Stav',loadFailed:'Správy sa nepodarilo načítať.',confirm:'Uložiť zmeny tejto žiadosti?',statuses:{new:'Nové',accepted:'Prijaté',in_progress:'Rieši sa',waiting_parts:'Čaká sa na súčiastky',resolved:'Vyriešené',closed:'Uzavreté',cancelled:'Zrušené',requested:'Čaká na potvrdenie',proposed:'Navrhnutý iný termín',approved:'Potvrdené',rejected:'Zamietnuté',completed:'Vykonané'},categories:{maintenance:'Porucha',documents:'Dokumenty',parcel:'Zásielka',other:'Iné'},windows:{morning:'Dopoludnia',afternoon:'Popoludní',anytime:'Kedykoľvek'},types:{standard:'Bežné upratovanie',deep:'Dôkladné upratovanie',other:'Iné – uveď v poznámke'}},
 en:{requests:'Maintenance and requests',cleaning:'Request cleaning',help:'Submitting a request does not confirm the appointment or price.',empty:'No requests yet.',room:'Room',unassigned:'Unassigned',reference:'Request number',created:'Created',history:'History and messages',public:'Reply visible to the student',internal:'Internal note – reception only',send:'Send message',save:'Save changes',new:'New request',subject:'Subject',description:'Problem description',category:'Request type',urgent:'Urgent problem',date:'Preferred date',window:'Preferred time',notes:'Note',price:'Confirmed price (€)',scheduled:'Proposed or confirmed appointment',type:'Cleaning type',submit:'Submit request',success:'Saved.',failed:'Unable to save. Try again.',status:'Status',loadFailed:'Unable to load messages.',confirm:'Save changes to this request?',statuses:{new:'New',accepted:'Accepted',in_progress:'In progress',waiting_parts:'Waiting for parts',resolved:'Resolved',closed:'Closed',cancelled:'Cancelled',requested:'Awaiting confirmation',proposed:'Alternative appointment proposed',approved:'Confirmed',rejected:'Rejected',completed:'Completed'},categories:{maintenance:'Maintenance',documents:'Documents',parcel:'Parcel',other:'Other'},windows:{morning:'Morning',afternoon:'Afternoon',anytime:'Any time'},types:{standard:'Standard cleaning',deep:'Deep cleaning',other:'Other – describe in note'}}
};
Object.assign(dictionaries,{
 ru:{...dictionaries.en,requests:'Неисправности и заявки',cleaning:'Заказать уборку',help:'Отправка заявки не подтверждает время и цену.',empty:'Заявок пока нет.',room:'Комната',reference:'Номер заявки',created:'Создано',history:'История и сообщения',public:'Ответ, видимый студенту',internal:'Внутренняя заметка — только ресепшен',send:'Отправить сообщение',save:'Сохранить изменения',new:'Новая заявка',subject:'Тема',description:'Описание проблемы',category:'Тип заявки',urgent:'Срочная проблема',date:'Желаемая дата',window:'Желаемое время',notes:'Примечание',price:'Подтверждённая цена (€)',scheduled:'Предложенное или подтверждённое время',type:'Вид уборки',submit:'Отправить заявку',success:'Сохранено.',failed:'Не удалось сохранить. Попробуйте ещё раз.',status:'Статус',confirm:'Сохранить изменения заявки?',statuses:{new:'Новая',accepted:'Принята',in_progress:'В работе',waiting_parts:'Ожидание запчастей',resolved:'Решена',closed:'Закрыта',cancelled:'Отменена',requested:'Ожидает подтверждения',proposed:'Предложено другое время',approved:'Подтверждена',rejected:'Отклонена',completed:'Выполнена'},categories:{maintenance:'Неисправность',documents:'Документы',parcel:'Посылка',other:'Другое'},windows:{morning:'Утром',afternoon:'После обеда',anytime:'В любое время'},types:{standard:'Обычная уборка',deep:'Генеральная уборка',other:'Другое — уточните в примечании'}},
 uk:{...dictionaries.en,requests:'Несправності та заявки',cleaning:'Замовити прибирання',help:'Надсилання заявки не підтверджує час і ціну.',empty:'Заявок поки немає.',room:'Кімната',reference:'Номер заявки',created:'Створено',history:'Історія та повідомлення',public:'Відповідь, видима студенту',internal:'Внутрішня примітка — лише рецепція',send:'Надіслати повідомлення',save:'Зберегти зміни',new:'Нова заявка',subject:'Тема',description:'Опис проблеми',category:'Тип заявки',urgent:'Термінова проблема',date:'Бажана дата',window:'Бажаний час',notes:'Примітка',price:'Підтверджена ціна (€)',scheduled:'Запропонований або підтверджений час',type:'Вид прибирання',submit:'Надіслати заявку',success:'Збережено.',failed:'Не вдалося зберегти. Спробуйте ще раз.',status:'Статус',confirm:'Зберегти зміни заявки?',statuses:{new:'Нова',accepted:'Прийнята',in_progress:'В роботі',waiting_parts:'Очікування запчастин',resolved:'Вирішена',closed:'Закрита',cancelled:'Скасована',requested:'Очікує підтвердження',proposed:'Запропоновано інший час',approved:'Підтверджена',rejected:'Відхилена',completed:'Виконана'},categories:{maintenance:'Несправність',documents:'Документи',parcel:'Посилка',other:'Інше'},windows:{morning:'Вранці',afternoon:'Після обіду',anytime:'Будь-коли'},types:{standard:'Звичайне прибирання',deep:'Генеральне прибирання',other:'Інше — уточніть у примітці'}}
});
const capacityWords={
 sk:{slots:'Dostupné termíny upratovania',empty:'Recepcia zatiaľ nevypísala voľný termín.',start:'Začiatok',end:'Koniec',resource:'Upratovačka / kapacita',capacity:'Počet súbežných rezervácií',add:'Pridať termín',close:'Uzavrieť termín',free:'Voľné miesta',choose:'Vyber dostupný termín'},
 en:{slots:'Available cleaning appointments',empty:'Reception has not published an available appointment yet.',start:'Start',end:'End',resource:'Cleaner / resource',capacity:'Concurrent reservations',add:'Add appointment',close:'Close appointment',free:'Available places',choose:'Choose an available appointment'},
 ru:{slots:'Доступное время уборки',empty:'Ресепшен пока не опубликовал свободное время.',start:'Начало',end:'Конец',resource:'Уборщик / ресурс',capacity:'Количество бронирований',add:'Добавить время',close:'Закрыть время',free:'Свободные места',choose:'Выберите свободное время'},
 uk:{slots:'Доступний час прибирання',empty:'Рецепція ще не опублікувала вільний час.',start:'Початок',end:'Кінець',resource:'Прибиральник / ресурс',capacity:'Кількість бронювань',add:'Додати час',close:'Закрити час',free:'Вільні місця',choose:'Оберіть вільний час'}
};
export const serviceWords=lang=>dictionaries[lang]||dictionaries.en;
export const serviceStates=['new','accepted','in_progress','waiting_parts','resolved','closed','cancelled'];
export const cleaningStates=['requested','proposed','approved','rejected','completed','cancelled'];
export const bratislavaToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bratislava'}).format(new Date());
const dateTime=value=>value?new Intl.DateTimeFormat('sk-SK',{timeZone:'Europe/Bratislava',dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'—';
const element=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=String(value);if(cls)e.className=cls;return e;};
const field=(text,input)=>{const label=element('label',text);label.append(input);return label;};
const select=(items,value)=>{const s=element('select');for(const [key,label] of Object.entries(items)){const o=element('option',label);o.value=key;o.selected=key===value;s.append(o);}return s;};
const textArea=(value='',limit=4000)=>{const e=element('textarea');e.rows=3;e.maxLength=limit;e.value=value;return e;};
const input=(type,required=false)=>{const e=element('input');e.type=type;e.required=required;return e;};
const button=(label,type='submit')=>{const b=element('button',label);b.type=type;return b;};
const detail=(root,label,value)=>{if(value!==null&&value!==undefined&&value!=='')root.append(element('p',label+': '+value,'small'));};

export async function renderServiceRequests(ctx){
 const {root,db,list,tenant,staff,resident,userId,lang,isCurrent,refresh}=ctx;
 const cleaning=ctx.cleaning,t=serviceWords(lang),table=cleaning?'cleaning_bookings':'service_requests';
 if(!isCurrent())return;root.replaceChildren();
 root.append(element('h3',cleaning?t.cleaning:t.requests),element('p',t.help,'muted'));
 const filter=staff?undefined:{resident_id:resident?.id||'00000000-0000-0000-0000-000000000000'};
 let slots=[];
 if(cleaning){const {data,error}=await db.rpc('residence_cleaning_availability',{p_tenant:tenant});if(error)throw error;slots=data||[];}
 const cw=capacityWords[lang]||capacityWords.en;
 const slotOptions=(selected='')=>Object.fromEntries([['',cw.choose],...slots.filter(s=>s.remaining>0||s.id===selected).map(s=>[s.id,dateTime(s.starts_at)+' – '+dateTime(s.ends_at)+' · '+s.resource+' · '+cw.free+': '+s.remaining])]);
 const [records,people,messages]=await Promise.all([list(table,filter),staff?list('residents'):Promise.resolve(resident?[resident]:[]),cleaning?Promise.resolve([]):list('service_request_messages')]);
 if(!isCurrent())return;
 const room=id=>people.find(p=>p.id===id)?.verified_room_number||t.unassigned;
 const name=id=>people.find(p=>p.id===id)?.full_name||'';
 const notice=element('p');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');root.append(notice);
 const report=(message,bad=false)=>{if(!isCurrent())return;notice.textContent=message;notice.style.color=bad?'#a32c30':'';};
 if(cleaning&&staff)await renderSlotManager({ctx,root,cw,t,report,records});
 if(cleaning&&!slots.some(s=>s.remaining>0))root.append(element('p',cw.empty,'muted'));
 if(!records.length)root.append(element('p',t.empty,'muted'));
 for(const record of records.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))){
  const card=element('article',undefined,'file-item');
  card.append(element('h4',cleaning?t.cleaning:record.subject));
  if(staff)detail(card,'',name(record.resident_id));
  detail(card,t.reference,record.id);detail(card,t.room,room(record.resident_id));
  detail(card,t.created,dateTime(record.created_at));
  detail(card,t.status,t.statuses[record.status]||record.status);
  if(!cleaning&&record.urgent)card.append(element('strong',t.urgent));
  if(cleaning){
   detail(card,t.date,ctx.day(record.preferred_date));detail(card,t.window,t.windows[record.preferred_window]||record.preferred_window);
   detail(card,t.type,t.types[record.cleaning_type]||t.types.standard);
   detail(card,t.notes,record.notes);detail(card,t.scheduled,record.scheduled_at?dateTime(record.scheduled_at):null);
   detail(card,t.price,record.price_eur===null?null:ctx.money(record.price_eur));
  }else detail(card,t.description,record.description);
  detail(card,t.public,record.staff_note);
  if(staff){
   const form=element('form',undefined,'staff-form');
   const states=cleaning?cleaningStates:serviceStates;
   const status=select(Object.fromEntries(states.map(s=>[s,t.statuses[s]])),record.status);
   const publicNote=textArea(record.staff_note,cleaning?1500:4000);
   form.append(field(t.status,status),field(t.public,publicNote));
   let price,time;
   if(cleaning){
    price=input('number');price.min='0';price.max='100000';price.step='0.01';price.value=record.price_eur??'';
    // A date/time chosen at reception is explicitly interpreted as Bratislava local time.
    time=select(slotOptions(record.slot_id),record.slot_id||'');
    form.append(field(t.price,price),field(t.scheduled,time));
   }
   const save=button(t.save);form.append(save);
   form.addEventListener('submit',async event=>{
    event.preventDefault();if(!isCurrent()||!form.reportValidity()||!confirm(t.confirm))return;
    save.disabled=true;
    try{
     const payload={status:status.value,staff_note:publicNote.value.trim()};
     if(cleaning){payload.price_eur=price.value===''?null:Number(price.value);payload.slot_id=time.value||record.slot_id||null;const selectedSlot=slots.find(s=>s.id===time.value);payload.scheduled_at=selectedSlot?.starts_at||record.scheduled_at||null;}
     const {data,error}=await db.from(table).update(payload).eq('tenant_id',tenant).eq('id',record.id).eq('updated_at',record.updated_at).select('id');
     if(error||!data?.length)throw Error('save_failed');
     if(isCurrent()){report(t.success);refresh();}
    }catch{report(t.failed,true);save.disabled=false;}
   });card.append(form);
  }
  if(!cleaning){
   const history=element('details');history.append(element('summary',t.history));
   for(const msg of messages.filter(m=>m.request_id===record.id).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at))||String(a.id).localeCompare(String(b.id)))){
    const block=element('div',undefined,'document-flow-submitted');
    detail(block,t.created,dateTime(msg.created_at));
    block.append(element('strong',msg.message_kind==='status'?t.status:msg.is_internal?t.internal:t.public));
    block.append(element('p',msg.message_kind==='status'?(t.statuses[msg.body]||msg.body):msg.body));history.append(block);
   }
   const messageForm=element('form',undefined,'staff-form'),body=textArea();body.required=true;
   messageForm.append(field(t.public,body));
   const internal=input('checkbox');if(staff)messageForm.append(field(t.internal,internal));
   const send=button(t.send);messageForm.append(send);
   messageForm.addEventListener('submit',async event=>{
    event.preventDefault();if(!isCurrent()||!messageForm.reportValidity())return;send.disabled=true;
    try{
     const {error}=await db.from('service_request_messages').insert({tenant_id:tenant,request_id:record.id,author_id:userId,body:body.value.trim(),is_internal:staff&&internal.checked,message_kind:'reply'});
     if(error)throw error;if(isCurrent()){report(t.success);refresh();}
    }catch{report(t.failed,true);send.disabled=false;}
   });history.append(messageForm);card.append(history);
  }
  root.append(card);
 }
 if(staff||!resident)return;
 const form=element('form',undefined,'staff-form');form.append(element('h4',cleaning?t.cleaning:t.new));
 detail(form,t.room,resident.verified_room_number||t.unassigned);
 let subject,description,category,urgent,date,windowSelect,note,cleaningType,slotSelect;
 if(cleaning){
  date=input('date',true);date.min=bratislavaToday();windowSelect=select(t.windows,'anytime');cleaningType=select(t.types,'standard');note=textArea('',1500);
  slotSelect=select(slotOptions(),'');slotSelect.required=true;
  form.append(field(cw.slots,slotSelect),field(t.type,cleaningType),field(t.notes,note));
 }else{
  subject=input('text',true);subject.minLength=3;subject.maxLength=160;description=textArea('',4000);description.required=true;
  category=select(t.categories,'maintenance');urgent=input('checkbox');
  form.append(field(t.subject,subject),field(t.description,description),field(t.category,category),field(t.urgent,urgent));
 }
 const submit=button(t.submit);submit.disabled=cleaning&&!slots.some(s=>s.remaining>0);form.append(submit);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!isCurrent()||!form.reportValidity())return;submit.disabled=true;
  try{
   const selectedSlot=cleaning?slots.find(s=>s.id===slotSelect.value):null;
   if(cleaning&&!selectedSlot)throw Error('slot_required');
   const payload=cleaning?{slot_id:selectedSlot.id,preferred_date:bratislavaLocalDateTime(selectedSlot.starts_at).slice(0,10),preferred_window:'anytime',cleaning_type:cleaningType.value,notes:note.value.trim(),status:'requested'}:{subject:subject.value.trim(),description:description.value.trim(),category:category.value,urgent:urgent.checked,status:'new',staff_note:''};
   const {data,error}=await db.from(table).insert({...payload,tenant_id:tenant,resident_id:resident.id}).select('id');
   if(error||!data?.length)throw Error('save_failed');if(isCurrent()){report(t.success);refresh();}
  }catch{report(t.failed,true);submit.disabled=false;}
 });root.append(form);
}

export function bratislavaLocalDateTime(value){
 const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bratislava',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function bratislavaInstant(local){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local))throw Error('invalid_datetime');
 // Try both valid Bratislava offsets, reject a nonexistent clock time at spring DST.
 for(const offset of ['+01:00','+02:00']){
  const d=new Date(local+':00'+offset);
  if(Number.isFinite(d.getTime())&&bratislavaLocalDateTime(d)===local)return d.toISOString();
 }
 throw Error('invalid_datetime');
}

async function renderSlotManager({ctx,root,cw,t,report,records}){
 const {db,tenant,isCurrent,refresh}=ctx,section=element('details');section.open=true;section.append(element('summary',cw.slots));
 const slots=await ctx.list('cleaning_slots');if(!isCurrent())return;
 for(const slot of slots.filter(s=>s.starts_at>new Date().toISOString()).sort((a,b)=>a.starts_at.localeCompare(b.starts_at))){
  const used=records.filter(r=>r.slot_id===slot.id&&!['rejected','cancelled'].includes(r.status)).length;
  const row=element('p',dateTime(slot.starts_at)+' – '+dateTime(slot.ends_at)+' · '+slot.resource+' · '+used+'/'+slot.capacity+' '+(slot.enabled?'':'×'));
  if(slot.enabled){const close=button(cw.close,'button');close.onclick=async()=>{close.disabled=true;const {data,error}=await db.from('cleaning_slots').update({enabled:false}).eq('tenant_id',tenant).eq('id',slot.id).eq('updated_at',slot.updated_at).select('id');if(error||!data?.length){report(t.failed,true);close.disabled=false;}else refresh();};row.append(close);}section.append(row);
 }
 const form=element('form',undefined,'staff-form'),start=input('datetime-local',true),end=input('datetime-local',true),resource=input('text',true),capacity=input('number',true);
 resource.maxLength=100;resource.value='Upratovanie';capacity.min='1';capacity.max='20';capacity.value='1';
 form.append(field(cw.start,start),field(cw.end,end),field(cw.resource,resource),field(cw.capacity,capacity));const add=button(cw.add);form.append(add);
 form.onsubmit=async event=>{event.preventDefault();if(!form.reportValidity())return;add.disabled=true;try{const starts_at=bratislavaInstant(start.value),ends_at=bratislavaInstant(end.value);if(starts_at<=new Date().toISOString()||ends_at<=starts_at)throw Error('invalid_date');const {data,error}=await db.from('cleaning_slots').insert({tenant_id:tenant,starts_at,ends_at,resource:resource.value.trim(),capacity:Number(capacity.value)}).select('id');if(error||!data?.length)throw Error('save_failed');if(isCurrent())refresh();}catch{report(t.failed,true);add.disabled=false;}};
 section.append(form);root.append(section);
}
