# WEBU Residence — transfer to a separate owner account

Status: **PREPARED / BLOCKED ON NEW VERIFIED ACCOUNT** (2026-11-21)

The WEBU Studio / Journal project stays in the existing `Vasweb` GitHub account. This checklist applies **only** to WEBU Residence and its Student House Bratislava portal. It contains no student data or credentials.

## Current confirmed source

- Residence application source: branch `residence-independent-extraction` in `martinamundova36-ux/Vasweb`; **not yet** a standalone repository.
- Public WEBU Studio source: `webu-studio-only-extraction` (do not merge either extraction into old `main` until the cutover is verified).
- Residence database: existing Supabase project `ydqchayscxntqdkzkynv`, active.
- Important: the source Supabase organization **also owns a different project (Masáže Majka)**. Never hand over or transfer the **whole** source organization.
- Historic webu.sk Residence links, live Supabase callback URLs and public Student House forms must stay usable until cutover.
- Intended future portal host: `portal.student-house.sk` (only activate after DNS, HTTPS, domain authorization, and working hosting).
- Production students, Auth users, RLS policies, file storage, tenants, payments and email settings are not test fixtures: NEVER wipe as part of an account migration.

## Required new-owner account handoffs

- [ ] Confirm the **new email address** through normal account setup; do not commit the email address or mailbox secrets in a public repository.
- [ ] Create a separate GitHub account with verified email and strong 2FA; create an empty **private** `WEBU-Residence` repository under that account.
- [ ] Export/import *only* the Residence extraction snapshot with clean Git history (or use a verified repository import), not the entire `Vasweb` project and Journal history. Check all files, CI workflows, branches, secrets and permissions.
- [ ] Check static hosting options: GitHub Free Pages does **not** publish from a private repo; connect a compatible deployment service if the source repo stays private. Confirm whether using Cloudflare Pages or other host is permitted and within free limits; never enable a paid plan without explicit approval.
- [ ] Create a **new Supabase organization** owned by the new account. Transfer only project `ydqchayscxntqdkzkynv` to it. The original source-organization Owner must temporarily join the target org to initiate transfer; after transfer and access verification remove old owner. Inspect billing, limits, and project transfer preflight before authorizing.
- [ ] Do **not** replace the current Supabase project with an empty new one. A normal organization transfer preserves the database, Auth accounts/sessions, Storage, Edge Functions/secrets, cron jobs, project ref and URL. Verify those again after transfer.
- [ ] Add a separate, verified Residence administrator identity to the **application's own staff membership/roles**, distinct from Supabase organization access; verify admin / reception / student role isolation before revoking old admin access.
- [ ] Configure a dedicated Residence sender mailbox, including mail routing, SMTP provider, secure app credentials or OAuth, sender verification, notices and bounce handling. Change `RESIDENCE_SMTP_PASSWORD` (or equivalent) only through Supabase secrets and rotate compromised/old credentials after successful send and receipt tests; never commit passwords or tokens. The prior sender can stay temporarily to avoid missed registration/activation messages.
- [ ] Identify the authorized domain/DNS operator for `student-house.sk`; create/verify the portal subdomain and SSL without modifying the legal domain owner without permission. Update exact CORS origins, Supabase Auth redirect allowlist, email/password recovery links, application URLs, PDFs/QR links, Android trusted hosts, PWA start_url and Student House public website only after the new portal is live.
- [ ] Review billing, administrator recovery methods, 2FA and backup access under the new account.

## Verification / release gates

- [ ] Source and target full file inventories match, excluding intentionally separated WEBU content.
- [ ] Supabase project ref unchanged and correct new organization owns only WEBU Residence.
- [ ] Registered user logs in and completes questionnaire with phone photo; receptionist can access authorized uploads and approve/return.
- [ ] Dates and stay length validated (5/10/12 months, from 1st of month), reception-filled room/deposit/fees/contract sync.
- [ ] All five document workflows and resident-specific PDF generation work; completed installment schedule and QR codes are correct.
- [ ] Test on Android, mobile and desktop in SK/EN/RU/UA.
- [ ] SMTP queue records real sending, not merely queued status; verify actual inbox receipt and recovery links.
- [ ] Validate all RLS, Auth and tenant isolation. Test staff-to-student session separation.
- [ ] Confirm backups, error logs, DNS, SSL, runtime secrets and GitHub Actions deploy, with no new paid subscription without explicit agreement.
- [ ] Only after the new host passes end-to-end verification, switch the WordPress registration link and old `webu.sk` portal links/redirects.
- [ ] Retain old access for monitored rollback and only then remove Residence-specific source from `Vasweb/main`. Never delete student accounts/data to achieve separation.

## Up-to-date docs

- Supabase project ownership transfer: https://supabase.com/docs/guides/platform/project-transfer/transfer-ownership
- Supabase project transfer: https://supabase.com/docs/guides/platform/project-transfer
- Supabase changes after transfer: https://supabase.com/docs/guides/platform/project-transfer/what-changes
- GitHub repo transfers: https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository

**Stop condition:** The new verified email, GitHub account and Supabase organization are not yet supplied/connected. No account-ownership transfer is authorized until the new destination exists and transfer checks pass.
