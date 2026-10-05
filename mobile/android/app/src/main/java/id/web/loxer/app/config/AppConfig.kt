package id.web.loxer.app.config

object AppConfig {
    const val DEFAULT_WEB_URL = "https://app.loxer.id"
    const val FALLBACK_WEB_URL = "https://loxer.web.id"
    const val DEFAULT_API_URL = "https://api.loxer.id"
    const val REMOTE_CONFIG_URL = "https://api.loxer.id/mobile/config"

    const val APP_USER_AGENT_SUFFIX = " LOXERApp/Android/1.1.0"
    const val PREF_LAST_WEB_VERSION = "loxer_last_web_version"
    const val PREF_SAFE_TO_RELOAD = "loxer_safe_to_reload"
    const val PREF_PUSH_TOKEN = "loxer_push_token"
    const val PREF_DEVICE_UUID = "loxer_device_uuid"

    val ALLOWED_HOSTS = listOf(
        "app.loxer.id",
        "loxer.web.id",
        "loxer.id",
        "api.loxer.id"
    )
}
