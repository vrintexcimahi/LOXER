import Foundation
import LocalAuthentication

class BiometricAuthHelper {
    static let shared = BiometricAuthHelper()
    private init() {}

    func authenticate(reason: String = "Konfirmasi keamanan LOXER", completion: @escaping (Bool, String?) -> Void) {
        let context = LAContext()
        var error: NSError?

        if context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, authError in
                DispatchQueue.main.async {
                    if success {
                        completion(true, nil)
                    } else {
                        let msg = authError?.localizedDescription ?? "Autentikasi biometrik dibatalkan atau gagal"
                        completion(false, msg)
                    }
                }
            }
        } else {
            completion(false, error?.localizedDescription ?? "Biometrik tidak tersedia pada perangkat ini")
        }
    }
}
