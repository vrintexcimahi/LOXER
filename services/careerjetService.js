const CAREERJET_ENDPOINT = 'https://search.api.careerjet.net/v4/query';

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

async function searchJobs(params = {}) {
  const response = await fetch(`${CAREERJET_ENDPOINT}?${buildQueryString(params)}`, {
    method: 'GET',
    headers: {
      Authorization: buildAuthorizationHeader(),
      Accept: 'application/json',
    },
  });

  const payload = await parsePayload(response);

  if (response.status === 400) {
    throw new Error('Locale tidak didukung');
  }

  if (response.status === 403) {
    throw new Error('user_ip atau user_agent wajib diisi');
  }

  if (!response.ok) {
    throw new Error(payload.message || 'Gagal memuat data lowongan');
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

export { searchJobs };
