package sk.studenthouse.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Android launcher for the existing Studenthouse portal.
 * No credentials or business data are embedded in the APK.
 * This shell loads the existing HTTPS application and keeps its backend unchanged.
 */
public final class MainActivity extends Activity {
    private static final String HOME = "https://www.webu.sk/student-house-portal/";
    private static final int FILE_CHOOSER_REQUEST = 501;
    private WebView browser;
    private ValueCallback<Uri[]> pendingFiles;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        browser = new WebView(this);
        browser.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                String host = uri.getHost();
                if ("https".equalsIgnoreCase(scheme)
                    && ("www.webu.sk".equalsIgnoreCase(host) || "webu.sk".equalsIgnoreCase(host))) {
                    return false;
                }
                if ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)
                    || "mailto".equalsIgnoreCase(scheme) || "tel".equalsIgnoreCase(scheme)) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
                    catch (ActivityNotFoundException ignored) {}
                }
                return true;
            }
        });
        browser.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback,
                                             FileChooserParams params) {
                if (pendingFiles != null) pendingFiles.onReceiveValue(null);
                pendingFiles = callback;
                try {
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
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
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
}
