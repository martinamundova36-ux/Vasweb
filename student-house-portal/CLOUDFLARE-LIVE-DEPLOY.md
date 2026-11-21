# Student House – Cloudflare Pages production setup

This runbook deploys the existing `student-house-portal` only. Do not replace `www.webu.sk` or alter the approved WordPress home page.

1. In the **existing** Cloudflare account, create a **Direct Upload** Pages project named `studenthouse-residence`. Do not select an unrelated PELIGROSA project. Cloudflare Pages Free is sufficient for the isolated static assets, subject to provider limits.
2. In the existing GitHub repository `martinamundova36-ux/Vasweb`, configure **Actions secrets** `CLOUDFLARE_API_TOKEN` (Pages Write permission scoped to this account) and `CLOUDFLARE_ACCOUNT_ID`. Never place these values in code or chat.
3. Configure a GitHub deployment environment named `student-house-production` with required reviewers when supported by the GitHub plan; deployment is still manually gated by `RELEASE`.
4. After the approved PR is merged into `main`, run **Actions → Student House Residence – controlled Cloudflare production release → Run workflow → RELEASE**. This uploads only files prepared by `scripts/build-residence-pages.mjs`. GitHub repo remains the source of code, not personal student documents.
5. Add `portal.student-house.sk` in **Cloudflare Pages → Custom domains** and verify DNS control and HTTPS certificate. Cloudflare's actual project domain and DNS records must be confirmed in the account, never guessed.
6. After domain verification, configure Supabase Auth URL allowlist for `https://portal.student-house.sk/student-house-portal/**`; configure Edge secrets `PORTAL_ORIGIN=https://portal.student-house.sk` for `manage`, `residence-finance`, `registration-correction`, and `RESIDENCE_PORTAL_BASE_URL=https://portal.student-house.sk/student-house-portal/` for `residence-mail`. Redeploy functions with their unchanged source and confirm CORS. The registration and private-files endpoint also require a *verified* `organization_domains` row, set only after DNS ownership is proven.
7. Run real HTTPS test of first-day registration, verification, approval, email confirmation link, questionnaire, profile/photo, room/contract/fees, signed documents, payment schedule, QR, admin isolation and mobile navigation. See `LAUNCH-CHECKLIST.md`.
8. Only when full test succeeds: back up and verify restoration, wipe the **test-only** student records following `LAUNCH-RESET-RUNBOOK.md`, and send real residents the approved multilingual invitation from `REAL-STUDENT-INVITATION.md`.

**Do not deploy merely because code checks are green.** Official document templates, verified recipient list, bank details, backups and domain changes require authorized operations sign-off. The current WordPress website is not replaced by this deploy.
