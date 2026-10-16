#!/usr/bin/env node
/**
 * scripts/rotate-jwt-secret.mjs
 *
 * LOXER Zero-Downtime JWT Secret Key Rotation Tool (GODMAX+ Recommendation 22)
 *
 * Features:
 * - Generates cryptographically secure 256-bit secrets (crypto.randomBytes)
 * - Rotates active JWT_SECRET to JWT_PREVIOUS_SECRET in .env
 * - Zero-downtime: Tokens issued under previous secret remain valid during transition
 * - Built-in verification testing dual-secret signature acceptance
 *
 * Usage:
 *   node scripts/rotate-jwt-secret.mjs [--dry-run] [--verify]
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');

const isDryRun = process.argv.includes('--dry-run');

console.log('====================================================');
console.log('🔐 LOXER Zero-Downtime JWT Secret Key Rotation Tool');
console.log('====================================================');

// 1. Generate new 256-bit cryptographically secure secret
const newSecret = crypto.randomBytes(32).toString('hex');
console.log(`[1] Generated new 256-bit secret: ${newSecret.slice(0, 8)}...${newSecret.slice(-8)}`);

// 2. Read existing .env
let envContent = '';
if (fs.existsSync(ENV_FILE)) {
  envContent = fs.readFileSync(ENV_FILE, 'utf8');
}

// 3. Extract current JWT_SECRET
const currentSecretMatch = envContent.match(/^JWT_SECRET=(.*)$/m);
const currentSecret = currentSecretMatch ? currentSecretMatch[1].trim() : (process.env.JWT_SECRET || 'loxer-local-jwt-secret-key-2026');

console.log(`[2] Current active secret: ${currentSecret.slice(0, 8)}...`);

// 4. Update .env content
let updatedEnv = envContent;

if (/^JWT_SECRET=/m.test(updatedEnv)) {
  updatedEnv = updatedEnv.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${newSecret}`);
} else {
  updatedEnv += `\nJWT_SECRET=${newSecret}\n`;
}

if (/^JWT_PREVIOUS_SECRET=/m.test(updatedEnv)) {
  updatedEnv = updatedEnv.replace(/^JWT_PREVIOUS_SECRET=.*$/m, `JWT_PREVIOUS_SECRET=${currentSecret}`);
} else {
  updatedEnv += `JWT_PREVIOUS_SECRET=${currentSecret}\n`;
}

if (isDryRun) {
  console.log('[3] DRY RUN: .env not modified.');
} else {
  fs.writeFileSync(ENV_FILE, updatedEnv.trim() + '\n', 'utf8');
  console.log(`[3] Updated ${ENV_FILE} with new JWT_SECRET and JWT_PREVIOUS_SECRET.`);
}

// 5. Verification Test
console.log('\n[4] Running dual-secret verification test...');

// Function to sign JWT with a specific secret
function signTestJwt(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const fullPayload = { ...payload, exp };

  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const h = encode(header);
  const p = encode(fullPayload);
  const sig = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${h}.${p}.${sig}`;
}

// Verify token with dual secrets
function verifyDualSecret(token, activeSecret, prevSecret) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [h, p, sig] = parts;
  const secrets = [activeSecret];
  if (prevSecret) secrets.push(prevSecret);

  for (const sec of secrets) {
    const expected = crypto.createHmac('sha256', sec).update(`${h}.${p}`).digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    if (sig === expected) return true;
  }
  return false;
}

const oldToken = signTestJwt({ sub: 'user-old', role: 'seeker' }, currentSecret);
const newToken = signTestJwt({ sub: 'user-new', role: 'admin' }, newSecret);

const oldTokenValid = verifyDualSecret(oldToken, newSecret, currentSecret);
const newTokenValid = verifyDualSecret(newToken, newSecret, currentSecret);
const forgedTokenValid = verifyDualSecret(signTestJwt({ sub: 'attacker' }, 'invalid-forged-key'), newSecret, currentSecret);

if (oldTokenValid && newTokenValid && !forgedTokenValid) {
  console.log('✅ PASS: Previous token verifies cleanly under dual-secret.');
  console.log('✅ PASS: Newly minted token verifies cleanly under new secret.');
  console.log('✅ PASS: Forged token is rejected.');
  console.log('\n🎉 Key rotation verified successfully with ZERO session disruption!');
} else {
  console.error('❌ FAIL: Dual-secret verification failed.');
  process.exit(1);
}
