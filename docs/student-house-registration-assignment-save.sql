-- Restore only the two reception-editable assignment columns; RLS still requires tenant staff.
grant update(contract_number,room_number) on public.registration_requests to authenticated;
-- Direct client edits apply only before approval; approval itself remains server-side and atomic.
create policy registration_pending_edits_guard on public.registration_requests as restrictive for update to authenticated
 using (status='pending') with check (status in ('pending','rejected'));
create trigger registration_assignment_audit after update of contract_number,room_number on public.registration_requests
 for each row when (old.contract_number is distinct from new.contract_number or old.room_number is distinct from new.room_number)
 execute function private.audit_write();
