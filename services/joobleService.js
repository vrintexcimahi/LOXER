/**
 * Jooble Job Search Service for LOXER
 * Docs: https://jooble.org/api/about
 * Endpoint: POST https://id.jooble.org/api/{apiKey}
 *
 * NOTE: 100% Real data only. Dummy / sample jobs have been eradicated.
 * When JOOBLE_API_KEY is configured, queries the live Jooble API.
 * When unconfigured or on error, returns empty results gracefully.
 */

class JoobleProxyError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'JoobleProxyError';
    this.status = status;
    this.details = details;
  }
}

function getJoobleApiKey() {
  return process.env.JOOBLE_API_KEY || '';
}

/**
 * Normalizes Jooble API job object to LOXER standard format
 */
function normalizeJoobleJob(job) {
  return {
    title: job.title || 'Lowongan Kerja',
    company: job.company || 'Perusahaan Terverifikasi',
    locations: job.location || 'Indonesia',
    salary: job.salary || 'Gaji kompetitif',
    salary_min: null,
    salary_max: null,
    salary_currency_code: 'IDR',
    salary_type: 'M',
    description: (job.snippet || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    url: job.link || '#',
    date: job.updated || new Date().toISOString(),
    site: 'Jooble',
    source: job.source || 'Jooble Indonesia',
  };
}

/**
 * Search jobs using Jooble API (100% live real data only)
 */
export async function searchJoobleJobs(params = {}) {
  const apiKey = getJoobleApiKey();
  const { keywords = '', location = 'Indonesia', page = 1, salary = 0 } = params;

  // If no API key is set, return empty results (zero dummy data)
  if (!apiKey) {
    return {
      jobs: [],
      hits: 0,
      pages: 0,
      isSampleFeed: false,
    };
  }

  try {
    const endpoint = `https://id.jooble.org/api/${apiKey}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        keywords: keywords || 'Indonesia',
        location: location || 'Indonesia',
        page: Number(page) || 1,
        salary: Number(salary) || 0,
      }),
    });

    if (!response.ok) {
      console.warn(`[Jooble API] Response ${response.status}`);
      return {
        jobs: [],
        hits: 0,
        pages: 0,
        isSampleFeed: false,
      };
    }

    const data = await response.json();
    const rawJobs = Array.isArray(data?.jobs) ? data.jobs : [];
    const totalCount = Number(data?.totalCount) || rawJobs.length;

    return {
      jobs: rawJobs.map(normalizeJoobleJob),
      hits: totalCount,
      pages: Math.ceil(totalCount / 20) || 1,
      isSampleFeed: false,
    };
  } catch (error) {
    console.warn('[Jooble API] Fetch failed:', error.message);
    return {
      jobs: [],
      hits: 0,
      pages: 0,
      isSampleFeed: false,
    };
  }
}

export { JoobleProxyError };
