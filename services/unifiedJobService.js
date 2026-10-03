import { searchFacebookScrapedJobs } from './fbScraperJobService.js';
/**
 * Unified Job Aggregator Service for LOXER
 * Integrates: Careerjet (Regional), Facebook Group AI Scraper, & Internal LOXER DB
 */

import { searchJobs as searchCareerjetJobs, CareerjetProxyError } from './careerjetService.js';
import { searchInternalJobs } from './internalJobService.js';
import { jobSearchCache, JobSearchCache } from './resilienceService.js';

export async function searchUnifiedJobs(params = {}) {
  const {
    provider = 'all',
    keywords = '',
    location = '',
    page = 1,
    limit = null,
    sort = 'date',
    contract_type = '',
    work_hours = '',
    user_ip = '',
    user_agent = '',
  } = params;

  // 1. Check Hot In-Memory Cache first (<10ms response)
  const cacheKey = JobSearchCache.generateKey(params);
  const cachedResult = jobSearchCache.get(cacheKey);
  if (cachedResult) {
    return {
      ...cachedResult,
      fromCache: true,
    };
  }

  // 2. Single Provider Queries
  if (provider === 'internal') {
    const result = searchInternalJobs({ keywords, location, page });
    const response = {
      jobs: result.jobs,
      hits: result.hits,
      pages: result.pages,
      provider: 'internal',
    };
    jobSearchCache.set(cacheKey, response);
    return response;
  }

  if (provider === 'facebook-group') {
    const result = searchFacebookScrapedJobs({ keywords, location, page });
    const response = {
      jobs: result.jobs,
      hits: result.hits,
      pages: result.pages,
      provider: 'facebook-group',
    };
    jobSearchCache.set(cacheKey, response);
    return response;
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
    const response = {
      ...result,
      provider: 'careerjet',
    };
    jobSearchCache.set(cacheKey, response);
    return response;
  }

  if (provider === 'jsearch') {
    if (!process.env.RAPIDAPI_KEY) {
      throw new Error('RAPIDAPI_KEY belum dikonfigurasi di environment server.');
    }
    return {
      jobs: [],
      hits: 0,
      pages: 0,
      provider: 'jsearch',
    };
  }

  // 3. Default Aggregator Mode ('all')
  // Concurrently fetch from internal DB + Careerjet with Promise.allSettled
  // so slow or failing third-party providers do not stall or break healthy providers and internal listings.
  const settledResults = await Promise.allSettled([
    // A. Internal LOXER jobs (local DB)
    Promise.resolve().then(() => searchInternalJobs({ keywords, location, page, limit: limit ? Number(limit) : 100 })),

    // B. Careerjet (only if configured)
    process.env.CAREERJET_API_KEY
      ? searchCareerjetJobs({
          keywords,
          location,
          page,
          sort,
          contract_type,
          work_hours,
          user_ip,
          user_agent,
        })
      : Promise.resolve({ jobs: [], hits: 0, pages: 0 }),
  ]);

  const [internalRes, careerjetRes] = settledResults;

  const internalResult = internalRes.status === 'fulfilled' && internalRes.value ? internalRes.value : { jobs: [], hits: 0, pages: 0 };
  const careerjetResult = careerjetRes.status === 'fulfilled' && careerjetRes.value ? careerjetRes.value : { jobs: [], hits: 0, pages: 0 };

  // Combine: Internal (verified) first, then Careerjet
  const combinedJobs = [
    ...(internalResult.jobs || []),
    ...(careerjetResult.jobs || []),
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
    (careerjetResult.hits || 0);

  const numLimit = limit ? Math.max(1, Number(limit)) : null;
  const numPage = Math.max(1, Number(page) || 1);
  const totalJobs = uniqueJobs.length;
  const totalPages = numLimit
    ? Math.max(1, Math.ceil(totalJobs / numLimit))
    : Math.max(
        internalResult.pages || 0,
        careerjetResult.pages || 0,
        1
      );

  const pagedJobs = numLimit
    ? uniqueJobs.slice((numPage - 1) * numLimit, numPage * numLimit)
    : uniqueJobs;

  const finalResponse = {
    jobs: pagedJobs,
    hits: totalHits,
    pages: totalPages,
    page: numPage,
    limit: numLimit || totalJobs,
    provider: 'all',
  };

  // Cache final aggregated search result (5 minutes TTL)
  jobSearchCache.set(cacheKey, finalResponse);

  return finalResponse;
}

export { CareerjetProxyError };

