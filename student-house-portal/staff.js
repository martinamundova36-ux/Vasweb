// Staff screens use the existing authenticated client and tenant-scoped server policies.
export const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export function filterResidents(rows, query = '', status = 'all') {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return rows.filter(p => (status === 'all' || (status === 'active' ? p.active === true : p.active === false)) &&
    terms.every(term => normalize([p.full_name, p.email, p.verified_room_number, p.verified_contract_number].join(' ')).includes(term)))
    .slice().sort((a, b) => String(a.full_name || '').localeCompare(String(b.full_name || ''), 'sk'));
}
export function filterRegistrations(rows, query = '', status = 'pending') {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  return rows.filter(p => (status === 'all' || p.status === status) && terms.every(term =>
    normalize([p.first_name, p.last_name, p.email, p.room_number, p.contract_number].join(' ')).includes(term)))
    .slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}
export const residentFiles = (files, person) => files.filter(f => f.active &&
  f.tenant_id === person.tenant_id && (f.resident_id === person.id || (!f.resident_id && f.user_id === person.user_id)));

const texts = {
 sk: {search:'Hľadať podľa mena, e-mailu, izby alebo zmluvy',all:'Všetci',active:'Aktívni',inactive:'Neaktívni',count:'Zobrazené',open:'Otvoriť profil',back:'Späť na študentov',contract:'Číslo zmluvy',period:'Obdobie ubytovania',state:'Stav účtu',activeOne:'Aktívny',inactiveOne:'Neaktívny',files:'Fotografia a podpísané dokumenty',missing:'Zatiaľ nenahrané',photo:'Fotografia',rules:'Podpísaný ubytovací poriadok',gdpr:'Podpísané potvrdenie GDPR',private:'Osobný dokument',pending:'Čaká na overenie',invited:'Schválená – pozvánka vyžiadaná',rejected:'Zamietnutá',allRegistrations:'Všetky stavy',approve:'Overiť a schváliť registráciu',reject:'Zamietnuť registráciu',approveConfirm:'Overili ste meno, číslo izby, zmluvu a termín ubytovania oproti skutočnej zmluve? Schválenie aktivuje prístup študenta a vyžiada pozvánku.',rejectConfirm:'Zamietnuť túto čakajúcu registráciu?',inviteOK:'Registrácia bola schválená a server potvrdil požiadavku na e-mail. Doručenie do schránky nie je overené.',failed:'Zmenu sa nepodarilo uložiť. Obnovte prehľad pred ďalším pokusom.',emailFailed:'Pozvánku sa nepodarilo odoslať. Registrácia nie je potvrdená ako schválená. Skontrolujte odosielanie e-mailov v Supabase; neopakujte pokusy naslepo.',rate:'Odosielanie e-mailov je dočasne obmedzené. Ďalší pokus teraz neposielajte.',conflict:'Registrácia alebo členstvo sa už zmenili. Obnovte prehľad.',refresh:'Obnoviť prehľad',empty:'Žiadny záznam nezodpovedá filtru.',review:'Overiť dokument',return:'Vrátiť na opravu',note:'Poznámka k dokumentu',reviewConfirm:'Potvrdiť tento výsledok kontroly dokumentu?',approved:'Schválené',needsFix:'Vrátené na opravu',view:'Otvoriť súbor',limit:'Prehľad obsahuje najviac 1 000 dostupných záznamov. Údaje sú obmedzené na vaše zariadenie.',roleAdmin:'Správca Student House',roleReception:'Recepcia Student House',noAccess:'Táto sekcia je dostupná iba správcovi a recepcii.',fileFailed:'Dokumenty sa nepodarilo načítať. Profil zostáva dostupný.',save:'Uložiť izbu',room:'Číslo izby',email:'E-mail',noRoom:'Nepriradená',details:'Údaje registrácie',registered:'Odoslané',saving:'Ukladám…'},
 en: {search:'Search by name, email, room or contract',all:'Everyone',active:'Active',inactive:'Inactive',count:'Showing',open:'Open profile',back:'Back to residents',contract:'Contract number',period:'Accommodation period',state:'Account status',activeOne:'Active',inactiveOne:'Inactive',files:'Photo and signed documents',missing:'Not uploaded yet',photo:'Photo',rules:'Signed house rules',gdpr:'Signed GDPR acknowledgement',private:'Private document',pending:'Awaiting verification',invited:'Approved – invitation requested',rejected:'Rejected',allRegistrations:'All statuses',approve:'Verify and approve registration',reject:'Reject registration',approveConfirm:'Have you verified the name, room, contract and accommodation dates against the actual contract? Approval activates resident access and requests an invitation.',rejectConfirm:'Reject this pending registration?',inviteOK:'Registration approved; the server accepted the email request. Inbox delivery has not been verified.',failed:'Unable to save. Refresh the list before trying again.',emailFailed:'The invitation could not be sent. Approval has not been confirmed. Check Supabase email delivery; do not retry repeatedly.',rate:'Email sending is temporarily limited. Do not send another attempt now.',conflict:'This registration or membership has changed. Refresh the list.',refresh:'Refresh list',empty:'No records match this filter.',review:'Approve document',return:'Return for correction',note:'Document review note',reviewConfirm:'Confirm this document review result?',approved:'Approved',needsFix:'Returned for correction',view:'Open file',limit:'This list contains up to 1,000 accessible records, limited to your residence.',roleAdmin:'Student House administrator',roleReception:'Student House reception',noAccess:'Only administrators and reception can access this section.',fileFailed:'Unable to load documents. The profile remains available.',save:'Save room',room:'Room number',email:'Email',noRoom:'Unassigned',details:'Registration details',registered:'Submitted',saving:'Saving…'}
};


Object.assign(texts, {
 ru:{search:'Поиск имени, почты, комнаты или договора',all:'Все',active:'Активные',inactive:'Неактивные',count:'Показано',open:'Открыть профиль',back:'Назад к студентам',contract:'Номер договора',period:'Период проживания',state:'Состояние аккаунта',activeOne:'Активен',inactiveOne:'Неактивен',files:'Фото и подписанные документы',missing:'Не загружено',photo:'Фото',rules:'Подписанные правила',gdpr:'Подписанное уведомление GDPR',private:'Личный документ',pending:'Ожидает проверки',invited:'Одобрено — письмо запрошено',rejected:'Отклонено',allRegistrations:'Все состояния',approve:'Проверить и одобрить регистрацию',reject:'Отклонить регистрацию',approveConfirm:'Данные проверены по фактическому договору? Подтвердить доступ и начисления?',rejectConfirm:'Отклонить заявку?',inviteOK:'Регистрация одобрена. Сервер принял запрос письма; доставка не проверена.',failed:'Не удалось сохранить. Обновите список.',emailFailed:'Запрос письма не принят. Проверьте почту Supabase. Не повторяйте запросы подряд.',rate:'Отправка писем временно ограничена.',conflict:'Заявка или членство изменились. Обновите список.',refresh:'Обновить список',empty:'Нет подходящих записей.',review:'Одобрить документ',return:'Вернуть на исправление',note:'Комментарий проверки',reviewConfirm:'Подтвердить результат проверки?',approved:'Одобрено',needsFix:'Требуется исправление',view:'Открыть файл',limit:'До 1 000 записей только вашего общежития.',roleAdmin:'Администратор Student House',roleReception:'Ресепшен Student House',noAccess:'Только для администрации и ресепшена.',fileFailed:'Документы не загрузились. Профиль доступен.',save:'Сохранить комнату',room:'Номер комнаты',email:'Почта',noRoom:'Не назначена',details:'Данные заявки',registered:'Отправлено',saving:'Сохранение…'},
 uk:{search:'Пошук імені, пошти, кімнати або договору',all:'Усі',active:'Активні',inactive:'Неактивні',count:'Показано',open:'Відкрити профіль',back:'Назад до студентів',contract:'Номер договору',period:'Період проживання',state:'Стан облікового запису',activeOne:'Активний',inactiveOne:'Неактивний',files:'Фото й підписані документи',missing:'Не завантажено',photo:'Фото',rules:'Підписані правила',gdpr:'Підписане повідомлення GDPR',private:'Особистий документ',pending:'Очікує перевірки',invited:'Схвалено — лист запитано',rejected:'Відхилено',allRegistrations:'Усі стани',approve:'Перевірити й схвалити реєстрацію',reject:'Відхилити реєстрацію',approveConfirm:'Дані перевірено за фактичним договором? Підтвердити доступ і нарахування?',rejectConfirm:'Відхилити заявку?',inviteOK:'Реєстрацію схвалено. Сервер прийняв запит листа; доставку не перевірено.',failed:'Не вдалося зберегти. Оновіть перелік.',emailFailed:'Запит листа не прийнято. Перевірте пошту Supabase. Не повторюйте запити поспіль.',rate:'Надсилання листів тимчасово обмежено.',conflict:'Заявка або членство змінилися. Оновіть перелік.',refresh:'Оновити перелік',empty:'Немає відповідних записів.',review:'Схвалити документ',return:'Повернути на виправлення',note:'Коментар перевірки',reviewConfirm:'Підтвердити результат перевірки?',approved:'Схвалено',needsFix:'Потрібне виправлення',view:'Відкрити файл',limit:'До 1 000 записів лише вашого гуртожитку.',roleAdmin:'Адміністратор Student House',roleReception:'Рецепція Student House',noAccess:'Лише для адміністрації та рецепції.',fileFailed:'Документи не завантажилися. Профіль доступний.',save:'Зберегти кімнату',room:'Номер кімнати',email:'Пошта',noRoom:'Не призначена',details:'Дані заявки',registered:'Надіслано',saving:'Збереження…'}
});

function ui(ctx) {
  const words = texts[ctx.lang] || texts.sk;
  const el = (tag, cls, text) => {const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = String(text); return node;};
  const button = (text, fn, cls = 'btn-secondary') => {const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', fn); return b;};
  const field = (title, value) => {const cell = el('div'); cell.append(el('dt', '', title), el('dd', 'readonly-value', value || '—')); return cell;};
  const state = value => words[value] || value || '—';
  const status = (message, error = false) => {ctx.notice.textContent = message; ctx.notice.className = error ? 'danger staff-notice' : 'mini-note staff-notice';};
  const allowed = ['org_admin', 'reception'].includes(ctx.role);
  return {words, el, button, field, state, status, allowed};
}

export async function failureCode(error, data) {
  if (data?.error) return data.error;
  try {const body = await error?.context?.clone().json(); return body?.error || body?.code || '';} catch {return '';}
}

export async function renderStaffScreen(ctx) {
 const {words:w,el,button,field,state,status,allowed} = ui(ctx);

 const correctionLang={
  sk:{state:'Vrátená na opravu',return:'Vrátiť študentovi na opravu',reissue:'Vytvoriť nový opravný odkaz',prompt:'Napíš študentovi, ktoré údaje má opraviť. Napríklad nesprávne číslo zmluvy, meno, dátumy alebo izbu.',reason:'Dôvod vrátenia',create:'Pripraviť bezpečný odkaz na opravu',prepared:'Registrácia je vrátená na opravu. E-mail sa ešte NEODOSLAL – otvor Gmail a správu odošli.',gmail:'Otvoriť Gmail s pripraveným e-mailom',copy:'Skopírovať opravný odkaz',copied:'Odkaz je skopírovaný.',subject:'Student House Bratislava – oprava registrácie',body:'Dobrý deň,\n\npri kontrole vašej registrácie Student House Bratislava sme zistili údaje, ktoré je potrebné opraviť:\n\n',bodyEnd:'\n\nOtvorte bezpečný odkaz a opravte údaje (platnosť 7 dní):\n',closing:'\n\nPo odoslaní sa registrácia vráti na kontrolu recepcii.\n\nRecepcia Student House Bratislava',sendError:'Nepodarilo sa vytvoriť odkaz. Obnov prehľad.',existing:'Čaká sa na opravu údajov študentom.',expires:'Platnosť odkazu: 7 dní. Nový odkaz zneplatní predošlý.',empty:'Dôvod opravy musí mať aspoň 10 znakov.'},
  en:{state:'Returned for correction',return:'Return to student for correction',reissue:'Create new correction link',prompt:'Explain what the student needs to correct (contract number, name, dates, or room).',reason:'Correction reason',create:'Prepare secure correction link',prepared:'Registration returned for correction. Email has NOT been sent; open Gmail and send it.',gmail:'Open Gmail draft',copy:'Copy correction link',copied:'Link copied.',subject:'Student House Bratislava – registration correction',body:'Hello,\n\nReception needs you to correct the following details of your Student House Bratislava registration:\n\n',bodyEnd:'\n\nOpen this secure link within 7 days:\n',closing:'\n\nYour registration will return to reception for approval after submission.\n\nStudent House Bratislava Reception',sendError:'Unable to create link. Refresh and try again.',existing:'Waiting for the student to resubmit corrected details.',expires:'Link valid 7 days. Creating another link invalidates the previous one.',empty:'Please write at least 10 characters explaining the correction.'},
  ru:{state:'Возвращено на исправление',return:'Вернуть студенту на исправление',reissue:'Новая ссылка для исправления',prompt:'Укажите, какие данные нужно исправить.',reason:'Причина',create:'Подготовить ссылку',prepared:'Регистрация возвращена. Письмо НЕ отправлено — откройте Gmail.',gmail:'Открыть Gmail',copy:'Копировать ссылку',copied:'Ссылка скопирована.',subject:'Student House Bratislava – исправление регистрации',body:'Здравствуйте!\n\nПожалуйста, исправьте следующие данные:\n\n',bodyEnd:'\n\nБезопасная ссылка (7 дней):\n',closing:'\n\nПосле исправления регистрация вернётся на проверку.',sendError:'Не удалось создать ссылку.',existing:'Ожидаем исправления.',expires:'Ссылка действует 7 дней.',empty:'Напишите причину исправления (не менее 10 символов).'},
  uk:{state:'Повернуто на виправлення',return:'Повернути на виправлення',reissue:'Нове посилання',prompt:'Вкажіть, що потрібно виправити.',reason:'Причина',create:'Підготувати посилання',prepared:'Реєстрацію повернуто. Лист НЕ відправлено — відкрийте Gmail.',gmail:'Відкрити Gmail',copy:'Копіювати посилання',copied:'Посилання скопійовано.',subject:'Student House Bratislava – виправлення реєстрації',body:'Вітаємо!\n\nБудь ласка, виправте такі дані:\n\n',bodyEnd:'\n\nБезпечне посилання (7 днів):\n',closing:'\n\nПісля надсилання реєстрація повернеться на перевірку.',sendError:'Не вдалося створити посилання.',existing:'Очікуємо виправлення.',expires:'Посилання діє 7 днів.',empty:'Вкажіть причину (не менше 10 символів).'}
 };
 const cw=correctionLang[ctx.lang]||correctionLang.sk;
 w.correction_requested=cw.state;
 if (!allowed) {ctx.root.replaceChildren(el('p','danger',w.noAccess));return;}
 const refresh = button(w.refresh, () => ctx.refresh());
 ctx.root.append(refresh, ctx.notice);
 const filters = el('div','staff-filters');
 const search = el('input'); search.type='search';search.placeholder=w.search;search.setAttribute('aria-label',w.search);
 const select = el('select');select.setAttribute('aria-label',ctx.section==='residents'?w.state:w.allRegistrations);
 const options=ctx.section==='residents'?[['all',w.all],['active',w.active],['inactive',w.inactive]]:[['pending',w.pending],['correction_requested',cw.state],['invited',w.invited],['rejected',w.rejected],['all',w.allRegistrations]];
 for(const [value,label] of options){const o=el('option','',label);o.value=value;select.append(o);}
 const count=el('p','muted');count.setAttribute('aria-live','polite');
 filters.append(search,select);ctx.root.append(filters,count,el('p','small',w.limit));
 const results=el('div','staff-directory');ctx.root.append(results);
 const records=await ctx.list(ctx.section==='residents'?'residents':'registration_requests');
 const verifiedResidents=ctx.section==='registrations'?await ctx.list('residents'):[];
 if(!ctx.isCurrent())return;
 const contractTexts={
   sk:{collision:'Pozor: číslo zmluvy už používa iný študent v izbe',same:'To isté číslo zmluvy sa nachádza aj v ďalších registráciách.',correct:'Opraviť číslo zmluvy podľa podpísanej zmluvy',save:'Uložiť overené číslo zmluvy',verify:'Zmeň číslo iba po porovnaní so skutočnou zmluvou.',conflict:'Toto číslo už existuje v evidencii. Over jeho správnosť.',saved:'Číslo zmluvy opravené. Teraz je potrebné registráciu schváliť.',invalid:'Číslo zmluvy musí obsahovať 5 až 60 znakov.',pending:'Registráciu zatiaľ nie je možné schváliť: číslo zmluvy sa už používa.'},
   en:{collision:'Warning: another student already uses this contract number in room',same:'The contract number is also used in other registrations.',correct:'Correct contract number from signed agreement',save:'Save verified contract number',verify:'Change the number only after checking the signed agreement.',conflict:'This contract number is already used. Verify it first.',saved:'Contract number updated. Reception must still approve the registration.',invalid:'Contract number must contain 5–60 characters.',pending:'Approval blocked: contract number is already in use.'},
   ru:{collision:'Номер договора уже используется в комнате',same:'Номер также встречается в других регистрациях.',correct:'Исправить номер договора',save:'Сохранить проверенный номер',verify:'Проверяйте номер по подписанному договору.',conflict:'Этот номер уже занят.',saved:'Номер исправлен, требуется подтверждение.',invalid:'Номер должен содержать от 5 до 60 символов.',pending:'Подтверждение заблокировано: номер уже занят.'},
   uk:{collision:'Номер договору вже використовується в кімнаті',same:'Номер також зустрічається в інших реєстраціях.',correct:'Виправити номер договору',save:'Зберегти перевірений номер',verify:'Перевірте номер за підписаним договором.',conflict:'Цей номер уже використовується.',saved:'Номер виправлено, потрібне підтвердження.',invalid:'Номер має містити від 5 до 60 символів.',pending:'Підтвердження заблоковано: номер уже зайнятий.'}
 };
 const ct=contractTexts[ctx.lang]||contractTexts.sk;
 const contractConflict=person=>verifiedResidents.find(x=>String(x.verified_contract_number||'').trim()===String(person.contract_number||'').trim()&&normalize(x.email)!==normalize(person.email));
 let pendingAction=false;
 const paint=()=>{
  if(pendingAction)return;
  const filtered=ctx.section==='residents'?filterResidents(records,search.value,select.value):filterRegistrations(records,search.value,select.value);
  count.textContent=w.count+': '+filtered.length+' / '+records.length;results.replaceChildren();
  if(!filtered.length){results.append(el('p','empty-message',w.empty));return;}
  for(const person of filtered){
   const card=el('article','staff-person');
   const name=ctx.section==='residents'?person.full_name:[person.first_name,person.last_name].join(' ');
   card.append(el('h4','',name),el('p','muted',person.email),el('p','',w.room+': '+(person.verified_room_number||person.room_number||w.noRoom)));
   card.append(el('span','status-pill',ctx.section==='residents'?(person.active?w.activeOne:w.inactiveOne):state(person.status)));
   if(ctx.section==='residents')card.append(button(w.open,()=>{void profile(person);}));
   else{
    const details=el('dl','identity-fields');details.append(field(w.contract,person.contract_number),field(w.period,ctx.day(person.accommodation_from)+' – '+ctx.day(person.accommodation_to)),field(w.registered,ctx.day(person.created_at)));card.append(details);
    if(person.status==='correction_requested'){
     card.append(el('p','mini-note',cw.existing));
     if(person.correction_reason)card.append(el('p','',cw.reason+': '+person.correction_reason));
     card.append(button(cw.reissue,()=>returnEditor(person,card)));
    }
    if(person.status==='pending'){
     const conflict=contractConflict(person);
     const others=records.filter(x=>x.id!==person.id&&String(x.contract_number||'').trim()===String(person.contract_number||'').trim()).length;
     if(conflict){
      const warn=el('p','danger',ct.collision+' '+(conflict.verified_room_number||'—')+'.');
      warn.setAttribute('role','alert');card.append(warn);
     }
     if(others)card.append(el('p','mini-note',ct.same+' ('+others+')'));
     const correction=el('details','staff-form');
     const summary=el('summary','',ct.correct);
     const editForm=el('form','staff-form'),number=el('input');
     number.type='text';number.maxLength=60;number.minLength=5;number.required=true;number.value=person.contract_number||'';number.setAttribute('aria-label',w.contract);
     const saveNumber=el('button','',ct.save);saveNumber.type='submit';
     editForm.append(el('p','mini-note',ct.verify),number,saveNumber);
     editForm.addEventListener('submit',async event=>{
      event.preventDefault();
      if(pendingAction||!ctx.isCurrent()||!editForm.reportValidity())return;
      const corrected=number.value.trim();
      if(corrected.length<5||corrected.length>60){status(ct.invalid,true);return;}
      if(corrected===person.contract_number){correction.open=false;return;}
      if(verifiedResidents.some(x=>String(x.verified_contract_number||'').trim()===corrected&&normalize(x.email)!==normalize(person.email))){
       status(ct.conflict,true);return;
      }
      if(records.some(x=>x.id!==person.id&&String(x.contract_number||'').trim()===corrected&&x.status==='invited')){
       status(ct.conflict,true);return;
      }
      if(!confirm(ct.verify))return;
      pendingAction=true;saveNumber.disabled=true;
      try{
       const {data,error}=await ctx.db.from('registration_requests').update({contract_number:corrected})
        .eq('tenant_id',ctx.tenant).eq('id',person.id).eq('status','pending').select('id,contract_number');
       if(!ctx.isCurrent())return;
       if(error||data?.length!==1){status(w.failed,true);return;}
       person.contract_number=corrected;
       status(ct.saved);
      }catch{if(ctx.isCurrent())status(w.failed,true);}
      finally{pendingAction=false;saveNumber.disabled=false;if(ctx.isCurrent())paint();}
     });
     correction.append(summary,editForm);card.append(correction);
     const actions=el('div','staff-actions');
     const approve=button(w.approve,()=>{approvalEditor(person,actions);},'');
     const reject=button(w.reject,()=>{void decide(person,false,actions);});
     const returnButton=button(cw.return,()=>returnEditor(person,card));
     actions.append(approve,reject,returnButton);card.append(actions);
    }
   }
   results.append(card);
  }
 };
 function returnEditor(person,card){
  if(card.querySelector('.registration-return-editor'))return;
  const form=el('form','staff-form registration-return-editor');
  const label=el('label','',cw.reason),explanation=el('textarea');
  explanation.name='correction_reason';explanation.required=true;explanation.minLength=10;explanation.maxLength=1200;
  explanation.rows=4;explanation.placeholder=cw.prompt;explanation.value=person.correction_reason||'';
  label.append(explanation);
  const send=el('button','',cw.create);send.type='submit';
  form.append(label,el('p','mini-note',cw.expires),send);
  card.append(form);explanation.focus();
  form.addEventListener('submit',async event=>{
   event.preventDefault();
   if(pendingAction||!ctx.isCurrent())return;
   const reason=explanation.value.trim();if(reason.length<10){status(cw.empty,true);return;}
   pendingAction=true;send.disabled=true;
   try{
    const {data,error}=await ctx.db.functions.invoke('registration-correction',{
     body:{action:'issue',tenant_id:ctx.tenant,registration_id:person.id,reason}
    });
    if(!ctx.isCurrent())return;
    if(error||!data?.ok||!data?.link){status(cw.sendError,true);return;}
    person.status='correction_requested';person.correction_reason=reason;
    status(cw.prepared);
    const body=cw.body+reason+cw.bodyEnd+data.link+cw.closing;
    const gmail='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(data.recipient||person.email)
      +'&su='+encodeURIComponent(cw.subject)+'&body='+encodeURIComponent(body);
    const email=el('a','btn-secondary',cw.gmail);
    email.href=gmail;email.target='_blank';email.rel='noopener noreferrer';email.style.cssText='display:inline-block;padding:12px;margin:10px 10px 0 0';
    const copy=button(cw.copy,async()=>{
     try{await navigator.clipboard.writeText(data.link);ctx.notice.append(el('p','mini-note',cw.copied));}
     catch{window.prompt(cw.copy,data.link);}
    });
    ctx.notice.append(el('p','mini-note',(data.recipient||person.email)+' · '+cw.expires),email,copy);
   }catch{if(ctx.isCurrent())status(cw.sendError,true);}
   finally{pendingAction=false;send.disabled=false;if(ctx.isCurrent()&&person.status==='correction_requested')paint();}
  });
 }
 function approvalEditor(person,actions){
  if(actions.querySelector('form'))return;
  if(contractConflict(person)){status(ct.pending,true);return;}
  const labels=({sk:['Overené mesačné nájomné (€)','Zmluvný deň splatnosti (1–28)','Pripraviť predpisy na kontrolu','Skontrolujte každú sumu a splatnosť podľa zmluvy, najmä neúplné mesiace. Nejde o prijaté platby.','Schváliť overenú zmluvu a predpisy'],en:['Verified monthly rent (€)','Contractual due day (1–28)','Prepare charges for review','Check each amount and due date against the contract, especially partial months. These are charges, not received payments.','Approve verified contract and charges'],ru:['Проверенная месячная аренда (€)','День оплаты по договору (1–28)','Подготовить начисления','Проверьте суммы и сроки по договору, особенно неполные месяцы. Это начисления, не полученные платежи.','Подтвердить договор и начисления'],uk:['Перевірена місячна оренда (€)','День оплати за договором (1–28)','Підготувати нарахування','Перевірте суми й строки за договором, особливо неповні місяці. Це нарахування, не отримані платежі.','Підтвердити договір і нарахування']})[ctx.lang]||[];
  const form=el('form','staff-form'),rent=el('input'),due=el('input'),schedule=el('div');
  rent.type='number';rent.min='0.01';rent.max='100000';rent.step='0.01';rent.required=true;
  due.type='number';due.min='1';due.max='28';due.step='1';due.value='5';due.required=true;
  for(const [title,input] of [[labels[0],rent],[labels[1],due]]){const label=el('label','',title);label.append(input);form.append(label);}
  const prepare=button(labels[2],()=>{
   if(!rent.reportValidity()||!due.reportValidity())return;
   schedule.replaceChildren(el('p','mini-note',labels[3]));
   const start=String(person.accommodation_from||'').slice(0,7),end=String(person.accommodation_to||'').slice(0,7);
   if(!/^\d{4}-\d{2}$/.test(start)||!/^\d{4}-\d{2}$/.test(end)||start>end){status(w.failed,true);return;}
   const rows=[];let period=start;
   while(period<=end&&rows.length<121){
    const amount=el('input'),date=el('input');amount.type='number';amount.min='0.01';amount.max='100000';amount.step='0.01';amount.value=rent.value;amount.required=true;amount.setAttribute('aria-label',period+' €');
    date.type='date';date.value=period+'-'+String(due.value).padStart(2,'0');date.required=true;date.setAttribute('aria-label',period);
    const line=el('label','',period);line.append(amount,date);schedule.append(line);rows.push({period,amount,date});
    const [year,month]=period.split('-').map(Number);period=month===12?String(year+1)+'-01':String(year)+'-'+String(month+1).padStart(2,'0');
   }
   if(period<=end){status(w.failed,true);return;}
   const approve=el('button','',labels[4]);approve.type='submit';schedule.append(approve);
   form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;void decide(person,true,actions,{verified_monthly_rent:Number(rent.value),verified_due_day:Number(due.value),verified_schedule:rows.map(r=>({period:r.period,amount:Number(r.amount.value),due_on:r.date.value}))});};
  });
  // Any base-term edit requires a fresh explicit review of the proposed calendar.
  for(const input of [rent,due])input.addEventListener('input',()=>{schedule.replaceChildren();form.onsubmit=e=>e.preventDefault();});
  form.append(prepare,schedule);form.onsubmit=e=>e.preventDefault();actions.append(form);
 }
 async function decide(person,approve,actions,verified={}){
  if(pendingAction||!ctx.isCurrent()||!confirm(approve?w.approveConfirm:w.rejectConfirm))return;
  pendingAction=true;for(const b of actions.querySelectorAll('button'))b.disabled=true;search.disabled=true;select.disabled=true;
  let success=false;
  try{
   let response;
   if(approve)response=await ctx.db.functions.invoke('manage',{body:{action:'invite',tenant_id:ctx.tenant,registration_id:person.id,role:'student',email:person.email,name:[person.first_name,person.last_name].join(' '),room_number:person.room_number,...verified}});
   else response=await ctx.db.from('registration_requests').update({status:'rejected'}).eq('tenant_id',ctx.tenant).eq('id',person.id).eq('status','pending').select('id');
   if(!ctx.isCurrent())return;
   if(response.error||(approve?!response.data?.ok:!response.data?.length)){
    const code=await failureCode(response.error,response.data);
    status(['over_email_send_rate_limit','over_request_rate_limit'].includes(code)?w.rate:['invitation_failed','password_email_failed'].includes(code)?w.emailFailed:['membership_exists','registration_not_pending'].includes(code)?w.conflict:w.failed,true);
    return;
   }
   person.status=approve?'invited':'rejected';success=true;status(approve?w.inviteOK:w.rejected);
   // The manage Edge Function commits resident, tenancy and verified monthly charges
   // in one database transaction before it returns ok. Offer direct verification.
   if(approve&&typeof ctx.openRooms==='function'){
    const openLabel=({"sk":"Otvoriť schválenú izbu v Excel evidencii","en":"Open approved room in the Excel register","ru":"Открыть комнату в таблице","uk":"Відкрити кімнату в таблиці"})[ctx.lang]||"Otvoriť schválenú izbu v Excel evidencii";
    const open=button(openLabel,()=>ctx.openRooms(person.room_number,person.accommodation_from),'btn-secondary');
    open.type='button';open.style.margin='10px 0 0';open.style.display='block';
    ctx.notice.append(open);
   }
  }catch{if(ctx.isCurrent())status(w.failed,true);}
  finally{
   pendingAction=false;if(ctx.isCurrent()){search.disabled=false;select.disabled=false;if(success)paint();}
   // A failed email request stays disabled until an explicit refresh, preventing blind retries.
  }
 }
 async function profile(person){
  if(!ctx.isCurrent())return;
  filters.hidden=true;count.hidden=true;results.className='staff-profile';results.replaceChildren(button(w.back,()=>{filters.hidden=false;count.hidden=false;results.className='staff-directory';paint();}));
  results.append(el('h3','',person.full_name));
  const details=el('dl','identity-fields');
  details.append(field(w.email,person.email),field(w.room,person.verified_room_number||w.noRoom),field(w.contract,person.verified_contract_number),field(w.period,ctx.day(person.accommodation_from)+' – '+ctx.day(person.accommodation_to)),field(w.state,person.active?w.activeOne:w.inactiveOne));results.append(details);
  const form=el('form','staff-form'),room=el('input');room.value=person.verified_room_number||'';room.maxLength=30;room.setAttribute('aria-label',w.room);
  const save=button(w.save,()=>{},'');save.type='submit';const lab=el('label','',w.room);lab.append(room);form.append(lab,save);
  form.addEventListener('submit',async event=>{
   event.preventDefault();if(save.disabled||!ctx.isCurrent())return;save.disabled=true;
   try{
    const {data,error}=await ctx.db.from('residents').update({verified_room_number:room.value.trim()}).eq('tenant_id',ctx.tenant).eq('id',person.id).select('id');
    if(!ctx.isCurrent())return;if(error||!data?.length){status(w.failed,true);return;}
    person.verified_room_number=room.value.trim();status(ctx.success);details.children[1].querySelector('dd').textContent=room.value.trim()||w.noRoom;
   }catch{if(ctx.isCurrent())status(w.failed,true);}finally{save.disabled=false;}
  });results.append(form);
  const enquiryTitle=({sk:'Osobný dotazník študenta',en:'Student personal questionnaire',ru:'Анкета студента',uk:'Анкета студента'})[ctx.lang]||'Osobný dotazník študenta';
  const enquiryBox=el('section','data-card');
  enquiryBox.append(el('h4','section-subtitle',enquiryTitle));
  results.append(enquiryBox);
  try{
   const {data:enquiry,error:enquiryError}=await ctx.db.from('resident_enquiries').select('*')
     .eq('tenant_id',ctx.tenant).eq('resident_id',person.id).maybeSingle();
   if(!ctx.isCurrent()||!enquiryBox.isConnected)return;
   if(enquiryError){enquiryBox.append(el('p','danger',w.failed));}
   else if(!enquiry){enquiryBox.append(el('p','muted',ctx.lang==='en'?'The student has not completed the online questionnaire.':'Študent ešte nevyplnil online dotazník.'));}
   else{
    const translated=ctx.lang==='en';
    const values=[
      [translated?'Permanent address':'Trvalá adresa',enquiry.permanent_address],
      [translated?'Date of birth':'Dátum narodenia',ctx.day(enquiry.date_of_birth)],
      [translated?'Nationality':'Národnosť',enquiry.nationality],
      [translated?'Sex / gender':'Pohlavie',enquiry.gender],
      [translated?'ID card / passport':'Číslo dokladu',enquiry.identity_document_number],
      [translated?'Telephone':'Telefón',enquiry.telephone],
      [translated?'Parent contact email':'E-mail rodiča',enquiry.parent_contact_email],
      [translated?'School':'Škola',enquiry.school],
      ['IBAN',enquiry.iban],
      [translated?'Preferred room':'Preferovaný typ izby',enquiry.preferred_room_type],
      [translated?'Stay duration (months)':'Dĺžka pobytu (mesiace)',enquiry.preferred_duration_months],
      [translated?'Preferred arrival':'Preferovaný príchod',ctx.day(enquiry.preferred_from)],
      [translated?'Preferred departure':'Preferovaný odchod',ctx.day(enquiry.preferred_to)]
    ];
    const dataList=el('dl','identity-fields');
    for(const [name,value] of values)dataList.append(field(name,value||'—'));
    enquiryBox.append(dataList,el('p','mini-note',translated?'Student-submitted details; verify before using in the accommodation register.':'Údaje od študenta – pred prenosom do evidencie ich musí overiť recepcia.'));

    const {data:review,error:reviewError}=await ctx.db.from('resident_enquiry_reviews')
      .select('review_status,correction_reason,requested_at')
      .eq('tenant_id',ctx.tenant).eq('resident_id',person.id).maybeSingle();
    if(!ctx.isCurrent()||!enquiryBox.isConnected)return;
    const labels=ctx.lang==='en'?{
      returned:'Questionnaire returned for correction',resubmitted:'Student resubmitted corrected questionnaire – awaiting review',
      approved:'Questionnaire verified by reception',request:'Send questionnaire back for correction',
      confirm:'Confirm the completed questionnaire',reason:'Describe exactly what needs to be corrected',
      send:'Save correction request',minimum:'Write at least 10 characters explaining the correction.',
      success:'The correction request was saved. Open Gmail to send the instructions to the student.',
      accepted:'Questionnaire verified and approved.',fail:'The request could not be saved.',
      gmail:'Open Gmail to notify student',mailSubject:'Student House Bratislava – correct your questionnaire',
      mailBody:'Hello,\n\nReception reviewed your Student House Bratislava questionnaire and asks you to correct:\n\n',
      mailEnd:'\n\nSign in and open Personal Questionnaire to make the changes:\nhttps://www.webu.sk/student-house-portal/student/?tab=enquiry\n\nRegards,\nStudent House Bratislava Reception'
     }:{
      returned:'Dotazník vrátený na opravu',resubmitted:'Študent opravil dotazník – čaká na opätovnú kontrolu',
      approved:'Dotazník overený recepciou',request:'Poslať späť zle vyplnený dotazník',
      confirm:'Schváliť správne vyplnený dotazník',reason:'Presne napíš, čo má študent opraviť',
      send:'Uložiť žiadosť o opravu',minimum:'Uveď dôvod opravy (aspoň 10 znakov).',
      success:'Požiadavka na opravu je uložená. Otvor Gmail a odošli študentovi upozornenie.',
      accepted:'Dotazník bol schválený.',fail:'Nepodarilo sa uložiť požiadavku.',
      gmail:'Otvoriť Gmail a upozorniť študenta',mailSubject:'Student House Bratislava – oprava dotazníka',
      mailBody:'Ahoj,\n\npri kontrole tvojho osobného dotazníka Student House Bratislava sme zistili údaje, ktoré je potrebné opraviť:\n\n',
      mailEnd:'\n\nPrihlás sa do študentskej zóny a otvor Osobný dotazník:\nhttps://www.webu.sk/student-house-portal/student/?tab=enquiry\n\nPo opätovnom odoslaní dotazník skontrolujeme.\n\nRecepcia Student House Bratislava'
     };
    if(reviewError){enquiryBox.append(el('p','danger',labels.fail));}
    else{
      if(review){
       const corrected=review.review_status==='needs_correction'
         && Date.parse(String(enquiry.updated_at||enquiry.created_at||''))>Date.parse(String(review.requested_at||''));
       const label=review.review_status==='approved'?labels.approved:corrected?labels.resubmitted:labels.returned;
       enquiryBox.append(el('p',review.review_status==='approved'?'mini-note':(corrected?'mini-note':'danger'),label));
       if(review.correction_reason&&review.review_status==='needs_correction')
        enquiryBox.append(el('p','mini-note',review.correction_reason));
      }
      const revise=el('form','staff-form');
      const reason=el('textarea');reason.maxLength=1200;reason.minLength=10;reason.required=true;reason.rows=3;
      reason.placeholder=labels.reason;reason.setAttribute('aria-label',labels.reason);
      reason.value=review?.review_status==='needs_correction'?review.correction_reason||'':'';
      const send=el('button','',labels.send);send.type='submit';
      const reopen=button(labels.request,()=>{revise.hidden=!revise.hidden;if(!revise.hidden)reason.focus();});
      revise.hidden=true;revise.append(reason,send);enquiryBox.append(reopen,revise);
      revise.addEventListener('submit',async event=>{
       event.preventDefault();if(!ctx.isCurrent())return;
       const text=reason.value.trim();if(text.length<10){status(labels.minimum,true);return;}
       send.disabled=true;
       try{
        const {data,error}=await ctx.db.from('resident_enquiry_reviews').upsert({
         tenant_id:ctx.tenant,resident_id:person.id,review_status:'needs_correction',
         correction_reason:text,requested_at:new Date().toISOString(),reviewed_by:ctx.userId
        },{onConflict:'tenant_id,resident_id'}).select('review_status').single();
        if(error||!data){status(labels.fail,true);return;}
        status(labels.success);
        revise.hidden=true;
        const gmail='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(person.email||'')
        +'&su='+encodeURIComponent(labels.mailSubject)
        +'&body='+encodeURIComponent(labels.mailBody+text+labels.mailEnd);
        const mail=el('a','btn-secondary',labels.gmail);
        mail.href=gmail;mail.target='_blank';mail.rel='noopener noreferrer';
        mail.style.cssText='display:inline-block;padding:12px;margin-top:12px';
        enquiryBox.append(mail);
       }catch{status(labels.fail,true);}finally{send.disabled=false;}
      });
      const approve=button(labels.confirm,async()=>{
       if(!ctx.isCurrent())return;
       approve.disabled=true;
       try{
        const {data,error}=await ctx.db.from('resident_enquiry_reviews').upsert({
          tenant_id:ctx.tenant,resident_id:person.id,review_status:'approved',
          correction_reason:'',requested_at:new Date().toISOString(),reviewed_by:ctx.userId
        },{onConflict:'tenant_id,resident_id'}).select('review_status').single();
        if(error||!data){status(labels.fail,true);return;}
        status(labels.accepted);
       }catch{status(labels.fail,true);}finally{approve.disabled=false;}
      });
      enquiryBox.append(approve);
    }

   }
   if(typeof ctx.uploadPrivateDocument==='function'){
    const title=ctx.lang==='en'?'Upload completed paper questionnaire (PDF/JPG/PNG)':'Nahrať vyplnený papierový dotazník (PDF/JPG/PNG)';
    const uploadForm=el('form','staff-form');
    const input=el('input');input.type='file';input.accept='application/pdf,image/jpeg,image/png';input.required=true;input.setAttribute('aria-label',title);
    const submit=el('button','',ctx.lang==='en'?'Attach to student':'Priložiť k študentovi');submit.type='submit';
    uploadForm.append(el('strong','',title),input,submit);
    uploadForm.addEventListener('submit',async event=>{
      event.preventDefault();
      if(!input.files?.length||!ctx.isCurrent())return;
      const ok=await ctx.uploadPrivateDocument(person.id,input.files[0],submit);
      if(ok&&ctx.isCurrent()){status(ctx.success);input.value='';}
    });
    enquiryBox.append(uploadForm);
   }
  }catch(error){if(ctx.isCurrent())enquiryBox.append(el('p','danger',w.failed));}
  results.append(el('h4','section-subtitle',w.files));
  const filesRoot=el('div','data-list', '…');results.append(filesRoot);
  try{
   const allFiles=await ctx.list('residence_portal_files');if(!ctx.isCurrent()||!filesRoot.isConnected)return;
   const files=residentFiles(allFiles,person).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));filesRoot.replaceChildren();
   for(const [kind,title] of [['profile_photo',w.photo],['signed_rules',w.rules],['signed_gdpr',w.gdpr]]){
    const items=files.filter(f=>f.kind===kind);if(!items.length){filesRoot.append(el('p','mini-note',title+': '+w.missing));continue;}
    for(const file of items)filesRoot.append(documentCard(file,title));
   }
   for(const file of files.filter(f=>f.kind==='resident_document'))filesRoot.append(documentCard(file,w.private));
  }catch{if(ctx.isCurrent())filesRoot.replaceChildren(el('p','danger',w.fileFailed));}
 }
 function documentCard(file,title){
  const card=el('article','data-card');card.append(el('strong','',title),el('p','small',file.original_name+' · '+ctx.day(file.created_at)));
  if(file.kind!=='profile_photo')card.append(el('span','status-pill',file.review_status==='approved'?w.approved:file.review_status==='rejected'?w.needsFix:w.pending));
  card.append(button(w.view,()=>{if(ctx.isCurrent())void ctx.fileLink(file.id,ctx.tenant);}));
  if(['signed_rules','signed_gdpr'].includes(file.kind)&&['pending','rejected'].includes(file.review_status)){
   const input=el('input');input.type='text';input.maxLength=1000;input.value=file.staff_note||'';input.setAttribute('aria-label',w.note);input.placeholder=w.note;
   const actions=el('div','staff-actions');
   const review=async result=>{
    if(!ctx.isCurrent()||pendingAction||!confirm(w.reviewConfirm))return;pendingAction=true;
    for(const b of actions.querySelectorAll('button'))b.disabled=true;
    try{
     const {data,error}=await ctx.db.functions.invoke('residence-files',{body:{action:'review',tenant_id:ctx.tenant,file_id:file.id,status:result,staff_note:input.value}});
     if(!ctx.isCurrent())return;if(error||!data?.ok){status(w.failed,true);return;}
     file.review_status=result;file.staff_note=input.value;card.replaceWith(documentCard(file,title));status(ctx.success);
    }catch{if(ctx.isCurrent())status(w.failed,true);}finally{pendingAction=false;for(const b of actions.querySelectorAll('button'))b.disabled=false;}
   };
   actions.append(input,button(w.review,()=>{void review('approved');},''),button(w.return,()=>{void review('rejected');}));card.append(actions);
  }
  return card;
 }
 search.addEventListener('input',paint);select.addEventListener('change',paint);paint();
}
