import crypto from 'node:crypto';
import {
  getLocalDb,
  queryOne,
  execute,
  hashPassword,
} from '../server/localDb.js';

const DEFAULT_ADMIN_EMAIL = 'loxer-admin-1776448925326@example.com';

export async function seedDatabase() {
  console.log('🌱 Menyiapkan seeder database lokal LOXER...');
  getLocalDb(); // ensure tables exist

  const now = new Date().toISOString();

  // 1. Seed Default Admin
  let adminUser = queryOne('SELECT id FROM users WHERE email = ?', [DEFAULT_ADMIN_EMAIL]);
  if (!adminUser) {
    const adminId = crypto.randomUUID();
    const hash = hashPassword('admin123');
    execute('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)', [
      adminId,
      DEFAULT_ADMIN_EMAIL,
      hash,
      now,
    ]);
    execute('INSERT INTO users_meta (id, email, role, created_at, is_banned) VALUES (?, ?, ?, ?, 0)', [
      adminId,
      DEFAULT_ADMIN_EMAIL,
      'admin',
      now,
    ]);
    console.log(`✅ Admin default dibuat: ${DEFAULT_ADMIN_EMAIL} (password: admin123)`);
  } else {
    execute("UPDATE users_meta SET role = 'admin' WHERE id = ?", [adminUser.id]);
    console.log(`ℹ️ Admin default sudah ada: ${DEFAULT_ADMIN_EMAIL}`);
  }

  // 2. Seed Demo Employer & Company
  const employerEmail = 'employer@demo.com';
  let employerUser = queryOne('SELECT id FROM users WHERE email = ?', [employerEmail]);
  let companyId = null;

  if (!employerUser) {
    const empId = crypto.randomUUID();
    const hash = hashPassword('employer123');
    execute('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)', [
      empId,
      employerEmail,
      hash,
      now,
    ]);
    execute('INSERT INTO users_meta (id, email, role, created_at, is_banned) VALUES (?, ?, ?, ?, 0)', [
      empId,
      employerEmail,
      'employer',
      now,
    ]);

    companyId = crypto.randomUUID();
    execute(
      `INSERT INTO companies (id, user_id, name, industry, city, description, website, employee_count, logo_url, verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        companyId,
        empId,
        'PT Vrintex Solusi Teknologi',
        'Technology',
        'Jakarta Selatan',
        'Perusahaan teknologi pengembang platform enterprise dan talenta digital terdepan di Indonesia.',
        'https://vrintex.co.id',
        '51-200',
        '',
        now,
        now,
      ]
    );

    execute(
      'INSERT INTO company_members (id, company_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), companyId, empId, 'owner', now]
    );

    console.log(`✅ Employer demo dibuat: ${employerEmail} (password: employer123)`);
  } else {
    const comp = queryOne('SELECT id FROM companies WHERE user_id = ?', [employerUser.id]);
    companyId = comp?.id;
    console.log(`ℹ️ Employer demo sudah ada: ${employerEmail}`);
  }

  // 3. Seed Demo Job Listings
  if (companyId) {
    const existingJobs = queryOne('SELECT count(*) as c FROM job_listings WHERE company_id = ?', [companyId]);
    if (!existingJobs || existingJobs.c === 0) {
      const jobs = [
        {
          title: 'Senior Fullstack Engineer (React & Node.js)',
          category: 'Technology',
          location_city: 'Jakarta / Remote',
          job_type: 'full-time',
          salary_min: 15000000,
          salary_max: 25000000,
          description: 'Kami mencari Senior Fullstack Engineer berpengalaman dengan React, TypeScript, dan arsitektur microservices atau modular backend.',
          requirements: 'Pengalaman 4+ tahun, memahami state management, SQL database, dan REST/GraphQL API.',
          quota: 2,
        },
        {
          title: 'Product Designer (UI/UX)',
          category: 'Design',
          location_city: 'Jakarta Selatan',
          job_type: 'full-time',
          salary_min: 10000000,
          salary_max: 18000000,
          description: 'Merancang visual interaktif, user flow, design system, dan prototipe aplikasi untuk ekosistem rekrutmen kami.',
          requirements: 'Figma proficiency, pemahaman mobile-first design, portfolio interaktif.',
          quota: 1,
        },
        {
          title: 'Talent Acquisition Specialist',
          category: 'HR',
          location_city: 'Jakarta Pusat',
          job_type: 'full-time',
          salary_min: 8000000,
          salary_max: 14000000,
          description: 'Mengelola end-to-end recruitment pipeline, sourcing kandidat potensial, dan berkoordinasi dengan user hiring.',
          requirements: 'Pengalaman 2+ tahun di headhunter atau in-house tech talent acquisition.',
          quota: 1,
        },
      ];

      for (const job of jobs) {
        execute(
          `INSERT INTO job_listings (id, company_id, title, category, location_city, job_type, salary_min, salary_max, description, requirements, quota, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
          [
            crypto.randomUUID(),
            companyId,
            job.title,
            job.category,
            job.location_city,
            job.job_type,
            job.salary_min,
            job.salary_max,
            job.description,
            job.requirements,
            job.quota,
            now,
            now,
          ]
        );
      }
      console.log('✅ 3 Lowongan demo aktif berhasil ditambahkan.');
    }
  }

  // 4. Seed Demo Seeker
  const seekerEmail = 'seeker@demo.com';
  let seekerUser = queryOne('SELECT id FROM users WHERE email = ?', [seekerEmail]);
  if (!seekerUser) {
    const seekerId = crypto.randomUUID();
    const hash = hashPassword('seeker123');
    execute('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)', [
      seekerId,
      seekerEmail,
      hash,
      now,
    ]);
    execute('INSERT INTO users_meta (id, email, role, created_at, is_banned) VALUES (?, ?, ?, ?, 0)', [
      seekerId,
      seekerEmail,
      'seeker',
      now,
    ]);

    const profileId = crypto.randomUUID();
    execute(
      `INSERT INTO seeker_profiles (id, user_id, full_name, domicile_city, about, phone, expected_salary_min, expected_salary_max, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profileId,
        seekerId,
        'Budi Santoso',
        'Jakarta Selatan',
        'Software Engineer antusias dengan spesialisasi frontend modern dan backend TypeScript.',
        '081234567890',
        12000000,
        18000000,
        now,
        now,
      ]
    );

    execute(
      'INSERT INTO seeker_education (id, seeker_id, school_name, degree, major, start_year, end_year, is_current, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [crypto.randomUUID(), profileId, 'Universitas Indonesia', 'S1', 'Ilmu Komputer', 2018, 2022, 0, now]
    );

    const skills = ['React', 'TypeScript', 'Node.js', 'SQL', 'Tailwind CSS'];
    for (const skill of skills) {
      execute(
        'INSERT INTO seeker_skills (id, seeker_id, skill_name, created_at) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), profileId, skill, now]
      );
    }

    // Connect 1 application
    const firstJob = queryOne('SELECT id FROM job_listings LIMIT 1');
    if (firstJob) {
      execute(
        'INSERT INTO applications (id, job_id, seeker_id, status, applied_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), firstJob.id, profileId, 'reviewed', now, now]
      );
    }

    console.log(`✅ Seeker demo dibuat: ${seekerEmail} (password: seeker123)`);
  } else {
    console.log(`ℹ️ Seeker demo sudah ada: ${seekerEmail}`);
  }

  // 5. Seed Initial CMS Homepage if empty
  const homepage = queryOne("SELECT id FROM pages WHERE slug = 'homepage'");
  if (!homepage) {
    const defaultData = {
      root: { props: {} },
      content: [
        {
          type: 'HeroSection',
          props: {
            badge: 'Platform Rekrutmen Lokal',
            title: 'Temukan Karir Impianmu di LOXER',
            subtitle: 'Lamar lebih cepat, rekrut lebih cerdas, dan kelola proses hiring dalam satu platform lokal mandiri.',
            primaryButtonText: 'Mulai Sekarang',
            primaryButtonHref: '/register',
            secondaryButtonText: 'Masuk',
            secondaryButtonHref: '/login',
            backgroundColor: '#0f172a',
          },
        },
        {
          type: 'FeatureGrid',
          props: {
            sectionTitle: 'Semua yang kamu butuhkan untuk hiring',
            sectionSubtitle: 'Edit bagian ini langsung dari visual editor tanpa sentuh kode.',
            cardOneTitle: 'Pencarian Cepat',
            cardOneDescription: 'Cari kandidat atau lowongan berdasarkan keyword, skill, dan lokasi.',
            cardTwoTitle: 'Tracking Lamaran',
            cardTwoDescription: 'Pantau status pelamar real-time dari review, interview, hingga penawaran.',
            cardThreeTitle: 'Panel Admin Terintegrasi',
            cardThreeDescription: 'Kelola peran pengguna, moderasi, audit log, dan analitik lengkap.',
          },
        },
      ],
    };

    execute(
      'INSERT INTO pages (id, slug, data, published_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [crypto.randomUUID(), 'homepage', JSON.stringify(defaultData), now, now]
    );
    console.log('✅ Konten CMS homepage bawaan berhasil disimpan.');
  }

  // 6. Seed Feature Flags
  const flagCount = queryOne('SELECT count(*) as c FROM feature_flags');
  if (!flagCount || flagCount.c === 0) {
    const defaultFlags = [
      { key: 'ai_job_scoring', label: 'AI Job Scoring', description: 'Skor kecocokan kandidat otomatis', enabled: 1 },
      { key: 'employer_verification', label: 'Employer Verification', description: 'Wajib verifikasi profil perusahaan', enabled: 1 },
      { key: 'new_seeker_ui', label: 'New Seeker UI', description: 'Desain layout antarmuka baru pelamar', enabled: 1 },
    ];
    for (const f of defaultFlags) {
      execute(
        'INSERT INTO feature_flags (id, key, label, description, enabled, rollout_pct, updated_at) VALUES (?, ?, ?, ?, ?, 100, ?)',
        [crypto.randomUUID(), f.key, f.label, f.description, f.enabled, now]
      );
    }
    console.log('✅ Feature flags bawaan berhasil diinisialisasi.');
  }

  // 7. Seed Demo Interview Invitation
  const demoApp = queryOne('SELECT id, status FROM applications LIMIT 1');
  if (demoApp) {
    const existingInv = queryOne('SELECT id FROM interview_invitations WHERE application_id = ?', [demoApp.id]);
    if (!existingInv) {
      const interviewDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      execute(
        `INSERT INTO interview_invitations (id, application_id, scheduled_at, location_or_link, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          demoApp.id,
          interviewDate,
          'https://meet.google.com/lox-demo-interview',
          'Harap menyiapkan laptop dengan webcam aktif, portofolio proyek terbaru, dan koneksi internet stabil.',
          now,
        ]
      );
      execute("UPDATE applications SET status = 'interview_scheduled' WHERE id = ?", [demoApp.id]);
      console.log('✅ Demo Undangan Interview dijadwalkan.');
    }
  }

  // 8. Seed Analytics Snapshots
  const snapCount = queryOne('SELECT count(*) as c FROM analytics_snapshots');
  if (!snapCount || snapCount.c === 0) {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = d.toISOString().slice(0, 10);
      execute(
        `INSERT OR IGNORE INTO analytics_snapshots (id, snapshot_date, total_users, new_users, active_users, total_jobs, new_jobs, total_apps, new_apps, conversion_rate, avg_time_to_hire, platform_score, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(),
          dateStr,
          4 + (6 - i) * 2,
          2,
          3 + (6 - i),
          3,
          1,
          1 + (6 - i),
          1,
          75.0,
          4.5,
          85,
          d.toISOString(),
        ]
      );
    }
    console.log('✅ 7 Hari data analytics_snapshots berhasil diinisialisasi.');
  }

  // 9. Seed Moderation Queue
  const modCount = queryOne('SELECT count(*) as c FROM moderation_queue');
  if (!modCount || modCount.c === 0) {
    const firstJob = queryOne('SELECT id FROM job_listings LIMIT 1');
    if (firstJob) {
      execute(
        `INSERT INTO moderation_queue (id, entity_type, entity_id, reason, ai_score, ai_flags, status, risk_score, flags, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [
          crypto.randomUUID(),
          'job',
          firstJob.id,
          'Verifikasi otomatis lowongan baru terbitan employer',
          0.85,
          '["verified_employer"]',
          15,
          '["verified_employer"]',
          now,
        ]
      );
      console.log('✅ Item antrean moderasi demo berhasil diinisialisasi.');
    }
  }

  console.log('🎉 Database lokal LOXER siap digunakan!');
}

// Run when executed directly
if (process.argv[1]?.endsWith('seed-local.mjs')) {
  seedDatabase().catch((e) => {
    console.error('❌ Gagal menjalankan seeder:', e);
    process.exit(1);
  });
}
