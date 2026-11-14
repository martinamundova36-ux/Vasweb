-- Already deployed in Supabase as migration 20261114184304.
-- Read-only private inbox; residents can update only their own read_at marker.
revoke insert,update,delete,truncate on public.notifications from anon,authenticated;
grant update(read_at) on public.notifications to authenticated;
drop policy if exists resident_mark_own_notification_read on public.notifications;
create policy resident_mark_own_notification_read on public.notifications for update to authenticated
 using (user_id=(select auth.uid()) and private.has_role(tenant_id))
 with check (user_id=(select auth.uid()) and private.has_role(tenant_id));
create index if not exists notifications_user_unread_idx
 on public.notifications(tenant_id,user_id,read_at,created_at desc);

create or replace function private.residence_registration_in_app_alert()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_user uuid;
begin
 if new.status='invited' and old.status is distinct from new.status then
  select r.user_id into v_user from public.residents r
  where r.tenant_id=new.tenant_id and r.active and lower(r.email)=lower(new.email)
   and r.verified_contract_number=new.contract_number
   and exists (select 1 from public.organization_memberships m
    where m.tenant_id=r.tenant_id and m.user_id=r.user_id and m.role='student' and m.active)
  limit 1;
  if v_user is not null then
   insert into public.notifications(tenant_id,user_id,title,body)
   values(new.tenant_id,v_user,'Registrácia schválená – pokračuj v dotazníku',
    'Student House Bratislava schválil tvoju registráciu. Prihlás sa svojím e-mailom a heslom a vyplň osobný dotazník vrátane fotografie. Všetko vybavíš priamo v aplikácii Studenthouse.');
  end if;
 end if;
 return new;
end $fn$;
revoke all on function private.residence_registration_in_app_alert() from public, anon, authenticated;
drop trigger if exists residence_registration_in_app_alert on public.registration_requests;
create trigger residence_registration_in_app_alert after update of status on public.registration_requests
for each row when (new.status='invited' and old.status is distinct from new.status)
execute function private.residence_registration_in_app_alert();

create or replace function private.residence_questionnaire_in_app_alert()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare v_user uuid;v_body text;
begin
 if tg_op='UPDATE' and new.review_status is not distinct from old.review_status
  and new.requested_at is not distinct from old.requested_at then
  return new;
 end if;
 select r.user_id into v_user from public.residents r
 where r.id=new.resident_id and r.tenant_id=new.tenant_id and r.active limit 1;
 if v_user is null then return new;end if;
 if new.review_status='approved' then
  insert into public.notifications(tenant_id,user_id,title,body)
  values(new.tenant_id,v_user,'Dotazník schválený – aktivuj profil',
   'Recepcia Student House Bratislava schválila tvoj osobný dotazník. Otvor Studenthouse, aktivuj svoj profil a pokračuj dokumentmi.');
 elsif new.review_status='needs_correction' then
  v_body='Recepcia potrebuje opravu osobného dotazníka. Otvor sekciu Osobný dotazník a doplň údaje.';
  insert into public.notifications(tenant_id,user_id,title,body)
  values(new.tenant_id,v_user,'Dotazník vrátený na opravu',v_body);
 end if;
 return new;
end $fn$;
revoke all on function private.residence_questionnaire_in_app_alert() from public, anon, authenticated;
drop trigger if exists residence_questionnaire_in_app_alert on public.resident_enquiry_reviews;
create trigger residence_questionnaire_in_app_alert after insert or update of review_status, requested_at
 on public.resident_enquiry_reviews for each row
 execute function private.residence_questionnaire_in_app_alert();
