-- Queue contains operational mail only. Auth account emails remain per student.
create table public.residence_mail_config (
 tenant_id uuid primary key references public.organizations(id),
 admin_email text not null,
 original_admin_email text not null default 'studenthouserecepcia@gmail.com',
 smtp_host text not null default 'smtp.gmail.com',
 smtp_port integer not null default 587 check(smtp_port in (465,587)),
 smtp_user text not null,
 sender_email text not null,
 sender_name text not null default 'Student House Bratislava',
 temporary boolean not null default true,
 updated_at timestamptz not null default now()
);
alter table public.residence_mail_config enable row level security;
revoke all on public.residence_mail_config from public,anon,authenticated;
grant all on public.residence_mail_config to service_role;
insert into public.residence_mail_config(tenant_id,admin_email,smtp_user,sender_email)
 select id,'martinamundova36@gmail.com','martinamundova36@gmail.com','martinamundova36@gmail.com'
 from public.organizations where name='Student House Bratislava';

create table public.residence_mail_outbox (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid not null references public.organizations(id),
 dedupe text not null unique,
 audience text not null check(audience in ('admin','student')),
 recipient text not null,
 subject text not null,
 body text not null,
 link text,
 auth_link_type text check(auth_link_type in ('recovery','magiclink')),
 status text not null default 'pending' check(status in ('pending','processing','accepted','failed')),
 attempts integer not null default 0,
 next_attempt_at timestamptz not null default now(),
 lease uuid,
 lease_until timestamptz,
 result text,
 message_id text,
 created_at timestamptz not null default now(),
 accepted_at timestamptz
);
alter table public.residence_mail_outbox enable row level security;
revoke all on public.residence_mail_outbox from public,anon,authenticated;
grant all on public.residence_mail_outbox to service_role;
create index residence_mail_due on public.residence_mail_outbox(next_attempt_at) where status in ('pending','processing');
create table private.residence_mail_clock(id boolean primary key default true check(id), last_run timestamptz not null default '-infinity');
insert into private.residence_mail_clock(id) values(true);
revoke all on private.residence_mail_clock from public,anon,authenticated;

create function public.residence_mail_claim() returns setof public.residence_mail_outbox
 language plpgsql security definer set search_path='' as $$
begin
 update private.residence_mail_clock set last_run=now() where id and last_run<now()-interval '55 seconds';
 if not found then return; end if;
 return query update public.residence_mail_outbox q set status='processing',attempts=q.attempts+1,
 lease=gen_random_uuid(),lease_until=now()+interval '3 minutes'
 where q.id in (select o.id from public.residence_mail_outbox o
 where ((o.status='pending' and o.next_attempt_at<=now()) or (o.status='processing' and o.lease_until<now()))
 and o.attempts<6 order by o.created_at for update skip locked limit 3) returning q.*;
end $$;
revoke all on function public.residence_mail_claim() from public,anon,authenticated;
grant execute on function public.residence_mail_claim() to service_role;
create function public.residence_mail_finish(p_id uuid,p_lease uuid,p_result text,p_message_id text default null)
 returns void language sql security definer set search_path='' as $$
 update public.residence_mail_outbox set
 status=case when p_result='accepted' then 'accepted' when attempts>=6 then 'failed' else 'pending' end,
 result=left(p_result,80),message_id=p_message_id,
 accepted_at=case when p_result='accepted' then now() else null end,
 next_attempt_at=now()+make_interval(mins=>least(60,attempts*attempts)),lease_until=null
 where id=p_id and lease=p_lease and status='processing';
$$;
revoke all on function public.residence_mail_finish(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.residence_mail_finish(uuid,uuid,text,text) to service_role;

create function private.residence_enqueue_mail(p_tenant uuid,p_key text,p_audience text,p_email text,p_subject text,p_body text,p_auth text default null)
 returns void language plpgsql security definer set search_path='' as $$
declare target text;
begin
 if p_audience='admin' then select admin_email into target from public.residence_mail_config where tenant_id=p_tenant;
 else target:=p_email; end if;
 if target is null or target='' then return; end if;
 insert into public.residence_mail_outbox(tenant_id,dedupe,audience,recipient,subject,body,auth_link_type)
 values(p_tenant,p_key,p_audience,target,p_subject,p_body,p_auth) on conflict(dedupe) do nothing;
end $$;
revoke all on function private.residence_enqueue_mail(uuid,text,text,text,text,text,text) from public,anon,authenticated;

create function private.residence_mail_event() returns trigger language plpgsql security definer set search_path='' as $$
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
   perform private.residence_enqueue_mail(new.tenant_id,key,'admin',null,'Student House: nový súbor / new file',
    'Študent nahral súbor. / A student uploaded a file. / Студент загрузил файл. / Студент завантажив файл.');
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
create trigger residence_mail_registration after insert or update on public.registration_requests for each row execute function private.residence_mail_event();
create trigger residence_mail_enquiry after insert or update on public.resident_enquiries for each row execute function private.residence_mail_event();
create trigger residence_mail_review after insert or update on public.resident_enquiry_reviews for each row execute function private.residence_mail_event();
create trigger residence_mail_file after insert or update on public.residence_portal_files for each row execute function private.residence_mail_event();
create trigger residence_mail_activation after update on public.residents for each row execute function private.residence_mail_event();
