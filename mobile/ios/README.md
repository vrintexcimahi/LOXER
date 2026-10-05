# LOXER iOS Native Shell (Swift + WKWebView)

Thin native shell iOS LOXER menggunakan Swift murni dan WKWebView.

## Fitur Utama
- **Zero Rebuild Updates**: 90-95% pembaruan bisnis langsung terdeploy via web tanpa upload ulang IPA.
- **Strict ATS & Security**: Tidak ada bypass SSL, enkripsi Keychain untuk token dan device identifier.
- **Origin Security**: Native Bridge hanya aktif pada domain resmi LOXER (`app.loxer.id`, `loxer.id`, dll).
- **Multi-Tenant Child Panel**: Satu binary IPA universal melayani seluruh Child Panel mitra.
- **Deep Links & Universal Links**: Dukungan routing langsung ke halaman target.
- **Rich Native Bridge**: Kamera, galeri, lokasi, share, unduhan file, biometrik Face ID/Touch ID, haptics.

## Persyaratan
- macOS dengan Xcode 15+
- Swift 5.9+
- iOS Deployment Target: iOS 15.0+

## Cara Membuka Project
Buka file `LoxerApp.xcodeproj` pada Xcode:
```bash
open LoxerApp.xcodeproj
```

## Cara Menjalankan di Simulator
1. Pilih skema **LoxerApp**.
2. Pilih simulator tujuan (misal iPhone 15 Pro).
3. Tekan **Cmd + R** untuk build dan run.

## Cara Archive & Export IPA
1. Pada Xcode, pilih menu **Product > Archive**.
2. Setelah proses Archive selesai, jendela Organizer akan terbuka.
3. Klik **Distribute App**:
   - Pilih **App Store Connect** untuk rilis ke TestFlight / App Store.
   - Atau pilih **Ad Hoc / Development / Enterprise** untuk ekspor file `.ipa` langsung.
4. Gunakan file `ExportOptions.plist` jika melakukan ekspor headless via `xcodebuild`:
```bash
xcodebuild -exportArchive \
  -archivePath ./build/LoxerApp.xcarchive \
  -exportPath ./build/export \
  -exportOptionsPlist ./ExportOptions.plist
```
