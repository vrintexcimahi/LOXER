import type { Data } from '@measured/puck';

export type HeroSectionProps = {
  badge: string;
  title: string;
  subtitle: string;
  primaryButtonText: string;
  primaryButtonHref: string;
  secondaryButtonText: string;
  secondaryButtonHref: string;
  backgroundColor: string;
};

export type FeatureGridProps = {
  sectionTitle: string;
  sectionSubtitle: string;
  cardOneTitle: string;
  cardOneDescription: string;
  cardTwoTitle: string;
  cardTwoDescription: string;
  cardThreeTitle: string;
  cardThreeDescription: string;
};

export type CtaBannerProps = {
  title: string;
  subtitle: string;
  primaryButtonText: string;
  primaryButtonHref: string;
  secondaryButtonText: string;
  secondaryButtonHref: string;
  backgroundColor: string;
};

export type HomepageData = Data;

export const defaultHomepageData: HomepageData = {
  root: { props: {} },
  content: [
    {
      type: 'HeroSection',
      props: {
        badge: 'Platform Rekrutmen',
        title: 'Temukan Karir Impianmu',
        subtitle: 'Lamar lebih cepat, rekrut lebih cerdas, dan kelola proses hiring dalam satu platform.',
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
        cardTwoDescription: 'Pantau alur kandidat dari tahap apply hingga interview.',
        cardThreeTitle: 'Kolaborasi Tim',
        cardThreeDescription: 'Ajak tim HR untuk review kandidat bersama di dashboard.',
      },
    },
    {
      type: 'CtaBanner',
      props: {
        title: 'Siap go live dengan halaman versimu?',
        subtitle: 'Buka /admin/editor, ubah teks, klik Publish, lalu halaman publik langsung ikut berubah.',
        primaryButtonText: 'Buka Editor',
        primaryButtonHref: '/admin/editor',
        secondaryButtonText: 'Lihat Dashboard',
        secondaryButtonHref: '/employer/dashboard',
        backgroundColor: '#0b3a5b',
      },
    },
  ],
};

export function isHomepageData(value: unknown): value is HomepageData {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as { root?: unknown; content?: unknown };
  return typeof candidate.root === 'object' && candidate.root !== null && Array.isArray(candidate.content);
}
