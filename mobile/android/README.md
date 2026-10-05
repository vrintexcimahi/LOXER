# LOXER Android Native Shell (Kotlin)
## Thin Native Container with Modern WebView & Hardware Bridge

---

### 1. Architecture Summary
- **Language:** Kotlin 1.9 / 2.0+
- **Minimum SDK:** 24 (Android 7.0 Nougat)
- **Target SDK:** 35 / 36
- **Architecture:** Native Shell + Remote Web App + Biometrics + FCM Notifications + Deep Links
- **Default Origin:** \`https://app.loxer.id\` (Fallback: \`https://loxer.web.id\`)

---

### 2. Project Layout
\`\`\`
mobile/android/
├── app/
│   ├── build.gradle
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── assets/
│       │   ├── offline.html
│       │   └── loxer-bridge.js
│       ├── java/id/web/loxer/app/
│       │   ├── LoxerApplication.kt
│       │   ├── MainActivity.kt
│       │   ├── bridge/
│       │   │   ├── LoxerNativeBridge.kt
│       │   │   ├── BridgeAction.kt
│       │   │   └── BridgeResponse.kt
│       │   ├── config/
│       │   │   ├── AppConfig.kt
│       │   │   ├── RemoteConfigManager.kt
│       │   │   └── RemoteConfigResponse.kt
│       │   ├── network/
│       │   │   ├── NetworkMonitor.kt
│       │   │   └── OriginSecurityManager.kt
│       │   ├── security/
│       │   │   ├── SecureStorage.kt
│       │   │   └── BiometricHelper.kt
│       │   ├── webview/
│       │   │   ├── LoxerWebViewClient.kt
│       │   │   ├── LoxerWebChromeClient.kt
│       │   │   └── CustomTabHelper.kt
│       │   ├── download/
│       │   │   └── NativeDownloadManager.kt
│       │   └── notification/
│       │       ├── LoxerFirebaseMessagingService.kt
│       │       └── NotificationRouter.kt
│       └── res/
│           ├── values/ (colors.xml, strings.xml, styles.xml)
│           └── xml/ (network_security_config.xml, file_paths.xml)
├── build.gradle
├── settings.gradle
└── gradle.properties
\`\`\`

---

### 3. Build Commands

#### A. Build Debug APK
\`\`\`bash
./gradlew assembleDebug
# Result: app/build/outputs/apk/debug/app-debug.apk
\`\`\`

#### B. Build Signed Release APK
\`\`\`bash
export ANDROID_KEYSTORE="/path/to/loxer-release.keystore"
export ANDROID_KEY_ALIAS="loxer"
export ANDROID_KEY_PASSWORD="YourPassword"
export ANDROID_STORE_PASSWORD="YourPassword"

./gradlew assembleRelease
# Result: app/build/outputs/apk/release/app-release.apk
\`\`\`

#### C. Build Signed Release AAB (Google Play Store)
\`\`\`bash
./gradlew bundleRelease
# Result: app/build/outputs/bundle/release/app-release.aab
\`\`\`

---

### 4. Key Native Features
- **No Chrome Headers:** Runs full-screen immersive native WebView with zero browser toolbar.
- **Auto Web Updates:** Checks \`/api/mobile/config\` on launch. Revalidates HTML without reinstalling APK.
- **Safety Interlock:** Respects \`window.__LOXER_SAFE_TO_RELOAD__\` during checkouts and attendance face scans.
- **Encrypted Local Tokens:** Device UUID and notification preferences stored via \`EncryptedSharedPreferences\`.
- **Biometric Security:** Integrated \`BiometricPrompt\` for fingerprint and facial authentication.
