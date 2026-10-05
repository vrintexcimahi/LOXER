package id.web.loxer.app.webview

import android.content.Context
import android.net.Uri
import androidx.browser.customtabs.CustomTabColorSchemeParams
import androidx.browser.customtabs.CustomTabsIntent
import androidx.core.content.ContextCompat
import id.web.loxer.app.R

object CustomTabHelper {

    fun openCustomTab(context: Context, url: String) {
        val navyColor = ContextCompat.getColor(context, R.color.loxer_navy_dark)
        val defaultParams = CustomTabColorSchemeParams.Builder()
            .setToolbarColor(navyColor)
            .build()

        val customTabsIntent = CustomTabsIntent.Builder()
            .setDefaultColorSchemeParams(defaultParams)
            .setShowTitle(true)
            .build()

        customTabsIntent.launchUrl(context, Uri.parse(url))
    }
}
