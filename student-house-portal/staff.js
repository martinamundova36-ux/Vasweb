import {providerText,normalizeContractSymbol,isStudentHouse} from './student-house-provider.js';
import {advanceRentDueDate} from './ledger.js';
import {stayPeriods} from './stay-periods.js';
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

const publicRoomTypeNames = {
 'M2':'Manzard 2',
 'Š1+1':'Standard 1+1',
 'SUI 2':'Suite 2',
 'D2':'De Luxe 2',
 'Š2':'Standard 2',
 'D2V':'De Luxe 2V'
};
const displayRoomType = (code,lang='sk') => {if(!code)return '—';const [type,...rest]=String(code).split(' / ');const occupancy=rest.join(' / ');const words=({sk:['Zdieľaná izba','Celá izba'],en:['Shared room','Entire room'],ru:['Общая комната','Вся комната'],uk:['Спільна кімната','Уся кімната']})[lang]||[];return (publicRoomTypeNames[type]||type)+(occupancy?' / '+(occupancy==='Zdieľaná izba'?words[0]:occupancy==='Celá izba'?words[1]:occupancy):'');};

const approvalReceipts = new Map();

const texts = {
 sk: {search:'Hľadať podľa mena, e-mailu, izby alebo zmluvy',all:'Všetci',active:'Aktívni',inactive:'Neaktívni',count:'Zobrazené',open:'Otvoriť profil',back:'Späť na študentov',contract:'Číslo zmluvy',period:'Obdobie ubytovania',state:'Stav účtu',activeOne:'Aktívny',inactiveOne:'Neaktívny',files:'Fotografia a podpísané dokumenty',missing:'Zatiaľ nenahrané',photo:'Fotografia',rules:'Podpísaný ubytovací poriadok',gdpr:'Podpísané potvrdenie GDPR',private:'Osobný dokument',pending:'Čaká na overenie',invited:'✓ Schválená – pozvánka vyžiadaná',rejected:'Zamietnutá',allRegistrations:'Všetky stavy',approve:'Overiť a schváliť registráciu',reject:'Zamietnuť registráciu',approveConfirm:'Overili ste meno, číslo izby, zmluvu a termín ubytovania oproti skutočnej zmluve? Schválenie aktivuje prístup študenta a vyžiada pozvánku.',rejectConfirm:'Zamietnuť túto čakajúcu registráciu?',inviteOK:'Registrácia bola schválená a server potvrdil požiadavku na e-mail. Doručenie do schránky nie je overené.',failed:'Zmenu sa nepodarilo uložiť. Obnovte prehľad pred ďalším pokusom.',emailFailed:'Pozvánku sa nepodarilo odoslať. Registrácia nie je potvrdená ako schválená. Skontrolujte odosielanie e-mailov v Supabase; neopakujte pokusy naslepo.',rate:'Odosielanie e-mailov je dočasne obmedzené. Ďalší pokus teraz neposielajte.',conflict:'Registrácia alebo členstvo sa už zmenili. Obnovte prehľad.',refresh:'Obnoviť prehľad',empty:'Žiadny záznam nezodpovedá filtru.',review:'Overiť dokument',return:'Vrátiť na opravu',note:'Poznámka k dokumentu',reviewConfirm:'Potvrdiť tento výsledok kontroly dokumentu?',approved:'Schválené',needsFix:'Vrátené na opravu',view:'Otvoriť súbor',limit:'Prehľad obsahuje najviac 1 000 dostupných záznamov. Údaje sú obmedzené na vaše zariadenie.',roleAdmin:'Správca Student House',roleReception:'Recepcia Student House',noAccess:'Táto sekcia je dostupná iba správcovi a recepcii.',fileFailed:'Dokumenty sa nepodarilo načítať. Profil zostáva dostupný.',save:'Uložiť izbu',room:'Číslo izby',email:'E-mail',noRoom:'Nepriradená',details:'Údaje registrácie',registered:'Odoslané',saving:'Ukladám…'},
 en: {search:'Search by name, email, room or contract',all:'Everyone',active:'Active',inactive:'Inactive',count:'Showing',open:'Open profile',back:'Back to residents',contract:'Contract number',period:'Accommodation period',state:'Account status',activeOne:'Active',inactiveOne:'Inactive',files:'Photo and signed documents',missing:'Not uploaded yet',photo:'Photo',rules:'Signed house rules',gdpr:'Signed GDPR acknowledgement',private:'Private document',pending:'Awaiting verification',invited:'✓ Approved – invitation requested',rejected:'Rejected',allRegistrations:'All statuses',approve:'Verify and approve registration',reject:'Reject registration',approveConfirm:'Have you verified the name, room, contract and accommodation dates against the actual contract? Approval activates resident access and requests an invitation.',rejectConfirm:'Reject this pending registration?',inviteOK:'Registration approved; the server accepted the email request. Inbox delivery has not been verified.',failed:'Unable to save. Refresh the list before trying again.',emailFailed:'The invitation could not be sent. Approval has not been confirmed. Check Supabase email delivery; do not retry repeatedly.',rate:'Email sending is temporarily limited. Do not send another attempt now.',conflict:'This registration or membership has changed. Refresh the list.',refresh:'Refresh list',empty:'No records match this filter.',review:'Approve document',return:'Return for correction',note:'Document review note',reviewConfirm:'Confirm this document review result?',approved:'Approved',needsFix:'Returned for correction',view:'Open file',limit:'This list contains up to 1,000 accessible records, limited to your residence.',roleAdmin:'Student House administrator',roleReception:'Student House reception',noAccess:'Only administrators and reception can access this section.',fileFailed:'Unable to load documents. The profile remains available.',save:'Save room',room:'Room number',email:'Email',noRoom:'Unassigned',details:'Registration details',registered:'Submitted',saving:'Saving…'}
};


Object.assign(texts, {
 ru:{search:'Поиск имени, почты, комнаты или договора',all:'Все',active:'Активные',inactive:'Неактивные',count:'Показано',open:'Открыть профиль',back:'Назад к студентам',contract:'Номер договора',period:'Период проживания',state:'Состояние аккаунта',activeOne:'Активен',inactiveOne:'Неактивен',files:'Фото и подписанные документы',missing:'Не загружено',photo:'Фото',rules:'Подписанные правила',gdpr:'Подписанное уведомление GDPR',private:'Личный документ',pending:'Ожидает проверки',invited:'✓ Одобрено — письмо запрошено',rejected:'Отклонено',allRegistrations:'Все состояния',approve:'Проверить и одобрить регистрацию',reject:'Отклонить регистрацию',approveConfirm:'Данные проверены по фактическому договору? Подтвердить доступ и начисления?',rejectConfirm:'Отклонить заявку?',inviteOK:'Регистрация одобрена. Сервер принял запрос письма; доставка не проверена.',failed:'Не удалось сохранить. Обновите список.',emailFailed:'Запрос письма не принят. Проверьте почту Supabase. Не повторяйте запросы подряд.',rate:'Отправка писем временно ограничена.',conflict:'Заявка или членство изменились. Обновите список.',refresh:'Обновить список',empty:'Нет подходящих записей.',review:'Одобрить документ',return:'Вернуть на исправление',note:'Комментарий проверки',reviewConfirm:'Подтвердить результат проверки?',approved:'Одобрено',needsFix:'Требуется исправление',view:'Открыть файл',limit:'До 1 000 записей только вашего общежития.',roleAdmin:'Администратор Student House',roleReception:'Ресепшен Student House',noAccess:'Только для администрации и ресепшена.',fileFailed:'Документы не загрузились. Профиль доступен.',save:'Сохранить комнату',room:'Номер комнаты',email:'Почта',noRoom:'Не назначена',details:'Данные заявки',registered:'Отправлено',saving:'Сохранение…'},
 uk:{search:'Пошук імені, пошти, кімнати або договору',all:'Усі',active:'Активні',inactive:'Неактивні',count:'Показано',open:'Відкрити профіль',back:'Назад до студентів',contract:'Номер договору',period:'Період проживання',state:'Стан облікового запису',activeOne:'Активний',inactiveOne:'Неактивний',files:'Фото й підписані документи',missing:'Не завантажено',photo:'Фото',rules:'Підписані правила',gdpr:'Підписане повідомлення GDPR',private:'Особистий документ',pending:'Очікує перевірки',invited:'✓ Схвалено — лист запитано',rejected:'Відхилено',allRegistrations:'Усі стани',approve:'Перевірити й схвалити реєстрацію',reject:'Відхилити реєстрацію',approveConfirm:'Дані перевірено за фактичним договором? Підтвердити доступ і нарахування?',rejectConfirm:'Відхилити заявку?',inviteOK:'Реєстрацію схвалено. Сервер прийняв запит листа; доставку не перевірено.',failed:'Не вдалося зберегти. Оновіть перелік.',emailFailed:'Запит листа не прийнято. Перевірте пошту Supabase. Не повторюйте запити поспіль.',rate:'Надсилання листів тимчасово обмежено.',conflict:'Заявка або членство змінилися. Оновіть перелік.',refresh:'Оновити перелік',empty:'Немає відповідних записів.',review:'Схвалити документ',return:'Повернути на виправлення',note:'Коментар перевірки',reviewConfirm:'Підтвердити результат перевірки?',approved:'Схвалено',needsFix:'Потрібне виправлення',view:'Відкрити файл',limit:'До 1 000 записів лише вашого гуртожитку.',roleAdmin:'Адміністратор Student House',roleReception:'Рецепція Student House',noAccess:'Лише для адміністрації та рецепції.',fileFailed:'Документи не завантажилися. Профіль доступний.',save:'Зберегти кімнату',room:'Номер кімнати',email:'Пошта',noRoom:'Не призначена',details:'Дані заявки',registered:'Надіслано',saving:'Збереження…'}
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

export const reviewCopy = {
 sk:['Ukladá sa…','Registrácia schválená','Registrácia vrátená na opravu','Dotazník schválený','Dotazník vrátený na opravu','Dokument schválený','Dokument vrátený na opravu','Splátkový kalendár schválený','Zmenu sa nepodarilo uložiť. Skús to znova.'],
 en:['Saving…','Registration approved','Registration returned for correction','Questionnaire approved','Questionnaire returned for correction','Document approved','Document returned for correction','Payment schedule approved','Could not save the change. Try again.'],
 ru:['Сохранение…','Заявка одобрена','Заявка возвращена на исправление','Анкета одобрена','Анкета возвращена на исправление','Документ одобрен','Документ возвращён на исправление','График платежей одобрен','Не удалось сохранить изменение. Попробуйте ещё раз.'],
 uk:['Збереження…','Заявку схвалено','Заявку повернено на виправлення','Анкету схвалено','Анкету повернено на виправлення','Документ схвалено','Документ повернено на виправлення','Графік платежів схвалено','Не вдалося зберегти зміни. Спробуйте ще раз.']
};
export async function failureCode(error, data) {
  if (data?.error) return data.error;
  try {const body = await error?.context?.clone().json(); return body?.error || body?.code || '';} catch {return '';}
}

const archiveCopy={
 sk:{title:'Archivovať študenta',warning:'Archivácia vypne prístup študenta a uvoľní jeho miesto v evidencii izieb. Zmluvy, platby a história sa uchovajú. Trvalé vymazanie podlieha samostatnému schváleniu.',cancel:'Zrušiť',confirm:'Potvrdiť archiváciu',archived:'Archivovaný',failed:'Archivácia zlyhala. Overte oprávnenia a obnovte prehľad.'},
 en:{title:'Archive student',warning:'Archiving removes student access and releases their place in the room register. Agreements, payments and history are retained. Permanent deletion requires separate approval.',cancel:'Cancel',confirm:'Confirm archive',archived:'Archived',failed:'Archiving failed. Check permissions and refresh the list.'},
 ru:{title:'Архивировать студента',warning:'Архивация отключит доступ студента и освободит его место в реестре комнат. Договоры, платежи и история сохранятся. Окончательное удаление требует отдельного согласования.',cancel:'Отмена',confirm:'Подтвердить архивацию',archived:'В архиве',failed:'Не удалось архивировать. Проверьте права доступа и обновите список.'},
 uk:{title:'Архівувати студента',warning:'Архівування вимкне доступ студента та звільнить його місце в реєстрі кімнат. Договори, платежі й історія збережуться. Остаточне видалення потребує окремого погодження.',cancel:'Скасувати',confirm:'Підтвердити архівування',archived:'В архіві',failed:'Не вдалося архівувати. Перевірте права доступу й оновіть список.'}
};

const purgeCopy = {
 "sk": [
  "Trvalo vymazať študenta",
  "Touto operáciou trvalo odstránite schválený testovací profil a jeho evidenciu. Na potvrdenie napíšte DELETE.",
  "Potvrdiť trvalé vymazanie",
  "Chýba platné schválenie vymazania po zálohe.",
  "Najprv musí oprávnená osoba dokončiť zálohu a odstránenie súborov.",
  "Študent bol trvalo vymazaný.",
  "Trvalé vymazanie sa nepodarilo alebo je účet chránený."
 ],
 "en": [
  "Permanently delete student",
  "This permanently removes an approved test profile and its records. Type DELETE to continue.",
  "Confirm permanent deletion",
  "A valid deletion approval after backup is required.",
  "An authorized operator must finish backing up and removing the files first.",
  "Student permanently deleted.",
  "Permanent deletion failed or the account is protected."
 ],
 "ru": [
  "Удалить студента навсегда",
  "Тестовый профиль и его записи будут удалены навсегда. Для подтверждения введите DELETE.",
  "Подтвердить окончательное удаление",
  "Требуется действующее разрешение после резервного копирования.",
  "Уполномоченный сотрудник должен завершить резервное копирование и удаление файлов.",
  "Студент удалён навсегда.",
  "Удаление не удалось или аккаунт защищён."
 ],
 "uk": [
  "Видалити студента назавжди",
  "Тестовий профіль і його записи буде видалено назавжди. Для підтвердження введіть DELETE.",
  "Підтвердити остаточне видалення",
  "Потрібне чинне погодження після резервного копіювання.",
  "Уповноважений працівник має завершити резервне копіювання й видалення файлів.",
  "Студента видалено назавжди.",
  "Видалення не вдалося або обліковий запис захищено."
 ]
};

export async function renderStaffScreen(ctx) {
 const [saving,registrationApproved,registrationReturned,questionnaireApproved,questionnaireReturned,documentApproved,documentReturned,scheduleApproved,saveError]=reviewCopy[ctx.lang]||reviewCopy.en;
 function receipt(label){
  const result=el('p','staff-notice staff-approval-success','✓ '+label);
  result.setAttribute('role','status');
  return result;
 }
 function busyButton(button, peers=[button]){
  const label=button.textContent;
  button.textContent=saving;
  for(const peer of peers)peer.disabled=true;
  return ()=>{
   button.textContent=label;
   for(const peer of peers)peer.disabled=false;
  };
 }
 function inlineError(){
  const result=el('p','danger');
  result.setAttribute('role','alert');
  return result;
 }

 const {words:w,el,button,field,state,status,allowed} = ui(ctx);

 const archive=archiveCopy[ctx.lang]||archiveCopy.sk;
 const [purgeLabel,purgeWarning,purgeConfirm,approvalRequired,storagePending,purgeSuccess,purgeError]=purgeCopy[ctx.lang]||purgeCopy.sk;
 function confirmArchive(person){
  if(!ctx.isCurrent()||ctx.role!=='org_admin'||person.archived_at)return;
  const dialog=el('dialog','staff-archive-dialog');
  const title=el('h3','',archive.title);
  title.id='staff-archive-title';
  dialog.setAttribute('aria-labelledby',title.id);
  const details=el('dl','identity-fields');
  details.append(field(w.room,person.verified_room_number),field(w.contract,person.verified_contract_number));
  const failure=inlineError();
  const cancel=button(archive.cancel,()=>dialog.close());
  cancel.autofocus=true;
  const confirm=button(archive.confirm,async()=>{
   if(!ctx.isCurrent()||pendingAction)return;
   pendingAction=true;
   const reset=busyButton(confirm,[confirm,cancel]);
   failure.textContent='';
   let archivedAt;
   try{
    const {data,error}=await ctx.db.rpc('archive_residence_student',{p_tenant:ctx.tenant,p_resident:person.id});
    if(error||!data)throw Error('archive_failed');
    archivedAt=data;
   }catch{
    failure.textContent=archive.failed;
   }finally{
    pendingAction=false;
    reset();
   }
   if(archivedAt){
    person.archived_at=archivedAt;
    person.active=false;
    dialog.close();
    if(ctx.isCurrent()){
     paint();
     ctx.notice.replaceChildren(receipt(archive.archived+' · '+person.full_name));
    }
   }
  },'staff-archive-danger');
  dialog.addEventListener('cancel',event=>{if(pendingAction)event.preventDefault();});
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.append(title,el('p','',person.full_name),details,el('p','',archive.warning),failure,cancel,confirm);
  ctx.root.append(dialog);
  dialog.showModal();
 }

 function confirmPurge(person){
  if(!ctx.isCurrent()||ctx.role!=='org_admin')return;
  const dialog=el('dialog','staff-archive-dialog');
  const title=el('h3','',purgeLabel);
  title.id='staff-purge-title';
  dialog.setAttribute('aria-labelledby',title.id);
  const details=el('dl','identity-fields');
  details.append(field(w.room,person.verified_room_number),field(w.contract,person.verified_contract_number));
  const code=el('input');
  code.type='text';
  code.autocomplete='off';
  code.spellcheck=false;
  const label=el('label','','DELETE');
  label.append(code);
  const failure=inlineError();
  const cancel=button(archive.cancel,()=>dialog.close());
  cancel.autofocus=true;
  const submit=button(purgeConfirm,async()=>{
   if(!ctx.isCurrent()||code.value.trim()!=='DELETE'||pendingAction)return;
   pendingAction=true;
   const reset=busyButton(submit,[submit,cancel]);
   code.disabled=true;
   failure.textContent='';
   let removed=false;
   try{
    const {data,error}=await ctx.db.rpc('purge_approved_test_student',{
     p_tenant:ctx.tenant,p_resident:person.id,p_confirmation:code.value.trim()
    });
    removed=!error&&data==='deleted';
    if(!removed)failure.textContent=data==='approval_required'?approvalRequired:data==='storage_pending'?storagePending:purgeError;
   }catch{
    failure.textContent=purgeError;
   }finally{
    pendingAction=false;
    code.disabled=false;
    reset();
   }
   if(removed){
    dialog.close();
    if(ctx.isCurrent()){
     const index=records.indexOf(person);
     if(index>=0)records.splice(index,1);
     paint();
     ctx.notice.replaceChildren(receipt(purgeSuccess));
    }
   }
  },'staff-archive-danger');
  submit.disabled=true;
  code.addEventListener('input',()=>{submit.disabled=code.value.trim()!=='DELETE';});
  dialog.addEventListener('cancel',event=>{if(pendingAction)event.preventDefault();});
  dialog.addEventListener('close',()=>dialog.remove(),{once:true});
  dialog.append(title,el('p','',person.full_name),details,el('p','',purgeWarning),label,failure,cancel,submit);
  ctx.root.append(dialog);
  dialog.showModal();
 }

 const correctionLang={
  sk:{state:'Vrátená na opravu',return:'Vrátiť študentovi na opravu',reissue:'Vytvoriť nový opravný odkaz',prompt:'Napíš študentovi, ktoré údaje má opraviť. Napríklad nesprávne číslo zmluvy, meno, dátumy alebo izbu.',reason:'Dôvod vrátenia',create:'Pripraviť bezpečný odkaz na opravu',prepared:'Registrácia je vrátená na opravu. E-mail sa ešte NEODOSLAL – otvor Gmail a správu odošli.',gmail:'Otvoriť Gmail s pripraveným e-mailom',copy:'Skopírovať opravný odkaz',copied:'Odkaz je skopírovaný.',subject:'Student House Bratislava – oprava registrácie',body:'Dobrý deň,\n\npri kontrole vašej registrácie Student House Bratislava sme zistili údaje, ktoré je potrebné opraviť:\n\n',bodyEnd:'\n\nOtvorte bezpečný odkaz a opravte údaje (platnosť 7 dní):\n',closing:'\n\nPo odoslaní sa registrácia vráti na kontrolu recepcii.\n\nRecepcia Student House Bratislava',sendError:'Nepodarilo sa vytvoriť odkaz. Obnov prehľad.',existing:'Čaká sa na opravu údajov študentom.',expires:'Platnosť odkazu: 7 dní. Nový odkaz zneplatní predošlý.',empty:'Dôvod opravy musí mať aspoň 10 znakov.'},
  en:{state:'Returned for correction',return:'Return to student for correction',reissue:'Create new correction link',prompt:'Explain what the student needs to correct (contract number, name, dates, or room).',reason:'Correction reason',create:'Prepare secure correction link',prepared:'Registration returned for correction. Email has NOT been sent; open Gmail and send it.',gmail:'Open Gmail draft',copy:'Copy correction link',copied:'Link copied.',subject:'Student House Bratislava – registration correction',body:'Hello,\n\nReception needs you to correct the following details of your Student House Bratislava registration:\n\n',bodyEnd:'\n\nOpen this secure link within 7 days:\n',closing:'\n\nYour registration will return to reception for approval after submission.\n\nStudent House Bratislava Reception',sendError:'Unable to create link. Refresh and try again.',existing:'Waiting for the student to resubmit corrected details.',expires:'Link valid 7 days. Creating another link invalidates the previous one.',empty:'Please write at least 10 characters explaining the correction.'},
  ru:{state:'Возвращено на исправление',return:'Вернуть студенту на исправление',reissue:'Новая ссылка для исправления',prompt:'Укажите, какие данные нужно исправить.',reason:'Причина',create:'Подготовить ссылку',prepared:'Регистрация возвращена. Письмо НЕ отправлено — откройте Gmail.',gmail:'Открыть Gmail',copy:'Копировать ссылку',copied:'Ссылка скопирована.',subject:'Student House Bratislava – исправление регистрации',body:'Здравствуйте!\n\nПожалуйста, исправьте следующие данные:\n\n',bodyEnd:'\n\nБезопасная ссылка (7 дней):\n',closing:'\n\nПосле исправления регистрация вернётся на проверку.',sendError:'Не удалось создать ссылку.',existing:'Ожидаем исправления.',expires:'Ссылка действует 7 дней.',empty:'Напишите причину исправления (не менее 10 символов).'},
  uk:{state:'Повернуто на виправлення',return:'Повернути на виправлення',reissue:'Нове посилання',prompt:'Вкажіть, що потрібно виправити.',reason:'Причина',create:'Підготувати посилання',prepared:'Реєстрацію повернуто. Лист НЕ відправлено — відкрийте Gmail.',gmail:'Відкрити Gmail',copy:'Копіювати посилання',copied:'Посилання скопійовано.',subject:'Student House Bratislava – виправлення реєстрації',body:'Вітаємо!\n\nБудь ласка, виправте такі дані:\n\n',bodyEnd:'\n\nБезпечне посилання (7 днів):\n',closing:'\n\nПісля надсилання реєстрація повернеться на перевірку.',sendError:'Не вдалося створити посилання.',existing:'Очікуємо виправлення.',expires:'Посилання діє 7 днів.',empty:'Вкажіть причину (не менше 10 символів).'}
 };
 const cw=correctionLang[ctx.lang]||correctionLang.sk;
 w.correction_requested=cw.state;
 if (!allowed) {ctx.root.replaceChildren(el('p','danger',w.noAccess));return;}
 const questionnaireMode=ctx.section==='residents'&&ctx.questionnaireMode===true;
 const questionnaireWords=({
 sk:['Všetky dotazníky','Čakajú na kontrolu','Schválené','Vrátené na opravu','Neodoslané','Otvoriť dotazník'],
 en:['All questionnaires','Awaiting review','Approved','Returned for correction','Not submitted','Open questionnaire'],
 ru:['Все анкеты','Ожидают проверки','Одобрены','Возвращены на исправление','Не отправлены','Открыть анкету'],
 uk:['Усі анкети','Очікують перевірки','Схвалені','Повернені на виправлення','Не надіслані','Відкрити анкету']
 })[ctx.lang]||['Všetky dotazníky','Čakajú na kontrolu','Schválené','Vrátené na opravu','Neodoslané','Otvoriť dotazník'];
 const refresh = button(w.refresh, () => ctx.refresh());
 ctx.root.append(refresh, ctx.notice);
 const filters = el('div','staff-filters');
 const search = el('input'); search.type='search';search.placeholder=w.search;search.setAttribute('aria-label',w.search);
 const select = el('select');select.setAttribute('aria-label',ctx.section==='residents'?w.state:w.allRegistrations);
 const options=questionnaireMode?['all','pending','approved','returned','missing'].map((key,i)=>[key,questionnaireWords[i]]):ctx.section==='residents'?[['all',w.all],['active',w.active],['inactive',w.inactive]]:[['pending',w.pending],['correction_requested',cw.state],['invited',w.invited],['rejected',w.rejected],['all',w.allRegistrations]];
 for(const [value,label] of options){const o=el('option','',label);o.value=value;select.append(o);}
 const count=el('p','muted');count.setAttribute('aria-live','polite');
 filters.append(search,select);ctx.root.append(filters,count,el('p','small',w.limit));
 const results=el('div','staff-directory');ctx.root.append(results);
 const records=await ctx.list(ctx.section==='residents'?'residents':'registration_requests');
 const questionnaireStatus=new Map();
 if(questionnaireMode){
  const [enquiries,reviews]=await Promise.all([ctx.list('resident_enquiries'),ctx.list('resident_enquiry_reviews')]);
  const byResident=new Map(enquiries.map(x=>[x.resident_id,x]));
  const reviewByResident=new Map(reviews.map(x=>[x.resident_id,x]));
  for(const person of records){
   const enquiry=byResident.get(person.id),review=reviewByResident.get(person.id);
   const submitted=Date.parse(String(enquiry?.student_submitted_at||''));
   const corrected=submitted>Date.parse(String(review?.requested_at||''));
   questionnaireStatus.set(person.id,!Number.isFinite(submitted)?'missing':!review||corrected?'pending':review.review_status==='approved'?'approved':'returned');
  }
  select.value='pending';
 }
 // Photos remain in the private tenant bucket. Only staff may request short-lived
 // signed URLs; no image bytes or permanent storage URLs are stored in the list.
 let privatePhotos=[];
 if(ctx.section==='residents'){
  try{privatePhotos=await ctx.list('residence_portal_files',{kind:'profile_photo',active:true});}
  catch{privatePhotos=[];}
 }
 const photoByResident=new Map(),photoByUser=new Map(),photoUrlCache=new Map();
 for(const record of privatePhotos.slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||'')))){
  if(record.tenant_id!==ctx.tenant||!record.active||record.kind!=='profile_photo')continue;
  if(record.resident_id&&!photoByResident.has(record.resident_id))photoByResident.set(record.resident_id,record);
  if(record.user_id&&!photoByUser.has(record.user_id))photoByUser.set(record.user_id,record);
 }
 const residentPhoto=person=>photoByResident.get(person.id)||photoByUser.get(person.user_id)||null;
 const photoLabel=({sk:{empty:'Fotografia zatiaľ nenahraná',failed:'Fotografiu sa nepodarilo načítať',label:'Fotografia študenta'},
  en:{empty:'Photo not uploaded yet',failed:'Unable to load photo',label:'Student photo'},
  ru:{empty:'Фото пока не загружено',failed:'Не удалось загрузить фото',label:'Фото студента'},
  uk:{empty:'Фото ще не завантажено',failed:'Не вдалося завантажити фото',label:'Фото студента'}})[ctx.lang]||
  {empty:'Fotografia zatiaľ nenahraná',failed:'Fotografiu sa nepodarilo načítať',label:'Fotografia študenta'};
 async function signedPhotoUrl(record){
  const cached=photoUrlCache.get(record.id);
  if(cached?.url&&cached.validUntil>Date.now()+10000)return cached.url;
  if(cached?.pending)return cached.pending;
  const pending=ctx.fileLink(record.id,ctx.tenant,true).then(url=>{
   if(url)photoUrlCache.set(record.id,{url,validUntil:Date.now()+55000});
   else photoUrlCache.delete(record.id);
   return url||null;
  }).catch(()=>{photoUrlCache.delete(record.id);return null;});
  photoUrlCache.set(record.id,{pending});
  return pending;
 }
 function residentPhotoView(person,compact=false){
  const root=el('div',compact?'staff-resident-photo staff-resident-photo-small':'staff-resident-photo staff-resident-photo-large');
  root.setAttribute('aria-label',photoLabel.label+': '+String(person.full_name||''));
  const record=residentPhoto(person);
  if(!record){root.append(el('span','staff-resident-photo-placeholder',photoLabel.empty));return root;}
  const image=el('img','staff-resident-photo-image');
  image.alt=photoLabel.label+' – '+String(person.full_name||'');
  image.loading='lazy';image.decoding='async';image.referrerPolicy='no-referrer';
  const fallback=()=>{if(root.isConnected){root.replaceChildren(el('span','staff-resident-photo-placeholder',photoLabel.failed));}};
  image.addEventListener('error',fallback,{once:true});
  root.append(image);
  void signedPhotoUrl(record).then(url=>{
   if(!ctx.isCurrent()||!root.isConnected)return;
   if(!url){fallback();return;}
   image.src=url;
  });
  return root;
 }

 const verifiedResidents=ctx.section==='registrations'?await ctx.list('residents'):[];
 const registeredQuestionnaires=ctx.section==='registrations'?await ctx.list('registration_enquiries'):[];
 const roomCatalog=ctx.section==='registrations'?await ctx.list('rooms'):[];
 const readyLoginIds=new Set();
 if(ctx.section==='registrations'&&records.some(person=>person.status==='invited')){
  const {data,error}=await ctx.db.rpc('residence_ready_student_logins',{p_tenant:ctx.tenant});
  if(!error)for(const row of data||[])readyLoginIds.add(row.registration_id);
 }
 if(!ctx.isCurrent())return;
 const receiptKey=ctx.tenant+':'+(ctx.userId||'current-staff');
 const approvalWords=({
  sk:{title:'✓ Registrácia úspešne schválená',saved:'Študent, izba a splátkový kalendár sú uložené v evidencii.',year:'Rok Excel evidencie',open:'Otvoriť študenta v Excel evidencii',dirty:'Nájomné alebo deň splatnosti sa zmenili. Klikni znovu na „Pripraviť predpisy na kontrolu“ a potvrď aktualizovaný kalendár.'},
  en:{title:'✓ Registration approved successfully',saved:'The student, room and payment schedule have been saved in the register.',year:'Excel register year',open:'Open student in Excel register',dirty:'Rent or the due day changed. Prepare the charges again and confirm the updated schedule.'},
  ru:{title:'✓ Регистрация успешно одобрена',saved:'Студент, комната и график платежей сохранены в реестре.',year:'Год таблицы',open:'Открыть студента в таблице',dirty:'Аренда или день оплаты изменены. Подготовьте начисления заново и подтвердите график.'},
  uk:{title:'✓ Реєстрацію успішно схвалено',saved:'Студента, кімнату та графік платежів збережено в реєстрі.',year:'Рік таблиці',open:'Відкрити студента в таблиці',dirty:'Оренда або день оплати змінені. Підготуйте нарахування знову й підтвердьте графік.'}
 })[ctx.lang]||{};
 function revealNotice(){
  ctx.notice.tabIndex=-1;
  ctx.notice.scrollIntoView?.({block:'center',behavior:'auto'});
  ctx.notice.focus?.({preventScroll:true});
 }
 function showApprovalReceipt(person,emailSent,loginReady=false){
  ctx.notice.replaceChildren(el('strong','staff-approval-title',approvalWords.title),
   el('p','',[person.first_name,person.last_name].join(' ')+' · '+person.email),
   el('p','',w.room+': '+person.room_number+' · '+w.period+': '+ctx.day(person.accommodation_from)+' – '+ctx.day(person.accommodation_to)),
   el('p','',approvalWords.saved),el('p','',approvalWords.year+': '+String(person.accommodation_from).slice(0,4)),
   el('p','',loginReady?({sk:'Účet bol aktivovaný. Študent sa môže prihlásiť pôvodným heslom a pokračovať v dotazníku.',en:'Login activated. Student can sign in with their original password.',ru:'Вход активирован. Студент может войти с исходным паролем.',uk:'Вхід активовано. Студент може увійти зі своїм паролем.'}[ctx.lang]||''):emailSent===undefined?({sk:'Schválenie je uložené. Doručenie pozvánky nie je overené.',en:'Approval is saved. Check invitation delivery separately.',ru:'Одобрение сохранено. Доставку приглашения нужно проверить отдельно.',uk:'Схвалення збережено. Доставку запрошення потрібно перевірити окремо.'}[ctx.lang]||''):emailSent===false?({sk:'Pozvánka sa neodoslala. Recepcia musí znovu odoslať prístup.',en:'Invitation email was not sent. Reception must resend access.',ru:'Приглашение не отправлено. Ресепшен должен отправить его повторно.',uk:'Запрошення не надіслано. Рецепція має надіслати його повторно.'}[ctx.lang]||'') :({sk:'Pozvánku prijala e-mailová služba. Doručenie do schránky nie je overené.',en:'The mail service accepted the invitation. Inbox delivery is unconfirmed.',ru:'Почтовый сервис принял приглашение. Доставка в ящик не подтверждена.',uk:'Поштова служба прийняла запрошення. Доставку до скриньки не підтверджено.'})[ctx.lang]));
  ctx.notice.className='staff-notice staff-approval-success';
  if(typeof ctx.openRooms==='function')ctx.notice.append(button(approvalWords.open,()=>ctx.openRooms(person.room_number,person.accommodation_from),'btn-secondary'));
 }
 const previousReceipt=approvalReceipts.get(receiptKey);
 const savedReceipt=previousReceipt?records.find(p=>p.id===previousReceipt.id&&p.status==='invited'):null;
 const recentApproval=ctx.section==='registrations'&&ctx.userId?records.filter(p=>p.status==='invited'&&p.reviewed_by===ctx.userId&&Date.parse(p.reviewed_at)>Date.now()-3600000)
  .sort((a,b)=>String(b.reviewed_at).localeCompare(String(a.reviewed_at)))[0]:null;
 if(savedReceipt||recentApproval)showApprovalReceipt(savedReceipt||recentApproval,savedReceipt?previousReceipt.emailSent:undefined);
 const contractTexts={
   sk:{collision:'Pozor: číslo zmluvy už používa iný študent v izbe',same:'To isté číslo zmluvy sa nachádza aj v ďalších registráciách.',correct:'Opraviť číslo zmluvy podľa podpísanej zmluvy',save:'Uložiť overené číslo zmluvy',verify:'Zmeň číslo iba po porovnaní so skutočnou zmluvou.',conflict:'Toto číslo už existuje v evidencii. Over jeho správnosť.',saved:'Číslo zmluvy opravené. Teraz je potrebné registráciu schváliť.',invalid:'Číslo zmluvy musí obsahovať 5 až 60 znakov.',pending:'Registráciu zatiaľ nie je možné schváliť: číslo zmluvy sa už používa.'},
   en:{collision:'Warning: another student already uses this contract number in room',same:'The contract number is also used in other registrations.',correct:'Correct contract number from signed agreement',save:'Save verified contract number',verify:'Change the number only after checking the signed agreement.',conflict:'This contract number is already used. Verify it first.',saved:'Contract number updated. Reception must still approve the registration.',invalid:'Contract number must contain 5–60 characters.',pending:'Approval blocked: contract number is already in use.'},
   ru:{collision:'Номер договора уже используется в комнате',same:'Номер также встречается в других регистрациях.',correct:'Исправить номер договора',save:'Сохранить проверенный номер',verify:'Проверяйте номер по подписанному договору.',conflict:'Этот номер уже занят.',saved:'Номер исправлен, требуется подтверждение.',invalid:'Номер должен содержать от 5 до 60 символов.',pending:'Подтверждение заблокировано: номер уже занят.'},
   uk:{collision:'Номер договору вже використовується в кімнаті',same:'Номер також зустрічається в інших реєстраціях.',correct:'Виправити номер договору',save:'Зберегти перевірений номер',verify:'Перевірте номер за підписаним договором.',conflict:'Цей номер уже використовується.',saved:'Номер виправлено, потрібне підтвердження.',invalid:'Номер має містити від 5 до 60 символів.',pending:'Підтвердження заблоковано: номер уже зайнятий.'}
 };
 const ct=contractTexts[ctx.lang]||contractTexts.sk;
 ct.correct=ctx.lang==='en'?'Assign contract number (reception only)':'Prideliť číslo zmluvy – iba recepcia';
 const contractConflict=person=>person.contract_number?verifiedResidents.find(x=>String(x.verified_contract_number||'').trim()===String(person.contract_number||'').trim()&&normalize(x.email)!==normalize(person.email)):null;
 let pendingAction=false;
 const paint=()=>{
  if(pendingAction)return;
  const filtered=questionnaireMode?filterResidents(records,search.value,'all').filter(p=>select.value==='all'||questionnaireStatus.get(p.id)===select.value):ctx.section==='residents'?filterResidents(records,search.value,select.value):filterRegistrations(records,search.value,select.value);
  count.textContent=w.count+': '+filtered.length+' / '+records.length;results.replaceChildren();
  if(!filtered.length){results.append(el('p','empty-message',w.empty));return;}
  for(const person of filtered){
   const card=el('article','staff-person');
   const name=ctx.section==='residents'?person.full_name:[person.first_name,person.last_name].join(' ');
   if(ctx.section==='residents')card.append(residentPhotoView(person,true));
   card.append(el('h4','',name),el('p','muted',person.email),el('p','',w.room+': '+(person.verified_room_number||person.room_number||w.noRoom)));
   card.append(el('span','status-pill',ctx.section==='residents'?(person.archived_at?archive.archived:person.active?w.activeOne:w.inactiveOne):state(person.status)));
   if(questionnaireMode){
    const stateKey=questionnaireStatus.get(person.id);
    card.append(el('p','status-pill',questionnaireWords[['all','pending','approved','returned','missing'].indexOf(stateKey)]));
    card.append(button(questionnaireWords[5],()=>{void profile(person);}));
   }else if(ctx.section==='residents'){
    card.append(button(w.open,()=>{void profile(person);}));
    if(ctx.role==='org_admin'){
     if(!person.archived_at)card.append(button(archive.title,()=>confirmArchive(person)));
     const remove=button(purgeLabel,()=>confirmPurge(person),'staff-archive-danger');
     const icon=el('span','','🗑 ');
     icon.setAttribute('aria-hidden','true');
     remove.prepend(icon);
     card.append(remove);
    }
   }
   else{
    const details=el('dl','identity-fields');details.append(field(w.contract,person.contract_number||'Pridelí recepcia'),field(w.period,ctx.day(person.accommodation_from)+' – '+ctx.day(person.accommodation_to)),field(w.registered,ctx.day(person.created_at)));card.append(details);
    const q=registeredQuestionnaires.find(x=>x.registration_id===person.id);
    {
     const labels=({
      sk:['Údaje z registrácie','Meno','Priezvisko','E-mail','Telefón','Štátna príslušnosť','Dátum narodenia','Pohlavie','Vysoká škola','Preferovaný typ izby / obsadenosť','Dĺžka pobytu','Začiatok pobytu','Koniec pobytu','Plánovaný príchod','GDPR – oboznámenie','Potvrdené','Nepotvrdené','Nezadané v registrácii','mesiacov','Trvalá adresa','Kontakt rodiča','Chýba pripojený záznam registračných údajov.'],
      en:['Registration details','First name','Last name','Email','Phone','Nationality','Date of birth','Gender','University','Preferred room type / occupancy','Length of stay','Stay starts','Stay ends','Expected arrival','GDPR acknowledgement','Confirmed','Not confirmed','Not supplied at registration','months','Permanent address','Parent contact','The linked registration details are missing.'],
      ru:['Данные регистрации','Имя','Фамилия','Электронная почта','Телефон','Гражданство','Дата рождения','Пол','Университет','Тип комнаты / размещение','Срок проживания','Начало проживания','Конец проживания','Планируемый заезд','Ознакомление с GDPR','Подтверждено','Не подтверждено','Не указано при регистрации','мес.','Постоянный адрес','Контакт родителя','Связанные данные регистрации отсутствуют.'],
      uk:['Дані реєстрації','Ім’я','Прізвище','Електронна пошта','Телефон','Громадянство','Дата народження','Стать','Університет','Тип кімнати / розміщення','Тривалість проживання','Початок проживання','Кінець проживання','Планове прибуття','Ознайомлення з GDPR','Підтверджено','Не підтверджено','Не вказано при реєстрації','міс.','Постійна адреса','Контакт батьків','Пов’язані дані реєстрації відсутні.']
     })[ctx.lang];
     const box=el('section','staff-form'),grid=el('dl','identity-fields');
     box.append(el('h4','',labels[0]));
     if(!q)box.append(el('p','danger',labels[21]));
     const date=value=>value?ctx.day(value):'';
     const entries=[[1,person.first_name],[2,person.last_name],[3,person.email],[4,q?.telephone],[5,q?.nationality],
      [6,date(q?.date_of_birth)],[7,({sk:{female:'Žena',male:'Muž',other:'Iné'},en:{female:'Female',male:'Male',other:'Other'},ru:{female:'Женщина',male:'Мужчина',other:'Другое'},uk:{female:'Жінка',male:'Чоловік',other:'Інше'}})[ctx.lang]?.[q?.gender]||q?.gender],[8,q?.school],[9,q?.preferred_room_type?displayRoomType(q.preferred_room_type,ctx.lang):''],
      [10,q?.preferred_duration_months?q.preferred_duration_months+' '+labels[18]:''],[11,date(person.accommodation_from)],[12,date(person.accommodation_to)],[13,date(q?.preferred_from)],
      [14,person.privacy_acknowledged_at?labels[15]+' · '+date(person.privacy_acknowledged_at):labels[16]]];
     if(q?.permanent_address)entries.push([19,q.permanent_address]);
     if(q?.parent_contact_email)entries.push([20,q.parent_contact_email]);
     for(const [i,value] of entries)grid.append(field(labels[i],String(value??'').trim()||labels[17]));
     box.append(grid);card.append(box);
    }
    if(person.status==='invited'){
     card.append(receipt(registrationApproved));
     const resend=button(ctx.lang==='en'?'Resend invitation for current step':'Znova poslať pozvánku na aktuálny krok',async()=>{
      if(pendingAction||!ctx.isCurrent()||!confirm(ctx.lang==='en'?'Send a new password setup link to this approved resident?':'Poslať nový odkaz na vytvorenie hesla tomuto schválenému študentovi?'))return;
      pendingAction=true;resend.disabled=true;
      try{
       const {data,error}=await ctx.db.functions.invoke('manage',{body:{
        action:'resend_student_access',role:'student',tenant_id:ctx.tenant,registration_id:person.id
       }});
       const queued=!error&&data?.ok&&data?.email_queued===true;
       status(queued?
        ({sk:'Pozvánka je vo fronte na odoslanie. Doručenie do schránky zatiaľ nie je potvrdené.',
          en:'Invitation queued for SMTP delivery. Inbox receipt is not yet confirmed.',
          ru:'Приглашение добавлено в очередь отправки. Доставка в почтовый ящик ещё не подтверждена.',
          uk:'Запрошення додано до черги надсилання. Доставку в поштову скриньку ще не підтверджено.'})[ctx.lang]:
        ({sk:'Pozvánku sa nepodarilo zaradiť do odosielania. Skontroluj SMTP frontu.',
          en:'Unable to queue the invitation. Check the SMTP queue.',
          ru:'Не удалось добавить приглашение в очередь. Проверьте SMTP.',
          uk:'Не вдалося додати запрошення до черги. Перевірте SMTP.'})[ctx.lang],!queued);
      }catch{status(w.failed,true)}
      finally{pendingAction=false;resend.disabled=false;}
     });
     card.append(resend);
    }
    if(person.status==='invited'){
     const loginActiveLabel=({sk:'✓ Študentské prihlásenie je aktívne',en:'✓ Student login is active',ru:'✓ Вход студента активирован',uk:'✓ Вхід студента активовано'})[ctx.lang]||'✓ Študentské prihlásenie je aktívne';
     if(readyLoginIds.has(person.id)){
      card.append(el('p','staff-notice staff-approval-success',loginActiveLabel));
     }else{
      const activationResult=el('p','staff-notice');
      activationResult.setAttribute('role','status');
      activationResult.style.margin='0';
      const activate=button(ctx.lang==='en'?'Activate student password access':'Aktivovať študentské prihlásenie',async()=>{
       if(pendingAction||!ctx.isCurrent())return;
       pendingAction=true;const restore=busyButton(activate);activationResult.textContent='';activationResult.classList.remove('danger');
       try{
        const {data,error}=await ctx.db.functions.invoke('manage',{body:{
         action:'activate_approved_login',role:'student',tenant_id:ctx.tenant,registration_id:person.id
        }});
        if(!error&&data?.login_ready){
         activate.hidden=true;
         activate.style.display='none';
         activationResult.classList.add('staff-approval-success');
         readyLoginIds.add(person.id);
         activationResult.textContent=loginActiveLabel;
         activationResult.tabIndex=-1;
         activationResult.focus({preventScroll:true});
        }else{
         const code=await failureCode(error,data);
         activationResult.classList.add('danger');
         activationResult.textContent=code==='password_setup_required'?
           (ctx.lang==='en'?'This account has no password yet. Send a secure setup email.':'Účet ešte nemá heslo. Potrebný je bezpečný odkaz na jeho vytvorenie.'):saveError;
        }
       }catch{activationResult.classList.add('danger');activationResult.textContent=saveError;}
       finally{pendingAction=false;if(!activate.hidden)restore();}
      });
      card.append(activate,activationResult);
     }
    }
    if(person.status==='rejected'){
     card.append(receipt(({sk:'Registrácia zamietnutá',en:'Registration rejected',ru:'Заявка отклонена',uk:'Заявку відхилено'})[ctx.lang]));
    }
    if(person.status==='correction_requested'){
     card.append(receipt(registrationReturned));
     if(person.correction_reason)card.append(el('p','',cw.reason+': '+person.correction_reason));
     card.append(button(cw.reissue,()=>returnEditor(person,card)));
    }
    if(person.status==='pending'){
     const conflict=contractConflict(person);
     const others=person.contract_number?records.filter(x=>x.id!==person.id&&String(x.contract_number||'').trim()===String(person.contract_number||'').trim()).length:0;
     if(conflict){
      const warn=el('p','danger',ct.collision+' '+(conflict.verified_room_number||'—')+'.');
      warn.setAttribute('role','alert');card.append(warn);
     }
     if(others)card.append(el('p','mini-note',ct.same+' ('+others+')'));
     const actions=el('div','staff-actions');
     card.append(actions);
     approvalEditor(person,actions);
     const other=el('details','staff-form');
     other.append(el('summary','',({sk:'Ďalšie možnosti',en:'Other actions',ru:'Другие действия',uk:'Інші дії'})[ctx.lang]||'Ďalšie možnosti'));
     const reject=button(w.reject,()=>{void decide(person,false,actions,reject);});
     const returnButton=button(cw.return,()=>returnEditor(person,card));
     other.append(returnButton,reject);card.append(other);
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
  const message=inlineError();
  form.append(label,el('p','mini-note',cw.expires),send,message);
  card.append(form);explanation.focus();
  form.addEventListener('submit',async event=>{
   event.preventDefault();
   if(pendingAction||!ctx.isCurrent())return;
   const reason=explanation.value.trim();if(reason.length<10){status(cw.empty,true);return;}
   pendingAction=true;const restore=busyButton(send);message.textContent='';
   try{
    const {data,error}=await ctx.db.functions.invoke('registration-correction',{
     body:{action:'issue',tenant_id:ctx.tenant,registration_id:person.id,reason}
    });
    if(!ctx.isCurrent())return;
    if(error||!data?.ok||!data?.link){message.textContent=cw.sendError;return;}
    person.status='correction_requested';person.correction_reason=reason;
    status(data.email_queued
     ?({sk:'Registrácia bola vrátená. E-mail čaká vo fronte; doručenie ešte nie je potvrdené.',en:'Registration returned. Email queued; inbox delivery is not confirmed.',ru:'Заявка возвращена. Письмо в очереди; доставка не подтверждена.',uk:'Заявку повернуто. Лист у черзі; доставку не підтверджено.'})[ctx.lang]
     :cw.prepared);
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
   }catch{if(ctx.isCurrent())message.textContent=cw.sendError;}
   finally{pendingAction=false;restore();if(ctx.isCurrent()&&person.status==='correction_requested'){select.value='correction_requested';search.value=person.email;paint();}}
  });
 }
 function approvalEditor(person,actions){
  const q=registeredQuestionnaires.find(q=>q.registration_id===person.id);
  const duration=Number(q?.preferred_duration_months);
  const t=({
   sk:{title:'Schválenie registrácie',contract:'Číslo zmluvy',room:'Pridelená izba',choose:'Vyber izbu',rent:'Mesačný nájom (€)',due:'Deň splatnosti v predchádzajúcom mesiaci (1–28)',stay:'Dĺžka pobytu',months:'mesiacov',from:'Ubytovanie od',to:'Ubytovanie do',arrival:'Plánovaný príchod',preview:'Platobný kalendár',approve:'Schváliť registráciu',invalid:'Doplň číslo zmluvy, izbu a mesačný nájom.',missing:'Chýba platná dĺžka pobytu. Vráť registráciu na opravu.',full:'Každý mesiac sa platí celý. Predpis nie je prijatá úhrada.',total:'Nájom za celý pobyt',conflict:'Číslo zmluvy už patrí inému študentovi.',first:'Splatnosť prvého nájmu'},
   en:{title:'Registration approval',contract:'Contract number',room:'Assigned room',choose:'Choose a room',rent:'Monthly rent (€)',due:'Due day in prior month (1–28)',stay:'Length of stay',months:'months',from:'Accommodation from',to:'Accommodation to',arrival:'Expected arrival',preview:'Payment calendar',approve:'Approve registration',invalid:'Enter contract number, room and monthly rent.',missing:'Valid stay duration missing. Return the registration for correction.',full:'Each month is charged in full. Charges are not receipts.',total:'Rent for entire stay',conflict:'Contract number belongs to another student.',first:'First rent due date'},
   ru:{title:'Подтверждение регистрации',contract:'Номер договора',room:'Назначенная комната',choose:'Выберите комнату',rent:'Аренда в месяц (€)',due:'День оплаты в предыдущем месяце (1–28)',stay:'Срок проживания',months:'мес.',from:'Проживание с',to:'Проживание до',arrival:'Планируемый заезд',preview:'График платежей',approve:'Подтвердить регистрацию',invalid:'Укажите номер договора, комнату и аренду.',missing:'Нет допустимого срока. Верните заявку на исправление.',full:'Каждый месяц оплачивается полностью. Начисление не является оплатой.',total:'Аренда за весь срок',conflict:'Номер договора занят.',first:'Срок первой оплаты'},
   uk:{title:'Схвалення реєстрації',contract:'Номер договору',room:'Призначена кімната',choose:'Оберіть кімнату',rent:'Місячна оренда (€)',due:'День оплати попереднього місяця (1–28)',stay:'Тривалість проживання',months:'міс.',from:'Проживання з',to:'Проживання до',arrival:'Планове прибуття',preview:'Графік платежів',approve:'Схвалити реєстрацію',invalid:'Вкажіть номер договору, кімнату й оренду.',missing:'Немає допустимого строку. Поверніть заявку на виправлення.',full:'Кожен місяць оплачується повністю. Нарахування не є оплатою.',total:'Оренда за весь строк',conflict:'Номер договору зайнятий.',first:'Термін першої оплати'}
  })[ctx.lang]||{};
  actions.append(el('h4','',t.title));
  if(![5,10,12].includes(duration)){actions.append(el('p','danger',t.missing));return;}
  const arrivalCopy=({sk:['Skutočný príchod','Vyplň iba ak študent už prišiel. Inak nechaj prázdne; dátum doplníš v jeho profile alebo Exceli.'],en:['Actual arrival','Enter only if the student has already arrived. Otherwise leave empty and record it later in their profile or Excel register.'],ru:['Фактический заезд','Укажите только после фактического прибытия. Иначе оставьте пустым и заполните позже в профиле или реестре.'],uk:['Фактичне прибуття','Вкажіть лише після прибуття. Інакше залиште порожнім і заповніть пізніше у профілі або реєстрі.']})[ctx.lang];
  const form=el('form','staff-form registration-approval-form'),contract=el('input'),room=el('select'),rent=el('input'),due=el('input'),firstDue=el('input'),actualArrival=el('input'),deposit=el('input'),adminFee=el('input');
  actualArrival.type='date';actualArrival.max=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Bratislava'});actualArrival.value='';
  contract.type='text';contract.required=true;contract.minLength=5;contract.maxLength=60;contract.value=person.contract_number||'';
  const blank=el('option','',t.choose);blank.value='';room.append(blank);
  for(const r of [...roomCatalog].sort((a,b)=>String(a.name).localeCompare(String(b.name),'sk',{numeric:true}))){const o=el('option','',r.name+' · '+r.category+' ('+r.capacity+')');o.value=r.name;room.append(o);}
  room.required=true;room.value=roomCatalog.some(r=>r.name===person.room_number)?person.room_number:'';
  deposit.type='number';deposit.required=true;deposit.min='0';deposit.max='100000';deposit.step='0.01';
  adminFee.type='number';adminFee.required=true;adminFee.min='0';adminFee.max='100000';adminFee.step='0.01';adminFee.value='100.00';
  let depositEdited=false;
  deposit.addEventListener('input',()=>{depositEdited=true;refresh();});

  rent.type='number';rent.min='0.01';rent.max='100000';rent.step='0.01';rent.required=true;
  due.type='number';due.min='1';due.max='28';due.step='1';due.value='1';due.required=true;
  firstDue.type='date';firstDue.required=true;firstDue.value=person.accommodation_from||'';
  const from=person.accommodation_from||'';
  const [y,m]=from.split('-').map(Number);
  if(!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(from)||!Number.isFinite(y)||!Number.isFinite(m)){actions.append(el('p','danger',({sk:'Ubytovanie musí začínať 1. dňom mesiaca. Vráť registráciu na opravu.',en:'The stay must begin on the 1st of the month. Return this application for correction.',ru:'Проживание должно начинаться с 1-го числа месяца. Верните заявку на исправление.',uk:'Проживання має починатися з 1-го числа місяця. Поверніть заявку на виправлення.'})[ctx.lang]));return;}
  const to=new Date(Date.UTC(y,m-1+duration,0)).toISOString().slice(0,10);
  if(to!==person.accommodation_to){actions.append(el('p','danger',t.missing));return;}
  form.append(el('p','mini-note',t.stay+': '+duration+' '+t.months+' · '+ctx.day(from)+' – '+ctx.day(to)),el('p','mini-note',t.arrival+': '+ctx.day(q?.preferred_from||from)));
  const actualLabel=el('label','',arrivalCopy[0]);actualLabel.append(actualArrival);form.append(actualLabel,el('p','mini-note',arrivalCopy[1]));
  const fees=({sk:{code:'Kód izby (vyplní recepcia)',show:'Zobraziť kód',deposit:'Výška depozitu (€)',admin:'Administratívny poplatok (€)',first:'Prvá platba: nájom + depozit + administratívny poplatok'},
    en:{code:'Room access code (reception)',show:'Show code',deposit:'Deposit amount (€)',admin:'Administration fee (€)',first:'Initial payment: rent + deposit + administration fee'},
    ru:{code:'Код комнаты (ресепшен)',show:'Показать код',deposit:'Депозит (€)',admin:'Административный сбор (€)',first:'Первый платёж: аренда + депозит + сбор'},
    uk:{code:'Код кімнати (рецепція)',show:'Показати код',deposit:'Депозит (€)',admin:'Адміністративний збір (€)',first:'Перший платіж: оренда + депозит + збір'}})[ctx.lang];
  for(const [label,input] of [[({sk:'Číslo zmluvy / variabilný symbol',en:'Contract number / payment reference',ru:'Номер договора / платёжный идентификатор',uk:'Номер договору / платіжний ідентифікатор'})[ctx.lang],contract],[t.room,room],[t.rent,rent],[fees.deposit,deposit],[fees.admin,adminFee],[t.due,due],[t.first,firstDue]]){
   const l=el('label','',label);l.append(input);
   form.append(l);
  }
  const preview=el('details','staff-form'),summary=el('summary','',t.preview+' ('+duration+')'),rowsHost=el('div');preview.append(summary,rowsHost);
  const total=el('p','mini-note'),error=el('p','danger');error.setAttribute('role','alert');
  const approve=el('button','',t.approve);approve.type='submit';
  const schedule=()=>Array.from({length:duration},(_,i)=>{
   const period=new Date(Date.UTC(y,m-1+i,1)).toISOString().slice(0,7);
   return {period,amount:Number(rent.value),due_on:i===0?firstDue.value:advanceRentDueDate(period,Number(due.value))};
  });
  const refresh=()=>{
   error.textContent='';rowsHost.replaceChildren();
   if(!depositEdited&&Number(rent.value)>0)deposit.value=(Number(rent.value)*2).toFixed(2);
   const valid=Number(rent.value)>0&&Number.isInteger(Number(due.value))&&Number(due.value)>=1&&Number(due.value)<=28&&!!firstDue.value;
   if(!valid){total.textContent='';return;}
   for(const item of schedule())rowsHost.append(el('p','',item.period+' · '+item.amount.toFixed(2)+' € · '+ctx.day(item.due_on)));
   const initial=Number(rent.value)+Number(deposit.value||0)+Number(adminFee.value||0);
   total.textContent=t.total+': '+(Number(rent.value)*duration).toFixed(2)+' € · '+fees.first+': '+initial.toFixed(2)+' €';
  };
  for(const input of [rent,due,firstDue,adminFee])input.addEventListener('input',refresh);
  form.append(el('p','mini-note',t.full),total,preview,error,approve);
  form.addEventListener('submit',e=>{
   e.preventDefault();if(!form.reportValidity())return;
   if(contract.value.trim().length<5||!roomCatalog.some(r=>r.name===room.value)){error.textContent=t.invalid;return;}
   if(!Number.isFinite(Number(deposit.value))||!Number.isFinite(Number(adminFee.value))){error.textContent=t.invalid;return;}
   if(contractConflict({...person,contract_number:contract.value.trim()})){error.textContent=t.conflict;return;}
   void decide(person,true,actions,approve,{verified_assignment:{
    contract_number:contract.value.trim(),room_number:room.value,accommodation_from:from,accommodation_to:to,
    actual_arrival_on:actualArrival.value||null,room_code:contract.value.trim(),
    deposit_eur:Number(deposit.value).toFixed(2),administration_fee_eur:Number(adminFee.value).toFixed(2)
   },verified_monthly_rent:Number(rent.value),verified_due_day:Number(due.value),verified_schedule:schedule()});
  });
  actions.append(form);refresh();
 }
 async function decide(person,approve,actions,trigger,verified={}){
  if(pendingAction||!ctx.isCurrent()||!confirm(approve?w.approveConfirm:w.rejectConfirm))return;
  pendingAction=true;
  const controls=[...actions.querySelectorAll('button')].filter(button=>!button.disabled);
  const restore=busyButton(trigger,controls);
  actions.querySelector('[role=alert]')?.remove();
  const message=inlineError();actions.append(message);
  search.disabled=true;select.disabled=true;
  let success=false;
  status(w.saving);revealNotice();
  try{
   let response;
   if(approve){
    const {verified_assignment,...billing}=verified;
    // Save assignment, resident membership and payment calendar atomically on the server.
    response=await ctx.db.functions.invoke('manage',{body:{action:'invite',tenant_id:ctx.tenant,registration_id:person.id,role:'student',email:person.email,name:[person.first_name,person.last_name].join(' '),room_number:verified_assignment?.room_number||person.room_number,verified_assignment,...billing}});
   }
   else response=await ctx.db.from('registration_requests').update({status:'rejected'}).eq('tenant_id',ctx.tenant).eq('id',person.id).eq('status','pending').select('id');
   if(!ctx.isCurrent())return;
   if(response.error||(approve?!response.data?.ok:!response.data?.length)){
    const code=await failureCode(response.error,response.data);
    message.textContent=['room_code_required','verified_fees_required','invalid_verified_fees'].includes(code)?({sk:'Doplň číslo zmluvy, depozit a administratívny poplatok.',en:'Provide contract number, deposit and administration fee.',ru:'Заполните номер договора, депозит и административный сбор.',uk:'Заповніть номер договору, депозит та адміністративний збір.'})[ctx.lang]:code==='invalid_actual_arrival'?(({sk:'Skutočný príchod nesmie byť v budúcnosti.',en:'Actual arrival cannot be in the future.',ru:'Фактический заезд не может быть в будущем.',uk:'Фактичне прибуття не може бути в майбутньому.'})[ctx.lang]):code==='verified_assignment_required'?(ctx.lang==='en'?'Complete and verify contract, room and stay dates.':'Doplň overené číslo zmluvy, izbu a termín pobytu.'):['over_email_send_rate_limit','over_request_rate_limit'].includes(code)?w.rate:['invitation_failed','password_email_failed'].includes(code)?w.emailFailed:['membership_exists','registration_not_pending','approval_conflict','reception_assignment_required'].includes(code)?w.conflict:saveError;
    status(message.textContent,true);
    return;
   }
   if(approve&&verified.verified_assignment)Object.assign(person,verified.verified_assignment);
   person.status=approve?'invited':'rejected';success=true;
   const loginReady=approve&&response.data?.login_ready===true;
   const emailRequested=response.data?.email_queued===true||response.data?.email_sent===true;
   const invitationEmailFailed=approve&&!loginReady&&!emailRequested;
   status(loginReady
     ?(ctx.lang==='en'?'Registration approved. Student can sign in with the original password and continue the questionnaire inside Studenthouse.':'Registrácia schválená. Študent sa môže prihlásiť heslom z registrácie a pokračovať v dotazníku v Studenthouse.')
     :invitationEmailFailed
       ?(ctx.lang==='en'?'Approved, but student login is not activated. Check password recovery.':'Registrácia schválená, ale prihlásenie nie je aktivované. Skontroluj obnovu hesla.')
       :(approve?w.inviteOK:w.rejected));
   if(invitationEmailFailed){
    const subject='Student House Bratislava – '+(ctx.lang==='en'?'registration approved':'registrácia schválená');
    const body=ctx.lang==='en'
     ?'Hello,\n\nYour accommodation was approved. Use the Forgot password option at https://www.webu.sk/student-house-portal/student/ to request a password setup link. Then complete the questionnaire and upload your signed contract, house rules and GDPR acknowledgement.\n\nStudent House Bratislava Reception'
     :'Ahoj,\n\nTvoja registrácia bola schválená. Na https://www.webu.sk/student-house-portal/student/ klikni na Zabudnuté heslo a vyžiadaj si odkaz na vytvorenie hesla. Potom vyplň dotazník a odošli podpísanú zmluvu, ubytovací poriadok a GDPR.\n\nRecepcia Student House Bratislava';
    const mail=el('a','btn-secondary',ctx.lang==='en'?'Open Gmail approval message':'Otvoriť Gmail – schválenie študenta');
    mail.href='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(person.email)
      +'&su='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
    mail.target='_blank';mail.rel='noopener noreferrer';mail.style.cssText='display:inline-block;padding:11px 13px;margin:10px 10px 0 0';
    ctx.notice.append(mail);
   }
   // Show a durable receipt only after the server confirms the approval transaction.
   if(!approve){select.value='rejected';search.value=person.email;}
   if(approve){
    approvalReceipts.set(receiptKey,{id:person.id,emailSent});
    showApprovalReceipt(person,emailSent,loginReady);
    select.value='invited';search.value=person.email;
   }
   revealNotice();
  }catch{if(ctx.isCurrent())message.textContent=saveError;}
  finally{
   pendingAction=false;if(ctx.isCurrent()){search.disabled=false;select.disabled=false;if(success)paint();}
   // Preserve the completed form and allow correcting a failed assignment save.
   if(ctx.isCurrent()&&!success)restore();
  }
 }
 async function profile(person){
  if(!ctx.isCurrent())return;
  const [roomCatalog,excelRoomType]=await Promise.all([ctx.list('rooms').catch(()=>[]),ctx.importedRoomType?.(person.id)]);
  if(!ctx.isCurrent())return;
  const assignedRoom=roomCatalog.find(x=>String(x.name||'').trim()===String(person.verified_room_number||'').trim());
  const months=stayPeriods(person.accommodation_from,person.accommodation_to).length;
  const verifiedWords=({
   sk:{months:'Dĺžka pobytu',monthWord:'mesiacov',roomType:'Typ pridelenej izby'},
   en:{months:'Stay duration',monthWord:'months',roomType:'Assigned room type'},
   ru:{months:'Срок проживания',monthWord:'месяцев',roomType:'Тип назначенной комнаты'},
   uk:{months:'Тривалість проживання',monthWord:'місяців',roomType:'Тип призначеної кімнати'}
  })[ctx.lang]||{months:'Dĺžka pobytu',monthWord:'mesiacov',roomType:'Typ pridelenej izby'};
  filters.hidden=true;count.hidden=true;results.className='staff-profile';results.replaceChildren(button(w.back,()=>{if(questionnaireMode){ctx.refresh();return;}filters.hidden=false;count.hidden=false;results.className='staff-directory';paint();}));
  results.append(el('h3','',person.full_name));
  const addendumHost=el('div','staff-actions');
  const openAddendum=button('Vygenerovať dodatok',()=>{});
  addendumHost.append(openAddendum);results.append(addendumHost);
  openAddendum.onclick=async ()=>{
   openAddendum.disabled=true;
   try{
   const [excel,{attachAccommodationAddendum},{data:stays},{data:answers}]=await Promise.all([
    excelDetails,import('./accommodation-addendum.js?v=20261127-addendum-required-details'),
    ctx.db.from('tenancies').select('rent,starts_on,ends_on').eq('tenant_id',ctx.tenant).eq('resident_id',person.id),
    ctx.db.from('resident_enquiries').select('permanent_address,date_of_birth,nationality,identity_document_number,telephone,parent_contact_email,school,iban')
     .eq('tenant_id',ctx.tenant).eq('resident_id',person.id).maybeSingle()
   ]);
   if(!ctx.isCurrent()||!addendumHost.isConnected)return;
   const stay=stays?.find(item=>item.starts_on===person.accommodation_from&&item.ends_on===person.accommodation_to);
   attachAccommodationAddendum(addendumHost,{
    ...excel,name:person.full_name,email:person.email,contract:person.verified_contract_number||excel?.contractNumber,
    room:person.verified_room_number||excel?.room,roomType:excelRoomType||assignedRoom?.category||excel?.roomType,
    originalEnd:person.accommodation_to||excel?.to,rent:stay?.rent??excel?.monthly,
    address:answers?.permanent_address,birth:answers?.date_of_birth?ctx.day(answers.date_of_birth):'',
    nationality:answers?.nationality,identity:answers?.identity_document_number,
    phone:answers?.telephone,parent:answers?.parent_contact_email,school:answers?.school,iban:answers?.iban
   },ctx.tenant,{trigger:openAddendum,show:true});
   }catch{if(ctx.isCurrent())status('Dodatok sa nepodarilo načítať.',true);}
   finally{openAddendum.disabled=false;}
  };

  results.append(residentPhotoView(person,false));
  if(typeof ctx.uploadPrivateDocument==='function'){
   const title=({sk:'Nahrať profilovú fotografiu',en:'Upload profile photo',ru:'Загрузить фото профиля',uk:'Завантажити фото профілю'})[ctx.lang]||'Nahrať profilovú fotografiu';
   const photoForm=el('form','staff-form'),photoInput=el('input'),photoButton=el('button','',title);
   photoInput.type='file';photoInput.accept='image/jpeg,image/png';photoInput.required=true;
   photoInput.setAttribute('aria-label',title);photoButton.type='submit';
   photoForm.append(photoInput,photoButton);results.append(photoForm);
   photoForm.addEventListener('submit',async event=>{
    event.preventDefault();
    const file=photoInput.files?.[0];
    if(!file||photoButton.disabled||!ctx.isCurrent())return;
    if(await ctx.uploadPrivateDocument(person.id,file,photoButton,'profile_photo'))ctx.refresh();
   });
  }
  const details=el('dl','identity-fields');
  details.append(field(w.email,person.email),field(w.room,person.verified_room_number||w.noRoom),field(w.contract,person.verified_contract_number),field(w.period,ctx.day(person.accommodation_from)+' – '+ctx.day(person.accommodation_to)),field(verifiedWords.months,months?String(months)+' '+verifiedWords.monthWord:'—'),field(verifiedWords.roomType,excelRoomType||assignedRoom?.category||'—'),field(w.state,person.active?w.activeOne:w.inactiveOne));results.append(details);
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
  // Verified fee and access details belong to reception, not the student questionnaire.
  const staffFacts=el('section','data-card'),verifiedTitle=({
    sk:'Údaje recepcie – izba a poplatky',en:'Reception-verified room and fees',
    ru:'Подтверждённые данные ресепшена',uk:'Підтверджені дані рецепції'
   })[ctx.lang];
  const missingVerified=({sk:'Recepcia ešte nepotvrdila',en:'Not yet verified by reception',ru:'Ещё не подтверждено',uk:'Ще не підтверджено'})[ctx.lang];
  staffFacts.append(el('h4','section-subtitle',verifiedTitle));
  results.append(staffFacts);
  const excelDetails=import('./imported-register.js?v=20261127-addendum-required-details').then(async ({listImportedStudents})=>{
     const entries=await listImportedStudents(ctx.db,ctx.tenant,[person],{includeVerified:true});
     const matches=entries.filter(entry=>entry.linked&&entry.from===person.accommodation_from);
     return matches.length===1?matches[0]:null;
    }).catch(()=>null);
  try{
   const [{data:record,error},{data:stays,error:stayError},excel]=await Promise.all([
    ctx.db.from('resident_staff_details')
     .select('room_code,deposit_eur,administration_fee_eur')
     .eq('tenant_id',ctx.tenant).eq('resident_id',person.id).maybeSingle(),
    ctx.db.from('tenancies').select('rent,starts_on').eq('tenant_id',ctx.tenant).eq('resident_id',person.id),
    excelDetails
   ]);
   if(!ctx.isCurrent()||!staffFacts.isConnected)return;
   if(error||stayError)throw Error('staff_details_unavailable');
   const rentRecord=(stays||[]).find(x=>x.starts_on===person.accommodation_from)||(stays||[])[0];
   const toMoney=value=>value!=null&&value!==''&&Number.isFinite(Number(value))?Number(value).toFixed(2)+' €':missingVerified;
   const report=el('dl','identity-fields');
   const labels=({sk:['Mesačný nájom','Depozit','Administratívny poplatok','Kód izby','Zobraziť kód','Skryť kód','Doplniť v Excel evidencii'],
     en:['Monthly rent','Deposit','Administration fee','Room code','Show code','Hide code','Edit in room register'],
     ru:['Аренда за месяц','Депозит','Административный сбор','Код комнаты','Показать код','Скрыть код','Дополнить в реестре'],
     uk:['Місячна оренда','Депозит','Адміністративний збір','Код кімнати','Показати код','Приховати код','Доповнити в реєстрі']})[ctx.lang];
   report.append(
    field(verifiedWords.roomType,excelRoomType||assignedRoom?.category||'—'),
    field(labels[0],toMoney(rentRecord?.rent??excel?.monthly)),
    field(labels[1],toMoney(record?.deposit_eur??excel?.deposit)),
    field(labels[2],toMoney(record?.administration_fee_eur??excel?.administrationFee))
   );
   if(excel?.paymentStatus){
    const paymentLabel=({sk:'Úhrada podľa Excelu',en:'Payment in Excel',ru:'Оплата по Excel',uk:'Оплата за Excel'})[ctx.lang];
    report.append(field(paymentLabel,excel.paymentStatus));
   }
   staffFacts.append(report);
   if(typeof ctx.openRooms==='function')staffFacts.append(button(labels[6],()=>ctx.openRooms(person.verified_room_number,person.accommodation_from)));
  }catch{if(ctx.isCurrent())staffFacts.append(el('p','danger',w.fileFailed));}
  const arrivalWords=({sk:['Skutočný príchod','Zatiaľ nepotvrdený','Uložiť skutočný príchod','✓ Skutočný príchod uložený','Dátum sa nepodarilo načítať alebo uložiť.'],en:['Actual arrival','Not yet confirmed','Save actual arrival','✓ Actual arrival saved','Unable to load or save date.'],ru:['Фактический заезд','Не подтверждён','Сохранить дату заезда','✓ Дата заезда сохранена','Не удалось загрузить или сохранить дату.'],uk:['Фактичне прибуття','Не підтверджено','Зберегти дату прибуття','✓ Дату прибуття збережено','Не вдалося завантажити або зберегти дату.']})[ctx.lang];
  const arrivalForm=el('form','staff-form'),arrivalInput=el('input'),arrivalNotice=el('p','mini-note'),arrivalSave=el('button','',arrivalWords[2]);
  arrivalInput.type='date';arrivalInput.max=new Date().toLocaleDateString('sv-SE',{timeZone:'Europe/Bratislava'});arrivalInput.disabled=true;arrivalSave.type='submit';arrivalSave.disabled=true;arrivalNotice.setAttribute('role','status');
  const al=el('label','',arrivalWords[0]);al.append(arrivalInput);arrivalForm.append(al,arrivalNotice,arrivalSave);results.append(arrivalForm);
  try{
   const {data,error}=await ctx.db.from('resident_staff_details').select('actual_arrival_on').eq('tenant_id',ctx.tenant).eq('resident_id',person.id).maybeSingle();
   if(error)throw error;
   if(!ctx.isCurrent()||!arrivalForm.isConnected)return;
   arrivalInput.value=data?.actual_arrival_on||(await excelDetails)?.actualArrival||'';arrivalNotice.textContent=arrivalInput.value?ctx.day(arrivalInput.value):arrivalWords[1];arrivalInput.disabled=false;arrivalSave.disabled=false;
  }catch{arrivalNotice.textContent=arrivalWords[4];}
  arrivalForm.addEventListener('submit',async e=>{
   e.preventDefault();if(!ctx.isCurrent()||arrivalSave.disabled||!arrivalForm.reportValidity())return;
   arrivalSave.disabled=true;
   try{
    const {data,error}=await ctx.db.from('resident_staff_details').upsert({tenant_id:ctx.tenant,resident_id:person.id,actual_arrival_on:arrivalInput.value||null},{onConflict:'tenant_id,resident_id'}).select('actual_arrival_on').single();
    if(error)throw error;
    arrivalInput.value=data.actual_arrival_on||'';arrivalNotice.textContent=arrivalWords[3]+(arrivalInput.value?' · '+ctx.day(arrivalInput.value):' · '+arrivalWords[1]);arrivalNotice.classList.add('staff-approval-success');
   }catch{arrivalNotice.textContent=arrivalWords[4];arrivalNotice.classList.remove('staff-approval-success');}finally{arrivalSave.disabled=false;}
  });
  const enquiryTitle=({sk:'Osobný dotazník študenta',en:'Student personal questionnaire',ru:'Анкета студента',uk:'Анкета студента'})[ctx.lang]||'Osobný dotazník študenta';
  const enquiryBox=el('section','data-card');
  enquiryBox.append(el('h4','section-subtitle',enquiryTitle));
  results.append(enquiryBox);
  if(questionnaireMode)enquiryBox.scrollIntoView?.({block:'start',behavior:'auto'});
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
      [translated?'Sex / gender':'Pohlavie',enquiry.gender==='male'?(translated?'Male':'Muž'):enquiry.gender==='female'?(translated?'Female':'Žena'):enquiry.gender],
       [translated?'Own refrigerator':'Vlastná chladnička',enquiry.own_refrigerator===true?(translated?'Yes':'Áno'):enquiry.own_refrigerator===false?(translated?'No':'Nie'):'—'],
      [translated?'ID card / passport':'Číslo dokladu',enquiry.identity_document_number],
      [translated?'Telephone':'Telefón',enquiry.telephone],
      [translated?'Parent contact email':'E-mail rodiča',enquiry.parent_contact_email],
      [translated?'School':'Škola',enquiry.school],
      ['IBAN',enquiry.iban]
    ];
    const dataList=el('dl','identity-fields');
    for(const [name,value] of values)dataList.append(field(name,value||'—'));
    const reviewHint=el('p','mini-note',({sk:'Údaje od študenta čakajú na kontrolu recepcie.',en:'Student-submitted information awaits reception review.',ru:'Данные студента ожидают проверки на ресепшене.',uk:'Дані студента очікують перевірки на рецепції.'})[ctx.lang]);
    const sourceNotice=el('p','small',({
     sk:'Dátumy ubytovania, dĺžka pobytu a pridelená izba sú automaticky prevzaté zo schválenej evidencie vyššie; študent ich v dotazníku nevypĺňa.',
     en:'Stay dates, duration and assigned room come from the verified accommodation record above; students do not enter them twice.',
     ru:'Даты проживания, срок и назначенная комната берутся из подтверждённой записи выше; студент не заполняет их повторно.',
     uk:'Дати проживання, тривалість і призначена кімната беруться з підтвердженого запису вище; студент не заповнює їх повторно.'
    })[ctx.lang]);
    enquiryBox.append(dataList,sourceNotice,reviewHint);

    const {data:review,error:reviewError}=await ctx.db.from('resident_enquiry_reviews')
      .select('review_status,correction_reason,requested_at')
      .eq('tenant_id',ctx.tenant).eq('resident_id',person.id).maybeSingle();
    if(!ctx.isCurrent()||!enquiryBox.isConnected)return;
    const labels=ctx.lang==='en'?{
      returned:'Questionnaire returned for correction',resubmitted:'Student resubmitted corrected questionnaire – awaiting review',
      approved:'Questionnaire verified by reception',request:'Send questionnaire back for correction',
      confirm:'Confirm the completed questionnaire',reason:'Describe exactly what needs to be corrected',
      send:'Save correction request',minimum:'Write at least 10 characters explaining the correction.',
      success:'The correction request was saved. The notification is queued for automatic delivery.',
      accepted:'Questionnaire verified and approved.',fail:'The request could not be saved.',
      gmail:'Open Gmail to notify student',mailSubject:'Student House Bratislava – correct your questionnaire',
      mailBody:'Hello,\n\nReception reviewed your Student House Bratislava questionnaire and asks you to correct:\n\n',
      mailEnd:'\n\nSign in and open Personal Questionnaire to make the changes:\nhttps://www.webu.sk/student-house-portal/student/?tab=enquiry\n\nRegards,\nStudent House Bratislava Reception'
     }:{
      returned:'Dotazník vrátený na opravu',resubmitted:'Študent opravil dotazník – čaká na opätovnú kontrolu',
      approved:'Dotazník overený recepciou',request:'Poslať späť zle vyplnený dotazník',
      confirm:'Schváliť správne vyplnený dotazník',reason:'Presne napíš, čo má študent opraviť',
      send:'Uložiť žiadosť o opravu',minimum:'Uveď dôvod opravy (aspoň 10 znakov).',
      success:'Požiadavka na opravu je uložená. Upozornenie je pripravené na automatické odoslanie.',
      accepted:'Dotazník bol schválený.',fail:'Nepodarilo sa uložiť požiadavku.',
      gmail:'Otvoriť Gmail a upozorniť študenta',mailSubject:'Student House Bratislava – oprava dotazníka',
      mailBody:'Ahoj,\n\npri kontrole tvojho osobného dotazníka Student House Bratislava sme zistili údaje, ktoré je potrebné opraviť:\n\n',
      mailEnd:'\n\nPrihlás sa do študentskej zóny a otvor Osobný dotazník:\nhttps://www.webu.sk/student-house-portal/student/?tab=enquiry\n\nPo opätovnom odoslaní dotazník skontrolujeme.\n\nRecepcia Student House Bratislava'
     };
    if(reviewError){enquiryBox.append(el('p','danger',labels.fail));}
    else{
      const actions=el('div','staff-actions'),documentFlow=el('section','data-card');
      enquiryBox.append(actions,documentFlow);
      let documentFlowStarted=false;
      const documentWording=({
       sk:{heading:'Krok 5 – Zmluva a splátkový kalendár',need:'Pred vytvorením dokumentov musí recepcia doplniť číslo zmluvy, depozit, administratívny poplatok a schválené nájomné. Skontroluj Excel evidenciu.',provider:'Ubytovateľ – presný právny názov',conditions:'Schválené platobné podmienky zmluvy',contract:'Vytvoriť pracovnú ubytovaciu zmluvu',contractReady:'✓ Pracovná zmluva je uložená v dokumentoch študenta.',contractFail:'Zmluvu sa nepodarilo pripraviť alebo uložiť.',missingRent:'Splátkový kalendár ešte neobsahuje všetky mesiace alebo overené poplatky. Doplň predpisy v evidencii.',description:'Dokumenty vytvára až recepcia po schválení dotazníka. Pracovná zmluva vyžaduje kontrolu a schválenú právnu predlohu.',rent:'Nájom',deposit:'Depozit',admin:'Administratívny poplatok'},
       en:{heading:'Step 5 – Contract and payment schedule',need:'Reception must first verify contract number, deposit, administration fee and rent. Check the room register.',provider:'Landlord – exact legal name',conditions:'Approved contract payment terms',contract:'Create working accommodation contract',contractReady:'✓ Draft contract saved to the student’s documents.',contractFail:'Could not prepare or save the contract.',missingRent:'The schedule is missing some months or verified fees. Reconcile the register first.',description:'Reception prepares these documents after approving the questionnaire. The draft contract needs approved legal wording.',rent:'Rent',deposit:'Deposit',admin:'Administration fee'},
       ru:{heading:'Шаг 5 – Договор и график платежей',need:'Ресепшен должен проверить номер договора, депозит, административный сбор и аренду.',provider:'Арендодатель – юридическое название',conditions:'Утверждённые условия оплаты',contract:'Создать рабочий проект договора',contractReady:'✓ Проект договора сохранён в документах студента.',contractFail:'Не удалось создать или сохранить договор.',missingRent:'Не хватает начислений или месяцев. Проверьте реестр.',description:'Ресепшен готовит документы после одобрения анкеты. Проект договора требует утверждённого текста.',rent:'Аренда',deposit:'Депозит',admin:'Административный сбор'},
       uk:{heading:'Крок 5 – Договір і графік платежів',need:'Рецепція має перевірити номер договору, депозит, адміністративний збір і оренду.',provider:'Орендодавець – юридична назва',conditions:'Затверджені умови оплати',contract:'Створити робочий проєкт договору',contractReady:'✓ Проєкт договору збережено в документах студента.',contractFail:'Не вдалося підготувати чи зберегти договір.',missingRent:'Бракує нарахувань або місяців. Перевірте реєстр.',description:'Рецепція готує документи після схвалення анкети. Проєкт договору потребує затвердженого тексту.',rent:'Оренда',deposit:'Депозит',admin:'Адміністративний збір'}
      })[ctx.lang];
      async function prepareDocumentFlow(){
       if(documentFlowStarted||!ctx.isCurrent()||!documentFlow.isConnected)return;
       documentFlowStarted=true;
       documentFlow.append(el('h4','section-subtitle',documentWording.heading),el('p','mini-note',documentWording.description));
       try{
        const [staffResult,staysResult,billsResult]=await Promise.all([
         ctx.db.from('resident_staff_details').select('room_code,deposit_eur,administration_fee_eur')
          .eq('tenant_id',ctx.tenant).eq('resident_id',person.id).maybeSingle(),
         ctx.db.from('tenancies').select('rent,starts_on,ends_on')
          .eq('tenant_id',ctx.tenant).eq('resident_id',person.id),
         ctx.db.from('rent_charges').select('id,kind,period,amount,due_on')
          .eq('tenant_id',ctx.tenant).eq('resident_id',person.id)
        ]);
        if(staffResult.error||staysResult.error||billsResult.error)throw Error('unavailable');
        if(!ctx.isCurrent()||!documentFlow.isConnected)return;
        const verified=staffResult.data,stay=(staysResult.data||[]).find(t=>t.starts_on===person.accommodation_from)||(staysResult.data||[])[0];
        if(!verified||verified.deposit_eur==null||verified.administration_fee_eur==null||!stay?.rent||!person.verified_contract_number){
         documentFlow.append(el('p','danger',documentWording.need));return;
        }
        const contract=el('form','staff-form');
        const provider=el('input'),terms=el('textarea');
        provider.required=true;provider.maxLength=1200;provider.placeholder=documentWording.provider;provider.value=providerText(ctx.tenant);provider.readOnly=!!provider.value;
        terms.required=true;terms.maxLength=1500;terms.rows=3;terms.placeholder=documentWording.conditions;if(isStudentHouse(ctx.tenant))terms.value='Úhrady podľa schváleného splátkového kalendára. Podľa predloženej zmluvy: administratívny poplatok, depozit a prvý nájom do troch dní od podpisu; ďalšie nájomné vopred. Variabilný symbol: číslo zmluvy. Do správy pre prijímateľa meno a priezvisko. Skontrolovať zhodu dátumov splatnosti s kalendárom.';
        const providerLabel=el('label','',documentWording.provider),termsLabel=el('label','',documentWording.conditions);
        providerLabel.append(provider);termsLabel.append(terms);
        const original=isStudentHouse(ctx.tenant);const originalLabel=({sk:'Vygenerovať zmluvu s QR kalendárom',en:'Generate contract with QR schedule',ru:'Создать договор с QR-графиком',uk:'Створити договір із QR-графіком'})[ctx.lang];
        const create=el('button','',original?originalLabel:documentWording.contract);create.type='submit';
        const contractStatus=el('p','enquiry-status');contractStatus.setAttribute('role','status');
        if(!original)contract.append(providerLabel,termsLabel);contract.append(create,contractStatus);documentFlow.append(contract);
        contract.addEventListener('submit',async event=>{
         event.preventDefault();if(!ctx.isCurrent()||!contract.reportValidity())return;
         create.disabled=true;contractStatus.textContent='';
         try{
          const {workingDocument,fieldsForDocument,missingDocumentFields,fillOriginalStudentHouseContract}=await import('/student-house-portal/residence-document.js?v=20261127-addendum-required-details');
          const assignedRoom=(await ctx.list('rooms')).find(r=>String(r.name)===String(person.verified_room_number));
          const data=fieldsForDocument('contract_draft',person,enquiry,{...stay,room_type:(await ctx.importedRoomType?.(person.id))||assignedRoom?.category||''},verified,{
           provider:provider.value.trim(),payment_terms:terms.value.trim()
          });
          let file;
          if(isStudentHouse(ctx.tenant)){
           const templates=(await ctx.list('residence_portal_files',{kind:'contract_template',active:true})).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
           if(!templates.length)throw Error('Nahraj originálnu vyplniteľnú zmluvu v Správe dokumentov.');
           const url=await ctx.fileLink(templates[0].id,ctx.tenant,true);
           if(!url)throw Error('Predloha sa nepodarila otvoriť.');
           const response=await fetch(url);if(!response.ok)throw Error('Predloha sa nepodarila načítať.');
           const [plans,items]=await Promise.all([ctx.list('installment_plans',{resident_id:person.id}),ctx.list('installment_items')]);
           file=await fillOriginalStudentHouseContract({attachment:await response.arrayBuffer(),data,charges:(billsResult.data||[]).map(c=>({...c,resident_id:person.id})),plans,items,person});
           if(!ctx.isCurrent())return;
           const previewUrl=URL.createObjectURL(file),preview=el('a','btn-secondary','Zobraziť vyplnenú zmluvu na kontrolu');preview.href=previewUrl;preview.target='_blank';preview.rel='noopener';
           const download=el('a','btn-secondary','Stiahnuť PDF');download.href=previewUrl;download.download=file.name;
           const publish=el('button','','Schváliť a sprístupniť zmluvu študentovi');publish.type='button';
           publish.onclick=async()=>{if(!ctx.isCurrent()||publish.disabled||!confirm('Potvrdzuješ, že zmluva a QR kalendár boli skontrolované?'))return;publish.disabled=true;try{const ok=await ctx.uploadPrivateDocument(person.id,file,publish,'contract_draft');if(!ok)throw Error('upload_failed');publish.textContent='✓ Sprístupnené';publish.classList.add('staff-approval-success');}catch{publish.disabled=false;contractStatus.append(el('p','danger',documentWording.contractFail));}};
           contractStatus.replaceChildren(preview,download,publish);return;
          }
          if(missingDocumentFields('contract_draft',data).length)throw Error('missing_contract_data');
          file=await workingDocument({kind:'contract_draft',title:'Ubytovacia zmluva',slug:'ubytovacia-zmluva',data});
          const ok=await ctx.uploadPrivateDocument(person.id,file,create,'contract_draft');
          if(!ok)throw Error('upload_failed');
          contractStatus.classList.add('staff-approval-success');
          contractStatus.textContent=documentWording.contractReady;
         }catch(error){contractStatus.textContent=documentWording.contractFail+(error?.message==='missing_contract_data'?' – skontroluj povinné údaje dotazníka.':isStudentHouse(ctx.tenant)?' – '+(error?.message||''):'');}
         finally{create.disabled=false;}
        });
        const periods=stayPeriods(person.accommodation_from,person.accommodation_to);
        const charges=billsResult.data||[];
        const rentPeriods=new Set(charges.filter(x=>x.kind==='rent').map(x=>x.period));
        const fullRent=periods.length>0&&periods.every(p=>rentPeriods.has(p));
        const depositPresent=Number(verified.deposit_eur)===0||charges.some(x=>x.kind==='deposit'&&x.period===periods[0]&&Number(x.amount)===Number(verified.deposit_eur));
        const adminPresent=Number(verified.administration_fee_eur)===0||charges.some(x=>x.kind==='administration_fee'&&x.period===periods[0]&&Number(x.amount)===Number(verified.administration_fee_eur));
        if(!fullRent||!depositPresent||!adminPresent){
         documentFlow.append(el('p','danger',documentWording.missingRent));return;
        }
        if(isStudentHouse(ctx.tenant)&&ctx.openInstallments&&ctx.isCurrent()&&documentFlow.isConnected){
         const scheduleButton=el('button','btn-secondary',({sk:'Vygenerovať splátkový kalendár s QR kódmi',en:'Generate payment schedule with QR codes',ru:'Создать график платежей с QR-кодами',uk:'Створити графік платежів із QR-кодами'})[ctx.lang]||'Vygenerovať splátkový kalendár s QR kódmi');
         scheduleButton.type='button';scheduleButton.onclick=()=>ctx.openInstallments(person.id);documentFlow.append(scheduleButton);
         if(original&&contract.isConnected)contract.requestSubmit();
         return;
        }
        if(original&&ctx.isCurrent()&&contract.isConnected){contract.requestSubmit();return;}
        const descriptions={rent:documentWording.rent,deposit:documentWording.deposit,administration_fee:documentWording.admin};
        const items=charges.filter(x=>periods.includes(x.period)&&['rent','deposit','administration_fee'].includes(x.kind))
         .sort((a,b)=>String(a.due_on).localeCompare(String(b.due_on))||String(a.period).localeCompare(String(b.period))||
          ['rent','deposit','administration_fee'].indexOf(a.kind)-['rent','deposit','administration_fee'].indexOf(b.kind))
         .map(x=>({due_on:x.due_on,amount:Number(x.amount),description:descriptions[x.kind]+(x.kind==='rent'?' '+x.period:'')}));
        const {attachInstallmentDocument}=await import('/student-house-portal/installment-document.js?v=20261127-addendum-required-details');
        if(!ctx.isCurrent()||!documentFlow.isConnected)return;
        const symbol=normalizeContractSymbol(person.verified_contract_number)||(!isStudentHouse(ctx.tenant)?normalizeContractSymbol(verified.room_code):'');
        attachInstallmentDocument(documentFlow,{title:'Splátkový kalendár – Student House Bratislava'},person,items,{
         open:false,accountScope:ctx.tenant+':'+ctx.userId,contractNumber:symbol,
         saveToProfile:(id,file,button)=>ctx.uploadPrivateDocument(id,file,button,'schedule_draft')
        });
       }catch{if(ctx.isCurrent())documentFlow.append(el('p','danger',w.fileFailed));}
      }
      const showReview=(label,explanation='')=>{
       reviewHint.hidden=true;
       actions.replaceChildren(receipt(label));
       if(explanation)actions.append(el('p','mini-note',explanation));
       if(label===questionnaireApproved)void prepareDocumentFlow();
       else documentFlow.replaceChildren();
      };
      const submittedAt=Date.parse(String(enquiry.student_submitted_at||''));
      const corrected=submittedAt>Date.parse(String(review?.requested_at||''));
      if(review&&!corrected){
       showReview(review.review_status==='approved'?questionnaireApproved:questionnaireReturned,review.correction_reason);
      }else{
      if(corrected)actions.append(el('p','mini-note',labels.resubmitted));
      const errorMessage=inlineError();
      const fail=message=>{errorMessage.textContent=message;};
      const revise=el('form','staff-form');
      const reason=el('textarea');reason.maxLength=1200;reason.minLength=10;reason.required=true;reason.rows=3;
      reason.placeholder=labels.reason;reason.setAttribute('aria-label',labels.reason);
      reason.value=review?.review_status==='needs_correction'?review.correction_reason||'':'';
      const send=el('button','',labels.send);send.type='submit';
      const reopen=button(labels.request,()=>{revise.hidden=!revise.hidden;if(!revise.hidden)reason.focus();});
      revise.hidden=true;revise.append(reason,send);actions.append(reopen,revise);
      revise.addEventListener('submit',async event=>{
       event.preventDefault();if(!ctx.isCurrent()||pendingAction)return;
       const text=reason.value.trim();if(text.length<10){fail(labels.minimum);return;}
       pendingAction=true;fail('');const restore=busyButton(send,[send,reopen,approve]);
       try{
        const {data,error}=await ctx.db.from('resident_enquiry_reviews').upsert({
         tenant_id:ctx.tenant,resident_id:person.id,review_status:'needs_correction',
         correction_reason:text,requested_at:new Date().toISOString(),reviewed_by:ctx.userId
        },{onConflict:'tenant_id,resident_id'}).select('review_status').single();
        if(error||!data){fail(saveError);return;}
        if(ctx.isCurrent())showReview(questionnaireReturned,text);

       }catch{fail(saveError);}finally{pendingAction=false;restore();}
      });
      const approve=button(labels.confirm,async()=>{
       if(!ctx.isCurrent()||pendingAction)return;
       pendingAction=true;fail('');const restore=busyButton(approve,[send,reopen,approve]);
       try{
        // Do not accept an empty draft or an unsigned, photo-less questionnaire.
        // Recheck live state; the student's answer may have changed since render.
        const [submission,portrait,latestReview]=await Promise.all([
         ctx.db.from('resident_enquiries').select('student_submitted_at,gender,own_refrigerator,permanent_address,date_of_birth,nationality,identity_document_number,telephone,school')
          .eq('tenant_id',ctx.tenant).eq('resident_id',person.id).maybeSingle(),
         ctx.db.from('residence_portal_files').select('id')
          .eq('tenant_id',ctx.tenant).eq('resident_id',person.id)
          .eq('user_id',person.user_id).eq('kind','profile_photo').eq('active',true).limit(1),
         ctx.db.from('resident_enquiry_reviews').select('review_status,requested_at')
          .eq('tenant_id',ctx.tenant).eq('resident_id',person.id).maybeSingle()
        ]);
        if(submission.error||portrait.error||latestReview.error){fail(saveError);return;}
        const answers=submission.data;
         const required=['gender','permanent_address','date_of_birth','nationality','identity_document_number','telephone','school'];
         const missing=required.filter(k=>!answers?.[k]);
         if(typeof answers?.own_refrigerator!=='boolean')missing.push('own_refrigerator');
         if(missing.length){
          fail(({sk:'Študent musí doplniť povinné údaje v dotazníku.',en:'The student must complete the required questionnaire fields.',ru:'Студент должен заполнить обязательные поля анкеты.',uk:'Студент має заповнити обов’язкові поля анкети.'})[ctx.lang]);return;
         }
         if(!answers?.student_submitted_at||!portrait.data?.length){
         fail(({
          sk:'Schválenie nie je možné: študent musí najprv odoslať vyplnený dotazník aj fotografiu.',
          en:'Cannot approve: the student must submit the questionnaire and a photo first.',
          ru:'Нельзя одобрить: студент должен отправить заполненную анкету и фотографию.',
          uk:'Неможливо схвалити: студент має надіслати заповнену анкету та фотографію.'
         })[ctx.lang]||saveError);return;
        }
        if(latestReview.data?.review_status==='approved'&&
           Date.parse(latestReview.data.requested_at)>=Date.parse(submission.data.student_submitted_at)){
         if(ctx.isCurrent())showReview(questionnaireApproved);return;
        }
        const {data,error}=await ctx.db.from('resident_enquiry_reviews').upsert({
          tenant_id:ctx.tenant,resident_id:person.id,review_status:'approved',
          correction_reason:'',requested_at:new Date().toISOString(),reviewed_by:ctx.userId
        },{onConflict:'tenant_id,resident_id'}).select('review_status').single();
        if(error||!data){fail(saveError);return;}
        if(ctx.isCurrent())showReview(questionnaireApproved);
       }catch{fail(saveError);}finally{pendingAction=false;restore();}
      });
      actions.append(approve,errorMessage);
      }
    }

   }
  }catch(error){if(ctx.isCurrent())enquiryBox.append(el('p','danger',w.failed));}
  results.append(el('h4','section-subtitle',w.files));
  const filesRoot=el('div','data-list', '…');results.append(filesRoot);
  try{
   const [assigned,legacy,rules,gdpr]=await Promise.all([
    ctx.list('residence_portal_files',{resident_id:person.id,active:true}),
    person.user_id?ctx.list('residence_portal_files',{user_id:person.user_id,active:true}):Promise.resolve([]),
    ctx.list('residence_portal_files',{kind:'rules_template',active:true}),
    ctx.list('residence_portal_files',{kind:'gdpr_template',active:true})
   ]);
   if(!ctx.isCurrent()||!filesRoot.isConnected)return;
   const files=residentFiles([...new Map([...assigned,...legacy].map(f=>[f.id,f])).values()],person)
    .sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
   filesRoot.replaceChildren();
   const groups=[
    ['Ubytovacia zmluva',f=>f.kind==='contract_draft'],
    ['Splátkový kalendár',f=>f.kind==='schedule_draft'||(f.kind==='resident_document'&&f.original_name==='splatkovy-kalendar.pdf')],
    ['Potvrdenie o ubytovaní',f=>f.kind==='certificate_draft'],
    ['Žiadosť o vrátenie depozitu',f=>f.kind==='resident_document'&&f.original_name==='ziadost-o-vratenie-depozitu.pdf']
   ];
   for(const [title,matches] of groups){
    const selected=files.filter(matches);
    if(selected.length)for(const file of selected)filesRoot.append(documentCard(file,title));
    else filesRoot.append(el('p','mini-note',title+': '+w.missing));
   }
   for(const [title,templates] of [['Ubytovací poriadok',rules],['GDPR',gdpr]]){
    const latest=templates.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0];
    filesRoot.append(latest?documentCard(latest,title):el('p','mini-note',title+': '+w.missing));
   }
   if(typeof ctx.uploadPrivateDocument==='function'){
    const form=el('form','staff-form'),kind=el('select'),input=el('input'),submit=el('button','','Pridať do dokumentov študenta');
    kind.setAttribute('aria-label','Typ dokumentu');input.type='file';input.required=true;input.accept='application/pdf';input.setAttribute('aria-label','PDF dokument');submit.type='submit';
    for(const [value,title] of [['contract_draft','Ubytovacia zmluva'],['schedule_draft','Splátkový kalendár'],['certificate_draft','Potvrdenie o ubytovaní'],['refund','Žiadosť o vrátenie depozitu']]){
     const option=el('option','',title);option.value=value;kind.append(option);
    }
    form.append(kind,input,submit);filesRoot.append(form);
    form.addEventListener('submit',async event=>{
     event.preventDefault();const original=input.files?.[0];if(!original||!ctx.isCurrent())return;
     const refund=kind.value==='refund';
     const file=refund?new File([original],'ziadost-o-vratenie-depozitu.pdf',{type:original.type}):original;
     if(await ctx.uploadPrivateDocument(person.id,file,submit,refund?'resident_document':kind.value)){
      const result=el('p','mini-note','✓ Dokument je pridaný do profilu študenta.');form.after(result);input.value='';
     }
    });
   }
   for(const [kind,title] of [['profile_photo',w.photo],['signed_contract',ctx.lang==='en'?'Signed contract':'Podpísaná zmluva'],['signed_rules',w.rules],['signed_gdpr',w.gdpr],['signed_schedule',ctx.lang==='en'?'Signed payment schedule':'Podpísaný splátkový kalendár'],['signed_certificate',ctx.lang==='en'?'Signed accommodation certificate':'Podpísané potvrdenie o ubytovaní'],['signed_deposit',ctx.lang==='en'?'Completed deposit refund request':'Vyplnená žiadosť o vrátenie depozitu']]){
    const items=files.filter(f=>f.kind===kind);if(!items.length){filesRoot.append(el('p','mini-note',title+': '+w.missing));continue;}
    for(const file of items)filesRoot.append(documentCard(file,title));
   }
   for(const file of files.filter(f=>f.kind==='resident_document'&&!groups.some(([,matches])=>matches(f))))filesRoot.append(documentCard(file,f.kind==='contract_draft'?(ctx.lang==='en'?'Resident contract':'Ubytovacia zmluva'):w.private));
  }catch{if(ctx.isCurrent())filesRoot.replaceChildren(el('p','danger',w.fileFailed));}
 }
 function documentCard(file,title){
  const card=el('article','data-card');card.append(el('strong','',title),el('p','small',file.original_name+' · '+ctx.day(file.created_at)));
  const reviewable=['signed_contract','signed_rules','signed_gdpr','signed_schedule','signed_certificate','signed_deposit'].includes(file.kind);
  if(reviewable&&file.review_status==='pending')card.append(el('span','status-pill',w.pending));
  card.append(button(w.view,()=>{if(ctx.isCurrent())void ctx.fileLink(file.id,ctx.tenant);}));
  if(reviewable&&file.review_status==='approved')card.append(receipt(file.kind==='signed_schedule'?scheduleApproved:documentApproved));
  if(reviewable&&file.review_status==='rejected')card.append(receipt(documentReturned),el('p','mini-note',file.staff_note||''));
  if(reviewable&&file.review_status==='pending'){
   const input=el('input');input.type='text';input.maxLength=1000;input.value=file.staff_note||'';input.setAttribute('aria-label',w.note);input.placeholder=w.note;
   const actions=el('div','staff-actions');
   const errorMessage=inlineError();
   const review=async (result,trigger)=>{
    if(!ctx.isCurrent()||pendingAction)return;
    input.setCustomValidity(result==='rejected'&&input.value.trim().length<3?({sk:'Uveď dôvod vrátenia na opravu (aspoň 3 znaky).',en:'Enter a correction reason (at least 3 characters).',ru:'Укажите причину возврата (не менее 3 символов).',uk:'Вкажіть причину повернення (не менше 3 символів).'})[ctx.lang]:'');
    if(!input.reportValidity()||!confirm(w.reviewConfirm))return;pendingAction=true;
    errorMessage.textContent='';
    const restore=busyButton(trigger,[approve,sendBack]);
    try{
     const {data,error}=await ctx.db.functions.invoke('residence-files',{body:{action:'review',tenant_id:ctx.tenant,file_id:file.id,status:result,staff_note:input.value,expected_status:file.review_status}});
     if(!ctx.isCurrent())return;if(error||!data?.ok){errorMessage.textContent=saveError;return;}
     file.review_status=result;file.staff_note=input.value;card.replaceWith(documentCard(file,title));status(ctx.success);
    }catch{if(ctx.isCurrent())errorMessage.textContent=saveError;}finally{pendingAction=false;restore();}
   };
   const approve=button(w.review,()=>{void review('approved',approve);},'');
   const sendBack=button(w.return,()=>{void review('rejected',sendBack);});
   actions.append(input,approve,sendBack,errorMessage);card.append(actions);
  }
  return card;
 }
 search.addEventListener('input',paint);select.addEventListener('change',paint);paint();
}
