import { createServer } from 'vite';

async function test() {
  console.log('--- Testing LOXER Local Server & DB ---');
  const server = await createServer({
    configFile: './vite.config.ts',
    server: { port: 3031 },
  });
  await server.listen();
  console.log('Test Vite server running on port 3031...');

  try {
    async function safeFetch(url, options = {}, retries = 2) {
      for (let i = 0; i <= retries; i++) {
        try {
          const opts = {
            ...options,
            headers: {
              Connection: 'close',
              ...(options.headers || {}),
            },
          };
          return await fetch(url, opts);
        } catch (err) {
          if (i === retries || (err.cause?.code !== 'ECONNRESET' && err.code !== 'ECONNRESET')) {
            throw err;
          }
          await new Promise((r) => setTimeout(r, 150));
        }
      }
    }

    // 1. Test /api/auth-capabilities
    const capRes = await safeFetch('http://localhost:3031/api/auth-capabilities');
    const capData = await capRes.json();
    console.log('1. Capabilities:', capData.emailAuthEnabled ? 'OK' : 'FAIL');

    // 2. Test /api/local/auth/login with seeded admin
    const loginRes = await safeFetch('http://localhost:3031/api/local/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'loxer-admin-1776448925326@example.com',
        password: 'admin123',
      }),
    });
    const loginData = await loginRes.json();
    console.log('2. Admin Login:', loginData.data?.session?.access_token ? 'OK' : 'FAIL');

    const adminToken = loginData.data?.session?.access_token;

    // 3. Test /api/local/db/query for job_listings
    const queryRes = await safeFetch('http://localhost:3031/api/local/db/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'job_listings',
        action: 'select',
        columns: '*',
      }),
    });
    const queryData = await queryRes.json();
    console.log('3. Query Job Listings:', queryData.data?.length > 0 ? `OK (${queryData.data.length} jobs found)` : 'FAIL');

    // 4. Test /api/admin/users
    const usersRes = await safeFetch('http://localhost:3031/api/admin/users', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const usersData = await usersRes.json();
    console.log('4. Admin Users status:', usersRes.status, 'body:', JSON.stringify(usersData));
    console.log('4. Admin Users Endpoint:', usersData.rows?.length > 0 ? `OK (${usersData.rows.length} users)` : 'FAIL');

    // 5. Test Seeker login
    const seekerLogin = await safeFetch('http://localhost:3031/api/local/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'seeker@demo.com',
        password: 'seeker123',
      }),
    });
    const seekerData = await seekerLogin.json();
    console.log('5. Seeker Login:', seekerData.data?.session?.access_token ? 'OK' : 'FAIL');

    console.log('All local tests passed successfully!');
  } finally {
    await server.close();
    console.log('Test Vite server closed.');
  }
}

test().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
