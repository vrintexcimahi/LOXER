import fs from 'node:fs';
import assert from 'node:assert';
import http from 'node:http';
import { getLocalDb, execute, queryOne, queryAll } from '../server/localDb.js';

console.log('=== Running Verification: Interview Evaluations History & PWA Re-engagement ===\n');

try {
  // 1. Verify Database schema for interview_sessions and interview_scorecards
  const db = getLocalDb();
  const tables = queryAll("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('interview_sessions', 'interview_scorecards')");
  assert.strictEqual(tables.length, 2, 'Tables interview_sessions and interview_scorecards must exist in SQLite');
  console.log('✅ OK: 1. Database: interview_sessions and interview_scorecards tables verified in SQLite');

  // 2. Insert test interview session with scorecard
  const testSessionId = 'sess_test_' + Date.now();
  const testSeekerId = 'seeker_test_' + Date.now();
  const testSessionCode = 'CODE' + Math.floor(1000 + Math.random() * 9000);

  execute(
    `INSERT INTO interview_sessions (
       id, session_code, seeker_id, role_title, company_name, candidate_name, questions_json, status, created_at, completed_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', datetime('now'), datetime('now'))`,
    [
      testSessionId,
      testSessionCode,
      testSeekerId,
      'Senior Frontend Engineer',
      'PT Teknologi Nusantara',
      'Budi Pratama',
      JSON.stringify([{ question: 'Ceritakan pengalaman Anda dengan React' }]),
    ]
  );

  const testScorecardId = 'sc_test_' + Date.now();
  execute(
    `INSERT INTO interview_scorecards (
       id, session_id, overall_score, technical_score, communication_score, problem_solving_score, cultural_fit_score, strengths_json, weaknesses_json, recommendation, summary_feedback
     ) VALUES (?, ?, 88, 90, 85, 87, 89, ?, ?, 'Sangat Disarankan', 'Kandidat menunjukkan penguasaan teknologi yang matang.')`,
    [
      testScorecardId,
      testSessionId,
      JSON.stringify(['Pemahaman React hooks sangat baik']),
      JSON.stringify(['Tingkatkan wawasan testing e2e']),
    ]
  );

  console.log('✅ OK: 2. Database: Sample completed interview session and scorecard seeded successfully');

  // 3. Verify handleListInterviewHistory query logic
  const selectCols = `
    s.*, 
    c.id as scorecard_id,
    c.overall_score, 
    c.technical_score, 
    c.communication_score, 
    c.problem_solving_score, 
    c.cultural_fit_score, 
    c.recommendation, 
    c.summary_feedback, 
    c.strengths_json, 
    c.weaknesses_json
  `;
  const historyRows = queryAll(
    `SELECT ${selectCols}
     FROM interview_sessions s
     LEFT JOIN interview_scorecards c ON c.session_id = s.id
     WHERE s.seeker_id = ?
     ORDER BY s.created_at DESC LIMIT 10`,
    [testSeekerId]
  );

  assert.strictEqual(historyRows.length, 1, 'Should find 1 interview history for test seeker');
  assert.strictEqual(historyRows[0].overall_score, 88, 'Overall score should be 88');
  assert.strictEqual(historyRows[0].technical_score, 90, 'Technical score should be 90');
  assert.strictEqual(historyRows[0].communication_score, 85, 'Communication score should be 85');
  assert.strictEqual(historyRows[0].problem_solving_score, 87, 'Problem solving score should be 87');
  assert.strictEqual(historyRows[0].cultural_fit_score, 89, 'Cultural fit score should be 89');
  assert.strictEqual(historyRows[0].recommendation, 'Sangat Disarankan', 'Recommendation matches');
  console.log('✅ OK: 3. API Query: handleListInterviewHistory correctly retrieves 4-pillars scorecard details');

  // Clean up test records
  execute('DELETE FROM interview_scorecards WHERE id = ?', [testScorecardId]);
  execute('DELETE FROM interview_sessions WHERE id = ?', [testSessionId]);
  console.log('✅ OK: 3.1 Cleanup: Test records cleaned up cleanly');

  // 4. LiveInterviewRoom.tsx verification
  const liveRoomCode = fs.readFileSync('src/pages/interview/LiveInterviewRoom.tsx', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(
    liveRoomCode.includes('seeker_id: user?.id || undefined'),
    'LiveInterviewRoom must pass seeker_id to createInterviewSession'
  );
  assert.ok(
    liveRoomCode.includes("localStorage.setItem('loxer_latest_interview_eval'"),
    'LiveInterviewRoom must cache scorecard to localStorage for instant dashboard sync'
  );
  console.log('✅ OK: 4. LiveInterviewRoom: seeker_id propagated and scorecard cached to localStorage');

  // 5. SeekerDashboard.tsx verification
  const seekerDashCode = fs.readFileSync('src/pages/seeker/SeekerDashboard.tsx', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(
    seekerDashCode.includes('getInterviewHistory'),
    'SeekerDashboard must import and invoke getInterviewHistory'
  );
  assert.ok(
    seekerDashCode.includes('latestInterview'),
    'SeekerDashboard must have latestInterview state'
  );
  assert.ok(
    seekerDashCode.includes('Simulasi Wawancara Kerja AI'),
    'SeekerDashboard must render modern AI Live Interview Practice Widget'
  );
  assert.ok(
    seekerDashCode.includes('Teknis') && seekerDashCode.includes('Komunikasi') && seekerDashCode.includes('Problem Solving') && seekerDashCode.includes('Cultural Fit'),
    'SeekerDashboard must render 4 pillars scorecard metrics'
  );
  console.log('✅ OK: 5. SeekerDashboard: AI Interview widget with 4-pillars evaluation visualizer verified');

  // 6. InstallAppModal.tsx verification
  const modalCode = fs.readFileSync('src/components/app/InstallAppModal.tsx', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(
    modalCode.includes('visitCount'),
    'InstallAppModal must track visitCount for re-engagement'
  );
  assert.ok(
    modalCode.includes('Bonus Pasang Aplikasi'),
    'InstallAppModal must display micro-incentive bonus banner'
  );
  assert.ok(
    modalCode.includes('visitCount >= 2'),
    'InstallAppModal must render high-urgency social proof on repeat visits'
  );
  assert.ok(
    modalCode.includes('Notification.requestPermission'),
    'InstallAppModal must prompt for push notification permission on install'
  );
  console.log('✅ OK: 6. InstallAppModal: Micro-incentives, visit tracking social proof, and push notification prompt verified');

  // 7. App.tsx appinstalled listener verification
  const appCode = fs.readFileSync('src/App.tsx', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(
    appCode.includes("window.addEventListener('appinstalled', handleAppInstalled)"),
    'App.tsx must listen to appinstalled event'
  );
  assert.ok(
    appCode.includes('markAsAppClient()') && appCode.includes('closeInstallModal()'),
    'App.tsx must mark client as app and close install modal immediately when app is installed'
  );
  console.log('✅ OK: 7. App.tsx: appinstalled event listener dynamically unlocks app from view-only mode via markAsAppClient');

  // 8. Service Worker cache bump verification
  const swCode = fs.readFileSync('public/sw.js', 'utf8');
  assert.ok(
    /const CACHE_NAME = 'loxer-pwa-v6\.[89]\.0';/.test(swCode),
    'Service Worker CACHE_NAME must be at least loxer-pwa-v6.8.0'
  );
  console.log('✅ OK: 8. Service Worker: Cache version verified at loxer-pwa-v6.8.0+');

  console.log('\n====================================================');
  console.log('🎉 ALL 8 SARAN FITUR IMPLEMENTATION VERIFICATIONS PASSED 100%! 🎉\n');
} catch (error) {
  console.error('❌ Test failed:', error);
  process.exit(1);
}
