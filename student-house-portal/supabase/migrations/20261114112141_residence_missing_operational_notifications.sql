create or replace function private.residence_mail_event() returns trigger language plpgsql security definer set search_path='' as $$
declare j jsonb:=to_jsonb(new); previous jsonb; key text; email text; resident uuid; submitted timestamptz;
begin
 if tg_op='UPDATE' then previous:=to_jsonb(old); else previous:='{}'::jsonb; end if;
 key:=tg_table_name||':'||coalesce(j->>'id',j->>'resident_id')||':'||txid_current()::text;
 resident:=coalesce((j->>'resident_id')::uuid,case when tg_table_name='residents' then (j->>'id')::uuid end);
 if resident is not null then select r.email into email from public.residents r where r.id=resident and r.tenant_id=(j->>'tenant_id')::uuid; end if;
 if tg_table_name='registration_requests' then
  if tg_op='INSERT' or (j->>'status'='pending' and previous->>'status'='correction_requested') then
   perform private.residence_enqueue_mail(new.tenant_id,key,'admin',null,'Student House: registrácia / registration',
    'Nová alebo opravená registrácia čaká na kontrolu. / A new or corrected registration awaits review. / Новая или исправленная заявка ожидает проверки. / Нова або виправлена заявка очікує перевірки.');
   if tg_op='INSERT' then
    perform private.residence_enqueue_mail(new.tenant_id,key||':receipt','student',new.email,'Student House: registrácia prijatá / registration received',
     'Registrácia bola prijatá a čaká na schválenie recepciou. / Your registration was received and awaits reception approval. / Заявка получена и ожидает одобрения. / Заявку отримано, вона очікує схвалення.');
   end if;
  elsif j->>'status'='rejected' and previous->>'status' is distinct from 'rejected' then
   perform private.residence_enqueue_mail(new.tenant_id,key,'student',new.email,'Student House: výsledok registrácie / registration outcome',
    'Recepcia zamietla registračnú žiadosť. Ak potrebuješ vysvetlenie, kontaktuj recepciu. / Reception declined your registration. Contact reception if you need clarification. / Ресепшен отклонил заявку. / Рецепція відхилила заявку.');
  elsif j->>'status'='invited' and previous->>'status' is distinct from 'invited' then
   perform private.residence_enqueue_mail(new.tenant_id,key,'admin',null,'Student House: schválenie registrácie / approval',
    'Registrácia bola schválená. Stav pozvánky skontrolujte v administrácii. / Registration approved; check invitation status in administration. / Заявка одобрена. / Заявку схвалено.');
  end if;
 elsif tg_table_name='resident_enquiries' then
  if j->>'student_submitted_at' is not null and j->>'student_submitted_at' is distinct from previous->>'student_submitted_at' then
   perform private.residence_enqueue_mail(new.tenant_id,key,'admin',null,'Student House: dotazník na kontrolu / questionnaire',
    'Študent odoslal dotazník. / A student submitted a questionnaire. / Студент отправил анкету. / Студент надіслав анкету.');
  end if;
 elsif tg_table_name='resident_enquiry_reviews' then
  if tg_op='INSERT' or j->>'review_status' is distinct from previous->>'review_status' or j->>'requested_at' is distinct from previous->>'requested_at' then
   if j->>'review_status'='approved' then
    select student_submitted_at into submitted from public.resident_enquiries where resident_id=resident and tenant_id=new.tenant_id;
    if submitted is not null and submitted<=new.requested_at then
     perform private.residence_enqueue_mail(new.tenant_id,key,'student',email,'Student House: aktivácia profilu / activate profile',
      'Recepcia schválila dotazník. Otvor odkaz a nastav si heslo. / Reception approved your questionnaire. Open the link to set your password. / Анкета одобрена. Откройте ссылку и задайте пароль. / Анкету схвалено. Відкрийте посилання та встановіть пароль.','recovery');
    end if;
   else
    perform private.residence_enqueue_mail(new.tenant_id,key,'student',email,'Student House: oprava dotazníka / questionnaire correction',
     'Dotazník bol vrátený na opravu. Pokyny nájdeš po otvorení odkazu. / Your questionnaire needs corrections. Open the link for instructions. / Анкету нужно исправить. / Анкету потрібно виправити.','magiclink');
   end if;
  end if;
 elsif tg_table_name='residence_portal_files' then
  if j->>'active'='true' and (tg_op='INSERT' or previous->>'active' is distinct from 'true') then
   if j->>'kind' in ('contract_draft','schedule_draft','certificate_draft','resident_document') then
    perform private.residence_enqueue_mail(new.tenant_id,key,'student',email,'Student House: nový dokument / new document',
     'Recepcia ti pripravila nový osobný dokument. Prihlás sa a otvor Dokumenty. / Reception has provided a new personal document. Sign in and open Documents. / Новый документ доступен в профиле. / Новий документ доступний у профілі.');
   elsif j->>'kind' not in ('rules_template','gdpr_template') then
    perform private.residence_enqueue_mail(new.tenant_id,key,'admin',null,'Student House: nový súbor / new file',
     'Študent nahral súbor. / A student uploaded a file. / Студент загрузил файл. / Студент завантажив файл.');
   end if;
  elsif j->>'review_status' in ('approved','rejected') and j->>'review_status' is distinct from previous->>'review_status' then
   perform private.residence_enqueue_mail(new.tenant_id,key,'student',email,'Student House: kontrola dokumentu / document review',
    'Recepcia skontrolovala dokument. Výsledok nájdeš vo svojom profile. / Reception reviewed your document. Check your profile for the result. / Документ проверен. / Документ перевірено.');
  end if;
 elsif tg_table_name='residents' and j->>'profile_password_activated_at' is not null and previous->>'profile_password_activated_at' is null then
  perform private.residence_enqueue_mail(new.tenant_id,key||':admin','admin',null,'Student House: profil aktivovaný / profile activated',
   'Študentský profil bol aktivovaný. / Student profile activated. / Профиль активирован. / Профіль активовано.');
  perform private.residence_enqueue_mail(new.tenant_id,key||':student','student',email,'Student House: profil aktivovaný / profile activated',
   'Tvoj profil je aktívny. Prihlás sa svojím heslom. / Your profile is active. Sign in with your password. / Ваш профиль активен. / Ваш профіль активний.');
 end if;
 return new;
end $$;
revoke all on function private.residence_mail_event() from public,anon,authenticated;
