import { supabase } from './supabase';
import { MarketplaceProduct, MarketplaceTransaction, ProductStatus } from './types';

const STORAGE_KEY_PRODUCTS = 'loxer_marketplace_products_v1';
const STORAGE_KEY_TRANSACTIONS = 'loxer_marketplace_transactions_v1';

export const INITIAL_PRODUCTS: MarketplaceProduct[] = [
  {
    id: 'prod-dig-1',
    user_id: 'usr-demo-dev-1',
    seller_name: 'Arifin Ahmad (Dev)',
    seller_role: 'freelancer',
    seller_verified: true,
    seller_whatsapp: '6281234567801',
    seller_city: 'Bandung',
    title: 'Source Code Aplikasi Kasir & POS Multi-Cabang (React + Node.js)',
    category: 'digital',
    sub_category: 'Source Code & Script',
    condition: 'Digital',
    price: 450000,
    price_type: 'nego',
    images: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Source code lengkap aplikasi POS Kasir & Inventaris toko siap pakai. Fitur cetak struk bluetooth, laporan penjualan harian/bulanan, stok barang otomatis, barcode scanner, dan dashboard admin modern. Include dokumentasi instalasi lengkap.',
    stock: 99,
    status: 'available',
    digital_download_url: 'https://github.com/vrintexcimahi/LOXER',
    views_count: 342,
    likes_count: 58,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'prod-sec-1',
    user_id: 'usr-demo-emp-1',
    seller_name: 'PT Vrintex Asset IT',
    seller_role: 'employer',
    seller_verified: true,
    seller_whatsapp: '6281234567802',
    seller_city: 'Jakarta Selatan',
    title: 'MacBook Pro M1 2020 RAM 16GB SSD 512GB Space Grey Like New',
    category: 'second',
    sub_category: 'Laptop & Komputer',
    condition: 'Sekon (Second)',
    price: 11500000,
    price_type: 'nego',
    images: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Eks pemakaian kantor divisi design & tech. Body 98% mulus tanpa dent/penyok, battery health 91% (Normal cycle count rendah), layar jernih TrueTone aktif, iCloud aman bebas reset. Kelengkapan unit + charger original Type-C 61W.',
    stock: 2,
    status: 'available',
    views_count: 812,
    likes_count: 94,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 'prod-dig-2',
    user_id: 'usr-demo-skr-1',
    seller_name: 'Budi Santoso (HR Specialist)',
    seller_role: 'seeker',
    seller_verified: true,
    seller_whatsapp: '6281234567803',
    seller_city: 'Jakarta Barat',
    title: 'Template Notion & Excel Master HRD: Payroll, KPI, & Database Karyawan',
    category: 'digital',
    sub_category: 'Template & Spreadsheet',
    condition: 'Digital',
    price: 85000,
    price_type: 'fixed',
    images: [
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Template lengkap untuk praktisi HRD, People Ops, atau pemilik usaha. Berisi kalkulator PPh 21 terbaru, slip gaji otomatis, database absensi & cuti, tracking rekrutmen kandidat, serta template SOP kerja.',
    stock: 150,
    status: 'available',
    digital_download_url: 'https://docs.google.com/spreadsheets',
    views_count: 420,
    likes_count: 67,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'prod-sec-2',
    user_id: 'usr-demo-dev-2',
    seller_name: 'Rian Pratama',
    seller_role: 'freelancer',
    seller_verified: true,
    seller_whatsapp: '6281234567804',
    seller_city: 'Surabaya',
    title: 'Monitor LG UltraWide 29 Inch 29WL500 IPS FHD HDR10 Mulus',
    category: 'second',
    sub_category: 'Monitor & Layar',
    condition: 'Sekon (Second)',
    price: 1850000,
    price_type: 'nego',
    images: [
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Monitor ultrawide 21:9 sangat nyaman untuk koding, editing video, dan multitasking 2 jendela sekaligus. Layar bebas dead pixel, port 2x HDMI normal, stand orisinil kokoh. Pembelian setahun lalu, box dan kabel HDMI lengkap.',
    stock: 1,
    status: 'available',
    views_count: 531,
    likes_count: 42,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'prod-dig-3',
    user_id: 'usr-demo-adm-1',
    seller_name: 'LOXER Academy',
    seller_role: 'admin',
    seller_verified: true,
    seller_whatsapp: '6281234567899',
    seller_city: 'Cimahi',
    title: 'E-Book & Masterclass: Panduan Tembus Kerja Tech & BUMN 2026',
    category: 'digital',
    sub_category: 'E-Book & Edukasi',
    condition: 'Digital',
    price: 49000,
    price_type: 'fixed',
    images: [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Modul PDF 180 halaman + video bedah CV ATS Friendly, teknik menjawab 50 pertanyaan interview jebakan HRD/User, simulasi negosiasi gaji, dan template portfolio lolos screening perusahaan papan atas.',
    stock: 500,
    status: 'available',
    digital_download_url: 'https://loxer.web.id/academy',
    views_count: 1205,
    likes_count: 215,
    created_at: new Date(Date.now() - 86400000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: 'prod-sec-3',
    user_id: 'usr-demo-skr-2',
    seller_name: 'Doni Firmansyah',
    seller_role: 'seeker',
    seller_verified: false,
    seller_whatsapp: '6281234567805',
    seller_city: 'Yogyakarta',
    title: 'Mechanical Keyboard Keychron K2 V2 Wireless RGB Hot-Swap',
    category: 'second',
    sub_category: 'Aksesoris & Gadget',
    condition: 'Sekon (Second)',
    price: 790000,
    price_type: 'nego',
    images: [
      'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Keyboard mekanikal Bluetooth/kabel, switch Gateron Brown empuk dan enak untuk ngetik lama. Semua tombol responsif 100%, baterai tahan hingga 2 minggu. Kelengkapan: box, kabel braided Type-C, keycap puller.',
    stock: 1,
    status: 'available',
    views_count: 388,
    likes_count: 36,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 'prod-oth-1',
    user_id: 'usr-demo-adm-2',
    seller_name: 'LOXER Merchandise',
    seller_role: 'admin',
    seller_verified: true,
    seller_whatsapp: '6281234567899',
    seller_city: 'Bandung',
    title: 'Deskmat XL 900x400mm Waterproof Minimalist Dark Edition',
    category: 'other',
    sub_category: 'Perlengkapan Meja Kerja',
    condition: 'Baru',
    price: 89000,
    price_type: 'fixed',
    images: [
      'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Alas meja kerja ukuran jumbo 90x40cm tebal 4mm dengan permukaan kain mikro anti air dan jahitan tepi anti koyak. Memberikan ruang lega untuk keyboard, mouse, dan laptop agar meja kerja rapi serta profesional.',
    stock: 45,
    status: 'available',
    views_count: 290,
    likes_count: 31,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'prod-sec-4',
    user_id: 'usr-demo-emp-2',
    seller_name: 'Kreatif Media Hub',
    seller_role: 'employer',
    seller_verified: true,
    seller_whatsapp: '6281234567806',
    seller_city: 'Tangerang',
    title: 'Kursi Kerja Ergonomis Pexio Mesh Breathable Support Lumbar',
    category: 'second',
    sub_category: 'Furniture Kerja',
    condition: 'Sekon (Second)',
    price: 950000,
    price_type: 'nego',
    images: [
      'https://images.unsplash.com/photo-1580481077195-c9f28c2e6f43?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Eks pemakaian kantor studio kreatif baru 6 bulan. Busa dudukan masih sangat tebal dan padat, hidrolik naik-turun lancar, sandaran jaring dingin tidak gerah, lumbar support punggung fleksibel.',
    stock: 3,
    status: 'available',
    views_count: 472,
    likes_count: 53,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: 'prod-dig-4',
    user_id: 'usr-demo-dev-3',
    seller_name: 'Nanda Desain',
    seller_role: 'freelancer',
    seller_verified: true,
    seller_whatsapp: '6281234567807',
    seller_city: 'Semarang',
    title: 'Figma UI Kit SaaS & Marketplace Dashboard 250+ Komponen Auto-Layout',
    category: 'digital',
    sub_category: 'Desain & UI/UX',
    condition: 'Digital',
    price: 135000,
    price_type: 'fixed',
    images: [
      'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
    ],
    description: 'Design system dan UI Kit profesional siap digunakan untuk proyek klien atau startup. Berisi komponen input, tabel, chart, modal, card, typography tokens, dan 20+ template halaman responsif desktop & mobile.',
    stock: 100,
    status: 'available',
    digital_download_url: 'https://figma.com/community',
    views_count: 615,
    likes_count: 89,
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
];

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function loadLocalProducts(): MarketplaceProduct[] {
  if (typeof window === 'undefined') return INITIAL_PRODUCTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PRODUCTS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      return INITIAL_PRODUCTS;
    }
    return parsed;
  } catch (err) {
    console.error('Error reading local marketplace products:', err);
    return INITIAL_PRODUCTS;
  }
}

function saveLocalProducts(products: MarketplaceProduct[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_PRODUCTS, JSON.stringify(products));
  } catch (err) {
    console.error('Error saving local marketplace products:', err);
  }
}

function loadLocalTransactions(): MarketplaceTransaction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalTransactions(txs: MarketplaceTransaction[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(txs));
  } catch (err) {
    console.error('Error saving local transactions:', err);
  }
}

// ==================== PUBLIC SERVICE API ====================

export async function fetchMarketplaceProducts(): Promise<MarketplaceProduct[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('marketplace_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data as MarketplaceProduct[];
      }
    } catch {
      // Fallback seamlessly to local cache
    }
  }

  return loadLocalProducts();
}

export async function createMarketplaceProduct(
  input: Omit<MarketplaceProduct, 'id' | 'created_at' | 'updated_at' | 'views_count' | 'likes_count'>
): Promise<MarketplaceProduct> {
  const newProduct: MarketplaceProduct = {
    ...input,
    id: `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    views_count: 1,
    likes_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('marketplace_products')
        .insert(newProduct)
        .select()
        .single();

      if (!error && data) {
        // Also sync local
        const local = loadLocalProducts();
        saveLocalProducts([data as MarketplaceProduct, ...local]);
        return data as MarketplaceProduct;
      }
    } catch {
      // Local fallback
    }
  }

  const local = loadLocalProducts();
  const updated = [newProduct, ...local];
  saveLocalProducts(updated);
  return newProduct;
}

export async function updateMarketplaceProductStatus(
  productId: string,
  status: ProductStatus
): Promise<boolean> {
  if (supabase) {
    try {
      await supabase
        .from('marketplace_products')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', productId);
    } catch {
      // Local fallback
    }
  }

  const local = loadLocalProducts();
  const updated = local.map((p) => (p.id === productId ? { ...p, status, updated_at: new Date().toISOString() } : p));
  saveLocalProducts(updated);
  return true;
}

export async function deleteMarketplaceProduct(productId: string): Promise<boolean> {
  if (supabase) {
    try {
      await supabase.from('marketplace_products').delete().eq('id', productId);
    } catch {
      // Local fallback
    }
  }

  const local = loadLocalProducts();
  const updated = local.filter((p) => p.id !== productId);
  saveLocalProducts(updated);
  return true;
}

export async function createProductTransaction(
  tx: Omit<MarketplaceTransaction, 'id' | 'created_at' | 'updated_at'>
): Promise<MarketplaceTransaction> {
  const newTx: MarketplaceTransaction = {
    ...tx,
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('marketplace_transactions')
        .insert(newTx)
        .select()
        .single();

      if (!error && data) {
        const localTxs = loadLocalTransactions();
        saveLocalTransactions([data as MarketplaceTransaction, ...localTxs]);
        return data as MarketplaceTransaction;
      }
    } catch {
      // Local fallback
    }
  }

  const localTxs = loadLocalTransactions();
  saveLocalTransactions([newTx, ...localTxs]);
  return newTx;
}

export async function fetchUserTransactions(userId?: string): Promise<MarketplaceTransaction[]> {
  if (supabase && userId) {
    try {
      const { data, error } = await supabase
        .from('marketplace_transactions')
        .select('*')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        return data as MarketplaceTransaction[];
      }
    } catch {
      // Local fallback
    }
  }

  const localTxs = loadLocalTransactions();
  if (!userId) return localTxs;
  return localTxs.filter((t) => t.buyer_id === userId || t.seller_id === userId);
}

export async function updateTransactionStatus(
  txId: string,
  status: MarketplaceTransaction['status']
): Promise<boolean> {
  if (supabase) {
    try {
      await supabase
        .from('marketplace_transactions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', txId);
    } catch {
      // fallback
    }
  }

  const localTxs = loadLocalTransactions();
  const updated = localTxs.map((t) => (t.id === txId ? { ...t, status, updated_at: new Date().toISOString() } : t));
  saveLocalTransactions(updated);
  return true;
}
