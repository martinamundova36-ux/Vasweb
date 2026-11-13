-- Actual verified allocations, excluding reversals, are the only evidence of payment.
create table public.residence_reminder_settings (
 tenant_id uuid primary key references public.organizations(id),
 enabled boolean not null default true,
 days_before integer[] not null default array[5,1,0,-1],
 updated_at timestamptz not null default now(),
 check(cardinality(days_before) between 1 and 12 and 365>=all(days_before) and -365<=all(days_before) and array_position(days_before,null) is null)
);
alter table public.residence_reminder_settings enable row level security;
grant select,insert,update on public.residence_reminder_settings to authenticated;
create policy reminder_settings_staff on public.residence_reminder_settings for all to authenticated
 using(private.has_role(tenant_id,array['org_admin','reception']::public.member_role[]))
 with check(private.has_role(tenant_id,array['org_admin','reception']::public.member_role[]));
create trigger audit_reminder_settings after insert or update on public.residence_reminder_settings for each row execute function private.audit_write();
insert into public.residence_reminder_settings(tenant_id) select id from public.organizations;

alter table public.residence_mail_outbox add column reminder_charge_id uuid references public.rent_charges(id);
alter table public.residence_mail_outbox add column reminder_item_id uuid references public.installment_items(id);

create function private.residence_due_balances()
 returns table(tenant_id uuid,resident_id uuid,charge_id uuid,item_id uuid,due_on date,amount numeric,remaining numeric)
 language sql stable security definer set search_path='' as $$
 with paid as (
  select a.tenant_id,a.charge_id,sum(a.amount) total from public.payment_allocations a
  where not exists(select 1 from public.payment_reversals r where r.tenant_id=a.tenant_id and r.payment_id=a.payment_id)
  group by a.tenant_id,a.charge_id
 ), schedule as (
  select c.tenant_id,c.resident_id,c.id charge_id,i.id item_id,i.due_on,i.amount,
   coalesce(sum(i.amount) over(partition by c.id order by i.due_on,i.id rows between unbounded preceding and 1 preceding),0) prior,
   coalesce(paid.total,0) paid
  from public.rent_charges c join public.installment_plans p on p.tenant_id=c.tenant_id and p.charge_id=c.id
  join public.installment_items i on i.tenant_id=p.tenant_id and i.plan_id=p.id
  left join paid on paid.tenant_id=c.tenant_id and paid.charge_id=c.id
 )
 select c.tenant_id,c.resident_id,c.id,null::uuid,c.due_on,c.amount,greatest(0,c.amount-coalesce(paid.total,0))
 from public.rent_charges c left join paid on paid.tenant_id=c.tenant_id and paid.charge_id=c.id
 where not exists(select 1 from public.installment_plans p where p.tenant_id=c.tenant_id and p.charge_id=c.id)
 union all
 select s.tenant_id,s.resident_id,s.charge_id,s.item_id,s.due_on,s.amount,greatest(0,s.amount-greatest(0,s.paid-s.prior)) from schedule s;
$$;
revoke all on function private.residence_due_balances() from public,anon,authenticated;

create function private.residence_queue_due_reminders(p_today date default (now() at time zone 'Europe/Bratislava')::date)
 returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into public.residence_mail_outbox(tenant_id,dedupe,audience,recipient,subject,body,reminder_charge_id,reminder_item_id)
 select b.tenant_id,'payment-reminder:'||coalesce(b.item_id,b.charge_id)::text||':'||b.due_on::text||':'||(b.due_on-p_today)::text,
 'student',r.email,'Student House: upozornenie na platbu / payment reminder',
 'Splatnosť / Due date / Срок оплаты / Термін оплати: '||b.due_on::text||E'\n'||
 'Zostáva uhradiť / Outstanding / К оплате / До сплати: '||b.remaining::text||' EUR. '||
 'Podrobnosti a história úhrad sú v profile. / Check your profile for payment details and history.',b.charge_id,b.item_id
 from private.residence_due_balances() b
 join public.residents r on r.tenant_id=b.tenant_id and r.id=b.resident_id and r.active and r.profile_password_activated_at is not null
 join public.organizations o on o.id=b.tenant_id and o.active
 join public.residence_reminder_settings s on s.tenant_id=b.tenant_id and s.enabled
 where b.remaining>0 and (b.due_on-p_today)=any(s.days_before)
 on conflict(dedupe) do nothing;
 get diagnostics n=row_count;return n;
end $$;
revoke all on function private.residence_queue_due_reminders(date) from public,anon,authenticated;

-- Recheck when a queued message is about to leave, after any payment/plan correction.
create function public.residence_refresh_payment_reminder(p_id uuid,p_lease uuid)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare q public.residence_mail_outbox;b record;
begin
 select * into q from public.residence_mail_outbox where id=p_id and lease=p_lease and status='processing' for update;
 if not found then return jsonb_build_object('send',false);end if;
 if q.reminder_charge_id is null then return jsonb_build_object('send',true,'body',q.body);end if;
 select d.* into b from private.residence_due_balances() d
 join public.residents r on r.tenant_id=d.tenant_id and r.id=d.resident_id and r.active
 join public.residence_reminder_settings s on s.tenant_id=d.tenant_id and s.enabled
 where d.tenant_id=q.tenant_id and d.charge_id=q.reminder_charge_id and d.item_id is not distinct from q.reminder_item_id;
 if not found or b.remaining<=0 then
  update public.residence_mail_outbox set status='failed',result='suppressed_balance_or_plan_changed',lease_until=null where id=q.id;
  return jsonb_build_object('send',false);
 end if;
 q.body:='Splatnosť / Due date / Срок оплаты / Термін оплати: '||b.due_on::text||E'\n'||
 'Zostáva uhradiť / Outstanding / К оплате / До сплати: '||b.remaining::text||' EUR. Podrobnosti nájdeš v profile. / Check your profile for details.';
 update public.residence_mail_outbox set body=q.body where id=q.id;
 return jsonb_build_object('send',true,'body',q.body);
end $$;
revoke all on function public.residence_refresh_payment_reminder(uuid,uuid) from public,anon,authenticated;
grant execute on function public.residence_refresh_payment_reminder(uuid,uuid) to service_role;
