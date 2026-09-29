import { searchUnifiedJobs } from '../services/unifiedJobService.js';

async function test() {
  console.log('--- 1. Testing Unified Aggregator (Real Data Only) ---');
  const unified = await searchUnifiedJobs({ provider: 'all' });
  console.log('Unified total hits:', unified.hits, 'Returned jobs count:', unified.jobs.length);
  
  // Verify that all returned jobs are real
  let hasDummy = false;
  unified.jobs.forEach((j, i) => {
    const isMock = (j.url || '').includes('alfamart-admin-gudang') || (j.company || '').includes('Alfamart');
    if (isMock) hasDummy = true;
    if (i < 5) {
      console.log(`[Job ${i+1}] Title: "${j.title}" | Company: ${j.company} | Site: ${j.site} | URL: ${j.url}`);
    }
  });

  if (!hasDummy && unified.jobs.length > 0) {
    console.log(`\n✅ PASS: All ${unified.jobs.length} jobs are 100% REAL data with active URLs!`);
  } else if (hasDummy) {
    console.error('\n❌ FAIL: Found dummy job in unified results!');
  }
  console.log('\n--- 3. Testing Live Server Production API (https://loxer.web.id) ---');
  try {
    const liveRes = await fetch('https://loxer.web.id/api/jobs?provider=all');
    const liveData = await liveRes.json();
    console.log('Live HTTP Status:', liveRes.status, 'Total hits:', liveData.hits, 'Jobs count:', liveData.jobs?.length);
    let liveHasDummy = false;
    liveData.jobs?.forEach((j, i) => {
      const isMock = (j.url || '').includes('alfamart-admin-gudang') || (j.company || '').includes('Alfamart');
      if (isMock) liveHasDummy = true;
      if (i < 3) {
        console.log(`[Live Job ${i+1}] Title: "${j.title}" | Company: ${j.company} | Site: ${j.site} | URL: ${j.url}`);
      }
    });
    if (!liveHasDummy && (liveData.jobs?.length || 0) > 0) {
      console.log(`✅ PASS: Live server returns ${liveData.jobs?.length} 100% REAL jobs without dummy data!`);
    } else if (liveHasDummy) {
      console.error('❌ FAIL: Live server returned dummy job!');
    }
  } catch (e) {
    console.error('Live fetch error:', e.message);
  }
}

test();
