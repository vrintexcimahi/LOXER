import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShoppingBag,
  Search,
  PlusCircle,
  CheckCircle,
  Clock,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Package,
  Layers,
  FileCode,
  Laptop,
  Box,
  Trash2,
  X,
  UserCheck,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import PublicMobileBottomNav from '../../components/layout/PublicMobileBottomNav';
import HeroBannerSlideshow from '../../components/banner/HeroBannerSlideshow';
import AuthModal from '../auth/AuthModal';
import { useAuth } from '../../contexts/useAuth';
import { useAppAccess } from '../../contexts/AppAccessContext';
import {
  MarketplaceProduct,
  MarketplaceTransaction,
  ProductCategory,
  ProductCondition,
  UserRole
} from '../../lib/types';
import {
  fetchMarketplaceProducts,
  createMarketplaceProduct,
  updateMarketplaceProductStatus,
  deleteMarketplaceProduct,
  createProductTransaction,
  fetchUserTransactions,
  updateTransactionStatus,
  formatRupiah
} from '../../lib/productMarketplaceService';

const PRESET_IMAGES = [
  { label: 'Laptop / PC', url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80' },
  { label: 'Source Code / Dev', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80' },
  { label: 'Monitor Layar', url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80' },
  { label: 'Keyboard & Gadget', url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80' },
  { label: 'Desain / UI Kit', url: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80' },
  { label: 'E-Book / Dokumen', url: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80' },
  { label: 'Meja / Deskmat', url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80' },
  { label: 'Kursi Kerja', url: 'https://images.unsplash.com/photo-1580481077195-c9f28c2e6f43?auto=format&fit=crop&w=800&q=80' },
];

export default function ProductMarketplace() {
  const { user, userMeta } = useAuth();
  const { requireApp } = useAppAccess();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ProductCategory>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'popular'>('newest');

  // Modals
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [isSellModalOpen, setIsSellModalOpen] = useState(false);
  const [isMyProductsOpen, setIsMyProductsOpen] = useState(false);
  const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('seeker');

  // Sell Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<ProductCategory>('digital');
  const [formSubCategory, setFormSubCategory] = useState('');
  const [formCondition, setFormCondition] = useState<ProductCondition>('Digital');
  const [formPrice, setFormPrice] = useState('');
  const [formPriceType, setFormPriceType] = useState<'fixed' | 'nego'>('nego');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formCity, setFormCity] = useState('Jakarta');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formDownloadUrl, setFormDownloadUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStock, setFormStock] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Transactions State
  const [myTransactions, setMyTransactions] = useState<MarketplaceTransaction[]>([]);
  const [offerPriceInput, setOfferPriceInput] = useState('');
  const [offerNotesInput, setOfferNotesInput] = useState('');
  const [offerBuyerName, setOfferBuyerName] = useState('');
  const [offerBuyerWa, setOfferBuyerWa] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const prods = await fetchMarketplaceProducts();
      setProducts(prods);
      if (user?.id) {
        const txs = await fetchUserTransactions(user.id);
        setMyTransactions(txs);
      }
    } catch (err) {
      console.error('Failed to load marketplace products:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  const cities = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.seller_city) set.add(p.seller_city);
    });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        const matchesCondition =
          selectedCondition === 'all' || p.condition.toLowerCase().includes(selectedCondition.toLowerCase());
        const matchesCity = selectedCity === 'all' || p.seller_city.toLowerCase() === selectedCity.toLowerCase();
        const q = searchQuery.toLowerCase().trim();
        const matchesQuery =
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.seller_name.toLowerCase().includes(q) ||
          (p.sub_category || '').toLowerCase().includes(q);

        return matchesCategory && matchesCondition && matchesCity && matchesQuery;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'popular') return (b.views_count + b.likes_count) - (a.views_count + a.likes_count);
        return 0;
      });
  }, [products, selectedCategory, selectedCondition, selectedCity, searchQuery, sortBy]);

  const myProducts = useMemo(() => {
    if (!user) return [];
    return products.filter((p) => p.user_id === user.id);
  }, [products, user]);

  const handleOpenSellModal = () => {
    if (!requireApp('Pasang Iklan Produk')) {
      return;
    }
    if (!user) {
      setAuthInitialRole('seeker');
      setAuthMode('login');
      return;
    }
    // Pre-fill user data
    setFormCity(userMeta?.role === 'employer' ? 'Jakarta' : 'Bandung');
    setFormWhatsapp('628123456789');
    setIsSellModalOpen(true);
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPrice.trim()) return;

    setIsSubmitting(true);
    try {
      const priceNum = parseInt(formPrice.replace(/\D/g, ''), 10) || 0;
      const stockNum = parseInt(formStock, 10) || 1;

      const created = await createMarketplaceProduct({
        user_id: user?.id || `usr-${Date.now()}`,
        seller_name: userMeta?.email?.split('@')[0] || user?.email?.split('@')[0] || 'Member LOXER',
        seller_role: userMeta?.role || 'seeker',
        seller_verified: true,
        seller_whatsapp: formWhatsapp.replace(/\D/g, '') || '6281234567890',
        seller_city: formCity || 'Indonesia',
        title: formTitle.trim(),
        category: formCategory,
        sub_category: formSubCategory.trim() || (formCategory === 'digital' ? 'Produk Digital' : formCategory === 'second' ? 'Barang Sekon' : 'Produk Umum'),
        condition: formCondition,
        price: priceNum,
        price_type: formPriceType,
        images: formImageUrl.trim() ? [formImageUrl.trim()] : [PRESET_IMAGES[0].url],
        description: formDescription.trim() || 'Produk berkualitas dari member terverifikasi LOXER.',
        stock: stockNum,
        status: 'available',
        digital_download_url: formDownloadUrl.trim() || undefined,
      });

      setProducts((prev) => [created, ...prev]);
      setIsSellModalOpen(false);
      // Reset form
      setFormTitle('');
      setFormPrice('');
      setFormDescription('');
      setFormImageUrl('');
      setFormDownloadUrl('');
      showToast('Produk Anda berhasil ditayangkan di Marketplace LOXER!');
    } catch (err) {
      console.error(err);
      alert('Gagal menerbitkan produk. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleProductStatus = async (product: MarketplaceProduct) => {
    const nextStatus = product.status === 'available' ? 'sold' : 'available';
    await updateMarketplaceProductStatus(product.id, nextStatus);
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, status: nextStatus } : p))
    );
    showToast(`Status produk diubah menjadi: ${nextStatus === 'sold' ? 'TERJUAL' : 'TERSEDIA'}`);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Yakin ingin menghapus produk ini dari Marketplace?')) return;
    await deleteMarketplaceProduct(productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    showToast('Produk telah dihapus dari Marketplace.');
  };

  const handleStartWhatsAppChat = (product: MarketplaceProduct) => {
    if (!requireApp('Menghubungi Penjual & Beli (WhatsApp)')) {
      return;
    }
    const phone = product.seller_whatsapp.startsWith('0')
      ? '62' + product.seller_whatsapp.slice(1)
      : product.seller_whatsapp;
    const text = encodeURIComponent(
      `Halo Kak ${product.seller_name}, saya melihat iklan Anda di LOXER Marketplace:\n\n*${product.title}*\nHarga: ${formatRupiah(product.price)} (${product.condition})\nLink: ${window.location.origin}/marketplace\n\nApakah barang/produk ini masih tersedia dan bisa transaksi? Terima kasih!`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
  };

  const handleOpenOrderModal = (product: MarketplaceProduct) => {
    if (!requireApp('Mengajukan Transaksi Produk')) {
      return;
    }
    if (!user) {
      setAuthInitialRole('seeker');
      setAuthMode('login');
      return;
    }
    setSelectedProduct(product);
    setOfferPriceInput(String(product.price));
    setOfferBuyerName(userMeta?.email?.split('@')[0] || 'Pembeli');
    setOfferBuyerWa('628123456789');
    setIsOrderModalOpen(true);
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !user) return;

    try {
      const amount = parseInt(offerPriceInput.replace(/\D/g, ''), 10) || selectedProduct.price;
      const createdTx = await createProductTransaction({
        product_id: selectedProduct.id,
        product_title: selectedProduct.title,
        product_price: selectedProduct.price,
        product_image: selectedProduct.images[0],
        buyer_id: user.id,
        buyer_name: offerBuyerName.trim() || user.email?.split('@')[0] || 'Pembeli',
        buyer_whatsapp: offerBuyerWa.trim(),
        seller_id: selectedProduct.user_id,
        seller_name: selectedProduct.seller_name,
        seller_whatsapp: selectedProduct.seller_whatsapp,
        offer_price: amount,
        notes: offerNotesInput.trim(),
        payment_method: 'escrow_loxer',
        status: 'pending',
      });

      setMyTransactions((prev) => [createdTx, ...prev]);
      setIsOrderModalOpen(false);
      showToast('Permintaan transaksi berhasil diajukan dengan proteksi Escrow LOXER!');
    } catch (err) {
      console.error(err);
      alert('Gagal memproses transaksi.');
    }
  };

  const handleUpdateTxStatus = async (txId: string, status: MarketplaceTransaction['status']) => {
    await updateTransactionStatus(txId, status);
    setMyTransactions((prev) =>
      prev.map((t) => (t.id === txId ? { ...t, status } : t))
    );
    showToast(`Status transaksi diperbarui: ${status.toUpperCase()}`);
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black pb-24 md:pb-0">
      {/* Public Navbar */}
      <Navbar
        onLogin={() => setAuthMode('login')}
        onRegister={(role) => {
          if (!requireApp('Mendaftar Akun')) return;
          setAuthInitialRole(role || 'seeker');
          setAuthMode('register');
        }}
      />

      {/* Floating Success Toast */}
      {successToast && (
        <div className="fixed top-20 right-5 z-50 flex items-center gap-3 bg-gradient-to-r from-cyan-600 to-sky-600 text-white px-5 py-3 rounded-2xl shadow-2xl border border-cyan-400/40 animate-bounce">
          <CheckCircle className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold">{successToast}</span>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* ===================== HERO SECTION ===================== */}
        <section className="relative overflow-hidden rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70 p-4 sm:p-6 lg:p-7 shadow-2xl">
          <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

          {/* 1. Large Slideshow on Top */}
          <div className="relative z-10 w-full mb-4 sm:mb-5">
            <HeroBannerSlideshow
              initialSlide={3}
              variant="embedded"
              onRegister={(role) => {
                setAuthInitialRole(role || 'seeker');
                setAuthMode('register');
              }}
            />
          </div>

          {/* 2. Compact Text & Actions Below */}
          <div className="relative z-10 border-t border-white/10 pt-3.5 sm:pt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 backdrop-blur-md">
                  <ShoppingBag className="w-3.5 h-3.5 text-cyan-400" />
                  <span>LOXER Member Marketplace · Bebas Fee</span>
                </span>
              </div>

              <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-white tracking-tight leading-snug">
                Bursa Produk Digital, Barang Sekon &amp;{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
                  Perlengkapan Kerja Member
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                Platform jual-beli dan transaksi resmi untuk seluruh member LOXER — temukan peralatan kerja, komputer sekon, alat bengkel, hingga perlengkapan usaha dengan transaksi aman.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleOpenSellModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:brightness-110 shadow-md shadow-cyan-500/25 transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>+ Jual Produk / Iklan</span>
              </button>

              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsMyProductsOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/8 hover:bg-white/12 border border-white/15 text-xs font-semibold text-slate-200 transition"
                  >
                    <Package className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Produk ({myProducts.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsTransactionsOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/8 hover:bg-white/12 border border-white/15 text-xs font-semibold text-slate-200 transition"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Transaksi ({myTransactions.length})</span>
                  </button>
                </>
              ) : null}

              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>100% Bebas Admin</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== CATEGORY TABS ===================== */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 border-b border-white/10 pb-4">
            {[
              { id: 'all', label: 'Semua Produk', icon: Layers, count: products.length },
              { id: 'digital', label: '💾 Produk Digital', icon: FileCode, count: products.filter((p) => p.category === 'digital').length },
              { id: 'second', label: '🔄 Produk Sekon (Second)', icon: Laptop, count: products.filter((p) => p.category === 'second').length },
              { id: 'other', label: '📦 Produk Lainnya', icon: Box, count: products.filter((p) => p.category === 'other').length },
            ].map((tab) => {
              const active = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id as 'all' | ProductCategory)}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-cyan-500 to-sky-500 text-slate-950 shadow-lg shadow-cyan-500/25 scale-102'
                      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-white/10'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                      active ? 'bg-slate-950/30 text-slate-950' : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ===================== SEARCH & FILTER CONTROLS ===================== */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari produk (MacBook, Source code, Template, Keyboard)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-white/10 bg-slate-900/90 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 shadow-inner"
              />
            </div>

            {/* Condition Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedCondition}
                onChange={(e) => setSelectedCondition(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-white/10 bg-slate-900 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="all">Semua Kondisi</option>
                <option value="digital">Digital (File/Akun)</option>
                <option value="sekon">Sekon (Second)</option>
                <option value="baru">Baru (New)</option>
              </select>
            </div>

            {/* City Filter */}
            <div className="md:col-span-2">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-white/10 bg-slate-900 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="all">Semua Lokasi</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Filter */}
            <div className="md:col-span-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'price_asc' | 'price_desc' | 'popular')}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-white/10 bg-slate-900 text-xs sm:text-sm text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="newest">Terbaru Ditayangkan</option>
                <option value="price_asc">Harga Terendah</option>
                <option value="price_desc">Harga Tertinggi</option>
                <option value="popular">Paling Banyak Dilihat</option>
              </select>
            </div>
          </div>
        </section>

        {/* ===================== PRODUCT GRID ===================== */}
        <section>
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 text-sm font-medium">Memuat etalase produk LOXER...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-white/10 bg-slate-900/50 p-8 space-y-4">
              <Package className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">Tidak ada produk yang cocok</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Coba ubah kata kunci pencarian atau bersihkan filter untuk melihat produk lainnya.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedCondition('all');
                  setSelectedCity('all');
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-cyan-300 font-semibold transition"
              >
                Reset Semua Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredProducts.map((prod) => {
                const conditionColor =
                  prod.condition === 'Digital'
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    : prod.condition.toLowerCase().includes('sekon')
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

                return (
                  <div
                    key={prod.id}
                    className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 hover:border-cyan-500/40 hover:bg-slate-900 shadow-xl shadow-black/40 transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Image Thumbnail - Ratio 1:1 Penuh */}
                    <div className="relative aspect-square w-full overflow-hidden bg-slate-800">
                      <img
                        src={prod.images[0] || PRESET_IMAGES[0].url}
                        alt={prod.title}
                        className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

                      {/* Condition Badge */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border backdrop-blur-md ${conditionColor}`}>
                          {prod.condition}
                        </span>
                        {prod.status === 'sold' && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-red-500/80 text-white border border-red-400">
                            TERJUAL
                          </span>
                        )}
                      </div>

                      {/* Category Pill */}
                      <div className="absolute bottom-2.5 left-3">
                        <span className="text-[10px] font-medium text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded-md border border-white/10 backdrop-blur-sm">
                          {prod.sub_category || prod.category.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Content Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        {/* Price */}
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-cyan-400">
                            {formatRupiah(prod.price)}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400 uppercase">
                            {prod.price_type === 'nego' ? '• Nego' : '• Pas'}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-sm text-slate-100 line-clamp-2 mt-1 group-hover:text-cyan-300 transition-colors">
                          {prod.title}
                        </h3>

                        {/* Description Preview */}
                        <p className="text-xs text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
                          {prod.description}
                        </p>
                      </div>

                      {/* Seller Footer */}
                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                            {prod.seller_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate text-slate-300 font-medium text-[11px]">
                            {prod.seller_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 flex-shrink-0">
                          <MapPin className="w-3 h-3 text-cyan-400" />
                          <span>{prod.seller_city}</span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(prod)}
                          className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200 transition text-center"
                        >
                          Lihat Detail
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartWhatsAppChat(prod)}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Beli / WA</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* ===================== MODAL: PRODUCT DETAIL ===================== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 my-8">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Image - Ratio 1:1 Penuh */}
            <div className="relative aspect-square max-h-[380px] w-full rounded-2xl overflow-hidden bg-slate-800 mx-auto">
              <img
                src={selectedProduct.images[0] || PRESET_IMAGES[0].url}
                alt={selectedProduct.title}
                className="w-full h-full object-cover object-center"
              />
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-black uppercase bg-cyan-500 text-slate-950 shadow-md">
                  {selectedProduct.condition}
                </span>
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-900/90 text-white border border-white/10">
                  {selectedProduct.sub_category || selectedProduct.category}
                </span>
              </div>
            </div>

            {/* Title & Price */}
            <div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-black text-cyan-400">
                  {formatRupiah(selectedProduct.price)}
                </span>
                <span className="text-xs uppercase font-bold text-slate-400">
                  Tipe Harga: {selectedProduct.price_type === 'nego' ? 'Bisa Nego' : 'Harga Pas'}
                </span>
              </div>
              <h2 className="text-xl font-bold text-white mt-1.5">{selectedProduct.title}</h2>
            </div>

            {/* Seller Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center font-bold text-base">
                  {selectedProduct.seller_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-white text-sm">{selectedProduct.seller_name}</p>
                    <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <p className="text-xs text-slate-400">
                    Role: <span className="text-cyan-300 font-semibold uppercase">{selectedProduct.seller_role}</span> · Domisili: {selectedProduct.seller_city}
                  </p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Member Terverifikasi
              </span>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deskripsi &amp; Spesifikasi Produk</h4>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line bg-slate-950/60 p-4 rounded-2xl border border-white/5">
                {selectedProduct.description}
              </p>
            </div>

            {/* Direct Transaction Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleStartWhatsAppChat(selectedProduct)}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <MessageCircle className="w-5 h-5" />
                <span>Chat Penjual di WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenOrderModal(selectedProduct)}
                className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-500 hover:brightness-110 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition cursor-pointer"
              >
                <ShieldCheck className="w-5 h-5" />
                <span>Ajukan Nego / Escrow LOXER</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: JUAL PRODUK / PASANG IKLAN ===================== */}
      {isSellModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-xl bg-slate-900 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 my-8">
            <button
              onClick={() => setIsSellModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 mb-2">
                <PlusCircle className="w-3.5 h-3.5" /> Pasang Iklan Produk Baru
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">Jual Produk di Marketplace LOXER</h2>
              <p className="text-xs text-slate-400 mt-1">
                Bisa produk digital (source code/e-book), barang sekon (laptop/monitor), atau perlengkapan lainnya.
              </p>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs sm:text-sm">
              {/* Title */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Produk / Judul Iklan *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Contoh: MacBook Pro M1 2020 16GB / Source Code Kasir POS"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Category & Condition */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kategori Produk</label>
                  <select
                    value={formCategory}
                    onChange={(e) => {
                      const cat = e.target.value as ProductCategory;
                      setFormCategory(cat);
                      if (cat === 'digital') setFormCondition('Digital');
                      else if (cat === 'second') setFormCondition('Sekon (Second)');
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="digital">💾 Produk Digital (File / Akun / Lisensi)</option>
                    <option value="second">🔄 Produk Sekon (Second / Bekas Pakai)</option>
                    <option value="other">📦 Produk Lainnya (Baru / Merchandise)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kondisi Barang</label>
                  <select
                    value={formCondition}
                    onChange={(e) => setFormCondition(e.target.value as ProductCondition)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="Digital">Digital (Non-Fisik)</option>
                    <option value="Sekon (Second)">Sekon (Second / Bekas Mulus)</option>
                    <option value="Baru">Baru (New / Segel)</option>
                  </select>
                </div>
              </div>

              {/* Sub-Category & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Sub-Kategori Spesifik</label>
                  <input
                    type="text"
                    value={formSubCategory}
                    onChange={(e) => setFormSubCategory(e.target.value)}
                    placeholder="Contoh: Source Code, Laptop, Aksesoris..."
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Jumlah Stok Tersedia</label>
                  <input
                    type="number"
                    min="1"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Price & Price Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Harga (Rupiah) *</label>
                  <input
                    type="text"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="Contoh: 450000"
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipe Penawaran</label>
                  <select
                    value={formPriceType}
                    onChange={(e) => setFormPriceType(e.target.value as 'fixed' | 'nego')}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="nego">Bisa Nego Santai</option>
                    <option value="fixed">Harga Pas / NET</option>
                  </select>
                </div>
              </div>

              {/* City & WhatsApp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kota / Domisili Penjual</label>
                  <input
                    type="text"
                    required
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="Contoh: Jakarta, Bandung, Surabaya"
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nomor WhatsApp Aktif</label>
                  <input
                    type="text"
                    required
                    value={formWhatsapp}
                    onChange={(e) => setFormWhatsapp(e.target.value)}
                    placeholder="081234567890"
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              {/* Image URL & Preset Picker */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Link URL Foto Produk</label>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 mb-2"
                />
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-slate-400">
                  <span>Pilih foto cepat:</span>
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setFormImageUrl(preset.url)}
                      className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-cyan-300 font-medium whitespace-nowrap"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Digital URL (Optional) */}
              {formCategory === 'digital' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Link Download / Repository (Digital)</label>
                  <input
                    type="url"
                    value={formDownloadUrl}
                    onChange={(e) => setFormDownloadUrl(e.target.value)}
                    placeholder="Link Google Drive / Github / Figma yang diberikan setelah transaksi"
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              )}

              {/* Description */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Deskripsi Lengkap &amp; Kelengkapan</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Jelaskan kondisi barang, spesifikasi, minus (jika ada), kelengkapan aksesoris, atau garansi..."
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Submit */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSellModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/30 hover:brightness-110 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? 'Menerbitkan...' : 'Terbitkan Produk Sekarang'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: PRODUK SAYA ===================== */}
      {isMyProductsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 my-8">
            <button
              onClick={() => setIsMyProductsOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-black text-white">Kelola Produk &amp; Iklan Saya</h2>
              <p className="text-xs text-slate-400 mt-1">Daftar produk yang Anda iklankan di Marketplace LOXER</p>
            </div>

            {myProducts.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Package className="w-10 h-10 mx-auto text-slate-600" />
                <p>Anda belum memiliki produk yang diiklankan.</p>
                <button
                  onClick={() => {
                    setIsMyProductsOpen(false);
                    setIsSellModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs"
                >
                  Pasang Iklan Pertama
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {myProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images[0] || PRESET_IMAGES[0].url}
                        alt={p.title}
                        className="w-14 h-14 rounded-xl object-cover"
                      />
                      <div>
                        <h4 className="font-bold text-sm text-white line-clamp-1">{p.title}</h4>
                        <p className="text-xs text-cyan-400 font-semibold">{formatRupiah(p.price)}</p>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase mt-1 ${
                            p.status === 'sold'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {p.status === 'sold' ? 'TERJUAL' : 'TERSEDIA'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleProductStatus(p)}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-slate-200 font-medium transition"
                      >
                        {p.status === 'sold' ? 'Tandai Tersedia' : 'Tandai Terjual'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(p.id)}
                        className="p-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition"
                        title="Hapus Iklan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== MODAL: TRANSAKSI SAYA ===================== */}
      {isTransactionsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-5 my-8">
            <button
              onClick={() => setIsTransactionsOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-black text-white">Riwayat Transaksi Marketplace</h2>
              <p className="text-xs text-slate-400 mt-1">Pantau status transaksi jual dan beli terproteksi Anda</p>
            </div>

            {myTransactions.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Clock className="w-10 h-10 mx-auto text-slate-600" />
                <p>Belum ada riwayat transaksi.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {myTransactions.map((tx) => {
                  const isSeller = tx.seller_id === user?.id;
                  return (
                    <div
                      key={tx.id}
                      className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isSeller ? 'bg-amber-500/20 text-amber-300' : 'bg-cyan-500/20 text-cyan-300'
                            }`}
                          >
                            {isSeller ? 'PENJUALAN' : 'PEMBELIAN'}
                          </span>
                          <span className="text-xs text-slate-400">ID: {tx.id.slice(-6)}</span>
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            tx.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : tx.status === 'agreed'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-yellow-500/20 text-yellow-300'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-white">{tx.product_title}</h4>
                          <p className="text-xs text-cyan-400 font-bold">{formatRupiah(tx.offer_price)}</p>
                          <p className="text-[11px] text-slate-400">
                            {isSeller ? `Pembeli: ${tx.buyer_name} (${tx.buyer_whatsapp})` : `Penjual: ${tx.seller_name} (${tx.seller_whatsapp})`}
                          </p>
                        </div>

                        {tx.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => handleUpdateTxStatus(tx.id, 'completed')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-semibold"
                          >
                            Tandai Selesai
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== MODAL: ORDER / ESCROW ===================== */}
      {isOrderModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4 my-8">
            <button
              onClick={() => setIsOrderModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 mb-2">
                <ShieldCheck className="w-3.5 h-3.5" /> Escrow Proteksi Transaksi LOXER
              </div>
              <h2 className="text-xl font-black text-white">Ajukan Pembelian / Nego Harga</h2>
              <p className="text-xs text-slate-400 mt-1">Produk: {selectedProduct.title}</p>
            </div>

            <form onSubmit={handleSubmitTransaction} className="space-y-3 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Tawaran Harga Anda (Rupiah)</label>
                <input
                  type="text"
                  required
                  value={offerPriceInput}
                  onChange={(e) => setOfferPriceInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nama Pembeli</label>
                <input
                  type="text"
                  required
                  value={offerBuyerName}
                  onChange={(e) => setOfferBuyerName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nomor WhatsApp Pembeli</label>
                <input
                  type="text"
                  required
                  value={offerBuyerWa}
                  onChange={(e) => setOfferBuyerWa(e.target.value)}
                  placeholder="081234567890"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Catatan Tambahan untuk Penjual</label>
                <textarea
                  rows={2}
                  value={offerNotesInput}
                  onChange={(e) => setOfferNotesInput(e.target.value)}
                  placeholder="Misal: Mau COD di stasiun, atau butuh link akses cepat..."
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 text-slate-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-teal-400 text-slate-950 font-bold text-xs"
                >
                  Kirim Permintaan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal if unauthenticated user tries to post or transact */}
      {authMode && (
        <AuthModal
          mode={authMode}
          initialRole={authInitialRole}
          onClose={() => setAuthMode(null)}
          onSwitchMode={(m) => setAuthMode(m)}
        />
      )}

      {/* Public Footer */}
      <Footer />

      {/* Mobile Bottom Navigation */}
      <PublicMobileBottomNav />
    </div>
  );
}
