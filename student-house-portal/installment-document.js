const studentHouseLogo='data:image/png;base64,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';
const money=new Intl.NumberFormat('sk-SK',{style:'currency',currency:'EUR'});
const date=value=>value.split('-').reverse().join('.');
const node=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
function validIban(value){
 if(!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(value))return false;
 return [...(value.slice(4)+value.slice(0,4))].reduce((remainder,char)=>(remainder*(char>'9'?100:10)+(char>'9'?char.charCodeAt(0)-55:Number(char)))%97,0)===1;
}
async function paymentImages(items,bank){
 const [pay,qr]=await Promise.all([import('https://esm.sh/bysquare@4.0.0/pay'),import('https://esm.sh/qrcode@1.5.4')]);
 return Promise.all(items.map(async item=>{
  const amount=Number(item.amount),paymentDueDate=item.due_on.replaceAll('-','');
  if(!Number.isFinite(amount)||amount<=0||!/^\d{8}$/.test(paymentDueDate))throw Error('Neplatná splátka.');
  const value=pay.encode({payments:[{type:pay.PaymentOptions.PaymentOrder,amount,currencyCode:pay.CurrencyCode.EUR,
   paymentDueDate,bankAccounts:[{iban:bank.iban}],beneficiary:{name:bank.beneficiary},...(bank.symbol?{variableSymbol:bank.symbol}:{})}]});
  const verified=pay.decode(value).payments[0];
  if(verified.bankAccounts[0]?.iban!==bank.iban||verified.amount!==amount||verified.currencyCode!==pay.CurrencyCode.EUR||verified.paymentDueDate!==paymentDueDate||(bank.symbol&&verified.variableSymbol!==bank.symbol))throw Error('Platobné údaje v QR kóde sa nezhodujú.');
  return qr.default.toDataURL(value,{width:200,margin:4,errorCorrectionLevel:'M'});
 }));
}
async function pdfDocument(plan,person,items,bank,images){
 const {jsPDF}=await import('https://esm.sh/jspdf@3.0.4');
 const pdf=new jsPDF({format:'a4',compress:true});
 const [logo,...qrImages]=await Promise.all([studentHouseLogo,...images].map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;})));
 const total=items.reduce((sum,item)=>sum+Math.round(Number(item.amount)*100),0)/100;
 for(let offset=0;offset<items.length;offset+=5){
  if(offset)pdf.addPage();
  const canvas=node('canvas');canvas.width=1000;canvas.height=1414;
  const c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,1000,1414);
  c.drawImage(logo,55,28,340,340*logo.height/logo.width);
  c.fillStyle='#152d4d';c.fillRect(0,105,1000,55);c.fillStyle='#fff';c.font='bold 32px sans-serif';
  c.fillText(plan.title||'Dohodnutý splátkový kalendár',55,143,890);
  c.fillStyle='#152d4d';c.font='25px sans-serif';
  const header=['Študent: '+(person.full_name||'—'),'Príjemca: '+bank.beneficiary,'IBAN: '+bank.iban,
   'Variabilný symbol: '+(bank.symbol||'—'),'Celková suma: '+money.format(total)];
  header.forEach((line,i)=>c.fillText(line,55,210+i*40,890));
  for(let i=offset;i<Math.min(offset+5,items.length);i++){
   const y=415+(i-offset)*175;
   c.fillStyle='#eef3f9';c.fillRect(55,y,890,160);
   c.fillStyle='#152d4d';c.font='bold 28px sans-serif';
   c.fillText('Splátka '+(i+1)+' / '+items.length,75,y+43);
   c.font='25px sans-serif';c.fillText('Splatnosť: '+date(items[i].due_on),75,y+84);
   c.fillText('Suma: '+money.format(Number(items[i].amount)),75,y+124);
   if(items[i].description){c.font='17px sans-serif';c.fillText(items[i].description,75,y+149,655);}
   c.drawImage(qrImages[i],755,y+4,152,152);
  }
  c.font='20px sans-serif';c.fillText('PAY by square · Pred potvrdením platby skontrolujte údaje.',55,1360,890);
  pdf.addImage(canvas,'PNG',0,0,210,297,undefined,'FAST');
 }
 return new File([pdf.output('blob')],'splatkovy-kalendar.pdf',{type:'application/pdf'});
}
const recentAccounts=new Map();
const beneficiaries=['Student House Bratislava','Gargallo s.r.o.'];
export function attachInstallmentDocument(host,plan,person,items,{open=false,accountScope,contractNumber='',sendPdf}={}){
 if(!person||!items.length)return;
 const panel=node('details'),summary=node('summary','Splátkový kalendár s QR kódmi'),form=node('form');
 const inputs=[['Príjemca platby','beneficiary',70,true],['IBAN ubytovateľa','iban',42,true],['Variabilný symbol (číslo zmluvy)','symbol',10,false]];
 const fields={};
 for(const [label,key,max,required] of inputs){
  const wrapper=node('label',label),input=node(key==='beneficiary'?'select':'input');input.required=required;
  if(key==='beneficiary'){
   input.append(new Option('Vyber príjemcu',''));
   for(const name of beneficiaries)input.append(new Option(name,name));
  }else input.maxLength=max;
  if(key==='symbol'){input.value=String(contractNumber??'').trim();input.readOnly=true;}
  wrapper.append(input);form.append(wrapper);fields[key]=input;
 }
 const retry=node('button','Skúsiť znova'),status=node('p'),preview=node('div');
 status.setAttribute('role','status');retry.type='button';retry.hidden=true;form.append(status,retry,preview);
 let url,timeout,version=0,requested='';
 const accountKey=()=>accountScope&&fields.beneficiary.value?accountScope+':'+fields.beneficiary.value:'';
 function refresh(){
  clearTimeout(timeout);version++;requested='';retry.hidden=true;preview.replaceChildren();
  if(url){URL.revokeObjectURL(url);url=null;}
  const bank={beneficiary:fields.beneficiary.value.trim(),iban:fields.iban.value.replace(/\s/g,'').toUpperCase(),symbol:fields.symbol.value.trim()};
  if(!/^\d{1,10}$/.test(bank.symbol)){status.textContent='Chýba overené číselné číslo zmluvy (1 až 10 číslic).';return;}
  if(!beneficiaries.includes(bank.beneficiary)||!validIban(bank.iban)){
   status.textContent='Vyber príjemcu a doplň jeho skutočný IBAN. PDF sa vytvorí automaticky.';return;
  }
  status.textContent='Vytváram dokument…';const run=version;
  timeout=setTimeout(()=>void generate(bank,run),300);
 }
 async function generate(bank,run){
  requested=bank.beneficiary+'|'+bank.iban;
  try{
   const images=await paymentImages(items,bank);
   const file=await pdfDocument(plan,person,items,bank,images);
   if(run!==version)return;
   if(accountScope)recentAccounts.set(accountScope+':'+bank.beneficiary,bank.iban);
   if(url)URL.revokeObjectURL(url);
   url=URL.createObjectURL(file);
   const download=node('button','Stiahnuť PDF');download.type='button';
   download.addEventListener('click',()=>{
    const link=node('a');link.href=url;link.download=file.name;link.click();
   });
   const actions=node('div');actions.style.cssText='display:flex;flex-wrap:wrap;gap:10px;align-items:center';
   const recipient=String(person.email||'').trim();
   const send=node('button','Odoslať e-mailom');send.type='button';send.disabled=!/^[^@\s,;]+@[^@\s,;]+\.[^@\s,;]+$/.test(recipient);
   send.addEventListener('click',async()=>{
    if(!sendPdf||!window.confirm('Odoslať kalendár s PDF na '+recipient+'?'))return;
    send.disabled=true;status.textContent='Odosielam e-mail…';
    try{
     const {data,error}=await sendPdf(person.id,file);
     if(error||!data?.ok)throw Error('send');
     status.textContent='Poštový server prijal e-mail pre '+recipient+'.';
    }catch{status.textContent='E-mail sa nepodarilo odoslať cez poštový server.';}
    finally{send.disabled=false;}
   });
   const draft=node('button','Stiahnuť e-mail s PDF');draft.type='button';draft.disabled=send.disabled;
   draft.addEventListener('click',async()=>{
    draft.disabled=true;
    try{
     const encode=bytes=>{let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);};
     const text=value=>encode(new TextEncoder().encode(value));
     const wrap=value=>value.match(/.{1,76}/g)?.join('\r\n')||'';
     const boundary='webu-'+crypto.randomUUID();
     const message=['X-Unsent: 1','To: '+recipient,'Subject: =?UTF-8?B?'+text(plan.title||'Splátkový kalendár')+'?=','MIME-Version: 1.0',
      'Content-Type: multipart/mixed; boundary="'+boundary+'"','','--'+boundary,'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64','',wrap(text('Dobrý deň, v prílohe nájdete splátkový kalendár Student House Bratislava.')),
      '--'+boundary,'Content-Type: application/pdf; name="splatkovy-kalendar.pdf"','Content-Disposition: attachment; filename="splatkovy-kalendar.pdf"',
      'Content-Transfer-Encoding: base64','',wrap(encode(new Uint8Array(await file.arrayBuffer()))),'--'+boundary+'--',''].join('\r\n');
     const link=node('a'),draftUrl=URL.createObjectURL(new Blob([message],{type:'message/rfc822'}));
     link.href=draftUrl;link.download='splatkovy-kalendar.eml';link.click();
     setTimeout(()=>URL.revokeObjectURL(draftUrl),30000);
     status.textContent='Stiahnutý e-mail obsahuje adresu študenta aj PDF prílohu.';
    }catch{status.textContent='E-mailový súbor sa nepodarilo pripraviť.';}
    finally{draft.disabled=false;}
   });
   actions.append(download,send,draft);preview.replaceChildren(actions);
   if(navigator.canShare?.({files:[file]})){
    const share=node('button','Zdieľať PDF');share.type='button';
    share.addEventListener('click',()=>navigator.share({files:[file],title:plan.title}).catch(error=>{if(error.name!=='AbortError')status.textContent='PDF sa nepodarilo zdieľať.';}));
    actions.append(share);
   }
   for(const [index,src] of images.entries()){
    const figure=node('figure'),img=node('img');img.src=src;img.width=116;img.height=116;img.alt='PAY by square · splátka '+(index+1);
    figure.append(img,node('figcaption',date(items[index].due_on)+' · '+money.format(Number(items[index].amount))+(items[index].description?' · '+items[index].description:'')));preview.append(figure);
   }
   status.textContent='Platobné PDF je pripravené.';
  }catch(error){if(run===version){status.textContent='Dokument sa nepodarilo vytvoriť. '+error.message;retry.hidden=false;}}
 }
 form.addEventListener('input',event=>{if(event.target!==fields.beneficiary)refresh();});
 fields.beneficiary.addEventListener('change',()=>{fields.iban.value=recentAccounts.get(accountKey())||'';refresh();});
 form.addEventListener('submit',event=>event.preventDefault());
 retry.addEventListener('click',refresh);
 function prepare(){
  const cached=recentAccounts.get(accountKey());
  if(cached&&!fields.iban.value)fields.iban.value=cached;
  if(!requested)refresh();
 }
 panel.addEventListener('toggle',()=>{if(panel.open)prepare();});
 panel.open=open;
 panel.append(summary,form);host.append(panel);
 if(open)prepare();
 return panel;
}
