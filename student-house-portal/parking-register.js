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
function appendTable(root, headers, rows) {
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
 for (const values of rows) {
  const row = body.insertRow();
  for (const value of values) row.append(element('td', value));
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

function appendWorkbookGrid(root, history, copy, saveCell, headers) {
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
   const heading=headers[index+1];
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
 scroll.append(table);
 root.append(style,scroll);
}

export function renderParkingRegister(root, lang, requests, history, saveCell) {
 const [inbox, form, empty, imported, name, plate, email, phone, from, to, amount, status, note] = words[lang] || words.sk;

 const copy=editWords[lang]||editWords.sk;
 const year=({sk:'Rok',en:'Year',ru:'Год',uk:'Рік'})[lang]||'Rok';
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
 root.append(toolbar,ledger);
 function paintLedger(){
  const query=search.value.trim().toLocaleLowerCase();
  const matches=history.filter(record=>!query||[record.entry,...record.months].some(value=>String(value??'').toLocaleLowerCase().includes(query)));
  ledger.replaceChildren();
  appendWorkbookGrid(ledger,matches.sort((a,b)=>a.source_row-b.source_row),copy,saveCell,headers);
 }
 search.addEventListener('input',paintLedger);
 paintLedger();
 const link = element('a', form);
 link.href = '/student-house-portal/parking/?lang=' + encodeURIComponent(lang);
 root.append(element('h4', inbox), link);
 if (requests.length) {
  const ordered = [...requests].sort((a,b) => b.created_at.localeCompare(a.created_at));
  appendTable(root, [name,plate,email,phone,from,to,amount,status,note], ordered.map(request => [
   [request.first_name,request.last_name].filter(Boolean).join(' '),request.vehicle_registration,
   request.email,request.telephone,request.start_on,request.end_on,request.total_eur,request.status,request.note
  ]));
 } else {
  root.append(element('p', empty));
 }
}
