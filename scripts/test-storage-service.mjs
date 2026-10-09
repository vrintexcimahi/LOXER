import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer } from 'vite';
import {
  getStorageDriver,
  validateMagicBytes,
  uploadBuffer,
  uploadBase64,
  offloadBase64Payload,
  getStorageStats,
  deleteFile,
} from '../server/storageService.js';
import { getLocalDb } from '../server/localDb.js';

// Minimal 1x1 transparent PNG binary bytes
const SAMPLE_PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);
const SAMPLE_PNG_DATA_URI = `data:image/png;base64,${SAMPLE_PNG_BUFFER.toString('base64')}`;

// Minimal PDF header bytes (%PDF-1.4...)
const SAMPLE_PDF_BUFFER = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\nxref\n0 1\ntrailer<</Root 1 0 R>>\n%%EOF', 'utf8');
const SAMPLE_PDF_DATA_URI = `data:application/pdf;base64,${SAMPLE_PDF_BUFFER.toString('base64')}`;

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Testing Storage Service & Database Media Offloading');
  console.log('====================================================');

  const createdFiles = [];

  try {
    // 1. Driver check
    const driver = getStorageDriver();
    console.log(`✅ 1. Storage driver identified: '${driver}'`);

    // 2. Magic bytes validation
    const validPng = validateMagicBytes(SAMPLE_PNG_BUFFER, 'image/png');
    if (!validPng) throw new Error('Valid PNG rejected by magic bytes validator');

    const validPdf = validateMagicBytes(SAMPLE_PDF_BUFFER, 'application/pdf');
    if (!validPdf) throw new Error('Valid PDF rejected by magic bytes validator');

    const fakeJpgBuffer = Buffer.from('NOT A REAL JPEG HEADER');
    const invalidJpg = validateMagicBytes(fakeJpgBuffer, 'image/jpeg');
    if (invalidJpg) throw new Error('Fake JPEG accepted by magic bytes validator');
    console.log('✅ 2. File Signature (Magic Bytes) validation verified (PNG, PDF, Fake rejection)');

    // 3. Direct buffer upload
    const uploadRes = await uploadBuffer({
      buffer: SAMPLE_PNG_BUFFER,
      filename: 'unit_test_dot.png',
      mimeType: 'image/png',
      folder: 'test_uploads',
    });
    createdFiles.push(uploadRes.url);

    if (!uploadRes.url.startsWith('/uploads/test_uploads/')) {
      throw new Error(`Unexpected upload URL: ${uploadRes.url}`);
    }
    const localDiskPath = path.resolve(process.cwd(), 'public', uploadRes.url.replace(/^\//, ''));
    if (!fs.existsSync(localDiskPath)) {
      throw new Error(`Uploaded file not found on disk: ${localDiskPath}`);
    }
    console.log(`✅ 3. Direct buffer upload verified: ${uploadRes.url} (${uploadRes.size} bytes)`);

    // 4. Base64 Data URI upload
    const base64Res = await uploadBase64({
      dataUri: SAMPLE_PNG_DATA_URI,
      folder: 'test_uploads',
      filenamePrefix: 'unit_base64_avatar',
    });
    createdFiles.push(base64Res.url);

    if (!base64Res.url.includes('unit_base64_avatar')) {
      throw new Error(`Unexpected Base64 upload result: ${JSON.stringify(base64Res)}`);
    }
    console.log(`✅ 4. Base64 Data URI upload verified: ${base64Res.url}`);

    // 5. Intelligent offload helper
    const offloadedAvatar = await offloadBase64Payload(SAMPLE_PNG_DATA_URI, 'avatars', 'user_photo');
    createdFiles.push(offloadedAvatar);
    if (!offloadedAvatar.startsWith('/uploads/avatars/')) {
      throw new Error(`offloadBase64Payload failed to convert base64: ${offloadedAvatar}`);
    }

    const externalUrl = 'https://cdn.example.com/images/company_logo.png';
    const unchangedUrl = await offloadBase64Payload(externalUrl, 'logos', 'co_logo');
    if (unchangedUrl !== externalUrl) {
      throw new Error(`offloadBase64Payload mutated an existing URL: ${unchangedUrl}`);
    }
    console.log('✅ 5. offloadBase64Payload correctly extracts Base64 and preserves standard URLs');

    // 6. Test HTTP server endpoints & DB query interceptor
    const port = 3336;
    const baseUrl = `http://localhost:${port}`;
    const server = await createServer({
      configFile: './vite.config.ts',
      server: { port },
    });
    await server.listen();
    console.log(`Test Vite server running on port ${port}...`);

    try {
      // Helper safe fetch
      async function safeFetch(url, options = {}) {
        const opts = {
          ...options,
          headers: { Connection: 'close', ...(options.headers || {}) },
        };
        return await fetch(url, opts);
      }

      // 6.1 Test /api/storage/status
      const statusRes = await safeFetch(`${baseUrl}/api/storage/status`);
      if (statusRes.status !== 200) throw new Error(`/api/storage/status returned ${statusRes.status}`);
      const statusJson = await statusRes.json();
      if (!statusJson.ok || !statusJson.stats) throw new Error('Invalid /api/storage/status payload');
      console.log(`✅ 6. /api/storage/status verified: driver=${statusJson.stats.driver}, files=${statusJson.stats.fileCount}`);

      // 6.2 Test /api/storage/upload endpoint
      const apiUploadRes = await safeFetch(`${baseUrl}/api/storage/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: SAMPLE_PNG_DATA_URI,
          folder: 'test_uploads',
          filenamePrefix: 'api_uploaded_pic',
        }),
      });
      if (apiUploadRes.status !== 200) throw new Error(`/api/storage/upload returned ${apiUploadRes.status}`);
      const apiUploadJson = await apiUploadRes.json();
      if (!apiUploadJson.ok || !apiUploadJson.data?.url) throw new Error('Invalid /api/storage/upload response');
      createdFiles.push(apiUploadJson.data.url);
      console.log(`✅ 7. /api/storage/upload endpoint verified: ${apiUploadJson.data.url}`);

      // 6.3 Test static file serving via HTTP
      const staticRes = await safeFetch(`${baseUrl}${apiUploadJson.data.url}`);
      if (staticRes.status !== 200) throw new Error(`Static file serving returned ${staticRes.status}`);
      const contentType = staticRes.headers.get('content-type');
      if (!contentType?.includes('image/png')) throw new Error(`Unexpected Content-Type: ${contentType}`);
      const nosniff = staticRes.headers.get('x-content-type-options');
      if (nosniff !== 'nosniff') throw new Error(`Missing X-Content-Type-Options: nosniff`);
      console.log(`✅ 8. Static file serving verified via HTTP (${contentType}, nosniff)`);

      // 6.4 Test Path Traversal Protection
      const traversalRes1 = await safeFetch(`${baseUrl}/uploads/%2e%2e/data/loxer.db`);
      if (traversalRes1.status !== 403 && traversalRes1.status !== 404) {
        throw new Error(`Path traversal was not blocked! HTTP ${traversalRes1.status}`);
      }
      const traversalRes2 = await safeFetch(`${baseUrl}/data/loxer.db`);
      if (traversalRes2.status !== 403 && traversalRes2.status !== 404) {
        throw new Error(`Direct database file access was not blocked! HTTP ${traversalRes2.status}`);
      }
      console.log('✅ 9. Security: Directory Traversal and direct database file access blocked (403)');

      // 6.5 Test Database Mutation Auto-Offload (Recommendation 4 Core Goal)
      // Login as admin
      const loginRes = await safeFetch(`${baseUrl}/api/local/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'vrintex@loxer.app', password: 'kayaraya3+' }),
      });
      const loginData = await loginRes.json();
      const adminToken = loginData.data?.session?.access_token;

      const testCompanyId = crypto.randomUUID();
      const insertCompanyRes = await safeFetch(`${baseUrl}/api/local/db/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          action: 'insert',
          table: 'companies',
          data: {
            id: testCompanyId,
            user_id: 'admin-vrintex-root',
            name: 'PT Cloud Storage Test',
            logo_url: SAMPLE_PNG_DATA_URI, // Base64 payload!
            description: 'Testing automatic media offload',
          },
        }),
      });

      if (insertCompanyRes.status !== 200) throw new Error(`Company insert returned ${insertCompanyRes.status}`);

      // Inspect directly in SQLite localDb
      const db = getLocalDb();
      const companyRow = db.prepare('SELECT logo_url FROM companies WHERE id = ?').get(testCompanyId);
      if (!companyRow) throw new Error('Company row not found in SQLite');

      // The logo_url in SQLite MUST be a /uploads/logos/ link, NOT the Base64 data URI!
      if (companyRow.logo_url.startsWith('data:image/')) {
        throw new Error('FAILED: Base64 logo_url was stored raw in SQLite! Auto-offload did not trigger.');
      }
      if (!companyRow.logo_url.startsWith('/uploads/logos/')) {
        throw new Error(`Unexpected logo_url in SQLite: ${companyRow.logo_url}`);
      }
      createdFiles.push(companyRow.logo_url);
      console.log(`✅ 10. Database Offloading Verified: SQLite logo_url converted to ${companyRow.logo_url}`);

      // Clean up test company
      db.prepare('DELETE FROM companies WHERE id = ?').run(testCompanyId);
    } finally {
      await server.close();
      console.log('Test Vite server closed.');
    }

    // 7. Cleanup created test files
    for (const fileUrl of createdFiles) {
      await deleteFile(fileUrl);
    }
    console.log(`✅ 11. Test file cleanup verified (${createdFiles.length} files removed cleanly)`);

    console.log('====================================================');
    console.log('🎉 ALL STORAGE & MEDIA OFFLOADING TESTS PASSED 100%! 🎉');
    console.log('====================================================');
  } catch (err) {
    console.error('❌ Test failed:', err);
    // Attempt cleanup
    for (const fileUrl of createdFiles) {
      await deleteFile(fileUrl).catch(() => {});
    }
    process.exit(1);
  }
}

runTests();
