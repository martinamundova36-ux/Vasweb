-- Mirror of Supabase migration 20261120223040.
-- Only infer duration when start and end are exactly 5, 10, or 12 calendar months apart.
create or replace function public.residence_autofill_exact_stay_duration()
returns trigger
language plpgsql
set search_path = ''
as $$
declare months int;
begin
  if new.preferred_duration_months is not null
     or new.preferred_from is null
     or new.preferred_to is null then
    return new;
  end if;
  for months in select unnest(array[5,10,12]) loop
    if new.preferred_to = (new.preferred_from + make_interval(months => months))::date then
      new.preferred_duration_months := months;
      exit;
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists residence_autofill_exact_stay_duration on public.registration_enquiries;
create trigger residence_autofill_exact_stay_duration
before insert or update of preferred_from, preferred_to, preferred_duration_months
on public.registration_enquiries
for each row execute function public.residence_autofill_exact_stay_duration();

update public.registration_enquiries set preferred_duration_months=null
where preferred_duration_months is null
and (
  preferred_to=(preferred_from+interval '5 months')::date
  or preferred_to=(preferred_from+interval '10 months')::date
  or preferred_to=(preferred_from+interval '12 months')::date
);
