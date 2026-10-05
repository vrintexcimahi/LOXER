# LOXER Mobile Security Architecture
## Threat Model, Boundary Protections & Hardening Principles

---

### 1. Security Architecture Principles
1. **Zero-Trust for External Domains:** The Native Bridge is an administrative privilege. It MUST NOT be exposed to arbitrary third-party web domains.
2. **Strict Origin Isolation:** Only whitelisted domains (`app.loxer.id`, `loxer.web.id`, `loxer.id`, and verified tenant subdomains) are allowed to execute bridge calls.
3. **No SSL Bypass:** `handler.proceed()` on Android and `allowInvalidCertificates` on iOS are strictly forbidden. Any TLS certificate invalidity halts navigation.
4. **Encrypted Storage:** Device identifiers and sensitive local tokens reside in hardware-backed storage (EncryptedSharedPreferences / iOS Keychain). Passwords are never stored locally.

---

### 2. Android Security Implementation Details
- Disabling Insecure WebView Settings (`allowFileAccess = false`, `allowContentAccess = false`, etc.)
- Safe Browsing enabled.
- Bridge method hardening.
- Optional `FLAG_SECURE` for banking/payment pages.

---

### 3. iOS Security Implementation Details
- App Transport Security (ATS) enforced.
- Message Origin Validation in `WKScriptMessageHandler`.
- 100% compliant with Apple App Store review guidelines.
