package id.web.loxer.app.notification

import android.content.Context
import android.content.Intent
import android.net.Uri
import id.web.loxer.app.MainActivity

object NotificationRouter {

    fun createIntentForRoute(context: Context, route: String?, tenant: String? = null): Intent {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        if (!route.isNullOrBlank()) {
            val cleanRoute = if (route.startsWith("/")) route else "/$route"
            val fullUrl = if (!tenant.isNullOrBlank()) {
                "https://app.loxer.id$cleanRoute?tenant=$tenant"
            } else {
                "https://app.loxer.id$cleanRoute"
            }
            intent.data = Uri.parse(fullUrl)
        }

        return intent
    }
}
