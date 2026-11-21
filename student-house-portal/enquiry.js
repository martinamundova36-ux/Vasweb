// Student House Bratislava - authenticated questionnaire.
// Sensitive personal data stays in tenant-scoped RLS rows; photographs are stored
// in the existing private residence-portal-files bucket through residence-files.
const words={
 sk:{title:'Osobný dotazník študenta',intro:'Vyplň svoje údaje online a pripoj fotografiu. Údaje uvidíš len ty a oprávnená recepcia. Osobný dotazník nenahrádza overenú ubytovaciu zmluvu.',identity:'Overené údaje zo zmluvy',address:'Trvalá adresa (ulica, PSČ, mesto, krajina)',birth:'Dátum narodenia',nationality:'Národnosť',gender:'Pohlavie',id:'Číslo občianskeho preukazu / pasu',telephone:'Telefón',parent:'Kontaktný e-mail rodiča (ak je potrebný)',school:'Škola v Bratislave',iban:'IBAN (nepovinné)',room:'Preferovaný typ izby',duration:'Preferovaná dĺžka ubytovania',from:'Preferovaný príchod',to:'Preferovaný odchod',photo:'Fotografia študenta',selectPhoto:'Vybrať fotografiu z galérie alebo fotoaparátu (automatická úprava)',photoHint:'Fotografia sa uloží iba do súkromnej študentskej zóny. Recepcia ju môže zobraziť pri overovaní.',save:'Uložiť dotazník a fotografiu',saving:'Ukladám údaje…',saved:'Dotazník a fotografia sú uložené.',savedWithoutPhoto:'Dotazník je uložený.',photoFailed:'Fotografiu sa nepodarilo uložiť na server. Dotazník zatiaľ nie je odoslaný na schválenie. Skús odoslanie znova.',failed:'Dotazník sa nepodarilo uložiť. Skontroluj prihlásenie alebo internetové pripojenie.',invalidPhoto:'Fotografiu sa nepodarilo spracovať. Skús inú fotografiu JPG, PNG alebo WebP. Obrázky HEIC fungujú iba v podporovaných prehliadačoch.',notFound:'Nemáš schválený študentský účet. Dotazník vyplníš po schválení registrácie.',privacy:'Ochrana osobných údajov a GDPR',download:'Stiahnuť prázdny dotazník (PDF)',none:'Nevybrané',male:'Muž',female:'Žena',other:'Iné / nechcem uviesť',five:'5 mesiacov',ten:'10 mesiacov',twelve:'12 mesiacov',current:'Aktuálne uložená fotografia'},
 en:{title:'Student personal questionnaire',intro:'Complete your information online and add your photo. Only you and authorised reception staff can view it. This questionnaire does not replace the verified accommodation contract.',identity:'Verified contract details',address:'Permanent address (street, postcode, city, country)',birth:'Date of birth',nationality:'Nationality',gender:'Sex / gender',id:'ID card or passport number',telephone:'Telephone',parent:'Parent contact email (if applicable)',school:'School in Bratislava',iban:'IBAN (optional)',room:'Preferred room type',duration:'Preferred stay duration',from:'Preferred arrival',to:'Preferred departure',photo:'Student photograph',selectPhoto:'Choose a photo from your phone or camera (automatically optimized)',photoHint:'Your photo is uploaded to private residence storage and may be seen by authorised reception staff.',save:'Save questionnaire and photo',saving:'Saving…',saved:'Questionnaire and photo saved.',savedWithoutPhoto:'Questionnaire saved.',photoFailed:'Photo upload failed. The questionnaire has not been submitted for approval. Please retry.',failed:'Questionnaire could not be saved. Check your login or connection.',invalidPhoto:'Could not process that photo. Try JPG, PNG or WebP. HEIC images need a compatible browser.',notFound:'Your resident account is not approved yet. Complete the questionnaire after approval.',privacy:'Privacy information (GDPR)',download:'Download blank questionnaire (PDF)',none:'Not selected',male:'Male',female:'Female',other:'Other / prefer not to say',five:'5 months',ten:'10 months',twelve:'12 months',current:'Currently saved photo'},
 ru:{title:'Анкета студента',intro:'Заполните анкету онлайн и добавьте фото. Доступ есть только у вас и уполномоченных сотрудников.',identity:'Проверенные данные',address:'Постоянный адрес',birth:'Дата рождения',nationality:'Гражданство',gender:'Пол',id:'Номер паспорта / удостоверения',telephone:'Телефон',parent:'Электронная почта родителя',school:'Учебное заведение в Братиславе',iban:'IBAN (необязательно)',room:'Предпочтительный тип комнаты',duration:'Срок проживания',from:'Дата заезда',to:'Дата выезда',photo:'Фотография студента',selectPhoto:'Выберите фото из галереи или камеры (автоматическая обработка)',photoHint:'Фото хранится приватно и доступно только уполномоченным сотрудникам.',save:'Сохранить анкету и фото',saving:'Сохраняем…',saved:'Анкета и фото сохранены.',savedWithoutPhoto:'Анкета сохранена.',photoFailed:'Загрузка фото не удалась. Анкета ещё не отправлена на проверку. Попробуйте ещё раз.',failed:'Не удалось сохранить анкету.',invalidPhoto:'Не удалось обработать фото. Попробуйте JPG, PNG или WebP. Для HEIC нужен совместимый браузер.',notFound:'Заполнить можно после подтверждения регистрации.',privacy:'Конфиденциальность (GDPR)',download:'Скачать пустую анкету (PDF)',none:'Не выбрано',male:'Мужчина',female:'Женщина',other:'Другое',five:'5 месяцев',ten:'10 месяцев',twelve:'12 месяцев',current:'Текущее фото'},
 uk:{title:'Анкета студента',intro:'Заповніть анкету онлайн та додайте фото. Доступ є лише у вас і уповноважених працівників.',identity:'Перевірені дані',address:'Постійна адреса',birth:'Дата народження',nationality:'Громадянство',gender:'Стать',id:'Номер паспорта / посвідчення',telephone:'Телефон',parent:'Електронна адреса одного з батьків',school:'Навчальний заклад у Братиславі',iban:'IBAN (необов’язково)',room:'Бажаний тип кімнати',duration:'Тривалість проживання',from:'Дата заїзду',to:'Дата виїзду',photo:'Фотографія студента',selectPhoto:'Виберіть фото з галереї або камери (автоматична обробка)',photoHint:'Фото зберігається приватно та доступне лише уповноваженим працівникам.',save:'Зберегти анкету й фото',saving:'Зберігаємо…',saved:'Анкету й фото збережено.',savedWithoutPhoto:'Анкету збережено.',photoFailed:'Не вдалося завантажити фото. Анкету ще не надіслано на перевірку. Спробуйте ще раз.',failed:'Не вдалося зберегти анкету.',invalidPhoto:'Не вдалося обробити фото. Спробуйте JPG, PNG або WebP. HEIC потребує сумісного браузера.',notFound:'Заповніть після підтвердження реєстрації.',privacy:'Конфіденційність (GDPR)',download:'Завантажити порожню анкету (PDF)',none:'Не обрано',male:'Чоловік',female:'Жінка',other:'Інше',five:'5 місяців',ten:'10 місяців',twelve:'12 місяців',current:'Наявне фото'}
};
// Public room categories are displayed as on the Student House gallery.
// Stored legacy Excel codes remain unchanged for reception and room allocation.
const fridgeLabels={sk:{question:'Máš vlastnú chladničku?',yes:'Áno',no:'Nie'},en:{question:'Do you have your own refrigerator?',yes:'Yes',no:'No'},ru:{question:'У вас собственный холодильник?',yes:'Да',no:'Нет'},uk:{question:'Чи маєте власний холодильник?',yes:'Так',no:'Ні'}};
const n=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!=null)el.textContent=String(txt);return el};
const wrap=(title,control)=>{const label=n('label','enquiry-label');label.append(n('span','',title),control);return label};
function choices(items,value){const el=n('select');for(const [v,label]of items){const opt=n('option','',label);opt.value=v;el.append(opt)}el.value=value||'';return el}
// Phone photos are optimized in the browser: the private storage API accepts
// only real JPEG/PNG data up to 3 MB. The original image is never uploaded.
const MOBILE_PHOTO_INPUT_LIMIT=40000000;
const MOBILE_PHOTO_OUTPUT_LIMIT=2900000;
async function prepareEnquiryPhoto(file){
 if(!(file instanceof File)||!file.size||file.size>MOBILE_PHOTO_INPUT_LIMIT)throw Error('invalid_photo');
 if(!(/^image\/(jpeg|png|webp|heic|heif|avif|jpg)$/i.test(file.type)||/\.(jpe?g|png|webp|heic|heif|avif)$/i.test(file.name)))throw Error('invalid_photo');
 let image,objectUrl;
 try{
  try{image=await createImageBitmap(file,{imageOrientation:'from-image'});}
  catch{
   objectUrl=URL.createObjectURL(file);
   image=new Image();
   await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src=objectUrl;});
  }
  const width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
  if(!width||!height||width*height>100000000)throw Error('invalid_photo');
  const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
  if(!context)throw Error('invalid_photo');
  let scale=Math.min(1,1600/Math.max(width,height));
  for(const quality of [0.86,0.74,0.62,0.5,0.4]){
   canvas.width=Math.max(1,Math.round(width*scale));
   canvas.height=Math.max(1,Math.round(height*scale));
   context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
   context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);
   context.drawImage(image,0,0,canvas.width,canvas.height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
   if(blob?.size&&blob.size<=MOBILE_PHOTO_OUTPUT_LIMIT){
    const filename=(file.name||'student-photo').replace(/\.[^.]+$/,'')+'.jpg';
    return new File([blob],filename,{type:'image/jpeg',lastModified:Date.now()});
   }
   scale*=0.78;
  }
  throw Error('invalid_photo');
 }catch{throw Error('invalid_photo');}
 finally{
  if(typeof image?.close==='function')image.close();
  if(objectUrl)URL.revokeObjectURL(objectUrl);
 }
}
function photoProgress(lang){
 return ({
  sk:{processing:'Spracúvam fotografiu z telefónu…',ready:'✓ Fotografia je pripravená na uloženie.',failed:'Fotografiu sa nepodarilo spracovať. Vyber inú fotografiu.'},
  en:{processing:'Optimizing your phone photo…',ready:'✓ Photo ready to upload.',failed:'Could not process the photo. Choose another photo.'},
  ru:{processing:'Обрабатываем фото с телефона…',ready:'✓ Фото готово к отправке.',failed:'Не удалось обработать фото. Выберите другое.'},
  uk:{processing:'Обробляємо фото з телефону…',ready:'✓ Фото готове до завантаження.',failed:'Не вдалося обробити фото. Виберіть інше.'}
 })[lang]||{processing:'Processing photo…',ready:'Photo ready.',failed:'Photo could not be processed.'};
}
const formatDate=(s)=>{if(!s)return '';const a=String(s).slice(0,10).split('-');return a.length===3?a.reverse().join('. '):String(s)};
export async function renderStudentEnquiry(ctx){
 const t=words[ctx.lang]||words.sk;
 const root=n('section','enquiry-area'),form=n('form','enquiry-form');
 ctx.root.append(root);root.append(n('h3','',t.title),n('p','muted',
  ({sk:'Krok 2 z 3: ',en:'Step 2 of 3: ',ru:'Шаг 2 из 3: ',uk:'Крок 2 з 3: '})[ctx.lang]+t.intro));
 root.append(n('p','enquiry-status',({sk:"Recepcia schválila registráciu. Odošli dotazník s fotografiou. Po schválení dotazníka si môžeš aktivovať profil.",en:"Reception approved your registration. Submit your questionnaire and photo. You can activate your profile after reception approves the questionnaire.",ru:"Ресепшен одобрил регистрацию. Отправьте анкету с фотографией. После одобрения анкеты вы сможете активировать профиль.",uk:"Рецепція схвалила реєстрацію. Надішліть анкету з фотографією. Після схвалення анкети ви зможете активувати профіль."})[ctx.lang]));
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
  const changed=!!existing?.student_submitted_at&&Date.parse(String(existing.updated_at||existing.created_at||''))>Date.parse(String(review.requested_at||''));
  const warning=n('section','enquiry-identity');
  warning.append(n('strong','',changed
   ?(({sk:"Opravený dotazník bol opätovne odoslaný. Čaká na kontrolu recepcie.",en:"Corrections submitted; reception has not verified them yet.",ru:"Исправленная анкета отправлена и ожидает проверки.",uk:"Виправлену анкету надіслано. Вона очікує перевірки."})[ctx.lang])
   :(({sk:"Dotazník vrátený recepciou na opravu",en:"Questionnaire returned for correction",ru:"Анкета возвращена на исправление",uk:"Анкету повернуто на виправлення"})[ctx.lang])));
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
  [({sk:"Číslo zmluvy",en:"Contract number",ru:"Номер договора",uk:"Номер договору"})[ctx.lang],ctx.resident.verified_contract_number],
  [({sk:"Pridelená izba",en:"Assigned room",ru:"Назначенная комната",uk:"Призначена кімната"})[ctx.lang],ctx.resident.verified_room_number],
  [({sk:"Ubytovanie od",en:"Accommodation from",ru:"Проживание с",uk:"Проживання з"})[ctx.lang],formatDate(ctx.resident.accommodation_from)],
  [({sk:"Ubytovanie do",en:"Accommodation to",ru:"Проживание до",uk:"Проживання до"})[ctx.lang],formatDate(ctx.resident.accommodation_to)]
 ])identity.append(n('p','',title+': '+String(value||'—')));
 identity.append(n('p','muted',({sk:"Depozit, kód izby, poplatky a mesačný splátkový kalendár spravuje recepcia. Overené platby uvidíš v záložke Platby.",en:"Deposit, room access code, fees and monthly payment schedule are maintained by reception. You can see verified payments in the Payments section.",ru:"Депозит, код доступа, сборы и график платежей ведёт ресепшен. Подтверждённые платежи доступны в разделе «Платежи».",uk:"Депозит, код доступу, збори та графік платежів веде рецепція. Підтверджені платежі доступні в розділі «Платежі»."})[ctx.lang]));
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
 const fridge=fridgeLabels[ctx.lang]||fridgeLabels.sk;
 fields.own_refrigerator=choices([['',t.none],['yes',fridge.yes],['no',fridge.no]],existing?.own_refrigerator===true?'yes':existing?.own_refrigerator===false?'no':'');
 grid.append(wrap(fridge.question,fields.own_refrigerator));
 add('identity_document_number',t.id,'text',100);
 add('telephone',t.telephone,'tel',60);
 add('parent_contact_email',t.parent,'email',254);
 add('school',t.school,'text',250);
 add('iban',t.iban,'text',80);
 const photoBox=n('div','enquiry-photo'),photoLabel=n('strong','',t.photo),photoInput=n('input'),preview=n('img','enquiry-preview'),photoHint=n('p','muted',t.photoHint);
 photoInput.type='file';photoInput.accept='image/*';photoInput.setAttribute('aria-label',t.selectPhoto);
 const photoText=n('label','',t.selectPhoto);photoText.append(photoInput);
 const photoFeedback=n('p','enquiry-status');photoFeedback.setAttribute('role','status');photoFeedback.setAttribute('aria-live','polite');
 preview.alt=t.photo;preview.hidden=true;preview.loading='lazy';
 photoBox.append(photoLabel,preview,photoText,photoFeedback,photoHint);
 let previewUrl=null,hasSavedPhoto=false,preparedPhoto=null,photoTask=Promise.resolve(),photoSelection=0;
 const messages=photoProgress(ctx.lang);
 photoInput.addEventListener('change',()=>{
  const current=++photoSelection;
  if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null;}
  const file=photoInput.files?.[0]||null;
  preparedPhoto=null;preview.hidden=true;
  if(!file){photoFeedback.textContent='';photoTask=Promise.resolve();return;}
  photoFeedback.textContent=messages.processing;
  photoTask=(async()=>{
   try{
    const result=await prepareEnquiryPhoto(file);
    if(current!==photoSelection||!ctx.isCurrent()||!root.isConnected)return;
    preparedPhoto=result;
    previewUrl=URL.createObjectURL(result);preview.src=previewUrl;preview.hidden=false;
    photoFeedback.textContent=messages.ready+' '+(result.size/1000000).toFixed(2)+' MB';
   }catch{
    if(current!==photoSelection)return;
    photoInput.value='';preparedPhoto=null;
    photoFeedback.textContent=t.invalidPhoto;
   }
  })();
 });
 form.append(identity,grid,photoBox,privacy);
 const status=n('p','enquiry-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 for(const key of ['permanent_address','date_of_birth','nationality','identity_document_number','telephone','school','parent_contact_email','iban'])if(fields[key])fields[key].required=true;
 fields.gender.required=true;
 fields.own_refrigerator.required=true;
 fields.date_of_birth.max=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bratislava'}).format(new Date());
 const actionRow=n('div','enquiry-actions'),submit=n('button','',t.save);
 submit.type='submit';
 const draft=n('button','btn-secondary',({sk:'Uložiť rozpracovaný dotazník',en:'Save draft',ru:'Сохранить черновик',uk:'Зберегти чернетку'})[ctx.lang]||'Save draft');draft.type='button';
 draft.addEventListener('click',async()=>{
  if(!ctx.isCurrent())return;draft.disabled=true;submit.disabled=true;status.classList.remove('staff-approval-success');status.textContent=t.saving;
  try{
   const values={tenant_id:ctx.tenant,resident_id:ctx.resident.id,user_id:ctx.user.id,student_submitted_at:null};
   for(const [key,input]of Object.entries(fields)){let value=String(input.value||'').trim();if(key==='date_of_birth')value=value||null;if(key==='own_refrigerator')value=value==='yes'?true:value==='no'?false:null;values[key]=value;}
   const {error}=await ctx.db.from('resident_enquiries').upsert(values,{onConflict:'tenant_id,resident_id'}).select('id').single();if(error)throw error;
   status.textContent=({sk:'Rozpracovaný dotazník je uložený. Na kontrolu ho odošli po doplnení.',en:'Draft saved. Submit it for review when complete.',ru:'Черновик сохранён. Отправьте заполненную анкету на проверку.',uk:'Чернетку збережено. Надішліть заповнену анкету на перевірку.'})[ctx.lang]||t.savedWithoutPhoto;
  }catch{status.textContent=t.failed;}finally{draft.disabled=false;submit.disabled=false;}
 });
 actionRow.append(draft,submit);form.append(actionRow,status);root.append(form);
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
  const selected=photoInput.files?.[0]||null;
  await photoTask;
  if(!ctx.isCurrent()||!root.isConnected)return;
  const chosen=selected?preparedPhoto:null;
  if(selected&&!chosen){status.textContent=t.invalidPhoto;photoInput.focus();return;}
  if(!chosen&&!hasSavedPhoto){status.textContent=({sk:"Pred odoslaním dotazníka vlož fotografiu študenta.",en:"Please upload your student photograph before submitting.",ru:"Загрузите свою фотографию перед отправкой анкеты.",uk:"Завантажте своє фото перед надсиланням анкети."})[ctx.lang];photoInput.focus();return;}
  const now=new Date().toISOString();
  // A prefilled questionnaire is not complete until the resident has actively
  // reviewed and submitted it after accepting their password invitation.
  const values={tenant_id:ctx.tenant,resident_id:ctx.resident.id,user_id:ctx.user.id,
    updated_at:now,student_submitted_at:now};
  for(const [key,input]of Object.entries(fields)){
   let value=String(input.value||'').trim();
   if(key==='date_of_birth')value=value||null;
   
   if(key==='own_refrigerator')value=value==='yes'?true:value==='no'?false:null;
   values[key]=value;
  }
  submit.disabled=true;status.classList.remove('staff-approval-success');status.textContent=t.saving;
  try{
   // Upload photo to the existing private bucket before marking the questionnaire complete.
   if(chosen){
    const body=new FormData();body.append('action','upload');body.append('tenant_id',ctx.tenant);
    body.append('kind','profile_photo');body.append('file',chosen);
    const {data,error:uploadError}=await ctx.db.functions.invoke('residence-files',{body});
    if(uploadError||!data?.ok){status.textContent=t.photoFailed;photoFeedback.textContent=t.photoFailed;return;}
    hasSavedPhoto=true;photoInput.required=false;photoInput.value='';
   }
   const {error}=await ctx.db.from('resident_enquiries')
     .upsert(values,{onConflict:'tenant_id,resident_id'}).select('id').single();
   if(error){status.textContent=t.failed;return;}
   status.classList.add('staff-approval-success');
   status.textContent='✓ '+(review?.review_status==='needs_correction'
     ?(({sk:"Opravený dotazník je odoslaný na kontrolu recepcii.",en:"Corrected questionnaire submitted to reception.",ru:"Исправленная анкета отправлена на проверку.",uk:"Виправлену анкету надіслано на перевірку."})[ctx.lang])
     :t.saved);
   ctx.onSaved?.();
   if(!actionRow.querySelector('.enquiry-completed')){
    const next=n('button','btn-secondary enquiry-completed',({sk:'Skontrolovať stav dotazníka',en:'Check questionnaire status',ru:'Проверить статус анкеты',uk:'Перевірити стан анкети'})[ctx.lang]);
    next.type='button';next.addEventListener('click',()=>ctx.onComplete?.());
    actionRow.append(next);
   }
  }catch{status.textContent=t.failed;}finally{submit.disabled=false;}
 });
}
