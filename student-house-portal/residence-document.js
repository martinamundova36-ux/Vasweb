import {providerText} from './student-house-provider.js';
const core = ['student_name', 'room_number', 'contract_number'];
const stay = [...core, 'accommodation_from', 'accommodation_to'];
export const documentFields = {
 contract_draft: [...stay, 'birth_date', 'address', 'passport_number', 'nationality', 'telephone', 'email', 'parent_email', 'school', 'room_type', 'monthly_rent', 'deposit', 'admin_fee', 'provider', 'payment_terms'],
 rules_template: core,
 gdpr_template: ['student_name', 'provider', 'notice_version'],
 certificate_draft: [...stay, 'provider', 'issue_date', 'certificate_fee'],
 deposit_template: [...stay, 'deposit'],
 schedule_draft: stay
};
const labels = {
 student_name:'Meno a priezvisko',room_number:'Číslo izby',contract_number:'Číslo zmluvy',
 accommodation_from:'Ubytovanie od',accommodation_to:'Ubytovanie do',birth_date:'Dátum narodenia',
 address:'Trvalá adresa',passport_number:'Číslo pasu / dokladu totožnosti',refund_iban:'IBAN na vrátenie depozitu',monthly_rent:'Mesačné nájomné (EUR)',
 deposit:'Evidovaný depozit (EUR)',admin_fee:'Administratívny poplatok (EUR)',provider:'Ubytovateľ / prevádzkovateľ',
 payment_terms:'Schválené platobné podmienky',notice_version:'Verzia informácií o spracúvaní',
 issue_date:'Dátum vystavenia',certificate_fee:'Poplatok za potvrdenie (EUR)',document_number:'Číslo dokumentu',
 nationality:'Národnosť',telephone:'Kontakt',email:'E-mail',parent_email:'Kontakt na rodiča',school:'Škola',room_type:'Typ izby',student_iban:'IBAN ubytovaného',signature_date:'Dátum podpisu',signature_place:'Miesto podpisu'
};
const wording = {
 contract_draft:['Predmet a podmienky ubytovania','Podmienky uvedené nižšie vychádzajú zo schválenej evidencie recepcie. Znenie zmluvných ustanovení a údaje zmluvných strán doplní ubytovateľ v schválenej šablóne.','Podpis ubytovaného a podpis ubytovateľa'],
 rules_template:['A. Všeobecný ubytovací poriadok','Recepcia priloží schválené všeobecné znenie v plnom rozsahu.','B. Individuálne potvrdenie o oboznámení','Podpisom potvrdzujem oboznámenie sa s priloženým ubytovacím poriadkom.','Podpis ubytovaného'],
 gdpr_template:['Informácie o spracúvaní osobných údajov','Portál eviduje registráciu, dotazník, ubytovanie, dokumenty a platby. Prevádzkovateľ doplní svoj kontakt, účely a právne základy, príjemcov, lehoty uchovávania, prípadné prenosy a informácie o právach a ich uplatnení.','Potvrdenie o oboznámení','Podpisom potvrdzujem prevzatie informácií o spracúvaní osobných údajov uvedenej verzie. Prípadný dobrovoľný súhlas sa udeľuje samostatne.','Podpis ubytovaného'],
 certificate_draft:['Údaje o potvrdenom ubytovaní','Potvrdenie vydáva recepcia po overení údajov v evidencii ubytovania.','Podpis oprávnenej osoby'],
 deposit_template:['Žiadosť o poukázanie depozitu','Žiadam o vrátenie depozitu po kontrole evidencie a prípadných zrážok.','Vyplní recepcia: overený depozit, výška a dôvod zrážok, schválená suma refundácie.','Podpis žiadateľa'],
 schedule_draft:['Splátky preberá systém zo schválenej finančnej evidencie.']
};
export function fieldsForDocument(kind, person, enquiry, tenancy, staff, extras = {}) {
 return {
  student_name:person.full_name,room_number:person.verified_room_number,contract_number:person.verified_contract_number,
  accommodation_from:person.accommodation_from,accommodation_to:person.accommodation_to,
  birth_date:enquiry?.date_of_birth,address:enquiry?.permanent_address,
  nationality:enquiry?.nationality,telephone:enquiry?.telephone,email:person.email,parent_email:enquiry?.parent_contact_email,school:enquiry?.school,room_type:tenancy?.room_type,student_iban:enquiry?.iban,
  provider:providerText(person.tenant_id),
  ...(kind==='contract_draft'?{passport_number:enquiry?.identity_document_number}:{}),
  ...(kind==='deposit_template'?{refund_iban:enquiry?.iban}:{}),
  monthly_rent:tenancy?.rent,deposit:staff?.deposit_eur,admin_fee:staff?.administration_fee_eur,
  ...Object.fromEntries(Object.entries(extras).filter(([key,value])=>key!=='provider'||String(value??'').trim())),
  ...(providerText(person.tenant_id)?{provider:providerText(person.tenant_id)}:{})
 };
}
const present = value => value != null && String(value).trim() !== '';
export function missingDocumentFields(kind, data) {
 return documentFields[kind].filter(key=>!present(data[key])).map(key=>labels[key]);
}
export function mapPdfField(name, allowedFields) {
 const normalize = value=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const key = normalize(name);
 return allowedFields.find(field=>[field,labels[field]].some(alias=>normalize(alias)===key));
}
// Original bilingual Student House contract: fields repeat across SK/EN and the annex.
export async function fillOriginalStudentHouseContract({attachment,data,charges,plans=[],items=[],person,slug='ubytovacia-zmluva'}){
 const {PDFDocument,PDFTextField}=await import('https://esm.sh/pdf-lib@1.17.1');
 const pdf=await PDFDocument.load(attachment),form=pdf.getForm();
 const names=String(data.student_name||'').trim().split(/\s+/);
 const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?v.split('-').reverse().join('.'):String(v||'');
 const euro=v=>Number.isFinite(Number(v))&&v!==null&&v!==''?new Intl.NumberFormat('sk-SK',{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(v)):'';
 const values={...data,first_name:data.first_name||names.shift()||'',last_name:data.last_name||names.join(' '),birth_date:date(data.birth_date),accommodation_from:date(data.accommodation_from),accommodation_to:date(data.accommodation_to),monthly_rent:euro(data.monthly_rent),deposit:euro(data.deposit),student_iban:data.student_iban||''};
 const required=['first_name','last_name','student_name','contract_number','address','birth_date','nationality','passport_number','telephone','email','school','room_type','room_number','accommodation_from','accommodation_to','monthly_rent','deposit'];
 const missing=required.filter(k=>!String(values[k]??'').trim());
 if(missing.length)throw Error('Chýbajú údaje zmluvy: '+missing.join(', '));
 const from=String(data.accommodation_from).slice(0,7),to=String(data.accommodation_to).slice(0,7);
 const months=[];let month=new Date(from+'-01T12:00:00Z');
 for(let i=0;i<13&&Number.isFinite(month.getTime())&&month.toISOString().slice(0,7)<=to;i++,month.setUTCMonth(month.getUTCMonth()+1))months.push(month.toISOString().slice(0,7));
 if(!months.length||months.length>12)throw Error('Predloha podporuje najviac 12 mesiacov; skontroluj zmluvné obdobie.');
 const own=(charges||[]).filter(c=>c.resident_id===person.id);
 const rentRows=months.map(m=>own.filter(c=>c.kind==='rent'&&c.period===m));
 const fee=(kind)=>own.filter(c=>c.kind===kind&&c.period===from);
 const admin=fee('administration_fee'),deposit=fee('deposit');
 if(rentRows.some(rows=>rows.length!==1)||admin.length!==1||deposit.length!==1)throw Error('Chýba jednoznačný schválený predpis nájmu, depozitu alebo administratívneho poplatku. Skontroluj Excel evidenciu.');
 const same=(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.round(Number(a)*100)===Math.round(Number(b)*100);
 if(rentRows.some(rows=>!same(rows[0].amount,data.monthly_rent))||!same(admin[0].amount,data.admin_fee)||!same(deposit[0].amount,data.deposit))throw Error('Predpisy sa nezhodujú so zmluvnými sumami. Skontroluj Excel evidenciu.');
 const feeValues=(prefix,c)=>{values[prefix+'_base']=euro(c.amount)+' €';values[prefix+'_total']=euro(c.amount)+' €';};
 feeValues('admin_fee',admin[0]);feeValues('deposit',deposit[0]);
 for(const [i,rows] of rentRows.entries()){
  const c=rows[0],prefix='rent_'+String(i+1).padStart(2,'0');feeValues(prefix,c);
  values[prefix+'_month']=new Intl.DateTimeFormat('sk-SK',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(c.period+'-01T12:00:00Z'));
  values[prefix+'_reference']=String(data.contract_number).replace(/\s/g,'');
  values[prefix+'_supply']=date(c.due_on);values[prefix+'_due']=date(c.due_on);values[prefix+'_vat']='0%';values[prefix+'_purpose']='Splátka nájmu / Rent payment';
 }
 const available=new Set(form.getFields().map(f=>f.getName().split('__')[0]));
 if(!required.every(k=>available.has(k))||pdf.getPageCount()!==10||!available.has('rent_12_due')||!available.has('admin_fee_total'))throw Error('Nahraná predloha nie je pôvodná vyplniteľná zmluva Student House.');
 const filled=[];
 for(const field of form.getFields()){
  if(!(field instanceof PDFTextField))continue;
  const key=field.getName().split('__')[0];
  if(values[key]!==undefined&&values[key]!==null){field.setText(String(values[key]));filled.push(field);}
 }
 // A Unicode font is necessary for student names and addresses with diacritics or Cyrillic.
 const {default:fontkit}=await import('https://esm.sh/@pdf-lib/fontkit@1.1.1');
 pdf.registerFontkit(fontkit);
 const fontResponse=await fetch('https://cdn.jsdelivr.net/gh/notofonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf');
 if(!fontResponse.ok)throw Error('Písmo zmluvy sa nepodarilo načítať.');
 const font=await pdf.embedFont(await fontResponse.arrayBuffer(),{subset:true});
 for(const field of filled){field.setFontSize(0);field.updateAppearances(font);}
 // Preserve pages 1–7 of the signed-contract layout; page 8 is blank, pages 9–10 are the old annex.
 // Build the new annex from the verified charges, not from the example student's figures.
 const scheduleCharges=[admin[0],deposit[0],...rentRows.map(rows=>rows[0])];
 const schedule=scheduleCharges.flatMap(ch=>{
  const agreed=plans.filter(p=>p.charge_id===ch.id);
  if(agreed.length>1)throw Error('Viacero splátkových dohôd k rovnakému predpisu.');
  if(!agreed.length)return [{...ch,initial:ch.period===from}];
  const parts=items.filter(i=>i.plan_id===agreed[0].id).sort((a,b)=>String(a.due_on).localeCompare(String(b.due_on)));
  if(!parts.length||parts.some(i=>!Number.isFinite(Number(i.amount))||Number(i.amount)<=0)||Math.round(parts.reduce((sum,i)=>sum+Number(i.amount),0)*100)!==Math.round(Number(ch.amount)*100))throw Error('Splátková dohoda sa nezhoduje s predpisom.');
  return parts.map(i=>({...ch,amount:i.amount,due_on:i.due_on,initial:false}));
 });
 const {contractScheduleDocument}=await import('./installment-document.js?v=20261125-contract-annex1');
 const annex=await contractScheduleDocument({...data,first_name:values.first_name,last_name:values.last_name},schedule);
 // Remove annex form fields before dropping its pages, to avoid dangling PDF widgets.
 for(const field of [...form.getFields()]){
  const n=field.getName();
  if(/^(rent_|admin_fee_|deposit_(base|total))/.test(n)||/__(3|4|5|6)$/.test(n))form.removeField(field);
 }
 for(let i=pdf.getPageCount()-1;i>=7;i--)pdf.removePage(i);
 const annexPdf=await PDFDocument.load(await annex.arrayBuffer());
 for(const page of await pdf.copyPages(annexPdf,annexPdf.getPageIndices()))pdf.addPage(page);
 return new File([await pdf.save({updateFieldAppearances:false})],slug+'.pdf',{type:'application/pdf'});
}
export async function workingDocument({kind,title,slug,data,attachment}) {
 const {PDFDocument}=await import('https://esm.sh/pdf-lib@1.17.1');
 const pdf=await PDFDocument.create();
 if(attachment&&kind==='rules_template'){
  const original=await PDFDocument.load(attachment);
  for(const page of await pdf.copyPages(original, original.getPageIndices()))pdf.addPage(page);
 }
 const optional={contract_draft:['student_iban'],certificate_draft:['document_number'],deposit_template:['refund_iban']}[kind]||[];
 const signature=['rules_template','gdpr_template','deposit_template'].includes(kind)?['signature_place','signature_date']:[];
 const details=[...documentFields[kind],...optional.filter(key=>kind==='deposit_template'||present(data[key])),...signature]
  .map(key=>labels[key]+': '+(present(data[key])?data[key]:'________________________'));
 const copy=wording[kind];
 const lines=kind==='rules_template'?
  [...(attachment?[]:copy.slice(0,2)),copy[2],...details,...copy.slice(3)]:
  [...(kind==='gdpr_template'?copy.slice(0,3):copy.slice(0,1)),...details,...(kind==='gdpr_template'?copy.slice(3):copy.slice(1))];
 if(copy.length>1)lines.push('___________________________________');
 let canvas,context,y;
 const startPage=()=>{
  canvas=document.createElement('canvas');canvas.width=1240;canvas.height=1754;
  context=canvas.getContext('2d');
  context.fillStyle='#fff';context.fillRect(0,0,1240,1754);
  context.fillStyle='#152d4d';context.fillRect(0,0,1240,200);
  context.fillStyle='#fff';context.font='28px sans-serif';context.fillText('Student House Bratislava',72,57);
  context.font='bold 46px sans-serif';context.fillText(title,72,130,1096);
  context.fillStyle='#963e2a';context.font='bold 27px sans-serif';
  context.fillText('PRACOVNÝ VZOR – na kontrolu recepciou',72,265);
  context.fillStyle='#152d4d';context.font='31px sans-serif';y=350;
 };
 const savePage=async()=>{
  const image=await pdf.embedPng(canvas.toDataURL('image/png'));
  pdf.addPage([595.28,841.89]).drawImage(image,{x:0,y:0,width:595.28,height:841.89});
 };
 startPage();
 for(const paragraph of lines){
  let line='';
  for(const word of paragraph.split(/\s+/)){
   if(line&&context.measureText(line+' '+word).width>1096){
    if(y>1640){await savePage();startPage();}
    context.fillText(line,72,y,1096);y+=46;line='';
   }
   line+=(line?' ':'')+word;
  }
  if(y>1640){await savePage();startPage();}
  context.fillText(line,72,y,1096);y+=67;
 }
 await savePage();
 return new File([await pdf.save()],slug+'-pracovny-vzor.pdf',{type:'application/pdf'});
}
