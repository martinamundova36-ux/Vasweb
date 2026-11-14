# Studenthouse – bezpečná mobilná inštalácia

The existing Student House Bratislava / WEBU Residence runs at
**https://www.webu.sk/student-house-portal/** and uses the same Supabase backend.

## Preferred user installation (Android / iPhone)

**Use the installable web app (PWA).** Open the above HTTPS URL in Google Chrome
(on Android) or Safari (on iPhone), then select *Install app* or *Add to Home Screen*
from the browser menu. This does **not** require enabling installation from unknown
sources and is automatically served from the existing website.

The Android APK in this repository is a **test-only WebView wrapper**. It is
not a Play Store application. Debug-signed and release-signed sideloaded APKs
can both trigger Android/MIUI unknown-app source warnings. Code changes,
certificate signatures and scanning cannot suppress this Android security
measure. Do not encourage users to disable protections or bypass Play Protect.

## Current wrapper security measures

- HTTPS-only first-party portal navigation; external HTTPS links open in browser.
- Android Safe Browsing and certificate validation; certificate errors are blocked.
- No plain HTTP, privileged JavaScript bridges, broad filesystem, camera,
  background location or SMS permissions.
- File uploads use the Android system picker; external URL schemes are restricted.
- Debugging is disabled inside WebView; third-party cookies are disabled.
- Network WebView caching is disabled; no resident documents or payment data
  are packaged inside the APK.
- App backup is disabled. Existing Supabase login sessions remain protected by
  the current backend and its access-control rules, which require separate review.

This is *defense in depth*, not a security certification. The wrapper
has not been device-penetration-tested, and business logic/security of the
existing WEBU Residence backend remain separate tasks.

## GitHub Actions builds

The workflow builds a **debug APK artifact for internal testing only**; it no
longer automatically publishes a new publicly downloadable debug APK.
For a production Android native app use an established and securely managed
Android signing key, release build, Google Play App Signing and Play Store review.
Never commit signing private keys or production passwords to the repository.

## If the Android warning appears

Tap **Cancel**. Install the web app from Chrome instead. Disabling
"Install unknown apps" is not required for Studenthouse's web-app experience.
