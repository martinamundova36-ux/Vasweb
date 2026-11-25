import {paymentImages,studentHouseLogo} from './installment-document.js?v=parking-payment';
import {providerDetails} from './student-house-provider.js';
import {downloadWorkbook} from './excel.js';
const words = {
 sk:['Žiadosti z formulára','Otvoriť parkovací formulár','Zatiaľ tu nie sú žiadosti.','Excel 2025–2026 · testovacie údaje','Meno','EČV','E-mail','Telefón','Od','Do','Suma (€)','Stav','Poznámka','Záznam z Excelu'],
 en:['Form requests','Open parking form','No requests yet.','Excel 2025–2026 · test data','Name','Registration plate','Email','Phone','From','To','Amount (€)','Status','Note','Excel entry'],
 ru:['Заявки из формы','Открыть форму парковки','Заявок пока нет.','Excel 2025–2026 · тестовые данные','Имя','Номер автомобиля','Почта','Телефон','С','По','Сумма (€)','Статус','Примечание','Запись Excel'],
 uk:['Заявки з форми','Відкрити форму паркування','Заявок поки немає.','Excel 2025–2026 · тестові дані','Ім’я','Номер авто','Пошта','Телефон','З','До','Сума (€)','Статус','Примітка','Запис Excel']
};
function element(tag, text) {
 const node = document.createElement(tag);
 if (text != null) node.textContent = String(text);
 return node;
}
function appendTable(root, headers, rows, appendActions) {
 const scroll = element('div');
 scroll.style.overflowX = 'auto';
 const table = element('table');
 const header = table.createTHead().insertRow();
 for (const title of headers) {
  const cell = element('th', title);
  cell.scope = 'col';
  header.append(cell);
 }
 const body = table.createTBody();
 for (const [index,values] of rows.entries()) {
  const row = body.insertRow();
  for (const value of values) row.append(element('td', value));
  if(appendActions)row.append(appendActions(row,index));
 }
 scroll.append(table);
 root.append(scroll);
}
const editWords = {
 sk:['Klikni na bunku testovacieho záznamu a uprav hodnotu.','Upraviť bunku','Hodnota','Uložiť','Zrušiť','Uloženie zlyhalo. Skús znova.'],
 en:['Select a cell in a test record to edit it.','Edit cell','Value','Save','Cancel','Could not save. Try again.'],
 ru:['Выберите ячейку тестовой записи для изменения.','Изменить ячейку','Значение','Сохранить','Отмена','Не удалось сохранить. Повторите попытку.'],
 uk:['Виберіть клітинку тестового запису для редагування.','Редагувати клітинку','Значення','Зберегти','Скасувати','Не вдалося зберегти. Спробуйте ще раз.']
};
function editCell(root, copy, heading, value, save) {
 const [,title,label,saveLabel,cancelLabel,errorLabel]=copy;
 const dialog=element('dialog');
 dialog.className='parking-edit-dialog';
 const form=element('form');
 const input=element('textarea');
 input.name='value';
 input.maxLength=2000;
 input.value=value??'';
 const field=element('label',label);
 field.append(input);
 const error=element('p');
 error.setAttribute('role','alert');
 const cancel=element('button',cancelLabel);
 cancel.type='button';
 cancel.addEventListener('click',()=>dialog.close());
 const submit=element('button',saveLabel);
 submit.type='submit';
 form.append(element('h3',title+' · '+heading),field,error,cancel,submit);
 dialog.append(form);
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 dialog.addEventListener('cancel',event=>{if(submit.disabled)event.preventDefault();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  submit.disabled=cancel.disabled=input.disabled=true;
  error.textContent='';
  try {
   await save(input.value);
   dialog.close();
  } catch {
   error.textContent=errorLabel;
   submit.disabled=cancel.disabled=input.disabled=false;
  }
 });
 root.append(dialog);
 dialog.showModal();
 input.focus();
 input.select();
}

function parkingIdentity(value) {
 const match=/^(.*?)[\t ]{2,}(\S.*)$/s.exec(String(value??'').trimEnd());
 if(match)return [match[1].trim(),match[2]];
 return [String(value??''),''];
}

function appendWorkbookGrid(root, history, copy, saveCell, headers, rowActions) {
 const style=element('style', `
 .parking-workbook {width:100%; max-width:100%; max-height:min(70vh,880px); overflow:auto; border:1px solid #cfdaea; border-radius:13px; margin-bottom:1.5rem}
 .parking-workbook table {border-collapse:separate; border-spacing:0; width:max-content; min-width:100%; color:#142b4d; font:inherit; font-size:14px}
 .parking-workbook :is(th,td) {padding:0; border-right:1px solid #d5e1ef; border-bottom:1px solid #d5e1ef; min-width:78px; background:#fff; vertical-align:middle; text-align:left}
 .parking-workbook th {position:sticky; top:0; z-index:3; padding:14px 12px; background:#c5dfb4; text-transform:uppercase; font-weight:800}
 .parking-workbook td:first-child {padding:0 12px; font-weight:800}
 .parking-workbook tr:nth-child(odd) td {background:#e2efda}
 .parking-workbook tr:nth-child(odd) td:nth-child(-n+3) {background:#c5dfb4}
 .parking-workbook :is(th,td):nth-child(2) {min-width:12rem}
 .parking-workbook :is(th,td):nth-child(3) {min-width:9rem}
 .parking-workbook td.parking-note {background:#fff2cc}
 .parking-workbook .parking-edit-cell {display:block; width:100%; min-height:44px; padding:10px 12px; border:0; border-radius:0; background:transparent; color:inherit; font:inherit; text-align:inherit; overflow-wrap:anywhere; cursor:pointer}
 .parking-workbook .parking-edit-cell:hover,.parking-workbook .parking-edit-cell:focus-visible {outline:2px solid #215c39; outline-offset:-2px}
 .parking-edit-dialog {width:min(28rem,90vw); padding:1rem; border:1px solid #899aaa; border-radius:10px}
 .parking-edit-dialog textarea {display:block; width:100%; min-height:4rem}
 .parking-edit-dialog button {margin-right:.5rem}
 .parking-toolbar {display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:12px 0}
 .parking-toolbar input {flex:1 1 16rem; width:auto}
 `);
 const scroll=element('div');
 scroll.className='parking-workbook';
 scroll.tabIndex=0;
 const table=element('table');
 const head=table.createTHead().insertRow();
 for(const title of headers){
  const cell=element('th',title);
  cell.scope='col';
  head.append(cell);
 }
 const body=table.createTBody();
 for(const record of history){
  const row=body.insertRow();
  row.append(element('td',record.year));
  const values=[...parkingIdentity(record.entry),...record.months];
  for(const [index,value] of values.entries()){
   const cell=element('td');
   const button=element('button',value??'—');
   const heading=headers[index<2?index+1:index+2];
   button.type='button';
   button.className='parking-edit-cell';
   function display(next){
    button.textContent=next||next===0?next:'—';
    button.setAttribute('aria-label',copy[1]+' · '+heading+' · '+(next??''));
    cell.classList.toggle('parking-note',index>=2&&typeof next==='string'&&next.trim()!=='');
   }
   display(value);
   cell.append(button);
   row.append(cell);
   button.addEventListener('click',()=>{
    const fields=parkingIdentity(record.entry);
    const previous=index<2?fields[index]:record.months[index-2];
    editCell(root,copy,heading,previous,async text=>{
     if(index<2){
      fields[index]=text.trim();
      const entry=fields[1]?fields.join('  '):fields[0];
      await saveCell(record.id,0,entry);
      record.entry=entry;
      display(fields[index]);
      return;
     }
     const trimmed=text.trim();
     const number=/^-?(?:\d+|\d+[.,]\d+)$/.test(trimmed)?Number(trimmed.replace(',','.')):NaN;
     const next=!trimmed?null:Number.isFinite(number)?number:text;
     await saveCell(record.id,index-1,next);
     record.months[index-2]=next;
     display(next);
    });
   });
  }
 }
  for(const [index,row] of Array.from(body.rows).entries())row.insertBefore(rowActions(row,history[index]),row.cells[3]);
 scroll.append(table);
 root.append(style,scroll);
}

const actionWords={
 sk:['Akcie','Vymazať','Pripraviť faktúru','Natrvalo vymazať tento záznam?','Vymazanie zlyhalo.','Návrh faktúry – parkovanie','Odberateľ','EČV','Obdobie','Suma (€)','Tlačiť návrh','Zavrieť','Pracovný podklad k faktúre'],
 en:['Actions','Delete','Prepare invoice','Permanently delete this record?','Deletion failed.','Draft invoice – parking','Customer','Registration plate','Period','Amount (€)','Print draft','Close','Invoice working document'],
 ru:['Действия','Удалить','Подготовить счёт','Удалить эту запись навсегда?','Не удалось удалить запись.','Черновик счёта – парковка','Клиент','Номер автомобиля','Период','Сумма (€)','Печать черновика','Закрыть','Рабочий документ для счёта'],
 uk:['Дії','Видалити','Підготувати рахунок','Видалити цей запис назавжди?','Не вдалося видалити запис.','Чернетка рахунку – паркування','Клієнт','Номер авто','Період','Сума (€)','Друк чернетки','Закрити','Робочий документ для рахунку']
};
const billingWords={
 sk:['Dodávateľ','Fakturačná adresa','Číslo faktúry','Dátum vystavenia','Dátum dodania','Splatnosť','Počet mesiacov','Cena za mesiac bez DPH','Základ bez DPH','DPH (23 %)','Celkom s DPH','Variabilný symbol','Prenájom parkovacieho miesta'],
 en:['Supplier','Billing address','Invoice number','Issue date','Supply date','Due date','Months','Monthly price excl. VAT','Net amount','VAT (23%)','Total incl. VAT','Payment reference','Parking space rental'],
 ru:['Поставщик','Платёжный адрес','Номер счёта','Дата выставления','Дата оказания услуги','Срок оплаты','Месяцев','Цена за месяц без НДС','Сумма без НДС','НДС (23%)','Итого с НДС','Код платежа','Аренда парковочного места'],
 uk:['Постачальник','Платіжна адреса','Номер рахунку','Дата виставлення','Дата надання послуги','Строк оплати','Місяців','Ціна за місяць без ПДВ','Сума без ПДВ','ПДВ (23%)','Разом з ПДВ','Код платежу','Оренда паркомісця']
};

function invoiceDraft(root,labels,data,lang,provider) {
 const [,,,,,,customer,plate,period,,,close]=labels;
 const [title,print,addressHint,documentNote]=({
  sk:['Faktúra za parkovanie','Tlačiť faktúru','Ulica, číslo, PSČ, mesto a krajina','Číslo prevzaté z účtovníctva'],
  en:['Parking invoice','Print invoice','Street, number, postal code, city and country','Invoice number from accounting'],
  ru:['Счёт за парковку','Печать счёта','Улица, дом, индекс, город и страна','Номер из бухгалтерии'],
  uk:['Рахунок за паркування','Друк рахунку','Вулиця, номер, індекс, місто та країна','Номер із бухгалтерії']
 })[lang]||['Faktúra za parkovanie','Tlačiť faktúru','Ulica, číslo, PSČ, mesto a krajina','Číslo prevzaté z účtovníctva'];
 const [supplier,address,number,issued,delivered,due,months,unit,net,vat,total,reference,service]=billingWords[lang]||billingWords.sk;
 const supplierLines=[provider.name,provider.address,'IČO '+provider.companyId+' · DIČ '+provider.taxId+' · IČ DPH '+provider.vatId,provider.register,provider.bank,'SWIFT/BIC '+provider.bic];
 const dialog=element('dialog');
 dialog.className='parking-edit-dialog';
 const form=element('form');
 const fields=new Map();
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bratislava'}).format(new Date());
 for(const [label,value,type,required] of [
  [customer,data.name,'text',true],[address,'','text',true],[plate,data.plate,'text',false],
  [period,/^\d{4}$/.test(data.period||'')?'':data.period,'text',true],
  [number,'','text',true],[issued,today,'date',true],[delivered,'','date',true],[due,'','date',true],
  ['IČO','','text',false],['DIČ','','text',false],['IČ DPH','','text',false],[months,data.months||1,'number',true],
  ['IBAN',provider.iban,'text',false],[reference,'','text',false]
 ]){
  const field=element('label',label);
  const input=element('input');
  input.type=type;
  input.value=value??'';
  input.required=required;
  if(label==='IBAN')input.readOnly=true;
  if(type==='text'){
   input.maxLength=label===address?240:120;
   if(required)input.pattern='.*\\S.*';
  }
  if(label===address){
   input.placeholder=addressHint;
   input.pattern='.*[\\p{L}].*';
  }
  if(label===number)input.placeholder=documentNote;
  if(type==='number'){input.min='1';input.max='120';input.step='1';}
  fields.set(label,input);
  field.append(input);
  form.append(field);
 }
 const money=new Intl.NumberFormat(({sk:'sk-SK',en:'en-IE',ru:'ru-RU',uk:'uk-UA'})[lang]||'sk-SK',{style:'currency',currency:'EUR'});
 const totals=element('p');
 totals.setAttribute('aria-live','polite');
 function amounts(){
  const base=5000*fields.get(months).valueAsNumber;
  const tax=Math.round(base*23/100);
  return [[net,base],[vat,tax],[total,base+tax]].map(([label,cents])=>[label,money.format(cents/100)]);
 }
 function updateTotals(){
  const input=fields.get(months);
  totals.textContent=input.value&&input.validity.valid?amounts().map(([label,value])=>label+' '+value).join(' · '):'';
 }
 fields.get(number).addEventListener('input',()=>{
  const value=fields.get(number).value.trim();
  fields.get(reference).value=/^\d{1,10}$/.test(value)?value:'';
 });
 fields.get(reference).pattern='[0-9]{1,10}';
 fields.get(reference).maxLength=10;
 fields.get(months).addEventListener('input',updateTotals);
 updateTotals();
 const cancel=element('button',close);
 cancel.type='button';
 cancel.addEventListener('click',()=>dialog.close());
 const submit=element('button',print);
 submit.type='submit';
 const feedback=element('p');
 feedback.setAttribute('role','alert');
 form.append(totals,feedback,submit,cancel);
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const paper=window.open('','_blank');
  if(!paper)return;
  paper.opener=null;
  paper.document.title=title;
  const doc=paper.document;
  const add=(tag,value,parent=doc.body)=>{
   const node=doc.createElement(tag);
   node.textContent=value;
   parent.append(node);
   return node;
  };
  add('style','@page{size:A4;margin:16mm} body{font:11pt system-ui,sans-serif;color:#142b4d;max-width:760px;margin:12px auto;padding:8px;overflow-wrap:anywhere} h1{font-size:22pt;margin:0 0 5px} h2{font-size:13pt;margin:18px 0 6px} p{margin:4px 0} dl{display:grid;grid-template-columns:38% 1fr;gap:5px 10px;margin:8px 0 14px} dd{margin:0} .total{font-size:1.22em;font-weight:700;border-top:1px solid;padding-top:8px} @media print{body{margin:0;padding:0}}',doc.head);
  const logo=add('img','');
  logo.src=studentHouseLogo;
  logo.alt='Student House Bratislava';
  logo.style.cssText='display:block;width:220px;max-width:100%;margin-bottom:15px';
  add('h1',title);
  add('p',number+' '+fields.get(number).value.trim());
  add('h2',supplier);
  for(const line of supplierLines)add('p',line);
  add('h2',service+' · Tomášikova 34');
  const details=add('dl','');
  for(const [label,input] of fields){
   if(label===number||!input.value.trim())continue;
   add('dt',label,details);
   const value=input.type==='date'?input.value.split('-').reverse().join('.'):input.value.trim();
   add('dd',value,details);
  }
  add('p',unit+' '+money.format(50));
  for(const [label,value] of amounts())add('p',label+' '+value).className=label===total?'total':'';
  submit.disabled=true;
  feedback.textContent='';
  try{
   const baseCents=5000*fields.get(months).valueAsNumber;
   const [image]=await paymentImages([{amount:(baseCents+Math.round(baseCents*23/100))/100,due_on:fields.get(due).value}],{
    iban:provider.iban,beneficiary:provider.name,symbol:fields.get(reference).value,message:fields.get(number).value
   });
   const qr=add('img','');
   qr.src=image;
   qr.alt='PAY by square';
   qr.style.cssText='display:block;width:33mm;margin-top:8px';
   await Promise.all([logo.decode(),qr.decode()]);
   paper.print();
  }catch{
   paper.close();
   feedback.textContent=({sk:'Platobný QR kód sa nepodarilo vytvoriť.',en:'Could not generate the payment QR code.',ru:'Не удалось создать платёжный QR-код.',uk:'Не вдалося створити платіжний QR-код.'})[lang];
  }finally{
   submit.disabled=false;
  }
 });
 dialog.append(element('h3',title),element('p',supplier+' · '+supplierLines[0]),element('p',unit+' '+money.format(50)),form);
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 root.append(dialog);
 dialog.showModal();
}
export function renderParkingRegister(root, lang, requests, history, saveCell, deleteRow, tenant) {
 const [inbox, form, empty, imported, name, plate, email, phone, from, to, amount, status, note] = words[lang] || words.sk;

 const copy=editWords[lang]||editWords.sk;
 const year=({sk:'Rok',en:'Year',ru:'Год',uk:'Рік'})[lang]||'Rok';
 const labels=actionWords[lang]||actionWords.sk;
 const provider=providerDetails(tenant);
 const [actions,remove,invoice,confirmDelete,deleteError]=labels;
 function actionCell(row,record,kind,data){
  const cell=element('td');
  cell.style.minWidth='185px';
  const bill=element('button',invoice);
  bill.type='button';
  bill.hidden=!provider;
  bill.addEventListener('click',()=>invoiceDraft(root,labels,data(),lang,provider));
  const del=element('button',remove);
  del.type='button';
  del.addEventListener('click',async()=>{
   if(!window.confirm(confirmDelete))return;
   del.disabled=bill.disabled=true;
   try{
    await deleteRow(kind,record.id);
    const list=kind==='history'?history:requests;
    const index=list.indexOf(record);
    if(index>=0)list.splice(index,1);
    row.remove();
    if(kind==='history')paintLedger();
   }catch{
    statusLine.textContent=deleteError;
    del.disabled=bill.disabled=false;
   }
  });
  const controls=element('div');
  controls.style.cssText='display:flex;gap:6px;flex-wrap:wrap;padding:6px';
  controls.append(bill,del);
  cell.append(controls);
  return cell;
 }
 const statusLine=element('p');
 statusLine.setAttribute('role','alert');
 const monthHeaders=Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'));
 const headers=[year,name,plate,...monthHeaders];
 root.append(element('p',copy[0]));
 const search = element('input');
 search.type='search';
 search.placeholder=({sk:'Hľadať meno alebo EČV',en:'Find name or plate',ru:'Имя или номер авто',uk:'Ім’я або номер авто'})[lang]||'Hľadať';
 search.setAttribute('aria-label',search.placeholder);
 const exportButton=element('button','Excel (.xlsx)');
 exportButton.type='button';
 exportButton.addEventListener('click',()=>{
  const sheets=[...new Set(history.map(record=>record.year))].sort().map(year=>({
   name:String(year), rows:[headers,
    ...history.filter(record=>record.year===year).sort((a,b)=>a.source_row-b.source_row).map(record=>[record.year,...parkingIdentity(record.entry),...record.months])]
  }));
  downloadWorkbook('Parkovanie',sheets);
 });
 const ledger=element('div');
 const toolbar=element('div');toolbar.className='parking-toolbar';toolbar.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px';
 toolbar.append(search,exportButton);
 root.append(toolbar,statusLine,ledger);
 function paintLedger(){
  const query=search.value.trim().toLocaleLowerCase();
  const matches=history.filter(record=>!query||[record.entry,...record.months].some(value=>String(value??'').toLocaleLowerCase().includes(query)));
  ledger.replaceChildren();
  appendWorkbookGrid(ledger,matches.sort((a,b)=>a.source_row-b.source_row),copy,saveCell,[...headers.slice(0,3),actions,...headers.slice(3)],(row,record)=>actionCell(row,record,'history',()=>{
   const [customer,registration]=parkingIdentity(record.entry);
   return {name:customer,plate:registration,period:String(record.year)};
  }));
 }
 search.addEventListener('input',paintLedger);
 paintLedger();
 const link = element('a', form);
 link.href = '/student-house-portal/parking/?lang=' + encodeURIComponent(lang);
 root.append(element('h4', inbox), link);
 if (requests.length) {
  const ordered = [...requests].sort((a,b) => b.created_at.localeCompare(a.created_at));
  appendTable(root, [name,plate,email,phone,from,to,amount,status,note,actions], ordered.map(request => [
   [request.first_name,request.last_name].filter(Boolean).join(' '),request.vehicle_registration,
   request.email,request.telephone,request.start_on,request.end_on,request.total_eur,request.status,request.note
  ]),(row,index)=>{
   const request=ordered[index];
   return actionCell(row,request,'request',()=>({
    name:[request.first_name,request.last_name].filter(Boolean).join(' '),plate:request.vehicle_registration,
    period:[request.start_on,request.end_on].filter(Boolean).join(' – '),months:request.months
   }));
  });
 } else {
  root.append(element('p', empty));
 }
}
