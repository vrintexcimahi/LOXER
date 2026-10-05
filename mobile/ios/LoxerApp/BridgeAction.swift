import Foundation

enum BridgeAction: String {
    case getPlatform
    case getAppVersion
    case getDeviceInfo
    case getPushToken
    case requestLocation
    case openCamera
    case openGallery
    case pickFile
    case downloadFile
    case share
    case openWhatsApp
    case openExternalBrowser
    case openMaps
    case scanQR
    case biometricAuth
    case vibrate
    case setStatusBar
    case setNavigationBar
    case copyToClipboard
    case getSafeArea
    case notifyWebReady
    case setSafeToReload
}
