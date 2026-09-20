/**
 * Helper utilities for Employer features:
 * - PDF/Printable Interview Invitation Letter Generator
 * - WhatsApp Interview Dispatcher
 * - CSV Exporter (with UTF-8 BOM for Microsoft Excel compatibility)
 */

export interface InterviewLetterData {
  companyName: string;
  companyCity?: string;
  applicantName: string;
  applicantPhone?: string;
  jobTitle: string;
  scheduledAt: string;
  locationOrLink: string;
  notes?: string;
  letterNumber?: string;
}

export function formatFormalDate(dateStr: string): { fullDate: string; time: string } {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return { fullDate: dateStr, time: '' };
    }
    const fullDate = d.toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const time = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }) + ' WIB';
    return { fullDate, time };
  } catch {
    return { fullDate: dateStr, time: '' };
  }
}

export function cleanIndonesianPhone(phone?: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  } else if (cleaned.startsWith('8')) {
    cleaned = '62' + cleaned;
  }
  return cleaned;
}

export function generateWhatsAppInterviewLink(
  data: InterviewLetterData
): string {
  const { fullDate, time } = formatFormalDate(data.scheduledAt);
  const timeDisplay = time ? `${fullDate}, pukul ${time}` : fullDate;
  const phone = cleanIndonesianPhone(data.applicantPhone);

  const message = `Halo Sdr/i *${data.applicantName}*,

Kami dari tim HRD *${data.companyName}* mengundang Anda untuk mengikuti tahapan Wawancara Kerja (Interview) untuk posisi:
📌 *${data.jobTitle}*

Berikut detail jadwal wawancara Anda:
🗓️ *Waktu:* ${timeDisplay}
📍 *Lokasi / Link:* ${data.locationOrLink || 'Kantor Perusahaan'}
${data.notes ? `📝 *Catatan Khusus:* ${data.notes}\n` : ''}
Mohon membalas pesan ini untuk konfirmasi kehadiran Anda.
Terima kasih dan semoga sukses!

Hormat kami,
*Tim Rekrutmen ${data.companyName}*
_Dikelola melalui LOXER Recruitment Platform_`;

  const baseUrl = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

export function generateInterviewLetterHtml(data: InterviewLetterData): string {
  const { fullDate, time } = formatFormalDate(data.scheduledAt);
  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const refNumber = data.letterNumber || `LOXER/INV/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Surat Panggilan Wawancara - ${data.applicantName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 20mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1e293b;
      line-height: 1.6;
      background: #f8fafc;
      padding: 24px;
    }
    .letter-container {
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      padding: 48px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #0284c7;
      padding-bottom: 20px;
      margin-bottom: 28px;
    }
    .company-title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }
    .company-sub {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .platform-badge {
      text-align: right;
      font-size: 11px;
      font-weight: 700;
      color: #0284c7;
      background: #e0f2fe;
      padding: 6px 14px;
      border-radius: 9999px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 24px;
      font-size: 13px;
    }
    .recipient {
      margin-bottom: 24px;
      font-size: 13px;
    }
    .recipient strong {
      font-size: 15px;
      color: #0f172a;
    }
    .subject {
      margin-bottom: 20px;
      font-size: 14px;
      font-weight: 700;
      color: #0369a1;
      text-decoration: underline;
    }
    .body-paragraph {
      font-size: 13px;
      margin-bottom: 16px;
      text-align: justify;
      color: #334155;
    }
    .details-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    .details-table td {
      padding: 10px 14px;
      font-size: 13px;
      border-bottom: 1px solid #e2e8f0;
    }
    .details-table td:first-child {
      width: 28%;
      font-weight: 600;
      color: #475569;
      background: #f1f5f9;
    }
    .details-table td:last-child {
      color: #0f172a;
    }
    .signatures {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
    }
    .sig-box {
      width: 260px;
      font-size: 13px;
    }
    .sig-space {
      height: 70px;
    }
    .sig-name {
      font-weight: 700;
      border-bottom: 1px solid #94a3b8;
      padding-bottom: 4px;
      color: #0f172a;
    }
    .sig-role {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .footer-note {
      margin-top: 48px;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
    .print-bar {
      margin-bottom: 16px;
      text-align: right;
    }
    .print-btn {
      background: #0284c7;
      color: #ffffff;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .letter-container {
        box-shadow: none;
        padding: 0;
        border-radius: 0;
      }
      .print-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="print-btn" onclick="window.print()">🖨️ Cetak / Simpan sebagai PDF</button>
  </div>
  <div class="letter-container">
    <div class="header">
      <div>
        <div class="company-title">${data.companyName}</div>
        <div class="company-sub">${data.companyCity ? `Divisi Rekrutmen & Pengembangan SDM · ${data.companyCity}` : 'Divisi Rekrutmen & Pengembangan SDM'}</div>
      </div>
      <div class="platform-badge">LOXER Official Invitation</div>
    </div>

    <div class="meta-row">
      <div>
        <div><strong>Nomor:</strong> ${refNumber}</div>
        <div><strong>Lampiran:</strong> -</div>
      </div>
      <div style="text-align: right;">
        <div>${data.companyCity || 'Indonesia'}, ${todayFormatted}</div>
      </div>
    </div>

    <div class="recipient">
      <div>Kepada Yth.</div>
      <strong>${data.applicantName}</strong>
      <div>Kandidat Calon Karyawan</div>
      <div>di Tempat</div>
    </div>

    <div class="subject">Perihal: Undangan Wawancara Kerja (Interview) - ${data.jobTitle}</div>

    <p class="body-paragraph">
      Dengan hormat,<br />
      Sehubungan dengan lamaran pekerjaan yang telah Anda ajukan melalui platform LOXER untuk posisi <strong>${data.jobTitle}</strong>, setelah melalui tahapan seleksi berkas awal, dengan ini kami mengundang Anda untuk mengikuti sesi Wawancara Kerja (Interview) yang akan dilaksanakan pada:
    </p>

    <table class="details-table">
      <tr>
        <td>Hari / Tanggal</td>
        <td><strong>${fullDate}</strong></td>
      </tr>
      <tr>
        <td>Pukul</td>
        <td><strong>${time || 'Sesuai kesepakatan'}</strong></td>
      </tr>
      <tr>
        <td>Posisi Lowongan</td>
        <td>${data.jobTitle}</td>
      </tr>
      <tr>
        <td>Lokasi / Platform</td>
        <td><strong>${data.locationOrLink || 'Kantor Perusahaan'}</strong></td>
      </tr>
      ${data.notes ? `
      <tr>
        <td>Catatan Khusus</td>
        <td>${data.notes}</td>
      </tr>` : ''}
    </table>

    <p class="body-paragraph">
      Mohon hadir tepat waktu (sekitar 10–15 menit sebelum jadwal wawancara dimulai). Apabila wawancara dilaksanakan secara daring/virtual, pastikan koneksi internet, mikrofon, dan kamera Anda berfungsi dengan baik.
    </p>
    <p class="body-paragraph">
      Demikian surat undangan ini kami sampaikan. Atas perhatian dan kehadiran Anda, kami ucapkan terima kasih.
    </p>

    <div class="signatures">
      <div class="sig-box">
        <div>Hormat kami,</div>
        <div style="font-weight: 600; color: #0284c7; margin-bottom: 4px;">${data.companyName}</div>
        <div class="sig-space"></div>
        <div class="sig-name">Tim Rekrutmen & HRD</div>
        <div class="sig-role">Human Resources Department</div>
      </div>
    </div>

    <div class="footer-note">
      Dokumen ini diterbitkan secara resmi melalui Platform LOXER Rekrutmen Indonesia.<br />
      ID Referensi: ${refNumber} · Tanggal Cetak: ${todayFormatted}
    </div>
  </div>
  <script>
    window.addEventListener('load', function() {
      // Auto-trigger print preview in browser
      setTimeout(function() {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>`;
}

export function openPrintInterviewLetter(data: InterviewLetterData): void {
  const html = generateInterviewLetterHtml(data);
  const printWindow = window.open('', '_blank', 'width=880,height=960');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/**
 * Clean CSV export with UTF-8 BOM for Indonesian characters and Microsoft Excel compatibility
 */
export function exportToCsv(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]): void {
  const sanitizeCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerLine = headers.map(sanitizeCell).join(',');
  const rowLines = rows.map((row) => row.map(sanitizeCell).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
