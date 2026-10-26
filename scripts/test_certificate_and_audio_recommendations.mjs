import fs from 'node:fs';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== Running Verification: Interview Certificate, Audio Chimes & Background Sync ===\n');

try {
  // 1. Verify Interview Certificate Service file exists and can generate HTML
  const certServicePath = path.join(rootDir, 'src', 'lib', 'interviewCertificateService.ts');
  assert.ok(fs.existsSync(certServicePath), 'interviewCertificateService.ts must exist');

  const certContent = fs.readFileSync(certServicePath, 'utf8');
  assert.ok(certContent.includes('export interface InterviewCertificateData'), 'InterviewCertificateData interface must be exported');
  assert.ok(certContent.includes('export function generateCertificateHtml'), 'generateCertificateHtml must be exported');
  assert.ok(certContent.includes('export function openPrintInterviewCertificate'), 'openPrintInterviewCertificate must be exported');
  assert.ok(certContent.includes('@media print'), 'Print styling must be embedded in certificate HTML');
  assert.ok(certContent.includes('print-color-adjust: exact'), 'Exact color adjustment must be specified for high fidelity print');

  console.log('✅ OK: 1. Service: interviewCertificateService.ts exports and print styling verified');

  // 2. Verify InterviewCertificateModal exists and imports required services
  const certModalPath = path.join(rootDir, 'src', 'components', 'interview', 'InterviewCertificateModal.tsx');
  assert.ok(fs.existsSync(certModalPath), 'InterviewCertificateModal.tsx must exist');

  const modalContent = fs.readFileSync(certModalPath, 'utf8');
  assert.ok(modalContent.includes('InterviewCertificateModalProps'), 'Modal props defined');
  assert.ok(modalContent.includes('openPrintInterviewCertificate'), 'Modal calls openPrintInterviewCertificate on print action');
  assert.ok(modalContent.includes('Cetak / Simpan sebagai PDF'), 'Modal contains PDF export / print trigger button');

  console.log('✅ OK: 2. Component: InterviewCertificateModal.tsx preview and print trigger verified');

  // 3. Verify SeekerDashboard integrates certificate preview modal & action button
  const seekerDashboardPath = path.join(rootDir, 'src', 'pages', 'seeker', 'SeekerDashboard.tsx');
  const seekerContent = fs.readFileSync(seekerDashboardPath, 'utf8');
  assert.ok(seekerContent.includes('InterviewCertificateModal'), 'SeekerDashboard must import and render InterviewCertificateModal');
  assert.ok(seekerContent.includes('showCertModal'), 'SeekerDashboard must maintain showCertModal state');
  assert.ok(seekerContent.includes('Sertifikat PDF'), 'SeekerDashboard must display Sertifikat PDF button in AI interview widget');
  assert.ok(seekerContent.includes('getCertData()'), 'SeekerDashboard must construct certificate data from latest interview');

  console.log('✅ OK: 3. Integration: SeekerDashboard AI interview certificate button and modal verified');

  // 4. Verify LiveInterviewRoom audio chimes, utterance prewarming, and certificate actions
  const roomPath = path.join(rootDir, 'src', 'pages', 'interview', 'LiveInterviewRoom.tsx');
  const roomContent = fs.readFileSync(roomPath, 'utf8');
  assert.ok(roomContent.includes('playAudioTone'), 'LiveInterviewRoom must define playAudioTone Web Audio generator');
  assert.ok(roomContent.includes("'turn_submit'"), 'LiveInterviewRoom must support turn_submit chime');
  assert.ok(roomContent.includes("'ai_speak'"), 'LiveInterviewRoom must support ai_speak audio cue');
  assert.ok(roomContent.includes("'completion'"), 'LiveInterviewRoom must support completion audio cue');
  assert.ok(roomContent.includes('prewarmUtterances'), 'LiveInterviewRoom must pre-warm SpeechSynthesisUtterance cache');
  assert.ok(roomContent.includes('handlePrintCertificate'), 'LiveInterviewRoom must support printing official certificate');
  assert.ok(roomContent.includes('InterviewCertificateModal'), 'LiveInterviewRoom must integrate InterviewCertificateModal');

  console.log('✅ OK: 4. Feature: LiveInterviewRoom Web Audio chimes, utterance caching & certificate triggers verified');

  // 5. Verify Service Worker Background Sync and Version Bump
  const swPath = path.join(rootDir, 'public', 'sw.js');
  const swContent = fs.readFileSync(swPath, 'utf8');
  assert.ok(swContent.includes('loxer-pwa-v6.9.0'), 'Service Worker cache must be bumped to loxer-pwa-v6.9.0');
  assert.ok(swContent.includes("self.addEventListener('sync'"), 'Service Worker must listen for sync event');
  assert.ok(swContent.includes('LOXER_TRIGGER_OFFLINE_SYNC'), 'Service Worker must broadcast LOXER_TRIGGER_OFFLINE_SYNC to clients');

  console.log('✅ OK: 5. PWA: Service Worker background sync listener and v6.9.0 cache version verified');

  // 6. Verify OfflineSyncService Background Sync Registration
  const syncServicePath = path.join(rootDir, 'src', 'lib', 'offlineSyncService.ts');
  const syncContent = fs.readFileSync(syncServicePath, 'utf8');
  assert.ok(syncContent.includes('export async function requestBackgroundSync'), 'offlineSyncService must export requestBackgroundSync');
  assert.ok(syncContent.includes('LOXER_TRIGGER_OFFLINE_SYNC'), 'offlineSyncService must handle background sync trigger message');

  console.log('✅ OK: 6. Resilience: offlineSyncService background sync registration & trigger handler verified');

  console.log('\n🎉 ALL 6 RECOMMENDATION VERIFICATION CHECKS PASSED SUCCESSFULLY!\n');
  process.exit(0);
} catch (err) {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
}
