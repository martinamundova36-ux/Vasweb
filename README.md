# WEBU Residence · Student House Bratislava

## Independent application source

This repository tree is the **residence-only extraction** from the original WEBU/Vasweb repository, snapshot d3d68dccf09ec95884ce8e1d6f22097290934821. It includes only the Student House portal, backend functions and migrations, its Android wrapper and relevant regression tests. WEBU Studio, Journal, SEO workflows and public WEBU pages are deliberately excluded.

**Do not publish this extraction as production until the cutover checklist is complete.** The currently live portal at `https://www.webu.sk/student-house-portal/` must keep working during transition.

### Separation

- Public WEBU website & Journal: `https://www.webu.sk/` (remains in `Vasweb`)
- Private residence portal: proposed `https://portal.student-house.sk/student-house-portal/` (new independent GitHub repository `WEBU-Residence`)
- Student House public WordPress site: `https://www.student-house.sk/` (links to portal only)
- Backend: existing Supabase project `ydqchayscxntqdkzkynv`; do not recreate or erase the database, Auth users, storage, documents or payments.

### Before deploying the independent portal

1. Create a **new repository**, `martinamundova36-ux/WEBU-Residence`, and import this extracted code as a clean initial commit (not as a mirror of the whole `Vasweb` Git history).
2. Configure independent static hosting and verify HTTPS for `portal.student-house.sk`. Do not set the CNAME/redirect before DNS ownership is confirmed.
3. Audit all hard-coded references to `https://www.webu.sk` and absolute `/student-house-portal/` paths in the portal, staff UI, backend Edge Functions, outgoing e-mails, QR/PDF links and Android WebView. The future portal base URL must be set everywhere and its actual deployed behavior verified.
4. Add the precise production portal origin and recovery/invite callback URLs to the Supabase Auth redirect allowlist. Update strict CORS/domain mappings in all Edge Functions; do not wildcard CORS, and do not trust a browser-supplied tenant ID. Verify ownership before adding `organization_domains.verified_at`.
5. Deploy and test login, password reset, student and receptionist separation, registration, first-of-month stay validation, approval with verified room/contract/fees, photo upload, questionnaire, five documents, installment calendar, SMTP invite & reminders, mobile and four translations.
6. Check RLS and tenant isolation; use the existing mail delivery configuration; only after 100% real end-to-end verification, change the Student House public site's registration link and leave an intentional redirect from the old `webu.sk` location.
7. Only after the new site is stable and verified should the residence files, dedicated CI and backend source be removed from the WEBU `Vasweb/main` branch. Never delete Supabase records as part of splitting GitHub repositories.

The files in `student-house-portal/supabase` mirror backend functions historically; the canonical deployment code is in the root `supabase` directory. Keep them consistent before deploying.

### Local checks

```bash
node scripts/build-student-house-entries.mjs --check
cd tests && npm ci && npm test
```

No API keys, SMTP passwords, student data exports, or other secrets belong in GitHub.
