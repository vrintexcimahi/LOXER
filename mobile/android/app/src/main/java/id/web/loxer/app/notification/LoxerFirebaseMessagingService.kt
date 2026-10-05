package id.web.loxer.app.notification

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.media.RingtoneManager
import android.util.Log
import androidx.core.app.NotificationCompat
import id.web.loxer.app.LoxerApplication
import id.web.loxer.app.config.AppConfig
import org.json.JSONObject

/**
 * Handles incoming push notifications and token refreshes.
 * When Firebase Messaging dependency is linked in build.gradle, this service extends FirebaseMessagingService.
 */
class LoxerFirebaseMessagingService {

    companion object {
        private const val TAG = "LoxerPushService"

        fun onNewToken(context: Context, token: String) {
            Log.i(TAG, "New Push Token registered: $token")
            val app = context.applicationContext as? LoxerApplication
            app?.secureStorage?.putString(AppConfig.PREF_PUSH_TOKEN, token)
        }

        fun showNotification(
            context: Context,
            title: String,
            message: String,
            route: String? = null,
            tenant: String? = null
        ) {
            val intent = NotificationRouter.createIntentForRoute(context, route, tenant)
            val pendingIntent = PendingIntent.getActivity(
                context,
                (System.currentTimeMillis() % 10000).toInt(),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            val notification = NotificationCompat.Builder(context, LoxerApplication.NOTIFICATION_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title)
                .setContentText(message)
                .setAutoCancel(true)
                .setSound(soundUri)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .build()

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.notify((System.currentTimeMillis() % 10000).toInt(), notification)
        }
    }
}
