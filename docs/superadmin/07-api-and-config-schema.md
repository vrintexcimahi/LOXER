# 07 — API & Config Schema: LOXER Universal Super Admin OS

## 1. REST Endpoints Contract

```text
POST   /api/v1/auth/login                  -> Verifikasi email/password, issue JWT token
GET    /api/v1/admin/overview              -> Rekapitulasi metrik pengguna, lamaran & sistem
GET    /api/v1/admin/settings              -> Ambil konfigurasi sistem & brand aktif
POST   /api/v1/admin/settings              -> Simpan pembaruan tema, aset & general config
GET    /api/v1/admin/users                 -> Daftar user dengan paginasi, role & status
POST   /api/v1/admin/users/:id/reset       -> Generate token reset password 1-kali pakai
POST   /api/v1/admin/users/:id/revoke      -> Cabut sesi aktif user / device
GET    /api/v1/admin/features              -> Daftar feature flags & status rollout
PATCH  /api/v1/admin/features/:key         -> Toggle modul fitur secara instan
GET    /api/v1/admin/moderation/queue      -> Ambil antrian review loker & smart CV
POST   /api/v1/admin/moderation/:id/action -> Approve atau reject postingan
GET    /api/v1/admin/logs                  -> Stream log tail & audit trail sistem
POST   /api/v1/admin/backup/trigger        -> Picu snapshot cadangan database SQLite
GET    /api/public/runtime-config          -> Konfigurasi publik allowlisted (non-secret)
```

---

## 2. Setting Schema Definitions

```json
{
  "theme": {
    "preset": "cyan-neon",
    "primaryColor": "#06b6d4",
    "secondaryColor": "#0ea5e9",
    "borderRadius": "16px",
    "fontFamily": "Inter, system-ui, sans-serif"
  },
  "assets": {
    "appLogoUrl": "/branding/icon64.png",
    "appLogoText": "LOXER",
    "faviconUrl": "/branding/icon32.png",
    "heroBannerUrl": "/banners/banner-1.jpg"
  },
  "general": {
    "appName": "LOXER",
    "tagline": "Platform Rekrutmen & Bursa Talenta Indonesia",
    "contactEmail": "halo@loxer.id",
    "copyrightText": "© 2026 LOXER. Hak Cipta Dilindungi."
  }
}
```
