# WEBU Scanner API – independent Cloudflare Worker

Isolated from Student House. No database, no private bindings, no Google PageSpeed. Static HTML inspection only; does not claim browser rendering, Lighthouse, cookie compliance, or legal certification.

Deployment (Cloudflare account owner):
1. Use a standalone Worker on workers.dev (not a route in front of a private origin). In this directory, run npx wrangler@4 deploy after authorizing Cloudflare; keep the Free plan if sufficient. Do not attach VPC, private services, or database bindings. Both rate-limiter bindings in wrangler.toml are required; missing bindings fail closed.
2. Confirm the actual deployed https://...workers.dev URL. Test POST /scan with Origin: https://www.webu.sk and JSON {"url":"https://www.peligrosa.sk/"}; check the real HTTP status, metadata and findings. Also test invalid/private URL, CORS, and rate limit. Do not enable the frontend if tests fail.
3. Set meta name="webu-scanner-api" content="ACTUAL_WORKER_URL/scan" in web-scanner.html, then merge the branch into main. Test on www.webu.sk with Peligrosa and at least two unrelated public sites. No deployment is implied by this branch.

Security: public hostname only, no credentials/query/ports, manual validation of redirects, capped response body and timeout, no cookies/auth forwarded, limited rate and CORS. Public internet only relies on isolated Workers egress. CORS does not authenticate; rate limiting mitigates but does not eliminate abuse. No HTML returned to the browser; text is rendered via textContent. Response time is server header latency including redirects; not full page speed.

A real browser-based performance/mobile and accessibility audit is a separate phase requiring isolated Chromium/Lighthouse infrastructure and resource quotas.