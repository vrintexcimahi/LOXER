package id.web.loxer.app.download

import android.app.DownloadManager
import android.content.Context
import android.net.Uri
import android.os.Environment
import android.webkit.CookieManager
import android.widget.Toast

class NativeDownloadManager(private val context: Context) {

    fun downloadFile(url: String, fileName: String, mimeType: String? = null, title: String? = null): Long {
        return try {
            val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            val uri = Uri.parse(url)

            val cookies = CookieManager.getInstance().getCookie(url)

            val request = DownloadManager.Request(uri).apply {
                setTitle(title ?: fileName)
                setDescription("Mengunduh berkas LOXER...")
                setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
                setAllowedOverMetered(true)
                setAllowedOverRoaming(true)
                if (mimeType != null) {
                    setMimeType(mimeType)
                }
                if (cookies != null) {
                    addRequestHeader("Cookie", cookies)
                }
            }

            Toast.makeText(context, "Memulai unduhan: $fileName", Toast.LENGTH_SHORT).show()
            downloadManager.enqueue(request)
        } catch (e: Exception) {
            Toast.makeText(context, "Gagal mengunduh berkas: ${e.message}", Toast.LENGTH_LONG).show()
            -1L
        }
    }
}
