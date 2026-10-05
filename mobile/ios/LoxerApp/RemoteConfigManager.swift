import Foundation

class RemoteConfigManager {
    static let shared = RemoteConfigManager()
    private init() {}

    func fetchConfig(completion: @escaping (RemoteConfigResponse) -> Void) {
        guard let url = URL(string: AppConfig.remoteConfigUrl) else {
            completion(RemoteConfigResponse.fallback)
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = 6.0
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("LOXER-iOS-Native", forHTTPHeaderField: "User-Agent")

        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let data = data, error == nil,
                  let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                DispatchQueue.main.async {
                    completion(RemoteConfigResponse.fallback)
                }
                return
            }

            do {
                let config = try JSONDecoder().decode(RemoteConfigResponse.self, data)
                DispatchQueue.main.async {
                    completion(config)
                }
            } catch {
                DispatchQueue.main.async {
                    completion(RemoteConfigResponse.fallback)
                }
            }
        }.resume()
    }

    func isNativeUpdateRequired(currentVersion: String, minVersion: String) -> Bool {
        return compareSemVer(v1: currentVersion, v2: minVersion) == .orderedAscending
    }

    func isNativeUpdateRecommended(currentVersion: String, recVersion: String) -> Bool {
        return compareSemVer(v1: currentVersion, v2: recVersion) == .orderedAscending
    }

    private func compareSemVer(v1: String, v2: String) -> ComparisonResult {
        return v1.compare(v2, options: .numeric)
    }
}
