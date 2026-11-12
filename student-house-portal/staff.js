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
 if (!allowed) {ctx.root.replaceChildren(el('p','danger',w.noAccess));return;}
 const refresh = button(w.refresh, () => ctx.refresh());
 ctx.root.append(refresh, ctx.notice);
 const filters = el('div','staff-filters');
 const search = el('input'); search.type='search';search.placeholder=w.search;search.setAttribute('aria-label',w.search);
 const select = el('select');select.setAttribute('aria-label',ctx.section==='residents'?w.state:'Stav registrácie');
 const options=ctx.section==='residents'?[['all',w.all],['active',w.active],['inactive',w.inactive]]:[['pending',w.pending],['invited',w.invited],['rejected',w.rejected],['all',w.allRegistrations]];
 for(const [value,label] of options){const o=el('option','',label);o.value=value;select.append(o);}
 const count=el('p','muted');count.setAttribute('aria-live','polite');
 filters.append(search,select);ctx.root.append(filters,count,el('p','small',w.limit));
 const results=el('div','staff-directory');ctx.root.append(results);
 const records=await ctx.list(ctx.section==='residents'?'residents':'registration_requests');
 if(!ctx.isCurrent())return;
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
    if(person.status==='pending'){
     const actions=el('div','staff-actions');
     const approve=button(w.approve,()=>{void decide(person,true,actions);},'');
     const reject=button(w.reject,()=>{void decide(person,false,actions);});actions.append(approve,reject);card.append(actions);
    }
   }
   results.append(card);
  }
 };
 async function decide(person,approve,actions){
  if(pendingAction||!ctx.isCurrent()||!confirm(approve?w.approveConfirm:w.rejectConfirm))return;
  pendingAction=true;for(const b of actions.querySelectorAll('button'))b.disabled=true;search.disabled=true;select.disabled=true;
  let success=false;
  try{
   let response;
   if(approve)response=await ctx.db.functions.invoke('manage',{body:{action:'invite',tenant_id:ctx.tenant,registration_id:person.id,role:'student',email:person.email,name:[person.first_name,person.last_name].join(' '),room_number:person.room_number}});
   else response=await ctx.db.from('registration_requests').update({status:'rejected'}).eq('tenant_id',ctx.tenant).eq('id',person.id).eq('status','pending').select('id');
   if(!ctx.isCurrent())return;
   if(response.error||(approve?!response.data?.ok:!response.data?.length)){
    const code=await failureCode(response.error,response.data);
    status(['over_email_send_rate_limit','over_request_rate_limit'].includes(code)?w.rate:['invitation_failed','password_email_failed'].includes(code)?w.emailFailed:['membership_exists','registration_not_pending'].includes(code)?w.conflict:w.failed,true);
    return;
   }
   person.status=approve?'invited':'rejected';success=true;status(approve?w.inviteOK:w.rejected);
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
  });results.append(form,el('h4','section-subtitle',w.files));
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
