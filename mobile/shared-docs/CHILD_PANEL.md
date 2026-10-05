# LOXER Child Panel Architecture
## Universal Multi-Tenant Mobile Shell

---

### 1. The Universal Shell Solution
Instead of maintaining separate APKs (`Andi.apk`, `Budi.apk`, `Rina.apk`), LOXER deploys a single universal **LOXER App**:
- **Single Download:** Users download the official LOXER application once.
- **Dynamic Identity:** Once authenticated, the server determines the tenant context.
- **Contextual UI:** The Web Application dynamically renders Andi Digital's branding and services within the secure `app.loxer.id` origin.
