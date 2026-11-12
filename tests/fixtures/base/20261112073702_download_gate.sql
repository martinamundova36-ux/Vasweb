-- Authenticated clients upload through the existing INSERT policy but cannot mint download links.
-- The manage Edge function authorizes against documents RLS and issues a service-signed 60s URL.
create policy downloads_through_audited_server on storage.objects as restrictive for select to authenticated using(bucket_id<>'residence-private');
