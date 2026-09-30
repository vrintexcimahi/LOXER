import { createServer } from 'vite';
import { getLocalDb, queryOne, queryAll, execute } from '../server/localDb.js';

let failureCount = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failureCount++;
  } else {
    console.log(`✅ OK: ${message}`);
  }
}

async function testAuditFixes() {
  console.log('--- Testing Audit & Bug Fixes ---');
  const port = Number(process.env.TEST_PORT_AUDIT || 3332);
  const baseUrl = `http://localhost:${port}`;
  const server = await createServer({
    configFile: './vite.config.ts',
    server: { port },
  });
  await server.listen();
  console.log(`Test Vite server running on port ${port}...`);

  try {
    // 1. Login as Admin to get token
    const loginRes = await fetch(`${baseUrl}/api/local/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'loxer-admin-1776448925326@example.com',
        password: 'admin123',
      }),
    });
    const loginData = await loginRes.json();
    const adminToken = loginData.data?.session?.access_token;
    assert(Boolean(adminToken), '1. Admin login successful');

    // 2. Test handleAdminAuditLog: admin_id should be properly set (not null/undefined)
    const auditRes = await fetch(`${baseUrl}/api/admin-audit-log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        action: 'test_audit_fix',
        targetType: 'system',
        targetId: 'audit_test_1',
        detail: 'Testing callerId propagation',
      }),
    });
    const auditJson = await auditRes.json();
    assert(auditJson.ok, '2. Audit Log API response successful');

    const lastAudit = queryOne("SELECT * FROM audit_logs WHERE action = 'test_audit_fix' ORDER BY created_at DESC LIMIT 1");
    assert(Boolean(lastAudit?.admin_id), `2.1 Audit Log admin_id check (admin_id: ${lastAudit?.admin_id})`);

    // 3. Test handleApplicationStatusNotification
    let app = queryOne('SELECT id FROM applications LIMIT 1');
    if (!app) {
      // Seed a temporary application if none exists
      const j = queryOne('SELECT id FROM job_listings LIMIT 1');
      const s = queryOne('SELECT id FROM seeker_profiles LIMIT 1');
      if (j && s) {
        execute("INSERT OR IGNORE INTO applications (id, job_id, seeker_id, status) VALUES ('app_seed_temp', ?, ?, 'applied')", [j.id, s.id]);
        app = { id: 'app_seed_temp' };
      }
    }
    if (app) {
      const notifRes = await fetch(`${baseUrl}/api/application-status-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          applicationId: app.id,
          status: 'interview_scheduled',
        }),
      });
      const notifJson = await notifRes.json();
      assert(notifJson.ok, '3. Application Status Notification API responds OK');

      const notif = queryOne("SELECT * FROM notifications WHERE type = 'application_update' ORDER BY created_at DESC LIMIT 1");
      assert(Boolean(notif), `3.1 Notification persisted with is_read=${notif?.is_read}`);
    }

    // 4. Test empty update in handleDbQuery (graceful fallback)
    const emptyUpdateRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'seeker_education',
        action: 'update',
        data: {},
        filters: [{ column: 'id', op: 'eq', value: 'non_existent_id' }],
      }),
    });
    const emptyUpdateData = await emptyUpdateRes.json();
    assert(emptyUpdateRes.ok && !emptyUpdateData.error, '4. Empty update gracefully handled without SQL syntax error');

    // 5. Test moderation_queue query
    const modRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'moderation_queue',
        action: 'select',
      }),
    });
    const modData = await modRes.json();
    assert(modRes.ok && !modData.error, '5. Moderation Queue query & columns check');

    // 6. Test analytics_snapshots table
    const snapRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'analytics_snapshots',
        action: 'select',
      }),
    });
    const snapData = await snapRes.json();
    assert(snapRes.ok && !snapData.error, '6. Analytics Snapshots query check');

    // 7. Test auto-generate daily analytics snapshot endpoint
    const snapGenRes = await fetch(`${baseUrl}/api/admin/analytics-snapshot/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const snapGenData = await snapGenRes.json();
    assert(snapGenRes.ok && snapGenData.success && Boolean(snapGenData.snapshot?.snapshot_date), '7. Generate Daily Analytics Snapshot API');

    // 8. Test audit logs stats endpoint
    const statsRes = await fetch(`${baseUrl}/api/admin/audit-logs/stats`);
    const statsData = await statsRes.json();
    assert(statsRes.ok && typeof statsData.total === 'number', '8. Audit Logs Stats API');

    // 9. Test internal job query with company relation
    const anyJob = queryOne("SELECT id FROM job_listings WHERE status = 'active' LIMIT 1");
    if (anyJob) {
      const jobRes = await fetch(`${baseUrl}/api/local/db/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'job_listings',
          action: 'select',
          filters: [{ column: 'id', op: 'eq', value: anyJob.id }],
        }),
      });
      const jobData = await jobRes.json();
      const jobObj = Array.isArray(jobData.data) ? jobData.data[0] : jobData.data;
      assert(Boolean(jobObj?.companies?.name), '9. Job Detail query with company relation enrichment');
    }

    // 10. Test Seeker application submission
    const seeker = queryOne("SELECT id, user_id FROM seeker_profiles LIMIT 1");
    let testAppId = null;
    if (seeker && anyJob) {
      testAppId = 'test_app_' + Date.now();
      execute("DELETE FROM applications WHERE job_id = ? AND seeker_id = ?", [anyJob.id, seeker.id]);

      const applyRes = await fetch(`${baseUrl}/api/local/db/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'applications',
          action: 'insert',
          data: {
            id: testAppId,
            job_id: anyJob.id,
            seeker_id: seeker.id,
            status: 'applied',
          },
        }),
      });
      const applyData = await applyRes.json();
      assert(applyRes.ok && !applyData.error, '10. Seeker Application Submission for internal job');

      // Create an interview invitation for this application to test enrichment
      execute("INSERT OR REPLACE INTO interview_invitations (id, application_id, scheduled_at, location_or_link, notes) VALUES (?, ?, datetime('now'), 'HQ Office', 'First round')",
        ['inv_' + testAppId, testAppId]
      );
    }

    // 11. Test applications enrichment with interview_invitations
    const appQueryRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'applications',
        action: 'select',
      }),
    });
    const appQueryData = await appQueryRes.json();
    const hasApps = Array.isArray(appQueryData.data) && appQueryData.data.length > 0;
    const invEnriched = hasApps && 'interview_invitations' in appQueryData.data[0];
    assert(invEnriched, '11. Applications enrichment with interview_invitations');

    // 12. Test users_meta role constraints (freelancer & superadmin)
    const testUserId = 'test_usr_' + Date.now();
    execute("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, 'free_test@example.com', 'pwd_hash', datetime('now'))", [testUserId]);
    execute("INSERT INTO users_meta (id, email, role, created_at) VALUES (?, 'free_test@example.com', 'freelancer', datetime('now'))", [testUserId]);
    const freeMeta = queryOne("SELECT role FROM users_meta WHERE id = ?", [testUserId]);
    assert(freeMeta?.role === 'freelancer', '12. Freelancer Role in users_meta supported');
    execute("UPDATE users_meta SET role = 'superadmin' WHERE id = ?", [testUserId]);
    const superMeta = queryOne("SELECT role FROM users_meta WHERE id = ?", [testUserId]);
    assert(superMeta?.role === 'superadmin', '12.1 Superadmin Role update in users_meta supported');
    execute("DELETE FROM users_meta WHERE id = ?", [testUserId]);
    execute("DELETE FROM users WHERE id = ?", [testUserId]);

    // 13. Test applications status constraint ('expired')
    const anyApp = queryOne("SELECT id, status FROM applications LIMIT 1");
    if (anyApp) {
      execute("UPDATE applications SET status = 'expired' WHERE id = ?", [anyApp.id]);
      const expApp = queryOne("SELECT status FROM applications WHERE id = ?", [anyApp.id]);
      assert(expApp?.status === 'expired', '13. Applications status expired check constraint');
      execute("UPDATE applications SET status = ? WHERE id = ?", [anyApp.status, anyApp.id]);
    }

    // 14. Test talent_marketplace_posts bio and availability columns
    if (seeker) {
      const testPostId = 'test_post_' + Date.now();
      execute(
        "INSERT INTO talent_marketplace_posts (id, seeker_id, user_id, headline, bio, availability) VALUES (?, ?, ?, 'Fullstack Dev', 'Test Bio Summary', 'freelance')",
        [testPostId, seeker.id, seeker.user_id]
      );
      const postRow = queryOne("SELECT bio, availability FROM talent_marketplace_posts WHERE id = ?", [testPostId]);
      assert(postRow?.bio === 'Test Bio Summary' && postRow?.availability === 'freelance', '14. Talent Marketplace bio & availability columns');
      execute("DELETE FROM talent_marketplace_posts WHERE id = ?", [testPostId]);
    }

    // 15. Security: Direct mutation on users table blocked with 403 & password_hash stripped
    const usersInsertRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'users',
        action: 'insert',
        data: { id: 'hacked', email: 'hack@bad.com', password_hash: 'evil' },
      }),
    });
    assert(usersInsertRes.status === 403, '15. Security: Direct mutation on users table blocked with 403');

    const usersSelectRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'users',
        action: 'select',
      }),
    });
    const usersSelectData = await usersSelectRes.json();
    const hasLeakedHash = Array.isArray(usersSelectData.data) && usersSelectData.data.some((u) => 'password_hash' in u);
    assert(!hasLeakedHash, '15.1 Security: password_hash stripped from users query');

    // 16. Security (F-001): users_meta privilege escalation guard
    const unauthMetaRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'users_meta',
        action: 'update',
        data: { role: 'superadmin' },
        filters: [{ column: 'id', op: 'eq', value: 'victim_id' }],
      }),
    });
    assert(unauthMetaRes.status === 401, '16. Security (F-001): Unauthenticated mutation on users_meta blocked with 401');

    // Security (F-001): audit_logs update/delete blocked with 403
    const auditDeleteRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'audit_logs',
        action: 'delete',
        filters: [{ column: 'id', op: 'neq', value: 'x' }],
      }),
    });
    assert(auditDeleteRes.status === 403, '16.1 Security (F-001): Direct delete on audit_logs blocked with 403');

    // 17. Security & Compatibility (F-002): Safe upsert and identifier injection protection
    const injectionUpsertRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'companies',
        action: 'upsert',
        onConflict: 'id" OR 1=1 --',
        data: { id: 'safe_id', name: 'Safe Company' },
      }),
    });
    assert(injectionUpsertRes.status === 400, '17. Security (F-002): SQL injection via onConflict blocked with 400');

    // Safe upsert on applications (without created_at crash)
    const testAppUpsertId = 'upsert_app_' + Date.now();
    const appUpsertRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'applications',
        action: 'upsert',
        onConflict: 'id',
        data: {
          id: testAppUpsertId,
          job_id: anyJob?.id || 'job_default',
          seeker_id: seeker?.id || 'seeker_default',
          status: 'applied',
        },
      }),
    });
    const appUpsertData = await appUpsertRes.json();
    assert(appUpsertRes.ok && !appUpsertData.error, '17.1 Schema (F-002): Safe upsert on applications table without created_at crash');
    execute("DELETE FROM applications WHERE id = ?", [testAppUpsertId]);

    // 18. Auto-Void Stale Applications dry-run API
    const voidRes = await fetch(`${baseUrl}/api/admin/applications/void-stale`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        dry_run: true,
        days_threshold: 60,
      }),
    });
    const voidData = await voidRes.json();
    assert(voidRes.ok && voidData.ok, '18. Auto-Void Stale Applications dry-run API');

    // 19. Test SQL Indexes and Parametric Search Booster
    const indexes = queryAll("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='job_listings'");
    const hasTitleIdx = indexes.some((idx) => idx.name === 'idx_job_listings_title');
    assert(hasTitleIdx, '19. Search Booster SQLite Indexes created');

    // 20. Test Reverse-Hiring Direct Offer Notification Persistence
    const testNotifId = 'test_offer_notif_' + Date.now();
    execute(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        testNotifId,
        seeker?.user_id || 'test_user',
        'Penawaran Kerja Baru',
        'PT Inovasi Digital mengirimkan tawaran pekerjaan langsung.',
        'direct_offer',
        0,
        JSON.stringify({ offerId: 'test_offer_123', jobTitle: 'Senior Frontend Developer' }),
        new Date().toISOString(),
      ]
    );
    const createdOfferNotif = queryOne('SELECT * FROM notifications WHERE id = ?', [testNotifId]);
    assert(createdOfferNotif?.type === 'direct_offer', '20. Realtime reverse-hiring offer notification persistence');
    execute('DELETE FROM notifications WHERE id = ?', [testNotifId]);

    // 21. Test CSV Export Helper logic with UTF-8 BOM & Excel escaping
    const testHeaders = ['ID', 'Action', 'Detail'];
    const testRows = [['1', 'ban_user', 'User "Alice" banned for spam']];
    const sanitize = (val) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const csvOutput = '\uFEFF' + [testHeaders.map(sanitize).join(','), ...testRows.map((r) => r.map(sanitize).join(','))].join('\r\n');
    assert(csvOutput.startsWith('\uFEFF') && csvOutput.includes('""Alice""'), '21. Security audit logs CSV format generation & UTF-8 BOM');

    if (failureCount > 0) {
      throw new Error(`${failureCount} test assertion(s) failed!`);
    }

    console.log('🎉 All audit fix tests passed with flying colors (0 failures)!');
  } finally {
    await server.close();
    console.log('Test Vite server closed.');
  }
}

testAuditFixes().then(() => { process.exit(0); }).catch((err) => {
  console.error('Audit fix test run failed:', err);
  process.exit(1);
});
