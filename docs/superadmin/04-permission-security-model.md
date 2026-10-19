# 04 — Permission & Security Model: LOXER Universal Super Admin OS

## 1. Authentication & Role Hierarchy

LOXER enforces strict role-based separation:

```text
[ superadmin ]  --> Full platform control, DB backups, Telegram alerts, secret settings, system reboot.
      │
[ admin ]       --> User moderation, job verification, applicant inspection, analytics, company audit.
      │
[ partner ]     --> Isolated child panel management, localized jobs, sub-brand settings, commission withdrawal.
      │
[ employer ]    --> Company profile, post job vacancies, manage applicants, interview schedules.
      │
[ seeker ]      --> Profile & Smart CV, 1-click apply, application tracking, review submission.
```

---

## 2. Security Boundaries & Hard Guarantees

1. **No Password Exposure Policy:**
   - Password hashes are computed using salted SHA-256 / scrypt.
   - Plaintext passwords cannot be decrypted or viewed by administrators.
   - Support staff issue cryptographic reset tokens (`/reset-password?token=...`) with 15-minute validity.

2. **Session Revocation & Device Intelligence:**
   - User device fingerprints, IP addresses, and user-agents are tracked in `user_devices`.
   - Administrators can terminate active sessions instantly via `POST /api/user/revoke-session`.

3. **Multi-Tenant Boundary:**
   - Partner Child Panels cannot query or mutate data belonging to other partners.
   - Subdomain and custom domain requests are verified against the `partners` table in `server/tenancy/tenantResolver.js`.

4. **Secret Management:**
   - JWT secrets and Supabase service keys are configured via environment variables (`.env`).
   - Public endpoint `/api/public/runtime-config` returns only non-sensitive visual and operational configurations.
