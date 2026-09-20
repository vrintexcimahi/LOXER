/**
 * Arbeitnow Job Board Service for LOXER
 * Docs: https://www.arbeitnow.com/api/job-board-api
 * Public feed, no API key required!
 */

const ARBEITNOW_ENDPOINT = 'https://www.arbeitnow.com/api/job-board-api';

function normalizeArbeitnowJob(job) {
  const isRemote = Boolean(job.remote);
  const location = isRemote ? 'Remote' : job.location || 'Internasional';

  return {
    title: job.title || 'Lowongan Pekerjaan',
    company: job.company_name || 'Perusahaan Global',
    locations: location,
    salary: 'Kompetitif / Sesuai Pengalaman',
    salary_min: null,
    salary_max: null,
    salary_currency_code: 'USD',
    salary_type: 'M',
    description: (job.description || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
    url: job.url || '#',
    date: job.created_at ? new Date(job.created_at * 1000).toISOString() : new Date().toISOString(),
    site: 'Arbeitnow',
    source: 'Arbeitnow Global Feed',
  };
}

export async function searchArbeitnowJobs(params = {}) {
  const { keywords = '', location = '', page = 1 } = params;

  try {
    const response = await fetch(`${ARBEITNOW_ENDPOINT}?page=${page}`, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Arbeitnow API error: ${response.status}`);
    }

    const data = await response.json();
    let rawJobs = Array.isArray(data?.data) ? data.data : [];

    if (keywords) {
      const kw = keywords.toLowerCase();
      rawJobs = rawJobs.filter((job) =>
        (job.title || '').toLowerCase().includes(kw) ||
        (job.company_name || '').toLowerCase().includes(kw) ||
        (job.tags || []).some((t) => t.toLowerCase().includes(kw))
      );
    }

    if (location) {
      const loc = location.toLowerCase();
      rawJobs = rawJobs.filter((job) =>
        (job.location || '').toLowerCase().includes(loc) ||
        (loc.includes('remote') && job.remote)
      );
    }

    const normalized = rawJobs.map(normalizeArbeitnowJob);

    return {
      jobs: normalized,
      hits: data?.meta?.total || normalized.length,
      pages: data?.meta?.last_page || 1,
    };
  } catch (error) {
    console.warn('[Arbeitnow] Fetch failed:', error.message);
    return {
      jobs: [],
      hits: 0,
      pages: 0,
      error: error.message,
    };
  }
}
