package id.web.loxer.app.webview

import android.content.ActivityNotFoundException
import android.content.Intent
import android.graphics.Bitmap
import android.net.Uri
import android.net.http.SslError
import android.util.Log
import android.webkit.RenderProcessGoneDetail
import android.webkit.SslErrorHandler
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import id.web.loxer.app.MainActivity
import id.web.loxer.app.network.OriginSecurityManager

class LoxerWebViewClient(
    private val activity: MainActivity,
    private val onPageFinishedCallback: (String) -> Unit
) : WebViewClient() {

    companion object {
        private const val TAG = "LoxerWebViewClient"
    }

    override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
        val url = request.url.toString()
        return handleUrl(url)
    }

    @Deprecated("Deprecated in Java")
    override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
        return handleUrl(url)
    }

    private fun handleUrl(url: String): Boolean {
        if (url.isBlank()) return false

        // 1. External protocols
        if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:") ||
            url.startsWith("market:") || url.startsWith("intent:")) {
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                activity.startActivity(intent)
                return true
            } catch (e: Exception) {
                Log.w(TAG, "Cannot launch protocol intent: $url")
                return true
            }
        }

        // 2. WhatsApp Official Scheme & wa.me links
        if (url.startsWith("whatsapp:") || url.contains("wa.me") || url.contains("api.whatsapp.com")) {
            try {
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                activity.startActivity(intent)
                return true
            } catch (e: Exception) {
                CustomTabHelper.openCustomTab(activity, url)
                return true
            }
        }

        // 3. Check Origin Whitelist for LOXER
        val uri = try { Uri.parse(url) } catch (e: Exception) { null }
        val host = uri?.host

        if (OriginSecurityManager.isAllowedHost(host)) {
            // Internal LOXER page stays inside WebView
            return false
        }

        // 4. External third-party web domains open in Chrome Custom Tabs
        try {
            CustomTabHelper.openCustomTab(activity, url)
            return true
        } catch (e: Exception) {
            return false
        }
    }

    override fun onPageStarted(view: WebView, url: String, favicon: Bitmap?) {
        super.onPageStarted(view, url, favicon)
        activity.showLoading(true)

        // Inject early bridge discovery tokens
        val initJs = """
            window.isNativeApp = true;
            window.isLoxerApp = true;
            try {
              localStorage.setItem('loxer_is_app', 'true');
              localStorage.setItem('loxer_hide_install_banner', 'true');
              sessionStorage.setItem('loxer_is_app', 'true');
            } catch(e) {}
        """.trimIndent()
        view.evaluateJavascript(initJs, null)
    }

    override fun onPageFinished(view: WebView, url: String) {
        super.onPageFinished(view, url)
        activity.showLoading(false)
        onPageFinishedCallback(url)

        val readyJs = """
            window.isNativeApp = true;
            window.isLoxerApp = true;
            if(window.LoxerNative && typeof window.LoxerNative.notifyWebReady === 'function') {
                window.LoxerNative.notifyWebReady();
            }
        """.trimIndent()
        view.evaluateJavascript(readyJs, null)
    }

    override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
        super.onReceivedError(view, request, error)
        if (request.isForMainFrame) {
            Log.w(TAG, "Main frame error: ${error.description}")
            activity.showOfflinePage()
        }
    }

    override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
        // STRICT SECURITY: Never call handler.proceed() on invalid SSL!
        Log.e(TAG, "SSL Error encountered: ${error.primaryError}. Cancelling connection.")
        handler.cancel()
        activity.showOfflinePage()
    }

    override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
        Log.e(TAG, "WebView render process crashed! Recreating...")
        activity.recoverFromCrash()
        return true
    }
}
