import { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  FileText,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Filter,
  User,
  Briefcase,
  GraduationCap,
  Wrench,
  LayoutTemplate,
  ZoomIn,
  ZoomOut,
  Check,
} from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import Footer from '../../components/layout/Footer';
import PublicMobileBottomNav from '../../components/layout/PublicMobileBottomNav';
import { CV_TEMPLATES, CvTemplateInfo } from '../../lib/cvTemplates';
import { CvData, INITIAL_CV_DATA, CvExperience, CvEducation } from '../../lib/cvTypes';
import { ROLE_PRESETS, generateCvDataAutomatically } from '../../services/cvAiService';
import { CvCanvasRenderer } from '../../components/cv/CvCanvasRenderer';

export default function CvGenerator() {
  const [activeTab, setActiveTab] = useState<'templates' | 'auto_generator' | 'manual'>('auto_generator');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedTemplate, setSelectedTemplate] = useState<CvTemplateInfo>(CV_TEMPLATES[0]);
  const [cvData, setCvData] = useState<CvData>(INITIAL_CV_DATA);
  const [zoomScale, setZoomScale] = useState<number>(0.65);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Sulap Foto 9.7 VIP CV Form States
  const [selectedStyle, setSelectedStyle] = useState<string>('Profesional Formal');
  const [selectedColor, setSelectedColor] = useState<string>('Biru Profesional');
  const [selectedModel, setSelectedModel] = useState<'gemini_pro' | 'nanobanana2' | 'seedream'>('gemini_pro');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string>('');

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
• Model Engine: ${selectedModel === 'gemini_pro' ? 'Gemini 3.8 Flash High (Official)' : selectedModel === 'nanobanana2' ? 'Nano Banana 2' : 'SeeDream 4.5'}`;

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
      if (file.size > 3 * 1024 * 1024) {
        showToast('Ukuran foto maksimal 3MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setCvData((prev) => ({ ...prev, photoUrl: event.target!.result as string }));
          showToast('Pas foto profil berhasil diunggah!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSkill = (skill: string) => {
    if (!skill.trim() || cvData.skills.includes(skill.trim())) return;
    setCvData((prev) => ({
      ...prev,
      skills: [...prev.skills, skill.trim()],
    }));
  };

  const handleRemoveSkill = (skill: string) => {
    setCvData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  return (
    <div className="bg-slate-50 dark:bg-[#071220] min-h-screen text-slate-800 dark:text-slate-100 flex flex-col pb-24 md:pb-12 transition-colors duration-200">
      {/* Navbar Header */}
      <Navbar />

      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto px-3 sm:px-6 pt-3 flex-1 flex flex-col">
        {/* Workspace Layout: Left Panel Tabs (Templates / Edit / AI) vs Right Live Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          {/* Left Column Controls (7 cols on desktop) */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col space-y-4">
            {/* Navigation Tabs Pill */}
            <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-900/80 rounded-2xl border border-slate-300/60 dark:border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab('auto_generator')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'auto_generator'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto AI Generator</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('templates')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'templates'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutTemplate className="w-3.5 h-3.5" />
                <span>30 Template CV</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'manual'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Edit Manual</span>
              </button>
            </div>

            {/* TAB 1: Template Gallery */}
            {activeTab === 'templates' && (
              <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
                {/* Category Filter Chips */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mb-2.5">
                    <Filter className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Pilih Kategori Profesi:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                          selectedCategory === cat
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Templates Grid List */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[550px] overflow-y-auto pr-1">
                  {filteredTemplates.map((tpl) => {
                    const isSelected = selectedTemplate.id === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setSelectedTemplate(tpl);
                          showToast(`Template "${tpl.name}" terpilih!`);
                        }}
                        className={`group cursor-pointer rounded-2xl border-2 p-2 transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                            : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 hover:border-cyan-400/50'
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
                          {isSelected && (
                            <div className="absolute inset-0 bg-cyan-500/20 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="w-7 h-7 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg">
                                <Check size={16} strokeWidth={3} />
                              </span>
                            </div>
                          )}
                          {tpl.badge && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-slate-950/80 text-cyan-300 backdrop-blur-sm border border-cyan-400/30">
                              {tpl.badge}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-[11px] font-bold line-clamp-1 text-slate-800 dark:text-slate-100">
                            {tpl.name}
                          </h4>
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

            {/* TAB 2: Manual Edit Form */}
            {activeTab === 'manual' && (
              <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-5 max-h-[600px] overflow-y-auto">
                {/* 1. Informasi Pribadi */}
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-cyan-500 dark:text-cyan-400 mb-3 flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>1. Biodata Pribadi</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Nama Lengkap
                      </label>
                      <input
                        type="text"
                        value={cvData.fullName}
                        onChange={(e) => setCvData({ ...cvData, fullName: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 focus:outline-none focus:border-cyan-400"
                        placeholder="Contoh: Azqy Ahmad Saputra"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Profesi / Pekerjaan Impian
                      </label>
                      <input
                        type="text"
                        value={cvData.headline}
                        onChange={(e) => setCvData({ ...cvData, headline: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 focus:outline-none focus:border-cyan-400"
                        placeholder="Contoh: Staff Administrasi & Keuangan"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Nomor WhatsApp / HP
                      </label>
                      <input
                        type="text"
                        value={cvData.phone}
                        onChange={(e) => setCvData({ ...cvData, phone: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 focus:outline-none focus:border-cyan-400"
                        placeholder="Contoh: 0812-3456-7890"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Email Resmi
                      </label>
                      <input
                        type="email"
                        value={cvData.email}
                        onChange={(e) => setCvData({ ...cvData, email: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 focus:outline-none focus:border-cyan-400"
                        placeholder="Contoh: azqy.ahmad@gmail.com"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Domisili Kota & Provinsi
                      </label>
                      <input
                        type="text"
                        value={cvData.city}
                        onChange={(e) => setCvData({ ...cvData, city: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 focus:outline-none focus:border-cyan-400"
                        placeholder="Contoh: Cimahi, Jawa Barat"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        Ringkasan Profil Diri (Bio)
                      </label>
                      <textarea
                        rows={3}
                        value={cvData.summary}
                        onChange={(e) => setCvData({ ...cvData, summary: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 focus:outline-none focus:border-cyan-400 leading-relaxed"
                        placeholder="Tuliskan pengalaman ringkas, keahlian utama, dan dedikasi Anda..."
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Pengalaman Kerja */}
                <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-cyan-500 dark:text-cyan-400 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4" />
                      <span>2. Pengalaman Kerja</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddExperience}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 flex items-center gap-1 hover:bg-cyan-500/30"
                    >
                      <Plus size={12} /> Tambah Posisi
                    </button>
                  </div>

                  <div className="space-y-3">
                    {cvData.experiences.map((exp) => (
                      <div
                        key={exp.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 space-y-2 relative"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveExperience(exp.id)}
                          className="absolute top-2.5 right-2.5 text-slate-400 hover:text-red-400 transition-colors"
                          title="Hapus Pengalaman"
                        >
                          <Trash2 size={13} />
                        </button>
                        <div className="grid grid-cols-2 gap-2 pr-6">
                          <div>
                            <input
                              type="text"
                              value={exp.position}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCvData((prev) => ({
                                  ...prev,
                                  experiences: prev.experiences.map((it) =>
                                    it.id === exp.id ? { ...it, position: val } : it
                                  ),
                                }));
                              }}
                              className="w-full px-2 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                              placeholder="Posisi Jabatan"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={exp.company}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCvData((prev) => ({
                                  ...prev,
                                  experiences: prev.experiences.map((it) =>
                                    it.id === exp.id ? { ...it, company: val } : it
                                  ),
                                }));
                              }}
                              className="w-full px-2 py-1 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                              placeholder="Nama Perusahaan"
                            />
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            value={exp.period}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCvData((prev) => ({
                                ...prev,
                                experiences: prev.experiences.map((it) =>
                                    it.id === exp.id ? { ...it, period: val } : it
                                ),
                              }));
                            }}
                            className="w-full px-2 py-1 rounded-lg text-[11px] text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                            placeholder="Periode (Contoh: 2022 - 2024)"
                          />
                        </div>

                        <div>
                          <textarea
                            rows={2}
                            value={exp.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCvData((prev) => ({
                                ...prev,
                                experiences: prev.experiences.map((it) =>
                                    it.id === exp.id ? { ...it, description: val } : it
                                ),
                              }));
                            }}
                            className="w-full px-2 py-1 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 leading-relaxed"
                            placeholder="Tanggung jawab dan pencapaian kerja..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Riwayat Pendidikan */}
                <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-cyan-500 dark:text-cyan-400 flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4" />
                      <span>3. Riwayat Pendidikan</span>
                    </h3>
                    <button
                      type="button"
                      onClick={handleAddEducation}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-400/30 flex items-center gap-1 hover:bg-cyan-500/30"
                    >
                      <Plus size={12} /> Tambah Sekolah
                    </button>
                  </div>

                  <div className="space-y-3">
                    {cvData.educations.map((edu) => (
                      <div
                        key={edu.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 space-y-2 relative"
                      >
                        <button
                          type="button"
                          onClick={() => handleRemoveEducation(edu.id)}
                          className="absolute top-2.5 right-2.5 text-slate-400 hover:text-red-400 transition-colors"
                          title="Hapus Pendidikan"
                        >
                          <Trash2 size={13} />
                        </button>
                        <div className="grid grid-cols-2 gap-2 pr-6">
                          <div>
                            <input
                              type="text"
                              value={edu.school}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCvData((prev) => ({
                                  ...prev,
                                  educations: prev.educations.map((it) =>
                                    it.id === edu.id ? { ...it, school: val } : it
                                  ),
                                }));
                              }}
                              className="w-full px-2 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                              placeholder="Nama Sekolah / Kampus"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={edu.major}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCvData((prev) => ({
                                  ...prev,
                                  educations: prev.educations.map((it) =>
                                    it.id === edu.id ? { ...it, major: val } : it
                                  ),
                                }));
                              }}
                              className="w-full px-2 py-1 rounded-lg text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                              placeholder="Jurusan"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={edu.period}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCvData((prev) => ({
                                ...prev,
                                educations: prev.educations.map((it) =>
                                  it.id === edu.id ? { ...it, period: val } : it
                                ),
                              }));
                            }}
                            className="w-full px-2 py-1 rounded-lg text-[11px] text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                            placeholder="Tahun Lulus (2019 - 2022)"
                          />
                          <input
                            type="text"
                            value={edu.gpa || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCvData((prev) => ({
                                ...prev,
                                educations: prev.educations.map((it) =>
                                  it.id === edu.id ? { ...it, gpa: val } : it
                                ),
                              }));
                            }}
                            className="w-full px-2 py-1 rounded-lg text-[11px] text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                            placeholder="Nilai / IPK (Opsional)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Keahlian & Skill */}
                <div className="pt-3 border-t border-slate-200 dark:border-white/10">
                  <h3 className="text-xs font-black uppercase tracking-wider text-cyan-500 dark:text-cyan-400 mb-2 flex items-center gap-1.5">
                    <Wrench className="w-4 h-4" />
                    <span>4. Keahlian & Keterampilan</span>
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {cvData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30 flex items-center gap-1"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="hover:text-red-400 transition-colors"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      id="new-skill-input"
                      type="text"
                      className="flex-1 px-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10"
                      placeholder="Ketik keahlian lalu tekan Tambah (contoh: Microsoft Excel)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSkill((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('new-skill-input') as HTMLInputElement;
                        if (el && el.value) {
                          handleAddSkill(el.value);
                          el.value = '';
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 text-slate-950 shadow-sm"
                    >
                      Tambah
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Auto AI Generator (Struktur Lengkap Sulap Foto 9.7 VIP) */}
            {activeTab === 'auto_generator' && (
              <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-5 max-h-[620px] overflow-y-auto">
                {/* Status VIP Private Server Active Badge */}
                <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-transparent border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      Private Server AI: Aktif & Terbuka Penuh
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-extrabold bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                    VIP 9.7 UNLOCKED
                  </span>
                </div>

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

                {/* 11. AI Model Engine Selector */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-black">
                        11
                      </span>
                      <span>Model AI Engine</span>
                    </span>
                    <span className="text-[10px] text-cyan-400 font-bold">Terhubung 9Router</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    {[
                      { id: 'gemini_pro', name: 'Gemini 3.8 Flash', tag: 'High Speed' },
                      { id: 'nanobanana2', name: 'Nano Banana 2', tag: 'Creative' },
                      { id: 'seedream', name: 'SeeDream 4.5', tag: 'VIP Vision' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedModel(m.id as 'gemini_pro' | 'nanobanana2' | 'seedream')}
                        className={`p-2 rounded-xl border text-center transition-all ${
                          selectedModel === m.id
                            ? 'border-cyan-500 bg-cyan-500/15 text-cyan-400 font-bold shadow-sm'
                            : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="font-bold text-[11px]">{m.name}</div>
                        <div className="text-[9px] text-slate-400">{m.tag}</div>
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

            {/* TAB 2: Template Gallery */}
            {activeTab === 'templates' && (
              <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
                {/* Category Filter Chips */}
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 mb-2.5">
                    <Filter className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Pilih Kategori Profesi:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                          selectedCategory === cat
                            ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Templates Grid List */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[550px] overflow-y-auto pr-1">
                  {filteredTemplates.map((tpl) => {
                    const isSelected = selectedTemplate.id === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setSelectedTemplate(tpl);
                          showToast(`Template "${tpl.name}" terpilih!`);
                        }}
                        className={`group cursor-pointer rounded-2xl border-2 p-2 transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/20'
                            : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 hover:border-cyan-400/50'
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
                          {isSelected && (
                            <div className="absolute inset-0 bg-cyan-500/20 backdrop-blur-[1px] flex items-center justify-center">
                              <span className="w-7 h-7 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-lg">
                                <Check size={16} strokeWidth={3} />
                              </span>
                            </div>
                          )}
                          {tpl.badge && (
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider bg-slate-950/80 text-cyan-300 backdrop-blur-sm border border-cyan-400/30">
                              {tpl.badge}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-[11px] font-bold line-clamp-1 text-slate-800 dark:text-slate-100">
                            {tpl.name}
                          </h4>
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

            {/* TAB 3: Manual Quick Form */}
            {activeTab === 'manual' && (
              <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4 max-h-[600px] overflow-y-auto">
                <div className="p-3 bg-cyan-500/10 rounded-2xl border border-cyan-500/30 text-xs text-cyan-800 dark:text-cyan-300">
                  Tip: Mode Edit Manual memungkinkan Anda mengubah detail baris per baris secara langsung.
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    value={cvData.fullName}
                    onChange={(e) => setCvData({ ...cvData, fullName: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Posisi Jabatan Target</label>
                  <input
                    type="text"
                    value={cvData.headline}
                    onChange={(e) => setCvData({ ...cvData, headline: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Ringkasan Diri (Summary)</label>
                  <textarea
                    rows={4}
                    value={cvData.summary}
                    onChange={(e) => setCvData({ ...cvData, summary: e.target.value })}
                    className="w-full p-2.5 text-xs bg-slate-100 dark:bg-slate-800 rounded-xl outline-none leading-relaxed"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive A4 Preview Canvas (7 cols on desktop) */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-center">
            {/* Canvas Header Toolbar */}
            <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pratinjau A4
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {Math.round(zoomScale * 100)}%
                </span>
                <span className="text-[10px] font-semibold text-cyan-500 dark:text-cyan-400 truncate max-w-[180px] bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                  {selectedTemplate.name}
                </span>
              </div>

              {/* Zoom Controls & Download Button */}
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.max(0.30, Number((s - 0.05).toFixed(2))))}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    title="Perkecil"
                  >
                    <ZoomOut size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.min(1.0, Number((s + 0.05).toFixed(2))))}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    title="Perbesar"
                  >
                    <ZoomIn size={15} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Download size={14} />
                  <span>Download PDF</span>
                </button>
              </div>
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
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Public Footer */}
      <Footer />

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
