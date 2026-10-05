import WebKit

class LoxerScriptMessageHandler: NSObject, WKScriptMessageHandler {

    weak var controller: MainWebViewController?

    init(controller: MainWebViewController) {
        self.controller = controller
        super.init()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "loxerNative" else { return }

        // Origin Security Validation
        if let host = message.frameInfo.securityOrigin.host {
            guard OriginSecurityManager.shared.isAllowed(host: host) else {
                print("[LoxerScriptMessageHandler] Blocked message from untrusted host: \(host)")
                return
            }
        }

        guard let body = message.body as? [String: Any],
              let actionStr = body["action"] as? String else {
            return
        }

        let payload = body["payload"] as? [String: Any] ?? [:]
        let callbackId = payload["_callbackId"] as? String ?? ""

        guard let action = BridgeAction(rawValue: actionStr) else {
            controller?.sendBridgeError(callbackId: callbackId, error: "Action not recognized: \(actionStr)")
            return
        }

        controller?.executeBridgeAction(action: action, payload: payload, callbackId: callbackId)
    }
}
