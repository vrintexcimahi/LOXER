/**
 * LOXER Professional Avatar & Gender Intelligence Service
 * Replaces cartoon/3D Pixar avatars with crisp, professional vector initials avatars.
 * Preserves gender detection for cultural accuracy and formal salutations.
 */

export type GenderType = 'female' | 'male';

export interface PixarAvatarOption {
  url: string;
  gender: GenderType;
  label: string;
  tag: string;
}

// Deprecated: Empty arrays to prevent breakage in legacy imports
export const PIXAR_FEMALE_AVATARS = [] as const;
export const PIXAR_MALE_AVATARS = [] as const;
export const ALL_PIXAR_AVATARS: PixarAvatarOption[] = [];

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
 * Generates an elegant, professional SVG avatar with candidate initials
 * Replaces cartoonish 3D Pixar avatars completely.
 */
export function getProfessionalInitialsAvatar(
  fullName?: string,
  explicitGender?: string,
  bio?: string
): string {
  const cleanName = (fullName || 'Talenta').trim();
  const words = cleanName.split(/\s+/).filter(Boolean);
  let initials = '';
  if (words.length >= 2) {
    initials = `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
  } else if (words.length === 1 && words[0].length >= 1) {
    initials = words[0].slice(0, 2).toUpperCase();
  } else {
    initials = 'LK';
  }

  const gender = detectGender(cleanName, explicitGender, bio);

  // Curated, executive-grade gradients
  const femaleGradients = [
    ['#0e7490', '#155e75'], // Cyan/Dark Cyan
    ['#0f766e', '#115e59'], // Teal
    ['#4f46e5', '#3730a3'], // Indigo
    ['#b91c1c', '#991b1b'], // Elegant Ruby
    ['#9333ea', '#7e22ce'], // Purple
  ];

  const maleGradients = [
    ['#0284c7', '#0369a1'], // Ocean Blue
    ['#1d4ed8', '#1e40af'], // Royal Blue
    ['#334155', '#1e293b'], // Slate Navy
    ['#059669', '#047857'], // Emerald
    ['#0f172a', '#1e293b'], // Obsidian
  ];

  const gradientList = gender === 'female' ? femaleGradients : maleGradients;

  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = (hash * 31 + cleanName.charCodeAt(i)) >>> 0;
  }
  const [col1, col2] = gradientList[hash % gradientList.length];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
    <defs>
      <linearGradient id="pGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${col1}"/>
        <stop offset="100%" stop-color="${col2}"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="80" fill="url(#pGrad)"/>
    <circle cx="80" cy="80" r="74" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2"/>
    <text x="50%" y="54%" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="52" font-weight="800" fill="#ffffff" text-anchor="middle" dominant-baseline="middle" letter-spacing="1.5">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/**
 * Backwards compatible alias: returns clean professional vector avatar instead of 3D Pixar
 */
export function getDefaultPixarAvatar(
  fullName?: string,
  explicitGender?: string,
  bio?: string
): string {
  return getProfessionalInitialsAvatar(fullName, explicitGender, bio);
}
