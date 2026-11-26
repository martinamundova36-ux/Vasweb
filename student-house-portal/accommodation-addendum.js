import {zip} from './excel.js?v=addendum';
import {advanceRentDueDate} from './ledger.js';
import {providerDetails,normalizeContractSymbol} from './student-house-provider.js';

const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const xml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const date=value=>value.split('-').reverse().join('.');
const money=new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR'});
const monthName=new Intl.DateTimeFormat('sk-SK',{month:'long',year:'numeric',timeZone:'UTC'});
const paragraph=(text,{bold=false,center=false,size=22}={})=>`<w:p><w:pPr><w:spacing w:after="100"/>${center?'<w:jc w:val="center"/>':''}</w:pPr><w:r><w:rPr>${bold?'<w:b/>':''}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
const widths=[1300,1580,1200,1180,620,1050,1250,1740];
const table=rows=>`<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(edge=>`<w:${edge} w:val="single" w:sz="4" w:color="A8B8C9"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid>${widths.map(width=>`<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${rows.map((row,i)=>`<w:tr><w:trPr><w:cantSplit/>${i===0?'<w:tblHeader/>':''}</w:trPr>${row.map((text,column)=>`<w:tc><w:tcPr><w:tcW w:w="${widths[column]}" w:type="dxa"/></w:tcPr>${paragraph(text,{bold:i===0,size:18})}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;

export function accommodationAddendum(data,provider){
 const symbol=normalizeContractSymbol(data.contract);
 const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
 if(!symbol||!validDate(data.from)||!validDate(data.to)||data.from>data.to||!Number.isFinite(data.rent)||data.rent<=0||!data.name.trim()||!data.room.trim())throw Error('Skontroluj číslo zmluvy, obdobie, izbu a mesačnú sumu.');
 const month=new Date(data.from.slice(0,7)+'-01T12:00:00Z');
 const rows=[['Dátum dodania / Supply day','Splatnosť / Due date','Variabilný symbol','Základ dane','DPH','Suma','Za mesiac','Účel platby'],
  ['Deň prijatia platby','Do 3 dní od podpisu dodatku',symbol,money.format(100),'',money.format(100),'','Administratívny poplatok']];
 for(let i=0;month.toISOString().slice(0,7)<=data.to.slice(0,7);i++){
  if(i>=24)throw Error('Skontroluj dĺžku predĺženia.');
  const due=date(advanceRentDueDate(month.toISOString().slice(0,7)));
  rows.push([due,due,symbol,money.format(data.rent),'0 %',money.format(data.rent),monthName.format(month),'Splátka nájmu']);
  month.setUTCMonth(month.getUTCMonth()+1);
 }
 const heading=text=>paragraph(text,{bold:true,center:true});
 const paragraphs=[
  paragraph('Dodatok č. '+data.number,{bold:true,center:true,size:30}),
  heading('k zmluve o ubytovaní č. '+symbol),
  paragraph('Uzatvorenej v zmysle ust. § 754 a nasl. Občianskeho zákonníka v platnom znení',{center:true}),
  heading('Článok č. I · Zmluvné strany'),
  paragraph('Ubytovateľ',{bold:true}),
  paragraph(provider.name+' · '+provider.address),
  paragraph('IČO '+provider.companyId+' · DIČ '+provider.taxId+' · IČ DPH '+provider.vatId),
  paragraph(provider.register),paragraph('Zastúpená: '+provider.representatives),
  paragraph(provider.bank+' · IBAN '+provider.iban+' · SWIFT/BIC '+provider.bic),
  paragraph('Ubytovaný',{bold:true}),paragraph(data.name),
  ...[data.address&&'Bydlisko: '+data.address,data.email&&'E-mail: '+data.email].filter(Boolean).map(text=>paragraph(text)),
  heading('Článok č. III · Predmet zmluvy'),
  paragraph('Zmluvné strany sa dohodli, že doba ubytovania sa predlžuje na izbe '+[data.roomType,data.room].filter(Boolean).join(', ')+' na dobu od '+date(data.from)+' do '+date(data.to)+'.'),
  heading('Splátkový kalendár'),table(rows),
  paragraph('Tento dodatok je vyhotovený v dvoch vyhotoveniach, z ktorých ubytovateľ obdrží jedno vyhotovenie a ubytovaný jedno vyhotovenie. Dodatok je platný dňom jeho podpisu oboma zmluvnými stranami.'),
  paragraph('Ostatné ustanovenia zmluvy o ubytovaní, ktoré nie sú týmto dodatkom upravené, zostávajú v platnosti bez zmeny.'),
  paragraph('Zmluvné strany prehlasujú, že si dodatok prečítali, jeho obsahu porozumeli a uzavreli ho po vzájomnom súhlase.'),
  paragraph('V Bratislave, dňa ____________________'),paragraph('Ubytovateľ ____________________       Ubytovaný ____________________')
 ];
 return zip({
  '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  'word/document.xml':`<w:document xmlns:w="${ns}"><w:body>${paragraphs.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900"/></w:sectPr></w:body></w:document>`
 });
}

export function attachAccommodationAddendum(host,person,tenant){
 const provider=providerDetails(tenant);
 if(!provider||!person.name)return;
 const panel=document.createElement('details'),summary=document.createElement('summary'),form=document.createElement('form');
 summary.textContent='Vygenerovať dodatok';panel.append(summary,form);
 const field=(caption,type,value,required=true)=>{
  const label=document.createElement('label'),input=document.createElement('input');
  label.textContent=caption;input.type=type;input.value=value??'';input.required=required;label.append(input);form.append(label);return input;
 };
 const number=field('Číslo dodatku','number','1');number.min='1';number.step='1';
 const contract=field('Číslo pôvodnej zmluvy / VS','text',person.contract);
 const room=field('Izba','text',person.room);
 const roomType=field('Typ izby','text',person.roomType,false);
 const address=field('Bydlisko ubytovaného','text',person.address,false);
 const from=field('Predĺženie od','date',''),to=field('Predĺženie do','date','');
 const rent=field('Mesačné nájomné (€)','number',person.rent);rent.min='0.01';rent.step='0.01';
 const submit=document.createElement('button'),status=document.createElement('p');
 submit.type='submit';submit.textContent='Stiahnuť dodatok (.docx)';status.setAttribute('role','status');form.append(submit,status);
 form.addEventListener('submit',event=>{
  event.preventDefault();
  try{
   const data={...person,number:number.value,contract:contract.value,room:room.value,roomType:roomType.value,address:address.value,from:from.value,to:to.value,rent:rent.valueAsNumber};
   const bytes=accommodationAddendum(data,provider),url=URL.createObjectURL(new Blob([bytes],{type:mime}));
   const link=document.createElement('a');link.href=url;link.download='Dodatok-'+number.value+'-'+normalizeContractSymbol(contract.value)+'.docx';link.click();
   setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent='Dodatok je pripravený.';
  }catch(error){status.textContent=error.message||'Dodatok sa nepodarilo vytvoriť.';}
 });
 host.append(panel);
}
