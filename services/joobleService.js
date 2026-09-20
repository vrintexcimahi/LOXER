/**
 * Jooble Job Search Service for LOXER
 * Docs: https://jooble.org/api/about
 * Endpoint: POST https://id.jooble.org/api/{apiKey}
 */

class JoobleProxyError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'JoobleProxyError';
    this.status = status;
    this.details = details;
  }
}

// Curated realistic Indonesian job listings for sandbox / fallback mode
const SAMPLE_INDONESIA_JOBS = [
  {
    title: 'Staff Administrasi & Gudang',
    company: 'PT Sumber Alfaria Trijaya (Alfamart)',
    locations: 'Bandung, Jawa Barat',
    salary: 'Rp 3.800.000 - Rp 4.500.000 / bulan',
    salary_min: 3800000,
    salary_max: 4500000,
    salary_currency_code: 'IDR',
    salary_type: 'M',
    description: 'Mengelola pencatatan stok masuk dan keluar gudang Alfamart DC Bandung, rekonsiliasi data inventaris harian, dan koordinasi dengan armada distribusi toko.',
    url: 'https://id.jooble.org/desc/alfamart-admin-gudang-bandung',
    date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    site: 'Jooble',
    source: 'Alfamart Career Center',
    contract_type: 'c',
    work_hours: 'f',
  },
  {
    title: 'Operator Produksi & Kemas Obat',
    company: 'PT Sanbe Farma',
    locations: 'Cimahi, Jawa Barat',
    salary: 'Rp 4.200.000 - Rp 5.100.000 / bulan',
    salary_min: 4200000,
    salary_max: 5100000,
    salary_currency_code: 'IDR',
    salary_type: 'M',
    description: 'Menjalankan proses produksi formulasi sediaan steril/non-steril sesuai standar c-GMP / CPOB, inspeksi visual blister, dan pengemasan sekunder di plant Cimahi.',
    url: 'https://id.jooble.org/desc/sanbe-operator-produksi-cimahi',
    date: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    site: 'Jooble',
    source: 'Sanbe Farma Portal',
    contract_type: 'p',
    work_hours: 'f',
  },
  {
    title: 'Teknisi Fiber Optic & Jaringan ISP',
    company: 'PT Eka Mas Republik (MyRepublic)',
    locations: 'Bandung & Cimahi',
    salary: 'Rp 4.000.000 - Rp 5.500.000 / bulan',
    salary_min: 4000000,
    salary_max: 5500000,
    salary_currency_code: 'IDR',
    salary_type: 'M',
    description: 'Instalasi sambungan baru FTTH, troubleshooting redaman kabel FO, konfigurasi router/ONT, serta maintenance jaringan fiber optic area Bandung Raya.',
    url: 'https://id.jooble.org/desc/myrepublic-teknisi-fo-bandung',
    date: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    site: 'Jooble',
    source: 'MyRepublic Recruitment',
    contract_type: 'c',
    work_hours: 'f',
  },
  {
    title: 'Kasir & Frontliner Supermarket',
    company: 'Yogya Group (Toserba Yogya)',
    locations: 'Bandung (Cabang Sunda & Kepatihan)',
    salary: 'Rp 3.750.000 - Rp 4.200.000 / bulan',
    salary_min: 3750000,
    salary_max: 4200000,
    salary_currency_code: 'IDR',
    salary_type: 'M',
    description: 'Melayani transaksi pembayaran tunai/non-tunai pelanggan, memastikan akurasi kas harian, memberikan pelayanan ramah, serta menjaga kerapian area kasir POS.',
    url: 'https://id.jooble.org/desc/yogya-kasir-bandung',
    date: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    site: 'Jooble',
    source: 'Yogya Career Portal',
    contract_type: 'p',
    work_hours: 'f',
  },
  {
    title: 'Pramuniaga & Store Crew',
    company: 'Borma Toserba',
    locations: 'Cimahi & Dago Bandung',
    salary: 'Rp 3.600.000 - Rp 4.100.000 / bulan',
    salary_min: 3600000,
    salary_max: 4100000,
    salary_currency_code: 'IDR',
    salary_type: 'M',
    description: 'Display produk rak display, pengecekan tanggal kedaluwarsa (FIFO), penataan kebersihan lorong belanja, dan membantu pelanggan menemukan barang kebutuhan.',
    url: 'https://id.jooble.org/desc/borma-pramuniaga-cimahi',
    date: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    site: 'Jooble',
    source: 'Borma Recruitment',
    contract_type: 'c',
    work_hours: 'f',
  },
  {
    title: 'Petugas Keamanan (Satpam / Security)',
    company: 'PT Ateja Tritunggal',
    locations: 'Batujajar, Bandung Barat',
    salary: 'Rp 4.100.000 - Rp 4.800.000 / bulan',
    salary_min: 4100000,
    salary_max: 4800000,
    salary_currency_code: 'IDR',
    salary_type: 'M',
    description: 'Menjaga keamanan & ketertiban area pabrik tekstil, patroli perimeter shift 24 jam, pemeriksaan akses keluar-masuk tamu & truk logistik, serta tanggap darurat K3.',
    url: 'https://id.jooble.org/desc/ateja-security-batujajar',
    date: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    site: 'Jooble',
    source: 'Ateja Career',
    contract_type: 'p',
    work_hours: 'f',
  },
  {
    title: 'Operator Mesin Weaving / Spinning Tekstil',
    company: 'PT Kahatex',
    locations: 'Rancaekek, Sumedang - Bandung',
    salary: 'Rp 3.900.000 - Rp 4.600.000 / bulan',
    salary_min: 3900000,
    salary_max: 4600000,
    salary_currency_code: 'IDR',
    salary_type: 'M',
    description: 'Mengoperasikan mesin tenun otomatis dan pemintalan benang, memantau tegangan benang, melaporkan cacat kain, serta menjaga standar target output shift.',
    url: 'https://id.jooble.org/desc/kahatex-operator-weaving',
    date: new Date(Date.now() - 32 * 3600 * 1000).toISOString(),
    site: 'Jooble',
    source: 'Kahatex HRD',
    contract_type: 'c',
    work_hours: 'f',
  },
  {
    title: 'Staff Gudang & Packer Produk Makanan',
    company: 'PT Stanli Bahan Kue',
    locations: 'Cimahi Selatan, Jawa Barat',
    salary: 'Rp 3.700.000 - Rp 4.300.000 / bulan',
    salary_min: 3700000,
    salary_max: 4300000,
    salary_currency_code: 'IDR',
    salary_type: 'M',
    description: 'Pengemasan produk bahan kue ke dalam karton master, penempelan label barcode batch produksi, sealing kardus, dan penyusunan di atas palet untuk pengiriman.',
    url: 'https://id.jooble.org/desc/stanli-packer-cimahi',
    date: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    site: 'Jooble',
    source: 'Stanli Portal',
    contract_type: 'c',
    work_hours: 'f',
  },
  {
    title: 'Customer Service & Kasir Retail',
    company: 'PT Indomarco Prismatama (Indomaret)',
    locations: 'Bandung & sekitarnya',
    salary: 'Rp 3.750.000 - Rp 4.300.000 / bulan',
    salary_min: 3750000,
    salary_max: 4300000,
    salary_currency_code: 'IDR',
    salary_type: 'M',
    description: 'Melayani transaksi pembelian di gerai Indomaret, promosi program member I.saku, penerimaan pembayaran tagihan utilitas, dan kebersihan area kasir.',
    url: 'https://id.jooble.org/desc/indomaret-kasir-bandung',
    date: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    site: 'Jooble',
    source: 'Indomaret Karir',
    contract_type: 'p',
    work_hours: 'f',
  },
  {
    title: 'Kurir Motor & Logistik Delivery',
    company: 'J&T Express & Anteraja',
    locations: 'Bandung & Cimahi',
    salary: 'Rp 3.500.000 - Rp 5.000.000 / bulan',
    salary_min: 3500000,
    salary_max: 5000000,
    salary_currency_code: 'IDR',
    salary_type: 'M',
    description: 'Mengantarkan paket kiriman e-commerce ke alamat penerima sesuai rute harian, memastikan status serah terima COD/non-COD di aplikasi kurir dengan tepat waktu.',
    url: 'https://id.jooble.org/desc/kurir-delivery-bandung',
    date: new Date(Date.now() - 55 * 3600 * 1000).toISOString(),
    site: 'Jooble',
    source: 'Logistics Partner',
    contract_type: 'c',
    work_hours: 'f',
  },
];

function getJoobleApiKey() {
  return process.env.JOOBLE_API_KEY || '';
}

/**
 * Normalizes Jooble API job object to LOXER standard format
 */
function normalizeJoobleJob(job) {
  return {
    title: job.title || 'Lowongan Kerja',
    company: job.company || 'Perusahaan di Indonesia',
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
 * Filter sandbox sample jobs based on keywords and location
 */
function filterSampleJobs(params) {
  const { keywords = '', location = '', page = 1 } = params;
  const kw = keywords.toLowerCase().trim();
  const loc = location.toLowerCase().trim();

  let filtered = SAMPLE_INDONESIA_JOBS;

  if (kw) {
    filtered = filtered.filter(
      (job) =>
        job.title.toLowerCase().includes(kw) ||
        job.company.toLowerCase().includes(kw) ||
        job.description.toLowerCase().includes(kw)
    );
  }

  if (loc) {
    filtered = filtered.filter((job) =>
      job.locations.toLowerCase().includes(loc)
    );
  }

  const pageSize = 10;
  const startIndex = (page - 1) * pageSize;
  const pageJobs = filtered.slice(startIndex, startIndex + pageSize);

  return {
    jobs: pageJobs,
    hits: filtered.length,
    pages: Math.ceil(filtered.length / pageSize) || 1,
    isSampleFeed: true,
  };
}

/**
 * Search jobs using Jooble API with graceful fallback to realistic Indonesia feed
 */
export async function searchJoobleJobs(params = {}) {
  const apiKey = getJoobleApiKey();
  const { keywords = '', location = 'Indonesia', page = 1, salary = 0 } = params;

  // If no API key is set, use realistic curated Indonesia job feed
  if (!apiKey) {
    return filterSampleJobs(params);
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
      // If unauthorized or error, log warning and fallback gracefully
      console.warn(`[Jooble API] Response ${response.status}: fallback to curated feed`);
      return filterSampleJobs(params);
    }

    const data = await response.json();
    const rawJobs = Array.isArray(data?.jobs) ? data.jobs : [];
    const totalCount = Number(data?.totalCount) || rawJobs.length;

    if (rawJobs.length === 0 && (keywords || location)) {
      // Return sample filtered if live returned 0
      return filterSampleJobs(params);
    }

    return {
      jobs: rawJobs.map(normalizeJoobleJob),
      hits: totalCount,
      pages: Math.ceil(totalCount / 20) || 1,
      isSampleFeed: false,
    };
  } catch (error) {
    console.warn('[Jooble API] Fetch failed:', error.message, '- fallback to curated feed');
    return filterSampleJobs(params);
  }
}

export { JoobleProxyError };
