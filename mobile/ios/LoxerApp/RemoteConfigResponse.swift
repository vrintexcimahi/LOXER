import Foundation

struct RemoteConfigResponse: Codable {
    let webUrl: String
    let webVersion: String
    let maintenance: Bool
    let maintenanceMessage: String?
    let minimumIosVersion: String
    let recommendedIosVersion: String
    let forceNativeUpdate: Bool
    let updateUrlIos: String?
    let allowedHosts: [String]?

    enum CodingKeys: String, CodingKey {
        case webUrl = "web_url"
        case webVersion = "web_version"
        case maintenance
        case maintenanceMessage = "maintenance_message"
        case minimumIosVersion = "minimum_ios_version"
        case recommendedIosVersion = "recommended_ios_version"
        case forceNativeUpdate = "force_native_update"
        case updateUrlIos = "update_url_ios"
        case allowedHosts = "allowed_hosts"
    }

    static var fallback: RemoteConfigResponse {
        return RemoteConfigResponse(
            webUrl: AppConfig.fallbackWebUrl,
            webVersion: "1.0.0",
            maintenance: false,
            maintenanceMessage: nil,
            minimumIosVersion: "1.0.0",
            recommendedIosVersion: "1.1.0",
            forceNativeUpdate: false,
            updateUrlIos: "https://apps.apple.com/app/loxer/id000000000",
            allowedHosts: AppConfig.allowedHosts
        )
    }
}
