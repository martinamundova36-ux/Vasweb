# WEBU Residence – safe domain integration

This is the existing WEBU Residence application, not a new app. Registration, residents, documents and payments use the existing Supabase project.

## Registration domain routing
- `register-student` accepts the existing WEBU preview origins for backwards compatibility with the current Student House portal.
- For a different residence, only a precisely matched HTTPS origin with a row in `organization_domains` and non-null `verified_at` can select its organization. The organization must also be active.
- Never set `verified_at` until domain ownership has been proven by the organization owner and verified through DNS/hosting records.
- Never accept a browser-supplied `tenant_id`; any request from another origin without mapping must be rejected.
- Manually approve residents, apply rate limiting and keep all protected information subject to RLS.

## Student House target
Desired: `https://portal.student-house.sk/`. DO NOT switch the publicly linked URL before DNS + SSL + hosting are operational. No ownership over that domain is currently connected to the account.
On cutover, adjust Supabase Auth redirect URL allowlist and the `PORTAL_ORIGIN` secret used by the existing invitation management Edge Function. Test registration, manual approval, invitation, password setup, login, private document downloads and tenant isolation.
WordPress.com Free supports an external link to the portal without a plugin.

## Integration into other websites
Use a normal HTML link with the final organization-specific portal URL. This works in WordPress, Shopify, GitHub Pages, and static websites and avoids third-party cookies. Keep authentication and documents on the actual portal domain; do not embed private authenticated pages in an iframe.
