import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = (scene as? UIWindowScene) else { return }

        let window = UIWindow(windowScene: windowScene)
        let mainVC = MainWebViewController()
        window.rootViewController = mainVC
        window.backgroundColor = UIColor(red: 11/255, green: 19/255, blue: 43/255, alpha: 1.0)
        self.window = window
        window.makeKeyAndVisible()

        // Handle incoming Universal Link or URL Context
        if let userActivity = connectionOptions.userActivities.first,
           userActivity.activityType == NSUserActivityTypeBrowsingWeb,
           let incomingURL = userActivity.webpageURL {
            mainVC.handleIncomingUrl(incomingURL)
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        if userActivity.activityType == NSUserActivityTypeBrowsingWeb,
           let incomingURL = userActivity.webpageURL,
           let mainVC = window?.rootViewController as? MainWebViewController {
            mainVC.handleIncomingUrl(incomingURL)
        }
    }

    func sceneDidBecomeActive(_ scene: UIScene) {
        NotificationCenter.default.post(name: .onAppResumed, object: nil)
    }
}

extension Notification.Name {
    static let onPushTokenReceived = Notification.Name("loxer_push_token_received")
    static let onAppResumed = Notification.Name("loxer_app_resumed")
}
