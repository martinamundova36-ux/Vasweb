-- An approved rent correction changes the tenancy and its unpaid ledger atomically.
CREATE OR REPLACE FUNCTION private.residence_sync_verified_rent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  first_period text := pg_catalog.to_char(NEW.starts_on, 'YYYY-MM');
  last_period text := pg_catalog.to_char(NEW.ends_on, 'YYYY-MM');
  expected_count integer;
  actual_count integer;
  consistent_amounts boolean;
BEGIN
  IF NEW.rent IS NOT DISTINCT FROM OLD.rent THEN
    RETURN NEW;
  END IF;
  IF NEW.rent <= 0 OR NEW.rent > 100000 OR pg_catalog.round(NEW.rent, 2) <> NEW.rent
     OR NEW.resident_id IS DISTINCT FROM OLD.resident_id
     OR NEW.starts_on IS DISTINCT FROM OLD.starts_on
     OR NEW.ends_on IS DISTINCT FROM OLD.ends_on THEN
    RAISE EXCEPTION 'invalid_rent_correction' USING ERRCODE = '22023';
  END IF;

  -- Serialize against the existing receipt recorder before locking the ledger rows.
  PERFORM 1 FROM public.residents r
    WHERE r.id = NEW.resident_id AND r.tenant_id = NEW.tenant_id
      AND r.active AND r.archived_at IS NULL
      AND r.accommodation_from = NEW.starts_on AND r.accommodation_to = NEW.ends_on
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'current_verified_stay_required' USING ERRCODE = '23514';
  END IF;

  PERFORM c.id FROM public.rent_charges c
    WHERE c.tenant_id = NEW.tenant_id AND c.resident_id = NEW.resident_id
      AND c.kind = 'rent' AND c.period BETWEEN first_period AND last_period
    ORDER BY c.period FOR UPDATE;

  expected_count := (EXTRACT(YEAR FROM NEW.ends_on)::integer -
                     EXTRACT(YEAR FROM NEW.starts_on)::integer) * 12 +
                    EXTRACT(MONTH FROM NEW.ends_on)::integer -
                    EXTRACT(MONTH FROM NEW.starts_on)::integer + 1;

  SELECT count(*), bool_and(c.amount = OLD.rent) INTO actual_count, consistent_amounts
    FROM public.rent_charges c
    WHERE c.tenant_id = NEW.tenant_id AND c.resident_id = NEW.resident_id
      AND c.kind = 'rent' AND c.period BETWEEN first_period AND last_period;
  IF actual_count <> expected_count OR consistent_amounts IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'incomplete_verified_rent_ledger' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rent_charges c
    WHERE c.tenant_id = NEW.tenant_id AND c.resident_id = NEW.resident_id
      AND c.kind = 'rent' AND c.period BETWEEN first_period AND last_period
      AND (
        EXISTS (SELECT 1 FROM public.payment_allocations a WHERE a.tenant_id = c.tenant_id AND a.charge_id = c.id)
        OR EXISTS (SELECT 1 FROM public.installment_plans p WHERE p.tenant_id = c.tenant_id AND p.charge_id = c.id)
      )
  ) THEN
    RAISE EXCEPTION 'rent_has_payment_or_installment_plan' USING ERRCODE = '23514';
  END IF;

  UPDATE public.rent_charges c SET amount = NEW.rent
    WHERE c.tenant_id = NEW.tenant_id AND c.resident_id = NEW.resident_id
      AND c.kind = 'rent' AND c.period BETWEEN first_period AND last_period;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.residence_sync_verified_rent() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER residence_sync_verified_rent
AFTER UPDATE OF rent ON public.tenancies
FOR EACH ROW EXECUTE FUNCTION private.residence_sync_verified_rent();
