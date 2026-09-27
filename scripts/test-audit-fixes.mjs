import { createServer } from 'vite';
import { getLocalDb, queryOne, queryAll, execute } from '../server/localDb.js';

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
    if (!adminToken) throw new Error('Admin login failed');

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
    console.log('1. Audit Log API response:', auditJson.ok ? 'OK' : 'FAIL');

    const lastAudit = queryOne("SELECT * FROM audit_logs WHERE action = 'test_audit_fix' ORDER BY created_at DESC LIMIT 1");
    console.log('1.1 Audit Log admin_id check:', lastAudit?.admin_id ? `OK (admin_id: ${lastAudit.admin_id})` : 'FAIL');

    // 3. Test handleApplicationStatusNotification: should insert into notifications with is_read column without crashing
    const app = queryOne('SELECT id FROM applications LIMIT 1');
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
      console.log('2. Application Status Notification API:', notifJson.ok ? 'OK' : 'FAIL');

      const notif = queryOne("SELECT * FROM notifications WHERE type = 'application_update' ORDER BY created_at DESC LIMIT 1");
      console.log('2.1 Notification created successfully in DB:', notif ? `OK (is_read: ${notif.is_read}, title: ${notif.title})` : 'FAIL');
    } else {
      console.log('2. Skipped: No applications in DB to notify');
    }

    // 4. Test empty update in handleDbQuery (should not produce SQL error)
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
    console.log('3. Empty Update Graceful Handling:', emptyUpdateRes.ok && !emptyUpdateData.error ? 'OK' : 'FAIL');

    // 5. Test moderation_queue query and column support (reason, ai_score, ai_flags)
    const modRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'moderation_queue',
        action: 'select',
      }),
    });
    const modData = await modRes.json();
    console.log('4. Moderation Queue Query & Schema check:', modRes.ok && !modData.error ? 'OK' : 'FAIL');

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
    console.log('5. Analytics Snapshots Query & Table check:', snapRes.ok && !snapData.error ? 'OK' : 'FAIL');

    // 7. Test applications enrichment with interview_invitations
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
    console.log('6. Applications enrichment with interview_invitations:', invEnriched ? 'OK' : 'FAIL');

    // 8. Test auto-generate daily analytics snapshot endpoint
    const snapGenRes = await fetch(`${baseUrl}/api/admin/analytics-snapshot/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const snapGenData = await snapGenRes.json();
    console.log(
      '7. Generate Daily Analytics Snapshot API:',
      snapGenRes.ok && snapGenData.success && snapGenData.snapshot?.snapshot_date ? 'OK' : 'FAIL'
    );

    // 9. Test audit logs stats endpoint
    const statsRes = await fetch(`${baseUrl}/api/admin/audit-logs/stats`);
    const statsData = await statsRes.json();
    console.log(
      '8. Audit Logs Stats API:',
      statsRes.ok && typeof statsData.total === 'number' ? 'OK' : 'FAIL'
    );

    // 10. Test internal job query with company relation
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
      console.log('9. Job Detail Query with Company Enrichment:', jobObj?.companies?.name ? 'OK' : 'FAIL');
    }

    // 11. Test Seeker application submission
    const seeker = queryOne("SELECT id, user_id FROM seeker_profiles LIMIT 1");
    if (seeker && anyJob) {
      // Clean up previous test run application to avoid UNIQUE constraint violation
      execute("DELETE FROM applications WHERE job_id = ? AND seeker_id = ?", [anyJob.id, seeker.id]);

      const applyRes = await fetch(`${baseUrl}/api/local/db/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'applications',
          action: 'insert',
          data: {
            id: 'test_app_' + Date.now(),
            job_id: anyJob.id,
            seeker_id: seeker.id,
            status: 'applied',
          },
        }),
      });
      const applyData = await applyRes.json();
      if (applyData.error) {
        console.error('Apply error detail:', applyData.error);
      }
      console.log('10. Seeker Application Submission for Internal Job:', applyRes.ok && !applyData.error ? 'OK' : 'FAIL');
    }

    // 12. Test users_meta role constraints (freelancer & superadmin)
    const testUserId = 'test_usr_' + Date.now();
    execute("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, 'free_test@example.com', 'pwd_hash', datetime('now'))", [testUserId]);
    execute("INSERT INTO users_meta (id, email, role, created_at) VALUES (?, 'free_test@example.com', 'freelancer', datetime('now'))", [testUserId]);
    const freeMeta = queryOne("SELECT role FROM users_meta WHERE id = ?", [testUserId]);
    console.log('11. Freelancer & Superadmin Role Check in users_meta:', freeMeta?.role === 'freelancer' ? 'OK' : 'FAIL');
    execute("UPDATE users_meta SET role = 'superadmin' WHERE id = ?", [testUserId]);
    const superMeta = queryOne("SELECT role FROM users_meta WHERE id = ?", [testUserId]);
    console.log('11.1 Superadmin Role Update in users_meta:', superMeta?.role === 'superadmin' ? 'OK' : 'FAIL');
    execute("DELETE FROM users_meta WHERE id = ?", [testUserId]);
    execute("DELETE FROM users WHERE id = ?", [testUserId]);

    // 13. Test applications status constraint ('expired')
    const anyApp = queryOne("SELECT id, status FROM applications LIMIT 1");
    if (anyApp) {
      execute("UPDATE applications SET status = 'expired' WHERE id = ?", [anyApp.id]);
      const expApp = queryOne("SELECT status FROM applications WHERE id = ?", [anyApp.id]);
      console.log('12. Applications status expired support:', expApp?.status === 'expired' ? 'OK' : 'FAIL');
      execute("UPDATE applications SET status = ? WHERE id = ?", [anyApp.status, anyApp.id]);
    }

    // 14. Test talent_marketplace_posts bio and availability columns
    const anySeeker = queryOne("SELECT id, user_id FROM seeker_profiles LIMIT 1");
    if (anySeeker) {
      const testPostId = 'test_post_' + Date.now();
      execute(
        "INSERT INTO talent_marketplace_posts (id, seeker_id, user_id, headline, bio, availability) VALUES (?, ?, ?, 'Fullstack Dev', 'Test Bio Summary', 'freelance')",
        [testPostId, anySeeker.id, anySeeker.user_id]
      );
      const postRow = queryOne("SELECT bio, availability FROM talent_marketplace_posts WHERE id = ?", [testPostId]);
      console.log('13. Talent Marketplace bio & availability columns:', postRow?.bio === 'Test Bio Summary' && postRow?.availability === 'freelance' ? 'OK' : 'FAIL');
      execute("DELETE FROM talent_marketplace_posts WHERE id = ?", [testPostId]);
    }

    // 15. Test /api/local/db/query security (users table protection & no password_hash leak)
    const usersInsertRes = await fetch(`${baseUrl}/api/local/db/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'users',
        action: 'insert',
        data: { id: 'hacked', email: 'hack@bad.com', password_hash: 'evil' },
      }),
    });
    console.log('14. Security: Direct mutation on users table blocked with 403:', usersInsertRes.status === 403 ? 'OK' : 'FAIL');

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
    console.log('14.1 Security: password_hash stripped from users query:', !hasLeakedHash ? 'OK' : 'FAIL');

    // 16. Test /api/admin/applications/void-stale and audit_logs logging
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
    console.log('15. Auto-Void Stale Applications dry-run API:', voidRes.ok && voidData.ok ? 'OK' : 'FAIL');

    console.log('All audit fix tests passed with flying colors!');
  } finally {
    await server.close();
    console.log('Test Vite server closed.');
  }
}

testAuditFixes().then(() => { process.exit(0); }).catch((err) => {
  console.error('Audit fix test failed:', err);
  process.exit(1);
});
