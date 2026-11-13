-- Administrative accommodation fields originate from reception, not student registration.
alter table public.resident_staff_details
 add column if not exists room_code text,
 add column if not exists deposit_eur numeric(10,2),
 add column if not exists refrigerator_fee_eur numeric(10,2),
 add column if not exists verification_fee_eur numeric(10,2),
 add column if not exists administration_fee_eur numeric(10,2);
alter table public.resident_staff_details
 add constraint resident_staff_room_code_max check (room_code is null or length(room_code) <= 60),
 add constraint resident_staff_deposit_nonnegative check (deposit_eur is null or deposit_eur between 0 and 100000),
 add constraint resident_staff_refrigerator_fee_nonnegative check (refrigerator_fee_eur is null or refrigerator_fee_eur between 0 and 100000),
 add constraint resident_staff_verification_fee_nonnegative check (verification_fee_eur is null or verification_fee_eur between 0 and 100000),
 add constraint resident_staff_administration_fee_nonnegative check (administration_fee_eur is null or administration_fee_eur between 0 and 100000);
-- Existing staff-only RLS policies protect all new columns; no direct student grants.
