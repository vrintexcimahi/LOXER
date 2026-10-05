package id.web.loxer.app.bridge

enum class BridgeAction(val actionName: String) {
    GET_PLATFORM("getPlatform"),
    GET_APP_VERSION("getAppVersion"),
    GET_DEVICE_INFO("getDeviceInfo"),
    GET_PUSH_TOKEN("getPushToken"),
    REQUEST_LOCATION("requestLocation"),
    OPEN_CAMERA("openCamera"),
    OPEN_GALLERY("openGallery"),
    PICK_FILE("pickFile"),
    DOWNLOAD_FILE("downloadFile"),
    SHARE("share"),
    OPEN_WHATSAPP("openWhatsApp"),
    OPEN_EXTERNAL_BROWSER("openExternalBrowser"),
    OPEN_MAPS("openMaps"),
    SCAN_QR("scanQR"),
    BIOMETRIC_AUTH("biometricAuth"),
    VIBRATE("vibrate"),
    SET_STATUS_BAR("setStatusBar"),
    SET_NAVIGATION_BAR("setNavigationBar"),
    COPY_TO_CLIPBOARD("copyToClipboard"),
    GET_SAFE_AREA("getSafeArea"),
    NOTIFY_WEB_READY("notifyWebReady"),
    SET_SAFE_TO_RELOAD("setSafeToReload");

    companion object {
        fun fromString(action: String): BridgeAction? {
            return entries.firstOrNull { it.actionName.equals(action, ignoreCase = true) }
        }
    }
}
