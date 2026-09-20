/**
 * Internal LOXER Job Service
 * Reads verified employer postings from local SQLite or Supabase
 */

import { queryAll } from '../server/localDb.js';

export function searchInternalJobs(params = {}) {
  const { keywords = '', location = '', page = 1 } = params;

  try {
    const rows = queryAll(`
      SELECT 
        j.id, 
        j.title, 
        j.category, 
        j.location_city, 
        j.job_type, 
        j.salary_min, 
        j.salary_max, 
        j.description, 
        j.requirements, 
        j.created_at,
        c.name AS company_name,
        c.logo_url AS company_logo
      FROM job_listings j
      LEFT JOIN companies c ON j.company_id = c.id
      WHERE j.status = 'active'
      ORDER BY j.created_at DESC
    `);

    let filtered = rows;

    if (keywords) {
      const kw = keywords.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          (job.title || '').toLowerCase().includes(kw) ||
          (job.company_name || '').toLowerCase().includes(kw) ||
          (job.description || '').toLowerCase().includes(kw) ||
          (job.category || '').toLowerCase().includes(kw)
      );
    }

    if (location) {
      const loc = location.toLowerCase();
      filtered = filtered.filter((job) =>
        (job.location_city || '').toLowerCase().includes(loc)
      );
    }

    const pageSize = 10;
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    const normalized = paginated.map((job) => {
      const min = Number(job.salary_min) || 0;
      const max = Number(job.salary_max) || 0;
      let salaryText = 'Gaji kompetitif';
      if (min > 0 && max > 0) {
        salaryText = `Rp ${min.toLocaleString('id-ID')} - Rp ${max.toLocaleString('id-ID')} / bulan`;
      } else if (min > 0) {
        salaryText = `Mulai Rp ${min.toLocaleString('id-ID')} / bulan`;
      }

      return {
        title: job.title,
        company: job.company_name || 'Mitra LOXER',
        locations: job.location_city || 'Indonesia',
        salary: salaryText,
        salary_min: min || null,
        salary_max: max || null,
        salary_currency_code: 'IDR',
        salary_type: 'M',
        description: job.description || job.requirements || 'Deskripsi lowongan internal LOXER.',
        url: `/seeker/browse?job_id=${job.id}`,
        date: job.created_at || new Date().toISOString(),
        site: 'LOXER Mitra',
        source: 'LOXER Verified Employer',
        is_internal: true,
        job_id: job.id,
      };
    });

    return {
      jobs: normalized,
      hits: filtered.length,
      pages: Math.ceil(filtered.length / pageSize) || 1,
    };
  } catch (error) {
    console.warn('[Internal Jobs] Error querying SQLite jobs:', error.message);
    return {
      jobs: [],
      hits: 0,
      pages: 0,
    };
  }
}
