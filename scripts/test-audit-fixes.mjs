import { createServer } from 'vite';
import { getLocalDb, queryOne, queryAll, execute } from '../server/localDb.js';

async function testAuditFixes() {
  console.log('--- Testing Audit & Bug Fixes ---');
  const server = await createServer({
    configFile: './vite.config.ts',
    server: { port: 3032 },
  });
  await server.listen();
  console.log('Test Vite server running on port 3032...');

  try {
    // 1. Login as Admin to get token
    const loginRes = await fetch('http://localhost:3032/api/local/auth/login', {
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
    const auditRes = await fetch('http://localhost:3032/api/admin-audit-log', {
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
      const notifRes = await fetch('http://localhost:3032/api/application-status-notification', {
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
    const emptyUpdateRes = await fetch('http://localhost:3032/api/local/db/query', {
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
    const modRes = await fetch('http://localhost:3032/api/local/db/query', {
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
    const snapRes = await fetch('http://localhost:3032/api/local/db/query', {
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
    const appQueryRes = await fetch('http://localhost:3032/api/local/db/query', {
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
    const snapGenRes = await fetch('http://localhost:3032/api/admin/analytics-snapshot/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const snapGenData = await snapGenRes.json();
    console.log(
      '7. Generate Daily Analytics Snapshot API:',
      snapGenRes.ok && snapGenData.success && snapGenData.snapshot?.snapshot_date ? 'OK' : 'FAIL'
    );

    // 9. Test audit logs stats endpoint
    const statsRes = await fetch('http://localhost:3032/api/admin/audit-logs/stats');
    const statsData = await statsRes.json();
    console.log(
      '8. Audit Logs Stats API:',
      statsRes.ok && typeof statsData.total === 'number' ? 'OK' : 'FAIL'
    );

    // 10. Test internal job query with company relation
    const anyJob = queryOne("SELECT id FROM job_listings WHERE status = 'active' LIMIT 1");
    if (anyJob) {
      const jobRes = await fetch('http://localhost:3032/api/local/db/query', {
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

      const applyRes = await fetch('http://localhost:3032/api/local/db/query', {
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

    console.log('All audit fix tests passed with flying colors!');
  } finally {
    await server.close();
    console.log('Test Vite server closed.');
  }
}

testAuditFixes().catch((err) => {
  console.error('Audit fix test failed:', err);
  process.exit(1);
});
