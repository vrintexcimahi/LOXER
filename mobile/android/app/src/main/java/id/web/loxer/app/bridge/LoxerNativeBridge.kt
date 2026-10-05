package id.web.loxer.app.bridge

import android.os.Handler
import android.os.Looper
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebView
import id.web.loxer.app.MainActivity
import id.web.loxer.app.network.OriginSecurityManager
import org.json.JSONObject

class LoxerNativeBridge(
    private val activity: MainActivity,
    private val webView: WebView
) {
    companion object {
        const val JS_INTERFACE_NAME = "LoxerNativeAndroid"
        private const val TAG = "LoxerNativeBridge"
    }

    private val mainHandler = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun dispatch(actionStr: String, jsonPayload: String) {
        mainHandler.post {
            handleDispatch(actionStr, jsonPayload)
        }
    }

    private fun handleDispatch(actionStr: String, jsonPayload: String) {
        val currentUrl = webView.url ?: ""
        if (!OriginSecurityManager.isAllowedUrl(currentUrl)) {
            Log.w(TAG, "Blocked bridge call from untrusted origin: $currentUrl")
            return
        }

        val payload = try {
            if (jsonPayload.isNotEmpty()) JSONObject(jsonPayload) else JSONObject()
        } catch (e: Exception) {
            JSONObject()
        }

        val callbackId = payload.optString("_callbackId", "")
        val action = BridgeAction.fromString(actionStr)

        if (action == null) {
            Log.w(TAG, "Unknown action requested: $actionStr")
            sendError(callbackId, "Unknown bridge action: $actionStr")
            return
        }

        try {
            activity.executeBridgeAction(action, payload, callbackId)
        } catch (e: Exception) {
            Log.e(TAG, "Failed executing bridge action $actionStr: ${e.message}")
            sendError(callbackId, e.message ?: "Action execution failed")
        }
    }

    fun sendSuccess(callbackId: String, data: Any?) {
        if (callbackId.isEmpty()) return
        val response = BridgeResponse(callbackId = callbackId, success = true, data = data)
        sendToWeb(response)
    }

    fun sendError(callbackId: String, errorMsg: String) {
        if (callbackId.isEmpty()) return
        val response = BridgeResponse(callbackId = callbackId, success = false, error = errorMsg)
        sendToWeb(response)
    }

    fun emitEvent(eventName: String, eventData: JSONObject) {
        mainHandler.post {
            val script = "if(window.LoxerNative && typeof window.LoxerNative._emitNativeEvent === 'function') { window.LoxerNative._emitNativeEvent('$eventName', ${eventData}); }"
            webView.evaluateJavascript(script, null)
        }
    }

    private fun sendToWeb(response: BridgeResponse) {
        mainHandler.post {
            val callbackId = response.callbackId
            val isSuccess = response.success
            val dataStr = response.data?.let {
                if (it is JSONObject) it.toString() else JSONObject.quote(it.toString())
            } ?: "null"
            val errorStr = response.error?.let { JSONObject.quote(it) } ?: "null"

            val script = "if(window.LoxerNative && typeof window.LoxerNative._handleNativeCallback === 'function') { window.LoxerNative._handleNativeCallback('$callbackId', $isSuccess, $dataStr, $errorStr); }"
            webView.evaluateJavascript(script, null)
        }
    }
}
