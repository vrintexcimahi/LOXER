import { queryAll, queryOne } from '../server/localDb.js';

export function searchFacebookScrapedJobs(params = {}) {
  const { keywords = '', location = '', page = 1 } = params;

  try {
    const conditions = ["category = 'IKLAN_LOKER'"];
    const sqlParams = [];

    if (keywords && keywords.trim()) {
      const terms = keywords.trim().split(/\s+/).filter(Boolean);
      for (const term of terms) {
        conditions.push(`(
          raw_caption LIKE ? OR 
          ai_payload LIKE ? OR 
          author_name LIKE ?
        )`);
        const wildcard = `%${term}%`;
        sqlParams.push(wildcard, wildcard, wildcard);
      }
    }

    if (location && location.trim() && location.toLowerCase() !== 'indonesia') {
      conditions.push('ai_payload LIKE ?');
      sqlParams.push(`%${location.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countSql = `SELECT count(*) as total FROM fb_scraped_posts ${whereClause}`;
    const countRow = queryOne(countSql, sqlParams);
    const totalHits = countRow ? countRow.total : 0;

    const pageSize = 10;
    const offset = Math.max(0, (page - 1) * pageSize);

    const querySql = `
      SELECT id, post_url, author_name, category, confidence_score, raw_caption, image_paths, ai_payload, status, created_at
      FROM fb_scraped_posts
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const rows = queryAll(querySql, [...sqlParams, pageSize, offset]);

    const jobs = rows.map((row) => {
      let payload = {};
      try {
        if (row.ai_payload) payload = JSON.parse(row.ai_payload);
      } catch {
        payload = {};
      }

      const jp = payload.job_posting || {};
      const title = jp.title || 'Lowongan Kerja Facebook Group';
      const company = jp.company_name || row.author_name || 'Komunitas Loker Facebook';
      const city = jp.location_city || 'Bandung / Cimahi / Sekitarnya';
      const requirements = jp.requirements || '';
      const summary = payload.ai_summary || row.raw_caption || requirements || 'Postingan loker terverifikasi oleh Vision AI dari Facebook Group.';

      return {
        title,
        company,
        locations: city,
        salary: 'Lihat Kontak / Deskripsi',
        salary_min: null,
        salary_max: null,
        salary_currency_code: 'IDR',
        salary_type: 'M',
        description: summary,
        url: row.post_url || '#',
        date: row.created_at || new Date().toISOString(),
        site: 'Facebook Group (Vision AI)',
        source: 'LOXER FB Scraper Agent',
        is_internal: false,
        job_id: row.id,
        confidence_score: row.confidence_score || 95,
        contact_phone: jp.contact_phone || '',
      };
    });

    return {
      jobs,
      hits: totalHits,
      pages: Math.ceil(totalHits / pageSize) || 1,
    };
  } catch (error) {
    console.warn('[FB Scraper Jobs] Error querying sqlite:', error.message);
    return {
      jobs: [],
      hits: 0,
      pages: 0,
    };
  }
}

export function getFacebookScraperStats() {
  try {
    const totalRow = queryOne('SELECT count(*) as total FROM fb_scraped_posts');
    const total = totalRow ? totalRow.total : 0;

    const catRows = queryAll('SELECT category, count(*) as count FROM fb_scraped_posts GROUP BY category');
    const categories = {};
    for (const r of catRows) {
      categories[r.category] = r.count;
    }

    const recent = queryAll(`
      SELECT id, post_url, author_name, category, confidence_score, status, created_at, raw_caption, ai_payload
      FROM fb_scraped_posts
      ORDER BY created_at DESC
      LIMIT 10
    `).map((r) => {
      let payload = {};
      try {
        if (r.ai_payload) payload = JSON.parse(r.ai_payload);
      } catch {}
      return {
        ...r,
        ai_payload: payload,
      };
    });

    return {
      total,
      categories,
      recent,
      configured: true,
      daemon: {
        status: 'active',
        mode: 'CDP Chrome Background (Anti-Mouse Hijack)',
        intervalMinutes: 15,
        aiModel: 'Gemini 3.8 Flash High (Vision OCR)',
      }
    };
  } catch (error) {
    return {
      total: 0,
      categories: {},
      recent: [],
      configured: false,
      error: error.message,
    };
  }
}
