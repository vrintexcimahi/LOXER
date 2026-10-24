export interface CvExperience {
  id: string;
  position: string;
  company: string;
  period: string;
  description: string;
}

export interface CvEducation {
  id: string;
  school: string;
  major: string;
  period: string;
  gpa?: string;
}

export interface CvLanguage {
  name: string;
  level: string;
}

export interface CvData {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  city: string;
  address?: string;
  photoUrl: string;
  summary: string;
  experiences: CvExperience[];
  educations: CvEducation[];
  skills: string[];
  languages: CvLanguage[];
}

export const INITIAL_CV_DATA: CvData = {
  fullName: 'Azqy Ahmad Saputra',
  headline: 'Staff Administrasi & Keuangan',
  email: 'azqy.ahmad@gmail.com',
  phone: '0812-3456-7890',
  city: 'Kota Cimahi, Jawa Barat',
  photoUrl: '/avatars/pixar_male_1.jpg',
  summary:
    'Lulusan Administrasi Bisnis yang berdedikasi dan teliti dengan pengalaman 2+ tahun dalam pengelolaan dokumen perkantoran, entri data transaksi keuangan, pembukuan kas harian, serta pelayanan operasional pelanggan secara terstruktur.',
  experiences: [
    {
      id: 'exp-1',
      position: 'Staff Administrasi Operasional',
      company: 'CV Indo Jaya Amanah',
      period: '2023 - 2025',
      description:
        'Bertanggung jawab menyusun laporan kas harian, rekonsiliasi faktur transaksi, pengarsipan berkas legalitas, dan berkoordinasi dengan tim logistik untuk efisiensi pengiriman dokumen.',
    },
    {
      id: 'exp-2',
      position: 'Junior Admin & Customer Support',
      company: 'PT Loxer Solusi Digital',
      period: '2022 - 2023',
      description:
        'Melayani komunikasi pertanyaan pelanggan dengan response time cepat, mengelola database inventaris, dan memproses pembuatan surat penawaran resmi.',
    },
  ],
  educations: [
    {
      id: 'edu-1',
      school: 'SMK Negeri 1 Cimahi',
      major: 'Otomatisasi & Tata Kelola Perkantoran',
      period: '2019 - 2022',
      gpa: 'Nilai Rata-rata 88.5',
    },
  ],
  skills: [
    'Microsoft Excel & Word',
    'Administrasi Perkantoran',
    'Pengarsipan Berkas',
    'Customer Service',
    'Pembukuan Kas Harian',
    'Komunikasi Efektif',
    'Entri Data Cepat',
  ],
  languages: [
    { name: 'Bahasa Indonesia', level: 'Fasih (Bahasa Asli)' },
    { name: 'Bahasa Inggris', level: 'Menengah (Pasif & Aktif)' },
  ],
};
