package id.web.loxer.app.config

import org.json.JSONArray
import org.json.JSONObject

data class RemoteConfigResponse(
    val webUrl: String = AppConfig.DEFAULT_WEB_URL,
    val webVersion: String = "1.0.0",
    val maintenance: Boolean = false,
    val maintenanceMessage: String = "",
    val minimumAndroidVersion: String = "1.0.0",
    val recommendedAndroidVersion: String = "1.1.0",
    val forceNativeUpdate: Boolean = false,
    val updateUrl: String = "https://loxer.web.id/downloads/loxer-app.apk",
    val allowedHosts: List<String> = AppConfig.ALLOWED_HOSTS
) {
    companion object {
        fun fromJson(jsonStr: String): RemoteConfigResponse {
            val obj = JSONObject(jsonStr)
            val hostsList = mutableListOf<String>()
            if (obj.has("allowed_hosts")) {
                val arr = obj.getJSONArray("allowed_hosts")
                for (i in 0 until arr.length()) {
                    hostsList.add(arr.getString(i))
                }
            } else {
                hostsList.addAll(AppConfig.ALLOWED_HOSTS)
            }

            return RemoteConfigResponse(
                webUrl = obj.optString("web_url", AppConfig.DEFAULT_WEB_URL),
                webVersion = obj.optString("web_version", "1.0.0"),
                maintenance = obj.optBoolean("maintenance", false),
                maintenanceMessage = obj.optString("maintenance_message", ""),
                minimumAndroidVersion = obj.optString("minimum_android_version", "1.0.0"),
                recommendedAndroidVersion = obj.optString("recommended_android_version", "1.1.0"),
                forceNativeUpdate = obj.optBoolean("force_native_update", false),
                updateUrl = obj.optString("update_url_android", "https://loxer.web.id/downloads/loxer-app.apk"),
                allowedHosts = if (hostsList.isEmpty()) AppConfig.ALLOWED_HOSTS else hostsList
            )
        }
    }
}
