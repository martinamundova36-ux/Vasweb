// Existing operational tables, tenant-scoped queries and RLS remain authoritative.
const dictionaries={
 sk:{requests:'Poruchy a požiadavky',cleaning:'Objednať upratovanie',help:'Odoslanie žiadosti neznamená potvrdený termín ani cenu.',empty:'Zatiaľ žiadne žiadosti.',room:'Izba',unassigned:'Nepriradená',reference:'Číslo požiadavky',created:'Vytvorené',history:'História a správy',public:'Odpoveď viditeľná študentovi',internal:'Interná poznámka – iba recepcia',send:'Odoslať správu',save:'Uložiť zmeny',new:'Nová požiadavka',subject:'Predmet',description:'Popis problému',category:'Typ požiadavky',urgent:'Urgentný problém',date:'Požadovaný dátum',window:'Preferovaný čas',notes:'Poznámka',price:'Potvrdená cena (€)',scheduled:'Navrhnutý alebo potvrdený termín',type:'Druh upratovania',submit:'Odoslať žiadosť',success:'Uložené.',failed:'Nepodarilo sa uložiť. Skús to znova.',status:'Stav',loadFailed:'Správy sa nepodarilo načítať.',confirm:'Uložiť zmeny tejto žiadosti?',statuses:{new:'Nové',accepted:'Prijaté',in_progress:'Rieši sa',waiting_parts:'Čaká sa na súčiastky',resolved:'Vyriešené',closed:'Uzavreté',cancelled:'Zrušené',requested:'Čaká na potvrdenie',proposed:'Navrhnutý iný termín',approved:'Potvrdené',rejected:'Zamietnuté',completed:'Vykonané'},categories:{maintenance:'Porucha',documents:'Dokumenty',parcel:'Zásielka',other:'Iné'},windows:{morning:'Dopoludnia',afternoon:'Popoludní',anytime:'Kedykoľvek'},types:{standard:'Bežné upratovanie',deep:'Dôkladné upratovanie',other:'Iné – uveď v poznámke'}},
 en:{requests:'Maintenance and requests',cleaning:'Request cleaning',help:'Submitting a request does not confirm the appointment or price.',empty:'No requests yet.',room:'Room',unassigned:'Unassigned',reference:'Request number',created:'Created',history:'History and messages',public:'Reply visible to the student',internal:'Internal note – reception only',send:'Send message',save:'Save changes',new:'New request',subject:'Subject',description:'Problem description',category:'Request type',urgent:'Urgent problem',date:'Preferred date',window:'Preferred time',notes:'Note',price:'Confirmed price (€)',scheduled:'Proposed or confirmed appointment',type:'Cleaning type',submit:'Submit request',success:'Saved.',failed:'Unable to save. Try again.',status:'Status',loadFailed:'Unable to load messages.',confirm:'Save changes to this request?',statuses:{new:'New',accepted:'Accepted',in_progress:'In progress',waiting_parts:'Waiting for parts',resolved:'Resolved',closed:'Closed',cancelled:'Cancelled',requested:'Awaiting confirmation',proposed:'Alternative appointment proposed',approved:'Confirmed',rejected:'Rejected',completed:'Completed'},categories:{maintenance:'Maintenance',documents:'Documents',parcel:'Parcel',other:'Other'},windows:{morning:'Morning',afternoon:'Afternoon',anytime:'Any time'},types:{standard:'Standard cleaning',deep:'Deep cleaning',other:'Other – describe in note'}}
};
Object.assign(dictionaries,{
 ru:{...dictionaries.en,unassigned:'Не назначена',loadFailed:'Не удалось загрузить заявки.',requests:'Неисправности и заявки',cleaning:'Заказать уборку',help:'Отправка заявки не подтверждает время и цену.',empty:'Заявок пока нет.',room:'Комната',reference:'Номер заявки',created:'Создано',history:'История и сообщения',public:'Ответ, видимый студенту',internal:'Внутренняя заметка — только ресепшен',send:'Отправить сообщение',save:'Сохранить изменения',new:'Новая заявка',subject:'Тема',description:'Описание проблемы',category:'Тип заявки',urgent:'Срочная проблема',date:'Желаемая дата',window:'Желаемое время',notes:'Примечание',price:'Подтверждённая цена (€)',scheduled:'Предложенное или подтверждённое время',type:'Вид уборки',submit:'Отправить заявку',success:'Сохранено.',failed:'Не удалось сохранить. Попробуйте ещё раз.',status:'Статус',confirm:'Сохранить изменения заявки?',statuses:{new:'Новая',accepted:'Принята',in_progress:'В работе',waiting_parts:'Ожидание запчастей',resolved:'Решена',closed:'Закрыта',cancelled:'Отменена',requested:'Ожидает подтверждения',proposed:'Предложено другое время',approved:'Подтверждена',rejected:'Отклонена',completed:'Выполнена'},categories:{maintenance:'Неисправность',documents:'Документы',parcel:'Посылка',other:'Другое'},windows:{morning:'Утром',afternoon:'После обеда',anytime:'В любое время'},types:{standard:'Обычная уборка',deep:'Генеральная уборка',other:'Другое — уточните в примечании'}},
 uk:{...dictionaries.en,unassigned:'Не призначено',loadFailed:'Не вдалося завантажити заявки.',requests:'Несправності та заявки',cleaning:'Замовити прибирання',help:'Надсилання заявки не підтверджує час і ціну.',empty:'Заявок поки немає.',room:'Кімната',reference:'Номер заявки',created:'Створено',history:'Історія та повідомлення',public:'Відповідь, видима студенту',internal:'Внутрішня примітка — лише рецепція',send:'Надіслати повідомлення',save:'Зберегти зміни',new:'Нова заявка',subject:'Тема',description:'Опис проблеми',category:'Тип заявки',urgent:'Термінова проблема',date:'Бажана дата',window:'Бажаний час',notes:'Примітка',price:'Підтверджена ціна (€)',scheduled:'Запропонований або підтверджений час',type:'Вид прибирання',submit:'Надіслати заявку',success:'Збережено.',failed:'Не вдалося зберегти. Спробуйте ще раз.',status:'Статус',confirm:'Зберегти зміни заявки?',statuses:{new:'Нова',accepted:'Прийнята',in_progress:'В роботі',waiting_parts:'Очікування запчастин',resolved:'Вирішена',closed:'Закрита',cancelled:'Скасована',requested:'Очікує підтвердження',proposed:'Запропоновано інший час',approved:'Підтверджена',rejected:'Відхилена',completed:'Виконана'},categories:{maintenance:'Несправність',documents:'Документи',parcel:'Посилка',other:'Інше'},windows:{morning:'Вранці',afternoon:'Після обіду',anytime:'Будь-коли'},types:{standard:'Звичайне прибирання',deep:'Генеральне прибирання',other:'Інше — уточніть у примітці'}}
});
const capacityWords={
 sk:{slots:'Dostupné termíny upratovania',empty:'Recepcia zatiaľ nevypísala voľný termín.',start:'Začiatok',end:'Koniec',resource:'Upratovačka / kapacita',capacity:'Počet súbežných rezervácií',add:'Pridať termín',close:'Uzavrieť termín',free:'Voľné miesta',choose:'Vyber dostupný termín'},
 en:{slots:'Available cleaning appointments',empty:'Reception has not published an available appointment yet.',start:'Start',end:'End',resource:'Cleaner / resource',capacity:'Concurrent reservations',add:'Add appointment',close:'Close appointment',free:'Available places',choose:'Choose an available appointment'},
 ru:{slots:'Доступное время уборки',empty:'Ресепшен пока не опубликовал свободное время.',start:'Начало',end:'Конец',resource:'Уборщик / ресурс',capacity:'Количество бронирований',add:'Добавить время',close:'Закрыть время',free:'Свободные места',choose:'Выберите свободное время'},
 uk:{slots:'Доступний час прибирання',empty:'Рецепція ще не опублікувала вільний час.',start:'Початок',end:'Кінець',resource:'Прибиральник / ресурс',capacity:'Кількість бронювань',add:'Додати час',close:'Закрити час',free:'Вільні місця',choose:'Оберіть вільний час'}
};
const photoWords={sk:{photo:'Fotografia poruchy (JPG/PNG, max. 6 MB)',add:'Pridať fotografiu',open:'Otvoriť fotografiu',failed:'Hlásenie je uložené, fotografiu sa nepodarilo nahrať. Pridaj ju pri uloženom hlásení.'},en:{photo:'Problem photo (JPG/PNG, max 6 MB)',add:'Add photo',open:'Open photo',failed:'Your request was saved, but its photo could not be uploaded. Add it to the saved request.'},ru:{photo:'Фото неисправности (JPG/PNG, до 6 МБ)',add:'Добавить фото',open:'Открыть фото',failed:'Заявка сохранена, фото не загружено. Добавьте его к сохранённой заявке.'},uk:{photo:'Фото несправності (JPG/PNG, до 6 МБ)',add:'Додати фото',open:'Відкрити фото',failed:'Заявку збережено, фото не завантажено. Додайте його до збереженої заявки.'}};
export const serviceWords=lang=>dictionaries[lang]||dictionaries.en;
export const serviceStates=['new','accepted','in_progress','waiting_parts','resolved','closed','cancelled'];
export const cleaningStates=['requested','proposed','approved','rejected','completed','cancelled'];
export const bratislavaToday=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bratislava'}).format(new Date());
const formatDateTime=(value,lang)=>value?new Intl.DateTimeFormat(({sk:'sk-SK',en:'en-GB',ru:'ru-RU',uk:'uk-UA'})[lang]||'sk-SK',{timeZone:'Europe/Bratislava',dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'—';
const element=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=String(value);if(cls)e.className=cls;return e;};
const field=(text,input)=>{const label=element('label',text);input.setAttribute('aria-label',text);label.append(input);return label;};
const select=(items,value)=>{const s=element('select');for(const [key,label] of Object.entries(items)){const o=element('option',label);o.value=key;o.selected=key===value;s.append(o);}return s;};
const textArea=(value='',limit=4000)=>{const e=element('textarea');e.rows=3;e.maxLength=limit;e.value=value;return e;};
const input=(type,required=false)=>{const e=element('input');e.type=type;e.required=required;return e;};
const button=(label,type='submit')=>{const b=element('button',label);b.type=type;return b;};
const detail=(root,label,value)=>{if(value!==null&&value!==undefined&&value!=='')root.append(element('p',label+': '+value,'small'));};


const calendarCopy={
 sk:{title:'Kalendár upratovania',day:'Vyber deň',time:'Voľné hodiny',none:'Na tento deň nie sú voľné hodiny.',prev:'Predchádzajúci mesiac',next:'Nasledujúci mesiac',today:'Dnes',price:'Upratovanie izby · 30 €',help:'Vyber deň a voľný čas. Recepcia potvrdí termín.',staffHelp:'Vyber deň, nastav hodiny a zverejni termín pre študentov.',start:'Od',end:'Do',bookings:'Rezervácie',all:'Všetky rezervácie',occupied:'Obsadené',closed:'Uzavreté',conflict:'Termín sa nepodarilo uložiť. Skontroluj hodiny a prekrývanie termínov.',unavailable:'Termín už nemusí byť voľný. Obnov kalendár a vyber iný čas.',refresh:'Obnoviť kalendár',week:['Po','Ut','St','Št','Pi','So','Ne']},
 en:{title:'Cleaning calendar',day:'Choose a day',time:'Available times',none:'No available times on this day.',prev:'Previous month',next:'Next month',today:'Today',price:'Room cleaning · €30',help:'Choose a day and time. Reception confirms your appointment.',staffHelp:'Choose a day, set the hours and publish the appointment for students.',start:'From',end:'To',bookings:'Bookings',all:'All bookings',occupied:'Full',closed:'Closed',conflict:'Unable to save. Check the hours and overlapping appointments.',unavailable:'This time may no longer be available. Refresh and choose another time.',refresh:'Refresh calendar',week:['Mon','Tue','Wed','Thu','Fri','Sat','Sun']},
 ru:{title:'Календарь уборки',day:'Выберите день',time:'Свободное время',none:'На этот день нет свободного времени.',prev:'Предыдущий месяц',next:'Следующий месяц',today:'Сегодня',price:'Уборка комнаты · 30 €',help:'Выберите день и время. Ресепшен подтвердит запись.',staffHelp:'Выберите день и часы, затем опубликуйте запись для студентов.',start:'С',end:'До',bookings:'Записи',all:'Все записи',occupied:'Занято',closed:'Закрыто',conflict:'Не удалось сохранить. Проверьте время и пересечения.',unavailable:'Время может быть занято. Обновите календарь и выберите другое.',refresh:'Обновить календарь',week:['Пн','Вт','Ср','Чт','Пт','Сб','Вс']},
 uk:{title:'Календар прибирання',day:'Оберіть день',time:'Вільний час',none:'На цей день немає вільного часу.',prev:'Попередній місяць',next:'Наступний місяць',today:'Сьогодні',price:'Прибирання кімнати · 30 €',help:'Оберіть день і час. Рецепція підтвердить запис.',staffHelp:'Оберіть день і години та опублікуйте запис для студентів.',start:'З',end:'До',bookings:'Записи',all:'Усі записи',occupied:'Зайнято',closed:'Закрито',conflict:'Не вдалося зберегти. Перевірте час і перетини.',unavailable:'Час може бути зайнятий. Оновіть календар та оберіть інший.',refresh:'Оновити календар',week:['Пн','Вт','Ср','Чт','Пт','Сб','Нд']}
};
const calWords=lang=>calendarCopy[lang]||calendarCopy.en;
const SH_TENANT='ae045243-98f0-4f22-a736-d33a92f9ba61';
const shTariffCopy={
 sk:['Upratovanie kúpeľne','Bežné upratovanie (izba + kúpeľňa)','Hĺbkové upratovanie, vyklepávanie kobercov a umývanie okien','Cenník doplnkových služieb','Všetky ceny vrátane 23 % DPH','Prenájom väčšej chladničky','Prenájom vysávača','Prenájom žehličky','Predaj tovaru','Prikrývka 140 × 200 cm','Vankúš 90 × 70 cm','mesiac / izba','hodina','kus','izba','Vyber druh upratovania','O ostatné služby a tovar požiadaj na recepcii.'],
 en:['Regular bathroom cleaning','Regular cleaning (room + bathroom)','Deep cleaning, carpet beating and window washing','Extra services price list','All prices include 23% VAT','Rent of larger fridge','Rent of vacuum cleaner','Rent of iron','Goods for sale','Quilt 140 × 200 cm','Pillow 90 × 70 cm','month / room','hour','piece','room','Choose cleaning type','Contact reception for other services and goods.'],
 ru:['Обычная уборка ванной','Обычная уборка (комната + ванная)','Глубокая уборка, выбивание ковров и мытьё окон','Цены дополнительных услуг','Все цены включают НДС 23%','Аренда большого холодильника','Аренда пылесоса','Аренда утюга','Товары для продажи','Одеяло 140 × 200 см','Подушка 90 × 70 см','месяц / комната','час','штука','комната','Выберите вид уборки','За другими услугами и товарами обращайтесь на ресепшен.'],
 uk:['Звичайне прибирання ванної','Звичайне прибирання (кімната + ванна)','Глибоке прибирання, вибивання килимів і миття вікон','Ціни додаткових послуг','Усі ціни включають ПДВ 23%','Оренда більшого холодильника','Оренда пилососа','Оренда праски','Товари на продаж','Ковдра 140 × 200 см','Подушка 90 × 70 см','місяць / кімната','година','штука','кімната','Оберіть вид прибирання','За іншими послугами й товарами звертайтеся на рецепцію.']
};
const cleaningTariffs=Object.freeze({bathroom:30,standard:60,deep:100});
function renderExtrasTariff(root,copy){
 const panel=element('details',undefined,'staff-form');panel.append(element('summary',copy[3]),element('p',copy[4],'muted'));
 for(const [label,amount,unit] of [[copy[0],30,copy[14]],[copy[1],60,copy[14]],[copy[2],100,copy[14]],[copy[5],10,copy[11]],[copy[6],1,copy[12]],[copy[7],1,copy[12]]])panel.append(element('p',label+' · '+amount+' € / '+unit));
 panel.append(element('h4',copy[8]),element('p',copy[9]+' · 33 € / '+copy[13]),element('p',copy[10]+' · 30 € / '+copy[13]),element('p',copy[16],'muted'));root.append(panel);
}

const dayOf=value=>bratislavaLocalDateTime(value).slice(0,10);
const hourOf=value=>bratislavaLocalDateTime(value).slice(11,16);
const isoDay=d=>d.toISOString().slice(0,10);
const calendarSelection=new Map();
function cleaningCalendar(ctx,slots,onDay){
 const w=calWords(ctx.lang),key=ctx.tenant+':'+ctx.userId+':'+ctx.staff,today=bratislavaToday(),panel=element('section',undefined,'staff-form');
 let picked=calendarSelection.get(key)||today;
 if(!ctx.staff&&picked<today)picked=today;
 let month=new Date(picked.slice(0,7)+'-01T00:00:00Z');
 const header=element('div'),title=element('strong'),prev=button('‹','button'),next=button('›','button'),now=button(w.today,'button'),grid=element('div');
 header.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap';
 grid.style.cssText='display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;width:100%;margin:12px 0';
 prev.setAttribute('aria-label',w.prev);next.setAttribute('aria-label',w.next);header.append(prev,title,next,now);panel.append(header,grid);
 function draw(){
  title.textContent=new Intl.DateTimeFormat(ctx.lang==='uk'?'uk-UA':ctx.lang,{month:'long',year:'numeric',timeZone:'UTC'}).format(month);
  grid.replaceChildren();
  for(const label of w.week){const d=element('span',label);d.style.cssText='text-align:center;font-size:12px;font-weight:600';grid.append(d);}
  const offset=(month.getUTCDay()+6)%7,last=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+1,0)).getUTCDate();
  for(let i=0;i<offset;i++)grid.append(element('span'));
  for(let i=1;i<=last;i++){
   const date=isoDay(new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth(),i))),count=slots.filter(s=>dayOf(s.starts_at)===date&&(ctx.staff||s.remaining>0)).length;
   const b=button(String(i)+(count?' ·'+count:''),'button');
   b.style.cssText='min-width:0;width:100%;padding:8px 1px;min-height:42px;font-size:12px;border:1px solid #d4e0ed;border-radius:8px;background:'+(date===picked?'#142b4d':count?'#e2f2e7':'#fff')+';color:'+(date===picked?'#fff':'#142b4d');
   b.disabled=!ctx.staff&&(date<today||!count);b.setAttribute('aria-label',date+(count?' · '+count:''));b.setAttribute('aria-pressed',String(date===picked));b.onclick=()=>{picked=date;calendarSelection.set(key,picked);draw();onDay(picked);};grid.append(b);
  }
 }
 const shift=n=>{month=new Date(Date.UTC(month.getUTCFullYear(),month.getUTCMonth()+n,1));draw();};
 prev.onclick=()=>shift(-1);next.onclick=()=>shift(1);now.onclick=()=>{picked=today;calendarSelection.set(key,picked);month=new Date(today.slice(0,7)+'-01T00:00:00Z');draw();onDay(picked);};
 draw();return {panel,day:picked};
}

export async function renderServiceRequests(ctx){
 const dateTime=value=>formatDateTime(value,ctx.lang);
 const {root,db,list,tenant,staff,resident,userId,lang,isCurrent,refresh}=ctx;
 const pw=photoWords[lang]||photoWords.en;
 const validPhoto=file=>!file||(file.size>0&&file.size<=6000000&&['image/jpeg','image/png'].includes(file.type));
 const uploadPhoto=async(id,file)=>{if(!validPhoto(file))throw Error('invalid_photo');const body=new FormData();body.append('action','upload');body.append('tenant_id',tenant);body.append('kind','fault_photo');body.append('request_id',id);body.append('file',file);const {data,error}=await db.functions.invoke('residence-files',{body});if(error||!data?.ok)throw Error('photo_failed');};
 const cleaning=ctx.cleaning,t=serviceWords(lang),table=cleaning?'cleaning_bookings':'service_requests';
 if(!isCurrent())return;root.replaceChildren();
 const cal=calWords(lang),sh=tenant===SH_TENANT,copy=shTariffCopy[lang]||shTariffCopy.en;const tariffs=sh?cleaningTariffs:{standard:30};const types=sh?{bathroom:copy[0],standard:copy[1],deep:copy[2]}:{standard:t.types.standard};root.append(element('h3',cleaning?(staff?({sk:'Objednávky upratovania',en:'Cleaning orders',ru:'Заказы на уборку',uk:'Замовлення прибирання'})[lang]:cal.title):t.requests),element('p',cleaning?(staff?({sk:'Prehľad objednávok študentov a ich spracovanie.',en:'Review and process student bookings.',ru:'Просмотр и обработка заказов студентов.',uk:'Перегляд та обробка замовлень студентів.'})[lang]:cal.help):t.help,'muted'));if(cleaning){if(sh)renderExtrasTariff(root,copy);else root.append(element('strong',cal.price));}
 const filter=staff?undefined:{resident_id:resident?.id||'00000000-0000-0000-0000-000000000000'};
 let slots=[];
 if(cleaning){const {data,error}=await db.rpc('residence_cleaning_availability',{p_tenant:tenant});if(error){root.append(element('p',t.loadFailed,'danger'));const retry=button(cal.refresh,'button');retry.onclick=refresh;root.append(retry);return;}slots=data||[];}
 const cw=capacityWords[lang]||capacityWords.en;
 const slotOptions=(selected='')=>Object.fromEntries([['',cw.choose],...slots.filter(s=>s.remaining>0||s.id===selected).map(s=>[s.id,dateTime(s.starts_at)+' – '+dateTime(s.ends_at)+' · '+s.resource+' · '+cw.free+': '+s.remaining])]);
 const [records,people,messages,files]=await Promise.all([list(table,filter),staff?list('residents'):Promise.resolve(resident?[resident]:[]),cleaning?Promise.resolve([]):list('service_request_messages'),cleaning?Promise.resolve([]):list('residence_portal_files',{kind:'fault_photo'})]);
 if(!isCurrent())return;
 const room=id=>people.find(p=>p.id===id)?.verified_room_number||t.unassigned;
 const name=id=>people.find(p=>p.id===id)?.full_name||'';
 const notice=element('p');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');root.append(notice);
 const report=(message,bad=false)=>{if(!isCurrent())return;notice.textContent=message;notice.style.color=bad?'#a32c30':'';};
 let allSlots=slots;
 const orderWords=({sk:['Objednávky upratovania','Nové objednávky','Potvrdené','Vykonané','Nastavenie dostupných termínov','Moje objednávky','Zatiaľ žiadne objednávky upratovania.','Všetky','Čakajúce','Ostatné'],en:['Cleaning orders','New orders','Confirmed','Completed','Manage availability','My bookings','No cleaning orders yet.','All','Pending','Other'],ru:['Заказы на уборку','Новые заказы','Подтверждённые','Выполненные','Настройка доступного времени','Мои заказы','Заказов пока нет.','Все','Ожидающие','Другие'],uk:['Замовлення прибирання','Нові замовлення','Підтверджені','Виконані','Налаштування доступного часу','Мої замовлення','Замовлень поки немає.','Усі','Очікують','Інші']})[lang];
 const orderHost=element('section'),orderList=element('div');let settings=null;
 if(cleaning&&staff){
  allSlots=await ctx.list('cleaning_slots');if(!isCurrent())return;
  const kpis=element('div');kpis.style.cssText='display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin:16px 0';
  const groups=[['requested',1],['approved',2],['completed',3]];
  for(const [status,i] of groups){const n=records.filter(r=>r.status===status).length;const tile=element('div',undefined,'file-item');tile.style.cssText='padding:14px;background:'+(status==='requested'&&n?'#fff0ed':'#f3f7fb')+';border:1px solid '+(status==='requested'&&n?'#d73c35':'#d4e0ed')+';border-radius:12px';const count=element('strong',n);count.style.cssText='display:block;font-size:30px;color:'+(status==='requested'&&n?'#b42318':'#142b4d');tile.append(element('span',orderWords[i]),count);kpis.append(tile);}
  root.append(kpis);orderHost.append(element('h4',orderWords[0]));
  const filter=select({all:orderWords[7],pending:orderWords[8],approved:orderWords[2],completed:orderWords[3],other:orderWords[9]},'all');filter.setAttribute('aria-label',orderWords[0]);filter.onchange=()=>{for(const card of orderList.children){const s=card.dataset.orderStatus;card.hidden=filter.value!=='all'&&(filter.value==='pending'?['requested','proposed'].indexOf(s)<0:filter.value==='other'?['rejected','cancelled'].indexOf(s)<0:s!==filter.value);}};orderHost.append(filter);
  settings=element('details');settings.append(element('summary',orderWords[4]));
 }else if(cleaning){orderHost.append(element('h4',orderWords[5]));}
 if(cleaning){orderHost.append(orderList);if(staff)root.append(orderHost);}
 if(cleaning&&!staff&&!slots.some(s=>s.remaining>0))root.append(element('p',cw.empty,'muted'));
 if(!records.length)(cleaning?orderList:root).append(element('p',cleaning?orderWords[6]:t.empty,'muted'));
 for(const record of records.sort((a,b)=>(cleaning&&staff?Number(b.status==='requested')-Number(a.status==='requested'):0)||String(b.created_at).localeCompare(String(a.created_at)))){
  const card=element('article',undefined,'file-item');if(cleaning){card.dataset.orderStatus=record.status;if(staff&&record.status==='requested'){card.style.cssText='border:2px solid #d73c35;background:#fff9f8';const flag=element('strong',orderWords[1].toUpperCase());flag.style.color='#b42318';card.append(flag);}}
  card.append(element('h4',cleaning?t.cleaning:record.subject));
  if(staff)detail(card,'',name(record.resident_id));
  detail(card,t.reference,record.id);detail(card,t.room,room(record.resident_id));
  detail(card,t.created,dateTime(record.created_at));
  detail(card,t.status,t.statuses[record.status]||record.status);
  if(!cleaning&&record.urgent)card.append(element('strong',t.urgent));
  if(cleaning){
   detail(card,t.date,ctx.day(record.preferred_date));const booked=allSlots.find(s=>s.id===record.slot_id);detail(card,t.window,booked?hourOf(booked.starts_at)+' – '+hourOf(booked.ends_at):record.scheduled_at?dateTime(record.scheduled_at):t.windows[record.preferred_window]||record.preferred_window);
   detail(card,t.type,types[record.cleaning_type]||t.types[record.cleaning_type]||record.cleaning_type);
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
    price=input('number');price.readOnly=true;price.value=record.price_eur??'';
    // A date/time chosen at reception is explicitly interpreted as Bratislava local time.
    const choices=slotOptions(record.slot_id);const current=allSlots.find(s=>s.id===record.slot_id);if(current&&!choices[current.id])choices[current.id]=dateTime(current.starts_at)+' – '+hourOf(current.ends_at);time=select(choices,record.slot_id||'');
    form.append(field(t.price,price),field(t.scheduled,time));
   }
   const save=button(t.save);
   const state=element('p',undefined,'staff-notice staff-approval-success');state.setAttribute('role','status');
   const errorBox=element('p',undefined,'danger');errorBox.setAttribute('role','alert');
   const saving=({sk:'Ukladá sa…',en:'Saving…',ru:'Сохранение…',uk:'Збереження…'})[lang]||'Saving…';
   const setSaved=current=>{
    state.textContent='✓ '+(t.statuses[current]||current);
    state.hidden=false;save.hidden=true;
   };
   const confirmed=cleaning?['proposed','approved','rejected','completed','cancelled']:['accepted','in_progress','waiting_parts','resolved','closed','cancelled'];
   state.hidden=true;
   if(confirmed.includes(record.status))setSaved(record.status);
   form.addEventListener('input',()=>{save.hidden=false;state.hidden=true;});
   form.append(save,state,errorBox);
   form.addEventListener('submit',async event=>{
    event.preventDefault();if(!isCurrent()||save.disabled||save.hidden||!form.reportValidity()||!confirm(t.confirm))return;
    save.disabled=true;save.textContent=saving;errorBox.textContent='';
    try{
     const payload={status:status.value,staff_note:publicNote.value.trim()};
     if(cleaning){payload.slot_id=time.value||record.slot_id||null;const selectedSlot=allSlots.find(s=>s.id===time.value);payload.scheduled_at=selectedSlot?.starts_at||record.scheduled_at||null;}
     const {data,error}=await db.from(table).update(payload).eq('tenant_id',tenant).eq('id',record.id).eq('updated_at',record.updated_at).select('id');
     if(error||!data?.length)throw Error('save_failed');
     if(isCurrent()){setSaved(payload.status);refresh();}
    }catch{if(isCurrent())errorBox.textContent=t.failed;}
    finally{save.disabled=false;save.textContent=t.save;}
   });card.append(form);
  }
  if(!cleaning){
   for(const file of files.filter(f=>f.active&&f.kind==='fault_photo'&&f.service_request_id===record.id)){const open=button(pw.open+' · '+file.original_name,'button');open.onclick=()=>ctx.openFile?.(file.id);card.append(open);}
   if(!staff){const photo=input('file');photo.accept='image/jpeg,image/png';photo.setAttribute('aria-label',pw.photo);const add=button(pw.add,'button');add.onclick=async()=>{const f=photo.files?.[0];if(!f||!validPhoto(f)){report(t.failed,true);return;}add.disabled=true;try{await uploadPhoto(record.id,f);if(isCurrent())refresh();}catch{report(pw.failed,true);add.disabled=false;}};card.append(field(pw.photo,photo),add);}
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
  (cleaning?orderList:root).append(card);
 }
 if(cleaning&&staff){await renderSlotManager({ctx,root:settings,cw,t,report,records,slots:allSlots,people});root.append(settings);}
 if(staff||!resident)return;
 const form=element('form',undefined,'staff-form');form.append(element('h4',cleaning?t.cleaning:t.new));
 detail(form,t.room,resident.verified_room_number||t.unassigned);
 let subject,description,category,urgent,date,windowSelect,note,cleaningType,slotSelect,faultPhoto;
 if(cleaning){
  note=textArea('',1500);cleaningType=select(Object.fromEntries([['',sh?copy[15]:cw.choose],...Object.entries(types).map(([key,label])=>[key,label+' · '+tariffs[key]+' €'+(sh?' / '+copy[14]:'')])]),'');cleaningType.required=true;slotSelect={value:''};
  const hours=element('div');hours.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:8px 0';
  const timeHeading=element('strong',cal.time);const selection=element('p','','muted');
  function showHours(day){
   slotSelect.value='';selection.textContent=day;hours.replaceChildren();
   const available=slots.filter(s=>s.remaining>0&&dayOf(s.starts_at)===day);
   if(!available.length)hours.append(element('p',cal.none,'muted'));
   for(const s of available){const b=button(hourOf(s.starts_at)+' – '+hourOf(s.ends_at),'button');b.className='btn-secondary';b.setAttribute('aria-pressed','false');b.onclick=()=>{form.dataset.liveDirty='true';slotSelect.value=s.id;selection.textContent=day+' · '+b.textContent;for(const n of hours.querySelectorAll('button')){n.setAttribute('aria-pressed',String(n===b));n.style.outline=n===b?'2px solid #142b4d':'';}form.querySelector('button[type=submit]').disabled=!cleaningType.value;};hours.append(b);}
   const submit=form.querySelector('button[type=submit]');if(submit)submit.disabled=true;
  }
  const calendar=cleaningCalendar(ctx,slots,showHours);
  form.append(field(t.type,cleaningType),calendar.panel,timeHeading,hours,selection,field(t.notes,note));cleaningType.onchange=()=>{const submit=form.querySelector('button[type=submit]');if(submit)submit.disabled=!cleaningType.value||!slotSelect.value;};showHours(calendar.day);
 }else{
  subject=input('text',true);subject.minLength=3;subject.maxLength=160;description=textArea('',4000);description.required=true;
  category=select(t.categories,'maintenance');urgent=input('checkbox');
  faultPhoto=input('file');faultPhoto.accept='image/jpeg,image/png';form.append(field(t.subject,subject),field(t.description,description),field(t.category,category),field(t.urgent,urgent),field(pw.photo,faultPhoto));
 }
 const submit=button(t.submit);submit.disabled=cleaning;form.append(submit);
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!isCurrent()||!form.reportValidity())return;submit.disabled=true;
  try{
   const chosenPhoto=faultPhoto?.files?.[0];if(!validPhoto(chosenPhoto))throw Error('invalid_photo');
   const selectedSlot=cleaning?slots.find(s=>s.id===slotSelect.value):null;
   if(cleaning&&!selectedSlot)throw Error('slot_required');
   const payload=cleaning?{slot_id:selectedSlot.id,preferred_date:bratislavaLocalDateTime(selectedSlot.starts_at).slice(0,10),preferred_window:'anytime',cleaning_type:cleaningType.value,notes:note.value.trim(),status:'requested',price_eur:tariffs[cleaningType.value],staff_note:''}:{subject:subject.value.trim(),description:description.value.trim(),category:category.value,urgent:urgent.checked,status:'new',staff_note:''};
   const {data,error}=await db.from(table).insert({...payload,tenant_id:tenant,resident_id:resident.id}).select('id');
   if(error||!data?.length)throw Error('save_failed');if(chosenPhoto){try{await uploadPhoto(data[0].id,chosenPhoto);}catch{alert(pw.failed);}}if(isCurrent()){report(t.success);refresh();}
  }catch{report(cleaning?cal.unavailable:t.failed,true);submit.disabled=false;}
 });root.append(form);if(cleaning)root.append(orderHost);
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

async function renderSlotManager({ctx,root,cw,t,report,records,slots,people}){
 const w=calWords(ctx.lang),{db,tenant,isCurrent,refresh}=ctx,section=element('section',undefined,'staff-form');
 const selected=element('strong'),rows=element('div'),form=element('form'),start=input('time',true),end=input('time',true),resource=input('text',true),capacity=input('number',true);
 let day=bratislavaToday();resource.maxLength=100;resource.value='Upratovanie';capacity.min='1';capacity.max='20';capacity.value='1';start.value='';end.value='';
 const add=button(cw.add);const retry=button(w.refresh,'button');retry.onclick=refresh;
 const timeFields=element('div');timeFields.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px';timeFields.append(field(w.start,start),field(w.end,end));
 form.append(timeFields,field(cw.resource,resource),field(cw.capacity,capacity),add);
 function showDay(value){
  day=value;selected.textContent=w.day+': '+ctx.day(day);rows.replaceChildren();add.disabled=day<bratislavaToday();
  const chosen=slots.filter(s=>dayOf(s.starts_at)===day).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));
  if(!chosen.length)rows.append(element('p',cw.empty,'muted'));
  for(const slot of chosen){
   const bookings=records.filter(r=>r.slot_id===slot.id&&!['rejected','cancelled'].includes(r.status));
   const row=element('article',undefined,'file-item');
   row.append(element('strong',hourOf(slot.starts_at)+' – '+hourOf(slot.ends_at)+' · '+slot.resource),element('p',cw.free+': '+Math.max(0,slot.capacity-bookings.length)+' / '+slot.capacity+' · '+(!slot.enabled?w.closed:bookings.length>=slot.capacity?w.occupied:''),'muted'));
   for(const r of bookings){const p=people.find(x=>x.id===r.resident_id);row.append(element('p',(p?.verified_room_number||t.unassigned)+' · '+(p?.full_name||'')+' · '+(t.statuses[r.status]||r.status),'small'));}
   if(slot.enabled&&slot.starts_at>new Date().toISOString()){const close=button(cw.close,'button');close.className='btn-secondary';close.onclick=async()=>{close.disabled=true;try{const {data,error}=await db.from('cleaning_slots').update({enabled:false}).eq('tenant_id',tenant).eq('id',slot.id).eq('updated_at',slot.updated_at).select('id');if(error||!data?.length)throw Error('save_failed');if(isCurrent())refresh();}catch{report(w.conflict,true);close.disabled=false;}};row.append(close);}
   rows.append(row);
  }
 }
 const calendar=cleaningCalendar(ctx,slots,showDay);section.append(element('h4',w.title),calendar.panel,selected,rows,form,retry);showDay(calendar.day);
 form.onsubmit=async event=>{event.preventDefault();if(!form.reportValidity()||!isCurrent())return;add.disabled=true;
  try{const starts_at=bratislavaInstant(day+'T'+start.value),ends_at=bratislavaInstant(day+'T'+end.value);if(starts_at<=new Date().toISOString()||ends_at<=starts_at||!resource.value.trim())throw Error('invalid_date');
   const {data,error}=await db.from('cleaning_slots').insert({tenant_id:tenant,starts_at,ends_at,resource:resource.value.trim(),capacity:Number(capacity.value)}).select('id');if(error||!data?.length)throw Error('save_failed');if(isCurrent())refresh();
  }catch{report(w.conflict,true);add.disabled=false;}
 };root.append(section,element('h4',w.all));
}
