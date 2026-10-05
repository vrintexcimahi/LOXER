package id.web.loxer.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.location.LocationManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.View
import android.view.ViewGroup
import android.view.Window
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.GeolocationPermissions
import android.webkit.PermissionRequest
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.widget.FrameLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.lifecycle.lifecycleScope
import id.web.loxer.app.bridge.BridgeAction
import id.web.loxer.app.bridge.LoxerNativeBridge
import id.web.loxer.app.config.AppConfig
import id.web.loxer.app.config.RemoteConfigManager
import id.web.loxer.app.config.RemoteConfigResponse
import id.web.loxer.app.download.NativeDownloadManager
import id.web.loxer.app.network.OriginSecurityManager
import id.web.loxer.app.security.BiometricHelper
import id.web.loxer.app.webview.CustomTabHelper
import id.web.loxer.app.webview.LoxerWebChromeClient
import id.web.loxer.app.webview.LoxerWebViewClient
import kotlinx.coroutines.launch
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var rootContainer: FrameLayout
    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var bridge: LoxerNativeBridge
    private lateinit var remoteConfigManager: RemoteConfigManager
    private lateinit var downloadManager: NativeDownloadManager
    private lateinit var biometricHelper: BiometricHelper

    private var activeConfig: RemoteConfigResponse? = null
    private var isSafeToReload = true
    private var lastBackPressTime = 0L

    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var pendingGeoCallback: GeolocationPermissions.Callback? = null
    private var pendingGeoOrigin: String? = null
    private var pendingPermissionRequest: PermissionRequest? = null

    // Activity Result Launchers
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (fileUploadCallback == null) return@registerForActivityResult
        var results: Array<Uri>? = null
        if (result.resultCode == RESULT_OK && result.data != null) {
            val data = result.data
            val singleUri = data?.data
            val clipData = data?.clipData

            if (singleUri != null) {
                results = arrayOf(singleUri)
            } else if (clipData != null) {
                val list = mutableListOf<Uri>()
                for (i in 0 until clipData.itemCount) {
                    list.add(clipData.getItemAt(i).uri)
                }
                results = list.toTypedArray()
            }
        }
        fileUploadCallback?.onReceiveValue(results)
        fileUploadCallback = null
    }

    private val permissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val locGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true

        if (pendingGeoCallback != null && pendingGeoOrigin != null) {
            pendingGeoCallback?.invoke(pendingGeoOrigin, locGranted, true)
            pendingGeoCallback = null
            pendingGeoOrigin = null
        }

        val cameraGranted = permissions[Manifest.permission.CAMERA] == true
        if (cameraGranted && pendingPermissionRequest != null) {
            pendingPermissionRequest?.grant(pendingPermissionRequest?.resources)
            pendingPermissionRequest = null
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Setup Window & Colors
        requestWindowFeature(Window.FEATURE_NO_TITLE)
        setStatusBarTheme(Color.parseColor("#0B132B"), false)
        setNavigationBarTheme(Color.parseColor("#0F172A"), false)

        val app = application as LoxerApplication
        remoteConfigManager = RemoteConfigManager(this, app.secureStorage)
        downloadManager = NativeDownloadManager(this)
        biometricHelper = BiometricHelper(this)

        setupLayout()
        setupWebView()

        // Network recovery listener
        app.networkMonitor.addListener { isOnline ->
            if (isOnline && webView.url?.startsWith("file:///android_asset/offline.html") == true) {
                runOnUiThread {
                    reloadPrimaryWeb()
                }
            }
        }

        initializeApplication()
    }

    private fun setupLayout() {
        rootContainer = FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#0F172A"))
        }

        progressBar = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                8
            )
            max = 100
            progress = 0
            visibility = View.VISIBLE
        }

        setContentView(rootContainer)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        webView = WebView(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#0F172A"))
        }

        val s = webView.settings
        s.javaScriptEnabled = true
        s.domStorageEnabled = true
        s.databaseEnabled = true
        s.setGeolocationEnabled(true)
        s.mediaPlaybackRequiresUserGesture = false
        s.cacheMode = WebSettings.LOAD_DEFAULT
        s.setSupportZoom(false)
        s.builtInZoomControls = false
        s.displayZoomControls = false

        // Security Hardening: Disable arbitrary local file access
        s.allowFileAccess = true // Needed for assets/offline.html
        s.allowContentAccess = true
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            s.safeBrowsingEnabled = true
        }

        // Custom User-Agent
        s.userAgentString = s.userAgentString + AppConfig.APP_USER_AGENT_SUFFIX

        // Setup CookieManager
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            cookieManager.setAcceptThirdPartyCookies(webView, true)
        }
        cookieManager.setCookie("https://app.loxer.id", "loxer_is_app=true; path=/; max-age=31536000; SameSite=Lax")
        cookieManager.setCookie("https://loxer.web.id", "loxer_is_app=true; path=/; max-age=31536000; SameSite=Lax")
        cookieManager.flush()

        // Setup Bridge
        bridge = LoxerNativeBridge(this, webView)
        webView.addJavascriptInterface(bridge, LoxerNativeBridge.JS_INTERFACE_NAME)

        // Setup Clients
        webView.webViewClient = LoxerWebViewClient(this) { finishedUrl ->
            handlePageLoaded(finishedUrl)
        }
        webView.webChromeClient = LoxerWebChromeClient(this)

        rootContainer.addView(webView)
        rootContainer.addView(progressBar)
    }

    private fun initializeApplication() {
        lifecycleScope.launch {
            val config = remoteConfigManager.fetchConfig()
            activeConfig = config

            OriginSecurityManager.updateAllowedHosts(config.allowedHosts)

            // 1. Check Maintenance Mode
            if (config.maintenance) {
                showMaintenanceView(config.maintenanceMessage)
                return@launch
            }

            // 2. Check Force Native Update
            val currentVersion = BuildConfig.VERSION_NAME
            if (config.forceNativeUpdate && remoteConfigManager.isNativeUpdateRequired(currentVersion, config.minimumAndroidVersion)) {
                showForceUpdateDialog(config.updateUrl)
                return@launch
            }

            // 3. Check Soft Native Update
            if (remoteConfigManager.isNativeUpdateRecommended(currentVersion, config.recommendedAndroidVersion)) {
                showSoftUpdateDialog(config.updateUrl)
            }

            // 4. Resolve Launch URL
            val targetUrl = resolveLaunchUrl(config.webUrl)
            webView.loadUrl(targetUrl)
        }
    }

    private fun resolveLaunchUrl(baseWebUrl: String): String {
        val incomingData = intent?.data?.toString()
        if (!incomingData.isNullOrBlank() && OriginSecurityManager.isAllowedUrl(incomingData)) {
            val separator = if (incomingData.contains("?")) "&" else "?"
            return "$incomingData${separator}source=app&platform=apk&client=android&app=true"
        }

        val separator = if (baseWebUrl.contains("?")) "&" else "?"
        return "$baseWebUrl${separator}source=app&platform=apk&client=android&app=true"
    }

    private fun handlePageLoaded(url: String) {
        val app = application as LoxerApplication
        activeConfig?.let { cfg ->
            app.secureStorage.putString(AppConfig.PREF_LAST_WEB_VERSION, cfg.webVersion)
        }
    }

    fun executeBridgeAction(action: BridgeAction, payload: JSONObject, callbackId: String) {
        when (action) {
            BridgeAction.GET_PLATFORM -> {
                val data = JSONObject().apply {
                    put("platform", "android")
                    put("isNative", true)
                }
                bridge.sendSuccess(callbackId, data)
            }

            BridgeAction.GET_APP_VERSION -> {
                val data = JSONObject().apply {
                    put("version", BuildConfig.VERSION_NAME)
                    put("versionCode", BuildConfig.VERSION_CODE)
                }
                bridge.sendSuccess(callbackId, data)
            }

            BridgeAction.GET_DEVICE_INFO -> {
                val app = application as LoxerApplication
                val data = JSONObject().apply {
                    put("model", Build.MODEL)
                    put("manufacturer", Build.MANUFACTURER)
                    put("osVersion", Build.VERSION.RELEASE)
                    put("sdkInt", Build.VERSION.SDK_INT)
                    put("uuid", app.secureStorage.getOrCreateDeviceUuid())
                }
                bridge.sendSuccess(callbackId, data)
            }

            BridgeAction.GET_PUSH_TOKEN -> {
                val app = application as LoxerApplication
                val token = app.secureStorage.getString(AppConfig.PREF_PUSH_TOKEN, "")
                val data = JSONObject().apply {
                    put("token", token)
                }
                bridge.sendSuccess(callbackId, data)
            }

            BridgeAction.REQUEST_LOCATION -> {
                requestLocationInternal(callbackId)
            }

            BridgeAction.DOWNLOAD_FILE -> {
                val url = payload.optString("url")
                val fileName = payload.optString("fileName", "loxer_download_${System.currentTimeMillis()}.pdf")
                val mimeType = payload.optString("mimeType", null)
                val title = payload.optString("title", fileName)

                if (url.isNotBlank()) {
                    downloadManager.downloadFile(url, fileName, mimeType, title)
                    bridge.sendSuccess(callbackId, JSONObject().apply { put("enqueued", true) })
                } else {
                    bridge.sendError(callbackId, "Invalid download URL")
                }
            }

            BridgeAction.SHARE -> {
                val title = payload.optString("title", "LOXER")
                val text = payload.optString("text", "")
                val url = payload.optString("url", "")
                val sendText = if (url.isNotBlank()) "$text $url".trim() else text

                val intent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_SUBJECT, title)
                    putExtra(Intent.EXTRA_TEXT, sendText)
                }
                startActivity(Intent.createChooser(intent, "Bagikan via"))
                bridge.sendSuccess(callbackId, JSONObject().apply { put("success", true) })
            }

            BridgeAction.OPEN_WHATSAPP -> {
                val phone = payload.optString("phone", "").replace(Regex("[^0-9]"), "")
                val cleanPhone = if (phone.startsWith("0")) "62" + phone.substring(1) else phone
                val text = payload.optString("text", "")

                try {
                    val waUri = Uri.parse("whatsapp://send?phone=$cleanPhone&text=${Uri.encode(text)}")
                    startActivity(Intent(Intent.ACTION_VIEW, waUri))
                    bridge.sendSuccess(callbackId, JSONObject().apply { put("success", true) })
                } catch (e: Exception) {
                    val fallback = "https://wa.me/$cleanPhone?text=${Uri.encode(text)}"
                    CustomTabHelper.openCustomTab(this, fallback)
                    bridge.sendSuccess(callbackId, JSONObject().apply { put("success", true); put("fallback", true) })
                }
            }

            BridgeAction.OPEN_EXTERNAL_BROWSER -> {
                val url = payload.optString("url")
                if (url.isNotBlank()) {
                    CustomTabHelper.openCustomTab(this, url)
                    bridge.sendSuccess(callbackId, JSONObject().apply { put("success", true) })
                } else {
                    bridge.sendError(callbackId, "URL cannot be empty")
                }
            }

            BridgeAction.OPEN_MAPS -> {
                val lat = payload.optDouble("lat", 0.0)
                val lng = payload.optDouble("lng", 0.0)
                val query = payload.optString("query", "")
                val geoUri = if (lat != 0.0 && lng != 0.0) {
                    Uri.parse("geo:$lat,$lng?q=$lat,$lng($query)")
                } else {
                    Uri.parse("geo:0,0?q=${Uri.encode(query)}")
                }
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, geoUri))
                    bridge.sendSuccess(callbackId, JSONObject().apply { put("success", true) })
                } catch (e: Exception) {
                    val webMap = "https://maps.google.com/?q=${Uri.encode(query)}"
                    CustomTabHelper.openCustomTab(this, webMap)
                    bridge.sendSuccess(callbackId, JSONObject().apply { put("success", true) })
                }
            }

            BridgeAction.BIOMETRIC_AUTH -> {
                val title = payload.optString("title", "Verifikasi Biometrik")
                val subtitle = payload.optString("subtitle", "Gunakan sidik jari atau wajah Anda")

                if (biometricHelper.isBiometricAvailable()) {
                    biometricHelper.authenticate(title, subtitle,
                        onSuccess = {
                            bridge.sendSuccess(callbackId, JSONObject().apply { put("authenticated", true) })
                        },
                        onError = { err ->
                            bridge.sendError(callbackId, err)
                        }
                    )
                } else {
                    bridge.sendError(callbackId, "Biometric authentication not supported on this device")
                }
            }

            BridgeAction.VIBRATE -> {
                val ms = payload.optLong("durationMs", 50L)
                triggerVibration(ms)
                bridge.sendSuccess(callbackId, JSONObject().apply { put("success", true) })
            }

            BridgeAction.SET_STATUS_BAR -> {
                val colorHex = payload.optString("color", "#0B132B")
                val darkIcons = payload.optBoolean("darkIcons", false)
                try {
                    val color = Color.parseColor(colorHex)
                    setStatusBarTheme(color, darkIcons)
                    bridge.sendSuccess(callbackId, JSONObject().apply { put("success", true) })
                } catch (e: Exception) {
                    bridge.sendError(callbackId, "Invalid color hex: $colorHex")
                }
            }

            BridgeAction.SET_NAVIGATION_BAR -> {
                val colorHex = payload.optString("color", "#0F172A")
                val darkIcons = payload.optBoolean("darkIcons", false)
                try {
                    val color = Color.parseColor(colorHex)
                    setNavigationBarTheme(color, darkIcons)
                    bridge.sendSuccess(callbackId, JSONObject().apply { put("success", true) })
                } catch (e: Exception) {
                    bridge.sendError(callbackId, "Invalid color hex: $colorHex")
                }
            }

            BridgeAction.COPY_TO_CLIPBOARD -> {
                val text = payload.optString("text", "")
                val clipboard = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                val clip = ClipData.newPlainText("LOXER", text)
                clipboard.setPrimaryClip(clip)
                Toast.makeText(this, "Disalin ke papan klip", Toast.LENGTH_SHORT).show()
                bridge.sendSuccess(callbackId, JSONObject().apply { put("success", true) })
            }

            BridgeAction.GET_SAFE_AREA -> {
                val insets = WindowInsetsCompat.toWindowInsetsCompat(rootContainer.rootWindowInsets ?: return)
                val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
                val density = resources.displayMetrics.density

                val data = JSONObject().apply {
                    put("top", systemBars.top / density)
                    put("bottom", systemBars.bottom / density)
                    put("left", systemBars.left / density)
                    put("right", systemBars.right / density)
                }
                bridge.sendSuccess(callbackId, data)
            }

            BridgeAction.SET_SAFE_TO_RELOAD -> {
                isSafeToReload = payload.optBoolean("isSafe", true)
                bridge.sendSuccess(callbackId, JSONObject().apply { put("safe", isSafeToReload) })
            }

            BridgeAction.NOTIFY_WEB_READY -> {
                showLoading(false)
                bridge.sendSuccess(callbackId, JSONObject().apply { put("acknowledged", true) })
            }

            else -> {
                bridge.sendSuccess(callbackId, JSONObject().apply { put("status", "unhandled_or_noop") })
            }
        }
    }

    private fun requestLocationInternal(callbackId: String) {
        val hasFine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED

        if (!hasFine && !hasCoarse) {
            permissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
            bridge.sendError(callbackId, "Location permission requested. Try again after granting.")
            return
        }

        try {
            val lm = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val location = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                ?: lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)

            if (location != null) {
                val data = JSONObject().apply {
                    put("latitude", location.latitude)
                    put("longitude", location.longitude)
                    put("accuracy", location.accuracy)
                }
                bridge.sendSuccess(callbackId, data)
            } else {
                bridge.sendError(callbackId, "Location unavailable")
            }
        } catch (e: Exception) {
            bridge.sendError(callbackId, e.message ?: "Failed getting location")
        }
    }

    fun requestGeolocationPermission(origin: String, callback: GeolocationPermissions.Callback) {
        val hasFine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (hasFine) {
            callback.invoke(origin, true, true)
        } else {
            pendingGeoOrigin = origin
            pendingGeoCallback = callback
            permissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        }
    }

    fun requestWebRtcPermissions(request: PermissionRequest) {
        val hasCamera = ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        if (hasCamera) {
            request.grant(request.resources)
        } else {
            pendingPermissionRequest = request
            permissionLauncher.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO))
        }
    }

    fun handleFileChooser(callback: ValueCallback<Array<Uri>>, params: WebChromeClient.FileChooserParams): Boolean {
        fileUploadCallback?.onReceiveValue(null)
        fileUploadCallback = callback
        try {
            val intent = params.createIntent()
            fileChooserLauncher.launch(intent)
            return true
        } catch (e: Exception) {
            val fallback = Intent(Intent.ACTION_GET_CONTENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "*/*"
            }
            fileChooserLauncher.launch(Intent.createChooser(fallback, "Pilih Berkas"))
            return true
        }
    }

    private fun triggerVibration(durationMs: Long) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator.vibrate(
                VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE)
            )
        } else {
            @Suppress("DEPRECATION")
            val v = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                v.vibrate(durationMs)
            }
        }
    }

    fun setStatusBarTheme(color: Int, darkIcons: Boolean) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
            window.statusBarColor = color
            WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = darkIcons
        }
    }

    fun setNavigationBarTheme(color: Int, darkIcons: Boolean) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.navigationBarColor = color
            WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightNavigationBars = darkIcons
        }
    }

    fun showLoading(show: Boolean) {
        progressBar.visibility = if (show) View.VISIBLE else View.GONE
    }

    fun updateProgress(progress: Int) {
        progressBar.progress = progress
        if (progress >= 100) {
            progressBar.visibility = View.GONE
        }
    }

    fun showOfflinePage() {
        webView.loadUrl("file:///android_asset/offline.html")
    }

    fun reloadPrimaryWeb() {
        val target = resolveLaunchUrl(activeConfig?.webUrl ?: AppConfig.DEFAULT_WEB_URL)
        webView.loadUrl(target)
    }

    fun recoverFromCrash() {
        rootContainer.removeView(webView)
        setupWebView()
        reloadPrimaryWeb()
    }

    private fun showMaintenanceView(message: String) {
        val msg = if (message.isNotBlank()) message else getString(R.string.maintenance_default_msg)
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.maintenance_title))
            .setMessage(msg)
            .setCancelable(false)
            .setPositiveButton(getString(R.string.retry_button)) { _, _ ->
                initializeApplication()
            }
            .show()
    }

    private fun showForceUpdateDialog(updateUrl: String) {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.update_required_title))
            .setMessage(getString(R.string.update_required_msg))
            .setCancelable(false)
            .setPositiveButton(getString(R.string.update_button)) { _, _ ->
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(updateUrl)))
                finish()
            }
            .show()
    }

    private fun showSoftUpdateDialog(updateUrl: String) {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.update_required_title))
            .setMessage(getString(R.string.soft_update_msg))
            .setPositiveButton(getString(R.string.update_button)) { _, _ ->
                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(updateUrl)))
            }
            .setNegativeButton(getString(R.string.later_button), null)
            .show()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            val now = System.currentTimeMillis()
            if (now - lastBackPressTime < 2000) {
                super.onBackPressed()
            } else {
                lastBackPressTime = now
                Toast.makeText(this, "Tekan sekali lagi untuk keluar dari LOXER", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
    }

    override fun onPause() {
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }
}
