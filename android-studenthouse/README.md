# Studenthouse – Android

Android APK wrapper for the existing Student House Bratislava / WEBU Residence portal.

- App name: **Studenthouse**
- HTTPS start URL: https://www.webu.sk/student-house-portal/
- Existing GitHub backend, Supabase authentication, user accounts, and pages are unchanged.
- File picker is supported for document/photo selection; the wrapper does not request camera, storage or location permissions.
- JavaScript interfaces are disabled. External websites open in the user's browser.
- The APK built by GitHub Actions is an **unsigned-production / debug-signed TEST BUILD** only. It must be replaced with a properly signed release for public app-store distribution.
- The installable PWA on the same website is the preferred production experience; it uses Chrome's own file/download and authentication capabilities.
- To install the Android test APK, download the artifact or GitHub pre-release and allow installation from that source on Android.
- A network connection is required for login, payments and private documents. No personal data is bundled in this APK.
