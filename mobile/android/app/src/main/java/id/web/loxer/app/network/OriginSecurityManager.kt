package id.web.loxer.app.network

import android.net.Uri
import id.web.loxer.app.config.AppConfig

object OriginSecurityManager {

    private val allowedHostsSet = mutableSetOf<String>().apply {
        addAll(AppConfig.ALLOWED_HOSTS)
    }

    fun updateAllowedHosts(hosts: List<String>) {
        synchronized(allowedHostsSet) {
            allowedHostsSet.clear()
            allowedHostsSet.addAll(hosts)
            allowedHostsSet.addAll(AppConfig.ALLOWED_HOSTS)
        }
    }

    fun isAllowedUrl(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        val uri = try {
            Uri.parse(url)
        } catch (e: Exception) {
            return false
        }
        return isAllowedHost(uri.host)
    }

    fun isAllowedHost(host: String?): Boolean {
        if (host.isNullOrBlank()) return false
        val cleanHost = host.lowercase().trim()

        synchronized(allowedHostsSet) {
            if (allowedHostsSet.contains(cleanHost)) return true

            // Match wildcard child subdomains (e.g. andi.loxer.id)
            for (allowed in allowedHostsSet) {
                if (allowed.startsWith("*.")) {
                    val root = allowed.removePrefix("*.")
                    if (cleanHost.endsWith(".$root") || cleanHost == root) return true
                }
                if (cleanHost.endsWith("." + allowed)) return true
            }
        }
        return false
    }
}
