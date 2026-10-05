import crypto from 'node:crypto';
import {
  getLocalDb,
  queryOne,
  execute,
  hashPassword,
} from '../server/localDb.js';

// KEBIJAKAN: Hanya user yang mendaftar mandiri yang boleh ada di tabel users.
// Akun dummy/demo tidak lagi dibuat oleh seed script.

export async function seedDatabase() {
  console.log('🌱 Menyiapkan seeder database lokal LOXER...');
  getLocalDb(); // ensure tables exist

  const now = new Date().toISOString();

  // 1. Seed Default Super Admin (vrintex)
  const VRINTEX_USER = 'vrintex';
  let vrintexAdmin = queryOne('SELECT id FROM users WHERE email = ?', [VRINTEX_USER]);
  const vrintexHash = hashPassword('kayaraya3+');
  if (!vrintexAdmin) {
    const vrintexId = crypto.randomUUID();
    execute('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)', [
      vrintexId,
      VRINTEX_USER,
      vrintexHash,
      now,
    ]);
    execute('INSERT INTO users_meta (id, email, role, created_at, is_banned) VALUES (?, ?, ?, ?, 0)', [
      vrintexId,
      VRINTEX_USER,
      'admin',
      now,
    ]);
    console.log(`✅ Super Admin vrintex dibuat: ${VRINTEX_USER} (password: kayaraya3+)`);
  } else {
    execute('UPDATE users SET password_hash = ? WHERE email = ?', [vrintexHash, VRINTEX_USER]);
    execute("UPDATE users_meta SET role = 'admin' WHERE id = ?", [vrintexAdmin.id]);
    console.log(`ℹ️ Super Admin vrintex diperbarui: ${VRINTEX_USER} (password: kayaraya3+)`);
  }

  // Also ensure fixed root admin (admin-vrintex-root) exists for simulator/bypass authentication
  execute(
    'INSERT OR IGNORE INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)',
    ['admin-vrintex-root', 'vrintex@loxer.app', vrintexHash, now]
  );
  execute(
    "INSERT OR IGNORE INTO users_meta (id, email, role, created_at, is_banned) VALUES (?, ?, 'superadmin', ?, 0)",
    ['admin-vrintex-root', 'vrintex@loxer.app', now]
  );

  // DIHAPUS: Akun admin legacy (loxer-admin-*@example.com) tidak lagi dibuat.
  // Hanya user yang mendaftar mandiri yang boleh ada di tabel users.

  // DIHAPUS: Akun demo employer (employer@demo.com) tidak lagi dibuat.
  // Hanya user yang mendaftar mandiri yang boleh ada di tabel users.
  // Jika perlu demo, gunakan script --demo secara terpisah.
  const companyId = null;

  // 3. Seed Demo Job Listings (Hanya jika flag --demo disertakan)
  const isDemoEnabled = process.argv.includes('--demo');
  if (isDemoEnabled && companyId) {
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

  // DIHAPUS: Akun demo seeker (seeker@demo.com) tidak lagi dibuat.
  // Hanya user yang mendaftar mandiri yang boleh ada di tabel users.
  // Data talent di Bursa (seeker_profiles) bisa diisi via fitur Smart Add CV tanpa membuat akun user.

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

  // 10. Seed Talent Marketplace Posts (Hanya jika flag --demo disertakan)
  const existingTalents = queryOne('SELECT count(*) as c FROM talent_marketplace_posts');
  if (isDemoEnabled && (!existingTalents || existingTalents.c === 0)) {
    const demoTalents = [
      {
        fullName: 'Arifin Ahmad',
        email: 'arifin.ahmad@example.com',
        headline: 'Senior Fullstack Engineer (React, TypeScript & Node.js)',
        category: 'Teknologi & IT',
        bio: 'Pengembang web & mobile dengan 4+ tahun pengalaman membangun aplikasi SaaS terukur, integrasi payment gateway, dan arsitektur database performa tinggi. Siap kerja full-time maupun freelance.',
        skills: JSON.stringify(['React', 'TypeScript', 'Node.js', 'Tailwind CSS', 'PostgreSQL', 'Docker']),
        expYears: 4,
        salary: 14000000,
        rateType: 'monthly',
        city: 'Bandung',
        phone: '6283821955288',
        badge: 'TOP TALENT',
        workTypes: JSON.stringify(['full-time', 'freelance', 'remote']),
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
      },
      {
        fullName: 'Agus Sanusi',
        email: 'agus.sanusi@example.com',
        headline: 'Staff Akuntansi & Perpajakan (Brevet AB Terakreditasi)',
        category: 'Keuangan & Akuntansi',
        bio: 'Praktisi keuangan dengan ketelitian tinggi dalam pembukuan, rekonsiliasi bank, pelaporan SPT masa/tahunan, dan audit internal. Mahir menggunakan Accurate & SAP.',
        skills: JSON.stringify(['Accurate', 'SAP', 'Pph 21/23', 'Laporan Keuangan', 'Microsoft Excel']),
        expYears: 3,
        salary: 7500000,
        rateType: 'monthly',
        city: 'Jakarta Selatan',
        phone: '6285659095369',
        badge: 'SIAP KERJA',
        workTypes: JSON.stringify(['full-time', 'hybrid']),
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
      },
      {
        fullName: 'Puji Prayitno',
        email: 'puji.prayitno@example.com',
        headline: 'Product Designer (UI/UX) & Design System Specialist',
        category: 'Desain & Kreatif',
        bio: 'UI/UX Designer fokus pada user engagement, prototipe micro-interactions, dan standarisasi sistem komponen modern di Figma. Portofolio mencakup 8+ aplikasi marketplace & fintech.',
        skills: JSON.stringify(['Figma', 'UI/UX', 'Design System', 'Prototyping', 'User Research']),
        expYears: 3,
        salary: 9500000,
        rateType: 'monthly',
        city: 'Cimahi',
        phone: '6287821775917',
        badge: 'FREELANCER',
        workTypes: JSON.stringify(['freelance', 'remote', 'contract']),
        photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=250',
      },
      {
        fullName: 'Sulis Setiawati',
        email: 'sulis.setiawati@example.com',
        headline: 'Digital Marketing & Performance Ads Specialist',
        category: 'Pemasaran & Media',
        bio: 'Spesialis periklanan Meta Ads, Google Ads, dan TikTok Ads dengan rekam jejak ROAS 4.2x. Mahir menganalisis funnel konversi web, riset audiens, dan optimasi konten viral.',
        skills: JSON.stringify(['Meta Ads', 'Google Ads', 'TikTok Marketing', 'SEO Content', 'Copywriting']),
        expYears: 2,
        salary: 6500000,
        rateType: 'monthly',
        city: 'Surabaya',
        phone: '6285732111396',
        badge: 'SIAP KERJA',
        workTypes: JSON.stringify(['full-time', 'remote']),
        photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=250',
      },
      {
        fullName: 'Kak Hilman',
        email: 'hilman.pratama@example.com',
        headline: 'Mobile App Developer (Flutter & Android Native)',
        category: 'Teknologi & IT',
        bio: 'Pengembang mobile berpengalaman merilis 5+ aplikasi ke Google Play & App Store. Ahli state management Bloc/Provider, offline local database caching, dan push notifications.',
        skills: JSON.stringify(['Flutter', 'Dart', 'Android SDK', 'REST API', 'Firebase', 'SQLite']),
        expYears: 4,
        salary: 12000000,
        rateType: 'monthly',
        city: 'Jakarta Barat',
        phone: '628980589468',
        badge: 'TOP TALENT',
        workTypes: JSON.stringify(['full-time', 'contract', 'freelance']),
        photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
      },
      {
        fullName: 'Harry Agustian',
        email: 'harry.agustian@example.com',
        headline: 'Operations & Customer Success Lead',
        category: 'Operasional & CS',
        bio: 'Pengalaman memimpin tim helpdesk dan customer care lebih dari 3 tahun dengan CSAT rating 98%. Fasih komunikasi bisnis, penanganan komplain cepat, dan Zendesk CRM.',
        skills: JSON.stringify(['Customer Service', 'CRM Zendesk', 'Problem Solving', 'Leadership', 'Omnichannel']),
        expYears: 3,
        salary: 6000000,
        rateType: 'monthly',
        city: 'Tangerang',
        phone: '6281546917718',
        badge: 'VERIFIED',
        workTypes: JSON.stringify(['full-time', 'shift']),
        photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250',
      },
    ];

    for (const t of demoTalents) {
      let u = queryOne('SELECT id FROM users WHERE email = ?', [t.email]);
      let uId = u?.id;
      if (!uId) {
        uId = crypto.randomUUID();
        const pwdHash = hashPassword('seeker123');
        execute('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)', [
          uId,
          t.email,
          pwdHash,
          now,
        ]);
        execute('INSERT INTO users_meta (id, email, role, created_at, is_banned) VALUES (?, ?, ?, ?, 0)', [
          uId,
          t.email,
          'seeker',
          now,
        ]);
      }

      let p = queryOne('SELECT id FROM seeker_profiles WHERE user_id = ?', [uId]);
      let pId = p?.id;
      if (!pId) {
        pId = crypto.randomUUID();
        execute(
          `INSERT INTO seeker_profiles (id, user_id, full_name, photo_url, domicile_city, about, phone, expected_salary_min, expected_salary_max, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pId,
            uId,
            t.fullName,
            t.photo,
            t.city,
            t.bio,
            t.phone,
            t.salary,
            Math.round(t.salary * 1.3),
            now,
            now,
          ]
        );
      }

      execute(
        `INSERT INTO talent_marketplace_posts (id, seeker_id, user_id, headline, category, bio_summary, skills, experience_years, availability_status, work_types, expected_salary, rate_type, domicile_city, whatsapp_number, portfolio_url, resume_url, badge, photo_url, views_count, is_published, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?, ?, ?, ?, ?, '', ?, ?, ?, 1, ?, ?)`,
        [
          crypto.randomUUID(),
          pId,
          uId,
          t.headline,
          t.category,
          t.bio,
          t.skills,
          t.expYears,
          t.workTypes,
          t.salary,
          t.rateType,
          t.city,
          t.phone,
          'https://github.com',
          t.badge,
          t.photo,
          Math.floor(Math.random() * 80) + 20,
          now,
          now,
        ]
      );
    }
    console.log(`✅ ${demoTalents.length} Postingan Talent Marketplace demo berhasil ditambahkan.`);
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
