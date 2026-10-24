import { useState, useEffect } from 'react';
import {
  Sparkles,
  Download,
  FileText,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  Printer,
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
  const [activeTab, setActiveTab] = useState<'templates' | 'manual' | 'ai'>('templates');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedTemplate, setSelectedTemplate] = useState<CvTemplateInfo>(CV_TEMPLATES[0]);
  const [cvData, setCvData] = useState<CvData>(INITIAL_CV_DATA);
  const [zoomScale, setZoomScale] = useState<number>(0.65);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiSelectedRole, setAiSelectedRole] = useState<string>(ROLE_PRESETS[0].roleName);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Responsive zoom scale calculation for mobile vs desktop
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setZoomScale(0.42); // Fits 210mm A4 inside ~350px mobile screen nicely
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

  const handleApplyAiPreset = async (roleName: string) => {
    setIsGeneratingAi(true);
    try {
      const generated = await generateCvDataAutomatically(roleName, {
        fullName: cvData.fullName,
        email: cvData.email,
        phone: cvData.phone,
        city: cvData.city,
        photoUrl: cvData.photoUrl,
      });
      setCvData(generated);
      showToast(`Data CV untuk "${roleName}" berhasil diisi otomatis!`);
      setActiveTab('manual');
    } catch (e) {
      console.error(e);
      showToast('Gagal membuat data CV otomatis.');
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
        {/* Banner Title & Quick Action */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-900/40 via-cyan-900/30 to-slate-900/50 p-4 sm:p-5 rounded-3xl border border-cyan-500/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  CV Maker & Canva Templates
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-400/40">
                  A4 Standar
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Pilih dari 30 desain master Canva, generate otomatis via AI atau sesuaikan manual sesuai bidang kerja.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>1-Klik Buat Otomatis</span>
            </button>

            <button
              type="button"
              onClick={handlePrintPdf}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center gap-1.5 active:scale-95 transition-all"
              title="Cetak langsung ke PDF A4"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>Cetak / Simpan PDF</span>
            </button>
          </div>
        </div>

        {/* Workspace Layout: Left Panel Tabs (Templates / Edit / AI) vs Right Live Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 items-start">
          {/* Left Column Controls (7 cols on desktop) */}
          <div className="lg:col-span-6 xl:col-span-5 flex flex-col space-y-4">
            {/* Navigation Tabs Pill */}
            <div className="flex items-center p-1 bg-slate-200/70 dark:bg-slate-900/80 rounded-2xl border border-slate-300/60 dark:border-white/10">
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
                <span>30 Template Canva</span>
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

              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'ai'
                    ? 'bg-cyan-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto AI Generator</span>
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

            {/* TAB 3: Auto AI Generator */}
            {activeTab === 'ai' && (
              <div className="bg-white dark:bg-slate-900/90 rounded-3xl p-5 border border-slate-200 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold shadow-md">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      AI 1-Klik Generate CV Otomatis
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Pilih posisi yang ingin dilamar. AI akan otomatis merumuskan ringkasan profesional, riwayat tugas pengalaman kerja, dan kata kunci keahlian yang relevan.
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Pilih Target Posisi Lowongan:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ROLE_PRESETS.map((p) => {
                      const isChosen = aiSelectedRole === p.roleName;
                      return (
                        <button
                          key={p.roleName}
                          type="button"
                          onClick={() => setAiSelectedRole(p.roleName)}
                          className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                            isChosen
                              ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 font-bold shadow-sm'
                              : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:border-cyan-400/50'
                          }`}
                        >
                          <span className="text-xs font-bold block">{p.roleName}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                            {p.skills.slice(0, 3).join(', ')}...
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Otomatis diselaraskan dengan standar HRD Indonesia
                  </span>
                  <button
                    type="button"
                    disabled={isGeneratingAi}
                    onClick={() => handleApplyAiPreset(aiSelectedRole)}
                    className="px-5 py-2.5 rounded-2xl text-xs font-extrabold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 flex items-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isGeneratingAi ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menyusun CV...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Terapkan & Buat CV</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive A4 Preview Canvas (5 or 7 cols on desktop) */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-center">
            {/* Canvas Header Toolbar */}
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pratinjau Standar A4
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {Math.round(zoomScale * 100)}%
                </span>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setZoomScale((s) => Math.max(0.35, s - 0.08))}
                  className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                  title="Perkecil"
                >
                  <ZoomOut size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale((s) => Math.min(1.0, s + 0.08))}
                  className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                  title="Perbesar"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  onClick={handlePrintPdf}
                  className="ml-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>

            {/* Canvas Viewport (Scrollable with centering) */}
            <div className="w-full flex justify-center overflow-x-auto py-2 px-1">
              <div
                style={{
                  width: `${210 * zoomScale}mm`,
                  height: `${297 * zoomScale}mm`,
                }}
                className="relative shrink-0 transition-all duration-150"
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
