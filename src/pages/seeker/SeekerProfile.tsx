import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Save, User, MapPin, Phone, DollarSign, GraduationCap, Briefcase, Tag } from 'lucide-react';
import SeekerLayout from '../../components/layout/SeekerLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';
import { SeekerProfile as SeekerProfileType, SeekerEducation, SeekerExperience, SeekerSkill } from '../../lib/types';

export default function SeekerProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<SeekerProfileType | null>(null);
  const [education, setEducation] = useState<SeekerEducation[]>([]);
  const [experience, setExperience] = useState<SeekerExperience[]>([]);
  const [skills, setSkills] = useState<SeekerSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newSkill, setNewSkill] = useState('');

  const [form, setForm] = useState({
    full_name: '', phone: '', domicile_city: '', about: '',
    expected_salary_min: '', expected_salary_max: '',
  });

  const loadProfile = useCallback(async () => {
    if (!supabase || !user) return;

    setLoading(true);
    const { data: p } = await supabase.from('seeker_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (p) {
      setProfile(p);
      setForm({
        full_name: p.full_name || '',
        phone: p.phone || '',
        domicile_city: p.domicile_city || '',
        about: p.about || '',
        expected_salary_min: p.expected_salary_min ? String(Math.round(p.expected_salary_min / 1000000)) : '',
        expected_salary_max: p.expected_salary_max ? String(Math.round(p.expected_salary_max / 1000000)) : '',
      });

      const [eduRes, expRes, skillRes] = await Promise.all([
        supabase.from('seeker_education').select('*').eq('seeker_id', p.id).order('start_year', { ascending: false }),
        supabase.from('seeker_experience').select('*').eq('seeker_id', p.id).order('start_date', { ascending: false }),
        supabase.from('seeker_skills').select('*').eq('seeker_id', p.id),
      ]);
      setEducation(eduRes.data || []);
      setExperience(expRes.data || []);
      setSkills(skillRes.data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) void loadProfile();
  }, [loadProfile, user]);

  async function saveProfile() {
    if (!supabase || !user) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      full_name: form.full_name,
      phone: form.phone,
      domicile_city: form.domicile_city,
      about: form.about,
      expected_salary_min: form.expected_salary_min ? parseInt(form.expected_salary_min) * 1000000 : 0,
      expected_salary_max: form.expected_salary_max ? parseInt(form.expected_salary_max) * 1000000 : 0,
      updated_at: new Date().toISOString(),
    };

    if (profile) {
      await supabase.from('seeker_profiles').update(payload).eq('id', profile.id);
    } else {
      const { data } = await supabase.from('seeker_profiles').insert(payload).select().maybeSingle();
      setProfile(data);
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
    await loadProfile();
  }

  async function addSkill() {
    if (!supabase || !newSkill.trim() || !profile) return;
    const { data } = await supabase.from('seeker_skills').insert({ seeker_id: profile.id, skill_name: newSkill.trim() }).select().maybeSingle();
    if (data) setSkills((prev) => [...prev, data]);
    setNewSkill('');
  }

  async function removeSkill(id: string) {
    if (!supabase) return;
    await supabase.from('seeker_skills').delete().eq('id', id);
    setSkills((prev) => prev.filter((s) => s.id !== id));
  }

  async function addEducation() {
    if (!supabase || !profile) return;
    const { data } = await supabase.from('seeker_education').insert({ seeker_id: profile.id, school_name: 'Nama Sekolah/Universitas' }).select().maybeSingle();
    if (data) setEducation((prev) => [data, ...prev]);
  }

  async function updateEducation(id: string, field: keyof SeekerEducation, value: string | boolean | number | undefined) {
    if (!supabase) return;
    setEducation((prev) => prev.map((e) => e.id === id ? { ...e, [field]: value } : e));
    await supabase.from('seeker_education').update({ [field]: value }).eq('id', id);
  }

  async function removeEducation(id: string) {
    if (!supabase) return;
    await supabase.from('seeker_education').delete().eq('id', id);
    setEducation((prev) => prev.filter((e) => e.id !== id));
  }

  async function addExperience() {
    if (!supabase || !profile) return;
    const { data } = await supabase.from('seeker_experience').insert({ seeker_id: profile.id, company_name: 'Nama Perusahaan', position: 'Posisi' }).select().maybeSingle();
    if (data) setExperience((prev) => [data, ...prev]);
  }

  async function updateExperience(id: string, field: keyof SeekerExperience, value: string | boolean | undefined) {
    if (!supabase) return;
    setExperience((prev) => prev.map((e) => e.id === id ? { ...e, [field]: value } : e));
    await supabase.from('seeker_experience').update({ [field]: value }).eq('id', id);
  }

  async function removeExperience(id: string) {
    if (!supabase) return;
    await supabase.from('seeker_experience').delete().eq('id', id);
    setExperience((prev) => prev.filter((e) => e.id !== id));
  }

  if (loading) {
    return (
      <SeekerLayout currentPath="/seeker/profile">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-sky-100 rounded-2xl" />
          <div className="h-64 bg-sky-100 rounded-2xl" />
        </div>
      </SeekerLayout>
    );
  }

  return (
    <SeekerLayout currentPath="/seeker/profile">
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Profil Saya</h1>
            <p className="text-slate-500 text-sm mt-1">Profilmu adalah CVmu — lengkapi untuk peluang lebih baik</p>
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
              saved ? 'bg-emerald-500 text-white' : 'gradient-cta text-white shadow-lg shadow-cyan-500/30 hover:brightness-110'
            } active:scale-95 disabled:opacity-50`}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : saved ? 'Tersimpan!' : 'Simpan'}
          </button>
        </div>

        {/* Profile completion bar */}
        {profile && (
          <div className="bg-white rounded-2xl border border-sky-100 p-4 mb-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-700 text-xs font-semibold">Kelengkapan Profil</span>
              <span className="text-sky-600 text-xs font-bold">
                {Math.min(100, [profile.full_name, profile.phone, profile.domicile_city, profile.about, education.length > 0, experience.length > 0, skills.length > 0].filter(Boolean).length * 14)}%
              </span>
            </div>
            <div className="h-2 bg-sky-100 rounded-full overflow-hidden">
              <div
                className="h-full gradient-cta rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, [profile.full_name, profile.phone, profile.domicile_city, profile.about, education.length > 0, experience.length > 0, skills.length > 0].filter(Boolean).length * 14)}%` }}
              />
            </div>
          </div>
        )}

        {/* Personal Info */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 mb-5">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-sky-500" /> Informasi Pribadi
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nama Lengkap</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nama lengkapmu" className="input-field" />
            </div>
            <div>
              <label className="label">Nomor HP</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+62 812 xxxx xxxx" className="input-field pl-10" />
              </div>
            </div>
            <div>
              <label className="label">Domisili / Kota</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                <input value={form.domicile_city} onChange={(e) => setForm({ ...form, domicile_city: e.target.value })} placeholder="Jakarta, Surabaya, dll." className="input-field pl-10" />
              </div>
            </div>
            <div>
              <label className="label">Gaji Diharapkan (juta Rp/bln)</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-400" />
                  <input type="number" value={form.expected_salary_min} onChange={(e) => setForm({ ...form, expected_salary_min: e.target.value })} placeholder="Min" className="input-field pl-10" />
                </div>
                <span className="text-slate-400 text-sm">-</span>
                <input type="number" value={form.expected_salary_max} onChange={(e) => setForm({ ...form, expected_salary_max: e.target.value })} placeholder="Max" className="input-field flex-1" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Tentang Saya</label>
              <textarea value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} placeholder="Ceritakan sedikit tentang dirimu, pengalaman, dan tujuan karirmu..." className="input-field h-28 resize-none" />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 mb-5">
          <h2 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Tag className="w-4 h-4 text-sky-500" /> Keahlian
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-sky-700 rounded-full px-3 py-1 text-xs font-medium">
                {s.skill_name}
                <button onClick={() => removeSkill(s.id)} className="text-sky-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSkill()}
              placeholder="Tambah keahlian (e.g., React, Marketing)..."
              className="input-field"
            />
            <button onClick={addSkill} className="gradient-cta text-white rounded-xl px-4 py-2.5 text-sm font-semibold whitespace-nowrap hover:brightness-110 transition-all flex items-center gap-1">
              <Plus className="w-4 h-4" /> Tambah
            </button>
          </div>
        </div>

        {/* Education */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-sky-500" /> Pendidikan
            </h2>
            <button onClick={addEducation} className="flex items-center gap-1 text-sky-600 text-xs font-semibold hover:text-sky-800 transition-colors border border-sky-200 rounded-xl px-3 py-1.5 hover:bg-sky-50">
              <Plus className="w-3.5 h-3.5" /> Tambah
            </button>
          </div>
          {education.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Belum ada riwayat pendidikan</p>
          ) : (
            <div className="space-y-4">
              {education.map((edu) => (
                <div key={edu.id} className="relative pl-5 border-l-2 border-sky-200 pb-4 last:pb-0">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 gradient-cta rounded-full" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label text-[10px]">Nama Institusi</label>
                      <input value={edu.school_name} onChange={(e) => updateEducation(edu.id, 'school_name', e.target.value)} className="input-field text-sm py-2" />
                    </div>
                    <div>
                      <label className="label text-[10px]">Jurusan / Bidang Studi</label>
                      <input value={edu.major || ''} onChange={(e) => updateEducation(edu.id, 'major', e.target.value)} className="input-field text-sm py-2" />
                    </div>
                    <div>
                      <label className="label text-[10px]">Jenjang</label>
                      <select value={edu.degree || ''} onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)} className="input-field text-sm py-2">
                        <option value="">Pilih jenjang</option>
                        <option value="SMA/SMK">SMA/SMK</option>
                        <option value="D3">D3</option>
                        <option value="S1">S1</option>
                        <option value="S2">S2</option>
                        <option value="S3">S3</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="label text-[10px]">Tahun Mulai</label>
                        <input type="number" value={edu.start_year || ''} onChange={(e) => updateEducation(edu.id, 'start_year', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="input-field text-sm py-2" placeholder="2018" />
                      </div>
                      <div className="flex-1">
                        <label className="label text-[10px]">Tahun Selesai</label>
                        <input type="number" value={edu.end_year || ''} onChange={(e) => updateEducation(edu.id, 'end_year', e.target.value ? parseInt(e.target.value, 10) : undefined)} className="input-field text-sm py-2" placeholder="2022" disabled={edu.is_current} />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeEducation(edu.id)} className="absolute top-0 right-0 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Experience */}
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-sky-500" /> Pengalaman Kerja
            </h2>
            <button onClick={addExperience} className="flex items-center gap-1 text-sky-600 text-xs font-semibold hover:text-sky-800 transition-colors border border-sky-200 rounded-xl px-3 py-1.5 hover:bg-sky-50">
              <Plus className="w-3.5 h-3.5" /> Tambah
            </button>
          </div>
          {experience.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">Belum ada riwayat pengalaman kerja</p>
          ) : (
            <div className="space-y-5">
              {experience.map((exp) => (
                <div key={exp.id} className="relative pl-5 border-l-2 border-cyan-200 pb-4 last:pb-0">
                  <div className="absolute -left-1.5 top-0 w-3 h-3 gradient-badge rounded-full" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label text-[10px]">Nama Perusahaan</label>
                      <input value={exp.company_name} onChange={(e) => updateExperience(exp.id, 'company_name', e.target.value)} className="input-field text-sm py-2" />
                    </div>
                    <div>
                      <label className="label text-[10px]">Posisi / Jabatan</label>
                      <input value={exp.position || ''} onChange={(e) => updateExperience(exp.id, 'position', e.target.value)} className="input-field text-sm py-2" />
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="label text-[10px]">Mulai</label>
                        <input type="date" value={exp.start_date || ''} onChange={(e) => updateExperience(exp.id, 'start_date', e.target.value)} className="input-field text-sm py-2" />
                      </div>
                      <div className="flex-1">
                        <label className="label text-[10px]">Selesai</label>
                        <input type="date" value={exp.end_date || ''} onChange={(e) => updateExperience(exp.id, 'end_date', e.target.value)} className="input-field text-sm py-2" disabled={exp.is_current} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={exp.is_current} onChange={(e) => updateExperience(exp.id, 'is_current', e.target.checked)} className="w-4 h-4 accent-sky-500" id={`current-${exp.id}`} />
                      <label htmlFor={`current-${exp.id}`} className="text-slate-600 text-xs">Masih bekerja di sini</label>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label text-[10px]">Deskripsi Pekerjaan</label>
                      <textarea value={exp.description || ''} onChange={(e) => updateExperience(exp.id, 'description', e.target.value)} className="input-field text-sm py-2 h-20 resize-none" placeholder="Deskripsikan tanggung jawab dan pencapaianmu..." />
                    </div>
                  </div>
                  <button onClick={() => removeExperience(exp.id)} className="absolute top-0 right-0 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save button at bottom */}
        <button
          onClick={saveProfile}
          disabled={saving}
          className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-semibold transition-all ${
            saved ? 'bg-emerald-500 text-white' : 'gradient-cta text-white shadow-lg shadow-cyan-500/30 hover:brightness-110'
          } active:scale-95 disabled:opacity-50`}
        >
          <Save className="w-4 h-4" />
          {saving ? 'Menyimpan...' : saved ? 'Profil Tersimpan!' : 'Simpan Profil'}
        </button>
      </div>
    </SeekerLayout>
  );
}
