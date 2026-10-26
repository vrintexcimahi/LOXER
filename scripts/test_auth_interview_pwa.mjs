import fs from 'node:fs';
import path from 'node:path';

let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`✅ OK: ${msg}`);
  } else {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
  }
}

console.log('=== Running Verification: Auth Interview Protection & Public View-Only PWA Popup ===\n');

// 1. Verify AuthContext does not treat ?role=... as previewRole / session spoofing
const authContextContent = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');
assert(
  !authContextContent.includes("searchParams?.get('role')"),
  '1. AuthContext: Generic ?role= parameter removed from previewRole resolution (prevents fake login spoofing)'
);
assert(
  authContextContent.includes("['admin', 'employer', 'seeker', 'freelancer', 'jasa'].includes(rawPreviewRole)"),
  '1.1 AuthContext: previewRole strictly whitelisted to official developer simulator roles'
);

// 2. Verify App.tsx previewRole resolution
const appContent = fs.readFileSync('src/App.tsx', 'utf8');
assert(
  !appContent.includes("searchParams?.get('role') || simRole"),
  '2. App.tsx: Generic ?role= parameter removed from previewRole resolution'
);

// 3. Verify useAdminEasterEgg does not accept generic role=admin query parameter
const easterEggContent = fs.readFileSync('src/hooks/useAdminEasterEgg.ts', 'utf8');
assert(
  !easterEggContent.includes("params.get('role') === 'admin'"),
  '3. useAdminEasterEgg: Generic ?role=admin URL bypass removed'
);

// 4. Verify appAccessService detectIsSuperAdminBypass closes pathname backdoor
const appAccessContent = fs.readFileSync('src/lib/appAccessService.ts', 'utf8');
assert(
  !appAccessContent.includes("pathname === '/admin-secret' || pathname === '/secret-admin'"),
  '4. appAccessService: Unauthenticated pathname bypass (/admin-secret) removed from detectIsSuperAdminBypass'
);

// 5. Verify App.tsx interview route protection
assert(
  appContent.includes("const isInterviewPath =") &&
  appContent.includes("isInterviewPath && (!user || (isViewOnlyWeb && !isSuperAdmin))"),
  '5. App.tsx: Route guard blocks unauthenticated and view-only web users from /interview'
);
assert(
  appContent.includes("navigateTo('/browse', true)") &&
  appContent.includes("openInstallModal('Akses Fitur Live Interview AI')"),
  '5.1 App.tsx: Unauthorized interview navigation safely redirects to /browse and triggers PWA install modal'
);

// 6. Verify App.tsx mandatory public pages PWA install modal triggering
assert(
  appContent.includes("const isPublicPage =") &&
  appContent.includes("openInstallModal(contextualAction)"),
  '6. App.tsx: Mandatory PWA popup trigger registered for all public pages (/, /browse, /talents, /cv)'
);

// 7. Verify LiveInterviewRoom.tsx has auth barrier & view-only web barrier
const liveInterviewContent = fs.readFileSync('src/pages/interview/LiveInterviewRoom.tsx', 'utf8').replace(/\r\n/g, '\n');
assert(
  liveInterviewContent.includes("import { useAuth } from '../../contexts/useAuth';") &&
  liveInterviewContent.includes("import { useAppAccess } from '../../contexts/AppAccessContext';"),
  '7. LiveInterviewRoom: Integrates useAuth and useAppAccess context hooks'
);
assert(
  liveInterviewContent.includes("if (!user || (isViewOnlyWeb && !isSuperAdmin)) return;") &&
  liveInterviewContent.includes("if (!user || (isViewOnlyWeb && !isSuperAdmin)) {\n      setIsLoadingSession(false);"),
  '7.1 LiveInterviewRoom: startCameraAndMic and initSession completely disabled when unauthenticated'
);
assert(
  liveInterviewContent.includes("Sesi Interview AI Memerlukan Login") &&
  liveInterviewContent.includes("Aplikasi Resmi LOXER Diperlukan"),
  '7.2 LiveInterviewRoom: Renders elegant Login Required and PWA Required barrier screens'
);

// 8. Verify CvGenerator.tsx protections
const cvGenContent = fs.readFileSync('src/pages/cv/CvGenerator.tsx', 'utf8').replace(/\r\n/g, '\n');
assert(
  cvGenContent.includes("if (!requireApp('Unduh & Cetak Berkas CV PDF'))"),
  '8. CvGenerator: handlePrintPdf guarded by requireApp for view-only web mode'
);
assert(
  cvGenContent.includes("if (!user) {") && cvGenContent.includes("showToast('Silakan masuk ke akun LOXER terlebih dahulu"),
  '8.1 CvGenerator: Live AI Interview button strictly requires user login'
);
assert(
  cvGenContent.includes("if (!requireApp('Simulasi Live Interview AI'))"),
  '8.2 CvGenerator: Live AI Interview button strictly requires LOXER PWA app via requireApp'
);
assert(
  cvGenContent.includes("<AuthModal") && cvGenContent.includes("onLogin={() => setAuthMode('login')}"),
  '8.3 CvGenerator: Integrates AuthModal and Navbar login/register callbacks'
);

// 9. Verify JobDetailModal.tsx interview CTA protection
const jobDetailContent = fs.readFileSync('src/components/jobs/JobDetailModal.tsx', 'utf8').replace(/\r\n/g, '\n');
assert(
  jobDetailContent.includes("if (!user) {") &&
  jobDetailContent.includes("onRequireAuth?.('login')") &&
  jobDetailContent.includes("if (!requireApp('Simulasi Live Interview AI'))"),
  '9. JobDetailModal: Live AI Interview button strictly requires user authentication and PWA app'
);

// 10. Verify WebModeBanner.tsx is active and has View Only badge + PWA CTA
const webBannerContent = fs.readFileSync('src/components/app/WebModeBanner.tsx', 'utf8');
assert(
  webBannerContent.includes("View Only") &&
  webBannerContent.includes("openInstallModal('Akses Penuh Aplikasi LOXER')"),
  '10. WebModeBanner: Active View-Only banner with 1-click PWA install CTA rendered on public web'
);

// 11. Verify Service Worker Cache Version
const swContent = fs.readFileSync('public/sw.js', 'utf8');
const swVersionMatch = swContent.match(/const CACHE_NAME = 'loxer-pwa-v(\d+)\.(\d+)\.(\d+)';/);
assert(
  Boolean(swVersionMatch && (parseInt(swVersionMatch[1], 10) > 6 || (parseInt(swVersionMatch[1], 10) === 6 && parseInt(swVersionMatch[2], 10) >= 7))),
  '11. Service Worker: Cache version bumped to at least loxer-pwa-v6.7.0 for instant client propagation'
);

console.log(`\n====================================================`);
if (failed === 0) {
  console.log('🎉 ALL 11 AUTH INTERVIEW & PUBLIC PWA AUDIT VERIFICATIONS PASSED 100%! 🎉');
} else {
  console.error(`❌ ${failed} verification checks failed.`);
  process.exit(1);
}
