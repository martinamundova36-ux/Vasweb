import {chargeBalance, cents} from './ledger.js';

// Presentation only: all amounts and identity come from tenant-scoped, RLS-protected records.
// The browser must never create a payment, invent a rent charge or change a payment status.
const words = {
 sk: {month:'Platba za tento mesiac',due:'Na úhradu',late:'Po splatnosti',partial:'Čiastočne uhradené',paid:'Uhradené',plan:'Schválený splátkový plán',total:'Predpis',balance:'Zostáva zaplatiť',dueDate:'Splatnosť',see:'Zobraziť splátkový kalendár',unassigned:'Recepcia zatiaľ nepriradila overenú zmluvu a mesačné predpisy. Údaje sa doplnia po schválení registrácie.',missing:'Na tento mesiac zatiaľ nie je v evidencii schválený predpis. Over si ho na recepcii.',calendar:'Mesačné platby podľa ubytovacej zmluvy',empty:'Mesačné predpisy ešte neboli vytvorené. Po schválení zmluvy ich doplní recepcia.',amount:'Suma',payment:'Uhradené',installments:'Dohodnuté splátky',quick:'Rýchle vybavenie',photo:'Nahrať fotografiu',clean:'Požiadať o upratovanie',message:'Napísať recepcii',docs:'Dokumenty na stiahnutie',myDetails:'Moje overené údaje',room:'Izba',contract:'Zmluva',fromTo:'Ubytovanie',check:'Údaje overuje recepcia',noCurrent:'V aktuálnom mesiaci nie je evidované nájomné.'},
 en: {month:'This month’s rent',due:'Payment due',late:'Overdue',partial:'Partly paid',paid:'Paid',plan:'Approved installment plan',total:'Charged',balance:'Amount outstanding',dueDate:'Due date',see:'View payment schedule',unassigned:'Reception has not yet linked a verified contract and monthly charges. Details appear after approval.',missing:'There is no approved rent charge for this month. Please check with reception.',calendar:'Monthly rent payments under your accommodation contract',empty:'Monthly charges have not been issued yet. Reception will populate these after contract approval.',amount:'Amount',payment:'Paid',installments:'Agreed installments',quick:'Quick actions',photo:'Upload photo',clean:'Request room cleaning',message:'Message reception',docs:'Download documents',myDetails:'My verified details',room:'Room',contract:'Contract',fromTo:'Accommodation',check:'Reception is verifying the details',noCurrent:'No rent charge recorded for the current month.'},
 ru: {month:'Аренда за текущий месяц',due:'К оплате',late:'Просрочено',partial:'Частично оплачено',paid:'Оплачено',plan:'Утверждённый график платежей',total:'Начислено',balance:'Осталось оплатить',dueDate:'Срок оплаты',see:'График платежей',unassigned:'Ресепшен ещё не связал подтверждённый договор и начисления. Данные появятся после утверждения.',missing:'Начисление за этот месяц пока не подтверждено. Уточните на ресепшене.',calendar:'Ежемесячные начисления по договору',empty:'Начисления ещё не созданы. Ресепшен добавит их после утверждения договора.',amount:'Сумма',payment:'Оплачено',installments:'Согласованные платежи',quick:'Быстрые действия',photo:'Загрузить фото',clean:'Запросить уборку',message:'Написать на ресепшен',docs:'Скачать документы',myDetails:'Подтверждённые данные',room:'Комната',contract:'Договор',fromTo:'Проживание',check:'Данные проверяются',noCurrent:'Нет начисления за текущий месяц.'},
 uk: {month:'Оренда за цей місяць',due:'До сплати',late:'Прострочено',partial:'Частково сплачено',paid:'Сплачено',plan:'Затверджений графік платежів',total:'Нараховано',balance:'Залишилося сплатити',dueDate:'Термін сплати',see:'Графік платежів',unassigned:'Рецепція ще не прив’язала перевірений договір та нарахування. Дані з’являться після підтвердження.',missing:'Нарахування за цей місяць ще не підтверджено. Уточніть на рецепції.',calendar:'Щомісячні платежі за договором',empty:'Нарахування ще не створені. Рецепція додасть їх після підтвердження договору.',amount:'Сума',payment:'Сплачено',installments:'Узгоджені платежі',quick:'Швидкі дії',photo:'Завантажити фото',clean:'Замовити прибирання',message:'Написати рецепції',docs:'Завантажити документи',myDetails:'Мої підтверджені дані',room:'Кімната',contract:'Договір',fromTo:'Проживання',check:'Рецепція перевіряє дані',noCurrent:'Немає нарахувань за поточний місяць.'}
};
const dict=lang=>words[lang]||words.sk;
const node=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n};
const currency=(value,lang)=>new Intl.NumberFormat(lang==='en'?'en-GB':'sk-SK',{style:'currency',currency:'EUR'}).format(Number(value)||0);
const dateValue=(date,lang)=>date?new Date(String(date).slice(0,10)+'T12:00:00').toLocaleDateString(lang==='en'?'en-GB':'sk-SK'):'—';
const monthValue=(period,lang)=>new Date(period+'-01T12:00:00').toLocaleDateString(lang==='en'?'en-GB':'sk-SK',{month:'long',year:'numeric'});
const todaySK=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Bratislava'});
const getRows=({charges,allocations,reversals})=>(charges||[]).filter(c=>c.kind==='rent').map(c=>({...c,...chargeBalance(c,allocations||[],reversals||[])}));
const paymentStatus=(record,today,hasPlan=false)=>{
 if(record.remaining<=0)return 'paid';
 if(hasPlan)return 'plan';
 if(record.due_on<today)return 'late';
 if(record.paid>0)return 'partial';
 return 'due';
};
const action=(label,go)=>{const b=node('button','btn-secondary',label);b.type='button';b.addEventListener('click',go);return b};
const summaryField=(label,value)=>{const p=node('p','student-data-line');p.append(node('strong','',label+': '),node('span','',value||'—'));return p};

export function renderStudentWelcome({root,resident,tenancies,lang,onOpen}){
 const t=dict(lang),section=node('section','student-welcome');
 section.append(node('h4','section-subtitle',t.myDetails));
 if(resident){
  section.append(summaryField(t.room,resident.verified_room_number),summaryField(t.contract,resident.verified_contract_number));
  section.append(summaryField(t.fromTo,resident.accommodation_from&&resident.accommodation_to?dateValue(resident.accommodation_from,lang)+' – '+dateValue(resident.accommodation_to,lang):'—'));
  if(!(tenancies||[]).length)section.append(node('p','muted',t.check));
 }else section.append(node('p','muted',t.unassigned));
 section.append(action(t.myDetails,()=>onOpen('profile')));
 root.append(section);
}

export function renderPaymentHighlight({root,resident,tenancies,charges,allocations,reversals,plans,lang,onOpen}){
 const t=dict(lang),today=todaySK(),period=today.slice(0,7);
 const panel=node('section','student-monthly-payment');
 panel.setAttribute('aria-label',t.month);
 panel.append(node('h4','',t.month+' · '+monthValue(period,lang)));
 const rows=getRows({charges,allocations,reversals}).filter(c=>c.period===period);
 if(!rows.length){
  panel.append(node('p','muted',!(tenancies||[]).length||!resident?t.unassigned:t.missing));
 }else{
  const total=rows.reduce((v,r)=>v+cents(r.amount),0);
  const remaining=rows.reduce((v,r)=>v+r.remaining,0);
  const planIds=new Set((plans||[]).map(p=>p.charge_id));
  const hasPlan=rows.some(r=>planIds.has(r.id));
  const state=remaining<=0?'paid':hasPlan?'plan':rows.some(r=>r.due_on<today)?'late':remaining<total?'partial':'due';
  panel.append(node('p','student-monthly-balance',currency(remaining/100,lang)));
  const status=node('span','student-payment-state payment-'+state,t[state]);status.setAttribute('role','status');panel.append(status);
  panel.append(summaryField(t.total,currency(total/100,lang)),summaryField(t.balance,currency(remaining/100,lang)));
  panel.append(summaryField(t.dueDate,rows.map(r=>r.due_on).sort()[0]?dateValue(rows.map(r=>r.due_on).sort()[0],lang):'—'));
 }
 panel.append(action(t.see,()=>onOpen('installments')));
 root.append(panel);
}

export function renderStudentActions({root,lang,onOpen}){
 const t=dict(lang),panel=node('section','student-quick-actions'),wrap=node('div','student-quick-grid');
 panel.append(node('h4','section-subtitle',t.quick));
 for(const [label,tab] of [[t.photo,'profile'],[t.clean,'cleaning'],[t.message,'requests'],[t.docs,'documents']]){
  const btn=action(label,()=>onOpen(tab));wrap.append(btn);
 }
 panel.append(wrap);root.append(panel);
}

export function renderMonthlyCalendar({root,charges,allocations,reversals,plans,items,lang,onOpen}){
 const t=dict(lang),today=todaySK(),rows=getRows({charges,allocations,reversals});
 root.append(node('h4','section-subtitle',t.calendar));
 if(!rows.length){root.append(node('div','empty-message',t.empty));root.append(action(t.message,()=>onOpen('requests')));return;}
 const planned=new Map((plans||[]).map(p=>[p.charge_id,p]));
 const ordered=rows.sort((a,b)=>String(a.period).localeCompare(String(b.period))||String(a.due_on).localeCompare(String(b.due_on)));
 for(const r of ordered){
  const plan=planned.get(r.id),state=paymentStatus(r,today,!!plan);
  const line=node('article','student-payment-row');
  const heading=node('div','student-payment-head');
  heading.append(node('strong','',monthValue(r.period,lang)),node('span','student-payment-state payment-'+state,t[state]));
  line.append(heading);
  line.append(summaryField(t.amount,currency(r.amount,lang)),summaryField(t.dueDate,dateValue(r.due_on,lang)));
  line.append(summaryField(t.payment,currency(r.paid/100,lang)),summaryField(t.balance,currency(r.remaining/100,lang)));
  if(plan){
   line.append(node('h5','',t.installments+': '+plan.title));
   const schedule=(items||[]).filter(x=>x.plan_id===plan.id).sort((a,b)=>String(a.due_on).localeCompare(String(b.due_on)));
   for(const installment of schedule)line.append(node('p','small',dateValue(installment.due_on,lang)+' · '+currency(installment.amount,lang)));
  }
  root.append(line);
 }
}
