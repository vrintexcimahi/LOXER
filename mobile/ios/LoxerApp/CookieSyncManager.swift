import Foundation
import WebKit

class CookieSyncManager {
    static let shared = CookieSyncManager()
    private init() {}

    func syncCookies(from webView: WKWebView, completion: (() -> Void)? = nil) {
        let cookieStore = webView.configuration.websiteDataStore.httpCookieStore
        cookieStore.getAllCookies { cookies in
            for cookie in cookies {
                HTTPCookieStorage.shared.setCookie(cookie)
            }
            completion?()
        }
    }

    func restoreCookies(to webView: WKWebView, completion: (() -> Void)? = nil) {
        let cookieStore = webView.configuration.websiteDataStore.httpCookieStore
        guard let cookies = HTTPCookieStorage.shared.cookies else {
            completion?()
            return
        }

        let group = DispatchGroup()
        for cookie in cookies {
            group.enter()
            cookieStore.setCookie(cookie) {
                group.leave()
            }
        }
        group.notify(queue: .main) {
            completion?()
        }
    }
}
