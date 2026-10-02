/**
 * Internal LOXER Job Service
 * Reads verified employer postings from local SQLite or Supabase
 */

import { queryAll, queryOne } from '../server/localDb.js';

export function searchInternalJobs(params = {}) {
  const { keywords = '', location = '', page = 1 } = params;

  try {
    const conditions = ["j.status = 'active'"];
    const sqlParams = [];

    if (keywords && keywords.trim()) {
      const terms = keywords.trim().split(/\s+/).filter(Boolean);
      for (const term of terms) {
        conditions.push(`(
          j.title LIKE ? OR 
          c.name LIKE ? OR 
          j.description LIKE ? OR 
          j.category LIKE ? OR 
          j.requirements LIKE ?
        )`);
        const wildcard = `%${term}%`;
        sqlParams.push(wildcard, wildcard, wildcard, wildcard, wildcard);
      }
    }

    if (location && location.trim() && location.toLowerCase() !== 'indonesia') {
      const cities = location
        .split(/[,;|]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.toLowerCase() !== 'indonesia');

      if (cities.length === 1) {
        conditions.push('(j.location_city LIKE ? OR c.city LIKE ?)');
        const wild = `%${cities[0]}%`;
        sqlParams.push(wild, wild);
      } else if (cities.length > 1) {
        const cityOrClauses = cities.map(() => '(j.location_city LIKE ? OR c.city LIKE ?)').join(' OR ');
        conditions.push(`(${cityOrClauses})`);
        for (const city of cities) {
          const wild = `%${city}%`;
          sqlParams.push(wild, wild);
        }
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `
      SELECT count(*) as total
      FROM job_listings j
      LEFT JOIN companies c ON j.company_id = c.id
      ${whereClause}
    `;
    const countRow = queryOne(countSql, sqlParams);
    const totalHits = countRow ? countRow.total : 0;

    const pageSize = 10;
    const offset = Math.max(0, (page - 1) * pageSize);

    const querySql = `
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
      ${whereClause}
      ORDER BY j.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const paginated = queryAll(querySql, [...sqlParams, pageSize, offset]);

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
      hits: totalHits,
      pages: Math.ceil(totalHits / pageSize) || 1,
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
