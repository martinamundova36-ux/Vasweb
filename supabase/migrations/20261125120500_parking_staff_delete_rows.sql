grant delete on public.parking_register_test_rows, public.parking_requests to authenticated;
create policy parking_staff_delete_test on public.parking_register_test_rows for delete to authenticated
using (private.has_role(tenant_id, array['org_admin','reception']::public.member_role[]));
create policy parking_staff_delete_request on public.parking_requests for delete to authenticated
using (private.has_role(tenant_id, array['org_admin','reception']::public.member_role[]));
