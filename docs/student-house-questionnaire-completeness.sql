create or replace function private.residence_validate_submitted_enquiry() returns trigger language plpgsql set search_path='' as $$
begin
 if new.student_submitted_at is not null then
  if length(trim(coalesce(new.permanent_address,'')))<5 or new.date_of_birth is null or new.date_of_birth>(now() at time zone 'Europe/Bratislava')::date
   or length(trim(coalesce(new.nationality,'')))<2 or length(trim(coalesce(new.identity_document_number,'')))<4
   or length(trim(coalesce(new.telephone,'')))<6 or length(trim(coalesce(new.school,'')))<2
   or coalesce(new.preferred_room_type,'')='' or new.preferred_from is null or new.preferred_to is null or new.preferred_to<=new.preferred_from
   or new.preferred_duration_months is null or new.preferred_duration_months not in (5,10,12) then
   raise exception 'Complete all required questionnaire fields before submission' using errcode='22023';
  end if;
  -- A student cannot backdate a changed submission to reuse an older staff review.
  new.student_submitted_at:=now();
 end if;
 new.updated_at:=now();return new;
end $$;
revoke all on function private.residence_validate_submitted_enquiry() from public,anon,authenticated;
create trigger validate_submitted_enquiry before insert or update on public.resident_enquiries for each row execute function private.residence_validate_submitted_enquiry();
