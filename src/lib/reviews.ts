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
  'Siti', 'Dewi', 'Nining', 'Rina', 'Euis', 'Fitri', 'Yulia', 'Anisa', 'Nurul', 'Nabila',
  'Intan', 'Wulan', 'Sinta', 'Puspita', 'Rizka', 'Tari', 'Kartika', 'Rani', 'Vina', 'Lina',
];

const maleFirstNames = [
  'Asep', 'Dadan', 'Cecep', 'Hendra', 'Agus', 'Fajar', 'Dani', 'Iqbal', 'Taufik', 'Rizky',
  'Bima', 'Yoga', 'Ardi', 'Farhan', 'Dimas', 'Eko', 'Galih', 'Bayu', 'Ilham', 'Bagus',
];

const lastNames = [
  'Hendrawan', 'Rahmawati', 'Nugraha', 'Sumartini', 'Setiawan', 'Lestari', 'Mulyana', 'Anggraeni',
  'Ramadhan', 'Kartika', 'Kurnia', 'Handayani', 'Iskandar', 'Maharani', 'Pratama', 'Wulandari',
  'Hidayat', 'Hidayati', 'Santoso', 'Wijaya', 'Kusuma', 'Saputra', 'Cahyani', 'Permata',
];

const companies = [
  'PT Sanbe Farma (Cimahi)',
  'MyRepublic Internet Provider',
  'Borma Toserba (Bandung)',
  'PT Kahatex (Bandung)',
  'PT Ultra Jaya Milk (Padalarang)',
  'Toserba Yogya (Cimahi)',
  'PT Chitose Internasional (Cimahi)',
  'PT Medion Farma Jaya (Bandung)',
  'PT Stanli Bahan Kue (Bandung)',
  'PT Sansan Saudaratex Jaya (Cimahi)',
  'PT Ateja Tritunggal (Padalarang)',
  'PT Ceres / Delfi (Bandung)',
  'MyRepublic Internet Provider',
  'PT Gistex Textile (Cimahi)',
  'PT Sanbe Farma (Bandung)',
  'Borma Toserba (Cimahi)',
  'PT Combiphar (Padalarang)',
  'Toserba Yogya (Bandung)',
];

const roles = [
  'Operator Produksi',
  'Kasir Toko',
  'Teknisi Lapangan (Fiber Optic)',
  'Karyawan Produksi',
  'Anggota Satpam / Security',
  'Pramuniaga Toko',
  'Operator Perakitan',
  'Quality Control (QC) Line',
  'Staff Gudang & Packer',
  'Operator Jahit & Finishing',
  'Teknisi Maintenance Mesin',
  'Staff Packing & Sortir',
  'Staff Penarikan Kabel FO',
  'Admin Gudang Logistik',
  'Petugas Keamanan / Satpam',
  'Staff Display Toko',
  'Driver / Kurir Pengiriman',
  'Kasir Supermarket',
];

const templates = [
  'Alhamdulillah lewat LOXER langsung dapat panggilan kerja di {company}. Prosesnya resmi, transparan, dan tanpa pungutan biaya sama sekali.',
  'Dapat info lowongan di {company} dari LOXER. Jam kerja dan gajinya jelas sejak awal. Kirim berkas hari Senin, Rabu sudah interview.',
  'Proses rekrutmen di {company} via LOXER cepat banget. Notifikasi jadwal tes langsung masuk ke WhatsApp dan email.',
  'Cari kerja pabrik di area Bandung dan Cimahi sekarang jauh lebih gampang lewat LOXER, langsung tembus ke HRD tanpa lewat perantara/calo.',
  'Setelah habis kontrak kerja, saya coba apply di {company} lewat LOXER. Sistemnya rapi dan progres lamarannya selalu terupdate.',
  'Senang banget bisa keterima kerja di {company} dekat domisili. Di LOXER filternya pas, jadi bisa hemat ongkos transportasi harian.',
  'Lamaran ke {company} langsung direspons tim HRD. Wawancaranya tertib dan profesional. Wajib pakai LOXER buat pencari kerja lokal.',
  'Informasi kualifikasi kerja di {company} sangat transparan. Cukup sekali lengkapi profil di LOXER tanpa perlu sebar map berkas fisik ke mana-mana.',
  'Daftar lowongan di {company} prosesnya rapi dan jelas. Nggak ada biaya administrasi, deskripsi kerjanya juga sesuai dengan di lapangan.',
  'Bagus aplikasinya, info loker area Cimahi & Bandung banyak yang resmi di sini. Dari tes sampai tanda tangan kontrak terpantau lancar.',
];

const curatedReviews: ReviewItem[] = [
  {
    id: 'review-alfa-1',
    name: 'Asep Hendrawan',
    gender: 'male',
    company: 'Alfamart (Cimahi)',
    role: 'Store Crew / Kasir',
    text: 'Lamar posisi store crew Alfamart Cimahi lewat LOXER prosesnya cepat banget. Notifikasi jadwal interview langsung masuk ke HP. Tanpa biaya apa pun dan sekarang udah kerja tetap.',
    rating: 5,
    avatarPath: '/reviews/avatars/a-046.png',
  },
  {
    id: 'review-indo-1',
    name: 'Nabila Ramadhan',
    gender: 'female',
    company: 'Indomaret (Bandung)',
    role: 'Kasir Toko',
    text: 'Dapat info loker kasir Indomaret Buahbatu dari LOXER. Range gaji dan jadwal shift-nya transparan. Begitu kirim lamaran, 2 hari kemudian langsung dipanggil interview dan training.',
    rating: 5,
    avatarPath: '/reviews/avatars/a-001.png',
  },
  {
    id: 'review-satpam-1',
    name: 'Supriadi Rahman',
    gender: 'male',
    company: 'PT Ultra Jaya Milk (Padalarang)',
    role: 'Anggota Satpam / Security',
    text: 'Alhamdulillah setelah habis kontrak lama, saya apply posisi satpam di PT Ultra Jaya Padalarang lewat LOXER. Seleksinya resmi, transparan, dan tidak ada calo sama sekali.',
    rating: 5,
    avatarPath: '/reviews/avatars/avatar-satpam.jpg',
  },
  {
    id: 'review-sanbe-1',
    name: 'Dewi Rahayu',
    gender: 'female',
    company: 'PT Sanbe Farma (Cimahi)',
    role: 'Operator Produksi Farmasi',
    text: 'Diterima jadi operator produksi di pabrik Sanbe Farma Cimahi berkat LOXER. Dari tes fisik, MCU sampai tanda tangan kontrak semua infonya update jelas di aplikasi.',
    rating: 5,
    avatarPath: '/reviews/avatars/avatar-sanbe-operator.jpg',
  },
  {
    id: 'review-myrep-1',
    name: 'Rizal Kurniawan',
    gender: 'male',
    company: 'MyRepublic Internet Provider',
    role: 'Teknisi Lapangan (Fiber Optic)',
    text: 'Bagi yang cari kerja lapangan, LOXER terbukti valid. Lamar tim instalasi dan teknisi FO MyRepublic Bandung cuma butuh 4 hari sampai dapat panggilan kerja resmi.',
    rating: 5,
    avatarPath: '/reviews/avatars/avatar-myrepublic-tech.jpg',
  },
  {
    id: 'review-yogya-1',
    name: 'Putri Wulandari',
    gender: 'female',
    company: 'Toserba Yogya (Cimahi)',
    role: 'Kasir Supermarket',
    text: 'Senang banget bisa keterima di Yogya Plaza Cimahi dekat rumah. Di LOXER filternya akurat sampai level kecamatan, jadi nggak pusing mikir ongkos jalan kerja.',
    rating: 5,
    avatarPath: '/reviews/avatars/avatar-yogya-kasir.jpg',
  },
  {
    id: 'review-tech-1',
    name: 'Budi Hermawan',
    gender: 'male',
    company: 'PT Ateja Tritunggal (Padalarang)',
    role: 'Teknisi Maintenance Mesin',
    text: 'Jarang ada aplikasi loker yang nyediain posisi teknisi pabrik selengkap ini di Bandung Barat. LOXER ngebantu saya dapat kerjaan di PT Ateja dengan gaji UMK pasti.',
    rating: 5,
    avatarPath: '/reviews/avatars/avatar-teknisi-maintenance.jpg',
  },
  {
    id: 'review-textile-1',
    name: 'Sarah Ayu Lestari',
    gender: 'female',
    company: 'PT Kahatex (Bandung)',
    role: 'Operator Jahit & Produksi',
    text: 'Cari kerja pabrik tekstil di Rancaekek biasanya ribet lewat perantara. Lewat LOXER berkas langsung masuk ke HRD PT Kahatex, seminggu kemudian langsung MCU.',
    rating: 5,
    avatarPath: '/reviews/avatars/avatar-pabrik-tekstil.jpg',
  },
  {
    id: 'review-gudang-1',
    name: 'Fajar Ramadhan',
    gender: 'male',
    company: 'PT Stanli Bahan Kue (Bandung)',
    role: 'Staff Gudang & Packer',
    text: 'Daftar packer di PT Stanli Kopo lewat LOXER prosesnya rapi banget. Nggak ada biaya formulir atau pungli apa pun. Kerjaannya jelas sesuai deskripsi lowongan.',
    rating: 5,
    avatarPath: '/reviews/avatars/avatar-gudang-packer.jpg',
  },
  {
    id: 'review-alfa-2',
    name: 'Siti Amelia',
    gender: 'female',
    company: 'Alfamart (Bandung)',
    role: 'Pramuniaga Store',
    text: 'Apply kasir & pramuniaga Alfamart Kopo lewat LOXER praktis banget. Profil kita langsung jadi CV. Besoknya langsung diundang psikotes dan sekarang sudah jalan 4 bulan.',
    rating: 5,
    avatarPath: '/reviews/avatars/a-002.png',
  },
  {
    id: 'review-borma-1',
    name: 'Dadan Mulyana',
    gender: 'male',
    company: 'Borma Toserba (Cimahi)',
    role: 'Staff Display & Store Crew',
    text: 'Dapat info loker crew Borma Toserba Kerkof Cimahi dari LOXER. Jam kerja dan gajinya jelas sejak awal. Kirim berkas hari Senin, Rabu sudah interview.',
    rating: 5,
    avatarPath: '/reviews/avatars/avatar-borma-store.jpg',
  },
  {
    id: 'review-indo-2',
    name: 'Rina Anggraeni',
    gender: 'female',
    company: 'Indomaret (Cimahi)',
    role: 'Pramuniaga Toko',
    text: 'Alhamdulillah sekarang sudah kerja di Indomaret Baros Cimahi. Dari pertama buat akun LOXER sampai keterima cuma butuh 2 minggu. Sangat terbantu!',
    rating: 5,
    avatarPath: '/reviews/avatars/a-011.png',
  },
  {
    id: 'review-pertamina-1',
    name: 'Agus Pratama',
    gender: 'male',
    company: 'SPBU Pertamina (Bandung)',
    role: 'Operator SPBU',
    text: 'Daftar operator SPBU Pertamina area Soekarno-Hatta lewat LOXER resmi dan gratis. Nggak ada calo, langsung tes wawancara dan training pengisian BBM.',
    rating: 5,
    avatarPath: '/reviews/avatars/a-049.png',
  },
  {
    id: 'review-pertamina-2',
    name: 'Yulia Maharani',
    gender: 'female',
    company: 'Pertamina (Bandung)',
    role: 'Admin Operasional',
    text: 'Informasi lowongan kerja admin di Pertamina sangat transparan di LOXER. Cukup sekali lengkapi profil tanpa perlu sebar map berkas fisik ke mana-mana.',
    rating: 5,
    avatarPath: '/reviews/avatars/a-004.png',
  },
  {
    id: 'review-satpam-2',
    name: 'Cecep Hidayat',
    gender: 'male',
    company: 'PT Sanbe Farma (Bandung)',
    role: 'Petugas Keamanan / Satpam',
    text: 'Daftar satpam di Sanbe Farma Tamansari lewat LOXER gratis tanpa dipungut sepeser pun. Tim HRD responsif dan tes fisik terjadwal dengan sangat tertib.',
    rating: 5,
    avatarPath: '/reviews/avatars/avatar-satpam.jpg',
  },
  {
    id: 'review-honda-1',
    name: 'Intan Kusuma',
    gender: 'female',
    company: 'Dealer Honda (Cimahi)',
    role: 'Frontliner / Customer Care',
    text: 'Proses rekrutmen di dealer Honda Cimahi via LOXER cepat dan jelas. Notifikasi jadwal interview langsung masuk ke email dan WhatsApp.',
    rating: 5,
    avatarPath: '/reviews/avatars/a-003.png',
  },
  {
    id: 'review-unilever-1',
    name: 'Taufik Hidayat',
    gender: 'male',
    company: 'Unilever Indonesia',
    role: 'Sales Merchandiser',
    text: 'Dapat lowongan field sales Unilever area Bandung dari LOXER. Info rute dan komisi detail banget. Sekarang kerjaan tetap udah aman buat keluarga.',
    rating: 5,
    avatarPath: '/reviews/avatars/a-053.png',
  },
  {
    id: 'review-telkomsel-1',
    name: 'Nurul Hasanah',
    gender: 'female',
    company: 'Telkomsel (Bandung)',
    role: 'Customer Service',
    text: 'Apply posisi customer service GraPARI Telkomsel Bandung lancar banget lewat LOXER. Dashboard lamarannya informatif dan selalu update.',
    rating: 5,
    avatarPath: '/reviews/avatars/a-005.png',
  },
];

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

export function buildReviews(count = 18): ReviewItem[] {
  if (count <= curatedReviews.length) {
    return curatedReviews.slice(0, count);
  }

  const items: ReviewItem[] = [...curatedReviews];
  const femaleIndices = [1, 3, 7, 12, 16, 21, 28, 35, 42];
  const maleIndices = [46, 49, 53, 58, 62, 67, 71, 76, 80];

  for (let i = curatedReviews.length; i < count; i += 1) {
    const isFemale = i % 2 === 0;
    const listIndex = Math.floor(i / 2);
    const avatarIndex = isFemale
      ? femaleIndices[listIndex % femaleIndices.length]
      : maleIndices[listIndex % maleIndices.length];

    const gender: Gender = isFemale ? 'female' : 'male';
    const company = getCompany(i + 1);

    items.push({
      id: `review-${avatarIndex}-${i}`,
      name: getName(i + 1, gender),
      gender,
      company,
      role: getRole(i + 1),
      text: getReviewText(i + 1, company),
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

export const allReviews = buildReviews(18);
