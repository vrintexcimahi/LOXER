# LOXER Mobile Build & Deployment Guide
## Complete Guide for Android (APK + AAB) and iOS (Xcode Archive + IPA)

---

### 1. Prerequisites
- **Android:**
  - JDK 17 (OpenJDK 17 recommended)
  - Android SDK (API 35/36, Build Tools 35.0.0+)
  - Gradle 8.x+
- **iOS:**
  - macOS Sonoma / Sequoia
  - Xcode 15+ / 16+
  - Apple Developer Account

---

### 2. Android Build Instructions
```bash
cd mobile/android

# Build Debug APK
./gradlew assembleDebug

# Build Signed Release APK
./gradlew assembleRelease

# Build Signed Release AAB
./gradlew bundleRelease
```

---

### 3. iOS Build Instructions
```bash
cd mobile/ios

# Build Simulator
xcodebuild -scheme LoxerApp -destination 'platform=iOS Simulator,name=iPhone 16,OS=latest' build

# Build Archive
xcodebuild -scheme LoxerApp -sdk iphoneos -configuration Release -archivePath ./build/LoxerApp.xcarchive archive

# Export IPA
xcodebuild -exportArchive -archivePath ./build/LoxerApp.xcarchive -exportPath ./build/LoxerApp-IPA -exportOptionsPlist ./LoxerApp/Supporting\ Files/ExportOptions.plist
```
