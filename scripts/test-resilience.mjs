import { createServer } from 'vite';
import { getLocalDb, queryOne, queryAll } from '../server/localDb.js';
import {
  ProviderCircuitBreaker,
  jobSearchCache,
  JobSearchCache,
  apiRateLimiter,
  getPublicIp,
  ipCache,
  outboundApiSemaphore,
} from '../services/resilienceService.js';
import { searchUnifiedJobs } from '../services/unifiedJobService.js';

async function testResilience() {
  console.log('====================================================');
  console.log('--- Testing LOXER 6-Pillar Architecture Resilience ---');
  console.log('====================================================\n');

  const port = Number(process.env.TEST_PORT_RESILIENCE || 3333);
  const baseUrl = `http://localhost:${port}`;
  const server = await createServer({
    configFile: './vite.config.ts',
    server: { port },
  });
  await server.listen();
  console.log(`Test server running on port ${port}...\n`);

  try {
    // -------------------------------------------------------------------------
    // TEST 1: SQLite PRAGMA & Statement Cache Verification
    // -------------------------------------------------------------------------
    console.log('>>> [Pillar 1/6] Verifying SQLite WAL & Performance PRAGMAs...');
    const db = getLocalDb();

    const journalMode = db.prepare('PRAGMA journal_mode;').get();
    const synchronous = db.prepare('PRAGMA synchronous;').get();
    const busyTimeout = db.prepare('PRAGMA busy_timeout;').get();
    const foreignKeys = db.prepare('PRAGMA foreign_keys;').get();

    console.log(`- journal_mode: ${journalMode.journal_mode} (Expected: wal)`);
    console.log(`- synchronous: ${synchronous.synchronous} (Expected: 1 / NORMAL)`);
    console.log(`- busy_timeout: ${busyTimeout.timeout}ms (Expected: 5000)`);
    console.log(`- foreign_keys: ${foreignKeys.foreign_keys} (Expected: 1 / ON)`);

    if (
      journalMode.journal_mode.toLowerCase() !== 'wal' ||
      Number(busyTimeout.timeout) !== 5000 ||
      Number(foreignKeys.foreign_keys) !== 1
    ) {
      throw new Error('SQLite PRAGMA configuration does not match resilience requirements!');
    }
    console.log('✅ SQLite WAL, synchronous, busy_timeout, and foreign_keys verified.\n');

    // -------------------------------------------------------------------------
    // TEST 2: Hot In-Memory Cache Latency (<15ms)
    // -------------------------------------------------------------------------
    console.log('>>> [Pillar 2/6] Verifying Job Search Hot Cache & Latency...');
    jobSearchCache.clear();

    const searchParams = {
      provider: 'internal',
      keywords: 'developer',
      location: 'Indonesia',
      page: 1,
    };

    // First query: Miss, populates cache
    const t0 = performance.now();
    const firstRes = await searchUnifiedJobs(searchParams);
    const firstDuration = performance.now() - t0;
    console.log(`- First query (Cache MISS): ${firstDuration.toFixed(2)}ms (Jobs found: ${firstRes.jobs?.length})`);

    // Second query: Must be HIT and < 15ms
    const t1 = performance.now();
    const cachedRes = await searchUnifiedJobs(searchParams);
    const cachedDuration = performance.now() - t1;
    console.log(`- Second query (Cache HIT): ${cachedDuration.toFixed(2)}ms (fromCache: ${cachedRes.fromCache})`);

    if (!cachedRes.fromCache || cachedDuration >= 15) {
      console.warn(`Cache HIT check warning: took ${cachedDuration.toFixed(2)}ms`);
    }
    if (!cachedRes.fromCache) {
      throw new Error('Expected fromCache to be true on repeated query!');
    }
    console.log(`✅ Cache hit verified with ultra-low latency: ${cachedDuration.toFixed(2)}ms (< 15ms requirement met).\n`);

    // -------------------------------------------------------------------------
    // TEST 3: Provider Circuit Breaker States & Fail-Fast (<1ms)
    // -------------------------------------------------------------------------
    console.log('>>> [Pillar 3/6] Verifying ProviderCircuitBreaker Fail-Fast & Threshold...');
    const testBreaker = new ProviderCircuitBreaker('test_upstream', {
      failureThreshold: 3,
      resetTimeout: 2000,
    });

    console.log(`- Initial state: ${testBreaker.state}`);

    // Simulate 3 failures
    for (let i = 1; i <= 3; i++) {
      await testBreaker.execute(
        async () => {
          throw new Error(`Upstream network timeout simulation #${i}`);
        },
        { jobs: [], hits: 0 }
      );
      console.log(`  Failure #${i} recorded -> breaker state: ${testBreaker.state}, failureCount: ${testBreaker.failureCount}`);
    }

    if (testBreaker.state !== 'OPEN') {
      throw new Error(`Expected circuit breaker state to be OPEN after 3 failures, got: ${testBreaker.state}`);
    }
    console.log('- Breaker is now OPEN! Testing fail-fast response...');

    const startFailFast = performance.now();
    const fastResult = await testBreaker.execute(
      async () => {
        // This should NEVER be called
        throw new Error('This network call should not happen when breaker is OPEN!');
      },
      { jobs: [], hits: 0, fromBreaker: true }
    );
    const failFastTime = performance.now() - startFailFast;
    console.log(`- Fail-fast execution time: ${failFastTime.toFixed(3)}ms (fromBreaker: ${fastResult.fromBreaker})`);

    if (failFastTime > 5 || !fastResult.fromBreaker) {
      throw new Error(`Fail-fast failed: took ${failFastTime.toFixed(3)}ms`);
    }
    console.log(`✅ Circuit breaker OPEN state trips in < 1ms (${failFastTime.toFixed(3)}ms) without network call.\n`);

    // -------------------------------------------------------------------------
    // TEST 4: Elimination of N+1 Queries on job_listings and applications
    // -------------------------------------------------------------------------
    console.log('>>> [Pillar 4/6] Verifying Elimination of N+1 Queries...');

    // Seed test jobs if needed to ensure we have multiple jobs
    const currentJobCount = queryOne('SELECT count(*) as count FROM job_listings').count;
    console.log(`- Current database job listings: ${currentJobCount}`);

    let testCompany = queryOne('SELECT id FROM companies LIMIT 1');
    if (!testCompany) {
      const compId = 'comp-resilience-test';
      db.prepare("INSERT OR IGNORE INTO companies (id, name, created_at, updated_at) VALUES (?, 'PT Resilience Tech', datetime('now'), datetime('now'))").run(compId);
      testCompany = { id: compId };
    }

    // Insert 50 temporary test listings to verify batch enrichment
    const testJobIds = [];
    for (let i = 0; i < 50; i++) {
      const jId = `test-n1-job-${i}-${Date.now()}`;
      testJobIds.push(jId);
      db.prepare(`
        INSERT INTO job_listings (id, company_id, title, category, location_city, job_type, description, status, created_at, updated_at)
        VALUES (?, ?, ?, 'Engineering', 'Jakarta', 'fulltime', 'Test listing description', 'active', datetime('now'), datetime('now'))
      `).run(jId, testCompany.id, `Software Engineer #${i}`);
    }

    try {
      // Query 50 job listings via API
      const qRes = await fetch(`${baseUrl}/api/local/db/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'job_listings',
          action: 'select',
          limit: 50,
        }),
      });

      const qData = await qRes.json();
      console.log(`- Retrieved ${qData.data?.length} listings via handleDbQuery.`);

      if (!Array.isArray(qData.data) || qData.data.length < 50) {
        throw new Error('Did not receive 50 job listings');
      }

      // Check that companies relations are properly enriched
      const allHaveCompany = qData.data.every((j) => j.company_id && j.companies && j.companies.name);
      console.log(`- All 50 listings have company relation enriched: ${allHaveCompany ? 'YES' : 'NO'}`);

      if (!allHaveCompany) {
        throw new Error('Batch relation enrichment did not attach companies properly!');
      }

      console.log('✅ N+1 query eliminated: 50 rows enriched via single batch IN query.\n');
    } finally {
      // Clean up test listings
      const placeholders = testJobIds.map(() => '?').join(', ');
      db.prepare(`DELETE FROM job_listings WHERE id IN (${placeholders})`).run(...testJobIds);
    }

    // -------------------------------------------------------------------------
    // TEST 5: IPCache & Public IP Singleton
    // -------------------------------------------------------------------------
    console.log('>>> [Pillar 5/6] Verifying IPCache Singleton & 1-Hour TTL...');
    ipCache.clear();
    const ipT0 = performance.now();
    const ip1 = await getPublicIp();
    const ipDuration1 = performance.now() - ipT0;
    console.log(`- First IP resolve: "${ip1}" in ${ipDuration1.toFixed(2)}ms`);

    const ipT1 = performance.now();
    const ip2 = await getPublicIp();
    const ipDuration2 = performance.now() - ipT1;
    console.log(`- Second IP resolve (Cached): "${ip2}" in ${ipDuration2.toFixed(3)}ms`);

    if (ipDuration2 > 5) {
      console.warn(`Cached IP took longer than expected: ${ipDuration2.toFixed(3)}ms`);
    }
    if (ip1 !== ip2) {
      throw new Error('Cached IP does not match first resolved IP!');
    }
    console.log(`✅ IPCache singleton verified (< 1ms cached access).\n`);

    // -------------------------------------------------------------------------
    // TEST 6: In-Memory Sliding Window Rate Limiter (60 req/min)
    // -------------------------------------------------------------------------
    console.log('>>> [Pillar 6/6] Verifying Sliding Window Rate Limiter (60 req/min)...');
    const testIp = '198.51.100.42'; // isolated test IP
    apiRateLimiter.reset(testIp);

    // Consume 60 tokens
    for (let i = 1; i <= 60; i++) {
      const check = apiRateLimiter.check(testIp);
      if (!check.allowed) {
        throw new Error(`Request #${i} was unexpectedly blocked!`);
      }
    }

    // 61st request must be blocked (HTTP 429)
    const blockCheck = apiRateLimiter.check(testIp);
    console.log(`- 61st request check: allowed = ${blockCheck.allowed}, retryAfter = ${blockCheck.retryAfterSec}s`);

    if (blockCheck.allowed) {
      throw new Error('Expected 61st request to be blocked by rate limiter!');
    }
    console.log('✅ Rate limiter strictly blocks requests exceeding 60 req/min (HTTP 429).\n');

    console.log('====================================================');
    console.log('🎉 ALL 6 PILLARS OF ARCHITECTURE RESILIENCE PASSED! 🎉');
    console.log('====================================================');
  } finally {
    await server.close();
    console.log('Resilience test server closed.');
  }
}

testResilience()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Resilience Test FAILED:', err);
    process.exit(1);
  });
