// Student House Bratislava - authenticated questionnaire.
// Sensitive personal data stays in tenant-scoped RLS rows; photographs are stored
// in the existing private residence-portal-files bucket through residence-files.
const words={
 sk:{title:'Osobný dotazník študenta',intro:'Vyplň svoje údaje online a pripoj fotografiu. Údaje uvidíš len ty a oprávnená recepcia. Osobný dotazník nenahrádza overenú ubytovaciu zmluvu.',identity:'Overené údaje zo zmluvy',address:'Trvalá adresa (ulica, PSČ, mesto, krajina)',birth:'Dátum narodenia',nationality:'Národnosť',gender:'Pohlavie',id:'Číslo občianskeho preukazu / pasu',telephone:'Telefón',parent:'Kontaktný e-mail rodiča (ak je potrebný)',school:'Škola v Bratislave',iban:'IBAN (nepovinné)',room:'Preferovaný typ izby',duration:'Preferovaná dĺžka ubytovania',from:'Preferovaný príchod',to:'Preferovaný odchod',photo:'Fotografia študenta',selectPhoto:'Vložiť fotografiu online (JPG alebo PNG, max. 3 MB)',photoHint:'Fotografia sa uloží iba do súkromnej študentskej zóny. Recepcia ju môže zobraziť pri overovaní.',save:'Uložiť dotazník a fotografiu',saving:'Ukladám údaje…',saved:'Dotazník a fotografia sú uložené.',savedWithoutPhoto:'Dotazník je uložený.',photoFailed:'Dotazník sa uložil, ale fotografiu sa nepodarilo nahrať. Skús fotografiu nahrať znova.',failed:'Dotazník sa nepodarilo uložiť. Skontroluj prihlásenie alebo internetové pripojenie.',invalidPhoto:'Fotografia musí byť JPG alebo PNG a mať maximálne 3 MB.',notFound:'Nemáš schválený študentský účet. Dotazník vyplníš po schválení registrácie.',privacy:'Ochrana osobných údajov a GDPR',download:'Stiahnuť prázdny dotazník (PDF)',none:'Nevybrané',male:'Muž',female:'Žena',other:'Iné / nechcem uviesť',five:'5 mesiacov',ten:'10 mesiacov',twelve:'12 mesiacov',current:'Aktuálne uložená fotografia'},
 en:{title:'Student personal questionnaire',intro:'Complete your information online and add your photo. Only you and authorised reception staff can view it. This questionnaire does not replace the verified accommodation contract.',identity:'Verified contract details',address:'Permanent address (street, postcode, city, country)',birth:'Date of birth',nationality:'Nationality',gender:'Sex / gender',id:'ID card or passport number',telephone:'Telephone',parent:'Parent contact email (if applicable)',school:'School in Bratislava',iban:'IBAN (optional)',room:'Preferred room type',duration:'Preferred stay duration',from:'Preferred arrival',to:'Preferred departure',photo:'Student photograph',selectPhoto:'Insert photo online (JPG or PNG, max 3 MB)',photoHint:'Your photo is uploaded to private residence storage and may be seen by authorised reception staff.',save:'Save questionnaire and photo',saving:'Saving…',saved:'Questionnaire and photo saved.',savedWithoutPhoto:'Questionnaire saved.',photoFailed:'Questionnaire saved, but photo upload failed. Please try again.',failed:'Questionnaire could not be saved. Check your login or connection.',invalidPhoto:'Choose a JPG or PNG photograph under 3 MB.',notFound:'Your resident account is not approved yet. Complete the questionnaire after approval.',privacy:'Privacy information (GDPR)',download:'Download blank questionnaire (PDF)',none:'Not selected',male:'Male',female:'Female',other:'Other / prefer not to say',five:'5 months',ten:'10 months',twelve:'12 months',current:'Currently saved photo'},
 ru:{title:'Анкета студента',intro:'Заполните анкету онлайн и добавьте фото. Доступ есть только у вас и уполномоченных сотрудников.',identity:'Проверенные данные',address:'Постоянный адрес',birth:'Дата рождения',nationality:'Гражданство',gender:'Пол',id:'Номер паспорта / удостоверения',telephone:'Телефон',parent:'Электронная почта родителя',school:'Учебное заведение в Братиславе',iban:'IBAN (необязательно)',room:'Предпочтительный тип комнаты',duration:'Срок проживания',from:'Дата заезда',to:'Дата выезда',photo:'Фотография студента',selectPhoto:'Загрузить фото онлайн (JPG/PNG до 3 МБ)',photoHint:'Фото хранится приватно и доступно только уполномоченным сотрудникам.',save:'Сохранить анкету и фото',saving:'Сохраняем…',saved:'Анкета и фото сохранены.',savedWithoutPhoto:'Анкета сохранена.',photoFailed:'Анкета сохранена, но загрузка фото не удалась.',failed:'Не удалось сохранить анкету.',invalidPhoto:'Только JPG/PNG, не больше 3 МБ.',notFound:'Заполнить можно после подтверждения регистрации.',privacy:'Конфиденциальность (GDPR)',download:'Скачать пустую анкету (PDF)',none:'Не выбрано',male:'Мужчина',female:'Женщина',other:'Другое',five:'5 месяцев',ten:'10 месяцев',twelve:'12 месяцев',current:'Текущее фото'},
 uk:{title:'Анкета студента',intro:'Заповніть анкету онлайн та додайте фото. Доступ є лише у вас і уповноважених працівників.',identity:'Перевірені дані',address:'Постійна адреса',birth:'Дата народження',nationality:'Громадянство',gender:'Стать',id:'Номер паспорта / посвідчення',telephone:'Телефон',parent:'Електронна адреса одного з батьків',school:'Навчальний заклад у Братиславі',iban:'IBAN (необов’язково)',room:'Бажаний тип кімнати',duration:'Тривалість проживання',from:'Дата заїзду',to:'Дата виїзду',photo:'Фотографія студента',selectPhoto:'Завантажити фото онлайн (JPG/PNG до 3 МБ)',photoHint:'Фото зберігається приватно та доступне лише уповноваженим працівникам.',save:'Зберегти анкету й фото',saving:'Зберігаємо…',saved:'Анкету й фото збережено.',savedWithoutPhoto:'Анкету збережено.',photoFailed:'Анкета збережена, але фото не вдалося завантажити.',failed:'Не вдалося зберегти анкету.',invalidPhoto:'Тільки JPG/PNG до 3 МБ.',notFound:'Заповніть після підтвердження реєстрації.',privacy:'Конфіденційність (GDPR)',download:'Завантажити порожню анкету (PDF)',none:'Не обрано',male:'Чоловік',female:'Жінка',other:'Інше',five:'5 місяців',ten:'10 місяців',twelve:'12 місяців',current:'Наявне фото'}
};
// Public room categories are displayed as on the Student House gallery.
// Stored legacy Excel codes remain unchanged for reception and room allocation.
const rooms=[
 ['M2','Manzard 2'],
 ['Š1+1','Standard 1+1'],
 ['SUI 2','Suite 2'],
 ['D2','De Luxe 2'],
 ['Š2','Standard 2'],
 ['D2V','De Luxe 2V']
];
const n=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!=null)el.textContent=String(txt);return el};
const wrap=(title,control)=>{const label=n('label','enquiry-label');label.append(n('span','',title),control);return label};
function choices(items,value){const el=n('select');for(const [v,label]of items){const opt=n('option','',label);opt.value=v;el.append(opt)}el.value=value||'';return el}
function validatePhoto(file){return !file||(file.size>0&&file.size<=3000000&&['image/png','image/jpeg'].includes(file.type))}
const formatDate=(s)=>{if(!s)return '';const a=String(s).slice(0,10).split('-');return a.length===3?a.reverse().join('. '):String(s)};
export async function renderStudentEnquiry(ctx){
 const t=words[ctx.lang]||words.sk;
 const root=n('section','enquiry-area'),form=n('form','enquiry-form');
 ctx.root.append(root);root.append(n('h3','',t.title),n('p','muted',
  (ctx.lang==='en'?'Step 2 of 3: ':ctx.lang==='sk'?'Krok 2 z 3: ':'')+t.intro));
 root.append(n('p','enquiry-status',ctx.lang==='en'?
  'Step 2 of 3: Reception approved your registration. Complete and submit the questionnaire and photo. After reception reviews and approves it, an email will invite you to choose your student-profile password.':
  'Krok 2 z 3: Recepcia schválila registráciu. Vyplň a odošli dotazník s fotografiou. Po kontrole a schválení recepciou dostaneš e-mail na vytvorenie hesla do študentského profilu.'));
 if(!ctx.resident?.id){root.append(n('p','danger',t.notFound));return;}
 const {data:existing,error:readError}=await ctx.db.from('resident_enquiries').select('*')
   .eq('tenant_id',ctx.tenant).eq('resident_id',ctx.resident.id).maybeSingle();
 if(!ctx.isCurrent()||!root.isConnected)return;
 if(readError){root.append(n('p','danger',t.failed));return;}

 const {data:review,error:reviewError}=await ctx.db.from('resident_enquiry_reviews')
   .select('review_status,correction_reason,requested_at').eq('tenant_id',ctx.tenant)
   .eq('resident_id',ctx.resident.id).maybeSingle();
 if(!ctx.isCurrent()||!root.isConnected)return;
 if(reviewError){root.append(n('p','danger',t.failed));return;}
 if(review?.review_status==='needs_correction'){
  const changed=!!existing&&Date.parse(String(existing.updated_at||existing.created_at||''))>Date.parse(String(review.requested_at||''));
  const warning=n('section','enquiry-identity');
  warning.append(n('strong','',changed
   ?(ctx.lang==='en'?'Corrections submitted; reception has not verified them yet.':'Opravený dotazník bol opätovne odoslaný. Čaká na kontrolu recepcie.')
   :(ctx.lang==='en'?'Questionnaire returned for correction':'Dotazník vrátený recepciou na opravu')));
  warning.append(n('p','',String(review.correction_reason||'')));
  root.append(warning);
 }

 const privacy=n('a','policy-link',t.privacy);
 privacy.href=(ctx.lang==='en'?'https://studenthousebratislavanew.wordpress.com/en/privacy-policy/':'https://studenthousebratislavanew.wordpress.com/gdpr/');
 privacy.target='_blank';privacy.rel='noopener noreferrer';
 const identity=n('div','enquiry-identity');
 identity.append(n('strong','',t.identity),n('p','',String(ctx.resident.full_name||'')+' · '+String(ctx.resident.email||'')));
 // Contract numbers, assigned room, dates, deposits and monthly charges are verified
 // by reception. The student questionnaire cannot change them.
 for(const [title,value] of [
  [ctx.lang==='en'?'Contract number':'Číslo zmluvy',ctx.resident.verified_contract_number],
  [ctx.lang==='en'?'Assigned room':'Pridelená izba',ctx.resident.verified_room_number],
  [ctx.lang==='en'?'Accommodation from':'Ubytovanie od',formatDate(ctx.resident.accommodation_from)],
  [ctx.lang==='en'?'Accommodation to':'Ubytovanie do',formatDate(ctx.resident.accommodation_to)]
 ])identity.append(n('p','',title+': '+String(value||'—')));
 identity.append(n('p','muted',ctx.lang==='en'?'Deposit, room access code, fees and monthly payment schedule are maintained by reception. You can see verified payments in the Payments section.':'Depozit, kód izby, poplatky a mesačný splátkový kalendár spravuje recepcia. Overené platby uvidíš v záložke Platby.'));
 const grid=n('div','enquiry-grid'),fields={};
 const add=(key,label,type='text',maxLength=200)=>{
  const inp=n(type==='textarea'?'textarea':'input');if(type!=='textarea')inp.type=type;
  inp.id='enquiry-'+key;inp.name=key;if(type!=='date')inp.maxLength=maxLength;
  inp.value=existing?.[key]||'';fields[key]=inp;grid.append(wrap(label,inp));return inp;
 };
 add('permanent_address',t.address,'textarea',500);
 add('date_of_birth',t.birth,'date');
 add('nationality',t.nationality,'text',80);
 fields.gender=choices([['',t.none],['male',t.male],['female',t.female],['other',t.other]],existing?.gender);
 grid.append(wrap(t.gender,fields.gender));
 add('identity_document_number',t.id,'text',100);
 add('telephone',t.telephone,'tel',60);
 add('parent_contact_email',t.parent,'email',254);
 add('school',t.school,'text',250);
 add('iban',t.iban,'text',80);
 const selectedRoom=existing?.preferred_room_type||'';
 const availableRooms=[['',t.none],...rooms];
 // Keep legacy preferences visible when a resident edits an older questionnaire.
 if(selectedRoom&&!rooms.some(([code])=>code===selectedRoom))availableRooms.push([selectedRoom,selectedRoom]);
 fields.preferred_room_type=choices(availableRooms,selectedRoom);
 grid.append(wrap(t.room,fields.preferred_room_type));
 fields.preferred_duration_months=choices([['',t.none],['5',t.five],['10',t.ten],['12',t.twelve]],String(existing?.preferred_duration_months||''));
 grid.append(wrap(t.duration,fields.preferred_duration_months));
 add('preferred_from',t.from,'date');add('preferred_to',t.to,'date');
 const photoBox=n('div','enquiry-photo'),photoLabel=n('strong','',t.photo),photoInput=n('input'),preview=n('img','enquiry-preview'),photoHint=n('p','muted',t.photoHint);
 photoInput.type='file';photoInput.accept='image/jpeg,image/png';photoInput.setAttribute('aria-label',t.selectPhoto);
 const photoText=n('label','',t.selectPhoto);photoText.append(photoInput);
 preview.alt=t.photo;preview.hidden=true;preview.loading='lazy';
 photoBox.append(photoLabel,preview,photoText,photoHint);
 let previewUrl=null,hasSavedPhoto=false;
 photoInput.addEventListener('change',()=>{
  if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
  const file=photoInput.files?.[0];
  if(!file)return;
  if(!validatePhoto(file)){photoInput.value='';status.textContent=t.invalidPhoto;return}
  previewUrl=URL.createObjectURL(file);preview.src=previewUrl;preview.hidden=false;status.textContent='';
 });
 form.append(identity,grid,photoBox,privacy);
 const status=n('p','enquiry-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const actionRow=n('div','enquiry-actions'),submit=n('button','',t.save);
 submit.type='submit';
 const print=n('button','btn-secondary',ctx.lang==='en'?'Print / Save as PDF':ctx.lang==='ru'?'Печать / Сохранить PDF':ctx.lang==='uk'?'Друк / Зберегти PDF':'Vytlačiť / Uložiť ako PDF');
 print.type='button';print.addEventListener('click',()=>window.print());
 actionRow.append(submit,print);form.append(actionRow,status);root.append(form);
 try{
  const files=await ctx.list('residence_portal_files');
  if(ctx.isCurrent()&&!photoInput.files?.length&&!previewUrl&&root.isConnected){
   const photo=files.filter(x=>x.kind==='profile_photo'&&x.active&&x.user_id===ctx.user.id)
     .sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))[0];
   if(photo){hasSavedPhoto=true;photoInput.required=false;const href=await ctx.fileLink(photo.id,ctx.tenant,true);
    if(href&&ctx.isCurrent()&&!photoInput.files?.length){preview.src=href;preview.hidden=false;}}
  }
 }catch{ /* Photo may be added later without blocking text form. */ }
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  const chosen=photoInput.files?.[0]||null;
  if(!chosen&&!hasSavedPhoto){status.textContent=ctx.lang==='en'?'Please upload your student photograph before submitting.':'Pred odoslaním dotazníka vlož fotografiu študenta.';photoInput.focus();return;}
  if(!validatePhoto(chosen)){status.textContent=t.invalidPhoto;return;}
  const now=new Date().toISOString();
  // A prefilled questionnaire is not complete until the resident has actively
  // reviewed and submitted it after accepting their password invitation.
  const values={tenant_id:ctx.tenant,resident_id:ctx.resident.id,user_id:ctx.user.id,
    updated_at:now,student_submitted_at:now};
  for(const [key,input]of Object.entries(fields)){
   let value=String(input.value||'').trim();
   if(['date_of_birth','preferred_from','preferred_to'].includes(key))value=value||null;
   if(key==='preferred_duration_months')value=value?Number(value):null;
   values[key]=value;
  }
  if(values.preferred_from&&values.preferred_to&&values.preferred_to<values.preferred_from){status.textContent=t.failed;return;}
  submit.disabled=true;status.textContent=t.saving;
  try{
   // Upload photo to the existing private bucket before marking the questionnaire complete.
   if(chosen){
    const body=new FormData();body.append('action','upload');body.append('tenant_id',ctx.tenant);
    body.append('kind','profile_photo');body.append('file',chosen);
    const {data,error:uploadError}=await ctx.db.functions.invoke('residence-files',{body});
    if(uploadError||!data?.ok){status.textContent=t.photoFailed;return;}
    hasSavedPhoto=true;photoInput.required=false;photoInput.value='';
   }
   const {error}=await ctx.db.from('resident_enquiries')
     .upsert(values,{onConflict:'tenant_id,resident_id'}).select('id').single();
   if(error){status.textContent=t.failed;return;}
   status.textContent=review?.review_status==='needs_correction'
     ?(ctx.lang==='en'?'Corrected questionnaire submitted to reception.':'Opravený dotazník je odoslaný na kontrolu recepcii.')
     :t.saved;
   if(ctx.isOnboarding){
    // Automatically move to step three only after the questionnaire and private
    // photograph have both been saved. The invitation is a separate email.
    await ctx.onComplete?.();
   }else if(!actionRow.querySelector('.enquiry-completed')){
    const next=n('button','btn-secondary enquiry-completed',ctx.lang==='en'?'Continue to documents':ctx.lang==='ru'?'К документам':ctx.lang==='uk'?'До документів':'Pokračovať na dokumenty');
    next.type='button';next.addEventListener('click',()=>ctx.onComplete?.());
    actionRow.append(next);
   }
  }catch{status.textContent=t.failed;}finally{submit.disabled=false;}
 });
}
