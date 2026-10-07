import { createServer } from 'vite';
import { getLocalDb, queryOne, execute } from '../server/localDb.js';
import fs from 'node:fs';

async function runPartnerTests() {
  console.log('====================================================');
  console.log('🧪 Testing Partner Applications, PII Protection & Mobile Security');
  console.log('====================================================');

  const port = 3335;
  const baseUrl = `http://localhost:${port}`;
  const server = await createServer({
    configFile: './vite.config.ts',
    server: { port },
  });
  await server.listen();
  console.log(`Test Vite server running on port ${port}...`);

  let failureCount = 0;
  function assert(condition, message) {
    if (condition) {
      console.log(`✅ ${message}`);
    } else {
      console.error(`❌ FAILED: ${message}`);
      failureCount++;
    }
  }

  async function safeFetch(url, options = {}, retries = 2) {
    for (let i = 0; i <= retries; i++) {
      try {
        const opts = {
          ...options,
          headers: {
            Connection: 'close',
            ...(options.headers || {}),
          },
        };
        return await fetch(url, opts);
      } catch (err) {
        if (i === retries || (err.cause?.code !== 'ECONNRESET' && err.code !== 'ECONNRESET')) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 150));
      }
    }
  }

  try {
    // 1. Admin login to obtain admin token
    const loginRes = await safeFetch(`${baseUrl}/api/local/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'vrintex@loxer.app',
        password: 'kayaraya3+',
      }),
    });
    const loginJson = await loginRes.json();
    const adminToken = loginJson?.data?.session?.access_token || loginJson?.session?.access_token || '';
    assert(Boolean(adminToken), '1. Admin authentication successful');

    // Clean up test partner data
    execute("DELETE FROM partner_applications WHERE suggested_slug LIKE 'test-branch-%'");
    execute("DELETE FROM audit_logs WHERE target_type = 'partner_application'");

    // 2. Test validation: Empty business name
    const emptyNameRes = await safeFetch(`${baseUrl}/api/local/partner/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: '',
        suggested_slug: 'test-branch-valid',
        city: 'Bandung',
        pic_phone: '081234567890',
      }),
    });
    assert(emptyNameRes.status === 400, '2. Validation: Rejects empty business name with 400');

    // 3. Test validation: Invalid WhatsApp phone
    const invalidPhoneRes = await safeFetch(`${baseUrl}/api/local/partner/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: 'PT Mitra Sukses',
        suggested_slug: 'test-branch-valid',
        city: 'Bandung',
        pic_phone: '123', // too short
      }),
    });
    assert(invalidPhoneRes.status === 400, '3. Validation: Rejects invalid phone (< 8 digits) with 400');

    // 4. Test validation: Reserved slug (AUD-018)
    const reservedSlugRes = await safeFetch(`${baseUrl}/api/local/partner/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: 'Cabang Admin',
        suggested_slug: 'admin',
        city: 'Jakarta',
        pic_phone: '081234567890',
      }),
    });
    assert(reservedSlugRes.status === 400, '4. Validation (AUD-018): Rejects reserved slug "admin" with 400');

    // 5. Test validation: Invalid slug format
    const badSlugRes = await safeFetch(`${baseUrl}/api/local/partner/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: 'Cabang Keren',
        suggested_slug: 'Cabang Keren!', // spaces and uppercase
        city: 'Bandung',
        pic_phone: '081234567890',
      }),
    });
    assert(badSlugRes.status === 400, '5. Validation: Rejects invalid slug formatting with 400');

    // 6. Test successful application submission
    const testSlug = `test-branch-${Date.now().toString().slice(-6)}`;
    const validApplyRes = await safeFetch(`${baseUrl}/api/local/partner/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: 'CV Mitra Sukses Sejahtera',
        suggested_slug: testSlug,
        city: 'Cimahi',
        pic_phone: '087820070258',
        notes: 'Catatan rahasia: target ekspansi Q4 2026',
      }),
    });
    const applyJson = await validApplyRes.json();
    assert(validApplyRes.status === 201 && applyJson.ok, '6. Submission: Partner application submitted successfully (201)');
    const appId = applyJson.id;

    // Verify persisted in SQLite
    const appRow = queryOne('SELECT * FROM partner_applications WHERE id = ?', [appId]);
    assert(
      appRow && appRow.suggested_slug === testSlug && appRow.status === 'pending',
      '6.1 Database: Partner application saved in SQLite with status=pending'
    );

    // 7. Test collision: Duplicate slug rejected with 409 Conflict (AUD-018)
    const dupSlugRes = await safeFetch(`${baseUrl}/api/local/partner/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_name: 'Duplikat Mitra',
        suggested_slug: testSlug,
        city: 'Cimahi',
        pic_phone: '081234567890',
      }),
    });
    assert(dupSlugRes.status === 409, '7. Collision (AUD-018): Duplicate suggested_slug blocked with 409 Conflict');

    // 8. Test Rate Limiting on partner application (AUD-018)
    let rateLimited = false;
    for (let i = 0; i < 6; i++) {
      const res = await safeFetch(`${baseUrl}/api/local/partner/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: `Spam Mitra ${i}`,
          suggested_slug: `test-branch-spam-${i}-${Date.now().toString().slice(-4)}`,
          city: 'Cimahi',
          pic_phone: '081234567890',
        }),
      });
      if (res.status === 429) {
        rateLimited = true;
        break;
      }
    }
    assert(rateLimited, '8. Rate Limiter (AUD-018): Excessive partner applications blocked with HTTP 429');

    // 9. Test Public Access to Approved Applications & PII Sanitization (AUD-015)
    // First, approve an application for public viewing
    const approvedSlug = `test-branch-approved-${Date.now().toString().slice(-4)}`;
    const approvedAppId = 'app-test-approved-01';
    execute(
      `INSERT OR REPLACE INTO partner_applications (id, business_name, suggested_slug, city, pic_phone, notes, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'approved', datetime('now'))`,
      [approvedAppId, 'PT Mitra Unggulan Terverifikasi', approvedSlug, 'Bandung', '081987654321', 'Catatan sangat pribadi']
    );

    const publicApprovedRes = await safeFetch(`${baseUrl}/api/local/partner/applications?status=approved`);
    const publicApprovedJson = await publicApprovedRes.json();
    assert(publicApprovedRes.status === 200, '9. Public Endpoint: GET /api/local/partner/applications?status=approved is accessible (200)');

    const publicSample = publicApprovedJson.rows?.find((r) => r.id === approvedAppId);
    assert(
      publicSample &&
      publicSample.pic_phone === undefined &&
      publicSample.notes === undefined &&
      publicSample.owner_user_id === undefined &&
      publicSample.reviewed_by === undefined,
      '9.1 PII Protection (AUD-015): Sensitive columns (pic_phone, notes, owner_user_id, reviewed_by) strictly stripped for public'
    );
    assert(
      publicSample && publicSample.business_name === 'PT Mitra Unggulan Terverifikasi' && publicSample.suggested_slug === approvedSlug,
      '9.2 Public Data: Safe public fields (business_name, suggested_slug, city) preserved'
    );

    // 10. Test Unauthorized Access to Pending Applications (AUD-015)
    const unauthPendingRes = await safeFetch(`${baseUrl}/api/local/partner/applications?status=pending`);
    assert(unauthPendingRes.status === 401, '10. Security (AUD-015): Unauthenticated access to pending applications blocked with 401');

    // 11. Test Admin Access to Applications (AUD-016)
    const adminAppsRes = await safeFetch(`${baseUrl}/api/local/partner/applications?status=all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminAppsJson = await adminAppsRes.json();
    assert(adminAppsRes.status === 200, '11. Admin Access: Authenticated admin can query all applications');
    const adminSample = adminAppsJson.rows?.find((r) => r.id === approvedAppId);
    assert(
      adminSample && adminSample.pic_phone === '081987654321' && adminSample.notes === 'Catatan sangat pribadi',
      '11.1 Admin Data: Admin can see full applicant contact details & notes'
    );

    // 12. Test Status Update via PATCH (AUD-016)
    const unauthPatchRes = await safeFetch(`${baseUrl}/api/local/partner/applications`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: appId, status: 'approved' }),
    });
    assert(unauthPatchRes.status === 401, '12. Security (AUD-016): Unauthenticated PATCH blocked with 401');

    const adminPatchRes = await safeFetch(`${baseUrl}/api/local/partner/applications`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        id: appId,
        status: 'approved',
        reason: 'Verifikasi kelayakan berkas mitra selesai.',
      }),
    });
    const patchJson = await adminPatchRes.json();
    assert(adminPatchRes.status === 200 && patchJson.ok, '12.1 Status Update (AUD-016): Admin successfully approves application');

    // Verify in database
    const updatedAppRow = queryOne('SELECT status, reviewed_by, reviewed_at FROM partner_applications WHERE id = ?', [appId]);
    assert(
      updatedAppRow && updatedAppRow.status === 'approved' && Boolean(updatedAppRow.reviewed_at),
      '12.2 Database (AUD-016): Application status=approved and reviewed_at timestamp recorded'
    );

    // Verify audit log entry
    const auditLogRow = queryOne(
      "SELECT * FROM audit_logs WHERE target_type = 'partner_application' AND target_id = ? ORDER BY created_at DESC LIMIT 1",
      [appId]
    );
    assert(
      auditLogRow && auditLogRow.action === 'partner_application.approved',
      '12.3 Audit Log (AUD-016): Admin action partner_application.approved persisted in audit_logs'
    );

    // 13. Test Mobile Device Spoofing Guard (AUD-021)
    const spoofDeviceId = `device-spoof-${Date.now()}`;
    const spoofDeviceRes = await safeFetch(`${baseUrl}/api/mobile/device`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: spoofDeviceId,
        platform: 'android',
        user_id: 'victim-superadmin-id', // unauthenticated spoofing attempt
      }),
    });
    assert(spoofDeviceRes.status === 200, '13. Mobile: Device registration endpoint responds 200');
    const deviceRow = queryOne('SELECT user_id FROM user_devices WHERE device_id = ?', [spoofDeviceId]);
    assert(
      deviceRow && (deviceRow.user_id === null || deviceRow.user_id !== 'victim-superadmin-id'),
      '13.1 Security (AUD-021): Unauthenticated device registration strips claimed user_id (spoofing prevented)'
    );

    // 14. Test CSP in index.html (AUD-019)
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const hasWorkerSrc = indexHtml.includes("worker-src 'self' blob: https://cdnjs.cloudflare.com;");
    assert(hasWorkerSrc, '14. Security (AUD-019): CSP header in index.html includes worker-src for PDF.js workers');

    if (failureCount > 0) {
      throw new Error(`${failureCount} test assertion(s) failed!`);
    }

    console.log('====================================================');
    console.log('🎉 ALL PARTNER, PII & MOBILE AUDIT TESTS PASSED 100%! 🎉');
    console.log('====================================================');
  } finally {
    // Clean up test data
    execute("DELETE FROM partner_applications WHERE suggested_slug LIKE 'test-branch-%'");
    await server.close();
    console.log('Test Vite server closed.');
  }
}

runPartnerTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test run failed:', err);
    process.exit(1);
  });
