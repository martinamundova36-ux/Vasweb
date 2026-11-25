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
export function renderParkingRegister(root, lang, requests, history) {
 const [inbox, form, empty, imported, name, plate, email, phone, from, to, amount, status, note, entry] = words[lang] || words.sk;
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
 root.append(element('h4', imported));
 const years = [...new Set(history.map(row => row.year))].sort();
 for (const year of years) {
  root.append(element('h5', year));
  const rows = history.filter(row => row.year === year).sort((a,b) => a.source_row-b.source_row);
  appendTable(root, [entry,...Array.from({length:12},(_,month)=>String(month+1).padStart(2,'0')+'/'+String(year).slice(-2))],
   rows.map(row => [row.entry,...row.months]));
 }
}
