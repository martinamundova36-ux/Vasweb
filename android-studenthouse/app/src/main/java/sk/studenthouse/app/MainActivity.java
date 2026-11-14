package sk.studenthouse.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * TEST-ONLY Android WebView wrapper for the existing Studenthouse portal.
 *
 * The installable web app (PWA) is the preferred distribution method.
 * A debug APK cannot avoid Android's unknown-apps security warning.
 *
 * No JavaScript bridge, privileged app permissions or private data cache is added.
 */
public final class MainActivity extends Activity {
    private static final String HOME = "https://www.webu.sk/student-house-portal/";
    private static final String PORTAL_PATH = "/student-house-portal/";
    private static final int FILE_CHOOSER_REQUEST = 501;
    private WebView browser;
    private ValueCallback<Uri[]> pendingFiles;

    /** Only the first-party portal is allowed to run inside the privileged app window. */
    private static boolean isTrustedPortal(Uri uri) {
        if (uri == null) return false;
        String scheme = uri.getScheme();
        String host = uri.getHost();
        String path = uri.getPath();
        return "https".equalsIgnoreCase(scheme)
            && ("www.webu.sk".equalsIgnoreCase(host) || "webu.sk".equalsIgnoreCase(host))
            && uri.getUserInfo() == null
            && path != null
            && (path.equals("/student-house-portal") || path.startsWith(PORTAL_PATH));
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView.setWebContentsDebuggingEnabled(false);
        browser = new WebView(this);
        browser.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri uri = request.getUrl();
                if (isTrustedPortal(uri)) return false;
                // Fixed public app link only. Never pass page URLs, tokens or student data.
                if ("studenthouse-share".equalsIgnoreCase(uri.getScheme())
                    && "app".equalsIgnoreCase(uri.getHost())) {
                    Intent send = new Intent(Intent.ACTION_SEND);
                    send.setType("text/plain");
                    send.putExtra(Intent.EXTRA_SUBJECT, "Student House Bratislava");
                    send.putExtra(Intent.EXTRA_TEXT, "Student House Bratislava – študentská aplikácia.\n" + HOME);
                    startActivity(Intent.createChooser(send, "Zdieľať Student House Bratislava"));
                    return true;
                }
                String scheme = uri.getScheme();
                // External links are opened outside Studenthouse. Never open file:, content:,
                // javascript: or intent: URLs supplied by web content.
                if ("https".equalsIgnoreCase(scheme) || "mailto".equalsIgnoreCase(scheme)
                    || "tel".equalsIgnoreCase(scheme)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException ignored) {}
                }
                return true;
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                // Fail closed on certificate errors; never give the user a bypass button.
                handler.cancel();
            }
        });

        browser.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                pendingFiles = callback;
                try {
                    // System picker provides temporary document access; no storage permission.
                    startActivityForResult(params.createIntent(), FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException error) {
                    pendingFiles = null;
                    callback.onReceiveValue(null);
                    return false;
                }
            }
        });

        WebSettings settings = browser.getSettings();
        settings.setJavaScriptEnabled(true); // Existing online portal requires JavaScript.
        settings.setUserAgentString(settings.getUserAgentString() + " StudenthouseAndroid/0.2");
        settings.setDomStorageEnabled(true); // Required for existing Supabase session.
        settings.setAllowFileAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setAllowContentAccess(true); // Android system document picker.
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setSaveFormData(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(browser, false);

        setContentView(browser);
        if (savedInstanceState != null) browser.restoreState(savedInstanceState);
        else browser.loadUrl(HOME);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER_REQUEST && pendingFiles != null) {
            pendingFiles.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            pendingFiles = null;
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle state) {
        browser.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override
    public void onBackPressed() {
        if (browser != null && browser.canGoBack()) browser.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (pendingFiles != null) {
            pendingFiles.onReceiveValue(null);
            pendingFiles = null;
        }
        if (browser != null) {
            browser.stopLoading();
            browser.setWebChromeClient(null);
            browser.setWebViewClient(null);
            browser.destroy();
            browser = null;
        }
        super.onDestroy();
    }
}
