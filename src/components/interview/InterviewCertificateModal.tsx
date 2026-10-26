import React from 'react';
import {
  Award,
  Download,
  X,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  FileCheck2,
} from 'lucide-react';
import {
  InterviewCertificateData,
  openPrintInterviewCertificate,
} from '../../lib/interviewCertificateService';

interface InterviewCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InterviewCertificateData | null;
}

export const InterviewCertificateModal: React.FC<InterviewCertificateModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen || !data) return null;

  const completedDate = data.completedAt ? new Date(data.completedAt) : new Date();
  const dateFormatted = completedDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const certNumber = `LOX-CERT-${completedDate.getFullYear()}${String(completedDate.getMonth() + 1).padStart(2, '0')}-${(data.sessionCode || 'LOX').replace(/^LOX-IV-/, '')}`;
  const isHighRecommendation = data.overallScore >= 80;

  const handlePrint = () => {
    openPrintInterviewCertificate(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-[#0b1329] border border-cyan-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-100 my-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-sky-500 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-cyan-400">
                Sertifikat Kesiapan Kerja LOXER
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-400/20 text-cyan-300 border border-cyan-400/30">
                Terverifikasi AI
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
              Hasil Asesmen Wawancara Resmi
            </h2>
          </div>
        </div>

        {/* Certificate Preview Card */}
        <div className="mt-5 p-5 rounded-2xl bg-gradient-to-br from-white/5 via-white/[0.02] to-transparent border border-white/10 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />

          {/* Candidate Name & Role */}
          <div className="text-center pb-4 border-b border-white/10">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Diberikan Kepada:
            </p>
            <h3 className="text-xl sm:text-2xl font-black text-cyan-300 mt-0.5 tracking-tight">
              {data.candidateName}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-200 mt-1">
              {data.roleTitle}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Penyelenggara / Jalur Uji: {data.companyName}
            </p>
          </div>

          {/* Overall Score & Recommendation Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-center flex flex-col justify-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Skor Keseluruhan
              </span>
              <div className="text-3xl font-black text-cyan-400 mt-0.5">
                {data.overallScore}
                <span className="text-xs text-slate-400 font-normal"> / 100</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-center flex flex-col justify-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Rekomendasi Asesor
              </span>
              <div className="mt-1">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black inline-block ${
                    isHighRecommendation
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {data.recommendation}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-center flex flex-col justify-center">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Tingkat Kesiapan
              </span>
              <div className="text-sm font-black text-white mt-1 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>{data.overallScore >= 85 ? 'Sangat Siap Kerja' : 'Siap Kerja'}</span>
              </div>
            </div>
          </div>

          {/* 4 Pillars Grid */}
          <div className="space-y-2 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Evaluasi 4 Pilar Kompetensi:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-slate-400">Teknis</div>
                <div className="text-sm font-bold text-white mt-0.5">{data.technicalScore}%</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-slate-400">Komunikasi</div>
                <div className="text-sm font-bold text-white mt-0.5">{data.communicationScore}%</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-slate-400">Problem Solving</div>
                <div className="text-sm font-bold text-white mt-0.5">{data.problemSolvingScore}%</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <div className="text-[10px] text-slate-400">Cultural Fit</div>
                <div className="text-sm font-bold text-white mt-0.5">{data.culturalFitScore}%</div>
              </div>
            </div>
          </div>

          {/* Strengths */}
          {data.strengths && data.strengths.length > 0 && (
            <div className="mt-3.5 pt-3 border-t border-white/10">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1 mb-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Poin Keunggulan Teridentifikasi:</span>
              </p>
              <ul className="text-xs text-slate-300 space-y-1 list-disc pl-5 leading-relaxed">
                {data.strengths.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Meta Info: Number & Date */}
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] text-slate-400 gap-2">
            <div className="flex items-center gap-1">
              <FileCheck2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>No. Dokumen: <strong className="text-slate-200">{certNumber}</strong></span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>Diterbitkan: {dateFormatted}</span>
            </div>
          </div>
        </div>

        {/* Modal Action CTA */}
        <div className="mt-5 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 text-slate-950 shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>🖨️ Cetak / Simpan sebagai PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default InterviewCertificateModal;
