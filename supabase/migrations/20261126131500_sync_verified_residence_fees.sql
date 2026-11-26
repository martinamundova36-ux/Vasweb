-- Keep all four verified fees in the same ledger used by the QR calendar.
CREATE OR REPLACE FUNCTION private.residence_sync_verified_fees()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 first_date date;
 first_due date;
 period_code text;
 charge_kind text;
 target_amount numeric;
 old_amount numeric;
 prior_deposit numeric;
 prior_admin numeric;
 prior_refrigerator numeric;
 prior_verification numeric;
 existing_charge uuid;
begin
 if TG_OP='UPDATE' then
   prior_deposit:=OLD.deposit_eur;
   prior_admin:=OLD.administration_fee_eur;
   prior_refrigerator:=OLD.refrigerator_fee_eur;
   prior_verification:=OLD.verification_fee_eur;
 else
   prior_deposit:=null;
   prior_admin:=null;
 end if;
 select accommodation_from into first_date from public.residents
  where id=NEW.resident_id and tenant_id=NEW.tenant_id and active;
 if first_date is null then return NEW;end if;
 period_code:=to_char(first_date,'YYYY-MM');
 select due_on into first_due from public.rent_charges
  where tenant_id=NEW.tenant_id and resident_id=NEW.resident_id
    and kind='rent' and period=period_code limit 1;
 if first_due is null then return NEW;end if;
 for charge_kind,target_amount,old_amount in
  select x.kind,x.new_value,x.old_value from
    (values('deposit'::text,NEW.deposit_eur,prior_deposit),
           ('administration_fee'::text,NEW.administration_fee_eur,prior_admin),
           ('refrigerator_fee'::text,NEW.refrigerator_fee_eur,prior_refrigerator),
           ('verification_fee'::text,NEW.verification_fee_eur,prior_verification)) as x(kind,new_value,old_value)
 loop
  if TG_OP='UPDATE' and target_amount is not distinct from old_amount then continue;end if;
  if target_amount is null then
   if old_amount is null then continue;end if;
   raise exception 'set_fee_to_zero_to_remove' using errcode='22023';
  end if;
  if target_amount<0 or target_amount>100000 or round(target_amount,2)<>target_amount
   then raise exception 'invalid_verified_fee' using errcode='22023';end if;
  existing_charge:=null;
  select id into existing_charge from public.rent_charges
   where tenant_id=NEW.tenant_id and resident_id=NEW.resident_id and kind=charge_kind
     and period=period_code for update;
  if existing_charge is not null and exists(
    select 1 from public.payment_allocations a
     where a.tenant_id=NEW.tenant_id and a.charge_id=existing_charge
  ) then
    raise exception 'fee_has_allocated_payments' using errcode='23514';
  end if;
  if existing_charge is not null and exists(
    select 1 from public.installment_plans plan
     where plan.tenant_id=NEW.tenant_id and plan.charge_id=existing_charge
  ) then
    raise exception 'fee_has_installment_plan' using errcode='23514';
  end if;
  if target_amount=0 then
   delete from public.rent_charges
    where tenant_id=NEW.tenant_id and resident_id=NEW.resident_id
      and kind=charge_kind and period=period_code;
  else
   insert into public.rent_charges(tenant_id,resident_id,period,kind,amount,due_on)
   values(NEW.tenant_id,NEW.resident_id,period_code,charge_kind,target_amount,first_due)
   on conflict(tenant_id,resident_id,period,kind)
     do update set amount=excluded.amount,due_on=excluded.due_on;
  end if;
 end loop;
 return NEW;
end $function$;

DROP TRIGGER residence_sync_verified_fees ON public.resident_staff_details;
CREATE TRIGGER residence_sync_verified_fees
AFTER INSERT OR UPDATE OF deposit_eur, administration_fee_eur, refrigerator_fee_eur, verification_fee_eur
ON public.resident_staff_details
FOR EACH ROW EXECUTE FUNCTION private.residence_sync_verified_fees();
