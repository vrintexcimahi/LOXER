package id.web.loxer.app

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import id.web.loxer.app.network.NetworkMonitor
import id.web.loxer.app.security.SecureStorage

class LoxerApplication : Application() {

    companion object {
        const val NOTIFICATION_CHANNEL_ID = "loxer_general_channel"
        const val NOTIFICATION_CHANNEL_NAME = "Notifikasi LOXER"
        const val DOWNLOAD_CHANNEL_ID = "loxer_downloads"
        const val DOWNLOAD_CHANNEL_NAME = "Unduhan Berkas LOXER"

        lateinit var instance: LoxerApplication
            private set
    }

    lateinit var secureStorage: SecureStorage
        private set

    lateinit var networkMonitor: NetworkMonitor
        private set

    override fun onCreate() {
        super.onCreate()
        instance = this

        secureStorage = SecureStorage(this)
        networkMonitor = NetworkMonitor(this)
        networkMonitor.startMonitoring()

        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val generalChannel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                NOTIFICATION_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Pembaruan lamaran, pesan mitra, dan pengumuman lowongan kerja"
                enableLights(true)
                enableVibration(true)
            }

            val downloadChannel = NotificationChannel(
                DOWNLOAD_CHANNEL_ID,
                DOWNLOAD_CHANNEL_NAME,
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Progres dan riwayat unduhan berkas PDF dan dokumen"
            }

            notificationManager.createNotificationChannel(generalChannel)
            notificationManager.createNotificationChannel(downloadChannel)
        }
    }
}
