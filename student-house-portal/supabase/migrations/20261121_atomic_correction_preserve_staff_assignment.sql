-- Atomically apply a student correction without editing the room/contract assigned by reception.
-- Service-role only: called after a one-time 256-bit token was hashed by the Edge Function.
create or replace function public.residence_apply_registration_correction(p_hash text,p_data jsonb)
returns boolean language plpgsql security definer set search_path=''
as $$
declare
 req public.registration_requests%rowtype;
 start_on date;
 end_on date;
 arriving_on date;
 duration integer;
 first_name text;
 last_name text;
 requested_email text;
begin
 if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' or p_data is null
   or jsonb_typeof(p_data)<>'object' then return false; end if;
 if coalesce(p_data->>'accommodation_from','') !~ '^\\d{4}-\\d{2}-\\d{2}$'
  or coalesce(p_data->>'accommodation_to','') !~ '^\\d{4}-\\d{2}-\\d{2}$'
  or coalesce(p_data->>'expected_arrival','') !~ '^\\d{4}-\\d{2}-\\d{2}$'
  or coalesce(p_data->>'preferred_duration_months','') not in ('5','10','12')
 then return false; end if;
 begin
  start_on:=(p_data->>'accommodation_from')::date;
  end_on:=(p_data->>'accommodation_to')::date;
  arriving_on:=(p_data->>'expected_arrival')::date;
  duration:=(p_data->>'preferred_duration_months')::integer;
 exception when others then return false;
 end;
 if start_on<date '2000-01-01' or start_on>=date '2100-01-01'
   or extract(day from start_on)<>1
   or end_on<>(date_trunc('month',start_on::timestamp)+make_interval(months=>duration)-interval '1 day')::date
   or arriving_on<start_on or date_trunc('month',arriving_on::timestamp)<>date_trunc('month',start_on::timestamp)
 then return false;end if;
 first_name:=btrim(coalesce(p_data->>'first_name',''));
 last_name:=btrim(coalesce(p_data->>'last_name',''));
 requested_email:=lower(btrim(coalesce(p_data->>'email','')));
 if length(first_name)<1 or length(last_name)<1 or length(first_name)>80 or length(last_name)>80
  or length(requested_email)>254 or requested_email !~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
 then return false; end if;
 select * into req from public.registration_requests
 where correction_token_hash=p_hash and status='correction_requested'
   and correction_expires_at>now() for update;
 if not found then return false; end if;
 -- Do not silently break the pre-existing Supabase Auth account by changing its e-mail.
 if lower(req.email)<>requested_email then return false; end if;
 update public.registration_enquiries set
  preferred_duration_months=duration, preferred_from=arriving_on, preferred_to=end_on
 where tenant_id=req.tenant_id and registration_id=req.id;
 if not found then raise exception 'registration_enquiry_missing' using errcode='23514';end if;
 update public.registration_requests set
  first_name=first_name,last_name=last_name,
  accommodation_from=start_on,accommodation_to=end_on,
  status='pending',correction_token_hash=null,correction_expires_at=null,
  correction_completed_at=now(),reviewed_by=null,reviewed_at=null
 where tenant_id=req.tenant_id and id=req.id;
 -- Staff-owned room_number and contract_number intentionally remain unchanged.
 return true;
end;$$;
revoke all on function public.residence_apply_registration_correction(text,jsonb) from public,anon,authenticated;
grant execute on function public.residence_apply_registration_correction(text,jsonb) to service_role;
