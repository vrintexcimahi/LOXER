export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method tidak didukung' });
    return;
  }

  // Remote configuration payload following LOXER Mobile Master Prompt Section H
  const config = {
    web_url: process.env.VITE_APP_URL || "https://app.loxer.id",
    web_version: "2.7.2",
    maintenance: false,
    maintenance_message: "LOXER sedang melakukan peningkatan sistem untuk stabilitas dan keamanan yang lebih baik. Silakan coba kembali beberapa saat lagi.",
    minimum_android_version: "1.0.0",
    minimum_ios_version: "1.0.0",
    recommended_android_version: "1.2.0",
    recommended_ios_version: "1.2.0",
    force_native_update: false,
    update_url_android: "https://play.google.com/store/apps/details?id=id.web.loxer.app",
    update_url_ios: "https://apps.apple.com/app/id.web.loxer.app",
    allowed_hosts: [
      "app.loxer.id",
      "loxer.id",
      "loxer.web.id",
      "api.loxer.id",
      "dev-app.loxer.id",
      "staging-app.loxer.id",
      "localhost",
      "127.0.0.1"
    ],
    features: {
      biometric_auth: true,
      push_notifications: true,
      child_panel_routing: true,
      native_camera: true,
      file_download: true,
      safe_revalidation: true
    }
  };

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=60');
  res.status(200).json(config);
}
