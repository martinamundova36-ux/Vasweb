-- Newly submitted questionnaires must contain genuine required answers.
-- NOT VALID preserves older rows until their residents correct them; it still checks new/updated rows.
do $$
begin
 if not exists (
  select 1 from pg_constraint
  where conrelid='public.resident_enquiries'::regclass
    and conname='resident_enquiry_submission_complete'
 ) then
  alter table public.resident_enquiries
   add constraint resident_enquiry_submission_complete check (
    student_submitted_at is null or (
     gender in ('male','female','other')
     and own_refrigerator is not null
     and date_of_birth is not null
     and nullif(btrim(nationality),'') is not null
     and nullif(btrim(telephone),'') is not null
     and nullif(btrim(permanent_address),'') is not null
     and nullif(btrim(identity_document_number),'') is not null
     and nullif(btrim(school),'') is not null
     and nullif(btrim(preferred_room_type),'') is not null
     and preferred_duration_months in (5,10,12)
     and preferred_from is not null
     and preferred_to is not null
    )
   ) not valid;
 end if;
end $$;