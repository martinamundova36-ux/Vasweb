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
  if(verified.bankAccounts[0]?.iban!==bank.iban||verified.amount!==amount||verified.paymentDueDate!==paymentDueDate||(bank.symbol&&verified.variableSymbol!==bank.symbol))throw Error('Platobné údaje v QR kóde sa nezhodujú.');
  return qr.default.toDataURL(value,{width:200,margin:4,errorCorrectionLevel:'M'});
 }));
}
async function demoImages(items){
 const {default:qr}=await import('https://esm.sh/qrcode@1.5.4');
 return Promise.all(items.map((_,i)=>qr.toDataURL('DEMO Student House Bratislava. Neplatobna ukazka '+(i+1),{width:200,margin:4,errorCorrectionLevel:'M'})));
}
async function pdfDocument(plan,person,items,bank,images){
 const {jsPDF}=await import('https://esm.sh/jspdf@3.0.4');
 const pdf=new jsPDF({format:'a4',compress:true});
 const qrImages=await Promise.all(images.map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;})));
 const total=items.reduce((sum,item)=>sum+Math.round(Number(item.amount)*100),0)/100;
 for(let offset=0;offset<items.length;offset+=5){
  if(offset)pdf.addPage();
  const canvas=node('canvas');canvas.width=1000;canvas.height=1414;
  const c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,1000,1414);
  c.fillStyle='#152d4d';c.fillRect(0,0,1000,160);c.fillStyle='#fff';c.font='24px sans-serif';
  c.fillText(bank.demo?'DEMO · NEPLATIŤ · Student House Bratislava':'Student House Bratislava',55,52,890);c.font='bold 38px sans-serif';
  c.fillText(plan.title||'Dohodnutý splátkový kalendár',55,110,890);
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
  c.font='20px sans-serif';c.fillText(bank.demo?'Ukážka · QR kód neobsahuje platobný príkaz.':'PAY by square · Pred potvrdením platby skontrolujte údaje.',55,1360,890);
  pdf.addImage(canvas,'PNG',0,0,210,297,undefined,'FAST');
 }
 return new File([pdf.output('blob')],bank.demo?'DEMO-splatkovy-kalendar.pdf':'splatkovy-kalendar.pdf',{type:'application/pdf'});
}
const recentAccounts=new Map();
const beneficiaries=['Student House Bratislava','Gargallo s.r.o.'];
export function attachInstallmentDocument(host,plan,person,items,{open=false,accountScope,roomCode=''}={}){
 if(!person||!items.length)return;
 const panel=node('details'),summary=node('summary','Splátkový kalendár s QR kódmi'),form=node('form');
 const inputs=[['Príjemca platby','beneficiary',70,true],['IBAN ubytovateľa','iban',42,true],['Variabilný symbol','symbol',10,false]];
 const fields={};
 for(const [label,key,max,required] of inputs){
  const wrapper=node('label',label),input=node(key==='beneficiary'?'select':'input');input.required=required;
  if(key==='beneficiary'){
   input.append(new Option('Vyber príjemcu',''));
   for(const name of beneficiaries)input.append(new Option(name,name));
  }else input.maxLength=max;
  if(key==='symbol'){input.value=roomCode;input.readOnly=true;}
  wrapper.append(input);form.append(wrapper);fields[key]=input;
 }
 const retry=node('button','Skúsiť znova'),demo=node('button','Ukážkové PDF bez platby'),status=node('p'),preview=node('div');
 demo.type='button';
 status.setAttribute('role','status');retry.type='button';retry.hidden=true;form.append(status,demo,retry,preview);
 let url,timeout,version=0,requested='';
 const accountKey=()=>accountScope&&fields.beneficiary.value?accountScope+':'+fields.beneficiary.value:'';
 function refresh(){
  clearTimeout(timeout);version++;requested='';retry.hidden=true;preview.replaceChildren();
  if(url){URL.revokeObjectURL(url);url=null;}
  const bank={beneficiary:fields.beneficiary.value.trim(),iban:fields.iban.value.replace(/\s/g,'').toUpperCase(),symbol:fields.symbol.value.trim()};
  if(!/^\d{1,10}$/.test(bank.symbol)){status.textContent='Chýba jednoznačný číselný kód pridelenej izby (najviac 10 číslic).';return;}
  if(!beneficiaries.includes(bank.beneficiary)||!validIban(bank.iban)){
   status.textContent='Vyber príjemcu a doplň jeho skutočný IBAN. PDF sa vytvorí automaticky.';return;
  }
  status.textContent='Vytváram dokument…';const run=version;
  timeout=setTimeout(()=>void generate(bank,run),300);
 }
 async function generate(bank,run){
  requested=bank.beneficiary+'|'+bank.iban;
  try{
   const images=bank.demo?await demoImages(items):await paymentImages(items,bank);
   const file=await pdfDocument(plan,person,items,bank,images);
   if(run!==version)return;
   if(accountScope&&!bank.demo)recentAccounts.set(accountScope+':'+bank.beneficiary,bank.iban);
   if(url)URL.revokeObjectURL(url);
   url=URL.createObjectURL(file);
   const download=node('a','Stiahnuť PDF');download.href=url;download.download=file.name;
   const send=node('button','Odoslať e-mailom');send.type='button';send.disabled=!person.email;
   send.addEventListener('click',()=>{
    const body='Dobrý deň, v prílohe nájdete splátkový kalendár Student House Bratislava.';
    location.href='mailto:'+encodeURIComponent(person.email)+'?subject='+encodeURIComponent(plan.title)+'&body='+encodeURIComponent(body);
    status.textContent='Pred odoslaním prilož stiahnuté PDF k rozpísanému e-mailu.';
   });
   preview.replaceChildren(download);
   if(!bank.demo)preview.append(send);
   if(!bank.demo&&navigator.canShare?.({files:[file]})){
    const share=node('button','Zdieľať PDF');share.type='button';
    share.addEventListener('click',()=>navigator.share({files:[file],title:plan.title}).catch(error=>{if(error.name!=='AbortError')status.textContent='PDF sa nepodarilo zdieľať.';}));
    preview.append(share);
   }
   for(const [index,src] of images.entries()){
    const figure=node('figure'),img=node('img');img.src=src;img.width=116;img.height=116;img.alt=(bank.demo?'Ukážkový QR kód':'PAY by square')+' · splátka '+(index+1);
    figure.append(img,node('figcaption',date(items[index].due_on)+' · '+money.format(Number(items[index].amount))+(items[index].description?' · '+items[index].description:'')));preview.append(figure);
   }
   status.textContent=bank.demo?'Ukážka je pripravená. QR kódy neslúžia na platbu.':'Dokument je pripravený.';
  }catch(error){if(run===version){status.textContent='Dokument sa nepodarilo vytvoriť. '+error.message;retry.hidden=false;}}
 }
 form.addEventListener('input',event=>{if(event.target!==fields.beneficiary)refresh();});
 fields.beneficiary.addEventListener('change',()=>{fields.iban.value=recentAccounts.get(accountKey())||'';refresh();});
 form.addEventListener('submit',event=>event.preventDefault());
 retry.addEventListener('click',refresh);
 demo.addEventListener('click',()=>{
  clearTimeout(timeout);preview.replaceChildren();retry.hidden=true;status.textContent='Vytváram ukážku…';
  void generate({beneficiary:fields.beneficiary.value||beneficiaries[0],iban:'SK00 0000 0000 0000 0000 0000',symbol:'',demo:true},++version);
 });
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
