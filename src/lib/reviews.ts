type Gender = 'female' | 'male';

export interface ReviewItem {
  id: string;
  name: string;
  gender: Gender;
  company: string;
  role: string;
  text: string;
  rating: number;
  avatarPath: string;
}

const femaleFirstNames = [
  'Sari', 'Dewi', 'Maya', 'Nining', 'Rina', 'Dian', 'Ayu', 'Intan', 'Sarah', 'Putri',
  'Melati', 'Yulia', 'Anisa', 'Lina', 'Nurul', 'Nadia', 'Nabila', 'Alea', 'Rani', 'Vina',
  'Nita', 'Tari', 'Wulan', 'Sinta', 'Puspita', 'Rizka', 'Fani', 'Dea', 'Kartika', 'Alia',
];

const maleFirstNames = [
  'Rizky', 'Bima', 'Rafi', 'Yoga', 'Ardi', 'Fajar', 'Adit', 'Farhan', 'Iqbal', 'Johan',
  'Asep', 'Bagus', 'Dimas', 'Eko', 'Hendra', 'Reza', 'Kevin', 'Rio', 'Taufik', 'Galih',
  'Andra', 'Bintang', 'Bayu', 'Arman', 'Lutfi', 'Ilham', 'Fikri', 'Denny', 'Ari', 'Agus',
];

const lastNames = [
  'Pratama', 'Saputra', 'Siregar', 'Wibowo', 'Santoso', 'Nugroho', 'Wijaya', 'Permata',
  'Putri', 'Lestari', 'Kusuma', 'Maharani', 'Ramadhan', 'Nugraha', 'Hidayat', 'Mulia',
  'Anindya', 'Setiawan', 'Cahyani', 'Rahmawati', 'Kurniawan', 'Utami', 'Amelia', 'Khairunnisa',
];

const companies = [
  'Alfamart', 'Indomaret', 'Pertamina', 'Telkomsel', 'BCA', 'Honda', 'Garuda Indonesia',
  'Unilever', 'Indofood', 'Gojek', 'Grab', 'Mandiri', 'BNI', 'Bukalapak', 'Shopee',
];

const roles = [
  'Kasir', 'Customer Service', 'Admin Operasional', 'Supervisor', 'Sales Associate',
  'Frontliner', 'Call Center Agent', 'Staf Keuangan', 'HR Staff', 'Field Officer',
  'Quality Control', 'Brand Representative', 'Account Executive', 'Tim Support',
];

const templates = [
  'Proses rekrutmen di LOXER cepat dan jelas. Saya bisa pilih lowongan {company} yang cocok dalam hitungan menit.',
  'UI-nya mudah dipahami. Setelah apply lewat LOXER, saya langsung dapat update status dari tim {company}.',
  'Paling membantu saat cari kerja adalah filter kota dan skill. Akhirnya saya diterima di {company}.',
  'Dari upload profil sampai interview invitation semuanya rapi. Terima kasih LOXER dan {company}.',
  'Notifikasi real-time membantu sekali. Saya tidak ketinggalan jadwal interview dengan {company}.',
  'Saya suka karena datanya transparan, range gaji terlihat, dan proses seleksi {company} jadi lebih nyaman.',
  'LOXER bikin proses apply terasa ringan. Sekali isi profil, bisa dipakai untuk banyak posisi di {company}.',
  'Buat fresh graduate seperti saya, alur di LOXER sangat menenangkan. Akhirnya dapat kesempatan di {company}.',
  'Dashboard pencari kerja sangat informatif. Progress lamaran ke {company} selalu update.',
  'Pengalaman pakai LOXER sangat positif. Dari pertama daftar sampai onboarding di {company} berjalan lancar.',
];

function getGenderByAvatarIndex(index: number): Gender {
  // 1-45 female, 46-81 male, 82-150 female (sesuai kelompok gambar sumber).
  if (index >= 46 && index <= 81) return 'male';
  return 'female';
}

function getName(index: number, gender: Gender) {
  const firstNames = gender === 'male' ? maleFirstNames : femaleFirstNames;
  const first = firstNames[(index * 5 + 1) % firstNames.length];
  const last = lastNames[(index * 7 + 3) % lastNames.length];
  return `${first} ${last}`;
}

function getCompany(index: number) {
  return companies[(index * 3 + 1) % companies.length];
}

function getRole(index: number) {
  return roles[(index * 5 + 2) % roles.length];
}

function getReviewText(index: number, company: string) {
  const template = templates[(index * 11 + 4) % templates.length];
  return template.replace('{company}', company);
}

function getAvatarPath(index: number) {
  return `/reviews/avatars/a-${String(index).padStart(3, '0')}.png`;
}

export function buildReviews(total = 150): ReviewItem[] {
  const items: ReviewItem[] = [];

  for (let avatarIndex = 1; avatarIndex <= total; avatarIndex += 1) {
    const gender = getGenderByAvatarIndex(avatarIndex);
    const company = getCompany(avatarIndex);

    items.push({
      id: `review-${avatarIndex}`,
      name: getName(avatarIndex, gender),
      gender,
      company,
      role: getRole(avatarIndex),
      text: getReviewText(avatarIndex, company),
      rating: 5,
      avatarPath: getAvatarPath(avatarIndex),
    });
  }

  return items;
}

const desktopMixPatterns: Gender[][] = [
  ['female', 'female', 'male'],
  ['female', 'male', 'female'],
  ['male', 'female', 'female'],
  ['male', 'male', 'female'],
  ['male', 'female', 'male'],
  ['female', 'male', 'male'],
];

export function arrangeReviewsForSlider(items: ReviewItem[]) {
  const femaleQueue = items.filter((item) => item.gender === 'female');
  const maleQueue = items.filter((item) => item.gender === 'male');
  const ordered: ReviewItem[] = [];
  let patternIndex = 0;

  while (femaleQueue.length > 0 || maleQueue.length > 0) {
    const pattern = desktopMixPatterns[patternIndex % desktopMixPatterns.length];
    const chunk: ReviewItem[] = [];

    for (const gender of pattern) {
      const source = gender === 'female' ? femaleQueue : maleQueue;
      const fallback = gender === 'female' ? maleQueue : femaleQueue;
      const nextItem = source.shift() ?? fallback.shift();

      if (nextItem) {
        chunk.push(nextItem);
      }
    }

    if (chunk.length === 0) break;

    ordered.push(...chunk);
    patternIndex += 1;
  }

  return ordered;
}

export const allReviews = buildReviews(150);
