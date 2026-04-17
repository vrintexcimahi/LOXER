let publicIpPromise = null;

async function getPublicIp() {
  if (publicIpPromise) return publicIpPromise;

  publicIpPromise = fetch('https://api.ipify.org?format=json')
    .then(async (response) => {
      if (!response.ok) return '';
      const payload = await response.json();
      return payload.ip || '';
    })
    .catch(() => '')
    .finally(() => {
      publicIpPromise = null;
    });

  return publicIpPromise;
}

function buildIntegrations() {
  return [
    {
      id: 'careerjet',
      label: 'Careerjet Job Search API',
      configured: Boolean(process.env.CAREERJET_API_KEY),
      endpoint: '/api/jobs',
      docsUrl: 'https://www.careerjet.co.id/partners/api/php',
      mode: 'server-proxy',
      note: 'Butuh API key privat dan whitelist server IP publik.',
    },
    {
      id: 'jooble',
      label: 'Jooble API',
      configured: Boolean(process.env.JOOBLE_API_KEY),
      endpoint: '/api/integrations/jooble',
      docsUrl: 'https://jooble.org/api/about',
      mode: 'server-proxy',
      note: 'Cocok untuk lowongan Indonesia, API key didapat via email.',
    },
    {
      id: 'arbeitnow',
      label: 'Arbeitnow API',
      configured: true,
      endpoint: 'https://www.arbeitnow.com/api/job-board-api',
      docsUrl: 'https://www.arbeitnow.com/api/job-board-api',
      mode: 'public-feed',
      note: 'Feed publik tanpa API key, cocok untuk remote jobs internasional.',
    },
    {
      id: 'jsearch',
      label: 'JSearch via RapidAPI',
      configured: Boolean(process.env.RAPIDAPI_KEY),
      endpoint: '/api/integrations/jsearch',
      docsUrl: 'https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch',
      mode: 'server-proxy',
      note: 'Perlu RapidAPI key dan pengaturan quota sesuai paket.',
    },
  ];
}

export default async function handler(_req, res) {
  try {
    const publicIp = await getPublicIp();
    res.status(200).json({
      publicIp,
      integrations: buildIntegrations(),
    });
  } catch {
    res.status(500).json({ message: 'Status integrasi belum bisa dimuat.' });
  }
}
