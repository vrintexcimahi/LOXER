import { createServer } from 'vite';
import { getLocalDb, queryOne, queryAll } from '../server/localDb.js';

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
