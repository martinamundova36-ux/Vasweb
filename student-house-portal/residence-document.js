const core = ['student_name', 'room_number', 'contract_number'];
const stay = [...core, 'accommodation_from', 'accommodation_to'];
export const documentFields = {
 contract_draft: [...stay, 'birth_date', 'address', 'passport_number', 'monthly_rent', 'deposit', 'admin_fee', 'provider', 'payment_terms'],
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
 signature_date:'Dátum podpisu',signature_place:'Miesto podpisu'
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
  ...(kind==='contract_draft'?{passport_number:enquiry?.identity_document_number}:{}),
  ...(kind==='deposit_template'?{refund_iban:enquiry?.iban}:{}),
  monthly_rent:tenancy?.rent,deposit:staff?.deposit_eur,admin_fee:staff?.administration_fee_eur,
  ...extras
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
export async function workingDocument({kind,title,slug,data,attachment}) {
 const {PDFDocument}=await import('https://esm.sh/pdf-lib@1.17.1');
 const pdf=await PDFDocument.create();
 if(attachment&&kind==='rules_template'){
  const original=await PDFDocument.load(attachment);
  for(const page of await pdf.copyPages(original, original.getPageIndices()))pdf.addPage(page);
 }
 const optional={certificate_draft:['document_number'],deposit_template:['refund_iban']}[kind]||[];
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
