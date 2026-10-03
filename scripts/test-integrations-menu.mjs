async function run() {
  const base = process.env.TEST_BASE || 'https://loxer.web.id';
  console.log('Testing Integrations Menu against:', base);

  const endpoints = [
    { name: 'Integrations Status', path: '/api/integrations-status' },
    { name: 'Internal Provider Jobs', path: '/api/jobs?provider=internal' },
    { name: 'Facebook Group Jobs', path: '/api/jobs?provider=facebook-group' },
    { name: 'Unified (All) Feed', path: '/api/jobs?provider=all&keywords=developer&location=Indonesia' },
    { name: 'Careerjet Unconfigured Check', path: '/api/jobs?provider=careerjet', expectedStatus: 500 },
    { name: 'JSearch Unconfigured Check', path: '/api/jobs?provider=jsearch', expectedStatus: 500 },
  ];

  for (const ep of endpoints) {
    const url = base + ep.path;
    const start = performance.now();
    try {
      const res = await fetch(url);
      const latency = Math.round(performance.now() - start);
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch {}

      if (ep.expectedStatus) {
        if (res.status === ep.expectedStatus) {
          console.log(`✅ [${ep.name}] Expected HTTP ${res.status} (${latency}ms): ${data?.message || text.slice(0, 80)}`);
        } else {
          console.error(`❌ [${ep.name}] Expected HTTP ${ep.expectedStatus} but got ${res.status}`);
        }
        continue;
      }

      if (!res.ok) {
        console.error(`❌ [${ep.name}] HTTP ${res.status} (${latency}ms):`, text.slice(0, 100));
        continue;
      }

      if (ep.path.includes('integrations-status')) {
        console.log(`✅ [${ep.name}] Status ${res.status} (${latency}ms) - Public IP: ${data.publicIp}, Providers: ${data.integrations?.length}`);
        data.integrations?.forEach(p => {
          console.log(`   - ${p.label} (${p.id}): configured=${p.configured}, mode=${p.mode}, endpoint=${p.endpoint}`);
        });
      } else {
        const count = Array.isArray(data.jobs) ? data.jobs.length : (data.totalCount || 0);
        console.log(`✅ [${ep.name}] Status ${res.status} (${latency}ms) - Jobs returned: ${count}`);
        if (Array.isArray(data.jobs) && data.jobs[0]) {
          console.log(`   Sample Job: "${data.jobs[0].title}" at ${data.jobs[0].company} (${data.jobs[0].location || data.jobs[0].source})`);
        }
      }
    } catch (err) {
      console.error(`❌ [${ep.name}] Fetch error:`, err.message);
    }
  }
}

run();
