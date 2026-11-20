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
  c.fillText('Student House Bratislava',55,52,890);c.font='bold 38px sans-serif';
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
   c.drawImage(qrImages[i],755,y+4,152,152);
  }
  c.font='20px sans-serif';c.fillText('PAY by square · Pred potvrdením platby skontrolujte údaje.',55,1360,890);
  pdf.addImage(canvas,'PNG',0,0,210,297,undefined,'FAST');
 }
 return new File([pdf.output('blob')],'splatkovy-kalendar.pdf',{type:'application/pdf'});
}
export function attachInstallmentDocument(host,plan,person,items){
 if(!person||!items.length)return;
 const panel=node('details'),summary=node('summary','Splátkový kalendár s QR kódmi'),form=node('form');
 const inputs=[['Príjemca platby','beneficiary',70,true],['IBAN ubytovateľa','iban',42,true],['Variabilný symbol','symbol',10,false]];
 const fields={};
 for(const [label,key,max,required] of inputs){
  const wrapper=node('label',label),input=node('input');input.required=required;input.maxLength=max;
  if(key==='symbol'){input.inputMode='numeric';input.pattern='[0-9]{1,10}';}
  wrapper.append(input);form.append(wrapper);fields[key]=input;
 }
 const create=node('button','Vytvoriť PDF s QR kódmi'),status=node('p'),preview=node('div');
 status.setAttribute('role','status');create.type='submit';form.append(create,status,preview);
 let url;
 form.addEventListener('input',()=>{preview.replaceChildren();if(url){URL.revokeObjectURL(url);url=null;}});
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const bank={beneficiary:fields.beneficiary.value.trim(),iban:fields.iban.value.replace(/\s/g,'').toUpperCase(),symbol:fields.symbol.value.trim()};
  if(!bank.beneficiary||!validIban(bank.iban)){status.textContent='Skontroluj meno príjemcu a IBAN ubytovateľa.';return;}
  create.disabled=true;for(const field of Object.values(fields))field.disabled=true;
  status.textContent='Vytváram dokument…';
  try{
   const images=await paymentImages(items,bank);
   const file=await pdfDocument(plan,person,items,bank,images);
   if(url)URL.revokeObjectURL(url);
   url=URL.createObjectURL(file);
   const download=node('a','Stiahnuť PDF');download.href=url;download.download=file.name;
   const send=node('button','Odoslať e-mailom');send.type='button';send.disabled=!person.email;
   send.addEventListener('click',()=>{
    const body='Dobrý deň, v prílohe nájdete schválený splátkový kalendár Student House Bratislava.';
    location.href='mailto:'+encodeURIComponent(person.email)+'?subject='+encodeURIComponent(plan.title)+'&body='+encodeURIComponent(body);
    status.textContent='Pred odoslaním prilož stiahnuté PDF k rozpísanému e-mailu.';
   });
   preview.replaceChildren(download,send);
   if(navigator.canShare?.({files:[file]})){
    const share=node('button','Zdieľať PDF');share.type='button';
    share.addEventListener('click',()=>navigator.share({files:[file],title:plan.title}).catch(error=>{if(error.name!=='AbortError')status.textContent='PDF sa nepodarilo zdieľať.';}));
    preview.append(share);
   }
   for(const [index,src] of images.entries()){
    const figure=node('figure'),img=node('img');img.src=src;img.width=116;img.height=116;img.alt='PAY by square · splátka '+(index+1);
    figure.append(img,node('figcaption',date(items[index].due_on)+' · '+money.format(Number(items[index].amount))));preview.append(figure);
   }
   status.textContent='Dokument je pripravený.';
  }catch(error){status.textContent='Dokument sa nepodarilo vytvoriť. '+error.message;}
  finally{create.disabled=false;for(const field of Object.values(fields))field.disabled=false;}
 });
 panel.append(summary,form);host.append(panel);
}
