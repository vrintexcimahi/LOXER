// Vercel Hobby exposes a maximum of twelve Serverless Functions. Keep the
// public endpoint paths stable while dispatching the existing handlers through
// one function. Local development continues to use the Vite middleware.
import adminAuditLog from '../api-legacy/admin-audit-log.js';
import analyticsSnapshot from '../api-legacy/admin/analytics-snapshot/generate.js';
import voidStale from '../api-legacy/admin/applications/void-stale.js';
import auditArchive from '../api-legacy/admin/audit-logs/archive.js';
import auditStats from '../api-legacy/admin/audit-logs/stats.js';
import adminDevices from '../api-legacy/admin/devices.js';
import ensureDefaultAdmin from '../api-legacy/admin/ensure-default-admin.js';
import publishSmartCv from '../api-legacy/admin/publish-smart-cv.js';
import publishSmartJob from '../api-legacy/admin/publish-smart-job.js';
import smartCvExtract from '../api-legacy/admin/smart-cv-extract.js';
import smartJobExtract from '../api-legacy/admin/smart-job-extract.js';
import adminUserData from '../api-legacy/admin/user-data.js';
import adminUsers from '../api-legacy/admin/users.js';
import applicationStatus from '../api-legacy/application-status-notification.js';
import authCapabilities from '../api-legacy/auth-capabilities.js';
import deviceRegister from '../api-legacy/device/register.js';
import integrationsStatus from '../api-legacy/integrations-status.js';
import jsearch from '../api-legacy/integrations/jsearch.js';
import jobs from '../api-legacy/jobs.js';
import userDevices from '../api-legacy/user/devices.js';
import partnerPlatform from '../api/partner-platform/[...path].js';

const ROUTES = [
  ['/admin/analytics-snapshot/generate', analyticsSnapshot],
  ['/admin/applications/void-stale', voidStale],
  ['/admin/audit-logs/archive', auditArchive],
  ['/admin/audit-logs/stats', auditStats],
  ['/admin/ensure-default-admin', ensureDefaultAdmin],
  ['/admin/publish-smart-cv', publishSmartCv],
  ['/admin/publish-smart-job', publishSmartJob],
  ['/admin/smart-cv-extract', smartCvExtract],
  ['/admin/smart-job-extract', smartJobExtract],
  ['/admin/user-data', adminUserData],
  ['/admin/users', adminUsers],
  ['/admin/devices', adminDevices],
  ['/admin-audit-log', adminAuditLog],
  ['/application-status-notification', applicationStatus],
  ['/auth-capabilities', authCapabilities],
  ['/device/register', deviceRegister],
  ['/integrations-status', integrationsStatus],
  ['/integrations/jsearch', jsearch],
  ['/jobs', jobs],
  ['/user/devices', userDevices],
];

function routeFromRequest(req) {
  const parsed = new URL(req.url || '/', 'https://loxer.internal');
  const hinted = parsed.searchParams.get('path');
  if (hinted) return hinted.startsWith('/') ? hinted : `/${hinted}`;
  return parsed.pathname.replace(/^\/api\//, '/');
}

function queryWithoutPath(req) {
  const parsed = new URL(req.url || '/', 'https://loxer.internal');
  parsed.searchParams.delete('path');
  return Object.fromEntries(parsed.searchParams.entries());
}

export default async function handler(req, res) {
  const route = routeFromRequest(req).replace(/\/$/, '') || '/';
  if (route === '/partner-platform' || route.startsWith('/partner-platform/')) {
    const originalUrl = req.url;
    req.url = `/api${route}` + (new URL(originalUrl || '/', 'https://loxer.internal').search || '');
    return partnerPlatform(req, res);
  }
  const match = ROUTES.find(([prefix]) => route === prefix || route.startsWith(`${prefix}/`));
  if (!match) {
    res.status(404).json({ error: { message: 'Endpoint tidak ditemukan.' } });
    return;
  }
  const [, target] = match;
  const query = queryWithoutPath(req);
  Object.defineProperty(req, 'query', { configurable: true, value: query });
  req.url = route + (new URL(req.url || '/', 'https://loxer.internal').search || '');
  return target(req, res);
}
