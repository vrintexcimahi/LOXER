package id.web.loxer.app.config

import android.content.Context
import android.util.Log
import id.web.loxer.app.security.SecureStorage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

class RemoteConfigManager(
    private val context: Context,
    private val secureStorage: SecureStorage
) {
    companion object {
        private const val TAG = "RemoteConfigManager"
        private const val TIMEOUT_MS = 6000
    }

    suspend fun fetchConfig(): RemoteConfigResponse = withContext(Dispatchers.IO) {
        try {
            val url = URL(AppConfig.REMOTE_CONFIG_URL)
            val connection = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = TIMEOUT_MS
                readTimeout = TIMEOUT_MS
                setRequestProperty("Accept", "application/json")
                setRequestProperty("User-Agent", "LOXER-Android-Native")
            }

            if (connection.responseCode in 200..299) {
                val reader = BufferedReader(InputStreamReader(connection.inputStream))
                val response = reader.readText()
                reader.close()
                return@withContext RemoteConfigResponse.fromJson(response)
            } else {
                Log.w(TAG, "Config request failed with HTTP ${connection.responseCode}, using fallback.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to fetch remote config: ${e.message}")
        }

        // Return safe default fallback
        return@withContext RemoteConfigResponse(
            webUrl = AppConfig.FALLBACK_WEB_URL,
            webVersion = secureStorage.getString(AppConfig.PREF_LAST_WEB_VERSION, "1.0.0"),
            maintenance = false
        )
    }

    fun isWebVersionNewer(currentVersion: String, serverVersion: String): Boolean {
        if (currentVersion.isEmpty() || serverVersion.isEmpty()) return false
        return currentVersion != serverVersion
    }

    fun isNativeUpdateRequired(currentNativeVersion: String, minNativeVersion: String): Boolean {
        return compareSemVer(currentNativeVersion, minNativeVersion) < 0
    }

    fun isNativeUpdateRecommended(currentNativeVersion: String, recommendedNativeVersion: String): Boolean {
        return compareSemVer(currentNativeVersion, recommendedNativeVersion) < 0
    }

    private fun compareSemVer(v1: String, v2: String): Int {
        val parts1 = v1.split(".").mapNotNull { it.toIntOrNull() }
        val parts2 = v2.split(".").mapNotNull { it.toIntOrNull() }
        val maxLen = maxOf(parts1.size, parts2.size)

        for (i in 0 until maxLen) {
            val p1 = parts1.getOrElse(i) { 0 }
            val p2 = parts2.getOrElse(i) { 0 }
            if (p1 != p2) return p1.compareTo(p2)
        }
        return 0
    }
}
