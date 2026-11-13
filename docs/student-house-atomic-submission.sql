-- The request and its private answers commit together, including their notification triggers.
alter table public.registration_requests add column privacy_acknowledged_at timestamptz;
create function public.residence_submit_registration(p_tenant uuid,p_data jsonb)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare rid uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_tenant::text||':'||lower(p_data->>'email'),0));
 select id into rid from public.registration_requests where tenant_id=p_tenant and lower(email)=lower(p_data->>'email') and status in ('pending','correction_requested') order by created_at desc limit 1;
 if found then return jsonb_build_object('id',rid,'existing',true);end if;
 insert into public.registration_requests(tenant_id,first_name,last_name,email,room_number,accommodation_from,accommodation_to,status,privacy_acknowledged_at)
 values(p_tenant,p_data->>'first_name',p_data->>'last_name',lower(p_data->>'email'),nullif(p_data->>'room_number',''),(p_data->>'accommodation_from')::date,(p_data->>'accommodation_to')::date,'pending',now()) returning id into rid;
 insert into public.registration_enquiries(registration_id,tenant_id,permanent_address,date_of_birth,nationality,gender,identity_document_number,telephone,parent_contact_email,school,iban,preferred_room_type,preferred_duration_months,preferred_from,preferred_to)
 values(rid,p_tenant,p_data->>'permanent_address',nullif(p_data->>'date_of_birth','')::date,p_data->>'nationality',p_data->>'gender','',p_data->>'telephone',p_data->>'parent_contact_email',p_data->>'school','',p_data->>'preferred_room_type',null,coalesce(nullif(p_data->>'expected_arrival',''),p_data->>'accommodation_from')::date,(p_data->>'accommodation_to')::date);
 return jsonb_build_object('id',rid,'existing',false);
end $$;
revoke all on function public.residence_submit_registration(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.residence_submit_registration(uuid,jsonb) to service_role;
