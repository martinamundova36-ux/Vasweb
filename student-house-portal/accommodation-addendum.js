import {paymentImages} from './installment-document.js?v=20261126-register';
import {zip} from './excel.js?v=addendum';
import {advanceRentDueDate} from './ledger.js';
import {providerDetails,normalizeContractSymbol,officialRoomName} from './student-house-provider.js?v=20261127-official-room-names';

const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const xml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const date=value=>value.split('-').reverse().join('.');
const money=new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR'});
const monthName=new Intl.DateTimeFormat('sk-SK',{month:'long',year:'numeric',timeZone:'UTC'});
const paragraph=(text,{bold=false,center=false,size=22}={})=>`<w:p><w:pPr><w:spacing w:after="100"/>${center?'<w:jc w:val="center"/>':''}</w:pPr><w:r><w:rPr>${bold?'<w:b/>':''}<w:sz w:val="${size}"/></w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
const widths=[1300,1580,1200,1180,620,1050,1250,1740];
const table=rows=>`<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(edge=>`<w:${edge} w:val="single" w:sz="4" w:color="A8B8C9"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid>${widths.map(width=>`<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${rows.map((row,i)=>`<w:tr><w:trPr><w:cantSplit/>${i===0?'<w:tblHeader/>':''}</w:trPr>${row.map((text,column)=>`<w:tc><w:tcPr><w:tcW w:w="${widths[column]}" w:type="dxa"/></w:tcPr>${paragraph(text,{bold:i===0,size:18})}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;

function partiesTable(data,provider){
 const nameParts=data.name.trim().split(/\s+/);
 const firstName=data.firstName||nameParts.shift();
 const lastName=data.lastName||nameParts.join(' ');
 const columns=[
  ['Ubytovateľ:',[
   ['Meno:',provider.name],['So sídlom:',provider.address],['IČO:',provider.companyId],
   ['DIČ:',provider.taxId],['IČ DPH:',provider.vatId],['Zapísaná:',provider.register],
   ['Zastúpená:',provider.representatives],['Banka:',provider.bank],['IBAN:',provider.iban],['SWIFT (BIC):',provider.bic]
  ],'(ďalej len ako „ubytovateľ“)'],
  ['Ubytovaný:',[
   ['Meno:',firstName],['Priezvisko:',lastName],['Bydlisko:',data.address],
   ['Dátum narodenia:',data.birth],['Národnosť:',data.nationality],['Číslo OP/pasu:',data.identity],
   ['Kontakt:',data.phone],['E-mail:',data.email],['Kontakt na rodiča:',data.parent],
   ['Škola:',data.school],['IBAN:',data.iban]
  ],'(ďalej len ako „ubytovaný“)']
 ];
 const details=(label,value)=>`<w:p><w:r><w:t>${xml(label)}</w:t></w:r><w:r><w:tab/><w:t>${xml(value||'—')}</w:t></w:r></w:p>`;
 const borders=['top','left','bottom','right','insideV'].map(edge=>`<w:${edge} w:val="single" w:sz="4"/>`).join('');
 return `<w:tbl><w:tblPr><w:tblCaption w:val="Zmluvné strany"/><w:tblBorders>${borders}</w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="5000"/><w:gridCol w:w="5000"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr>${columns.map(([title,rows,closing])=>'<w:tc>'+paragraph(title,{bold:true})+rows.map(([label,value])=>details(label,value)).join('')+paragraph(closing,{bold:true})+'</w:tc>').join('')}</w:tr></w:tbl>`;
}

function addendumXml(data,provider,items=[]){
 const symbol=normalizeContractSymbol(data.contract);
 const validDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;
 if(!symbol||!validDate(data.from)||!validDate(data.to)||data.from>data.to||!Number.isFinite(data.rent)||data.rent<=0||!data.name.trim()||!data.room.trim())throw Error('Skontroluj číslo zmluvy, obdobie, izbu a mesačnú sumu.');
 const month=new Date(data.from.slice(0,7)+'-01T12:00:00Z');
 items.push({initial:true,amount:100});
 const rows=[['Dátum dodania / Supply day','Splatnosť / Due date','Variabilný symbol','Základ dane','DPH','Suma','Za mesiac','Účel platby'],
  ['Deň prijatia platby','Do 3 dní od podpisu dodatku',symbol,money.format(100),'',money.format(100),'','Administratívny poplatok']];
 for(let i=0;month.toISOString().slice(0,7)<=data.to.slice(0,7);i++){
  if(i>=24)throw Error('Skontroluj dĺžku predĺženia.');
  const dueOn=advanceRentDueDate(month.toISOString().slice(0,7));
  items.push({due_on:dueOn,amount:data.rent});
  const due=date(dueOn);
  rows.push([due,due,symbol,money.format(data.rent),'0 %',money.format(data.rent),monthName.format(month),'Splátka nájmu']);
  month.setUTCMonth(month.getUTCMonth()+1);
 }
 const heading=text=>paragraph(text,{bold:true,center:true});
 const paragraphs=[
  paragraph('DODATOK č. '+data.number,{bold:true,center:true,size:28}),
  heading('k ubytovacej zmluve č. '+data.contract.trim()),
  paragraph('Uzatvorenej v zmysle ust. § 754 a nasl. Občianskeho zákonníka v platnom znení',{center:true}),
  paragraph('(ďalej len „Dodatok k zmluve“)',{center:true}),
  heading('Článok č. I'),heading('Zmluvné strany'),
  partiesTable(data,provider),
  paragraph('Článok II – Predmet dodatku',{bold:true}),
  paragraph('Zmluvné strany sa dohodli, že týmto dodatkom sa mení nasledovné:'),
  paragraph('Článok III – Doba ubytovania',{bold:true}),
  paragraph('Dobu ubytovania si ubytovaný predlžuje na izbe '+[officialRoomName(data.roomType), 'č. '+data.room].filter(Boolean).join(', ')+' na dobu od '+date(data.from)+' do '+date(data.to)+'.'),
  paragraph('Článok IV – Cena a platobné podmienky',{bold:true}),
  paragraph('Mesačné nájomné: '+money.format(data.rent)+'. Administratívny poplatok: '+money.format(100)+', splatný do 3 dní od podpisu dodatku.'),
  paragraph('Dátumy splatnosti a platobné údaje sú uvedené v splátkovom kalendári nižšie.'),
  paragraph('Článok V – Záverečné ustanovenia',{bold:true}),
  paragraph('Tento Dodatok je vyhotovený v dvoch vyhotoveniach, z ktorých ubytovateľ obdrží jedno vyhotovenie a ubytovaný jedno vyhotovenie. Dodatok je platný dňom jeho podpisu oboma zmluvnými stranami.'),
  paragraph('Ostatné ustanovenia zmluvy o ubytovaní, ktoré nie sú týmto dodatkom upravené, zostávajú v platnosti bez zmeny.'),
  paragraph('Zmluvné strany prehlasujú, že si dodatok prečítali, jeho obsahu porozumeli, že bol uzavretý po vzájomnom súhlase.'),
  paragraph('V Bratislave, dňa: ____________________'),
  heading('Splátkový kalendár'),table(rows)
 ];
 return `<w:document xmlns:w="${ns}"><w:body>${paragraphs.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900"/></w:sectPr></w:body></w:document>`;
}

export function accommodationAddendum(data,provider){
 return zip({
  '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
  '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
  'word/document.xml':addendumXml(data,provider)
 });
}

export function nextAddendumStart(end){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(end||''))return '';
 return new Date(Date.UTC(Number(end.slice(0,4)),Number(end.slice(5,7)),1)).toISOString().slice(0,10);
}

export async function addendumPdf(data,provider){
 const items=[];
 const source=new DOMParser().parseFromString(addendumXml(data,provider,items),'application/xml');
 const [images,{jsPDF}]=await Promise.all([
  paymentImages(items,{iban:provider.iban,beneficiary:provider.name,symbol:normalizeContractSymbol(data.contract),message:data.name}),
  import('https://esm.sh/jspdf@3.0.4')
 ]);
 const qrImages=await Promise.all(images.map(src=>new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=src;
 })));
 const pdf=new jsPDF({format:'a4',compress:true});
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1697;
 const ctx=canvas.getContext('2d'),margin=86,width=1028;
 const logo=new Image();
 logo.src=new URL('./student-house-document-logo.png',import.meta.url).href;
 await logo.decode();
 let y,first=true;
 const clear=()=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#000';y=margin;};
 const flush=()=>{if(!first)pdf.addPage();pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297,undefined,'FAST');first=false;clear();};
 const space=height=>{if(y+height>canvas.height-margin)flush();};
 const wrap=(value,max)=>{
  const lines=[''];
  for(const word of value.trim().split(/\s+/)){
   if(lines.at(-1)&&ctx.measureText(lines.at(-1)+' '+word).width>max)lines.push(word);
   else lines[lines.length-1]+=(lines.at(-1)?' ':'')+word;
  }
  return lines;
 };
 const contents=part=>Array.from(part.getElementsByTagNameNS(ns,'t')).map(e=>e.textContent).join('');
 clear();
 const logoWidth=345,logoHeight=logoWidth*logo.naturalHeight/logo.naturalWidth;
 ctx.drawImage(logo,margin,y,logoWidth,logoHeight);y+=logoHeight+25;
 for(const part of source.getElementsByTagNameNS(ns,'body')[0].children){
  if(part.localName==='p'){
   const bold=part.getElementsByTagNameNS(ns,'b').length>0;
   const center=part.getElementsByTagNameNS(ns,'jc').length>0;
   const content=contents(part),size=Number(part.getElementsByTagNameNS(ns,'sz')[0]?.getAttributeNS(ns,'val')||22);
   const font=(bold?'bold ':'')+Math.round(size*1.03)+'px Calibri, Carlito, Arial, sans-serif';
   ctx.font=font;ctx.textAlign=center?'center':'left';
   const lines=wrap(content,width),step=Math.round(size*1.16);
   const signature=content.startsWith('V Bratislave, dňa:');
   space(lines.length*step+(signature?197:bold?105:12));
   ctx.font=font;ctx.textAlign=center?'center':'left';
   if(bold&&!center)y+=10;
   for(const line of lines){ctx.fillText(line,center?canvas.width/2:margin,y+step-7,width);y+=step;}
   y+=4;
   if(signature){
    ctx.textAlign='left';ctx.font='bold 26px Calibri, Carlito, Arial, sans-serif';
    const second=margin+width/2+40;
    ctx.fillText('Za ubytovateľa',margin,y+35);ctx.fillText('Ubytovaný',second,y+35);
    ctx.strokeStyle='#000';ctx.beginPath();
    for(const x of [margin,second]){ctx.moveTo(x,y+125);ctx.lineTo(x+390,y+125);}
    ctx.stroke();ctx.font='24px Calibri, Carlito, Arial, sans-serif';
    ctx.fillText(provider.representatives,margin,y+158,445);ctx.fillText(data.name,second,y+158,445);
    y+=190;flush();
   }
  }
  if(part.localName==='tbl'&&part.getElementsByTagNameNS(ns,'tblCaption').length){
   const half=width/2,padding=11,labelWidth=158,step=23;
   const regular='21px Calibri, Carlito, Arial, sans-serif',bold='bold '+regular;
   ctx.font=regular;ctx.textAlign='left';
   const cells=Array.from(part.getElementsByTagNameNS(ns,'tc'),cell=>
    Array.from(cell.getElementsByTagNameNS(ns,'p'),p=>{
     const [label,value]=Array.from(p.getElementsByTagNameNS(ns,'t'),node=>node.textContent);
     return {label,lines:value===undefined?[]:wrap(value,half-labelWidth-padding*2),bold:value===undefined||label==='Meno:'||label==='Priezvisko:'};
    }));
   const height=Math.max(...cells.map(rows=>rows.reduce((sum,row)=>sum+Math.max(1,row.lines.length)*step,0)))+padding*2;
   space(height+14);ctx.strokeStyle='#000';ctx.strokeRect(margin,y,width,height);
   ctx.beginPath();ctx.moveTo(margin+half,y);ctx.lineTo(margin+half,y+height);ctx.stroke();
   cells.forEach((rows,i)=>{
    const x=margin+i*half+padding;
    let top=y+padding;
    for(const row of rows){
     ctx.font=row.lines.length?regular:bold;ctx.fillText(row.label,x,top+18,half-padding*2);
     ctx.font=row.bold?bold:regular;
     row.lines.forEach((line,j)=>ctx.fillText(line,x+labelWidth,top+18+j*step,half-labelWidth-padding*2));
     top+=Math.max(1,row.lines.length)*step;
    }
   });
   y+=height+14;continue;
  }
  if(part.localName==='tbl'){
   ctx.textAlign='left';ctx.font='20px Calibri, Carlito, Arial, sans-serif';ctx.strokeStyle='#000';
   const qrWidth=140;
   const columnWidths=widths.map(n=>n*(width-qrWidth)/widths.reduce((total,value)=>total+value,0));
   const scheduleRows=Array.from(part.getElementsByTagNameNS(ns,'tr'));
   const cellsFor=row=>Array.from(row.getElementsByTagNameNS(ns,'tc')).map((cell,i)=>wrap(contents(cell),columnWidths[i]-14));
   const header=cellsFor(scheduleRows[0]);
   const rowHeight=cells=>Math.max(...cells.map(lines=>lines.length))*24+16;
   function drawScheduleRow(cells,height,qr){
    ctx.textAlign='left';ctx.strokeStyle='#000';
    let x=margin;
    cells.forEach((lines,i)=>{
     ctx.strokeRect(x,y,columnWidths[i],height);
     lines.forEach((line,n)=>ctx.fillText(line,x+7,y+24+n*24,columnWidths[i]-14));
     x+=columnWidths[i];
    });
    ctx.strokeRect(x,y,qrWidth,height);
    if(qr){
     ctx.imageSmoothingEnabled=false;
     ctx.drawImage(qr,x+6,y+6,128,128);
     ctx.imageSmoothingEnabled=true;
    }else ctx.fillText('QR platba',x+7,y+24);
    y+=height;
   }
   drawScheduleRow(header,rowHeight(header));
   for(const [index,row] of scheduleRows.slice(1).entries()){
    const cells=cellsFor(row),height=Math.max(qrWidth,rowHeight(cells));
    if(y+height>canvas.height-margin){
     flush();
     drawScheduleRow(header,rowHeight(header));
    }
    drawScheduleRow(cells,height,qrImages[index]);
   }
   y+=15;
  }
 }
 flush();
 return pdf.output('blob');
}

export function attachAccommodationAddendum(host,person,tenant,{trigger,show=false}={}){
 const provider=providerDetails(tenant);
 if(!provider||!person.name)return;
 const panel=document.createElement('dialog'),open=trigger||document.createElement('button'),title=document.createElement('h3'),form=document.createElement('form');
 panel.style.cssText='width:min(560px,90vw);max-height:85vh;overflow:auto;padding:20px;border:1px solid #cbd8e8;border-radius:12px';
 panel.setAttribute('aria-label','Vygenerovať dodatok');
 open.type='button';open.textContent='Vygenerovať dodatok';
 title.textContent='Dodatok k ubytovaniu · '+person.name;
 panel.append(title,form);
 const openPanel=()=>{document.body.append(panel);panel.showModal();};
 if(!trigger)open.addEventListener('click',openPanel);
 panel.addEventListener('close',()=>panel.remove());
 const field=(caption,type,value,required=true)=>{
  const label=document.createElement('label'),input=document.createElement('input');
  label.textContent=caption;input.type=type;input.value=value??'';input.required=required;label.append(input);form.append(label);return input;
 };
 const from=field('Od kedy','date',person.addendumFrom||nextAddendumStart(person.originalEnd));
 const duration=document.createElement('select'),durationLabel=document.createElement('label');
 durationLabel.textContent='Na koľko mesiacov';duration.required=true;durationLabel.append(duration);form.append(durationLabel);
 duration.add(new Option('Vyber dĺžku pobytu',''));
 for(const months of [5,10,12])duration.add(new Option(months+' mesiacov',String(months)));
 const endDate=document.createElement('output');
 const endLabel=document.createElement('p');endLabel.append('Vypočítaný koniec pobytu: ',endDate);form.append(endLabel);
 let end='';
 function updateEnd(){
  const months=Number(duration.value);
    end='';
  if(from.value&&[5,10,12].includes(months)){
   const [year,month]=from.value.split('-').map(Number);
   end=new Date(Date.UTC(year,month-1+months,months===12?-4:0)).toISOString().slice(0,10);
  }
  endDate.value=end?date(end):'—';
 }
 if(person.addendumFrom&&person.addendumTo){
  const [startYear,startMonth]=person.addendumFrom.split('-').map(Number);
  const [endYear,endMonth]=person.addendumTo.split('-').map(Number);
  duration.value=String((endYear-startYear)*12+endMonth-startMonth+1);
 }
 from.addEventListener('input',updateEnd);duration.addEventListener('change',updateEnd);updateEnd();
 const number=field('Číslo dodatku','number',person.addendumNumber||'1');number.min='1';number.step='1';
 const contract=field('Číslo pôvodnej zmluvy / VS','text',person.contract);
 const room=field('Izba','text',person.room);
 const roomType=field('Typ izby','text',officialRoomName(person.roomType),false);
 const address=field('Bydlisko ubytovaného','text',person.address,false);
 const extra={};
 for(const [key,label] of [['birth','Dátum narodenia'],['nationality','Národnosť'],['identity','Číslo OP/pasu'],['phone','Kontakt'],['email','E-mail'],['parent','Kontakt na rodiča'],['school','Škola'],['iban','IBAN ubytovaného']])extra[key]=field(label,'text',person[key],false);
 const rent=field('Mesačné nájomné (€)','number',person.addendumRent??person.rent);rent.min='0.01';rent.step='0.01';
 const save=document.createElement('button'),download=document.createElement('button');
 const close=document.createElement('button'),status=document.createElement('p');
 save.type=download.type=close.type='button';
 save.textContent='Zapísať dodatok';download.textContent='Stiahnuť dodatok';close.textContent='Zavrieť';
 close.addEventListener('click',()=>panel.close());
 status.setAttribute('role','status');form.append(save,download,close,status);
 save.disabled=!person.saveAddendum;
 if(save.disabled)status.textContent='K profilu chýba jednoznačne prepojený zapisovateľný riadok Excelu.';
 async function run(writeToExcel){
  if(download.disabled||!form.reportValidity()||!end)return;
  save.disabled=download.disabled=close.disabled=true;
  status.textContent=writeToExcel?'Zapisujem dodatok do Excelu…':'Pripravujem PDF dodatku…';
  try{
   const details=Object.fromEntries(Object.entries(extra).map(([key,input])=>[key,input.value]));
   const data={...person,...details,number:number.value,contract:contract.value,room:room.value,roomType:roomType.value,address:address.value,from:from.value,to:end,rent:rent.valueAsNumber};
   if(writeToExcel){
    addendumXml(data,provider);
    await person.saveAddendum(data);
    status.textContent='Dodatok je zapísaný v Exceli.';
   }else{
    const blob=await addendumPdf(data,provider);
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='Dodatok-'+data.number+'-'+normalizeContractSymbol(data.contract)+'.pdf';link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    status.textContent='PDF dodatku je pripravené.';
   }
  }catch(error){status.textContent=error.message||'Akciu sa nepodarilo dokončiť.';}
  finally{save.disabled=!person.saveAddendum;download.disabled=close.disabled=false;}
 }
 form.addEventListener('submit',event=>event.preventDefault());
 save.addEventListener('click',()=>void run(true));
 download.addEventListener('click',()=>void run(false));
 if(!trigger)host.append(open);
 if(show)openPanel();
}
