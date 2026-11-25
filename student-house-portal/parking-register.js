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
const fills = {"1:1":"#00FF00","1:2":"#00FF00","1:3":"#00FF00","1:4":"#00FF00","1:5":"#00FF00","1:6":"#00FF00","1:7":"#00FF00","1:8":"#00FF00","1:9":"#00FF00","1:10":"#00FF00","1:11":"#00FF00","1:12":"#00FF00","1:13":"#00FF00","2:2":"#BDD6EE","2:3":"#BDD6EE","2:4":"#BDD6EE","2:5":"#BDD6EE","2:6":"#BDD6EE","2:7":"#BDD6EE","2:8":"#BDD6EE","2:9":"#BDD6EE","2:10":"#BDD6EE","2:11":"#BDD6EE","2:12":"#BDD6EE","2:13":"#BDD6EE","4:11":"#BDD6EE","4:12":"#BDD6EE","4:13":"#BDD6EE","6:2":"#BDD6EE","6:3":"#BDD6EE","6:4":"#BDD6EE","6:5":"#D9D2E9","6:6":"#D9D2E9","6:7":"#D9D2E9","6:8":"#BDD6EE","6:9":"#BDD6EE","6:10":"#BDD6EE","6:11":"#BDD6EE","6:12":"#BDD6EE","6:13":"#BDD6EE","8:2":"#BDD6EE","8:3":"#BDD6EE","8:4":"#BDD6EE","8:5":"#BDD6EE","8:6":"#BDD6EE","8:7":"#BDD6EE","8:8":"#BDD6EE","8:9":"#BDD6EE","8:10":"#BDD6EE","8:11":"#BDD6EE","8:12":"#FFFF00","9:2":"#FFFFFF","10:10":"#FFFFFF","10:11":"#FFFFFF","10:12":"#FFFFFF","10:13":"#FFFFFF","11:10":"#FFFFFF","11:11":"#FFFFFF","12:10":"#FFFFFF","12:11":"#FFFFFF","13:10":"#BDD6EE","13:11":"#BDD6EE","13:12":"#BDD6EE","13:13":"#BDD6EE","15:8":"#BDD6EE","15:9":"#BDD6EE","15:10":"#FFFF00","15:11":"#FFFF00","17:2":"#BDD6EE","17:3":"#BDD6EE","17:4":"#BDD6EE","17:5":"#BDD6EE","17:6":"#BDD6EE","17:7":"#BDD6EE","17:8":"#BDD6EE","17:9":"#BDD6EE","17:10":"#BDD6EE","17:11":"#FFFF00","17:12":"#FFFFFF","19:3":"#FFFFFF","19:4":"#FFFFFF","19:5":"#FFFFFF","19:6":"#FFFFFF","19:7":"#FFFFFF","19:8":"#BDD6EE","19:9":"#BDD6EE","19:10":"#BDD6EE","19:11":"#BDD6EE","19:12":"#BDD6EE","19:13":"#BDD6EE","23:1":"#00FF00","23:2":"#00FF00","23:3":"#00FF00","23:4":"#00FF00","23:5":"#00FF00","23:6":"#00FF00","23:7":"#00FF00","23:8":"#00FF00","23:9":"#00FF00","23:10":"#00FF00","23:11":"#00FF00","23:12":"#00FF00","23:13":"#00FF00","24:2":"#BDD6EE","24:3":"#BDD6EE","24:4":"#BDD6EE","24:5":"#BDD6EE","24:6":"#BDD6EE","24:7":"#0070C0","24:8":"#FFFFFF","24:9":"#FFFFFF","24:10":"#FFFFFF","24:11":"#FFFFFF","24:12":"#FFFFFF","24:13":"#FFFFFF","25:2":"#FFFFFF","25:3":"#FFFFFF","25:4":"#FFFFFF","25:5":"#FFFFFF","25:6":"#FFFFFF","25:7":"#FFFFFF","25:8":"#FFFFFF","25:9":"#FFFFFF","25:10":"#FFFFFF","25:11":"#FFFFFF","25:12":"#FFFFFF","25:13":"#FFFFFF","26:2":"#BDD6EE","26:3":"#FF0000","26:4":"#FF0000","26:5":"#FF0000","26:6":"#FFFFFF","26:7":"#FFFFFF","26:8":"#FFFFFF","26:9":"#FFFFFF","26:10":"#FFFFFF","26:11":"#FFFFFF","26:12":"#FFFFFF","26:13":"#FFFFFF","27:2":"#FFFFFF","27:3":"#FFFFFF","27:4":"#FFFFFF","27:5":"#FFFFFF","27:6":"#FFFFFF","27:7":"#FFFFFF","27:8":"#FFFFFF","27:9":"#FFFFFF","27:10":"#FFFFFF","27:11":"#FFFFFF","27:12":"#FFFFFF","27:13":"#FFFFFF","28:2":"#BDD6EE","28:3":"#FF0000","28:4":"#FFFFFF","28:5":"#FFFFFF","28:6":"#FFFFFF","28:7":"#FFFFFF","28:8":"#FFFFFF","28:9":"#FFFFFF","28:10":"#FFFFFF","28:11":"#FFFFFF","28:12":"#FFFFFF","28:13":"#FFFFFF","29:2":"#FFFFFF","29:3":"#FFFFFF","29:4":"#FFFFFF","29:5":"#FFFFFF","29:6":"#FFFFFF","29:7":"#FFFFFF","29:8":"#FFFFFF","29:9":"#FFFFFF","29:10":"#FFFFFF","29:11":"#FFFFFF","29:12":"#FFFFFF","29:13":"#FFFFFF","30:2":"#FFFFFF","30:3":"#BDD6EE","30:4":"#BDD6EE","30:5":"#BDD6EE","30:6":"#1155CC","30:7":"#FFFFFF","30:8":"#FFFFFF","30:9":"#FFFFFF","30:10":"#FFFFFF","30:11":"#FFFFFF","30:12":"#FFFFFF","30:13":"#FFFFFF","32:1":"#00FFFF","32:2":"#00FFFF","32:3":"#00FFFF","32:4":"#00FFFF","32:5":"#00FFFF","32:6":"#00FFFF","32:7":"#00FFFF","32:8":"#00FFFF","32:9":"#00FFFF","32:10":"#00FFFF","32:11":"#00FFFF","32:12":"#00FFFF","32:13":"#00FFFF","33:2":"#BDD6EE","33:3":"#BDD6EE","33:4":"#BDD6EE","33:5":"#BDD6EE","33:6":"#BDD6EE","33:7":"#BDD6EE","33:8":"#BDD6EE","33:9":"#BDD6EE","33:10":"#BDD6EE","33:11":"#FFFF00","33:12":"#FFFF00","33:13":"#FFFFFF","34:2":"#FFFFFF","34:3":"#FFFFFF","34:4":"#FFFFFF","34:5":"#FFFFFF","34:6":"#FFFFFF","34:7":"#FFFFFF","34:8":"#FFFFFF","34:9":"#FFFFFF","34:10":"#FFFFFF","34:11":"#FFFFFF","34:12":"#FFFFFF","34:13":"#FFFFFF","35:2":"#BDD6EE","35:3":"#BDD6EE","35:4":"#BDD6EE","35:5":"#BDD6EE","35:6":"#BDD6EE","35:7":"#BDD6EE","35:8":"#BDD6EE","35:9":"#FFFFFF","35:10":"#BDD6EE","35:11":"#BDD6EE","35:12":"#FF0000","35:13":"#FFFFFF","36:2":"#FFFFFF","36:3":"#FFFFFF","36:4":"#FFFFFF","36:5":"#FFFFFF","36:6":"#FFFFFF","36:7":"#FFFFFF","36:8":"#FFFFFF","36:9":"#FFFFFF","36:10":"#FFFFFF","36:11":"#FFFFFF","36:12":"#FFFFFF","36:13":"#FFFFFF","37:2":"#BDD6EE","37:3":"#BDD6EE","37:4":"#BDD6EE","37:5":"#BDD6EE","37:6":"#BDD6EE","37:7":"#BDD6EE","37:8":"#BDD6EE","37:9":"#BDD6EE","37:10":"#BDD6EE","37:11":"#BDD6EE","37:12":"#BDD6EE","37:13":"#FF0000","40:5":"#BDD6EE","40:6":"#BDD6EE","40:7":"#BDD6EE","40:8":"#BDD6EE","40:9":"#BDD6EE","40:10":"#BDD6EE","40:11":"#BDD6EE","40:12":"#BDD6EE","40:13":"#BDD6EE","43:5":"#FFFFFF","43:6":"#FFFFFF","43:7":"#FFFFFF","43:8":"#FFFFFF","43:9":"#FFFFFF","43:10":"#BDD6EE","43:11":"#BDD6EE","43:12":"#BDD6EE","43:13":"#FFFFFF","46:5":"#FFFFFF","46:6":"#FFFFFF","46:7":"#FFFFFF","46:8":"#FFFFFF","46:9":"#FFFFFF","46:11":"#FFFFFF","46:12":"#BDD6EE","46:13":"#FFFFFF","49:5":"#FFFFFF","49:6":"#FFFFFF","49:7":"#FFFFFF","49:8":"#FFFFFF","49:9":"#FFFFFF","49:11":"#FFFFFF","49:12":"#BDD6EE","49:13":"#FFFFFF"};
const merges = {"30:3":[2,1],"43:2":[2,1],"30:6":[2,1],"49:5":[2,1],"49:7":[2,1],"37:2":[2,1],"43:9":[2,1],"43:11":[2,1],"43:3":[2,1],"37:6":[2,1],"37:8":[2,1],"40:2":[2,1],"40:12":[2,1],"30:8":[2,1],"37:11":[2,1],"40:4":[2,1],"40:6":[2,1],"30:9":[2,1],"49:4":[2,1],"30:11":[2,1],"43:8":[2,1],"49:8":[2,1],"49:10":[2,1],"10:13":[2,1],"43:12":[2,1],"37:1":[2,1],"46:11":[2,1],"46:1":[2,1],"40:11":[2,1],"46:3":[2,1],"40:13":[2,1],"40:3":[2,1],"46:5":[2,1],"37:13":[2,1],"40:5":[2,1],"19:8":[2,1],"37:4":[2,1],"46:6":[2,1],"10:1":[2,1],"19:9":[2,1],"19:11":[2,1],"19:1":[2,1],"30:2":[2,1],"19:3":[2,1],"30:4":[2,1],"43:1":[2,1],"43:13":[2,1],"46:12":[2,1],"49:1":[2,1],"49:3":[2,1],"49:13":[2,1],"46:9":[2,1],"40:8":[2,1],"40:10":[2,1],"46:13":[2,1],"37:7":[2,1],"37:9":[2,1],"30:5":[2,1],"30:7":[2,1],"49:2":[2,1],"43:4":[2,1],"43:6":[2,1],"49:6":[2,1],"43:10":[2,1],"40:1":[2,1],"49:9":[2,1],"49:11":[2,1],"43:5":[2,1],"43:7":[2,1],"46:2":[2,1],"37:10":[2,1],"46:4":[2,1],"19:5":[2,1],"37:12":[2,1],"19:7":[2,1],"30:10":[2,1],"30:12":[2,1],"46:8":[2,1],"19:2":[2,1],"10:12":[2,1],"30:13":[2,1],"46:10":[2,1],"49:12":[2,1],"19:4":[2,1],"19:6":[2,1],"19:13":[2,1],"37:3":[2,1],"37:5":[2,1],"46:7":[2,1],"40:7":[2,1],"19:10":[2,1],"40:9":[2,1],"30:1":[2,1],"19:12":[2,1]};
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

function appendWorkbookGrid(root, history, copy, saveCell, matchingRows) {
 const style = element('style', `
 .parking-workbook {overflow-x:auto; max-width:100%; border:1px solid #899aaa; margin-bottom:1.5rem}
 .parking-workbook table {border-collapse:separate; border-spacing:0; width:max-content; min-width:100%; font:14px Arial,sans-serif; color:#17253a}
 .parking-workbook th,.parking-workbook td {box-sizing:border-box; padding:4px 8px; border-right:1px solid #a1aebb; border-bottom:1px solid #a1aebb; min-width:65px; text-align:center; background:#fff; vertical-align:middle}
 .parking-workbook tr {height:22px}
 .parking-workbook .parking-entry {position:sticky; left:0; z-index:1; width:clamp(9rem,24vw,19rem); min-width:clamp(9rem,24vw,19rem); max-width:19rem; text-align:left; white-space:pre-wrap; overflow-wrap:anywhere}
 .parking-workbook th {font-weight:700}
 .parking-workbook td:has(.parking-edit-cell) {padding:0}
 .parking-workbook .parking-edit-cell {display:block; width:100%; min-height:28px; padding:4px 8px; border:0; border-radius:0; background:transparent; color:inherit; font:inherit; text-align:inherit; white-space:inherit; overflow-wrap:inherit; cursor:pointer}
 .parking-workbook .parking-edit-cell:hover,.parking-workbook .parking-edit-cell:focus-visible {outline:2px solid #215c39; outline-offset:-2px}
 .parking-edit-dialog {width:min(28rem,90vw); padding:1rem; border:1px solid #899aaa; border-radius:10px}
 .parking-edit-dialog textarea {display:block; width:100%; min-height:4rem}
 .parking-edit-dialog button {margin-right:.5rem}
 `);
 const scroll = element('div');
 scroll.className = 'parking-workbook';
 scroll.tabIndex = 0;
 const table = element('table');
 const body = table.createTBody();
 const source = new Map(history.map(row => [row.source_row,row]));
 const covered = new Set();
 const sourceRows=[...source.keys()].sort((a,b)=>b-a);
 const columnOwner=line=>sourceRows.find(sourceLine=>sourceLine<=line);
 for (let line=1; line<=50; line++) {
  const headingYear = line===1 ? 2025 : line===23 ? 2026 : null;
  const record = source.get(line);
  const row = body.insertRow();
  const owner = columnOwner(line);
  row.hidden=matchingRows!==null&&!headingYear&&!matchingRows.has(owner);
  for (let column=1; column<=13; column++) {
   const key = line+':'+column;
   if (covered.has(key)) continue;
   const value = headingYear ? (column===1 ? headingYear : column-1) : column===1 ? record?.entry : record?.months[column-2];
   const cell = element(headingYear ? 'th' : 'td', value);
   if (headingYear) cell.scope = 'col';
   if (column===1) cell.className = 'parking-entry';
   if (fills[key]) cell.style.backgroundColor = fills[key];
   if (merges[key]) {
    const [height,width] = merges[key];
    cell.rowSpan=height;
    cell.colSpan=width;
    for (let y=line;y<line+height;y++) for (let x=column;x<column+width;x++) covered.add(y+':'+x);
   }
   if (record && !headingYear) {
    const index=column-1;
    const heading=column===1 ? String(record.year) : String(column-1).padStart(2,'0')+'/'+record.year;
    const edit=element('button',value);
    edit.type='button';
    edit.className='parking-edit-cell';
    const announce=display=>edit.setAttribute('aria-label',copy[1]+' · '+heading+' · '+(display??''));
    announce(value);
    cell.replaceChildren(edit);
    edit.addEventListener('click',()=>{
     const previous=index===0?record.entry:record.months[index-1];
     editCell(root,copy,heading,previous,async text=>{
      const trimmed=text.trim();
      const number=/^-?(?:\d+|\d+[.,]\d+)$/.test(trimmed)?Number(trimmed.replace(',','.')):NaN;
      const next=index===0?text:!trimmed?null:Number.isFinite(number)?number:text;
      await saveCell(record.id,index,next);
      if(index===0)record.entry=next;
      else record.months[index-1]=next;
      edit.textContent=next??'';
      announce(next);
     });
    });
   }
   row.append(cell);
  }
 }
 scroll.append(table);
 root.append(style,scroll);
}

export function renderParkingRegister(root, lang, requests, history, saveCell) {
 const [inbox, form, empty, imported, name, plate, email, phone, from, to, amount, status, note] = words[lang] || words.sk;
 root.append(element('h4', imported));
 const copy=editWords[lang]||editWords.sk;
 root.append(element('p',copy[0]));
 const search = element('input');
 search.type='search';
 search.placeholder=({sk:'Hľadať meno alebo EČV',en:'Find name or plate',ru:'Имя или номер авто',uk:'Ім’я або номер авто'})[lang]||'Hľadať';
 search.setAttribute('aria-label',search.placeholder);
 const exportButton=element('button','Excel (.xlsx)');
 exportButton.type='button';
 exportButton.addEventListener('click',()=>{
  const sheets=[...new Set(history.map(record=>record.year))].sort().map(year=>({
   name:String(year), rows:[[year,...Array.from({length:12},(_,i)=>i+1)],
    ...history.filter(record=>record.year===year).sort((a,b)=>a.source_row-b.source_row).map(record=>[record.entry,...record.months])]
  }));
  downloadWorkbook('Parkovanie',sheets);
 });
 const ledger=element('div');
 root.append(search,exportButton,ledger);
 function paintLedger(){
  const query=search.value.trim().toLocaleLowerCase();
  const matches=query?new Set(history.filter(record=>[record.entry,...record.months].some(value=>String(value??'').toLocaleLowerCase().includes(query))).map(record=>record.source_row)):null;
  ledger.replaceChildren();
  appendWorkbookGrid(ledger,history,copy,saveCell,matches);
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
