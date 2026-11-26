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
const cellVatWords={
 sk:{basis:'Výpočet DPH',gross:'Bez DPH / ponechať sumu',net:'S DPH – pripočítať 23 %',netTotal:'Základ bez DPH',vat:'DPH 23 %',grossTotal:'Celkom s DPH',saved:'Suma na uloženie',hint:'Po výbere S DPH sa hodnota automaticky zvýši o 23 %. Pre zmenu základu vyber Bez DPH. Uloží sa zobrazená hodnota.'},
 en:{basis:'VAT calculation',gross:'Without VAT / keep amount',net:'Including VAT – add 23%',netTotal:'Net amount',vat:'VAT 23%',grossTotal:'Total incl. VAT',saved:'Amount to save',hint:'Selecting VAT increases the value by 23%. Switch back to edit the base. The displayed value is saved.'},
 ru:{basis:'Расчёт НДС',gross:'Без НДС / сохранить сумму',net:'С НДС – добавить 23 %',netTotal:'Сумма без НДС',vat:'НДС 23 %',grossTotal:'Всего с НДС',saved:'Сумма для сохранения',hint:'При выборе НДС сумма увеличится на 23 %. Вернитесь к сумме без НДС для изменения базы. Сохраняется отображаемая сумма.'},
 uk:{basis:'Розрахунок ПДВ',gross:'Без ПДВ / зберегти суму',net:'З ПДВ – додати 23 %',netTotal:'Сума без ПДВ',vat:'ПДВ 23 %',grossTotal:'Разом з ПДВ',saved:'Сума для збереження',hint:'При виборі ПДВ сума збільшиться на 23 %. Поверніться до суми без ПДВ для зміни бази. Зберігається відображена сума.'}
};
export function parkingVatAmounts(value,basis){
 const raw=String(value??'').trim();
 if(!/^-?\d+(?:[.,]\d{1,2})?$/.test(raw))return null;
 const n=Number(raw.replace(',','.'));
 if(!Number.isFinite(n)||Math.abs(n)>100000000)return null;
 const sign=n<0?-1:1,cents=Math.round(Math.abs(n)*100);
 const net=basis==='net'?cents:Math.round(cents*100/123);
 const gross=basis==='net'?net+Math.round(net*23/100):cents;
 return {net:sign*net,vat:sign*(gross-net),gross:sign*gross};
}
function editCell(root, copy, heading, value, save, vatLang=null) {
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
 form.append(element('h3',title+' · '+heading),field);
 let basis=null;
 let originalBase=null;
 if(vatLang){
  const w=cellVatWords[vatLang]||cellVatWords.sk;
  basis=element('select');basis.name='vatBasis';
  for(const [key,label] of [['net',w.net],['gross',w.gross]]){const option=element('option',label);option.value=key;basis.append(option);}
  basis.value='gross'; // Do not silently add VAT again to stored historical payments.
  const vatLabel=element('label',w.basis);vatLabel.append(basis);
  const preview=element('div');preview.setAttribute('aria-live','polite');preview.style.cssText='margin:12px 0;padding:12px;background:#edf3f9;border-radius:8px;line-height:1.6';
  const money=new Intl.NumberFormat(vatLang,{style:'currency',currency:'EUR'});
  const refresh=()=>{
   const amounts=parkingVatAmounts(basis.value==='net'?originalBase:input.value,basis.value);
   basis.disabled=!amounts;preview.replaceChildren();
   if(amounts){
    if(basis.value==='net'){for(const [label,key] of [[w.netTotal,'net'],[w.vat,'vat'],[w.grossTotal,'gross']])preview.append(element('div',label+': '+money.format(amounts[key]/100)));}
    else preview.append(element('div',w.saved+': '+money.format(amounts.gross/100)));
   }
   preview.append(element('small',w.hint));
  };
  input.addEventListener('input',refresh);
  basis.addEventListener('change',()=>{
   if(basis.value==='net'){
    const calculated=parkingVatAmounts(input.value,'net');
    if(calculated){
     originalBase=input.value;
     input.value=(calculated.gross/100).toFixed(2).replace('.',vatLang==='en'?'.':',');
     input.readOnly=true;
    }else basis.value='gross';
   }else if(originalBase!==null){
    input.value=originalBase;originalBase=null;input.readOnly=false;
   }
   refresh();
  });
  form.append(vatLabel,preview);refresh();
 }
 form.append(error,cancel,submit);
 dialog.append(form);
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 dialog.addEventListener('cancel',event=>{if(submit.disabled)event.preventDefault();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  submit.disabled=cancel.disabled=input.disabled=true;
  error.textContent='';
  try {
   // The field already contains the final amount; never add VAT a second time.
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

const monthlyWords={
 sk:{due:'Predpis s DPH',paid:'Evidovaná úhrada',unpaid:'Nezaevidovaná',hint:'Pri nových žiadostiach je predpis 61,50 € za objednaný mesiac (50 € bez DPH). Kliknutím do bunky eviduješ skutočnú úhradu. Pri jednorazovej platbe mesačné sumy vyjadrujú cenu jednotlivých mesiacov, nie samostatné splatnosti.'},
 en:{due:'Charge incl. VAT',paid:'Recorded payment',unpaid:'Not recorded',hint:'New requests show €61.50 per booked month (€50 excl. VAT). Click a cell to record actual payments. For a single payment, monthly charges show allocation, not separate due dates.'},
 ru:{due:'Начислено с НДС',paid:'Учтённая оплата',unpaid:'Не учтена',hint:'Для новых заявок начисляется 61,50 € за месяц (50 € без НДС). Нажмите ячейку для учёта фактической оплаты. При разовой оплате суммы показывают стоимость месяцев, а не отдельные сроки.'},
 uk:{due:'Нараховано з ПДВ',paid:'Облікована оплата',unpaid:'Не облікована',hint:'Для нових заявок нараховується 61,50 € за місяць (50 € без ПДВ). Натисніть клітинку для обліку фактичної оплати. При одноразовій оплаті суми показують вартість місяців, а не окремі строки.'}
};
function plannedMonth(record,index){
 const value=record.planned_months?.[index];
 return value==null?null:Number(value);
}
function monthText(record,index,lang){
 const words=monthlyWords[lang]||monthlyWords.sk,amount=plannedMonth(record,index);
 if(amount===null)return record.months[index];
 const currency=new Intl.NumberFormat(lang,{style:'currency',currency:'EUR'});
 const paid=record.months[index];
 return words.due+': '+currency.format(amount)+' · '+words.paid+': '+(paid==null||paid===''?words.unpaid:typeof paid==='number'?currency.format(paid):String(paid));
}
const unitWords={
 sk:{type:'Typ zákazníka',choose:'Vyber typ zákazníka',student_house:'Rezident Student House',apartments:'Rezident apartmánov',external:'Externý zákazník',room:'Číslo izby',apartment:'Číslo apartmánu',unit:'Číslo izby / apartmánu',unknown:'Nezadané'},
 en:{type:'Customer type',choose:'Choose customer type',student_house:'Student House resident',apartments:'Apartment resident',external:'External customer',room:'Room number',apartment:'Apartment number',unit:'Room / apartment number',unknown:'Not specified'},
 ru:{type:'Тип клиента',choose:'Выберите тип клиента',student_house:'Житель Student House',apartments:'Житель апартаментов',external:'Внешний клиент',room:'Номер комнаты',apartment:'Номер апартаментов',unit:'Номер комнаты / апартаментов',unknown:'Не указано'},
 uk:{type:'Тип клієнта',choose:'Оберіть тип клієнта',student_house:'Мешканець Student House',apartments:'Мешканець апартаментів',external:'Зовнішній клієнт',room:'Номер кімнати',apartment:'Номер апартаментів',unit:'Номер кімнати / апартаментів',unknown:'Не зазначено'}
};
function unitText(record,lang){
 const w=unitWords[lang]||unitWords.sk;
 return [w[record.resident_type]||w.unknown,record.unit_number].filter(Boolean).join(' · ');
}
function editUnit(root,record,lang,copy,save){
 const w=unitWords[lang]||unitWords.sk;
 const dialog=element('dialog');dialog.className='parking-edit-dialog';
 const form=element('form'),type=element('select'),unit=element('input');
 const typeLabel=element('label',w.type),unitLabel=element('label',w.unit);
 for(const k of ['unknown','student_house','apartments','external']){const option=element('option',w[k]);option.value=k==='unknown'?'':k;type.append(option);}
 type.value=record.resident_type||'';unit.value=record.unit_number||'';unit.maxLength=40;
 const sync=()=>{const active=['student_house','apartments'].includes(type.value);unitLabel.hidden=!active;unit.required=active;unit.setCustomValidity(active&&!unit.value.trim()?w.unit:'');unitLabel.firstChild.textContent=(type.value==='apartments'?w.apartment:w.room);};
 typeLabel.append(type);unitLabel.append(unit);type.addEventListener('change',sync);unit.addEventListener('input',sync);sync();
 const error=element('p'),cancel=element('button',copy[4]),submit=element('button',copy[3]);cancel.type='button';submit.type='submit';cancel.onclick=()=>dialog.close();
 form.append(element('h3',w.unit),typeLabel,unitLabel,error,cancel,submit);dialog.append(form);root.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
 form.addEventListener('submit',async e=>{e.preventDefault();sync();if(!form.reportValidity())return;submit.disabled=true;try{await save(type.value||null,['student_house','apartments'].includes(type.value)?unit.value.trim():null);dialog.close();}catch{error.textContent=copy[5];submit.disabled=false;}});
}
function appendWorkbookGrid(root, history, copy, saveCell, headers, rowActions,lang,saveUnit) {
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
 .parking-workbook .parking-charge {display:block;font-weight:750;color:#142b4d;white-space:nowrap}
 .parking-workbook .parking-paid {display:block;font-size:11px;color:#52677f;margin-top:4px}
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
   const heading=headers[index<2?index+1:index+3];
   button.type='button';
   button.className='parking-edit-cell';
   function display(next){
    const planned=index>=2?plannedMonth(record,index-2):null;
    if(planned!==null){
     const w=monthlyWords[lang]||monthlyWords.sk,fmt=new Intl.NumberFormat(lang,{style:'currency',currency:'EUR'});
     const charge=element('span',fmt.format(planned));charge.className='parking-charge';
     const actual=element('span',w.paid+': '+(next==null||next===''?w.unpaid:typeof next==='number'?fmt.format(next):next));actual.className='parking-paid';
     button.replaceChildren(charge,actual);button.title=w.due+': '+fmt.format(planned);
    }else button.textContent=next||next===0?next:'—';
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
    },index>=2?lang:null);
   });
  }
 }
  for(const [index,row] of Array.from(body.rows).entries()){
   const record=history[index],cell=element('td'),button=element('button',unitText(record,lang));button.type='button';button.className='parking-edit-cell';
   button.addEventListener('click',()=>editUnit(root,record,lang,copy,async(type,unit)=>{await saveUnit(record.id,type,unit);record.resident_type=type;record.unit_number=unit;button.textContent=unitText(record,lang);}));
   row.insertBefore(cell,row.cells[3]);cell.append(button);row.insertBefore(rowActions(row,record),row.cells[4]);
  }
 scroll.append(table);
 root.append(style,scroll);
}

const actionWords={
 sk:['Akcie','Vymazať','Vygenerovať splátkový kalendár','Natrvalo vymazať tento záznam?','Vymazanie zlyhalo.','Zavrieť'],
 en:['Actions','Delete','Generate payment schedule','Permanently delete this record?','Deletion failed.','Close'],
 ru:['Действия','Удалить','Создать график платежей','Удалить эту запись навсегда?','Не удалось удалить запись.','Закрыть'],
 uk:['Дії','Видалити','Створити графік платежів','Видалити цей запис назавжди?','Не вдалося видалити запис.','Закрити']
};
const paymentWords={
 sk:{label:'Spôsob úhrady',monthly:'Mesačne',full:'Jednorazovo',unknown:'Nezadaný',period:'Fakturovaný mesiac'},
 en:{label:'Payment frequency',monthly:'Monthly',full:'One payment',unknown:'Not specified',period:'Billing month'},
 ru:{label:'Периодичность оплаты',monthly:'Ежемесячно',full:'Одним платежом',unknown:'Не указано',period:'Месяц оплаты'},
 uk:{label:'Періодичність оплати',monthly:'Щомісяця',full:'Одним платежем',unknown:'Не зазначено',period:'Місяць оплати'}
};
function paymentDetails(note){
 const raw=String(note??''),match=/^\[Platba: (mesačne|jednorazovo)\]\r?\n?/.exec(raw);
 return {mode:match?(match[1]==='mesačne'?'monthly':'full'):'unknown',note:match?raw.slice(match[0].length):raw};
}
function parkingScheduleItems(records){
 const planned=records.some(record=>Array.isArray(record.planned_months));
 const months=new Map();
 for(const record of records){
  const year=Number(record.year);
  if(!Number.isInteger(year)||year<1900||year>9999)continue;
  for(let index=0;index<12;index++){
   const raw=planned?plannedMonth(record,index):record.months?.[index];
   const value=String(raw??'').trim();
   if(!/^\d+(?:[.,]\d{1,2})?$/.test(value))continue;
   const amount=Number(value.replace(',','.'));
   if(amount<=0)continue;
   months.set(year+'-'+String(index+1).padStart(2,'0')+'-01',amount);
  }
 }
 return [...months].sort(([a],[b])=>a.localeCompare(b)).map(([due_on,amount])=>({due_on,amount}));
}

function parkingSchedule(root,labels,data,lang,provider) {
 const [title,generate,print,due,reference,count,errorText]=({
  sk:['Platobný rozpis – parkovanie','Vygenerovať splátkový kalendár','Tlačiť / uložiť PDF','Splatnosť','Variabilný symbol (nepovinný)','Počet splátok','Platobné QR kódy sa nepodarilo vytvoriť.'],
  en:['Parking payment breakdown','Generate payment schedule','Print / save PDF','Due date','Payment reference (optional)','Number of installments','Could not generate payment QR codes.'],
  ru:['Платёжная ведомость за парковку','Создать график платежей','Печать / сохранить PDF','Срок оплаты','Код платежа (необязательно)','Количество платежей','Не удалось создать QR-коды.'],
  uk:['Платіжний розпис за паркування','Створити графік платежів','Друк / зберегти PDF','Термін оплати','Код платежу (необов’язково)','Кількість платежів','Не вдалося створити QR-коди.']
 })[lang];
 const dialog=element('dialog'),form=element('form'),rows=element('div'),preview=element('div');
 dialog.className='parking-edit-dialog';
 const field=(host,label,type)=>{
  const wrapper=element('label',label),input=element('input');
  input.type=type;wrapper.append(input);host.append(wrapper);return input;
 };
 const items=data.items;
 const symbol=field(form,reference,'text');
 symbol.pattern='[0-9]{1,10}';symbol.maxLength=10;
 const close=element('button',labels[5]),submit=element('button',generate),status=element('p');
 close.type='button';submit.type='submit';status.setAttribute('role','status');
 close.addEventListener('click',()=>dialog.close());
 const money=new Intl.NumberFormat(lang,{style:'currency',currency:'EUR'});
 rows.append(element('p',count+' · '+items.length));
 for(const item of items)rows.append(element('p',due+' '+item.due_on.split('-').reverse().join('.')+' · '+money.format(item.amount)));
 if(!items.length){
  submit.disabled=true;
  status.textContent=({sk:'V tabuľke nie sú vyplnené mesačné sumy. Ak ide o novú žiadosť, pridaj ju najprv do tabuľky.',en:'No monthly amounts in the register. Add new requests to the register first.',ru:'В таблице нет сумм по месяцам. Сначала добавьте новую заявку в таблицу.',uk:'У таблиці немає сум за місяцями. Спершу додайте нову заявку до таблиці.'})[lang];
 }
 form.addEventListener('input',()=>preview.replaceChildren());
 form.append(rows,submit,close,status,preview);
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(submit.disabled||!form.reportValidity()||!items.length)return;
  const bank={iban:provider.iban,beneficiary:provider.name,symbol:symbol.value,message:[data.name,data.plate].filter(Boolean).join(' ')};
  submit.disabled=true;status.textContent='';preview.replaceChildren();
  try{
   const images=await paymentImages(items,bank);
   if(!dialog.open||symbol.value!==bank.symbol)return;
   const printButton=element('button',print);printButton.type='button';
   printButton.onclick=()=>{
    const paper=window.open('','_blank');if(!paper)return;
    paper.opener=null;paper.document.title=title;
    const style=paper.document.createElement('style');
    style.textContent='@page{size:A4;margin:14mm}body{font:11pt system-ui,sans-serif;color:#142b4d;max-width:800px;margin:auto}h1{border-bottom:2px solid #142b4d;padding-bottom:8px}h2{font-size:13pt}p{margin:4px 0}.parking-payment-parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0;break-inside:avoid}.parking-payment-parties section{border:1px solid #ccd9e8;padding:10px;overflow-wrap:anywhere}.parking-payment-parties h2{margin-top:0}table{width:100%;border-collapse:collapse}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #ccd9e8;text-align:left;padding:7px}th{background:#edf3f9}td img{display:block}';
    paper.document.head.append(style);
    paper.document.body.append(documentBody.cloneNode(true));
    Promise.allSettled([...paper.document.images].map(img=>img.decode())).then(()=>paper.print());
   };
   const [recipient,customer,plateLabel,issued,period,amount,grandTotal,note]=({
    sk:['Príjemca platby','Zákazník','EČV','Dátum vyhotovenia','Obdobie parkovania','Suma na úhradu','Spolu podľa rozpisu','Platobný podklad k parkovaniu. Nepotvrdzuje prijatie úhrady.'],
    en:['Payment recipient','Customer','Registration plate','Prepared on','Parking period','Amount due','Schedule total','Parking payment instructions. This document does not confirm receipt of payment.'],
    ru:['Получатель платежа','Клиент','Номер автомобиля','Дата составления','Период парковки','Сумма к оплате','Всего по графику','Платёжные реквизиты за парковку. Документ не подтверждает получение оплаты.'],
    uk:['Отримувач платежу','Клієнт','Номер автомобіля','Дата складання','Період паркування','Сума до сплати','Разом за розписом','Платіжні реквізити за паркування. Документ не підтверджує отримання оплати.']
   })[lang];
   const documentBody=element('article');
   documentBody.className='parking-payment-document';
   const logo=element('img');logo.src=studentHouseLogo;logo.alt='Student House Bratislava';logo.width=210;
   const dateText=value=>value.split('-').reverse().join('.');
   const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Bratislava'}).format(new Date());
   documentBody.append(logo,element('h1',title),element('p',issued+' · '+dateText(today)));
   const parties=element('div');parties.className='parking-payment-parties';
   const company=element('section'),payer=element('section');
   company.append(element('h2',recipient));
   for(const line of [provider.name,provider.address,'IČO '+provider.companyId+' · DIČ '+provider.taxId,'IČ DPH '+provider.vatId,provider.bank,'IBAN '+provider.iban,'SWIFT/BIC '+provider.bic])
    company.append(element('p',line));
   payer.append(element('h2',customer),element('p',data.name));
   for(const line of [data.address,data.plate&&plateLabel+' · '+data.plate,data.startOn&&data.endOn&&period+' · '+dateText(data.startOn)+' – '+dateText(data.endOn),bank.symbol&&'VS '+bank.symbol])
    if(line)payer.append(element('p',line));
   parties.append(company,payer);documentBody.append(parties);
   const table=element('table'),head=table.createTHead().insertRow(),body=table.createTBody();
   for(const label of [due,amount,'PAY by square']){const cell=element('th',label);cell.scope='col';head.append(cell);}
   items.forEach((item,i)=>{
    const row=body.insertRow();
    const image=element('img');image.src=images[i];image.alt='PAY by square';image.width=105;
    const qr=element('td');qr.append(image);
    row.append(element('td',dateText(item.due_on)),element('td',money.format(item.amount)),qr);
   });
   const total=items.reduce((sum,item)=>sum+Math.round(item.amount*100),0)/100;
   documentBody.append(table,element('h2',grandTotal+' · '+money.format(total)),element('p',note));
   preview.append(documentBody,printButton);
  }catch{status.textContent=errorText;}
  finally{submit.disabled=false;}
 });
 dialog.append(element('h3',title),element('p',[data.name,data.plate,data.startOn,data.endOn].filter(Boolean).join(' · ')),form);
 dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 root.append(dialog);dialog.showModal();
}
export function renderParkingRegister(root, lang, requests, history, saveCell, deleteRow, tenant, addToRegister, saveUnit) {
 const [inbox, form, empty, imported, name, plate, email, phone, from, to, amount, status, note] = words[lang] || words.sk;

 const copy=editWords[lang]||editWords.sk;
 const year=({sk:'Rok',en:'Year',ru:'Год',uk:'Рік'})[lang]||'Rok';
 const labels=actionWords[lang]||actionWords.sk;
 const provider=providerDetails(tenant);
 const [actions,remove,generateSchedule,confirmDelete,deleteError]=labels;
 const transfer=({sk:['Pridať do tabuľky','✓ Pridané do tabuľky','Pridanie zlyhalo. Skús znova.'],en:['Add to register','✓ Added to register','Could not add. Try again.'],ru:['Добавить в таблицу','✓ Добавлено в таблицу','Не удалось добавить. Повторите попытку.'],uk:['Додати до таблиці','✓ Додано до таблиці','Не вдалося додати. Спробуйте ще раз.']})[lang]||['Pridať do tabuľky','✓ Pridané do tabuľky','Pridanie zlyhalo. Skús znova.'];
 function actionCell(row,record,kind,data){
  const cell=element('td');
  cell.style.minWidth='185px';
  const bill=element('button',generateSchedule);
  bill.type='button';
  bill.hidden=!provider;
  bill.addEventListener('click',()=>{
   const requestId=kind==='history'?record.request_id:record.id;
   const records=requestId?history.filter(entry=>entry.request_id===requestId):[record];
   parkingSchedule(root,labels,{...data(),items:parkingScheduleItems(records)},lang,provider);
  });
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
  if(kind==='request'){
   const add=element('button',transfer[0]);add.type='button';
   const linked=new Set(history.filter(x=>x.request_id===record.id).map(x=>Number(x.year)));
   const first=Number(record.start_on.slice(0,4)),last=Number(record.end_on.slice(0,4));
   const done=Array.from({length:last-first+1},(_,i)=>first+i).every(y=>linked.has(y));
   if(done){add.textContent=transfer[1];add.disabled=true;add.style.background='#17643c';}
   add.addEventListener('click',async()=>{
    add.disabled=true;statusLine.textContent='';
    try{await addToRegister(record.id);add.textContent=transfer[1];add.style.background='#17643c';}
    catch{statusLine.textContent=transfer[2];add.disabled=false;}
   });
   controls.append(add);
  }
  controls.append(bill,del);
  cell.append(controls);
  return cell;
 }
 const statusLine=element('p');
 statusLine.setAttribute('role','alert');
 const link = element('a', form);
 link.href = '/student-house-portal/parking/?lang=' + encodeURIComponent(lang);
 root.append(element('h4', inbox), link);
 const pw=paymentWords[lang]||paymentWords.sk;
 const uw=unitWords[lang]||unitWords.sk;
 if (requests.length) {
  const ordered = [...requests].sort((a,b) => b.created_at.localeCompare(a.created_at));
  appendTable(root, [name,plate,uw.unit,email,phone,({sk:'Trvalý pobyt',en:'Permanent address',ru:'Адрес проживания',uk:'Адреса проживання'})[lang],from,to,amount,pw.label,status,note,actions], ordered.map(request => [
   [request.first_name,request.last_name].filter(Boolean).join(' '),request.vehicle_registration,unitText(request,lang),
   request.email,request.telephone,request.permanent_address||'—',request.start_on,request.end_on,request.total_eur,pw[paymentDetails(request.note).mode],request.status,paymentDetails(request.note).note
  ]),(row,index)=>{
   const request=ordered[index];
   return actionCell(row,request,'request',()=>({
    name:[request.first_name,request.last_name].filter(Boolean).join(' '),plate:request.vehicle_registration,
    requestId:request.id,address:request.permanent_address,startOn:request.start_on,endOn:request.end_on,months:request.months,
    email:request.email,phone:request.telephone,...paymentDetails(request.note)
   }));
  });
 } else {
  root.append(element('p', empty));
 }
 root.append(statusLine);
 const monthHeaders=Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0'));
 const headers=[year,name,plate,uw.unit,...monthHeaders];
 const currentYear=Number(new Intl.DateTimeFormat('en',{year:'numeric',timeZone:'Europe/Bratislava'}).format(new Date()));
 const years=[...new Set([2025,2026,2027,currentYear,currentYear+1,...history.map(r=>Number(r.year))])].filter(Number.isInteger).sort((a,b)=>a-b);
 const yearWords=({sk:['Rok evidencie','Všetky roky','V tomto roku zatiaľ nie sú záznamy.'],en:['Register year','All years','No entries for this year yet.'],ru:['Год учёта','Все годы','За этот год пока нет записей.'],uk:['Рік обліку','Усі роки','За цей рік поки немає записів.']})[lang]||['Rok evidencie','Všetky roky','V tomto roku zatiaľ nie sú záznamy.'];
 const yearSelect=element('select');
 yearSelect.setAttribute('aria-label',yearWords[0]);
 yearSelect.id='parking-register-year';
 const all=element('option',yearWords[1]);all.value='all';yearSelect.append(all);
 for(const y of years){const option=element('option',String(y));option.value=String(y);yearSelect.append(option);}
 const yearLabel=element('div');yearLabel.style.cssText='display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:12px 0';
 const yearTitle=element('strong',yearWords[0]);yearLabel.append(yearTitle);
 yearSelect.hidden=true;yearLabel.append(yearSelect);
 const yearButtons=new Map();
 for(const value of ['all',...years.map(String)]){
  const tab=element('button',value==='all'?yearWords[1]:value);tab.type='button';
  tab.style.cssText='padding:10px 16px;border:1px solid #142b4d;border-radius:8px;min-height:44px';
  tab.addEventListener('click',()=>{yearSelect.value=value;paintLedger();});
  yearButtons.set(value,tab);yearLabel.append(tab);
 }
 yearSelect.value='2027';
 root.append(element('p',copy[0]),element('p',(monthlyWords[lang]||monthlyWords.sk).hint));
 const search = element('input');
 search.type='search';
 search.placeholder=({sk:'Hľadať meno alebo EČV',en:'Find name or plate',ru:'Имя или номер авто',uk:'Ім’я або номер авто'})[lang]||'Hľadať';
 search.setAttribute('aria-label',search.placeholder);
 const exportButton=element('button','Excel (.xlsx)');
 exportButton.type='button';
 exportButton.addEventListener('click',()=>{
  const sheets=years.map(year=>({
   name:String(year), rows:[headers,
    ...history.filter(record=>Number(record.year)===year).sort((a,b)=>a.source_row-b.source_row).map(record=>[record.year,...parkingIdentity(record.entry),unitText(record,lang),...record.months.map((_,i)=>monthText(record,i,lang))])]
  }));
  downloadWorkbook('Parkovanie',sheets);
 });
 const ledger=element('div');
 const toolbar=element('div');toolbar.className='parking-toolbar';toolbar.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px';
 toolbar.append(search,exportButton);
 root.append(yearLabel,toolbar,ledger);
 function paintLedger(){
  const query=search.value.trim().toLocaleLowerCase();
  const selected=yearSelect.value;
  for(const [key,tab] of yearButtons){
   const active=key===selected;tab.setAttribute('aria-pressed',String(active));tab.style.background=active?'#142b4d':'#ffffff';tab.style.color=active?'#ffffff':'#142b4d';
  }
  const matches=history.filter(record=>(selected==='all'||Number(record.year)===Number(selected))&&(!query||[record.entry,unitText(record,lang),...record.months].some(value=>String(value??'').toLocaleLowerCase().includes(query))));
  ledger.replaceChildren();
  if(selected!=='all')ledger.append(element('h4',yearWords[0]+' '+selected));
  if(!matches.length&&selected!=='all')ledger.append(element('p',yearWords[2]));
  const visibleHeaders=selected==='all'?headers:[...headers.slice(0,4),...monthHeaders.map(m=>m+'/'+selected.slice(-2))];
  appendWorkbookGrid(ledger,matches.sort((a,b)=>Number(a.year)-Number(b.year)||a.source_row-b.source_row),copy,saveCell,[...visibleHeaders.slice(0,4),actions,...visibleHeaders.slice(4)],(row,record)=>actionCell(row,record,'history',()=>{
   const [customer,registration]=parkingIdentity(record.entry);
   const request=requests.find(x=>x.id===record.request_id);
   return request?{name:customer,plate:registration,requestId:request.id,address:request.permanent_address,startOn:request.start_on,endOn:request.end_on,months:request.months,email:request.email,phone:request.telephone,...paymentDetails(request.note)}:{name:customer,plate:registration};
  }),lang,saveUnit);
 }
 search.addEventListener('input',paintLedger);
 yearSelect.addEventListener('change',paintLedger);
 paintLedger();

}
