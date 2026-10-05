import UIKit
import WebKit
import CoreLocation

class MainWebViewController: UIViewController, CLLocationManagerDelegate, UIImagePickerControllerDelegate, UINavigationControllerDelegate {

    private var webView: WKWebView!
    private var navigationDelegate: WebViewNavigationDelegate!
    private var uiDelegate: WebViewUIDelegate!
    private var splashVC: SplashViewController?
    private var maintenanceVC: MaintenanceViewController?

    private let progressView: UIProgressView = {
        let pv = UIProgressView(progressViewStyle: .default)
        pv.translatesAutoresizingMaskIntoConstraints = false
        pv.tintColor = UIColor(red: 0/255, green: 217/255, blue: 255/255, alpha: 1)
        pv.trackTintColor = .clear
        return pv
    }()

    private var pendingLocationCallbackId: String?
    private lazy var locationManager = CLLocationManager()
    private var pendingPickerCallbackId: String?

    private var currentLoadedWebVersion: String = ""
    private var isSafeToReload: Bool = true
    private var lastCrashTimestamp: TimeInterval = 0

    override func viewDidLoad() {
        super.viewDidLoad()
        setupViews()
        setupNetworkMonitor()
        loadRemoteConfigAndStart()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .lightContent
    }

    private func setupViews() {
        view.backgroundColor = UIColor(red: 10/255, green: 25/255, blue: 47/255, alpha: 1)

        let config = WKWebViewConfiguration()
        let contentController = WKUserContentController()

        // Script Message Handler for Bridge
        let bridgeHandler = LoxerScriptMessageHandler(controller: self)
        contentController.add(bridgeHandler, name: "loxerNative")

        // Preload bridge bootstrap script
        let bootstrapScript = """
        window.__LOXER_NATIVE_READY__ = true;
        window.LOXER_PLATFORM = 'ios';
        """
        let userScript = WKUserScript(source: bootstrapScript, injectionTime: .atDocumentStart, forMainFrameOnly: false)
        contentController.addUserScript(userScript)

        config.userContentController = contentController
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        webView = WKWebView(frame: .zero, configuration: config)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 10/255, green: 25/255, blue: 47/255, alpha: 1)
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        navigationDelegate = WebViewNavigationDelegate(controller: self)
        uiDelegate = WebViewUIDelegate(controller: self)
        webView.navigationDelegate = navigationDelegate
        webView.uiDelegate = uiDelegate

        // User Agent Customization
        webView.evaluateJavaScript("navigator.userAgent") { [weak self] result, _ in
            if let baseUA = result as? String {
                self?.webView.customUserAgent = "(baseUA) (AppConfig.appUserAgentSuffix)"
            }
        }

        view.addSubview(webView)
        view.addSubview(progressView)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),

            progressView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            progressView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progressView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            progressView.heightAnchor.constraint(equalToConstant: 2)
        ])

        webView.addObserver(self, forKeyPath: #keyPath(WKWebView.estimatedProgress), options: .new, context: nil)

        // Show Native Splash immediately
        showNativeSplash()
    }

    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == #keyPath(WKWebView.estimatedProgress) {
            progressView.progress = Float(webView.estimatedProgress)
            progressView.isHidden = webView.estimatedProgress >= 1.0
        } else {
            super.observeValue(forKeyPath: keyPath, of object: object, change: change, context: context)
        }
    }

    private func showNativeSplash() {
        let splash = SplashViewController()
        addChild(splash)
        splash.view.frame = view.bounds
        view.addSubview(splash.view)
        splash.didMove(toParent: self)
        self.splashVC = splash
    }

    func hideNativeSplash() {
        guard let splash = splashVC else { return }
        UIView.animate(withDuration: 0.35, animations: {
            splash.view.alpha = 0
        }) { _ in
            splash.willMove(toParent: nil)
            splash.view.removeFromSuperview()
            splash.removeFromParent()
            self.splashVC = nil
        }
    }

    private func setupNetworkMonitor() {
        NetworkMonitor.shared.onNetworkStatusChanged = { [weak self] isOnline in
            if isOnline {
                self?.notifyWeb(event: "NETWORK_CHANGED", payload: ["status": "online"])
                if self?.webView.url == nil || self?.webView.url?.absoluteString.contains("offline.html") == true {
                    self?.reloadMainDocument()
                }
            } else {
                self?.notifyWeb(event: "NETWORK_CHANGED", payload: ["status": "offline"])
            }
        }
    }

    private func loadRemoteConfigAndStart() {
        RemoteConfigManager.shared.fetchConfig { [weak self] config in
            DispatchQueue.main.async {
                self?.handleRemoteConfig(config)
            }
        }
    }

    private func handleRemoteConfig(_ config: RemoteConfigResponse) {
        OriginSecurityManager.shared.updateAllowedHosts(config.allowedHosts)

        // Maintenance Mode Check
        if config.maintenance {
            showMaintenanceScreen(message: config.maintenanceMessage)
            hideNativeSplash()
            return
        }

        // Force Native Update Check
        let currentVersion = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
        if config.forceNativeUpdate && isVersion(currentVersion, smallerThan: config.minimumIosVersion) {
            showForceUpdateModal(storeUrl: config.updateUrlIos ?? "https://apps.apple.com")
            hideNativeSplash()
            return
        }

        // Soft Update Check
        if isVersion(currentVersion, smallerThan: config.recommendedIosVersion) {
            showSoftUpdatePrompt(storeUrl: config.updateUrlIos ?? "https://apps.apple.com")
        }

        // Load Main WebView
        currentLoadedWebVersion = config.webVersion
        loadWebUrl(config.webUrl)
    }

    func loadWebUrl(_ urlString: String) {
        guard let url = URL(string: urlString) else { return }
        let request = URLRequest(url: url, cachePolicy: .useProtocolCachePolicy, timeoutInterval: 30)
        webView.load(request)
    }

    func reloadMainDocument() {
        guard let url = URL(string: AppConfig.defaultWebUrl) else { return }
        let request = URLRequest(url: url, cachePolicy: .reloadRevalidatingCacheData, timeoutInterval: 30)
        webView.load(request)
    }

    func showProgressIndicator() {
        progressView.isHidden = false
    }

    func hideProgressIndicator() {
        progressView.isHidden = true
    }

    func showOfflinePage() {
        if let offlineUrl = Bundle.main.url(forResource: "offline", withExtension: "html") {
            webView.loadFileURL(offlineUrl, allowingReadAccessTo: offlineUrl.deletingLastPathComponent())
        }
        hideNativeSplash()
    }

    func handleWebProcessCrash() {
        let now = Date().timeIntervalSince1970
        if now - lastCrashTimestamp > 10 {
            lastCrashTimestamp = now
            reloadMainDocument()
        } else {
            showOfflinePage()
        }
    }

    private func showMaintenanceScreen(message: String?) {
        let vc = MaintenanceViewController()
        vc.message = message
        vc.onRetry = { [weak self] in
            vc.dismiss(animated: true)
            self?.loadRemoteConfigAndStart()
        }
        vc.modalPresentationStyle = .fullScreen
        present(vc, animated: true)
        self.maintenanceVC = vc
    }

    private func showForceUpdateModal(storeUrl: String) {
        let alert = UIAlertController(
            title: "Pembaruan Aplikasi Diperlukan",
            message: "Versi LOXER ini sudah tidak didukung. Silakan perbarui ke versi terbaru di App Store.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Perbarui Sekarang", style: .default) { _ in
            if let url = URL(string: storeUrl) {
                UIApplication.shared.open(url)
            }
        })
        present(alert, animated: true)
    }

    private func showSoftUpdatePrompt(storeUrl: String) {
        let alert = UIAlertController(
            title: "Versi Baru Tersedia",
            message: "Pembaruan LOXER tersedia di App Store dengan peningkatan stabilitas dan fitur.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Nanti", style: .cancel))
        alert.addAction(UIAlertAction(title: "Perbarui", style: .default) { _ in
            if let url = URL(string: storeUrl) {
                UIApplication.shared.open(url)
            }
        })
        present(alert, animated: true)
    }

    private func isVersion(_ v1: String, smallerThan v2: String) -> Bool {
        return v1.compare(v2, options: .numeric) == .orderedAscending
    }

    // MARK: - Native Bridge Execution

    func executeBridgeAction(action: BridgeAction, payload: [String: Any], callbackId: String) {
        switch action {
        case .getPlatform:
            sendBridgeSuccess(callbackId: callbackId, data: ["platform": "ios"])

        case .getAppVersion:
            let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
            let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
            sendBridgeSuccess(callbackId: callbackId, data: ["version": version, "build": build])

        case .getDeviceInfo:
            let data: [String: Any] = [
                "model": UIDevice.current.model,
                "systemVersion": UIDevice.current.systemVersion,
                "deviceId": UIDevice.current.identifierForVendor?.uuidString ?? "",
                "name": UIDevice.current.name
            ]
            sendBridgeSuccess(callbackId: callbackId, data: data)

        case .getPushToken:
            let token = PushNotificationManager.shared.getStoredPushToken() ?? ""
            sendBridgeSuccess(callbackId: callbackId, data: ["pushToken": token])

        case .requestLocation:
            pendingLocationCallbackId = callbackId
            locationManager.delegate = self
            locationManager.requestWhenInUseAuthorization()
            locationManager.requestLocation()

        case .openCamera:
            pendingPickerCallbackId = callbackId
            if UIImagePickerController.isSourceTypeAvailable(.camera) {
                let picker = UIImagePickerController()
                picker.delegate = self
                picker.sourceType = .camera
                present(picker, animated: true)
            } else {
                sendBridgeError(callbackId: callbackId, error: "Kamera tidak tersedia")
            }

        case .openGallery:
            pendingPickerCallbackId = callbackId
            let picker = UIImagePickerController()
            picker.delegate = self
            picker.sourceType = .photoLibrary
            present(picker, animated: true)

        case .pickFile:
            pendingPickerCallbackId = callbackId
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.item])
            present(picker, animated: true)

        case .downloadFile:
            guard let urlStr = payload["url"] as? String else {
                sendBridgeError(callbackId: callbackId, error: "Parameter url tidak ditemukan")
                return
            }
            FileDownloadManager.shared.downloadFile(from: urlStr) { [weak self] fileUrl, error in
                if let fileUrl = fileUrl, let self = self {
                    FileDownloadManager.shared.presentShareSheet(for: fileUrl, from: self)
                    self.sendBridgeSuccess(callbackId: callbackId, data: ["downloaded": true, "path": fileUrl.path])
                } else {
                    self?.sendBridgeError(callbackId: callbackId, error: error ?? "Gagal mengunduh file")
                }
            }

        case .share:
            let text = payload["text"] as? String ?? ""
            let urlString = payload["url"] as? String ?? ""
            var items: [Any] = [text]
            if let shareUrl = URL(string: urlString) {
                items.append(shareUrl)
            }
            let activityVC = UIActivityViewController(activityItems: items, applicationActivities: nil)
            present(activityVC, animated: true)
            sendBridgeSuccess(callbackId: callbackId, data: ["shared": true])

        case .openWhatsApp:
            guard let phone = payload["phone"] as? String else {
                sendBridgeError(callbackId: callbackId, error: "Nomor telepon tidak valid")
                return
            }
            let text = (payload["text"] as? String ?? "").addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            let cleanPhone = phone.replacingOccurrences(of: "+", with "").replacingOccurrences(of: " ", with: "")
            if let waUrl = URL(string: "whatsapp://send?phone=(cleanPhone)&text=(text)"), UIApplication.shared.canOpenURL(waUrl) {
                UIApplication.shared.open(waUrl)
                sendBridgeSuccess(callbackId: callbackId, data: ["opened": true])
            } else if let webWa = URL(string: "https://wa.me/(cleanPhone)?text=(text)") {
                UIApplication.shared.open(webWa)
                sendBridgeSuccess(callbackId: callbackId, data: ["opened": true, "fallback": "web"])
            }

        case .openExternalBrowser:
            if let urlStr = payload["url"] as? String, let extUrl = URL(string: urlStr) {
                UIApplication.shared.open(extUrl)
                sendBridgeSuccess(callbackId: callbackId, data: ["opened": true])
            } else {
                sendBridgeError(callbackId: callbackId, error: "URL tidak valid")
            }

        case .openMaps:
            let query = (payload["query"] as? String ?? "").addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            if let mapUrl = URL(string: "http://maps.apple.com/?q=(query)") {
                UIApplication.shared.open(mapUrl)
                sendBridgeSuccess(callbackId: callbackId, data: ["opened": true])
            }

        case .scanQR:
            sendBridgeError(callbackId: callbackId, error: "Scan QR native dalam antrian integrasi")

        case .biometricAuth:
            let reason = payload["reason"] as? String ?? "Autentikasi keamanan LOXER"
            BiometricAuthHelper.shared.authenticate(reason: reason) { [weak self] success, error in
                if success {
                    self?.sendBridgeSuccess(callbackId: callbackId, data: ["authenticated": true])
                } else {
                    self?.sendBridgeError(callbackId: callbackId, error: error ?? "Autentikasi gagal")
                }
            }

        case .vibrate:
            let generator = UIImpactFeedbackGenerator(style: .medium)
            generator.impactOccurred()
            sendBridgeSuccess(callbackId: callbackId, data: ["vibrated": true])

        case .setStatusBar:
            sendBridgeSuccess(callbackId: callbackId, data: ["statusBar": "configured"])

        case .setNavigationBar:
            sendBridgeSuccess(callbackId: callbackId, data: ["navigationBar": "configured"])

        case .copyToClipboard:
            if let text = payload["text"] as? String {
                UIPasteboard.general.string = text
                sendBridgeSuccess(callbackId: callbackId, data: ["copied": true])
            }

        case .getSafeArea:
            let insets = view.safeAreaInsets
            let data: [String: CGFloat] = [
                "top": insets.top,
                "bottom": insets.bottom,
                "left": insets.left,
                "right": insets.right
            ]
            sendBridgeSuccess(callbackId: callbackId, data: data)

        case .webReady:
            hideNativeSplash()
            if let version = payload["webVersion"] as? String {
                UserDefaults.standard.set(version, forKey: "last_web_version_applied")
            }
            sendBridgeSuccess(callbackId: callbackId, data: ["acknowledged": true])

        case .setSafeToReload:
            if let safe = payload["safe"] as? Bool {
                self.isSafeToReload = safe
            }
            sendBridgeSuccess(callbackId: callbackId, data: ["safe": isSafeToReload])
        }
    }

    // MARK: - Bridge Response Callback

    func sendBridgeSuccess(callbackId: String, data: Any?) {
        guard !callbackId.isEmpty else { return }
        let res = BridgeResponse(callbackId: callbackId, success: true, data: data, error: nil)
        dispatchBridgeCallback(res)
    }

    func sendBridgeError(callbackId: String, error: String) {
        guard !callbackId.isEmpty else { return }
        let res = BridgeResponse(callbackId: callbackId, success: false, data: nil, error: error)
        dispatchBridgeCallback(res)
    }

    private func dispatchBridgeCallback(_ response: BridgeResponse) {
        let jsonStr = response.toJSONString()
        let js = "if (window.LoxerNative && window.LoxerNative.__handleCallback) { window.LoxerNative.__handleCallback((jsonStr)); }"
        DispatchQueue.main.async {
            self.webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    func notifyWeb(event: String, payload: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let jsonStr = String(data: data, encoding: .utf8) else { return }
        let js = "if (window.LoxerNative && window.LoxerNative.__handleNativeEvent) { window.LoxerNative.__handleNativeEvent('(event)', (jsonStr)); }"
        DispatchQueue.main.async {
            self.webView.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    // MARK: - CLLocationManagerDelegate

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        if let location = locations.first, let cbId = pendingLocationCallbackId {
            let data: [String: Double] = [
                "latitude": location.coordinate.latitude,
                "longitude": location.coordinate.longitude,
                "accuracy": location.horizontalAccuracy
            ]
            sendBridgeSuccess(callbackId: cbId, data: data)
            pendingLocationCallbackId = nil
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        if let cbId = pendingLocationCallbackId {
            sendBridgeError(callbackId: cbId, error: error.localizedDescription)
            pendingLocationCallbackId = nil
        }
    }

    // MARK: - UIImagePickerControllerDelegate

    func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
        picker.dismiss(animated: true)
        if let image = info[.originalImage] as? UIImage, let cbId = pendingPickerCallbackId {
            if let jpegData = image.jpegData(compressionQuality: 0.8) {
                let base64 = jpegData.base64EncodedString()
                sendBridgeSuccess(callbackId: cbId, data: ["image": "data:image/jpeg;base64,(base64)"])
            }
            pendingPickerCallbackId = nil
        }
    }

    func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
        picker.dismiss(animated: true)
        if let cbId = pendingPickerCallbackId {
            sendBridgeError(callbackId: cbId, error: "Dibatalkan oleh pengguna")
            pendingPickerCallbackId = nil
        }
    }
}
