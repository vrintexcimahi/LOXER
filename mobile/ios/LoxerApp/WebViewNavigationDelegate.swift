import UIKit
import WebKit
import SafariServices

class WebViewNavigationDelegate: NSObject, WKNavigationDelegate {
    weak var controller: MainWebViewController?

    init(controller: MainWebViewController) {
        self.controller = controller
        super.init()
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        let scheme = url.scheme?.lowercased() ?? ""

        // Handle native schemes (tel, mailto, sms, whatsapp)
        if scheme == "tel" || scheme == "mailto" || scheme == "sms" {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }

        if scheme == "whatsapp" || url.host == "wa.me" || url.host == "api.whatsapp.com" {
            if UIApplication.shared.canOpenURL(url) {
                UIApplication.shared.open(url)
            } else if let webUrl = URL(string: "https://wa.me/(url.path)") {
                UIApplication.shared.open(webUrl)
            }
            decisionHandler(.cancel)
            return
        }

        if url.host == "maps.google.com" || url.host == "maps.apple.com" {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }

        // Translate public child panel link
        let targetUrl = OriginSecurityManager.shared.translatePublicLink(url: url)
        if targetUrl != url {
            let request = URLRequest(url: targetUrl)
            webView.load(request)
            decisionHandler(.cancel)
            return
        }

        // Origin security check
        if OriginSecurityManager.shared.isAllowed(url: url) {
            decisionHandler(.allow)
        } else {
            // External domain -> Open safely in SFSafariViewController
            decisionHandler(.cancel)
            if let presenter = controller {
                let safariVC = SFSafariViewController(url: url)
                presenter.present(safariVC, animated: true)
            } else {
                UIApplication.shared.open(url)
            }
        }
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        controller?.showProgressIndicator()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        controller?.hideProgressIndicator()
        CookieSyncManager.shared.syncCookies(from: webView)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        controller?.hideProgressIndicator()
        let nsError = error as NSError
        // Ignore cancelled navigation errors (e.g. SFSafari redirection or app links)
        if nsError.code != NSURLErrorCancelled {
            controller?.showOfflinePage()
        }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        controller?.hideProgressIndicator()
    }

    // Recover from web process crash without infinite reload loop
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        controller?.handleWebProcessCrash()
    }

    // Strict SSL Security: Never bypass invalid certificates
    func webView(_ webView: WKWebView, didReceive challenge: URLAuthenticationChallenge, completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        completionHandler(.performDefaultHandling, nil)
    }
}
