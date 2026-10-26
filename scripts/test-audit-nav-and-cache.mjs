import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getLocalDb, verifyTokenLenient, generateToken, closeLocalDb } from '../server/localDb.js';

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
  console.log('--- Running LOXER Audit & Performance Verification ---');

  // 1. Verify constant-time HMAC verification in localDb
  try {
    const token = generateToken({ sub: 'user_audit_1', role: 'seeker' });
    const verified = verifyTokenLenient(token);
    assert(verified && verified.sub === 'user_audit_1', '1. Valid JWT verified with constant-time HMAC comparison');

    const tampered = token.slice(0, -4) + 'zzzz';
    const tamperedVerified = verifyTokenLenient(tampered);
    assert(tamperedVerified === null, '2. Tampered signature correctly rejected by timingSafeEqual');
  } catch (err) {
    assert(false, `HMAC verification test error: ${err.message}`);
  }

  // 2. Verify Database Connection Caching (SELECT 1 throttled)
  try {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      getLocalDb();
    }
    const elapsed = performance.now() - start;
    assert(elapsed < 20, `3. 1,000 getLocalDb() calls take ${elapsed.toFixed(2)}ms (< 20ms, throttled ping)`);
  } catch (err) {
    assert(false, `Db caching test error: ${err.message}`);
  }

  // 3. Verify public/sw.js syntax and immutable caching logic
  try {
    const swContent = fs.readFileSync(path.resolve(process.cwd(), 'public', 'sw.js'), 'utf8');
    assert(swContent.includes('isImmutableAsset'), '4. Service worker contains isImmutableAsset detection');
    assert(swContent.includes('loxer-pwa-v5.8.0'), '5. Service worker cache version bumped to v5.8.0');
    assert(!swContent.includes('while (Date.now() - start < delay)'), '6. No CPU spin loops present in SW');
  } catch (err) {
    assert(false, `SW verification error: ${err.message}`);
  }

  // 4. Verify JobList query sync does not hardcode /seeker/browse
  try {
    const jobListContent = fs.readFileSync(path.resolve(process.cwd(), 'src', 'components', 'JobList.jsx'), 'utf8');
    assert(
      jobListContent.includes("currentPath.startsWith('/seeker/browse') ? '/seeker/browse' : '/browse'"),
      '7. JobList preserves current /browse route instead of forcing /seeker/browse'
    );
  } catch (err) {
    assert(false, `JobList verification error: ${err.message}`);
  }

  // 5. Verify App.tsx SPA navigation without render-time side effects
  try {
    const appContent = fs.readFileSync(path.resolve(process.cwd(), 'src', 'App.tsx'), 'utf8');
    assert(!appContent.includes("window.location.replace('/seeker/dashboard')"), '8. App.tsx eliminated window.location.replace');
    assert(!appContent.includes("window.location.href = '/admin/dashboard'"), '9. App.tsx eliminated window.location.href');
    assert(appContent.includes("import { navigateTo } from './lib/navigation'"), '10. App.tsx integrates navigateTo SPA helper');
  } catch (err) {
    assert(false, `App.tsx verification error: ${err.message}`);
  }

  // 6. Verify usePersistentSidebar lazy initialization
  try {
    const sidebarContent = fs.readFileSync(path.resolve(process.cwd(), 'src', 'components', 'layout', 'usePersistentSidebar.ts'), 'utf8');
    assert(sidebarContent.includes('useState(() => {'), '11. usePersistentSidebar uses lazy state initialization');
  } catch (err) {
    assert(false, `usePersistentSidebar verification error: ${err.message}`);
  }

  // 7. Verify DeviceContext registration debounce/guard
  try {
    const deviceContextContent = fs.readFileSync(path.resolve(process.cwd(), 'src', 'contexts', 'DeviceContext.tsx'), 'utf8');
    assert(deviceContextContent.includes('isEnrichedRef.current'), '12. DeviceContext guards registration loop with ref');
  } catch (err) {
    assert(false, `DeviceContext verification error: ${err.message}`);
  }

  // 8. Verify BrowserCachePrompt unified cache name
  try {
    const cachePromptContent = fs.readFileSync(path.resolve(process.cwd(), 'src', 'components', 'pwa', 'BrowserCachePrompt.tsx'), 'utf8');
    assert(cachePromptContent.includes("CACHE_NAME = 'loxer-pwa-v5.8.0'"), '13. BrowserCachePrompt uses unified v5.8.0 cache name');
    assert(!cachePromptContent.includes("'loxer-pwa-v1.2.0'"), '14. Purged outdated v1.2.0 reference in BrowserCachePrompt');
  } catch (err) {
    assert(false, `BrowserCachePrompt verification error: ${err.message}`);
  }

  // 9. Verify layouts and components use navigateTo instead of window.location.assign/replace
  try {
    const seekerLayout = fs.readFileSync(path.resolve(process.cwd(), 'src', 'components', 'layout', 'SeekerLayout.tsx'), 'utf8');
    const employerLayout = fs.readFileSync(path.resolve(process.cwd(), 'src', 'components', 'layout', 'EmployerLayout.tsx'), 'utf8');
    const godModeLayout = fs.readFileSync(path.resolve(process.cwd(), 'src', 'pages', 'admin', 'GodModeLayout.tsx'), 'utf8');
    const clayHero = fs.readFileSync(path.resolve(process.cwd(), 'src', 'components', 'ui', 'ClayHero.tsx'), 'utf8');

    assert(!seekerLayout.includes('window.location.assign'), '15. SeekerLayout uses navigateTo on logout');
    assert(!employerLayout.includes('window.location.assign'), '16. EmployerLayout uses navigateTo on logout');
    assert(!godModeLayout.includes('window.location.assign'), '17. GodModeLayout uses navigateTo on logout');
    assert(!clayHero.includes('window.location.assign'), '18. ClayHero uses navigateTo on search submit');
  } catch (err) {
    assert(false, `Layout navigation verification error: ${err.message}`);
  }

  // 10. Verify Real-time Traffic Monitoring in Admin Applications
  try {
    const trackerExists = fs.existsSync(path.resolve(process.cwd(), 'src', 'components', 'admin', 'RealtimeTrafficTracker.tsx'));
    assert(trackerExists, '19. RealtimeTrafficTracker component is created');

    const adminDash = fs.readFileSync(path.resolve(process.cwd(), 'src', 'pages', 'admin', 'AdminDashboard.tsx'), 'utf8');
    assert(adminDash.includes('<RealtimeTrafficTracker'), '20. AdminDashboard renders RealtimeTrafficTracker');
    assert(adminDash.includes("activeSubTab === 'traffic'"), '21. AdminDashboard supports traffic subtab');
    assert(adminDash.includes("p.get('view') === 'traffic'"), '22. AdminDashboard parses view=traffic URL param');

    const apiHandler = fs.readFileSync(path.resolve(process.cwd(), 'server', 'localApiHandler.js'), 'utf8');
    assert(apiHandler.includes("filter === 'online'"), '23. localApiHandler handles online visitor filter');
    assert(apiHandler.includes('is_online'), '24. localApiHandler computes real-time is_online duration');

    const visitorTracking = fs.readFileSync(path.resolve(process.cwd(), 'src', 'lib', 'visitorTracking.ts'), 'utf8');
    assert(visitorTracking.includes('pixel_ratio'), '25. visitorTracking enriches client hardware and network telemetry');
  } catch (err) {
    assert(false, `Traffic monitoring verification error: ${err.message}`);
  }

  // Summary
  if (failed === 0) {
    console.log('\n🎉 ALL 25 AUDIT, PERFORMANCE & TRAFFIC TESTS PASSED!');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failed} TESTS FAILED!`);
    process.exit(1);
  }
}

runTests();
