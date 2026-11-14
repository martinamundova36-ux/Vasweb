import {chargeBalance} from './ledger.js';
// Export only tenant-scoped rows supplied by the authenticated screen. Never embed signed URLs or room codes.
export function operationalSheets(data){
 const {residents=[],enquiries=[],reviews=[],files=[],registrations=[],cleaning=[],requests=[],charges=[],payments=[],allocations=[],reversals=[],plans=[],items=[],audit=[]}=data;
 const missing='Nezadané',optional=v=>v||'Neuvedené (nepovinné)';
 const person=id=>residents.find(r=>r.id===id);
 const identity=id=>{const p=person(id);return [id,p?.full_name||missing,p?.email||missing,p?.verified_room_number||missing]};
 const sheet=(name,header,rows)=>({name,rows:[header,...rows]});
 return [
  sheet('Profily a dotazníky',['ID rezidenta','Meno a priezvisko','E-mail','Izba','Dátum narodenia','Štátna príslušnosť','Telefón','Trvalá adresa','Škola','Kontakt rodiča (nepovinný)','IBAN (nepovinný)','Dotazník odoslaný','Stav kontroly','Dôvod opravy','Kontrola dátum','Fotografia'],residents.map(p=>{
   const q=enquiries.find(q=>q.resident_id===p.id)||{},review=reviews.find(r=>r.resident_id===p.id),photo=files.find(f=>f.resident_id===p.id&&f.kind==='profile_photo'&&f.active);
   const changed=review&&q.student_submitted_at&&q.student_submitted_at>review.requested_at;
   return [...identity(p.id),q.date_of_birth||missing,q.nationality||missing,q.telephone||missing,q.permanent_address||missing,q.school||missing,optional(q.parent_contact_email),optional(q.iban),q.student_submitted_at||'Neodoslaný',changed?'Čaká na opätovnú kontrolu':review?.review_status||'Neskontrolovaný',review?.correction_reason||'',review?.requested_at||'',photo?.original_name||'Nenahraná'];
  })),
  sheet('Registrácie',['ID žiadosti','Meno','Priezvisko','E-mail','Izba','Zmluva','Od','Do','Stav','Dôvod opravy','Odoslané','Skontrolované'],registrations.map(r=>[r.id,r.first_name,r.last_name,r.email,r.room_number||'Nepridelená',r.contract_number||'Nepridelená',r.accommodation_from,r.accommodation_to,r.status,r.correction_reason||'',r.created_at,r.reviewed_at||''])),
  sheet('Dokumenty',['ID súboru','ID rezidenta','Meno a priezvisko','E-mail','Izba','Druh','Názov súboru','Aktívny','Stav kontroly','Poznámka','Nahrané','Skontrolované'],files.map(f=>[f.id,...identity(f.resident_id),f.kind,f.original_name,f.active?'Áno':'Nie',f.review_status,f.staff_note||'',f.created_at,f.reviewed_at||''])),
  sheet('Predpisy',['ID predpisu','ID rezidenta','Meno a priezvisko','E-mail','Izba','Obdobie','Druh','Splatnosť','Predpis EUR','Uhradené EUR','Zostatok EUR'],charges.map(c=>{const b=chargeBalance(c,allocations,reversals);return [c.id,...identity(c.resident_id),c.period,c.kind,c.due_on,Number(c.amount),b.paid/100,b.remaining/100]})),
  sheet('Prijaté platby',['ID platby','ID rezidenta','Meno a priezvisko','E-mail','Izba','Prijaté EUR','Dátum prijatia','Spôsob','Referencia','Storno'],payments.map(p=>[p.id,...identity(p.resident_id),Number(p.amount),p.received_on,p.method,p.reference||'',reversals.some(r=>r.payment_id===p.id)?'Áno':'Nie'])),
  sheet('Alokácie platieb',['ID alokácie','ID platby','ID predpisu','Priradené EUR'],allocations.map(a=>[a.id,a.payment_id,a.charge_id,Number(a.amount)])),
  sheet('Storná',['ID storna','ID platby','Dôvod','Dátum','Pracovník'],reversals.map(r=>[r.id,r.payment_id,r.reason,r.created_at,r.created_by])),
  sheet('Splátky',['ID splátky','ID plánu','ID predpisu','ID rezidenta','Splatnosť','Suma EUR'],items.map(i=>{const p=plans.find(p=>p.id===i.plan_id);return [i.id,i.plan_id,p?.charge_id||'',p?.resident_id||'',i.due_on,Number(i.amount)]})),
  sheet('Upratovanie',['ID objednávky','ID rezidenta','Meno a priezvisko','E-mail','Izba','Požadovaný deň','Potvrdený termín','Druh','Stav','Cena EUR','Poznámka recepcie','Vytvorené'],cleaning.map(c=>[c.id,...identity(c.resident_id),c.preferred_date,c.scheduled_at||'Nepotvrdený',c.cleaning_type,c.status,c.price_eur==null?'Neurčená':Number(c.price_eur),c.staff_note||'',c.created_at])),
  sheet('Poruchy a požiadavky',['ID požiadavky','ID rezidenta','Meno a priezvisko','E-mail','Izba','Kategória','Predmet','Popis','Stav','Poznámka recepcie','Vytvorené','Aktualizované','Fotografie'],requests.map(r=>[r.id,...identity(r.resident_id),r.category,r.subject,r.description,r.status,r.staff_note||'',r.created_at,r.updated_at,files.filter(f=>f.active&&f.service_request_id===r.id).map(f=>f.original_name).join('; ')])),
  sheet('Audit',['ID udalosti','Dátum','Pracovník','Operácia','Entita','ID záznamu'],audit.map(a=>[String(a.id),a.created_at,a.actor_id,a.action,a.entity,a.entity_id]))
 ];
}
