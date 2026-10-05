/**
 * LOXER 3D Pixar Avatar & Gender Intelligence Service
 * Provides default 3D Pixar character avatars for candidates without passport photos,
 * matching their detected gender with high cultural accuracy for Indonesian names.
 */

export type GenderType = 'female' | 'male';

export const PIXAR_FEMALE_AVATARS = [
  '/avatars/pixar_female_1.jpg',
  '/avatars/pixar_female_2.jpg',
  '/avatars/pixar_female_red_1.jpg',
] as const;

export const PIXAR_MALE_AVATARS = [
  '/avatars/pixar_male_1.jpg',
  '/avatars/pixar_male_2.jpg',
] as const;

// Common female name indicators in Indonesia
const FEMALE_NAME_KEYWORDS = [
  'siti', 'nur', 'yuliana', 'yuli', 'yusni', 'ani', 'ana', 'wati', 'meisy', 'meisya',
  'seli', 'shely', 'indriyani', 'saskia', 'putri', 'dewi', 'ayu', 'lia', 'wulandari',
  'fitri', 'diah', 'indah', 'rahayu', 'novi', 'kartika', 'dian', 'retno', 'dwi',
  'lestari', 'tika', 'widya', 'nuraeni', 'ratna', 'maya', 'mega', 'amelia', 'fadila',
  'fatimah', 'aulia', 'safitri', 'anisa', 'annisa', 'mutiara', 'bella', 'shinta',
  'intan', 'desy', 'desi', 'vina', 'tari', 'eka', 'anggi', 'nadia', 'rachel', 'jessica',
  'clara', 'sarah', 'maria', 'nadya', 'elisa', 'tania', 'rere', 'nabila', 'syifa',
  'zahra', 'tiara', 'rizka', 'cantika', 'marsha', 'ratu', 'angela', 'chintya', 'fani',
  'fanny', 'nita', 'dina', 'rina', 'lina', 'tina', 'silvi', 'silvia', 'windy', 'winda',
  'sherly', 'sherlyn', 'triana', 'mita', 'septi', 'oktavia', 'agustina', 'kristina',
];

// Common male name indicators in Indonesia
const MALE_NAME_KEYWORDS = [
  'muhammad', 'mohammad', 'muh', 'ahmad', 'budi', 'hasanudin', 'hasan', 'hengky',
  'naufal', 'prama', 'pramaputra', 'hermansyah', 'rachmat', 'rachman', 'agung', 'agus',
  'rizky', 'rizki', 'fajar', 'hendra', 'andri', 'bayu', 'aditya', 'dimas', 'ilham',
  'dani', 'deni', 'arif', 'arifin', 'bagus', 'bagas', 'gilang', 'rendy', 'randy',
  'wahyu', 'taufik', 'irfan', 'donny', 'doni', 'rio', 'adi', 'anton', 'bambang',
  'eko', 'joko', 'surya', 'satria', 'firman', 'teguh', 'arya', 'angga', 'reza',
  'indra', 'hadi', 'lukman', 'yusuf', 'fauzi', 'zaki', 'fahmi', 'akbar', 'alif',
  'panji', 'yoga', 'rama', 'darma', 'wisnu', 'farhan', 'alvin', 'david', 'kevin',
  'daniel', 'michael', 'jason', 'andre', 'fadhil', 'iqbal', 'ilham', 'syahrul',
  'faisal', 'ridwan', 'triadi', 'yuda', 'yudi', 'septian', 'yanuar', 'firmansyah'
];

/**
 * Detect gender based on explicit input or analysis of full name and bio
 */
export function detectGender(
  fullName?: string,
  explicitGender?: string,
  bio?: string
): GenderType {
  if (explicitGender) {
    const g = explicitGender.toLowerCase().trim();
    if (g === 'female' || g === 'perempuan' || g === 'wanita' || g === 'p' || g === 'f') {
      return 'female';
    }
    if (g === 'male' || g === 'laki-laki' || g === 'pria' || g === 'l' || g === 'm') {
      return 'male';
    }
  }

  const combinedText = `${fullName || ''} ${bio || ''}`.toLowerCase();
  const words = combinedText
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  let femaleScore = 0;
  let maleScore = 0;

  for (const word of words) {
    if (FEMALE_NAME_KEYWORDS.includes(word)) {
      femaleScore += 2;
    }
    if (MALE_NAME_KEYWORDS.includes(word)) {
      maleScore += 2;
    }

    // Check typical Indonesian female suffixes
    if (word.length >= 4) {
      if (word.endsWith('wati') || word.endsWith('yani') || word.endsWith('aeni') || word.endsWith('tari') || word.endsWith('nita')) {
        femaleScore += 1.5;
      }
      if (word.endsWith('syah') || word.endsWith('din') || word.endsWith('wan') || word.endsWith('putra')) {
        maleScore += 1.5;
      }
    }
  }

  // Check bio keywords
  if (/\b(ibu|perempuan|wanita|hijab|siswi|santriwati)\b/i.test(combinedText)) {
    femaleScore += 3;
  }
  if (/\b(bapak|pria|laki-laki|santriwan|siswa)\b/i.test(combinedText)) {
    maleScore += 3;
  }

  return femaleScore > maleScore ? 'female' : 'male';
}

/**
 * Return consistent 3D Pixar avatar based on person name and gender
 */
export function getDefaultPixarAvatar(
  fullName?: string,
  explicitGender?: string,
  bio?: string
): string {
  const gender = detectGender(fullName, explicitGender, bio);
  const avatars = gender === 'female' ? PIXAR_FEMALE_AVATARS : PIXAR_MALE_AVATARS;

  // Use simple deterministic hash so the same name always gets the same avatar
  let hash = 0;
  const nameStr = (fullName || 'talent').trim().toLowerCase();
  for (let i = 0; i < nameStr.length; i++) {
    hash = (hash * 31 + nameStr.charCodeAt(i)) >>> 0;
  }

  const index = hash % avatars.length;
  return avatars[index];
}
