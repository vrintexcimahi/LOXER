import Foundation
import Network

class NetworkMonitor {
    static let shared = NetworkMonitor()
    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "id.web.loxer.networkMonitor")

    var isConnected: Bool = true
    var onNetworkStatusChanged: ((Bool) -> Void)?

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            let connected = path.status == .satisfied
            DispatchQueue.main.async {
                if self?.isConnected != connected {
                    self?.isConnected = connected
                    self?.onNetworkStatusChanged?(connected)
                }
            }
        }
        monitor.start(queue: queue)
    }
}
