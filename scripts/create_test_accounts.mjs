/**
 * Script untuk membuat atau memperbarui akun uji coba role Perusahaan dan Pekerja di LOXER.
 */
import { getLocalDb, hashPassword, queryOne, execute } from '../server/localDb.js';
import crypto from 'node:crypto';

async function main() {
  getLocalDb(); // initialize DB

  const accounts = [
    {
      type: 'employer',
      email: 'perusahaan@loxer.id',
      aliasEmail: 'demo.perusahaan@loxer.web.id',
      password: 'LoxerEmployer2026!',
      role: 'employer',
      companyName: 'PT LOXER Mitra Prima',
      industry: 'Teknologi & Bisnis Digital',
      city: 'Kota Bandung',
      description: 'Perusahaan mitra resmi LOXER untuk pengujian fitur posting loker, seleksi kandidat, dan evaluasi hasil wawancara AI.',
      website: 'https://loxer.web.id',
      employeeCount: '50-100 Karyawan',
    },
    {
      type: 'seeker',
      email: 'pekerja@loxer.id',
      aliasEmail: 'demo.pekerja@loxer.web.id',
      password: 'LoxerSeeker2026!',
      role: 'seeker',
      fullName: 'Budi Pratama Santoso',
      phone: '081234567890',
      city: 'Kota Bandung',
      about: 'Kandidat profesional berdedikasi tinggi dengan pengalaman di bidang operasional, administrasi, dan layanan pelanggan.',
      salaryMin: 4500000,
      salaryMax: 6500000,
    },
  ];

  console.log('--- MEMBUAT AKUN UJI COBA LOXER ---');

  for (const acc of accounts) {
    const emailsToRegister = [acc.email, acc.aliasEmail];
    const passwordHash = hashPassword(acc.password);

    for (const email of emailsToRegister) {
      let existingUser = queryOne('SELECT id FROM users WHERE email = ?', [email]);
      let userId;

      if (existingUser) {
        userId = existingUser.id;
        execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
        execute('UPDATE users_meta SET role = ?, is_banned = 0 WHERE id = ?', [acc.role, userId]);
        console.log(`[UPDATE] Akun ${acc.role.toUpperCase()}: ${email}`);
      } else {
        userId = crypto.randomUUID();
        const now = new Date().toISOString();
        execute('INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)', [
          userId,
          email,
          passwordHash,
          now,
        ]);
        execute('INSERT INTO users_meta (id, email, role, created_at, is_banned) VALUES (?, ?, ?, ?, 0)', [
          userId,
          email,
          acc.role,
          now,
        ]);
        console.log(`[CREATE] Akun ${acc.role.toUpperCase()}: ${email}`);
      }

      // Profile details
      if (acc.type === 'employer') {
        const existingCompany = queryOne('SELECT id FROM companies WHERE user_id = ?', [userId]);
        const companyId = existingCompany ? existingCompany.id : crypto.randomUUID();
        const now = new Date().toISOString();

        if (existingCompany) {
          execute(
            `UPDATE companies 
             SET name = ?, industry = ?, city = ?, description = ?, website = ?, employee_count = ?, verified = 1, updated_at = ?
             WHERE id = ?`,
            [acc.companyName, acc.industry, acc.city, acc.description, acc.website, acc.employeeCount, now, companyId]
          );
        } else {
          execute(
            `INSERT INTO companies (id, user_id, name, industry, city, description, website, employee_count, verified, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [companyId, userId, acc.companyName, acc.industry, acc.city, acc.description, acc.website, acc.employeeCount, now, now]
          );
        }

        const existingMember = queryOne('SELECT id FROM company_members WHERE company_id = ? AND user_id = ?', [companyId, userId]);
        if (!existingMember) {
          execute(
            `INSERT INTO company_members (id, company_id, user_id, role, created_at)
             VALUES (?, ?, ?, 'owner', ?)`,
            [crypto.randomUUID(), companyId, userId, now]
          );
        }
      } else if (acc.type === 'seeker') {
        const existingProfile = queryOne('SELECT id FROM seeker_profiles WHERE user_id = ?', [userId]);
        const profileId = existingProfile ? existingProfile.id : crypto.randomUUID();
        const now = new Date().toISOString();

        if (existingProfile) {
          execute(
            `UPDATE seeker_profiles
             SET full_name = ?, phone = ?, domicile_city = ?, about = ?, expected_salary_min = ?, expected_salary_max = ?, updated_at = ?
             WHERE id = ?`,
            [acc.fullName, acc.phone, acc.city, acc.about, acc.salaryMin, acc.salaryMax, now, profileId]
          );
        } else {
          execute(
            `INSERT INTO seeker_profiles (id, user_id, full_name, phone, domicile_city, about, expected_salary_min, expected_salary_max, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [profileId, userId, acc.fullName, acc.phone, acc.city, acc.about, acc.salaryMin, acc.salaryMax, now, now]
          );
        }
      }
    }
  }

  console.log('--- SELESAI MEMBUAT AKUN UJI COBA ---');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
