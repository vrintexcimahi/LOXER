import Foundation

class NotificationRouter {
    static let shared = NotificationRouter()
    private init() {}

    func resolveRoute(from userInfo: [AnyHashable: Any]) -> String? {
        if let route = userInfo["route"] as? String {
            return route
        }
        if let aps = userInfo["aps"] as? [String: Any], let route = aps["route"] as? String {
            return route
        }
        return nil
    }
}
