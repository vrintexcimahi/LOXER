import UIKit
import UserNotifications

class PushNotificationManager: NSObject {
    static let shared = PushNotificationManager()
    private let pushTokenKey = "loxer_push_token"

    private override init() {
        super.init()
    }

    func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        }
    }

    func handleDeviceToken(_ deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        KeychainStorage.shared.save(key: pushTokenKey, value: token)
        sendTokenToBackend(token: token)
    }

    func getStoredPushToken() -> String? {
        return KeychainStorage.shared.get(key: pushTokenKey)
    }

    private func sendTokenToBackend(token: String) {
        guard let url = URL(string: "(AppConfig.defaultApiUrl)/api/mobile/device") else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let deviceId = UIDevice.current.identifierForVendor?.uuidString ?? UUID().uuidString
        let appVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"

        let payload: [String: Any] = [
            "platform": "ios",
            "device_id": deviceId,
            "push_token": token,
            "app_version": appVersion
        ]

        request.httpBody = try? JSONSerialization.data(withJSONObject: payload)

        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("[PushNotificationManager] Gagal mendaftarkan device token: (error)")
            }
        }.resume()
    }
}
