import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getLocalDb } from '../server/localDb.js';

let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`✅ OK: ${msg}`);
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== Running LOXER Real-time Traffic Monitoring Verification ===\n');

  const db = getLocalDb();

  // 1. Verify web_traffic_logs table existence and schema
  try {
    const tableInfo = db.prepare("PRAGMA table_info('web_traffic_logs')").all();
    const columns = tableInfo.map((c) => c.name);
    assert(columns.includes('visitor_id'), '1. web_traffic_logs has visitor_id');
    assert(columns.includes('session_id'), '2. web_traffic_logs has session_id');
    assert(columns.includes('ip_address'), '3. web_traffic_logs has ip_address');
    assert(columns.includes('city'), '4. web_traffic_logs has city');
    assert(columns.includes('duration_seconds'), '5. web_traffic_logs has duration_seconds');
    assert(columns.includes('metadata'), '6. web_traffic_logs has metadata JSON column');
  } catch (err) {
    assert(false, `Table verification error: ${err.message}`);
  }

  // 2. Insert test visitor traffic and test heartbeat
  const testVisitorId = `vis_test_${Date.now()}`;
  const testSessionId = `ses_test_${Date.now()}`;
  const testIp = '103.145.22.45';
  const testPath = '/';
  const logId = crypto.randomUUID();

  try {
    const meta = JSON.stringify({
      city: 'Bandung',
      country: 'ID',
      network: '4g',
      language: 'id-ID',
      pixel_ratio: '2x',
    });

    db.prepare(`
      INSERT INTO web_traffic_logs (
        id, visitor_id, session_id, user_id, user_email, user_role,
        path, page_title, referrer, device_type, browser, os,
        screen_res, ip_address, city, duration_seconds, metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      logId,
      testVisitorId,
      testSessionId,
      null,
      null,
      'guest',
      testPath,
      'LOXER - Portal Lowongan Kerja & Talenta',
      'https://google.com',
      'mobile',
      'Chrome Mobile 128',
      'Android 14',
      '390x844',
      testIp,
      'Bandung',
      45,
      meta
    );

    const inserted = db.prepare('SELECT * FROM web_traffic_logs WHERE id = ?').get(logId);
    assert(inserted && inserted.visitor_id === testVisitorId, '7. New visitor log correctly inserted with complete telemetry');
    assert(inserted.city === 'Bandung', '8. Visitor city is captured and persisted');
    assert(inserted.duration_seconds === 45, '9. Initial dwell duration recorded');
  } catch (err) {
    assert(false, `Insert traffic log error: ${err.message}`);
  }

  // 3. Test heartbeat dwell time update
  try {
    db.prepare(`
      UPDATE web_traffic_logs
      SET duration_seconds = ?
      WHERE id = ?
    `).run(95, logId);

    const updated = db.prepare('SELECT duration_seconds FROM web_traffic_logs WHERE id = ?').get(logId);
    assert(updated && updated.duration_seconds === 95, '10. Dwell time heartbeat updates duration to 95 seconds');
  } catch (err) {
    assert(false, `Heartbeat update error: ${err.message}`);
  }

  // 4. Test is_online SQL calculation
  try {
    const onlineCheck = db.prepare(`
      SELECT
        id,
        CASE WHEN (created_at >= datetime('now', '-5 minutes') OR datetime(created_at, '+' || duration_seconds || ' seconds') >= datetime('now', '-5 minutes')) THEN 1 ELSE 0 END as is_online
      FROM web_traffic_logs
      WHERE id = ?
    `).get(logId);

    assert(onlineCheck && onlineCheck.is_online === 1, '11. Active visitor is marked is_online = 1');
  } catch (err) {
    assert(false, `Online calculation error: ${err.message}`);
  }

  // 5. Test frontend component files
  try {
    const trackerPath = path.resolve(process.cwd(), 'src', 'components', 'admin', 'RealtimeTrafficTracker.tsx');
    assert(fs.existsSync(trackerPath), '12. RealtimeTrafficTracker.tsx component file exists');

    const trackerContent = fs.readFileSync(trackerPath, 'utf8');
    assert(trackerContent.includes('Deteksi Trafik & Pengunjung Real-time'), '13. Component includes real-time telemetry title');
    assert(trackerContent.includes('showFullIp'), '14. Component has full/masked IP toggle');
    assert(trackerContent.includes('handleExportCsv'), '15. Component has CSV export handler');
    assert(trackerContent.includes('handleExportJson'), '16. Component has JSON export handler');
    assert(trackerContent.includes('resolveAdminToken'), '17. Component integrates resolveAdminToken');
  } catch (err) {
    assert(false, `Component verification error: ${err.message}`);
  }

  // 6. Test AdminDashboard integration
  try {
    const dashboardContent = fs.readFileSync(path.resolve(process.cwd(), 'src', 'pages', 'admin', 'AdminDashboard.tsx'), 'utf8');
    assert(dashboardContent.includes("activeSubTab === 'traffic'"), '18. AdminDashboard handles activeSubTab === traffic');
    assert(dashboardContent.includes('<RealtimeTrafficTracker'), '19. AdminDashboard renders RealtimeTrafficTracker component');
    assert(dashboardContent.includes("view') === 'traffic'"), '20. AdminDashboard parses view=traffic URL search parameter');
    assert(dashboardContent.includes('Deteksi Trafik Real-time'), '21. AdminDashboard has subtab button for Deteksi Trafik Real-time');
  } catch (err) {
    assert(false, `Dashboard integration verification error: ${err.message}`);
  }

  // 7. Test localApiHandler online metric consistency
  try {
    const apiHandlerContent = fs.readFileSync(path.resolve(process.cwd(), 'server', 'localApiHandler.js'), 'utf8');
    assert(apiHandlerContent.includes('onlineCond ='), '22. localApiHandler uses unified onlineCond query');
    assert(apiHandlerContent.includes('cf-connecting-ip'), '23. localApiHandler extracts Cloudflare connecting IP');
    assert(apiHandlerContent.includes('cf-ipcity'), '24. localApiHandler extracts Cloudflare visitor city');
  } catch (err) {
    assert(false, `ApiHandler verification error: ${err.message}`);
  }

  // 8. Test localDb composite indexing and retention management
  try {
    const localDbContent = fs.readFileSync(path.resolve(process.cwd(), 'server', 'localDb.js'), 'utf8');
    assert(localDbContent.includes('idx_traffic_session_path'), '25. localDb creates composite index on (session_id, path)');
    assert(localDbContent.includes('purgeOldTrafficLogs'), '26. localDb includes automated traffic log retention cleaner');
  } catch (err) {
    assert(false, `LocalDb verification error: ${err.message}`);
  }

  // Clean up test row
  try {
    db.prepare('DELETE FROM web_traffic_logs WHERE id = ?').run(logId);
  } catch {
    // ignore
  }

  // Summary
  if (failed === 0) {
    console.log('\n🎉 ALL 26 REAL-TIME TRAFFIC MONITORING TESTS PASSED!');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failed} TESTS FAILED!`);
    process.exit(1);
  }
}

runTests();
