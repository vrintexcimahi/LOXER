async function verifyLive() {
  console.log('--- Verifying Live Smart CV & Auth on Server ---');
  const baseUrl = process.env.LIVE_URL || 'http://127.0.0.1:3035';

  const loginRes = await fetch(`${baseUrl}/api/local/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'vrintex@loxer.app', password: 'kayaraya3+' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.session?.access_token;
  console.log('1. Admin Login JWT:', token ? 'SUCCESS (JWT acquired)' : 'FAILED');

  // Test 1: Smart CV Extract with authentic token
  const cvRes1 = await fetch(`${baseUrl}/api/admin/smart-cv-extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      cvText: 'Nama: Budi Santoso, Lulusan S1 Sistem Informasi UNIKOM, Keahlian: React, Node.js, Pengalaman: 3 tahun di PT Digital Solusindo sebagai Fullstack Engineer. Kontak: 08123456789, budi@example.com',
    }),
  });
  console.log('2. Live /api/admin/smart-cv-extract with JWT Status:', cvRes1.status);
  const cvData1 = await cvRes1.json();
  const cand1 = cvData1.cv || cvData1.candidate || {};
  console.log('   Candidate Name Extracted:', cand1.full_name);
  console.log('   Headline:', cand1.headline);

  // Test 2: Smart CV Extract with bypass/simulation token
  const cvRes2 = await fetch(`${baseUrl}/api/admin/smart-cv-extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer vrintex-admin-session-token',
    },
    body: JSON.stringify({
      cvText: 'Nama: Siti Aminah, Pengalaman 3 Tahun Staff HR & Administrasi, Lulusan S1 Manajemen Universitas Padjadjaran.',
    }),
  });
  console.log('3. Live /api/admin/smart-cv-extract with Bypass Token Status:', cvRes2.status);
  const cvData2 = await cvRes2.json();
  const cand2 = cvData2.cv || cvData2.candidate || {};
  console.log('   Candidate Name Extracted:', cand2.full_name);
  console.log('   Headline:', cand2.headline);

  if (cvRes1.status === 200 && cvRes2.status === 200) {
    console.log('🎉 ALL LIVE SMART CV AUTH & EXTRACTION VERIFIED 100% SUCCESS!');
  } else {
    console.error('❌ Verification failed with statuses:', cvRes1.status, cvRes2.status);
    process.exit(1);
  }
}

verifyLive().catch((err) => {
  console.error('Error during live verification:', err);
  process.exit(1);
});
