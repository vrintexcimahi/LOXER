import { useEffect, useState } from 'react';
import { Briefcase, MapPin, DollarSign, Users, FileText, Save } from 'lucide-react';
import EmployerLayout from '../../components/layout/EmployerLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { Company } from '../../lib/types';

const CATEGORIES = ['Technology', 'Marketing', 'Finance', 'Design', 'Sales', 'Operations', 'HR', 'Legal', 'Customer Service', 'Product', 'Engineering', 'Data'];
const JOB_TYPES = [
  { value: 'full-time', label: 'Full Time' },
  { value: 'part-time', label: 'Part Time' },
  { value: 'contract', label: 'Kontrak' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Magang' },
];

export default function PostJob() {
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    category: '',
    location_city: '',
    job_type: 'full-time',
    salary_min: '',
    salary_max: '',
    description: '',
    requirements: '',
    quota: '1',
    status: 'active',
  });

  useEffect(() => {
    if (supabase && user) {
      supabase.from('companies').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        setCompany(data);
        setLoading(false);
      });
    }
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !company) return;
    if (!form.title.trim()) { setError('Judul lowongan wajib diisi.'); return; }
    setError('');
    setSaving(true);

    const { error: err } = await supabase.from('job_listings').insert({
      company_id: company.id,
      title: form.title,
      category: form.category,
      location_city: form.location_city,
      job_type: form.job_type,
      salary_min: form.salary_min ? parseInt(form.salary_min) * 1000000 : 0,
      salary_max: form.salary_max ? parseInt(form.salary_max) * 1000000 : 0,
      description: form.description,
      requirements: form.requirements,
      quota: parseInt(form.quota) || 1,
      status: form.status,
    });

    if (err) {
      setError('Gagal menyimpan lowongan. Silakan coba lagi.');
    } else {
      setSuccess(true);
      setTimeout(() => { window.location.href = '/employer/jobs'; }, 1500);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <EmployerLayout currentPath="/employer/jobs">
        <div className="animate-pulse h-64 bg-sky-100 rounded-2xl" />
      </EmployerLayout>
    );
  }

  if (!company) {
    return (
      <EmployerLayout currentPath="/employer/jobs">
        <div className="bg-white rounded-2xl border border-sky-100 py-16 text-center">
          <Briefcase className="w-12 h-12 text-sky-200 mx-auto mb-3" />
          <h3 className="text-slate-700 font-bold mb-2">Setup profil perusahaan terlebih dahulu</h3>
          <a href="/employer/company" className="inline-flex items-center gap-1.5 gradient-cta text-white rounded-xl px-5 py-2.5 text-sm font-semibold mt-3 hover:brightness-110 transition-all">
            Setup Perusahaan
          </a>
        </div>
      </EmployerLayout>
    );
  }

  return (
    <EmployerLayout currentPath="/employer/jobs">
      <div className="max-w-3xl">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-800">Pasang Lowongan Baru</h1>
          <p className="text-slate-500 text-sm mt-1">Isi detail posisi yang ingin kamu rekrut</p>
        </div>

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5 text-emerald-700 text-sm font-medium flex items-center gap-2">
            <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px]">✓</span>
            </div>
            Lowongan berhasil dipasang! Mengalihkan ke halaman lowongan...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Basic Info */}
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-sky-500" /> Informasi Dasar
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Judul Posisi *</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Frontend Developer React" className="input-field" required />
              </div>
              <div>
                <label className="label">Kategori</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                  <option value="">Pilih kategori</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Tipe Pekerjaan</label>
                <select value={form.job_type} onChange={(e) => setForm({ ...form, job_type: e.target.value })} className="input-field">
                  {JOB_TYPES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Kota / Lokasi</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                  <input value={form.location_city} onChange={(e) => setForm({ ...form, location_city: e.target.value })} placeholder="Jakarta, Remote, Hybrid, dll." className="input-field pl-10" />
                </div>
              </div>
              <div>
                <label className="label">Kuota Rekrut</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                  <input type="number" min="1" value={form.quota} onChange={(e) => setForm({ ...form, quota: e.target.value })} className="input-field pl-10" />
                </div>
              </div>
            </div>
          </div>

          {/* Salary */}
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-sky-500" /> Kisaran Gaji (juta Rp/bulan)
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="label">Minimum</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
                  <input type="number" value={form.salary_min} onChange={(e) => setForm({ ...form, salary_min: e.target.value })} placeholder="5" className="input-field pl-9" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">jt</span>
                </div>
              </div>
              <span className="text-slate-400 mt-6">—</span>
              <div className="flex-1">
                <label className="label">Maksimum</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
                  <input type="number" value={form.salary_max} onChange={(e) => setForm({ ...form, salary_max: e.target.value })} placeholder="15" className="input-field pl-9" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">jt</span>
                </div>
              </div>
            </div>
            <p className="text-slate-400 text-xs mt-2">Kosongkan jika gaji bisa negosiasi</p>
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-500" /> Detail Pekerjaan
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Deskripsi Pekerjaan</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Jelaskan tanggung jawab, tim, dan lingkungan kerja..."
                  className="input-field h-36 resize-none"
                />
              </div>
              <div>
                <label className="label">Kualifikasi & Persyaratan</label>
                <textarea
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  placeholder="Minimal pendidikan, pengalaman, skill yang dibutuhkan..."
                  className="input-field h-36 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6">
            <h2 className="font-bold text-slate-800 mb-3">Status Lowongan</h2>
            <div className="flex gap-3">
              {[{ value: 'active', label: 'Langsung Aktif', desc: 'Langsung terlihat oleh pelamar' }, { value: 'draft', label: 'Simpan Draft', desc: 'Belum terlihat pelamar' }].map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, status: value })}
                  className={`flex-1 rounded-2xl border-2 p-4 text-left transition-all ${
                    form.status === value ? 'border-sky-500 bg-sky-50' : 'border-sky-100 hover:border-sky-200'
                  }`}
                >
                  <p className={`text-sm font-semibold ${form.status === value ? 'text-sky-700' : 'text-slate-600'}`}>{label}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">{error}</div>
          )}

          <div className="flex gap-3">
            <a href="/employer/jobs" className="flex-1 flex items-center justify-center border border-sky-200 text-slate-600 rounded-xl py-3 text-sm font-semibold hover:bg-sky-50 transition-colors">
              Batal
            </a>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 gradient-cta text-white rounded-xl py-3 text-sm font-semibold shadow-lg shadow-cyan-500/30 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Menyimpan...</>
              ) : (
                <><Save className="w-4 h-4" /> Pasang Lowongan</>
              )}
            </button>
          </div>
        </form>
      </div>
    </EmployerLayout>
  );
}
