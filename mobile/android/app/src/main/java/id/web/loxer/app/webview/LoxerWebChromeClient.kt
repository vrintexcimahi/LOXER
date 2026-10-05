package id.web.loxer.app.webview

import android.net.Uri
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import id.web.loxer.app.MainActivity

class LoxerWebChromeClient(
    private val activity: MainActivity
) : WebChromeClient() {

    override fun onProgressChanged(view: WebView, newProgress: Int) {
        super.onProgressChanged(view, newProgress)
        activity.updateProgress(newProgress)
    }

    override fun onGeolocationPermissionsShowPrompt(
        origin: String,
        callback: GeolocationPermissions.Callback
    ) {
        activity.requestGeolocationPermission(origin, callback)
    }

    override fun onPermissionRequest(request: PermissionRequest) {
        // Automatically request Android native camera/audio permissions if needed, then grant WebRTC resources
        activity.requestWebRtcPermissions(request)
    }

    override fun onShowFileChooser(
        webView: WebView,
        filePathCallback: ValueCallback<Array<Uri>>,
        fileChooserParams: FileChooserParams
    ): Boolean {
        return activity.handleFileChooser(filePathCallback, fileChooserParams)
    }
}
