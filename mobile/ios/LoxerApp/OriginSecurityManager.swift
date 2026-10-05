import Foundation

class OriginSecurityManager {
    static let shared = OriginSecurityManager()

    private var defaultAllowedHosts: Set<String> = [
        "app.loxer.id",
        "loxer.id",
        "loxer.web.id",
        "api.loxer.id",
        "dev-app.loxer.id",
        "staging-app.loxer.id",
        "localhost",
        "127.0.0.1"
    ]

    private var dynamicAllowedHosts: Set<String> = []

    private init() {}

    func updateAllowedHosts(_ hosts: [String]) {
        dynamicAllowedHosts = Set(hosts.map { $0.lowercased() })
    }

    func isAllowed(host: String?) -> Bool {
        guard let host = host?.lowercased() else { return false }
        if defaultAllowedHosts.contains(host) || dynamicAllowedHosts.contains(host) {
            return true
        }
        // Support subdomain matching for *.loxer.id and *.loxer.web.id
        if host.hasSuffix(".loxer.id") || host.hasSuffix(".loxer.web.id") {
            return true
        }
        return false
    }

    func isAllowed(url: URL?) -> Bool {
        guard let url = url, let host = url.host else { return false }
        guard url.scheme == "https" || (url.scheme == "http" && (host == "localhost" || host == "127.0.0.1")) else {
            return false
        }
        return isAllowed(host: host)
    }

    func translatePublicLink(url: URL) -> URL {
        guard let host = url.host?.lowercased() else { return url }

        // If child domain like andi.loxer.id or andi.loxer.web.id
        if host.hasSuffix(".loxer.id") && host != "app.loxer.id" && host != "api.loxer.id" && host != "loxer.id" {
            let tenant = host.replacingOccurrences(of: ".loxer.id", with: "")
            if !tenant.isEmpty && tenant != "www" {
                var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
                components?.host = "app.loxer.id"
                var queryItems = components?.queryItems ?? []
                if !queryItems.contains(where: { $0.name == "tenant" }) {
                    queryItems.append(URLQueryItem(name: "tenant", value: tenant))
                }
                components?.queryItems = queryItems
                return components?.url ?? url
            }
        }
        return url
    }
}
