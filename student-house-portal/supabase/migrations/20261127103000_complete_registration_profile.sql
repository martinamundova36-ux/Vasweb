create table private.registration_profile_photos (
 registration_id uuid primary key references public.registration_requests(id),
 user_id uuid not null references auth.users(id),
 object_path text not null unique,
 content_type text not null check (content_type in ('image/jpeg','image/png')),
 size_bytes integer not null check (size_bytes between 1 and 3000000),
 own_refrigerator boolean not null
);
alter table private.registration_profile_photos enable row level security;
revoke all on private.registration_profile_photos from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.residence_submit_registration(p_tenant uuid, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare rid uuid; duration integer; start_date date; end_date date; arrival_date date;
begin
 if coalesce(p_data->>'preferred_duration_months','') not in ('5','10','12') then
  raise exception 'invalid_stay_duration' using errcode='22023';
 end if;
 duration:=(p_data->>'preferred_duration_months')::integer;
 start_date:=(p_data->>'accommodation_from')::date;
 end_date:=(p_data->>'accommodation_to')::date;
 arrival_date:=(p_data->>'expected_arrival')::date;
 if start_date is null or end_date is null or arrival_date is null
 or extract(day from start_date) <> 1 or start_date < date '2000-01-01' or start_date >= date '2100-01-01'
 or end_date <> (date_trunc('month',start_date::timestamp)+make_interval(months=>duration)-interval '1 day')::date
 or arrival_date < start_date or date_trunc('month',arrival_date::timestamp)<>date_trunc('month',start_date::timestamp)
 then raise exception 'invalid_stay_dates' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':'||lower(p_data->>'email'),0));
 select id into rid from public.registration_requests where tenant_id=p_tenant and lower(email)=lower(p_data->>'email') and status in ('pending','correction_requested') order by created_at desc limit 1;
 if found then return jsonb_build_object('id',rid,'existing',true);end if;
 insert into public.registration_requests(tenant_id,first_name,last_name,email,room_number,accommodation_from,accommodation_to,status,privacy_acknowledged_at)
 values(p_tenant,p_data->>'first_name',p_data->>'last_name',lower(p_data->>'email'),null,(p_data->>'accommodation_from')::date,(p_data->>'accommodation_to')::date,'pending',now()) returning id into rid;
 insert into public.registration_enquiries(registration_id,tenant_id,permanent_address,date_of_birth,nationality,gender,identity_document_number,telephone,parent_contact_email,school,iban,preferred_room_type,preferred_duration_months,preferred_from,preferred_to)
 values(rid,p_tenant,coalesce(p_data->>'permanent_address',''),nullif(p_data->>'date_of_birth','')::date,coalesce(p_data->>'nationality',''),coalesce(p_data->>'gender',''),coalesce(p_data->>'identity_document_number',''),coalesce(p_data->>'telephone',''),coalesce(p_data->>'parent_contact_email',''),coalesce(p_data->>'school',''),coalesce(p_data->>'iban',''),coalesce(p_data->>'preferred_room_type',''),duration,arrival_date,end_date);
 if p_data ? 'photo_path' then
  insert into private.registration_profile_photos(registration_id, user_id, object_path, content_type, size_bytes, own_refrigerator)
  values(rid,(p_data->>'photo_user_id')::uuid,p_data->>'photo_path',p_data->>'photo_type',(p_data->>'photo_size')::int,(p_data->>'own_refrigerator')::boolean);
 end if;
 return jsonb_build_object('id',rid,'existing',false);
end $function$
;

create function private.move_registration_profile_to_resident()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
 photo private.registration_profile_photos%rowtype;
 profile public.residents%rowtype;
 q public.registration_enquiries%rowtype;
begin
 select * into photo from private.registration_profile_photos where registration_id=new.id;
 if not found then return new; end if;
 select * into strict profile from public.residents where tenant_id=new.tenant_id and user_id=photo.user_id;
 select * into strict q from public.registration_enquiries where tenant_id=new.tenant_id and registration_id=new.id;
 if exists (select 1 from public.resident_enquiries where tenant_id=new.tenant_id and resident_id=profile.id and student_submitted_at is not null)
 then raise exception 'existing_submitted_questionnaire'; end if;
 if exists (select 1 from public.residence_portal_files where tenant_id=new.tenant_id and user_id=photo.user_id and kind='profile_photo' and active)
 then raise exception 'existing_profile_photo'; end if;
 insert into public.residence_portal_files(tenant_id,user_id,resident_id,kind,object_path,original_name,content_type,size_bytes,uploaded_by,review_status,active)
 values(new.tenant_id,photo.user_id,profile.id,'profile_photo',photo.object_path,
 case photo.content_type when 'image/png' then 'profil.png' else 'profil.jpg' end,photo.content_type,photo.size_bytes,photo.user_id,'not_applicable',true);
 insert into public.resident_enquiries(tenant_id,resident_id,user_id,permanent_address,date_of_birth,nationality,gender,identity_document_number,telephone,parent_contact_email,school,iban,preferred_room_type,preferred_duration_months,preferred_from,preferred_to,own_refrigerator,student_submitted_at)
 values(new.tenant_id,profile.id,photo.user_id,q.permanent_address,q.date_of_birth,q.nationality,q.gender,q.identity_document_number,q.telephone,q.parent_contact_email,q.school,q.iban,left(q.preferred_room_type,80),q.preferred_duration_months,q.preferred_from,q.preferred_to,photo.own_refrigerator,new.created_at)
 on conflict (tenant_id,resident_id) do update set
 permanent_address=excluded.permanent_address,date_of_birth=excluded.date_of_birth,nationality=excluded.nationality,
 gender=excluded.gender,identity_document_number=excluded.identity_document_number,telephone=excluded.telephone,
 parent_contact_email=excluded.parent_contact_email,school=excluded.school,iban=excluded.iban,
 preferred_room_type=excluded.preferred_room_type,preferred_duration_months=excluded.preferred_duration_months,
 preferred_from=excluded.preferred_from,preferred_to=excluded.preferred_to,own_refrigerator=excluded.own_refrigerator,
 student_submitted_at=excluded.student_submitted_at;
 delete from private.registration_profile_photos where registration_id=new.id;
 return new;
end $$;
revoke all on function private.move_registration_profile_to_resident() from public, anon, authenticated;
create trigger move_registration_profile_to_resident
after update of status on public.registration_requests
for each row when (old.status is distinct from new.status and new.status='invited')
execute function private.move_registration_profile_to_resident();
