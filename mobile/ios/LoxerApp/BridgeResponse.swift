import Foundation

struct BridgeResponse {
    let callbackId: String
    let success: Bool
    let data: Any?
    let error: String?

    func toJSONString() -> String {
        var dict: [String: Any] = [
            "_callbackId": callbackId,
            "success": success
        ]
        if let data = data {
            dict["data"] = data
        } else {
            dict["data"] = NSNull()
        }
        if let error = error {
            dict["error"] = error
        } else {
            dict["error"] = NSNull()
        }

        guard let jsonData = try? JSONSerialization.data(withJSONObject: dict, options: []),
              let str = String(data: jsonData, encoding: .utf8) else {
            return "{}"
        }
        return str
    }
}
