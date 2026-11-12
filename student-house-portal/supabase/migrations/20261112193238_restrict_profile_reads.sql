-- Consolidate permissive policies: a live session alone must not expose every profile.
-- Staff directories use tenant-scoped residents; service-side provisioning is unaffected.
drop policy if exists live_profile_session on public.profiles;
drop policy if exists profile_read on public.profiles;
create policy profile_read on public.profiles for select to authenticated
using (id = (select auth.uid()) and active and (select private.valid_session()));
