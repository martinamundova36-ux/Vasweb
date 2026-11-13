-- Existing enrolled residents keep their activated student portal. New invitations
-- start with the questionnaire and only unlock the portal after password setup.
alter table public.residents
 add column if not exists profile_password_activated_at timestamptz;
update public.residents set profile_password_activated_at=now()
 where profile_password_activated_at is null;
-- No student update policy is added: only the existing authenticated server
-- function can mark profile activation after the student's password step.
