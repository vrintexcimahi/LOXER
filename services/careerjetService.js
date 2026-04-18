const CAREERJET_ENDPOINT = 'https://search.api.careerjet.net/v4/query';

class CareerjetProxyError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'CareerjetProxyError';
    this.status = status;
    this.details = details;
  }
}

function getCareerjetApiKey() {
  const apiKey = process.env.CAREERJET_API_KEY;

  if (!apiKey) {
    throw new Error('CAREERJET_API_KEY belum dikonfigurasi');
  }

  return apiKey;
}

function buildAuthorizationHeader() {
  const apiKey = getCareerjetApiKey();
  const credentials =
    typeof btoa === 'function'
      ? btoa(`${apiKey}:`)
      : Buffer.from(`${apiKey}:`).toString('base64');

  return `Basic ${credentials}`;
}

function buildQueryString(params) {
  const query = new URLSearchParams();
  const {
    keywords = '',
    location = '',
    page = 1,
    sort,
    contract_type,
    work_hours,
    user_ip,
    user_agent,
  } = params;

  query.set('locale_code', 'id_ID');
  query.set('page_size', '20');
  query.set('page', String(page || 1));
  query.set('user_ip', user_ip || '');
  query.set('user_agent', user_agent || '');

  if (keywords) query.set('keywords', keywords);
  if (location) query.set('location', location);
  if (sort) query.set('sort', sort);
  if (contract_type) query.set('contract_type', contract_type);
  if (work_hours) query.set('work_hours', work_hours);

  return query.toString();
}

async function parsePayload(response) {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function getPayloadMessage(payload) {
  if (!payload) return '';
  if (typeof payload.message === 'string' && payload.message.trim()) return payload.message.trim();
  if (typeof payload.error === 'string' && payload.error.trim()) return payload.error.trim();
  if (typeof payload.description === 'string' && payload.description.trim()) return payload.description.trim();
  return '';
}

async function searchJobs(params = {}) {
  const response = await fetch(`${CAREERJET_ENDPOINT}?${buildQueryString(params)}`, {
    method: 'GET',
    headers: {
      Authorization: buildAuthorizationHeader(),
      Accept: 'application/json',
    },
  });

  const payload = await parsePayload(response);
  const payloadMessage = getPayloadMessage(payload);

  if (response.status === 400) {
    throw new CareerjetProxyError(
      payloadMessage || 'Locale tidak didukung',
      400,
      payload
    );
  }

  if (response.status === 403) {
    throw new CareerjetProxyError(
      payloadMessage || 'Careerjet menolak request. Periksa whitelist IP server publik, API key, serta parameter user_ip dan user_agent.',
      403,
      payload
    );
  }

  if (!response.ok) {
    throw new CareerjetProxyError(
      payloadMessage || 'Gagal memuat data lowongan',
      response.status,
      payload
    );
  }

  if (payload.type === 'JOBS') {
    return {
      jobs: Array.isArray(payload.jobs) ? payload.jobs : [],
      hits: Number(payload.hits) || 0,
      pages: Number(payload.pages) || 0,
    };
  }

  if (payload.type === 'LOCATIONS') {
    return {
      needLocation: true,
      locations: Array.isArray(payload.locations)
        ? payload.locations
        : Array.isArray(payload.results)
          ? payload.results
          : [],
    };
  }

  throw new Error(payload.message || 'Respons Careerjet tidak dikenali');
}

export { CareerjetProxyError, searchJobs };
