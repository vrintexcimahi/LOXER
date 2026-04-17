import { useCallback, useEffect, useState } from 'react';
import { Building2, Globe, MapPin, Users, Save } from 'lucide-react';
import EmployerLayout from '../../components/layout/EmployerLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { Company } from '../../lib/types';

const INDUSTRIES = ['Technology', 'Finance', 'E-Commerce', 'Healthcare', 'Education', 'Media', 'Logistics', 'Manufacturing', 'Retail', 'Travel & Hospitality', 'Government', 'NGO', 'Other'];
const EMPLOYEE_COUNTS = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'];

export default function CompanyProfile() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: '', industry: '', city: '', description: '',
    website: '', employee_count: '', logo_url: '',
  });

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
              {company.name[0]}
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
              <div>
                <label className="label">URL Logo</label>
                <input value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} placeholder="https://..." className="input-field" />
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
