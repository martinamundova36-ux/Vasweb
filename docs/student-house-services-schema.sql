-- Extend existing service records; no duplicate residents or operational tables.
alter table public.service_requests add column urgent boolean not null default false;
alter table public.service_requests drop constraint service_requests_status_check;
alter table public.service_requests add constraint service_requests_status_check check (status in ('new','accepted','in_progress','waiting_parts','resolved','closed','cancelled'));
alter table public.cleaning_bookings drop constraint cleaning_bookings_status_check;
alter table public.cleaning_bookings add constraint cleaning_bookings_status_check check (status in ('requested','proposed','approved','rejected','completed','cancelled'));
alter table public.service_request_messages add column is_internal boolean not null default false;
alter table public.service_request_messages add column message_kind text not null default 'reply' check (message_kind in ('reply','status'));

-- Existing service_requests RLS still restricts the parent to its resident or tenant staff.
-- A second restrictive policy protects private notes even if another SELECT policy is added.
create policy messages_visibility_guard on public.service_request_messages as restrictive for select to authenticated
using (not is_internal or private.has_role(tenant_id,array['org_admin','reception']::public.member_role[]));
create policy messages_insert_guard on public.service_request_messages as restrictive for insert to authenticated
with check (message_kind='reply' and (not is_internal or private.has_role(tenant_id,array['org_admin','reception']::public.member_role[])));
create index service_message_timeline on public.service_request_messages(tenant_id,request_id,created_at,id);

create or replace function private.message_notification() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not new.is_internal and new.message_kind='reply' and private.has_role(new.tenant_id,array['org_admin','reception']::public.member_role[]) then
  insert into public.notifications(tenant_id,user_id,title,body)
  select r.tenant_id,s.user_id,'message_received',r.id::text from public.service_requests r
  join public.residents s on s.id=r.resident_id and s.tenant_id=r.tenant_id where r.id=new.request_id and r.tenant_id=new.tenant_id;
 end if;
 return new;
end $$;
revoke all on function private.message_notification() from public,anon,authenticated;

-- Only trusted triggers append status history; client inserts are limited to replies above.
create function private.residence_service_event() returns trigger language plpgsql security definer set search_path='' as $$
declare email text; person uuid; event_key text; subject text; message text; target text;
begin
 event_key:=tg_table_name||':'||new.id::text||':'||txid_current()::text;
 if tg_table_name='service_request_messages' then
  if new.is_internal or new.message_kind<>'reply' then return new;end if;
  select r.resident_id into person from public.service_requests r where r.id=new.request_id and r.tenant_id=new.tenant_id;
  select r.email into email from public.residents r where r.id=person and r.tenant_id=new.tenant_id;
  if private.has_role(new.tenant_id,array['org_admin','reception']::public.member_role[]) then target:='student';else target:='admin';end if;
  perform private.residence_enqueue_mail(new.tenant_id,event_key,target,email,'Student House: nová správa / new message',
   'K požiadavke pribudla nová správa. Otvor svoj portál. / There is a new message on a request. Open your portal. / Новое сообщение по заявке. / Нове повідомлення щодо заявки.');
  return new;
 end if;
 select r.email into email from public.residents r where r.id=new.resident_id and r.tenant_id=new.tenant_id;
 if tg_table_name='service_requests' then
  subject:='Student House: požiadavka / service request';
  if tg_op='UPDATE' and new.status is distinct from old.status and auth.uid() is not null then
   insert into public.service_request_messages(tenant_id,request_id,author_id,body,message_kind,is_internal)
   values(new.tenant_id,new.id,auth.uid(),new.status,'status',false);
  end if;
 else subject:='Student House: upratovanie / cleaning';end if;
 if tg_op='INSERT' then
  perform private.residence_enqueue_mail(new.tenant_id,event_key||':admin','admin',null,subject,
   'Nová žiadosť čaká na spracovanie. / A new request awaits processing. / Новая заявка ожидает обработки. / Нова заявка очікує обробки.');
  perform private.residence_enqueue_mail(new.tenant_id,event_key||':receipt','student',email,subject,
   'Žiadosť bola prijatá. Stav nájdeš vo svojom profile. / Your request was received. Check its status in your profile. / Заявка получена. / Заявку отримано.');
 elsif new.status is distinct from old.status or new.staff_note is distinct from old.staff_note or
  (tg_table_name='cleaning_bookings' and (to_jsonb(new)->>'scheduled_at' is distinct from to_jsonb(old)->>'scheduled_at' or to_jsonb(new)->>'price_eur' is distinct from to_jsonb(old)->>'price_eur')) then
  perform private.residence_enqueue_mail(new.tenant_id,event_key||':update','student',email,subject,
   'Recepcia aktualizovala tvoju žiadosť. Podrobnosti nájdeš v profile. / Reception updated your request. Check your profile for details. / Ресепшен обновил вашу заявку. / Рецепція оновила вашу заявку.');
 end if;
 return new;
end $$;
revoke all on function private.residence_service_event() from public,anon,authenticated;
create trigger residence_service_events after insert or update on public.service_requests for each row execute function private.residence_service_event();
create trigger residence_cleaning_events after insert or update on public.cleaning_bookings for each row execute function private.residence_service_event();
create trigger residence_message_events after insert on public.service_request_messages for each row execute function private.residence_service_event();

alter table public.cleaning_bookings add column cleaning_type text not null default 'standard' check(cleaning_type in ('standard','deep','other'));
alter table public.cleaning_bookings add constraint cleaning_proposed_appointment_check check (status<>'proposed' or scheduled_at is not null);
