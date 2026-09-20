/**
 * Unified Job Aggregator Service for LOXER
 * Integrates: Jooble (Indonesia), Careerjet (Regional), Arbeitnow (Public Feed), & Internal LOXER DB
 */

import { searchJoobleJobs } from './joobleService.js';
import { searchArbeitnowJobs } from './arbeitnowService.js';
import { searchJobs as searchCareerjetJobs, CareerjetProxyError } from './careerjetService.js';
import { searchInternalJobs } from './internalJobService.js';

export async function searchUnifiedJobs(params = {}) {
  const {
    provider = 'all',
    keywords = '',
    location = '',
    page = 1,
    sort = 'date',
    contract_type = '',
    work_hours = '',
    user_ip = '',
    user_agent = '',
  } = params;

  // 1. Single Provider Queries
  if (provider === 'internal') {
    const result = searchInternalJobs({ keywords, location, page });
    return {
      jobs: result.jobs,
      hits: result.hits,
      pages: result.pages,
      provider: 'internal',
    };
  }

  if (provider === 'jooble') {
    const result = await searchJoobleJobs({ keywords, location, page });
    return {
      jobs: result.jobs,
      hits: result.hits,
      pages: result.pages,
      provider: 'jooble',
    };
  }

  if (provider === 'arbeitnow') {
    const result = await searchArbeitnowJobs({ keywords, location, page });
    return {
      jobs: result.jobs,
      hits: result.hits,
      pages: result.pages,
      provider: 'arbeitnow',
    };
  }

  if (provider === 'careerjet') {
    if (!process.env.CAREERJET_API_KEY) {
      throw new Error('CAREERJET_API_KEY belum dikonfigurasi di environment server.');
    }
    const result = await searchCareerjetJobs({
      keywords,
      location,
      page,
      sort,
      contract_type,
      work_hours,
      user_ip,
      user_agent,
    });
    return {
      ...result,
      provider: 'careerjet',
    };
  }

  // 2. Default Aggregator Mode ('all')
  // Concurrently fetch from internal DB + Jooble (+ Careerjet if configured)
  const tasks = [];

  // A. Internal LOXER jobs
  tasks.push(
    Promise.resolve().then(() => searchInternalJobs({ keywords, location, page }))
  );

  // B. Jooble (Indonesia Aggregator)
  tasks.push(
    searchJoobleJobs({ keywords, location, page }).catch((err) => {
      console.warn('[Aggregator] Jooble failed:', err.message);
      return { jobs: [], hits: 0, pages: 0 };
    })
  );

  // C. Careerjet (only if configured)
  if (process.env.CAREERJET_API_KEY) {
    tasks.push(
      searchCareerjetJobs({
        keywords,
        location,
        page,
        sort,
        contract_type,
        work_hours,
        user_ip,
        user_agent,
      }).catch((err) => {
        console.warn('[Aggregator] Careerjet failed:', err.message);
        return { jobs: [], hits: 0, pages: 0 };
      })
    );
  }

  // D. Arbeitnow (if searching remote or general tech)
  if (
    (location && location.toLowerCase().includes('remote')) ||
    (keywords && ['react', 'node', 'developer', 'frontend', 'backend', 'design'].some((w) => keywords.toLowerCase().includes(w)))
  ) {
    tasks.push(
      searchArbeitnowJobs({ keywords, location, page }).catch(() => ({ jobs: [], hits: 0, pages: 0 }))
    );
  }

  const results = await Promise.all(tasks);

  const internalResult = results[0] || { jobs: [] };
  const joobleResult = results[1] || { jobs: [] };
  const careerjetResult = results[2] || { jobs: [] };
  const arbeitnowResult = results[3] || { jobs: [] };

  // Combine: Internal (verified) first, then Jooble, then Careerjet, then Arbeitnow
  const combinedJobs = [
    ...(internalResult.jobs || []),
    ...(joobleResult.jobs || []),
    ...(careerjetResult.jobs || []),
    ...(arbeitnowResult.jobs || []),
  ];

  // Deduplicate by URL or title + company
  const seen = new Set();
  const uniqueJobs = [];

  for (const job of combinedJobs) {
    const key = job.url || `${job.title}-${job.company}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      uniqueJobs.push(job);
    }
  }

  const totalHits =
    (internalResult.hits || 0) +
    (joobleResult.hits || 0) +
    (careerjetResult.hits || 0) +
    (arbeitnowResult.hits || 0);

  return {
    jobs: uniqueJobs,
    hits: totalHits,
    pages: Math.max(
      internalResult.pages || 0,
      joobleResult.pages || 0,
      careerjetResult.pages || 0,
      arbeitnowResult.pages || 0,
      1
    ),
    provider: 'all',
  };
}

export { CareerjetProxyError };
