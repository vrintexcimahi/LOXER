import React, { useRef } from 'react';
import { Mail, Phone, MapPin, Briefcase, User, GraduationCap, Award, Globe, Heart } from 'lucide-react';
import { CvData } from '../../lib/cvTypes';
import { CvTemplateInfo } from '../../lib/cvTemplates';

export interface CanvaElementStyle {
  fontSizeOffset?: number;
  isBold?: boolean;
  isItalic?: boolean;
  isUppercase?: boolean;
  color?: string;
}

export interface CvCanvasRendererProps {
  cvData: CvData;
  template: CvTemplateInfo;
  scale?: number;
  printMode?: boolean;
  onUpdateField?: (field: keyof CvData, value: unknown) => void;
  editable?: boolean;
  selectedElement?: string | null;
  onSelectElement?: (elementId: string | null) => void;
  elementStyles?: Record<string, CanvaElementStyle>;
}

export const CvCanvasRenderer: React.FC<CvCanvasRendererProps> = ({
  cvData,
  template,
  scale = 1,
  printMode = false,
  onUpdateField,
  editable = false,
  selectedElement = null,
  onSelectElement,
  elementStyles = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const primary = template.primaryColor || '#1e3a8a';
  const secondary = template.secondaryColor || '#3b82f6';
  const accent = template.accentColor || '#60a5fa';

  const isSidebarLeft = template.layout === 'sidebar-left';
  const isHeaderSplit = template.layout === 'header-split';

  // Canva-style per-element interactive wrapper
  const renderCanvaWrapper = (
    id: string,
    label: string,
    children: React.ReactNode,
    className = '',
    inline = false
  ) => {
    if (!editable || printMode) return <>{children}</>;
    const isSelected = selectedElement === id;
    const customStyle = elementStyles[id];

    const Tag = inline ? 'span' : 'div';

    return (
      <Tag
        onClick={(e) => {
          e.stopPropagation();
          onSelectElement?.(id);
        }}
        className={`relative transition-all duration-150 ${className} ${
          isSelected
            ? 'outline outline-2 outline-[#8b3dff] -outline-offset-1 rounded-sm shadow-[0_0_0_3px_rgba(139,61,255,0.25)] ring-2 ring-[#8b3dff]/30 z-30'
            : 'hover:outline hover:outline-dashed hover:outline-[#8b3dff]/60 hover:bg-[#8b3dff]/5 rounded-sm cursor-pointer'
        }`}
        style={{
          fontWeight: customStyle?.isBold ? 800 : undefined,
          fontStyle: customStyle?.isItalic ? 'italic' : undefined,
          textTransform: customStyle?.isUppercase ? 'uppercase' : undefined,
          color: customStyle?.color || undefined,
        }}
      >
        {children}

        {/* Canva Purple Bounding Box Handles & Mini Floating Bubble */}
        {isSelected && (
          <>
            {/* Left Pill Handle */}
            <span
              className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-3.5 bg-white border-2 border-[#8b3dff] rounded-full shadow-sm pointer-events-none z-40"
              aria-hidden="true"
            />
            {/* Right Pill Handle */}
            <span
              className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-3.5 bg-white border-2 border-[#8b3dff] rounded-full shadow-sm pointer-events-none z-40"
              aria-hidden="true"
            />
            {/* Top Hovering Mini Canva Floating Toolbar Bubble (as in Canva UI screenshot) */}
            <div
              className="absolute -top-7 left-0 flex items-center gap-1.5 bg-[#8b3dff] text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-lg pointer-events-none z-40 whitespace-nowrap animate-in fade-in duration-100"
              aria-hidden="true"
            >
              <span>💬</span>
              <span>{label}</span>
              <span className="opacity-70">···</span>
            </div>
          </>
        )}
      </Tag>
    );
  };

  return (
    <div
      ref={containerRef}
      id="cv-print-area"
      onClick={() => {
        if (editable) onSelectElement?.(null);
      }}
      className="cv-a4-sheet bg-white text-slate-800 shadow-2xl relative overflow-hidden select-none"
      style={{
        width: '210mm',
        minHeight: '297mm',
        height: '297mm',
        maxHeight: '297mm',
        transform: printMode ? 'none' : `scale(${scale})`,
        transformOrigin: 'top left',
        boxSizing: 'border-box',
      }}
    >
      {/* 1. Master Canva SVG Backdrop / Watermark Graphic */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.14] overflow-hidden"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        <img
          src={template.svgUrl}
          alt={template.name}
          className="w-full h-full object-cover object-center filter grayscale-[30%]"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>

      {/* Decorative Brand Accent Strips from Master Template */}
      <div
        className="absolute top-0 left-0 right-0 h-2.5"
        style={{
          background: `linear-gradient(90deg, ${primary} 0%, ${secondary} 60%, ${accent} 100%)`,
          zIndex: 10,
        }}
      />

      {/* 2. Content Layout Based on Template Archetype */}
      {isSidebarLeft ? (
        /* Archetype 1: Left Colored Sidebar with Right Main Timeline */
        <div className="relative z-10 grid grid-cols-12 h-full min-h-[297mm]">
          {/* Left Sidebar */}
          <aside
            className="col-span-4 p-6 flex flex-col justify-between text-white relative"
            style={{
              backgroundColor: primary,
              borderRight: `2px solid ${secondary}30`,
            }}
          >
            <div className="space-y-6">
              {/* Profile Photo */}
              {renderCanvaWrapper(
                'photo',
                'Foto Profil',
                <div className="flex flex-col items-center text-center">
                  <div
                    className="w-28 h-28 rounded-2xl overflow-hidden p-1 shadow-xl relative"
                    style={{ backgroundColor: secondary }}
                  >
                    {cvData.photoUrl ? (
                      <img
                        src={cvData.photoUrl}
                        alt={cvData.fullName}
                        className="w-full h-full object-cover rounded-xl"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 rounded-xl flex items-center justify-center text-white/60">
                        <User size={48} />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Kontak */}
              {renderCanvaWrapper(
                'contact',
                'Kontak Pribadi',
                <div>
                  <h4
                    className="text-xs uppercase font-black tracking-widest pb-1 mb-3 border-b"
                    style={{ borderColor: `${accent}60`, color: accent }}
                  >
                    Kontak
                  </h4>
                  <div className="space-y-2.5 text-[11px] text-white/90">
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="shrink-0 text-cyan-300" />
                      <span
                        contentEditable={editable}
                        suppressContentEditableWarning
                        onBlur={(e) => onUpdateField?.('phone', e.currentTarget.textContent || '')}
                        className={`truncate ${editable ? 'hover:bg-white/20 px-1 rounded cursor-text' : ''}`}
                      >
                        {cvData.phone || '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="shrink-0 text-cyan-300" />
                      <span
                        contentEditable={editable}
                        suppressContentEditableWarning
                        onBlur={(e) => onUpdateField?.('email', e.currentTarget.textContent || '')}
                        className={`truncate ${editable ? 'hover:bg-white/20 px-1 rounded cursor-text' : ''}`}
                      >
                        {cvData.email || '-'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin size={13} className="shrink-0 text-cyan-300 mt-0.5" />
                      <span
                        contentEditable={editable}
                        suppressContentEditableWarning
                        onBlur={(e) => onUpdateField?.('city', e.currentTarget.textContent || '')}
                        className={`leading-tight ${editable ? 'hover:bg-white/20 px-1 rounded cursor-text' : ''}`}
                      >
                        {cvData.city || '-'}
                      </span>
                    </div>
                    {cvData.linkedin && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-cyan-300 font-bold">in</span>
                        <span className="truncate">{cvData.linkedin}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pendidikan */}
              {renderCanvaWrapper(
                'education',
                'Riwayat Pendidikan',
                <div>
                  <h4
                    className="text-xs uppercase font-black tracking-widest pb-1 mb-3 border-b flex items-center gap-1.5"
                    style={{ borderColor: `${accent}60`, color: accent }}
                  >
                    <GraduationCap size={13} />
                    <span>Pendidikan</span>
                  </h4>
                  <div className="space-y-3">
                    {cvData.educations.map((edu) => (
                      <div key={edu.id} className="text-[11px] text-white/90">
                        <div className="font-bold text-white leading-tight">{edu.school}</div>
                        <div className="text-[10px] text-cyan-200">{edu.major}</div>
                        <div className="text-[9px] text-white/60 mt-0.5">{edu.period}</div>
                        {edu.gpa && <div className="text-[9px] text-amber-300 font-medium">{edu.gpa}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Keahlian (Skills) */}
              {renderCanvaWrapper(
                'skills',
                'Keahlian & Skill',
                <div>
                  <h4
                    className="text-xs uppercase font-black tracking-widest pb-1 mb-3 border-b"
                    style={{ borderColor: `${accent}60`, color: accent }}
                  >
                    Keahlian
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {cvData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/15 text-white border border-white/10"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bahasa */}
              {cvData.languages && cvData.languages.length > 0 && (
                renderCanvaWrapper(
                  'languages',
                  'Kemampuan Bahasa',
                  <div>
                    <h4
                      className="text-xs uppercase font-black tracking-widest pb-1 mb-2 border-b flex items-center gap-1.5"
                      style={{ borderColor: `${accent}60`, color: accent }}
                    >
                      <Globe size={12} />
                      <span>Bahasa</span>
                    </h4>
                    <div className="space-y-1.5 text-[10px] text-white/90">
                      {cvData.languages.map((lang, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <span className="font-medium">{lang.name}</span>
                          <span className="text-[9px] text-cyan-200">{lang.level}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}

              {/* Hobi / Minat (Interests) */}
              {cvData.interests && cvData.interests.length > 0 && (
                renderCanvaWrapper(
                  'interests',
                  'Hobi & Minat',
                  <div>
                    <h4
                      className="text-xs uppercase font-black tracking-widest pb-1 mb-2 border-b flex items-center gap-1.5"
                      style={{ borderColor: `${accent}60`, color: accent }}
                    >
                      <Heart size={12} />
                      <span>Hobi & Minat</span>
                    </h4>
                    <p className="text-[10px] text-white/80 leading-relaxed">
                      {cvData.interests.join(', ')}
                    </p>
                  </div>
                )
              )}
            </div>

            {/* Footer Verification Tag */}
            <div className="pt-4 border-t border-white/15 text-[8px] text-white/50 text-center tracking-wider uppercase font-semibold">
              Terverifikasi Ekosistem LOXER • Siap Kerja
            </div>
          </aside>

          {/* Right Main Area */}
          <main className="col-span-8 p-8 flex flex-col justify-between">
            <div>
              {/* Header: Nama & Headline */}
              <div className="border-b-2 pb-4 mb-6" style={{ borderColor: primary }}>
                {renderCanvaWrapper(
                  'fullName',
                  'Nama Lengkap',
                  <h1
                    contentEditable={editable}
                    suppressContentEditableWarning
                    onBlur={(e) => onUpdateField?.('fullName', e.currentTarget.textContent || '')}
                    className={`text-2xl font-black tracking-tight leading-tight uppercase font-sans ${
                      editable ? 'cursor-text rounded px-1 transition-all' : ''
                    }`}
                    style={{
                      color: primary,
                      fontSize: elementStyles?.['fullName']?.fontSizeOffset
                        ? `${24 + elementStyles['fullName'].fontSizeOffset}px`
                        : undefined,
                    }}
                  >
                    {cvData.fullName || 'Nama Lengkap'}
                  </h1>
                )}

                {renderCanvaWrapper(
                  'headline',
                  'Posisi / Headline',
                  <p
                    contentEditable={editable}
                    suppressContentEditableWarning
                    onBlur={(e) => onUpdateField?.('headline', e.currentTarget.textContent || '')}
                    className={`text-sm font-bold tracking-wide mt-1 ${
                      editable ? 'cursor-text rounded px-1 transition-all' : ''
                    }`}
                    style={{
                      color: secondary,
                      fontSize: elementStyles?.['headline']?.fontSizeOffset
                        ? `${14 + elementStyles['headline'].fontSizeOffset}px`
                        : undefined,
                    }}
                  >
                    {cvData.headline || 'Posisi / Pekerjaan Impian'}
                  </p>
                )}
              </div>

              {/* Ringkasan Profil */}
              {renderCanvaWrapper(
                'summary',
                'Tentang Saya / Ringkasan',
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <User size={15} style={{ color: primary }} />
                    <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: primary }}>
                      Tentang Saya
                    </h3>
                  </div>
                  <p
                    contentEditable={editable}
                    suppressContentEditableWarning
                    onBlur={(e) => onUpdateField?.('summary', e.currentTarget.textContent || '')}
                    className={`text-[11px] text-slate-700 leading-relaxed text-justify ${
                      editable ? 'cursor-text rounded p-1 transition-all' : ''
                    }`}
                  >
                    {cvData.summary ||
                      'Deskripsi ringkas profil profesional Anda, keunggulan kerja, serta dedikasi dalam memberikan hasil terbaik.'}
                  </p>
                </div>
              )}

              {/* Pengalaman Kerja */}
              {renderCanvaWrapper(
                'experience',
                'Pengalaman Kerja',
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase size={15} style={{ color: primary }} />
                    <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: primary }}>
                      Pengalaman Kerja
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {cvData.experiences.map((exp) => (
                      <div key={exp.id} className="relative pl-4 border-l-2" style={{ borderColor: `${primary}40` }}>
                        <span
                          className="absolute -left-[5px] top-1 w-2 h-2 rounded-full"
                          style={{ backgroundColor: primary }}
                        />
                        <div className="flex items-baseline justify-between mb-0.5">
                          <span className="text-[11px] font-bold text-slate-900 leading-tight">
                            {exp.position}
                          </span>
                          <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {exp.period}
                          </span>
                        </div>
                        <div className="text-[10px] font-semibold" style={{ color: secondary }}>
                          {exp.company}
                        </div>
                        <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">
                          {exp.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sertifikasi & Penghargaan */}
              {cvData.certifications && cvData.certifications.length > 0 && (
                renderCanvaWrapper(
                  'certifications',
                  'Sertifikasi & Pelatihan',
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Award size={15} style={{ color: primary }} />
                      <h3 className="text-xs font-black uppercase tracking-wider" style={{ color: primary }}>
                        Sertifikasi & Pelatihan
                      </h3>
                    </div>
                    <ul className="space-y-1 text-[10px] text-slate-700 list-disc list-inside">
                      {cvData.certifications.map((cert, idx) => (
                        <li key={idx} className="leading-tight">
                          {cert}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              )}
            </div>

            {/* Template Signature Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400">
              <span className="font-semibold text-slate-600">
                Template: {template.name}
              </span>
              <span>Dokumen Resmi Standard A4 Curriculum Vitae</span>
            </div>
          </main>
        </div>
      ) : isHeaderSplit ? (
        /* Archetype 2: Top Header Banner with Balanced Dual Column */
        <div className="relative z-10 flex flex-col h-full min-h-[297mm]">
          {/* Top Header Banner */}
          <header
            className="p-8 text-white flex items-center justify-between gap-6"
            style={{
              backgroundColor: primary,
              borderBottom: `4px solid ${secondary}`,
            }}
          >
            <div className="flex-1 min-w-0">
              {renderCanvaWrapper(
                'fullName',
                'Nama Lengkap',
                <h1
                  contentEditable={editable}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdateField?.('fullName', e.currentTarget.textContent || '')}
                  className={`text-2xl font-black uppercase tracking-tight text-white leading-tight ${
                    editable ? 'cursor-text rounded px-1 transition-all' : ''
                  }`}
                  style={{
                    fontSize: elementStyles?.['fullName']?.fontSizeOffset
                      ? `${24 + elementStyles['fullName'].fontSizeOffset}px`
                      : undefined,
                  }}
                >
                  {cvData.fullName || 'Nama Lengkap'}
                </h1>
              )}

              {renderCanvaWrapper(
                'headline',
                'Posisi / Headline',
                <p
                  contentEditable={editable}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdateField?.('headline', e.currentTarget.textContent || '')}
                  className={`text-sm font-bold tracking-wide mt-1 text-cyan-200 ${
                    editable ? 'cursor-text rounded px-1 transition-all' : ''
                  }`}
                  style={{
                    fontSize: elementStyles?.['headline']?.fontSizeOffset
                      ? `${14 + elementStyles['headline'].fontSizeOffset}px`
                      : undefined,
                  }}
                >
                  {cvData.headline || 'Posisi / Pekerjaan'}
                </p>
              )}

              {renderCanvaWrapper(
                'contact',
                'Kontak Pribadi',
                <div className="flex flex-wrap items-center gap-4 mt-3 text-[11px] text-white/85">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone size={12} className="text-cyan-300 shrink-0" />
                    <span
                      contentEditable={editable}
                      suppressContentEditableWarning
                      onBlur={(e) => onUpdateField?.('phone', e.currentTarget.textContent || '')}
                      className={`truncate ${editable ? 'hover:bg-white/20 px-1 rounded cursor-text' : ''}`}
                    >
                      {cvData.phone || '-'}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Mail size={12} className="text-cyan-300 shrink-0" />
                    <span
                      contentEditable={editable}
                      suppressContentEditableWarning
                      onBlur={(e) => onUpdateField?.('email', e.currentTarget.textContent || '')}
                      className={`truncate ${editable ? 'hover:bg-white/20 px-1 rounded cursor-text' : ''}`}
                    >
                      {cvData.email || '-'}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={12} className="text-cyan-300 shrink-0" />
                    <span
                      contentEditable={editable}
                      suppressContentEditableWarning
                      onBlur={(e) => onUpdateField?.('city', e.currentTarget.textContent || '')}
                      className={`leading-tight ${editable ? 'hover:bg-white/20 px-1 rounded cursor-text' : ''}`}
                    >
                      {cvData.city || '-'}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Photo Avatar */}
            {renderCanvaWrapper(
              'photo',
              'Foto Profil',
              <div
                className="w-24 h-24 rounded-2xl overflow-hidden p-1 shadow-2xl shrink-0"
                style={{ backgroundColor: secondary }}
              >
                {cvData.photoUrl ? (
                  <img
                    src={cvData.photoUrl}
                    alt={cvData.fullName}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 rounded-xl flex items-center justify-center text-white/50">
                    <User size={36} />
                  </div>
                )}
              </div>
            )}
          </header>

          {/* Body Dual Column */}
          <div className="p-8 flex-1 grid grid-cols-12 gap-8">
            {/* Left 7 Columns: Profile & Experience */}
            <div className="col-span-7 space-y-6">
              {/* Ringkasan Profil */}
              {renderCanvaWrapper(
                'summary',
                'Profil Profesional',
                <div>
                  <h3
                    className="text-xs font-black uppercase tracking-wider pb-1 mb-2 border-b-2"
                    style={{ borderColor: primary, color: primary }}
                  >
                    Profil Profesional
                  </h3>
                  <p
                    contentEditable={editable}
                    suppressContentEditableWarning
                    onBlur={(e) => onUpdateField?.('summary', e.currentTarget.textContent || '')}
                    className={`text-[11px] text-slate-700 leading-relaxed text-justify ${
                      editable ? 'cursor-text rounded p-1 transition-all' : ''
                    }`}
                  >
                    {cvData.summary}
                  </p>
                </div>
              )}

              {/* Pengalaman Kerja */}
              {renderCanvaWrapper(
                'experience',
                'Riwayat Pekerjaan',
                <div>
                  <h3
                    className="text-xs font-black uppercase tracking-wider pb-1 mb-3 border-b-2"
                    style={{ borderColor: primary, color: primary }}
                  >
                    Pengalaman Kerja
                  </h3>
                  <div className="space-y-4">
                    {cvData.experiences.map((exp) => (
                      <div key={exp.id} className="relative pl-3.5 border-l-2" style={{ borderColor: `${secondary}50` }}>
                        <span
                          className="absolute -left-[5px] top-1 w-2 h-2 rounded-full"
                          style={{ backgroundColor: primary }}
                        />
                        <div className="flex items-baseline justify-between">
                          <span className="text-[11px] font-bold text-slate-900">{exp.position}</span>
                          <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {exp.period}
                          </span>
                        </div>
                        <div className="text-[10px] font-bold mt-0.5" style={{ color: secondary }}>
                          {exp.company}
                        </div>
                        <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">
                          {exp.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sertifikasi */}
              {cvData.certifications && cvData.certifications.length > 0 && (
                renderCanvaWrapper(
                  'certifications',
                  'Sertifikasi & Lisensi',
                  <div>
                    <h3
                      className="text-xs font-black uppercase tracking-wider pb-1 mb-2 border-b-2 flex items-center gap-1.5"
                      style={{ borderColor: primary, color: primary }}
                    >
                      <Award size={13} />
                      <span>Sertifikasi & Lisensi</span>
                    </h3>
                    <ul className="space-y-1 text-[10px] text-slate-700 list-disc list-inside">
                      {cvData.certifications.map((cert, idx) => (
                        <li key={idx} className="leading-tight">
                          {cert}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              )}
            </div>

            {/* Right 5 Columns: Education, Skills, Languages */}
            <div className="col-span-5 space-y-6">
              {/* Pendidikan */}
              {renderCanvaWrapper(
                'education',
                'Riwayat Pendidikan',
                <div>
                  <h3
                    className="text-xs font-black uppercase tracking-wider pb-1 mb-3 border-b-2 flex items-center gap-1.5"
                    style={{ borderColor: primary, color: primary }}
                  >
                    <GraduationCap size={13} />
                    <span>Riwayat Pendidikan</span>
                  </h3>
                  <div className="space-y-3">
                    {cvData.educations.map((edu) => (
                      <div key={edu.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                        <div className="text-[11px] font-bold text-slate-900 leading-tight">{edu.school}</div>
                        <div className="text-[10px] font-semibold text-slate-600 mt-0.5">{edu.major}</div>
                        <div className="text-[9px] text-slate-500 mt-0.5">{edu.period}</div>
                        {edu.gpa && <div className="text-[9px] text-emerald-600 font-bold mt-0.5">{edu.gpa}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Keahlian */}
              {renderCanvaWrapper(
                'skills',
                'Keahlian Utama',
                <div>
                  <h3
                    className="text-xs font-black uppercase tracking-wider pb-1 mb-2.5 border-b-2"
                    style={{ borderColor: primary, color: primary }}
                  >
                    Keahlian Utama
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {cvData.skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-lg border"
                        style={{
                          backgroundColor: `${primary}10`,
                          borderColor: `${primary}30`,
                          color: primary,
                        }}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bahasa */}
              {cvData.languages && cvData.languages.length > 0 && (
                renderCanvaWrapper(
                  'languages',
                  'Kemampuan Bahasa',
                  <div>
                    <h3
                      className="text-xs font-black uppercase tracking-wider pb-1 mb-2 border-b-2 flex items-center gap-1.5"
                      style={{ borderColor: primary, color: primary }}
                    >
                      <Globe size={13} />
                      <span>Kemampuan Bahasa</span>
                    </h3>
                    <div className="space-y-1.5 text-[10px]">
                      {cvData.languages.map((lang, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-700">
                          <span className="font-medium">{lang.name}</span>
                          <span className="text-[9px] font-bold text-slate-500">{lang.level}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Footer */}
          <footer className="p-6 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-400">
            <span className="font-semibold text-slate-600">LOXER CV Builder • Format A4</span>
            <span>Standar Rekrutmen Mitra LOXER Indonesia</span>
          </footer>
        </div>
      ) : (
        /* Archetype 3: Minimalist Single Column (ATS-Optimized Clean Format) */
        <div className="relative z-10 p-10 flex flex-col justify-between h-full min-h-[297mm]">
          <div>
            {/* Header Centered */}
            <div className="text-center pb-6 border-b-2 mb-6" style={{ borderColor: primary }}>
              {renderCanvaWrapper(
                'fullName',
                'Nama Lengkap',
                <h1
                  contentEditable={editable}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdateField?.('fullName', e.currentTarget.textContent || '')}
                  className={`text-2xl font-black uppercase tracking-wide text-slate-900 leading-tight ${
                    editable ? 'cursor-text rounded px-2 transition-all' : ''
                  }`}
                  style={{
                    fontSize: elementStyles?.['fullName']?.fontSizeOffset
                      ? `${24 + elementStyles['fullName'].fontSizeOffset}px`
                      : undefined,
                  }}
                >
                  {cvData.fullName || 'Nama Lengkap'}
                </h1>
              )}

              {renderCanvaWrapper(
                'headline',
                'Posisi / Headline',
                <p
                  contentEditable={editable}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdateField?.('headline', e.currentTarget.textContent || '')}
                  className={`text-xs font-bold tracking-widest uppercase mt-1 ${
                    editable ? 'cursor-text rounded px-2 transition-all' : ''
                  }`}
                  style={{
                    color: secondary,
                    fontSize: elementStyles?.['headline']?.fontSizeOffset
                      ? `${12 + elementStyles['headline'].fontSizeOffset}px`
                      : undefined,
                  }}
                >
                  {cvData.headline || 'Posisi / Pekerjaan'}
                </p>
              )}

              {renderCanvaWrapper(
                'contact',
                'Kontak Pribadi',
                <div className="flex flex-wrap justify-center items-center gap-4 mt-3 text-[11px] text-slate-600">
                  <span
                    contentEditable={editable}
                    suppressContentEditableWarning
                    onBlur={(e) => onUpdateField?.('phone', e.currentTarget.textContent || '')}
                    className={editable ? 'hover:bg-slate-100 px-1 rounded cursor-text' : ''}
                  >
                    {cvData.phone || '-'}
                  </span>
                  <span>•</span>
                  <span
                    contentEditable={editable}
                    suppressContentEditableWarning
                    onBlur={(e) => onUpdateField?.('email', e.currentTarget.textContent || '')}
                    className={editable ? 'hover:bg-slate-100 px-1 rounded cursor-text' : ''}
                  >
                    {cvData.email || '-'}
                  </span>
                  <span>•</span>
                  <span
                    contentEditable={editable}
                    suppressContentEditableWarning
                    onBlur={(e) => onUpdateField?.('city', e.currentTarget.textContent || '')}
                    className={editable ? 'hover:bg-slate-100 px-1 rounded cursor-text' : ''}
                  >
                    {cvData.city || '-'}
                  </span>
                </div>
              )}
            </div>

            {/* Ringkasan */}
            {renderCanvaWrapper(
              'summary',
              'Ringkasan Profesional',
              <div className="mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest mb-1.5" style={{ color: primary }}>
                  Ringkasan Profesional
                </h3>
                <p
                  contentEditable={editable}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdateField?.('summary', e.currentTarget.textContent || '')}
                  className={`text-[11px] text-slate-700 leading-relaxed text-justify ${
                    editable ? 'cursor-text rounded p-1 transition-all' : ''
                  }`}
                >
                  {cvData.summary}
                </p>
              </div>
            )}

            {/* Pengalaman */}
            {renderCanvaWrapper(
              'experience',
              'Riwayat Pengalaman Kerja',
              <div className="mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: primary }}>
                  Riwayat Pengalaman Kerja
                </h3>
                <div className="space-y-4">
                  {cvData.experiences.map((exp) => (
                    <div key={exp.id}>
                      <div className="flex justify-between items-baseline">
                        <span className="text-[11px] font-bold text-slate-900">{exp.position}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{exp.period}</span>
                      </div>
                      <div className="text-[10px] font-semibold text-slate-600">{exp.company}</div>
                      <p className="text-[10px] text-slate-600 mt-1 leading-relaxed">
                        {exp.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pendidikan & Keahlian Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Pendidikan */}
              {renderCanvaWrapper(
                'education',
                'Pendidikan',
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: primary }}>
                    <GraduationCap size={13} />
                    <span>Pendidikan</span>
                  </h3>
                  {cvData.educations.map((edu) => (
                    <div key={edu.id} className="text-[10px] text-slate-700">
                      <div className="font-bold text-slate-900">{edu.school}</div>
                      <div>{edu.major} ({edu.period})</div>
                      {edu.gpa && <div className="text-slate-500">{edu.gpa}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Keahlian */}
              {renderCanvaWrapper(
                'skills',
                'Keahlian & Kompetensi',
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest mb-2" style={{ color: primary }}>
                    Keahlian & Kompetensi
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {cvData.skills.map((skill, idx) => (
                      <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 text-center text-[9px] text-slate-400">
            Dibuat dengan LOXER CV Maker • Template: {template.name}
          </div>
        </div>
      )}
    </div>
  );
};
