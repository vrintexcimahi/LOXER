/**
 * LOXER Official AI Interview Certificate & Scorecard Export Service
 * Produces high-prestige, print-ready PDF certificates for job candidates.
 */

export interface InterviewCertificateData {
  candidateName: string;
  candidateEmail?: string;
  roleTitle: string;
  companyName: string;
  sessionCode: string;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  culturalFitScore: number;
  recommendation: 'Sangat Disarankan' | 'Dipertimbangkan' | 'Perlu Peningkatan' | string;
  summaryFeedback: string;
  strengths?: string[];
  weaknesses?: string[];
  completedAt?: string;
}

export function generateCertificateHtml(data: InterviewCertificateData): string {
  const completedDate = data.completedAt ? new Date(data.completedAt) : new Date();
  const dateFormatted = completedDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const certNumber = `LOX-CERT-${completedDate.getFullYear()}${String(completedDate.getMonth() + 1).padStart(2, '0')}-${data.sessionCode.replace(/^LOX-IV-/, '')}`;
  const isHighRecommendation = data.overallScore >= 80;
  const grade = data.overallScore >= 85 ? 'A (Unggul)' : data.overallScore >= 75 ? 'B (Kompeten)' : 'C (Cukup)';

  const strengthsList = (data.strengths && data.strengths.length > 0)
    ? data.strengths.map((s) => `<li>${s}</li>`).join('')
    : '<li>Menunjukkan pemahaman dasar dan kesiapan kerja yang baik</li>';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Sertifikat Kesiapan Kerja - ${data.candidateName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      -webkit-font-smoothing: antialiased;
      padding: 20px;
    }
    .print-actions {
      max-width: 800px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .print-btn {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
    }
    .print-btn:hover {
      background: #0369a1;
    }
    .cert-frame {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      border: 8px solid #0f172a;
      outline: 2px solid #0284c7;
      outline-offset: -5px;
      border-radius: 12px;
      padding: 36px 42px;
      position: relative;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    .cert-frame::before {
      content: "";
      position: absolute;
      top: -60px;
      right: -60px;
      width: 180px;
      height: 180px;
      background: linear-gradient(135deg, rgba(2,132,199,0.12), rgba(14,165,233,0.02));
      border-radius: 50%;
      pointer-events: none;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 18px;
      margin-bottom: 24px;
    }
    .brand-col h1 {
      font-size: 26px;
      font-black;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .brand-col h1 span {
      color: #0284c7;
    }
    .brand-col p {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .cert-badge {
      background: #0f172a;
      color: #38bdf8;
      border: 1px solid #0284c7;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .title-banner {
      text-align: center;
      margin-bottom: 24px;
    }
    .cert-title {
      font-size: 21px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .cert-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 4px;
    }
    .recipient-section {
      text-align: center;
      margin-bottom: 24px;
      padding: 16px;
      background: #f8fafc;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }
    .recipient-lead {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
    .candidate-name {
      font-size: 24px;
      font-weight: 900;
      color: #0284c7;
      margin: 4px 0 2px 0;
    }
    .position-track {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
    }
    .company-track {
      font-size: 11px;
      color: #64748b;
    }
    .score-summary-grid {
      display: grid;
      grid-template-columns: 160px 1fr;
      gap: 16px;
      margin-bottom: 24px;
      align-items: stretch;
    }
    .overall-card {
      background: linear-gradient(135deg, #0f172a, #1e293b);
      color: #ffffff;
      border-radius: 12px;
      padding: 18px 14px;
      text-align: center;
      display: flex;
      flex-col;
      flex-direction: column;
      justify-content: center;
      border: 1px solid #334155;
    }
    .overall-card .label {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #94a3b8;
    }
    .overall-card .score {
      font-size: 38px;
      font-weight: 900;
      color: #38bdf8;
      line-height: 1.1;
      margin: 4px 0;
    }
    .overall-card .grade {
      font-size: 11px;
      font-weight: 800;
      color: ${isHighRecommendation ? '#4ade80' : '#fbbf24'};
    }
    .pillars-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .pillar-item {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .pillar-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }
    .pillar-bar-wrapper {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 4px;
    }
    .pillar-bar-bg {
      flex: 1;
      height: 7px;
      background: #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .pillar-bar-fill {
      height: 100%;
      background: #0284c7;
      border-radius: 4px;
    }
    .pillar-value {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      width: 32px;
      text-align: right;
    }
    .feedback-box {
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 24px;
      background: #fafafa;
    }
    .feedback-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #0284c7;
      margin-bottom: 6px;
    }
    .feedback-text {
      font-size: 11px;
      color: #334155;
      line-height: 1.5;
    }
    .strengths-box {
      margin-top: 8px;
    }
    .strengths-box ul {
      font-size: 11px;
      color: #334155;
      padding-left: 18px;
      line-height: 1.4;
    }
    .cert-footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      margin-top: 12px;
    }
    .verify-col {
      font-size: 9px;
      color: #64748b;
      line-height: 1.4;
    }
    .verify-col strong {
      color: #0f172a;
    }
    .signature-col {
      text-align: right;
    }
    .signature-stamp {
      font-size: 11px;
      font-weight: 800;
      color: #0284c7;
      margin-bottom: 2px;
    }
    .signature-sub {
      font-size: 10px;
      color: #64748b;
    }

    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      .print-actions {
        display: none !important;
      }
      .cert-frame {
        box-shadow: none;
        max-width: 100%;
        border-color: #0f172a;
        padding: 28px 32px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="print-btn" onclick="window.print()">
      🖨️ Cetak / Simpan sebagai PDF
    </button>
  </div>

  <div class="cert-frame">
    <div class="header-row">
      <div class="brand-col">
        <h1>LOXER <span>RECRUITMENT</span></h1>
        <p>National Career Platform & AI Verification</p>
      </div>
      <div class="cert-badge">Official Assessment</div>
    </div>

    <div class="title-banner">
      <div class="cert-title">Sertifikat Kesiapan Kerja & Evaluasi Wawancara AI</div>
      <div class="cert-sub">Berdasarkan Pengujian Multimodal Interaktif LOXER Gemini 3.8 Live Interview System</div>
    </div>

    <div class="recipient-section">
      <div class="recipient-lead">Diberikan secara resmi kepada:</div>
      <div class="candidate-name">${data.candidateName}</div>
      <div class="position-track">Posisi: ${data.roleTitle}</div>
      <div class="company-track">Penyelenggara / Jalur Uji: ${data.companyName}</div>
    </div>

    <div class="score-summary-grid">
      <div class="overall-card">
        <div class="label">Skor Akhir</div>
        <div class="score">${data.overallScore}</div>
        <div class="grade">${grade}</div>
        <div style="font-size: 9px; color: #94a3b8; margin-top: 4px;">Rekomendasi: ${data.recommendation}</div>
      </div>

      <div class="pillars-grid">
        <div class="pillar-item">
          <div class="pillar-label">1. Penguasaan Teknis</div>
          <div class="pillar-bar-wrapper">
            <div class="pillar-bar-bg"><div class="pillar-bar-fill" style="width: ${data.technicalScore}%"></div></div>
            <div class="pillar-value">${data.technicalScore}%</div>
          </div>
        </div>

        <div class="pillar-item">
          <div class="pillar-label">2. Komunikasi & Respon</div>
          <div class="pillar-bar-wrapper">
            <div class="pillar-bar-bg"><div class="pillar-bar-fill" style="width: ${data.communicationScore}%"></div></div>
            <div class="pillar-value">${data.communicationScore}%</div>
          </div>
        </div>

        <div class="pillar-item">
          <div class="pillar-label">3. Problem Solving</div>
          <div class="pillar-bar-wrapper">
            <div class="pillar-bar-bg"><div class="pillar-bar-fill" style="width: ${data.problemSolvingScore}%"></div></div>
            <div class="pillar-value">${data.problemSolvingScore}%</div>
          </div>
        </div>

        <div class="pillar-item">
          <div class="pillar-label">4. Cultural & Team Fit</div>
          <div class="pillar-bar-wrapper">
            <div class="pillar-bar-bg"><div class="pillar-bar-fill" style="width: ${data.culturalFitScore}%"></div></div>
            <div class="pillar-value">${data.culturalFitScore}%</div>
          </div>
        </div>
      </div>
    </div>

    <div class="feedback-box">
      <div class="feedback-title">Catatan Asesor Dewan Wawancara AI:</div>
      <div class="feedback-text">${data.summaryFeedback || 'Kandidat menunjukkan komitmen dan penguasaan peran yang baik.'}</div>

      <div class="strengths-box">
        <div style="font-size: 10px; font-weight: 700; color: #0f172a; margin: 6px 0 2px 0;">Kelebihan Teridentifikasi:</div>
        <ul>${strengthsList}</ul>
      </div>
    </div>

    <div class="cert-footer">
      <div class="verify-col">
        <div><strong>Nomor Dokumen:</strong> ${certNumber}</div>
        <div><strong>ID Sesi Pengujian:</strong> ${data.sessionCode}</div>
        <div><strong>Tanggal Terbit:</strong> ${dateFormatted}</div>
        <div>Verifikasi digital: loxer.web.id/interview • Valid untuk lampiran berkas lamaran kerja.</div>
      </div>

      <div class="signature-col">
        <div class="signature-stamp">LOXER AI Assessment Board</div>
        <div class="signature-sub">Sistem Pengujian Terakreditasi Digital</div>
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;
}

export function openPrintInterviewCertificate(data: InterviewCertificateData): void {
  const html = generateCertificateHtml(data);
  const printWindow = window.open('', '_blank', 'width=900,height=1000');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}
