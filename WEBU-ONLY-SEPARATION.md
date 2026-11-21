# WEBU Studio & Journal: isolated source branch

Source repository: martinamundova36-ux/Vasweb.
Snapshot before split: d3d68dccf09ec95884ce8e1d6f22097290934821

This branch keeps the WEBU public website, Journal content, editorial automation, SEO files and GitHub Pages CNAME `www.webu.sk`. The Student House Residence portal, all related backend functions, Android wrapper, portal regression tests and portal-specific scripts/workflows have been excluded.

**DO NOT DEPLOY THIS BRANCH YET.** The live WEBU `main` still hosts the old portal at `/student-house-portal/`, and the new independent Residence domain has not been activated. A verified redirect from that legacy path to `https://portal.student-house.sk/student-house-portal/` must be added after cutover, and stale portal URLs must be removed from the WEBU sitemap and navigational links where appropriate.

The residence-only extraction lives at:
`Vasweb/tree/residence-independent-extraction`
and is intended to be imported as a clean first commit in a new independent GitHub repository `WEBU-Residence`.

No Supabase data should be deleted as part of the Git split.
