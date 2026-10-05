export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ message: 'Method tidak didukung. Gunakan GET.' });
    return;
  }

  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    res.status(400).json({
      message: 'RAPIDAPI_KEY belum dikonfigurasi di environment server.',
      configured: false,
    });
    return;
  }

  try {
    const query = req.query.query || req.query.keywords || 'developer in Indonesia';
    const page = req.query.page || '1';
    const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&page=${page}`;

    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
      },
    });

    if (!response.ok) {
      res.status(response.status).json({ message: `RapidAPI error: ${response.statusText}` });
      return;
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Gagal memuat data dari JSearch' });
  }
}
