import Foundation

struct AppConfig {
    static let defaultWebUrl = "https://app.loxer.id"
    static let fallbackWebUrl = "https://loxer.web.id"
    static let defaultApiUrl = "https://api.loxer.id"
    static let remoteConfigUrl = "https://api.loxer.id/mobile/config"

    static let appUserAgentSuffix = " LOXERApp/iOS/1.1.0"
    static let keychainPushToken = "loxer_push_token"
    static let keychainDeviceUUID = "loxer_device_uuid"
    static let prefLastWebVersion = "loxer_last_web_version"

    static let allowedHosts = [
        "app.loxer.id",
        "loxer.web.id",
        "loxer.id",
        "api.loxer.id"
    ]
}
