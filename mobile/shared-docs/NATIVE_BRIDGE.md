# LOXER Native Bridge API Specification
## Unified JavaScript Bridge for Android (Kotlin) & iOS (Swift)

---

### 1. Protocol Architecture
The Bridge allows the remote LOXER web application to invoke privileged native hardware capabilities securely.
- **Web Interface:** `window.LoxerNative` or `window.LOXER_NATIVE`
- **Android Mechanism:** `@JavascriptInterface` method routing via `LoxerNativeBridge`
- **iOS Mechanism:** `WKScriptMessageHandler` routing on channel `loxerNative`
- **Security Check:** Bridge calls are strictly rejected if `window.location.origin` is not in the whitelist.

---

### 2. Standard Message Format
#### Request from Web to Native:
```json
{
  "action": "openWhatsApp",
  "payload": {
    "phone": "628123456789",
    "text": "Halo LOXER, saya ingin menanyakan lowongan ini"
  },
  "_callbackId": "loxer_cb_176281928_1"
}
```

#### Response from Native to Web:
```json
{
  "_callbackId": "loxer_cb_176281928_1",
  "success": true,
  "data": { },
  "error": null
}
```

---

### 3. API Reference

#### `LoxerNative.getPlatform()`
- **Returns:** `Promise<{ platform: "android" | "ios" | "web", isNative: boolean }>`

#### `LoxerNative.getAppVersion()`
- **Returns:** `Promise<{ version: string, versionCode: number }>`

#### `LoxerNative.getDeviceInfo()`
- **Returns:** `Promise<{ model: string, osVersion: string, manufacturer: string, uuid: string }>`

#### `LoxerNative.getPushToken()`
- **Returns:** `Promise<{ token: string | null }>`

#### `LoxerNative.requestLocation(options)`
- **Returns:** `Promise<{ latitude: number, longitude: number, accuracy: number }>`

#### `LoxerNative.openCamera(options)`
- **Returns:** `Promise<{ base64?: string, fileUri?: string }>`

#### `LoxerNative.pickFile(options)`
- **Returns:** `Promise<{ fileUri: string, fileName: string, fileSize: number, mimeType: string }>`

#### `LoxerNative.downloadFile(options)`
- **Android:** Routes to system `DownloadManager` with status bar notification.
- **iOS:** Downloads via `URLSession` and presents `UIActivityViewController` / Save to Files.

#### `LoxerNative.share(options)`
- Invokes native Android `ACTION_SEND` or iOS `UIActivityViewController`.

#### `LoxerNative.openWhatsApp(phone, text)`
- Opens WhatsApp directly via official deep link scheme, with fallback to web URL.

#### `LoxerNative.openExternalBrowser(url)`
- Opens external websites in Chrome Custom Tabs (Android) or `SFSafariViewController` (iOS).

#### `LoxerNative.biometricAuth(options)`
- Uses `BiometricPrompt` (Android) and `LocalAuthentication` (iOS).

#### `LoxerNative.vibrate(durationMs)`
- Triggers haptic feedback.

#### `LoxerNative.setStatusBar(colorHex, darkIcons)`
- Customizes status bar.

#### `LoxerNative.setNavigationBar(colorHex, darkIcons)`
- Customizes navigation bar.

#### `LoxerNative.copyToClipboard(text)`
- Copies text to device clipboard.

#### `LoxerNative.getSafeArea()`
- Returns screen insets for notches, Dynamic Island, and navigation bars.

#### `LoxerNative.setSafeToReload(isSafe)`
- Notifies native if in sensitive transactions.

#### `LoxerNative.notifyWebReady(version)`
- Dismisses native splash.
