import { searchJoobleJobs } from '../../services/joobleService.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).json({ message: 'Method tidak didukung. Gunakan GET atau POST.' });
    return;
  }

  try {
    const params = req.method === 'POST' ? req.body || {} : req.query || {};
    const result = await searchJoobleJobs({
      keywords: params.keywords || params.q || '',
      location: params.location || 'Indonesia',
      page: Number(params.page || 1),
      salary: Number(params.salary || 0),
    });

    res.status(200).json({
      totalCount: result.hits,
      jobs: result.jobs,
      pages: result.pages,
      isSampleFeed: result.isSampleFeed,
    });
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Gagal memproses request Jooble API',
    });
  }
}
