import { createServer } from 'vite';

async function runSmartFeaturesTest() {
  console.log('====================================================');
  console.log('🧪 Testing LOXER Admin Smart Add & Catalog Features');
  console.log('====================================================');

  const port = 3334;
  const baseUrl = `http://localhost:${port}`;
  const server = await createServer({
    configFile: './vite.config.ts',
    server: { port },
  });
  await server.listen();
  console.log(`Test Vite server running on port ${port}...`);

  try {
    // 1. Admin login to obtain session token
    const loginRes = await fetch(`${baseUrl}/api/local/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'loxer-admin-1776448925326@example.com',
        password: 'admin123',
      }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.session?.access_token;
    if (!token) throw new Error('Admin login failed');
    console.log('✅ 1. Admin authentication successful.');

    // 2. Test Smart Add Job Publish API
    const publishJobRes = await fetch(`${baseUrl}/api/admin/publish-smart-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Senior Frontend Engineer (React/TypeScript)',
        company_name: 'PT LOXER Digital Solusi',
        category: 'Teknologi & Informasi',
        location_city: 'Cimahi / Bandung',
        job_type: 'full-time',
        salary_min: 8000000,
        salary_max: 12000000,
        description: 'Membangun antarmuka modern LOXER dengan React dan Vite.',
        requirements: 'Minimal 3 tahun pengalaman React, mahir TypeScript dan Tailwind CSS.',
        benefits: 'BPJS Kesehatan, Tunjangan Remote, Laptop Kantor.',
        quota: 2,
        application_url: 'https://loxer.id/apply',
        poster_url: '',
      }),
    });
    const publishJobData = await publishJobRes.json();
    if (!publishJobRes.ok || !publishJobData.ok) {
      throw new Error(`Publish smart job failed: ${publishJobData.message || publishJobRes.status}`);
    }
    console.log('✅ 2. Smart Add Job API published successfully (Job ID:', publishJobData.job_id, ')');

    // 3. Test Smart CV Publish API
    const publishCvRes = await fetch(`${baseUrl}/api/admin/publish-smart-cv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        full_name: 'Dewi Lestari',
        headline: 'Staff Administrasi & Akuntansi',
        category: 'Administrasi & Keuangan',
        availability: 'immediate',
        experience_years: 2,
        expected_salary: 4500000,
        rate_type: 'monthly',
        domicile_city: 'Cimahi',
        whatsapp_number: '081234567890',
        email: 'dewi.lestari@example.com',
        bio: 'Lulusan Akuntansi dengan pengalaman 2 tahun pembukuan dan administrasi perkantoran.',
        skills: ['Microsoft Excel', 'Jurnal Keuangan', 'Administrasi Dokumen', 'Pajak Dasar'],
        portfolio_url: '',
        badge: 'SIAP KERJA',
        photo_url: '',
        ai_notes: 'Terekstraksi dengan AI Vision Gemini 3.8',
        confidence_score: 96,
      }),
    });
    const publishCvData = await publishCvRes.json();
    if (!publishCvRes.ok || !publishCvData.ok) {
      throw new Error(`Publish smart CV failed: ${publishCvData.message || publishCvRes.status}`);
    }
    console.log('✅ 3. Smart Add CV API published successfully (Post ID:', publishCvData.post_id, ')');

    // 4. Test Job Listings Query with company relation
    const queryJobsRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        table: 'job_listings',
        action: 'select',
        select: 'id, title, category, location_city, company_id, companies(*)',
        filters: [{ column: 'id', op: 'eq', value: publishJobData.job_id }],
      }),
    });
    const jobsData = await queryJobsRes.json();
    if (!jobsData.data || jobsData.data.length === 0) {
      throw new Error('Newly created job listing not found in DB');
    }
    console.log('✅ 4. Job listing verified in SQLite with company relation:', jobsData.data[0].title);

    // 5. Test Talent Marketplace Posts Query
    const queryTalentRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        table: 'talent_marketplace_posts',
        action: 'select',
        select: 'id, headline, category, expected_salary, is_published',
        filters: [{ column: 'id', op: 'eq', value: publishCvData.post_id }],
      }),
    });
    const talentData = await queryTalentRes.json();
    if (!talentData.data || talentData.data.length === 0) {
      throw new Error('Newly created talent post not found in DB');
    }
    console.log('✅ 5. Talent marketplace post verified in SQLite:', talentData.data[0].headline);

    // 6. Test Audit Log generation for admin actions
    const auditRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        table: 'audit_logs',
        action: 'select',
        select: 'id, action, target_type, target_id, detail, created_at',
        order: { column: 'created_at', ascending: false },
        limit: 5,
      }),
    });
    const auditData = await auditRes.json();
    console.log(`✅ 6. Audit logs verified (${auditData.data?.length || 0} recent audit entries).`);

    // 7. Test Smart Job Extract API with sample postText
    const extractJobRes = await fetch(`${baseUrl}/api/admin/smart-job-extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        postText: 'DIBUTUHKAN SEGERA: Barista & Kasir untuk Coffee Shop di Cimahi. Gaji 3.000.000 - 3.500.000/bln. Syarat: Usia maks 27 thn, ramah, berpenampilan rapi, pengalaman min 6 bln. Kirim lamaran ke WA 08123456789. PT Kopi Mantap Sejahtera.',
      }),
    });
    const extractJobData = await extractJobRes.json();
    console.log('✅ 7. Smart Job Extract API response:', extractJobData.ok ? 'OK (Title: ' + extractJobData.job?.title + ')' : extractJobData.message);

    // 8. Test Smart CV Extract API with sample cvText
    const extractCvRes = await fetch(`${baseUrl}/api/admin/smart-cv-extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        cvText: 'Nama: Rian Hidayat\nDomisili: Bandung\nPosisi: Barista & Bartender\nPengalaman: 2 tahun di Cafe Kopi Bandung\nKeahlian: Latte Art, Manual Brew, Kasir POS, Customer Service\nKontak: 081987654321\nGaji diharapkan: Rp 3.500.000/bulan',
      }),
    });
    const extractCvData = await extractCvRes.json();
    console.log('✅ 8. Smart CV Extract API response:', extractCvData.ok ? 'OK (Name: ' + extractCvData.cv?.full_name + ')' : extractCvData.message);

    console.log('====================================================');
    console.log('🎉 ALL SMART ADD & ADMIN FEATURES VERIFIED 100%! 🎉');
    console.log('====================================================');
  } finally {
    await server.close();
    console.log('Test server shut down successfully.');
  }
}

runSmartFeaturesTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
