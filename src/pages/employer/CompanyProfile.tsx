import { useCallback, useEffect, useState } from 'react';
import { Building2, Globe, MapPin, Users, Save, Upload, Sparkles } from 'lucide-react';
import EmployerLayout from '../../components/layout/EmployerLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { Company } from '../../lib/types';
import { compressImageFile, formatFileSize } from '../../lib/imageCompressor';

const INDUSTRIES = ['Technology', 'Finance', 'E-Commerce', 'Healthcare', 'Education', 'Media', 'Logistics', 'Manufacturing', 'Retail', 'Travel & Hospitality', 'Government', 'NGO', 'Other'];
const EMPLOYEE_COUNTS = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];

export default function CompanyProfile() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [compressingLogo, setCompressingLogo] = useState(false);
  const [compressionStats, setCompressionStats] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', industry: '', city: '', description: '',
    website: '', employee_count: '', logo_url: '',
  });

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressingLogo(true);
      setCompressionStats(null);
      const res = await compressImageFile(file, { maxWidth: 400, maxHeight: 400, quality: 0.85 });
      setForm((prev) => ({ ...prev, logo_url: res.dataUrl }));
      setCompressionStats(`WebP ${formatFileSize(res.compressedSize)} (Hemat ${res.compressionRatio}%)`);
    } catch (err) {
      console.warn('Gagal mengompres logo perusahaan:', err);
    } finally {
      setCompressingLogo(false);
    }
  }

  const loadCompany = useCallback(async () => {
    if (!supabase || !user) return;

    const { data } = await supabase.from('companies').select('*').eq('user_id', user.id).maybeSingle();
    setCompany(data);
    if (data) {
      setForm({
        name: data.name || '',
        industry: data.industry || '',
        city: data.city || '',
        description: data.description || '',
        website: data.website || '',
        employee_count: data.employee_count || '',
        logo_url: data.logo_url || '',
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) void loadCompany();
  }, [loadCompany, user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !user || !form.name.trim()) return;
    setSaving(true);

    if (company) {
      await supabase.from('companies').update({ ...form, updated_at: new Date().toISOString() }).eq('id', company.id);
    } else {
      const { data } = await supabase.from('companies').insert({ ...form, user_id: user.id }).select().maybeSingle();
      setCompany(data);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
    await loadCompany();
  }

  if (loading) {
    return (
      <EmployerLayout currentPath="/employer/company">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-sky-100 rounded-2xl" />
        </div>
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout currentPath="/employer/company">
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Profil Perusahaan</h1>
            <p className="text-slate-500 text-sm mt-1">Lengkapi info perusahaan agar kandidat lebih percaya</p>
          </div>
          {company?.verified && (
            <span className="badge bg-emerald-100 text-emerald-700 border-emerald-200">
              ✓ Terverifikasi
            </span>
          )}
        </div>

        {/* Preview */}
        {company && (
          <div className="gradient-card rounded-2xl p-5 mb-5 flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-white font-black text-xl backdrop-blur-sm border border-white/20">
              {(company.name || 'C')[0]}
            </div>
            <div>
              <h2 className="text-white font-black text-lg">{company.name}</h2>
              <p className="text-cyan-200 text-sm">{company.industry} · {company.city}</p>
              {company.employee_count && <p className="text-cyan-300 text-xs mt-0.5">{company.employee_count} karyawan</p>}
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-500" /> Informasi Perusahaan
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Nama Perusahaan *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="PT. Nama Perusahaan" className="input-field" required />
              </div>
              <div>
                <label className="label">Industri</label>
                <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="input-field">
                  <option value="">Pilih industri</option>
                  {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Jumlah Karyawan</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                  <select value={form.employee_count} onChange={(e) => setForm({ ...form, employee_count: e.target.value })} className="input-field pl-10">
                    <option value="">Pilih ukuran</option>
                    {EMPLOYEE_COUNTS.map((c) => <option key={c} value={c}>{c} orang</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Kota</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                  <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Jakarta, Surabaya, dll." className="input-field pl-10" />
                </div>
              </div>
              <div>
                <label className="label">Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                  <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="www.perusahaan.com" className="input-field pl-10" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Logo Perusahaan</label>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-sky-100 bg-slate-50/50">
                  <div className="relative group w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm">
                    {form.logo_url ? (
                      <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Building2 className="w-8 h-8 text-slate-300" />
                    )}
                    {compressingLogo && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 text-center sm:text-left">
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200 transition-all active:scale-95">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{form.logo_url ? 'Ganti Logo' : 'Unggah Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                          disabled={compressingLogo}
                        />
                      </label>

                      {form.logo_url && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, logo_url: '' }));
                            setCompressionStats(null);
                          }}
                          className="px-2.5 py-1 text-xs text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                        >
                          Hapus
                        </button>
                      )}

                      {compressionStats && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-medium">
                          <Sparkles className="w-3 h-3 text-emerald-600" />
                          {compressionStats}
                        </span>
                      )}
                    </div>
                    <input
                      value={form.logo_url}
                      onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                      placeholder="Atau tempel URL gambar eksternal (https://...)"
                      className="input-field text-xs py-1.5"
                    />
                  </div>
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Deskripsi Perusahaan</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ceritakan tentang perusahaanmu, visi misi, kultur, dan keunggulanmu sebagai tempat bekerja..."
                  className="input-field h-32 resize-none"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all ${
              saved ? 'bg-emerald-500 text-white' : 'gradient-cta text-white shadow-lg shadow-cyan-500/30 hover:brightness-110'
            } active:scale-95 disabled:opacity-50`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : saved ? 'Profil Tersimpan!' : company ? 'Simpan Perubahan' : 'Buat Profil Perusahaan'}
          </button>
        </form>
      </div>
    </EmployerLayout>
  );
}
