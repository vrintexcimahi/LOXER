import { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Download,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Filter,
  User,
  LayoutTemplate,
  ZoomIn,
  ZoomOut,
  Check,
  Eye,
  Edit3,
  Camera,
  Target,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  UserCheck,
  AlertCircle,
  Type,
  Bold,
  Italic,
  X,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import PublicMobileBottomNav from '../../components/layout/PublicMobileBottomNav';
import { CV_TEMPLATES, CvTemplateInfo } from '../../lib/cvTemplates';
import { CvData, INITIAL_CV_DATA, CvExperience, CvEducation } from '../../lib/cvTypes';
import { ROLE_PRESETS, generateCvDataAutomatically } from '../../services/cvAiService';
import { CvCanvasRenderer, CanvaElementStyle } from '../../components/cv/CvCanvasRenderer';
import { useAuth } from '../../contexts/useAuth';
import { supabase } from '../../lib/supabase';

const ELEMENT_LABELS: Record<string, string> = {
  fullName: 'Nama Lengkap',
  headline: 'Posisi / Headline',
  photo: 'Foto Profil',
  contact: 'Kontak Pribadi',
  phone: 'No. WhatsApp',
  email: 'Email',
  city: 'Kota Domisili',
  summary: 'Ringkasan Profil',
  experience: 'Pengalaman Kerja',
  education: 'Riwayat Pendidikan',
  skills: 'Keahlian / Skill',
  languages: 'Kemampuan Bahasa',
  certifications: 'Sertifikasi',
  interests: 'Hobi & Minat',
};

export default function CvGenerator() {
  const [activeTab, setActiveTab] = useState<'auto_generator' | 'templates' | 'editor'>('templates');
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedTemplate, setSelectedTemplate] = useState<CvTemplateInfo>(CV_TEMPLATES[0]);
  const [cvData, setCvData] = useState<CvData>(INITIAL_CV_DATA);
  const [zoomScale, setZoomScale] = useState<number>(0.65);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Canva Per-Element Selection & Typography Styles
  const [selectedElement, setSelectedElement] = useState<string | null>('fullName');
  const [elementStyles, setElementStyles] = useState<Record<string, CanvaElementStyle>>({});

  // Auth & Seeker Sync
  const { user } = useAuth();
  const [isSyncingProfile, setIsSyncingProfile] = useState<boolean>(false);
  const [showAtsDetails, setShowAtsDetails] = useState<boolean>(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Sulap Foto 9.7 VIP CV Form States
  const [selectedStyle, setSelectedStyle] = useState<string>('Profesional Formal');
  const [selectedColor, setSelectedColor] = useState<string>('Biru Profesional');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string>('');

  const DRAFT_KEY = 'loxer_cv_draft_v2';

  // 1. Auto-Restore Saved Draft from LocalStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.fullName) {
          setCvData(parsed);
          setLastSavedTime('Tersimpan di perangkat');
        }
      }
    } catch (e) {
      console.warn('Gagal memuat draft CV:', e);
    }
  }, []);

  // 2. Debounced Auto-Save Draft
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(cvData));
        const now = new Date();
        setLastSavedTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
      } catch (e) {
        console.warn('Gagal auto-save CV:', e);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [cvData]);

  // 3. Reset to Default Template Data
  const handleResetToDefault = () => {
    if (window.confirm('Reset semua perubahan dan kembalikan ke data template awal?')) {
      setCvData(INITIAL_CV_DATA);
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch (e) {
        // ignore
      }
      showToast('Data CV dikembalikan ke template awal.');
    }
  };

  // 4. 1-Click Sync from Seeker Profile (LOXER Database)
  const handleSyncFromSeekerProfile = async () => {
    if (!user) {
      showToast('Silakan masuk ke akun LOXER Anda untuk menarik data profil.');
      return;
    }
    if (!supabase) {
      showToast('Layanan sinkronisasi database offline.');
      return;
    }

    setIsSyncingProfile(true);
    try {
      const { data: p } = await supabase
        .from('seeker_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!p) {
        showToast('Profil Pencari Kerja belum ditemukan. Lengkapi profil Anda di menu Pekerja.');
        return;
      }

      const [eduRes, expRes, skillRes] = await Promise.all([
        supabase.from('seeker_education').select('*').eq('seeker_id', p.id).order('start_year', { ascending: false }),
        supabase.from('seeker_experience').select('*').eq('seeker_id', p.id).order('start_date', { ascending: false }),
        supabase.from('seeker_skills').select('*').eq('seeker_id', p.id),
      ]);

      const mappedEducations: CvEducation[] = (eduRes.data || []).map((edu: any, idx: number) => ({
        id: `edu-sync-${idx}-${Date.now()}`,
        school: edu.school_name || edu.institution_name || 'Institusi Pendidikan',
        major: edu.degree || edu.field_of_study || 'Program Studi',
        period: `${edu.start_year || ''} - ${edu.end_year || 'Sekarang'}`.trim(),
        gpa: edu.grade || '',
      }));

      const mappedExperiences: CvExperience[] = (expRes.data || []).map((exp: any, idx: number) => ({
        id: `exp-sync-${idx}-${Date.now()}`,
        position: exp.job_title || exp.role_title || 'Posisi Pekerjaan',
        company: exp.company_name || 'Nama Perusahaan',
        period: `${exp.start_date || ''} - ${exp.end_date || 'Sekarang'}`.trim(),
        description: exp.description || '',
      }));

      const mappedSkills: string[] = (skillRes.data || []).map((s: any) => s.skill_name || s.name).filter(Boolean);

      setCvData((prev) => ({
        ...prev,
        fullName: p.full_name || prev.fullName,
        email: user.email || prev.email,
        phone: p.phone || prev.phone,
        city: p.domicile_city || prev.city,
        summary: p.about || prev.summary,
        photoUrl: p.photo_url || prev.photoUrl,
        educations: mappedEducations.length > 0 ? mappedEducations : prev.educations,
        experiences: mappedExperiences.length > 0 ? mappedExperiences : prev.experiences,
        skills: mappedSkills.length > 0 ? mappedSkills : prev.skills,
      }));

      showToast('Profil LOXER Anda berhasil ditarik ke dalam CV!');
    } catch (err) {
      console.error(err);
      showToast('Gagal menyinkronkan profil LOXER.');
    } finally {
      setIsSyncingProfile(false);
    }
  };

  // 5. Real-Time ATS Score Calculation & Interactive Checklist
  const atsAnalysis = useMemo(() => {
    let score = 0;
    const checks: { label: string; passed: boolean; tip: string }[] = [];

    // Identitas
    const nameOk = !!cvData.fullName?.trim() && cvData.fullName.trim() !== 'Nama Lengkap';
    checks.push({
      label: 'Nama Lengkap Pelamar',
      passed: nameOk,
      tip: 'Isi nama lengkap Anda dengan benar.',
    });
    if (nameOk) score += 10;

    // Posisi
    const headlineOk = !!cvData.headline?.trim() && cvData.headline.trim() !== 'Posisi / Pekerjaan Impian';
    checks.push({
      label: 'Posisi Target Pekerjaan',
      passed: headlineOk,
      tip: 'Tuliskan posisi spesifik yang ingin dilamar.',
    });
    if (headlineOk) score += 10;

    // Kontak
    const contactOk = !!cvData.email?.trim() && !!cvData.phone?.trim();
    checks.push({
      label: 'Kontak (Email & WhatsApp)',
      passed: contactOk,
      tip: 'Lengkapi nomor kontak WhatsApp dan email aktif.',
    });
    if (contactOk) score += 10;

    // Domisili
    const cityOk = !!cvData.city?.trim();
    checks.push({
      label: 'Kota / Domisili',
      passed: cityOk,
      tip: 'Cantumkan kota domisili Anda untuk referensi HRD.',
    });
    if (cityOk) score += 10;

    // Ringkasan Diri (Bio)
    const summaryWords = cvData.summary?.trim().split(/\s+/).filter(Boolean).length || 0;
    const summaryOk = summaryWords >= 15;
    checks.push({
      label: 'Ringkasan Profil (Min 15 kata)',
      passed: summaryOk,
      tip: 'Tulis ringkasan profil minimal 15 kata agar lolos saringan awal ATS.',
    });
    if (summaryOk) score += 15;

    // Pengalaman
    const expOk = (cvData.experiences || []).length > 0 && !!cvData.experiences[0]?.company?.trim();
    checks.push({
      label: 'Riwayat Pengalaman Kerja / Proyek',
      passed: expOk,
      tip: 'Cantumkan minimal 1 pengalaman kerja, magang, atau proyek.',
    });
    if (expOk) score += 15;

    // Pendidikan
    const eduOk = (cvData.educations || []).length > 0 && !!cvData.educations[0]?.school?.trim();
    checks.push({
      label: 'Pendidikan Terakhir',
      passed: eduOk,
      tip: 'Cantumkan sekolah atau perguruan tinggi terakhir Anda.',
    });
    if (eduOk) score += 15;

    // Keahlian
    const skillsCount = (cvData.skills || []).length;
    const skillsOk = skillsCount >= 3;
    checks.push({
      label: 'Keahlian Utama (Min 3 Skill)',
      passed: skillsOk,
      tip: 'Tambahkan minimal 3 keahlian teknis atau kompetensi kerja.',
    });
    if (skillsOk) score += 15;

    let tierLabel = 'Perlu Dilengkapi';
    let tierBadgeClass = 'bg-amber-500/15 text-amber-500 dark:text-amber-400 border-amber-500/30';
    if (score >= 80) {
      tierLabel = 'Sangat Baik (ATS Friendly)';
      tierBadgeClass = 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30';
    } else if (score >= 60) {
      tierLabel = 'Cukup Baik';
      tierBadgeClass = 'bg-cyan-500/15 text-cyan-500 dark:text-cyan-400 border-cyan-500/30';
    }

    return { score: Math.min(100, score), checks, tierLabel, tierBadgeClass };
  }, [cvData]);

  // Responsive zoom scale calculation for mobile vs desktop: precisely fits container width without overflow
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 360) {
        setZoomScale(0.35);
      } else if (width < 420) {
        setZoomScale(0.38); // Fits 375px - 414px mobile screens centered with zero cut-off
      } else if (width < 640) {
        setZoomScale(0.42);
      } else if (width < 1024) {
        setZoomScale(0.55);
      } else {
        setZoomScale(0.72);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const categories = [
    'Semua',
    'Modern & Profesional',
    'Fresh Graduate',
    'Kreatif & Desain',
    'Kasir & Retail',
    'Administrasi & Kantor',
    'Manajemen & Korporat',
  ];

  const filteredTemplates =
    selectedCategory === 'Semua'
      ? CV_TEMPLATES
      : CV_TEMPLATES.filter((t) => t.category === selectedCategory);

  // 1-Click Quick Preset from Industry
  const handleUpdateCvField = (field: keyof CvData, value: any) => {
    setCvData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleApplyPresetRole = async (roleName: string) => {
    setIsGeneratingAi(true);
    try {
      const generated = await generateCvDataAutomatically(roleName, {
        fullName: cvData.fullName,
        email: cvData.email,
        phone: cvData.phone,
        city: cvData.city,
        photoUrl: cvData.photoUrl,
      });
      setCvData({
        ...generated,
        styleOption: selectedStyle,
        colorOption: selectedColor,
      });
      showToast(`Data CV untuk "${roleName}" berhasil diisi otomatis!`);
    } catch (e) {
      console.error(e);
      showToast('Gagal membuat data CV otomatis.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Full AI Analyze & Create CV Function (Adapted from Sulap Foto 9.7 VIP)
  const handleFullAiAnalyze = async () => {
    if (!cvData.fullName || !cvData.headline) {
      showToast('Mohon lengkapi Nama Lengkap dan Posisi yang dilamar.');
      return;
    }

    setIsGeneratingAi(true);
    try {
      const targetRole = cvData.headline;
      const generated = await generateCvDataAutomatically(targetRole, {
        fullName: cvData.fullName,
        email: cvData.email,
        phone: cvData.phone,
        city: cvData.city,
        photoUrl: cvData.photoUrl,
      });

      const analysisNote = `AI Analysis Completed:
• Kualifikasi pelamar diselaraskan dengan standar rekrutmen: ${cvData.headline}
• Struktur bahasa dioptimasi untuk sistem ATS & HRD perbankan/perusahaan modern
• Gaya Desain: ${selectedStyle} | Skema Aksen: ${selectedColor}
• Model Engine: Gemini 3.8 Flash High (9Router)`;

      setAiAnalysisResult(analysisNote);
      setCvData({
        ...generated,
        styleOption: selectedStyle,
        colorOption: selectedColor,
      });

      // Synchronize color scheme with master template
      const matchedTemplate =
        CV_TEMPLATES.find((t) => {
          if (selectedColor === 'Hijau Alam') return t.id.includes('hijau');
          if (selectedColor === 'Merah Energik') return t.id.includes('merah');
          if (selectedColor === 'Hitam Emas Elegan') return t.id.includes('emas') || t.id.includes('black');
          if (selectedColor === 'Cokelat Earth') return t.id.includes('brown');
          return t.id.includes('biru');
        }) || selectedTemplate;

      setSelectedTemplate(matchedTemplate);
      showToast('Analisa AI selesai! CV siap ditinjau dan dicetak.');
    } catch (err) {
      console.error(err);
      showToast('Terjadi kesalahan saat memproses AI CV.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleAddExperience = () => {
    const newExp: CvExperience = {
      id: `exp-${Date.now()}`,
      position: 'Posisi Baru',
      company: 'Nama Perusahaan',
      period: '2023 - 2024',
      description: 'Deskripsi pekerjaan dan kontribusi Anda di posisi ini.',
    };
    setCvData((prev) => ({
      ...prev,
      experiences: [newExp, ...prev.experiences],
    }));
  };

  const handleRemoveExperience = (id: string) => {
    setCvData((prev) => ({
      ...prev,
      experiences: prev.experiences.filter((e) => e.id !== id),
    }));
  };

  const handleAddEducation = () => {
    const newEdu: CvEducation = {
      id: `edu-${Date.now()}`,
      school: 'Nama Sekolah / Universitas',
      major: 'Jurusan / Bidang Studi',
      period: '2020 - 2023',
    };
    setCvData((prev) => ({
      ...prev,
      educations: [...prev.educations, newEdu],
    }));
  };

  const handleRemoveEducation = (id: string) => {
    setCvData((prev) => ({
      ...prev,
      educations: prev.educations.filter((e) => e.id !== id),
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        showToast('Ukuran file maksimal 8MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const img = new Image();
          img.onload = () => {
            const MAX_DIM = 800;
            let w = img.width;
            let h = img.height;
            if (w > MAX_DIM || h > MAX_DIM) {
              if (w > h) {
                h = Math.round((h * MAX_DIM) / w);
                w = MAX_DIM;
              } else {
                w = Math.round((w * MAX_DIM) / h);
                h = MAX_DIM;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const compressedData = canvas.toDataURL('image/jpeg', 0.88);
              setCvData((prev) => ({ ...prev, photoUrl: compressedData }));
              showToast('Pas foto profil berhasil diunggah!');
            }
          };
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Skills managed directly in form

  return (
    <div className="bg-slate-50 dark:bg-[#071220] min-h-screen text-slate-800 dark:text-slate-100 flex flex-col pb-24 md:pb-12 transition-colors duration-200">
      {/* Navbar Header */}
      <Navbar />

      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3 flex-1 flex flex-col">
        {/* Mobile View Segmented Toggle (Only on mobile / <lg when viewing Editor or Auto CV) */}
        {activeTab !== 'templates' && (
          <div className="lg:hidden flex items-center p-1 bg-slate-200/80 dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-white/10 shadow-sm mb-3">
            <button
              type="button"
              onClick={() => setMobileView('form')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mobileView === 'form'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Formulir Data</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileView('preview')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                mobileView === 'preview'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Pratinjau A4 ({Math.round(zoomScale * 100)}%)</span>
            </button>
          </div>
        )}

        {/* Workspace Layout: Left Panel Tabs (Templates / Edit / AI) vs Right Live Canvas */}
        <div className={`grid grid-cols-1 ${activeTab === 'templates' ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-6 flex-1 items-start`}>
          {/* Left Column Controls */}
          <div className={`${activeTab === 'templates' ? 'w-full' : 'lg:col-span-6 xl:col-span-5'} ${activeTab !== 'templates' && mobileView === 'preview' ? 'hidden lg:flex' : 'flex'} flex-col space-y-4`}>
            {/* Navigation Tabs Pill */}
            <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-900/80 rounded-2xl border border-slate-300/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('templates');
                  setMobileView('form');
                }}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'templates'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutTemplate className="w-4 h-4" />
                <span>Template CV</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'editor'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Edit Template</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('auto_generator')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'auto_generator'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Auto CV</span>
              </button>
            </div>

            {/* Smart Utilities Bar (ATS Score, Auto-Save Status, Sync LOXER Profile) */}
            {activeTab !== 'templates' && (
              <div className="bg-white dark:bg-slate-900/90 rounded-2xl p-3 border border-slate-200 dark:border-white/10 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* ATS Score Button & Pill */}
                  <button
                    type="button"
                    onClick={() => setShowAtsDetails((v) => !v)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all ${atsAnalysis.tierBadgeClass} hover:opacity-90 active:scale-95 cursor-pointer`}
                    title="Klik untuk melihat tips kelengkapan ATS"
                  >
                    <Target size={14} className="shrink-0" />
                    <span>Skor ATS: {atsAnalysis.score}%</span>
                    <span className="text-[10px] font-semibold opacity-90 hidden sm:inline">
                      • {atsAnalysis.tierLabel}
                    </span>
                    {showAtsDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  <div className="flex items-center gap-2">
                    {/* 1-Click Sync LOXER Profile */}
                    <button
                      type="button"
                      disabled={isSyncingProfile}
                      onClick={handleSyncFromSeekerProfile}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/15 text-slate-700 dark:text-slate-300 hover:text-cyan-400 border border-slate-200 dark:border-white/5 text-[11px] font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                      title="Tarik data otomatis dari akun Profil Pencari Kerja LOXER Anda"
                    >
                      {isSyncingProfile ? (
                        <RefreshCw size={12} className="animate-spin text-cyan-400" />
                      ) : (
                        <UserCheck size={13} className="text-cyan-500" />
                      )}
                      <span>Tarik Profil LOXER</span>
                    </button>

                    {/* Reset Button */}
                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-red-400 border border-slate-200 dark:border-white/5 text-xs transition-colors cursor-pointer"
                      title="Kembalikan ke data awal"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                </div>

                {/* Status Bar: Auto-Save Indicator */}
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 px-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>
                      {lastSavedTime ? `Draft tersimpan (${lastSavedTime})` : 'Draft otomatis tersimpan di perangkat'}
                    </span>
                  </div>
                  <span className="font-medium text-slate-400">Penyimpanan lokal aman</span>
                </div>

                {/* Expandable ATS Score Breakdown & Actionable Checklist */}
                {showAtsDetails && (
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                      <span>Kelengkapan Standar ATS HRD:</span>
                      <span className="text-cyan-500 font-black">{atsAnalysis.score} / 100 poin</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          atsAnalysis.score >= 80 ? 'bg-emerald-500' : atsAnalysis.score >= 60 ? 'bg-cyan-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${atsAnalysis.score}%` }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[10px]">
                      {atsAnalysis.checks.map((chk, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded-xl border flex items-start gap-1.5 ${
                            chk.passed
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-700 dark:text-slate-300'
                              : 'bg-amber-500/5 border-amber-500/20 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {chk.passed ? (
                            <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                          ) : (
                            <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <div className="font-bold leading-tight">{chk.label}</div>
                            {!chk.passed && <div className="text-[9px] text-amber-600 dark:text-amber-400 mt-0.5">{chk.tip}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: Template Gallery */}
            {activeTab === 'templates' && (
              <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
                {/* Category Filter Dropdown */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Filter className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Pilih Kategori Profesi:</span>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full appearance-none px-3.5 py-2 pr-9 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all cursor-pointer shadow-sm"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 py-1 font-medium">
                          {cat} {cat === 'Semua' ? `(${CV_TEMPLATES.length} Template)` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Templates Grid List */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[70vh] overflow-y-auto pr-1">
                  {filteredTemplates.map((tpl) => {
                    const isSelected = selectedTemplate.id === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setSelectedTemplate(tpl);
                          setActiveTab('editor');
                          setSelectedElement('fullName');
                          setMobileView('preview');
                          showToast(`Template "${tpl.name}" dibuka di Canva Editor! Klik elemen di kanvas untuk mengedit.`);
                        }}
                        className={`group cursor-pointer rounded-2xl border-2 p-2.5 transition-all relative flex flex-col justify-between hover:scale-[1.02] ${
                          isSelected
                            ? 'border-[#8b3dff] bg-[#8b3dff]/10 shadow-lg shadow-[#8b3dff]/25 ring-2 ring-[#8b3dff]/30'
                            : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 hover:border-[#8b3dff]/60 hover:shadow-md'
                        }`}
                      >
                        {/* Aspect Ratio A4 Miniature Thumbnail */}
                        <div className="w-full aspect-[210/297] rounded-xl overflow-hidden bg-slate-900/20 relative shadow-inner mb-2 border border-black/5 dark:border-white/5">
                          <img
                            src={tpl.svgUrl}
                            alt={tpl.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />

                          {/* Hover Action Badge: Buka Editor Canva */}
                          <div className="absolute inset-0 bg-[#8b3dff]/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 backdrop-blur-[0.5px]">
                            <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-[#8b3dff] text-white shadow-xl flex items-center gap-1.5 transform translate-y-1 group-hover:translate-y-0 transition-transform">
                              <Sparkles size={11} />
                              <span>Edit Canva</span>
                            </span>
                          </div>

                          {isSelected && (
                            <div className="absolute inset-0 bg-[#8b3dff]/25 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="w-7 h-7 rounded-full bg-[#8b3dff] text-white flex items-center justify-center shadow-lg">
                                <Check size={16} strokeWidth={3} />
                              </span>
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-[11px] font-bold line-clamp-1 text-slate-800 dark:text-slate-100">
                              {tpl.name}
                            </h4>
                            <span className="text-[9px] font-black text-[#8b3dff] shrink-0">
                              A4
                            </span>
                          </div>
                          <p className="text-[9px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {tpl.recommendedRoles}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Direct Element Editor (Canva Style) */}
            {activeTab === 'editor' && (
              <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4 max-h-[620px] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <LayoutTemplate className="w-4 h-4 text-cyan-500" />
                      <span>Editor Elemen Template</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Ubah data per elemen di bawah ini atau klik langsung di lembar kerja A4
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 truncate max-w-[120px]">
                    {selectedTemplate.name}
                  </span>
                </div>

                {/* 1. Header & Identitas Diri */}
                <div className={`space-y-3 p-3 rounded-2xl transition-all ${['fullName', 'headline'].includes(selectedElement || '') ? 'border-2 border-[#8b3dff] bg-[#8b3dff]/5 shadow-sm ring-1 ring-[#8b3dff]/20' : ''}`}>
                  <h4 className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#8b3dff]" />
                    <span>Nama & Profesi</span>
                  </h4>
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Nama Lengkap:</label>
                      <input
                        type="text"
                        value={cvData.fullName}
                        onFocus={() => setSelectedElement('fullName')}
                        onChange={(e) => handleUpdateCvField('fullName', e.target.value)}
                        placeholder="Nama Lengkap Anda"
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-[#8b3dff] outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Posisi / Jabatan Pekerjaan:</label>
                      <input
                        type="text"
                        value={cvData.headline}
                        onFocus={() => setSelectedElement('headline')}
                        onChange={(e) => handleUpdateCvField('headline', e.target.value)}
                        placeholder="Contoh: Senior Graphic Designer"
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-[#8b3dff] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Informasi Kontak */}
                <div className={`space-y-3 pt-3 border-t border-slate-100 dark:border-white/5 p-3 rounded-2xl transition-all ${['contact', 'phone', 'email', 'city'].includes(selectedElement || '') ? 'border-2 border-[#8b3dff] bg-[#8b3dff]/5 shadow-sm ring-1 ring-[#8b3dff]/20' : ''}`}>
                  <h4 className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                    Informasi Kontak
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Email:</label>
                      <input
                        type="email"
                        value={cvData.email}
                        onFocus={() => setSelectedElement('contact')}
                        onChange={(e) => handleUpdateCvField('email', e.target.value)}
                        placeholder="Email Anda"
                        className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">No. WhatsApp / HP:</label>
                      <input
                        type="text"
                        value={cvData.phone}
                        onFocus={() => setSelectedElement('contact')}
                        onChange={(e) => handleUpdateCvField('phone', e.target.value)}
                        placeholder="0812-3456-7890"
                        className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">Domisili / Kota:</label>
                    <input
                      type="text"
                      value={cvData.city}
                      onFocus={() => setSelectedElement('contact')}
                      onChange={(e) => handleUpdateCvField('city', e.target.value)}
                      placeholder="Contoh: Kota Bandung, Jawa Barat"
                      className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none"
                    />
                  </div>
                </div>

                {/* 3. Pas Foto Profil */}
                <div className={`space-y-2 pt-3 border-t border-slate-100 dark:border-white/5 p-3 rounded-2xl transition-all ${selectedElement === 'photo' ? 'border-2 border-[#8b3dff] bg-[#8b3dff]/5 shadow-sm ring-1 ring-[#8b3dff]/20' : ''}`}>
                  <h4 className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#8b3dff]" />
                      <span>Pas Foto Profil</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Opsional</span>
                  </h4>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 border border-slate-300 dark:border-white/10">
                      {cvData.photoUrl ? (
                        <img src={cvData.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all">
                        <span>Upload Pas Foto</span>
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1">Format JPG, PNG, WEBP</p>
                    </div>
                    {cvData.photoUrl && (
                      <button
                        type="button"
                        onClick={() => handleUpdateCvField('photoUrl', '')}
                        className="text-slate-400 hover:text-red-400 p-1 font-bold text-sm"
                        title="Hapus Foto"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Ringkasan Profil */}
                <div className={`space-y-2 pt-3 border-t border-slate-100 dark:border-white/5 p-3 rounded-2xl transition-all ${selectedElement === 'summary' ? 'border-2 border-[#8b3dff] bg-[#8b3dff]/5 shadow-sm ring-1 ring-[#8b3dff]/20' : ''}`}>
                  <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 block">
                    Ringkasan Diri (Summary / Bio)
                  </label>
                  <textarea
                    rows={3}
                    value={cvData.summary}
                    onFocus={() => setSelectedElement('summary')}
                    onChange={(e) => handleUpdateCvField('summary', e.target.value)}
                    placeholder="Tulis ringkasan profil pengalaman dan keahlian Anda..."
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none leading-relaxed"
                  />
                </div>

                {/* 5. Pendidikan Terakhir */}
                <div className={`space-y-2 pt-3 border-t border-slate-100 dark:border-white/5 p-3 rounded-2xl transition-all ${selectedElement === 'education' ? 'border-2 border-[#8b3dff] bg-[#8b3dff]/5 shadow-sm ring-1 ring-[#8b3dff]/20' : ''}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                      Pendidikan Terakhir
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddEducation}
                      className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
                    >
                      <Plus size={12} /> Tambah
                    </button>
                  </div>
                  <div className="space-y-2">
                    {cvData.educations.map((edu) => (
                      <div key={edu.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 space-y-1.5 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveEducation(edu.id)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                        <input
                          type="text"
                          value={edu.school}
                          onFocus={() => setSelectedElement('education')}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCvData((prev) => ({
                              ...prev,
                              educations: prev.educations.map((it) => (it.id === edu.id ? { ...it, school: val } : it)),
                            }));
                          }}
                          placeholder="Nama Sekolah / Universitas *"
                          className="w-full p-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none pr-6"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={edu.major}
                            onFocus={() => setSelectedElement('education')}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCvData((prev) => ({
                                ...prev,
                                educations: prev.educations.map((it) => (it.id === edu.id ? { ...it, major: val } : it)),
                              }));
                            }}
                            placeholder="Jurusan / Program Studi *"
                            className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none"
                          />
                          <input
                            type="text"
                            value={edu.period}
                            onFocus={() => setSelectedElement('education')}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCvData((prev) => ({
                                ...prev,
                                educations: prev.educations.map((it) => (it.id === edu.id ? { ...it, period: val } : it)),
                              }));
                            }}
                            placeholder="Tahun Masuk - Lulus"
                            className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. Pengalaman Kerja */}
                <div className={`space-y-2 pt-3 border-t border-slate-100 dark:border-white/5 p-3 rounded-2xl transition-all ${selectedElement === 'experience' ? 'border-2 border-[#8b3dff] bg-[#8b3dff]/5 shadow-sm ring-1 ring-[#8b3dff]/20' : ''}`}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">
                      Pengalaman Kerja
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddExperience}
                      className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
                    >
                      <Plus size={12} /> Tambah
                    </button>
                  </div>
                  <div className="space-y-2">
                    {cvData.experiences.map((exp) => (
                      <div key={exp.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 space-y-1.5 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveExperience(exp.id)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                        <div className="grid grid-cols-2 gap-2 pr-6">
                          <input
                            type="text"
                            value={exp.company}
                            onFocus={() => setSelectedElement('experience')}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCvData((prev) => ({
                                ...prev,
                                experiences: prev.experiences.map((it) => (it.id === exp.id ? { ...it, company: val } : it)),
                              }));
                            }}
                            placeholder="Nama Perusahaan"
                            className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none"
                          />
                          <input
                            type="text"
                            value={exp.position}
                            onFocus={() => setSelectedElement('experience')}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCvData((prev) => ({
                                ...prev,
                                experiences: prev.experiences.map((it) => (it.id === exp.id ? { ...it, position: val } : it)),
                              }));
                            }}
                            placeholder="Posisi Jabatan"
                            className="w-full p-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none"
                          />
                        </div>
                        <input
                          type="text"
                          value={exp.period}
                          onFocus={() => setSelectedElement('experience')}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCvData((prev) => ({
                              ...prev,
                              experiences: prev.experiences.map((it) => (it.id === exp.id ? { ...it, period: val } : it)),
                            }));
                          }}
                          placeholder="Periode (misal: Jan 2022 - Des 2023)"
                          className="w-full p-1.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none"
                        />
                        <textarea
                          rows={2}
                          value={exp.description}
                          onFocus={() => setSelectedElement('experience')}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCvData((prev) => ({
                              ...prev,
                              experiences: prev.experiences.map((it) => (it.id === exp.id ? { ...it, description: val } : it)),
                            }));
                          }}
                          placeholder="Deskripsi tugas dan tanggung jawab..."
                          className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 7. Keahlian Langsung */}
                <div className={`space-y-2 pt-3 border-t border-slate-100 dark:border-white/5 p-3 rounded-2xl transition-all ${selectedElement === 'skills' ? 'border-2 border-[#8b3dff] bg-[#8b3dff]/5 shadow-sm ring-1 ring-[#8b3dff]/20' : ''}`}>
                  <label className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300 block">
                    Keahlian &amp; Keterampilan
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {cvData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 flex items-center gap-1"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleUpdateCvField('skills', cvData.skills.filter((s) => s !== skill))}
                          className="hover:text-red-400 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      id="edit-new-skill"
                      type="text"
                      placeholder="Tambah keahlian baru..."
                      className="flex-1 p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && !cvData.skills.includes(val)) {
                            handleUpdateCvField('skills', [...cvData.skills, val]);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('edit-new-skill') as HTMLInputElement;
                        if (el && el.value.trim() && !cvData.skills.includes(el.value.trim())) {
                          handleUpdateCvField('skills', [...cvData.skills, el.value.trim()]);
                          el.value = '';
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
                    >
                      Tambah
                    </button>
                  </div>
                </div>

                {/* Mobile Preview Action Button at bottom of form */}
                <div className="pt-2 lg:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileView('preview')}
                    className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Eye size={14} />
                    <span>Lihat Hasil Pratinjau A4</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Auto CV Generator (Struktur Lengkap Sulap Foto 9.7 VIP) */}
            {activeTab === 'auto_generator' && (
              <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-5 max-h-[620px] overflow-y-auto">
                {/* Quick Industry Presets Pill */}
                <div>
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
                    Pilih Cepat Target Profesi Lowongan:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {ROLE_PRESETS.map((p) => (
                      <button
                        key={p.roleName}
                        type="button"
                        onClick={() => {
                          setCvData((prev) => ({ ...prev, headline: p.roleName }));
                          handleApplyPresetRole(p.roleName);
                        }}
                        className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-cyan-500/20 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/5 transition-colors"
                      >
                        {p.roleName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 1. Identitas Diri */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                      1
                    </span>
                    <span>Identitas Diri</span>
                  </h3>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={cvData.fullName}
                      onChange={(e) => setCvData({ ...cvData, fullName: e.target.value })}
                      placeholder="Nama Lengkap *"
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none font-bold"
                    />
                    <input
                      type="text"
                      value={cvData.headline}
                      onChange={(e) => setCvData({ ...cvData, headline: e.target.value })}
                      placeholder="Posisi yang Dilamar / Keahlian *"
                      className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="email"
                        value={cvData.email}
                        onChange={(e) => setCvData({ ...cvData, email: e.target.value })}
                        placeholder="Email *"
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                      <input
                        type="text"
                        value={cvData.phone}
                        onChange={(e) => setCvData({ ...cvData, phone: e.target.value })}
                        placeholder="No. HP / WhatsApp *"
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={cvData.city}
                        onChange={(e) => setCvData({ ...cvData, city: e.target.value })}
                        placeholder="Kota / Domisili *"
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                      <input
                        type="text"
                        value={cvData.linkedin || ''}
                        onChange={(e) => setCvData({ ...cvData, linkedin: e.target.value })}
                        placeholder="LinkedIn / Portfolio (Opsional)"
                        className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Foto Profil */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        2
                      </span>
                      <span>Foto Profil</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Opsional</span>
                  </h3>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 border border-slate-300 dark:border-white/10">
                      {cvData.photoUrl ? (
                        <img src={cvData.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all">
                        <span>Upload Pas Foto</span>
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                      </label>
                      <p className="text-[10px] text-slate-400 mt-1">Format JPG, PNG, WEBP (Maks 3MB)</p>
                    </div>
                    {cvData.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setCvData({ ...cvData, photoUrl: '' })}
                        className="text-slate-400 hover:text-red-400 p-1"
                        title="Hapus Foto"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Ringkasan Diri */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                      3
                    </span>
                    <span>Ringkasan Diri / Career Objective</span>
                  </h3>
                  <textarea
                    rows={3}
                    value={cvData.summary}
                    onChange={(e) => setCvData({ ...cvData, summary: e.target.value })}
                    placeholder="Ceritakan tentang diri kamu, tujuan karir, dan keahlian yang kamu tawarkan..."
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none leading-relaxed"
                  />
                </div>

                {/* 4. Pendidikan Terakhir */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        4
                      </span>
                      <span>Pendidikan Terakhir</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddEducation}
                      className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
                    >
                      <Plus size={12} /> Tambah
                    </button>
                  </div>
                  <div className="space-y-2">
                    {cvData.educations.map((edu) => (
                      <div key={edu.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 space-y-1.5 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveEducation(edu.id)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                        <input
                          type="text"
                          value={edu.school}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCvData((prev) => ({
                              ...prev,
                              educations: prev.educations.map((it) => (it.id === edu.id ? { ...it, school: val } : it)),
                            }));
                          }}
                          placeholder="Nama Sekolah / Universitas *"
                          className="w-full p-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={edu.major}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCvData((prev) => ({
                                ...prev,
                                educations: prev.educations.map((it) => (it.id === edu.id ? { ...it, major: val } : it)),
                              }));
                            }}
                            placeholder="Jurusan / Program Studi *"
                            className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none"
                          />
                          <input
                            type="text"
                            value={edu.period}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCvData((prev) => ({
                                ...prev,
                                educations: prev.educations.map((it) => (it.id === edu.id ? { ...it, period: val } : it)),
                              }));
                            }}
                            placeholder="Tahun Masuk - Lulus"
                            className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5. Pengalaman Kerja (Dynamic List) */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        5
                      </span>
                      <span>Pengalaman Kerja</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddExperience}
                      className="text-[10px] font-bold text-cyan-500 hover:text-cyan-400 flex items-center gap-1"
                    >
                      <Plus size={12} /> Tambah Posisi
                    </button>
                  </div>
                  <div className="space-y-2">
                    {cvData.experiences.map((exp) => (
                      <div key={exp.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 space-y-1.5 relative">
                        <button
                          type="button"
                          onClick={() => handleRemoveExperience(exp.id)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 size={12} />
                        </button>
                        <div className="grid grid-cols-2 gap-2 pr-5">
                          <input
                            type="text"
                            value={exp.company}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCvData((prev) => ({
                                ...prev,
                                experiences: prev.experiences.map((it) => (it.id === exp.id ? { ...it, company: val } : it)),
                              }));
                            }}
                            placeholder="Nama Perusahaan"
                            className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none"
                          />
                          <input
                            type="text"
                            value={exp.position}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCvData((prev) => ({
                                ...prev,
                                experiences: prev.experiences.map((it) => (it.id === exp.id ? { ...it, position: val } : it)),
                              }));
                            }}
                            placeholder="Posisi Jabatan"
                            className="w-full p-1.5 text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none"
                          />
                        </div>
                        <input
                          type="text"
                          value={exp.period}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCvData((prev) => ({
                              ...prev,
                              experiences: prev.experiences.map((it) => (it.id === exp.id ? { ...it, period: val } : it)),
                            }));
                          }}
                          placeholder="Periode (misal: Jan 2022 - Des 2023)"
                          className="w-full p-1.5 text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none"
                        />
                        <textarea
                          rows={2}
                          value={exp.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCvData((prev) => ({
                              ...prev,
                              experiences: prev.experiences.map((it) => (it.id === exp.id ? { ...it, description: val } : it)),
                            }));
                          }}
                          placeholder="Deskripsi singkat tanggung jawab & pencapaian kerja..."
                          className="w-full p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-lg outline-none leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 6. Keahlian / Skill */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                      6
                    </span>
                    <span>Keahlian / Skill</span>
                  </h3>
                  <textarea
                    rows={2}
                    value={cvData.skills.join(', ')}
                    onChange={(e) => {
                      const splitted = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                      setCvData({ ...cvData, skills: splitted });
                    }}
                    placeholder="Contoh: Microsoft Office, Photoshop, Public Speaking, Administrasi Kasir (pisahkan dengan koma)"
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none leading-relaxed"
                  />
                </div>

                {/* 7. Bahasa (Language Skills) */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                      7
                    </span>
                    <span>Kemampuan Bahasa</span>
                  </h3>
                  <input
                    type="text"
                    value={cvData.languages.map((l) => `${l.name} (${l.level})`).join(', ')}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = raw.split(',').map((part) => {
                        const trimmed = part.trim();
                        const match = trimmed.match(/^([^(]+)(?:\(([^)]+)\))?$/);
                        return {
                          name: match ? match[1].trim() : trimmed,
                          level: match && match[2] ? match[2].trim() : 'Menengah',
                        };
                      }).filter((l) => l.name);
                      setCvData({ ...cvData, languages: parsed });
                    }}
                    placeholder="Contoh: Indonesia (Fasih), Inggris (Menengah), Mandarin (Dasar)"
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>

                {/* 8. Sertifikasi & Penghargaan */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        8
                      </span>
                      <span>Sertifikasi & Penghargaan</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Opsional</span>
                  </h3>
                  <textarea
                    rows={2}
                    value={(cvData.certifications || []).join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').map((l) => l.trim()).filter(Boolean);
                      setCvData({ ...cvData, certifications: lines });
                    }}
                    placeholder="Contoh: Sertifikasi BNSP Administrasi Perkantoran (2022)&#10;TOEFL Score 500 (2023)"
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none leading-relaxed"
                  />
                </div>

                {/* 9. Hobi & Minat */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        9
                      </span>
                      <span>Hobi & Minat</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Opsional</span>
                  </h3>
                  <input
                    type="text"
                    value={(cvData.interests || []).join(', ')}
                    onChange={(e) => {
                      const splitted = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                      setCvData({ ...cvData, interests: splitted });
                    }}
                    placeholder="Contoh: Membaca, Fotografi, Sepak Bola, Menulis Blog..."
                    className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-cyan-500 outline-none"
                  />
                </div>

                {/* 10. Desain Style & Warna Aksen */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                      10
                    </span>
                    <span>Gaya Desain & Palet Warna</span>
                  </h3>

                  {/* Gaya Desain */}
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    {['Profesional Formal', 'Modern Kreatif', 'Minimalis Elegan'].map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setSelectedStyle(style)}
                        className={`py-2 px-1 rounded-xl font-bold border transition-all text-center ${
                          selectedStyle === style
                            ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400 shadow-sm'
                            : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>

                  {/* Palet Warna */}
                  <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                    {[
                      { name: 'Biru Profesional', color: '#1e40af' },
                      { name: 'Hijau Alam', color: '#15803d' },
                      { name: 'Hitam Emas Elegan', color: '#d97706' },
                      { name: 'Merah Energik', color: '#dc2626' },
                    ].map((col) => (
                      <button
                        key={col.name}
                        type="button"
                        onClick={() => setSelectedColor(col.name)}
                        className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                          selectedColor === col.name
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 font-bold'
                            : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: col.color }} />
                        <span className="text-[9px] line-clamp-1">{col.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Analyze & Create CV Big CTA Button */}
                <button
                  type="button"
                  disabled={isGeneratingAi}
                  onClick={handleFullAiAnalyze}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-400 hover:from-blue-500 hover:to-teal-300 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-cyan-500/30 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isGeneratingAi ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                      <span>Menganalisa & Menyusun CV...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 text-slate-950" />
                      <span>Analyze &amp; Create CV</span>
                    </>
                  )}
                </button>

                {/* AI Analysis Result Panel (if generated) */}
                {aiAnalysisResult && (
                  <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-900 dark:text-cyan-200 text-xs space-y-1 animate-fade-in">
                    <div className="font-bold flex items-center gap-1.5 text-cyan-400">
                      <CheckCircle2 size={14} />
                      <span>Hasil Analisa AI CV Sukses</span>
                    </div>
                    <p className="text-[11px] whitespace-pre-wrap leading-relaxed text-slate-600 dark:text-slate-300">
                      {aiAnalysisResult}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Interactive A4 Preview Canvas (Tampil saat mode Auto CV / Editing) */}
          {activeTab !== 'templates' && (
            <div className={`lg:col-span-6 xl:col-span-7 ${mobileView === 'form' ? 'hidden lg:flex' : 'flex'} flex-col items-center w-full`}>
              {/* Canva Pro Master Formatting Toolbar (Floating Top Typography & Style Controls) */}
              <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-2.5 sm:p-3 mb-3 shadow-lg flex flex-col gap-2.5 transition-all">
                {/* Upper Row: Selected Element Status, Canva Typography Bar & Zoom */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* Left: Active Element Badge & Deselect / Switch Template */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#8b3dff]/10 text-[#8b3dff] border border-[#8b3dff]/30 text-xs font-black shadow-sm">
                      <span className="w-2 h-2 rounded-full bg-[#8b3dff] animate-ping" />
                      <span>
                        {selectedElement ? (ELEMENT_LABELS[selectedElement] || selectedElement) : 'Pilih Elemen Kanvas'}
                      </span>
                    </div>

                    {selectedElement && (
                      <button
                        type="button"
                        onClick={() => setSelectedElement(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Batalkan Pilihan Elemen"
                      >
                        <X size={14} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab('templates')}
                      className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-colors"
                      title="Ganti Template CV"
                    >
                      <LayoutTemplate size={12} className="text-[#8b3dff]" />
                      <span className="hidden sm:inline">Ganti</span> Template
                    </button>
                  </div>

                  {/* Center: Canva Typography Controls (Font Size, B, I, aA, Color Swatches) */}
                  {selectedElement ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Font Family Indicator */}
                      <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                        <Type size={12} className="text-[#8b3dff]" />
                        <span>Inter Canva</span>
                      </span>

                      {/* Font Size Stepper */}
                      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            setElementStyles((prev) => {
                              const cur = prev[selectedElement] || {};
                              const currentOffset = cur.fontSizeOffset || 0;
                              return { ...prev, [selectedElement]: { ...cur, fontSizeOffset: Math.max(-8, currentOffset - 2) } };
                            });
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 text-xs"
                          title="Perkecil Ukuran Huruf"
                        >
                          -
                        </button>
                        <span className="px-2 text-xs font-black text-slate-800 dark:text-slate-100 min-w-[42px] text-center">
                          {16 + (elementStyles[selectedElement]?.fontSizeOffset || 0)} pt
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setElementStyles((prev) => {
                              const cur = prev[selectedElement] || {};
                              const currentOffset = cur.fontSizeOffset || 0;
                              return { ...prev, [selectedElement]: { ...cur, fontSizeOffset: Math.min(16, currentOffset + 2) } };
                            });
                          }}
                          className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 text-xs"
                          title="Perbesar Ukuran Huruf"
                        >
                          +
                        </button>
                      </div>

                      {/* Bold Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          setElementStyles((prev) => {
                            const cur = prev[selectedElement] || {};
                            return { ...prev, [selectedElement]: { ...cur, isBold: !cur.isBold } };
                          });
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-colors ${
                          elementStyles[selectedElement]?.isBold
                            ? 'bg-[#8b3dff] text-white shadow-sm'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10'
                        }`}
                        title="Tebalkan Teks (Bold)"
                      >
                        <Bold size={13} strokeWidth={3} />
                      </button>

                      {/* Italic Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          setElementStyles((prev) => {
                            const cur = prev[selectedElement] || {};
                            return { ...prev, [selectedElement]: { ...cur, isItalic: !cur.isItalic } };
                          });
                        }}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-colors ${
                          elementStyles[selectedElement]?.isItalic
                            ? 'bg-[#8b3dff] text-white shadow-sm'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10'
                        }`}
                        title="Miringkan Teks (Italic)"
                      >
                        <Italic size={13} />
                      </button>

                      {/* Uppercase Toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          setElementStyles((prev) => {
                            const cur = prev[selectedElement] || {};
                            return { ...prev, [selectedElement]: { ...cur, isUppercase: !cur.isUppercase } };
                          });
                        }}
                        className={`px-2 h-7 rounded-lg flex items-center justify-center font-bold text-xs transition-colors ${
                          elementStyles[selectedElement]?.isUppercase
                            ? 'bg-[#8b3dff] text-white shadow-sm'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10'
                        }`}
                        title="Huruf Kapital (Uppercase)"
                      >
                        aA
                      </button>

                      {/* Color Palette Chips */}
                      <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-white/10">
                        {[
                          { label: 'Template Primary', color: selectedTemplate.primaryColor || '#1e3a8a' },
                          { label: 'Template Secondary', color: selectedTemplate.secondaryColor || '#3b82f6' },
                          { label: 'Hitam Slate', color: '#0f172a' },
                          { label: 'Ungu Canva', color: '#8b3dff' },
                          { label: 'Emerald Hijau', color: '#059669' },
                        ].map((col) => (
                          <button
                            key={col.color}
                            type="button"
                            onClick={() => {
                              setElementStyles((prev) => {
                                const cur = prev[selectedElement] || {};
                                return { ...prev, [selectedElement]: { ...cur, color: col.color } };
                              });
                            }}
                            style={{ backgroundColor: col.color }}
                            className="w-5 h-5 rounded-full border-2 border-white dark:border-slate-800 shadow-sm hover:scale-125 transition-transform"
                            title={col.label}
                          />
                        ))}
                        <label className="relative cursor-pointer" title="Pilih Warna Kustom">
                          <input
                            type="color"
                            value={elementStyles[selectedElement]?.color || '#000000'}
                            onChange={(e) => {
                              const newColor = e.target.value;
                              setElementStyles((prev) => {
                                const cur = prev[selectedElement] || {};
                                return { ...prev, [selectedElement]: { ...cur, color: newColor } };
                              });
                            }}
                            className="opacity-0 absolute inset-0 w-5 h-5 cursor-pointer"
                          />
                          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-pink-500 via-amber-400 to-cyan-500 border border-white/50 flex items-center justify-center text-[9px] font-bold text-white shadow-sm">
                            +
                          </div>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 dark:text-slate-400 italic hidden sm:inline">
                      💡 Klik elemen teks atau foto di bawah untuk membuka kontrol Canva
                    </span>
                  )}

                  {/* Right: Zoom & Download PDF */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-white/10">
                      <button
                        type="button"
                        onClick={() => setZoomScale((s) => Math.max(0.30, Number((s - 0.05).toFixed(2))))}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                        title="Perkecil Kanvas"
                      >
                        <ZoomOut size={13} />
                      </button>
                      <span className="text-[10px] font-bold px-1 text-slate-700 dark:text-slate-300">
                        {Math.round(zoomScale * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setZoomScale((s) => Math.min(1.0, Number((s + 0.05).toFixed(2))))}
                        className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                        title="Perbesar Kanvas"
                      >
                        <ZoomIn size={13} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handlePrintPdf}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Download size={13} />
                      <span>PDF</span>
                    </button>
                  </div>
                </div>

                {/* Lower Row: Fast Inline Input OR Element Selector Ribbon */}
                {selectedElement && ['fullName', 'headline', 'phone', 'email', 'city', 'summary'].includes(selectedElement) ? (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5 animate-in fade-in">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#8b3dff] shrink-0">
                      ✏️ Edit Teks:
                    </span>
                    {selectedElement === 'summary' ? (
                      <textarea
                        rows={1}
                        value={cvData.summary}
                        onChange={(e) => handleUpdateCvField('summary', e.target.value)}
                        placeholder="Tulis ringkasan profil..."
                        className="w-full px-3 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-[#8b3dff]/40 focus:border-[#8b3dff] rounded-xl outline-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={(cvData as any)[selectedElement] || ''}
                        onChange={(e) => handleUpdateCvField(selectedElement as keyof CvData, e.target.value)}
                        placeholder={`Ketik ${ELEMENT_LABELS[selectedElement]} baru...`}
                        className="w-full px-3 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-[#8b3dff]/40 focus:border-[#8b3dff] rounded-xl outline-none font-medium"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedElement(null)}
                      className="px-3 py-1 rounded-xl text-xs font-bold bg-[#8b3dff] text-white hover:bg-[#7828ea] transition-colors shrink-0 shadow-sm"
                    >
                      Selesai
                    </button>
                  </div>
                ) : (
                  /* Quick Ribbon Selector for All CV Sections */
                  <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5 scrollbar-thin text-[10px]">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                      Pilih Elemen:
                    </span>
                    {[
                      { id: 'fullName', label: '👤 Nama' },
                      { id: 'headline', label: '💼 Posisi' },
                      { id: 'photo', label: '🖼️ Foto' },
                      { id: 'contact', label: '📞 Kontak' },
                      { id: 'summary', label: '📝 Ringkasan' },
                      { id: 'experience', label: '🏢 Pengalaman' },
                      { id: 'education', label: '🎓 Pendidikan' },
                      { id: 'skills', label: '⚡ Skill' },
                      { id: 'languages', label: '🌐 Bahasa' },
                      { id: 'certifications', label: '🏆 Sertifikasi' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedElement(item.id)}
                        className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition-all ${
                          selectedElement === item.id
                            ? 'bg-[#8b3dff] text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Canvas Viewport (Precisely centered, zero horizontal drift) */}
              <div className="w-full flex justify-center items-center py-2 px-0 overflow-hidden select-none">
                <div
                  style={{
                    width: `${210 * zoomScale}mm`,
                    height: `${297 * zoomScale}mm`,
                  }}
                  className="relative shrink-0 overflow-hidden rounded-2xl shadow-2xl border border-slate-300/80 dark:border-white/10 transition-all duration-150"
                >
                  <CvCanvasRenderer
                    cvData={cvData}
                    template={selectedTemplate}
                    scale={zoomScale}
                    editable={true}
                    onUpdateField={handleUpdateCvField}
                    selectedElement={selectedElement}
                    onSelectElement={setSelectedElement}
                    elementStyles={elementStyles}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Quick Action Pill for Mobile (<lg) */}
      {activeTab !== 'templates' && (
        <div className="lg:hidden fixed bottom-20 right-4 z-40 flex items-center gap-2">
          {mobileView === 'form' ? (
            <button
              type="button"
              onClick={() => setMobileView('preview')}
              className="px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs shadow-xl shadow-cyan-500/40 flex items-center gap-1.5 border border-cyan-300/40 active:scale-95 transition-all"
            >
              <Eye size={15} />
              <span>Pratinjau A4</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setMobileView('form')}
                className="px-3.5 py-2.5 rounded-full bg-slate-900/95 dark:bg-slate-800 text-cyan-400 font-bold text-xs shadow-xl border border-cyan-500/30 flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Edit3 size={14} />
                <span>Edit Form</span>
              </button>
              <button
                type="button"
                onClick={handlePrintPdf}
                className="px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs shadow-xl flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Download size={14} />
                <span>PDF</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Public Footer removed from CV page */}
      {/* Toast Alert Notification */}
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900/95 dark:bg-white text-white dark:text-slate-950 text-xs font-bold shadow-2xl border border-cyan-500/30 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="text-cyan-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 5-Menu Unified Mobile Bottom Navigation Bar */}
      <PublicMobileBottomNav currentPath="/cv" />
    </div>
  );
}
