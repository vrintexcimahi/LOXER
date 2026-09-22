import { searchUnifiedJobs, CareerjetProxyError } from '../services/unifiedJobService.js';

let publicIpPromise = null;

function getForwardedIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0]?.split(',')[0]?.trim() || '';
  }

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.socket?.remoteAddress || req.connection?.remoteAddress || '';
}

function isLocalIp(ip) {
  if (!ip) return true;
  return (
    ip === '::1' ||
    ip === '127.0.0.1' ||
    ip === '::ffff:127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.16.') ||
    ip.startsWith('172.17.') ||
    ip.startsWith('172.18.') ||
    ip.startsWith('172.19.') ||
    ip.startsWith('172.2') ||
    ip.startsWith('fe80:') ||
    ip.startsWith('::ffff:192.168.')
  );
}

let cachedPublicIp = '';
let cachedPublicIpAt = 0;
const PUBLIC_IP_CACHE_MS = 15 * 60 * 1000;

async function getPublicIp() {
  if (cachedPublicIp && Date.now() - cachedPublicIpAt < PUBLIC_IP_CACHE_MS) {
    return cachedPublicIp;
  }
  if (publicIpPromise) return publicIpPromise;

  publicIpPromise = fetch('https://api.ipify.org?format=json')
    .then(async (response) => {
      if (!response.ok) return '';
      const payload = await response.json();
      const ip = payload.ip || '';
      if (ip) {
        cachedPublicIp = ip;
        cachedPublicIpAt = Date.now();
      }
      return ip;
    })
    .catch(() => '')
    .finally(() => {
      publicIpPromise = null;
    });

  return publicIpPromise;
}

async function resolveCareerjetIp(req) {
  const serverPublicIp = await getPublicIp();
  if (serverPublicIp) return serverPublicIp;

  const forwardedIp = getForwardedIp(req);
  if (!isLocalIp(forwardedIp)) return forwardedIp;

  return '';
}

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET') {
    res.status(405).json({ message: 'Method tidak didukung' });
    return;
  }

  try {
    const userAgent =
      req.query?.user_agent ||
      req.headers['user-agent'] ||
      '';
    const userIp = await resolveCareerjetIp(req);

    const data = await searchUnifiedJobs({
      provider: req.query?.provider || 'all',
      keywords: req.query?.keywords || '',
      location: req.query?.location || '',
      page: Number(req.query?.page || '1') || 1,
      sort: req.query?.sort || 'date',
      contract_type: req.query?.contract_type || '',
      work_hours: req.query?.work_hours || '',
      user_ip: userIp,
      user_agent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    res.status(200).json(data);
  } catch (error) {
    if (error instanceof CareerjetProxyError) {
      res.status(error.status || 502).json({
        message: error.message,
        details: error.details || null,
      });
      return;
    }

    const message = error instanceof Error ? error.message : 'Terjadi kesalahan pada proxy lowongan LOXER';

    res.status(500).json({ message });
  }
}

