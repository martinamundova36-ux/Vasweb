import {downloadWorkbook} from './excel.js';
const words={
 sk:['Excel evidencia ubytovania','Späť do administrácie','','Hľadať v tabuľke','Stiahnuť Excel','Upraviť bunku','Hodnota','Poznámka','Uložiť','Zrušiť','Uloženie zlyhalo.','Riadkov','Importovaná evidencia'],
 en:['Accommodation register','Back to administration','','Search register','Download Excel','Edit cell','Value','Note','Save','Cancel','Could not save.','Rows','Imported register'],
 ru:['Реестр проживания','Назад в администрацию','','Поиск','Скачать Excel','Изменить ячейку','Значение','Примечание','Сохранить','Отмена','Не удалось сохранить.','Строк','Импортированный реестр'],
 uk:['Реєстр проживання','Назад до адміністрації','','Пошук','Завантажити Excel','Редагувати клітинку','Значення','Примітка','Зберегти','Скасувати','Не вдалося зберегти.','Рядків','Імпортований реєстр']
};
const el=(tag,text)=>{const x=document.createElement(tag);if(text!==undefined&&text!==null)x.textContent=String(text);return x;};
const btn=(text,fn)=>{const x=el('button',text);x.type='button';x.onclick=fn;return x;};
const col=n=>{let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;};
export async function renderImportedExcel({root,db,tenant,lang,isCurrent,onBack,focus}){
 const w=words[lang]||words.sk;
 const {data,error}=await db.from('student_house_excel_imports').select('source_sha,sheet_order,sheet_name,payload,imported_at').eq('tenant_id',tenant).order('imported_at',{ascending:false}).order('sheet_order');
 if(!isCurrent())return true;
 if(error||!data?.length){root.append(el('p',({sk:'Evidenciu sa nepodarilo načítať.',en:'Could not load the register.',ru:'Не удалось загрузить реестр.',uk:'Не вдалося завантажити реєстр.'})[lang]));return false;}
 const sha=data[0].source_sha,sheets=data.filter(x=>x.source_sha===sha).sort((a,b)=>a.sheet_order-b.sheet_order);
 const edits=new Map();let writable=true;
 for(let start=0;;start+=500){
  const result=await db.from('student_house_excel_import_edits').select('sheet_order,row_number,column_number,value,note').eq('tenant_id',tenant).eq('source_sha',sha).order('sheet_order').order('row_number').order('column_number').range(start,start+499);
  if(!isCurrent())return true;
  if(result.error){writable=false;break;}
  for(const item of result.data||[])edits.set(item.sheet_order+':'+item.row_number+':'+item.column_number,item);
  if((result.data||[]).length<500)break;
 }

 // Financial cells use the same validated schedule as the QR document. Never
 // assign a resident by room alone (rooms can have multiple occupants).
 const normalized=v=>String(v??'').trim().toLowerCase();
 const financialRows=new Map();let financialError=false;
 try{
  const load=async table=>{const all=[];for(let start=0;;start+=500){const {data,error}=await db.from(table).select('*').eq('tenant_id',tenant).order('id').range(start,start+499);if(error)throw error;all.push(...(data||[]));if((data||[]).length<500)return all;}};
  const [people,stays,charges,plans,items,details]=await Promise.all(['residents','tenancies','rent_charges','installment_plans','installment_items','resident_staff_details'].map(load));
  const {buildStudentHouseSchedule}=await import('./installment-document.js?v=20261125-qr-vat1');
  for(const sheet of sheets){
   const header=sheet.payload.rows[0]?.[1]||[],emailIndex=header.findIndex(v=>normalized(v)==='email'),roomIndex=header.findIndex(v=>normalized(v)==='izba');
   if(emailIndex<0||roomIndex<0)continue;
   for(const [row,values] of sheet.payload.rows.slice(1)){
    const cell=i=>edits.get(sheet.sheet_order+':'+row+':'+(i+1))?.value??values[i];
    const email=normalized(cell(emailIndex));if(!email)continue;
    const matches=people.filter(p=>p.active&&!p.archived_at&&normalized(p.email)===email&&normalized(p.verified_room_number)===normalized(cell(roomIndex)));
    if(matches.length!==1)continue;
    const p=matches[0],contracts=stays.filter(s=>s.resident_id===p.id&&s.starts_on===p.accommodation_from&&s.ends_on===p.accommodation_to),d=details.filter(x=>x.resident_id===p.id);
    if(contracts.length!==1||d.length!==1)continue;
    let schedule;
    try{schedule=buildStudentHouseSchedule({accommodation_from:p.accommodation_from,accommodation_to:p.accommodation_to,monthly_rent:contracts[0].rent,deposit:d[0].deposit_eur,admin_fee:d[0].administration_fee_eur},charges,plans,items,p.id);}catch{continue;}
    const sums=new Map();
    for(const entry of schedule){const key=entry.kind==='rent'?entry.period:entry.kind;sums.set(key,(sums.get(key)||0)+Math.round(Number(entry.amount)*100));}
    header.forEach((label,i)=>{
     const h=normalized(label),m=h.match(/^(\d{2})\/(\d{2})$/);
     const key=m?'20'+m[2]+'-'+m[1]:h==='depozit'?'deposit':/^admin\.\s*poplatok$/.test(h)?'administration_fee':null;
     if(!key)return;
     const period=key==='deposit'||key==='administration_fee'?String(p.accommodation_from).slice(0,7):key;
     const months=header.map(v=>String(v??'').match(/^(\d{2})\/(\d{2})$/)).filter(Boolean).map(m=>'20'+m[2]+'-'+m[1]);
     if(!months.includes(period)||(!sums.has(key)&&key!=='deposit'&&key!=='administration_fee'))return;
     financialRows.set(sheet.sheet_order+':'+row+':'+(i+1),(sums.get(key)||0)/100);
    });
   }
  }
 }catch{financialError=true;}
 if(!isCurrent())return true;
 const section=el('section');section.className='sh-imported-register';
 const style=el('style',`
 .sh-imported-register .import-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:12px 0}
 .sh-imported-register .import-toolbar input{flex:1 1 14rem}
 .sh-imported-register .import-scroll{width:100%;max-height:72vh;overflow:auto;border:1px solid #cbd8e8;border-radius:10px}
 .sh-imported-register table{width:max-content;min-width:100%;border-collapse:separate;border-spacing:0;font-size:14px}
 .sh-imported-register th,.sh-imported-register td{min-width:80px;padding:8px 12px;border-right:1px solid #d5e1ef;border-bottom:1px solid #d5e1ef;white-space:pre-wrap;max-width:370px;overflow-wrap:anywhere;vertical-align:middle}
 .sh-imported-register th{background:#c5dfb4;position:sticky;top:0;z-index:2;color:#142b4d}
 .sh-imported-register tbody tr:nth-child(odd) td{background:#e2efda}
 .sh-imported-register .import-cell{background:transparent;color:#142b4d;font:inherit;border:0;border-radius:0;padding:3px;min-height:28px;text-align:left;white-space:pre-wrap;overflow-wrap:anywhere;width:100%}
 .sh-imported-register .import-cell:focus-visible{outline:2px solid #17643c}
 .sh-imported-register .import-comment{color:#a52134;font-weight:bold;margin-left:5px}
 .sh-imported-register dialog{width:min(520px,92vw);border:1px solid #a6b5c6;border-radius:12px;padding:20px}
 .sh-imported-register dialog textarea{display:block;width:100%;min-height:70px;box-sizing:border-box;margin-bottom:10px}
 `);
 const tools=el('div');tools.className='import-toolbar';tools.append(btn(w[1],onBack));
 const tabs=el('div');tabs.className='import-toolbar';
 const search=el('input');search.type='search';search.placeholder=w[3];search.setAttribute('aria-label',w[3]);
 const count=el('p');count.setAttribute('aria-live','polite');
 const scroll=el('div');scroll.className='import-scroll';scroll.tabIndex=0;
 let selected=sheets.find(x=>x.sheet_name===(focus?.year===2027?'od 02 2027':'od 09 2026'))||sheets[0];
 if(focus?.room)search.value=focus.room;
 const tabButtons=new Map();
 const get=(sheet,row,i,value)=>financialRows.has(sheet.sheet_order+':'+row+':'+(i+1))?financialRows.get(sheet.sheet_order+':'+row+':'+(i+1)):edits.has(sheet.sheet_order+':'+row+':'+(i+1))?edits.get(sheet.sheet_order+':'+row+':'+(i+1)).value:value??'';
 const noteFor=(sheet,row,i)=>edits.get(sheet.sheet_order+':'+row+':'+(i+1))?.note??sheet.payload.comments?.[col(i)+row]??'';
 const widthFor=sheet=>Math.max(...sheet.payload.rows.map(([,values])=>values.length));
 const valuesFor=(sheet,row,values)=>Array.from({length:widthFor(sheet)},(_,i)=>get(sheet,row,i,values[i]));
 const noteRows=()=>sheets.flatMap(sheet=>Object.entries(sheet.payload.comments||{}).map(([ref,note])=>[sheet.sheet_name,ref,note]));
 tools.append(btn(w[4],()=>downloadWorkbook('Student-House-evidencia',[
  ...sheets.map(sheet=>({name:sheet.sheet_name,rows:sheet.payload.rows.map(([row,values])=>valuesFor(sheet,row,values))})),
  {name:'Pôvodné poznámky',rows:[['Hárok','Bunka','Poznámka'],...noteRows()]},
  {name:'Úpravy evidencie',rows:[['Hárok','Riadok','Stĺpec','Hodnota','Poznámka'],...Array.from(edits.values()).map(e=>[sheets.find(s=>s.sheet_order===e.sheet_order)?.sheet_name,e.row_number,e.column_number,e.value,e.note])]}
 ])));
 for(const sheet of sheets){const t=btn(sheet.sheet_name,()=>{selected=sheet;paint();});tabButtons.set(sheet.sheet_order,t);tabs.append(t);}
 function edit(sheet,row,i,original){
  const dialog=el('dialog'),form=el('form'),value=el('textarea'),note=el('textarea'),status=el('p');
  const before=get(sheet,row,i,original);value.value=String(before??'');value.maxLength=7900;note.value=noteFor(sheet,row,i);note.maxLength=8000;
  const valueLabel=el('label',w[6]),noteLabel=el('label',w[7]);valueLabel.append(value);noteLabel.append(note);
  const save=el('button',w[8]);save.type='submit';
  form.append(el('h3',w[5]+' · '+col(i)+row),valueLabel,noteLabel,status,btn(w[9],()=>dialog.close()),save);
  dialog.append(form);section.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal();
  form.onsubmit=async e=>{
   e.preventDefault();if(save.disabled)return;save.disabled=true;
   const newValue=value.value===String(before??'')?before:typeof before==='number'&&/^-?\d+(?:[.,]\d+)?$/.test(value.value.trim())?Number(value.value.replace(',','.')):value.value;
   const item={tenant_id:tenant,source_sha:sha,sheet_order:sheet.sheet_order,row_number:row,column_number:i+1,value:newValue??'',note:note.value};
   const {error}=await db.from('student_house_excel_import_edits').upsert(item,{onConflict:'tenant_id,source_sha,sheet_order,row_number,column_number'});
   if(error){status.textContent=w[10];save.disabled=false;return;}
   edits.set(sheet.sheet_order+':'+row+':'+(i+1),item);dialog.close();paint();
  };
 }
 function paint(){
  for(const [id,t] of tabButtons){const active=id===selected.sheet_order;t.setAttribute('aria-pressed',String(active));t.style.background=active?'#142b4d':'#ffffff';t.style.color=active?'#ffffff':'#142b4d';t.style.border='1px solid #142b4d';}
  const sheet=selected,rows=sheet.payload.rows,width=widthFor(sheet),q=search.value.trim().toLocaleLowerCase();
  const table=el('table'),head=table.createTHead().insertRow(),body=table.createTBody();
  const [headerRow,header]=rows[0];
  // Preserve original cell coordinates for edits and comments.
  const typeIndex=header.findIndex(v=>String(v??'').trim().toUpperCase()==='TYP');
  const roomSheet=typeIndex>=0&&header.some(v=>String(v??'').trim().toUpperCase()==='IZBA');
  const duplicateTypes=new Set(['Š2','D2','D2V','SUI2','Š1+1','Š2+2','M','MANŽ.POSTEĽ']);
  const visibleColumns=Array.from({length:width},(_,i)=>i).filter(i=>!roomSheet||i<=typeIndex||!duplicateTypes.has(String(header[i]??'').trim().toUpperCase().replace(/\s+/g,'')));
  const typeTitle={sk:'TYP IZBY',en:'ROOM TYPE',ru:'ТИП КОМНАТЫ',uk:'ТИП КІМНАТИ'};
  for(const i of visibleColumns){const cell=el('th',roomSheet&&i===typeIndex?(typeTitle[lang]||typeTitle.sk):header[i]??'');cell.scope='col';head.append(cell);}
  let shown=0;
  for(const [row,values] of rows.slice(1)){
   const actual=valuesFor(sheet,row,values);
   if(q&&!actual.some((v,i)=>String(v??'').toLocaleLowerCase().includes(q)||noteFor(sheet,row,i).toLocaleLowerCase().includes(q)))continue;
   shown++;const tr=body.insertRow();
   for(const i of visibleColumns){
    const cell=el('td'),n=noteFor(sheet,row,i),v=actual[i];
    const synced=financialRows.has(sheet.sheet_order+':'+row+':'+(i+1));
    const control=writable&&!synced?btn(v??'',()=>edit(sheet,row,i,values[i])):el('span',v??'');
    if(synced){control.title='Predpis zo splátkového kalendára / Scheduled amount';cell.style.boxShadow='inset 3px 0 #17643c';}
    control.className='import-cell';if(n){control.title=n;control.append(el('span',' •'));control.lastChild.className='import-comment';}
    cell.append(control);tr.append(cell);
   }
  }
  count.textContent=w[11]+': '+shown+' / '+Math.max(0,rows.length-1);scroll.replaceChildren(table);
 }
 section.append(style,el('h3',w[0]),tools,el('p',financialError?'Splátkové kalendáre sa nepodarilo načítať. Zobrazené sú pôvodné hodnoty.':financialRows.size?'Zelené označenie: predpísané sumy zo splátkového kalendára (nie potvrdené úhrady).':'Žiadne zhodné overené splátkové kalendáre. Zobrazené sú pôvodné hodnoty.'),tabs,search,count,scroll);root.append(section);search.oninput=paint;paint();return true;
}
