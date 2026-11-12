-- Preserve the existing service-only API, adding atomic FIFO allocation for NEW receipts.
-- Historical payments/allocations are intentionally not rewritten.
create or replace function public.residence_record_payment(
 p_actor uuid,p_tenant uuid,p_resident uuid,p_amount numeric,
 p_received_on date,p_method text,p_reference text
) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid;charge record;remaining numeric;allocated numeric;portion numeric;
begin
 if not private.residence_staff_actor(p_tenant,p_actor) then raise exception 'Forbidden' using errcode='42501';end if;
 if p_amount is null or p_amount<=0 or p_amount>100000 or round(p_amount,2)<>p_amount or p_received_on is null
 or p_method is null or p_method not in ('bank','cash','other') or p_reference is null or length(trim(p_reference))<2 or length(p_reference)>100 then
 raise exception 'Invalid payment' using errcode='22023';end if;
 -- Serialize receipts for this resident. Charge row locks also coordinate other allocation APIs.
 perform 1 from public.residents where tenant_id=p_tenant and id=p_resident and active for update;
 if not found then raise exception 'Invalid resident' using errcode='22023';end if;
 insert into public.payments(tenant_id,resident_id,amount,received_on,method,reference,verified_by)
 values(p_tenant,p_resident,p_amount,p_received_on,p_method,trim(p_reference),p_actor) returning id into pid;
 remaining:=p_amount;
 for charge in select id,amount from public.rent_charges where tenant_id=p_tenant and resident_id=p_resident order by due_on,id for update loop
  exit when remaining<=0;
  select coalesce(sum(a.amount),0) into allocated from public.payment_allocations a
  where a.tenant_id=p_tenant and a.charge_id=charge.id
  and not exists(select 1 from public.payment_reversals r where r.tenant_id=p_tenant and r.payment_id=a.payment_id);
  portion:=least(remaining,greatest(0,charge.amount-allocated));
  if portion>0 then
   insert into public.payment_allocations(tenant_id,payment_id,charge_id,amount) values(p_tenant,pid,charge.id,portion);
   remaining:=remaining-portion;
  end if;
 end loop;
 -- remaining is an unallocated resident credit; never fabricate a charge to consume it.
 insert into public.audit_logs(tenant_id,actor_id,action,entity,entity_id)
 values(p_tenant,p_actor,'PAYMENT_MANUALLY_VERIFIED_FIFO','payments',pid::text);
 insert into public.notifications(tenant_id,user_id,title,body)
 select p_tenant,user_id,'payment_received',p_amount::text from public.residents where id=p_resident and tenant_id=p_tenant;
 return pid;
end $$;
revoke all on function public.residence_record_payment(uuid,uuid,uuid,numeric,date,text,text) from public,anon,authenticated;
grant execute on function public.residence_record_payment(uuid,uuid,uuid,numeric,date,text,text) to service_role;
