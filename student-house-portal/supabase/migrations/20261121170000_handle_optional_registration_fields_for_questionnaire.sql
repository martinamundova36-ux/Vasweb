-- Recorded as applied in Supabase on 21 November 2026. Optional questionnaire-only attributes remain empty during initial registration.
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
 values(p_tenant,p_data->>'first_name',p_data->>'last_name',lower(p_data->>'email'),nullif(p_data->>'room_number',''),(p_data->>'accommodation_from')::date,(p_data->>'accommodation_to')::date,'pending',now()) returning id into rid;
 insert into public.registration_enquiries(registration_id,tenant_id,permanent_address,date_of_birth,nationality,gender,identity_document_number,telephone,parent_contact_email,school,iban,preferred_room_type,preferred_duration_months,preferred_from,preferred_to)
 values(rid,p_tenant,coalesce(p_data->>'permanent_address',''),nullif(p_data->>'date_of_birth','')::date,coalesce(p_data->>'nationality',''),coalesce(p_data->>'gender',''),'',coalesce(p_data->>'telephone',''),coalesce(p_data->>'parent_contact_email',''),coalesce(p_data->>'school',''),'',coalesce(p_data->>'preferred_room_type',''),duration,arrival_date,end_date);
 return jsonb_build_object('id',rid,'existing',false);
end $function$;
