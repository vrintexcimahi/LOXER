/**
 * LOXER Smart PDF Multi-Page Splitter & Document Classifier
 * ============================================================
 * Memecah file PDF multi-halaman menjadi halaman individual,
 * mengklasifikasikan setiap halaman (KTP, Ijazah, CV, SKCK, dll.),
 * menerapkan sensor/blur penuh untuk dokumen sensitif,
 * dan mengarsipkan ke galeri berkas pelamar.
 */

// ─── PDF.js type stubs ───────────────────────────────────────────────────────
export interface PdfJsPage {
  getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
}

export interface PdfJsDoc {
  numPages: number;
  getPage: (num: number) => Promise<PdfJsPage>;
}

export interface PdfJsLibrary {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: { data: ArrayBuffer }) => { promise: Promise<PdfJsDoc> };
}

// ─── Document Classification Types ────────────────────────────────────────────

export type DocumentClass =
  | 'ktp'
  | 'ijazah'
  | 'skck'
  | 'cv_resume'
  | 'sertifikat'
  | 'surat_lamaran'
  | 'slip_gaji'
  | 'kartu_keluarga'
  | 'npwp'
  | 'paspor'
  | 'sim'
  | 'akta_lahir'
  | 'foto_diri'
  | 'dokumen_lain';

export interface DocumentClassMeta {
  label: string;
  labelEN: string;
  isSensitive: boolean;
  censorLevel: 'none' | 'partial' | 'full';
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

export const DOCUMENT_CLASS_META: Record<DocumentClass, DocumentClassMeta> = {
  ktp: {
    label: 'KTP / E-KTP',
    labelEN: 'National ID Card',
    isSensitive: true,
    censorLevel: 'full',
    color: '#f87171',
    bgColor: 'rgba(239,68,68,0.15)',
    icon: '🪪',
    description: 'Kartu Tanda Penduduk — dokumen sensitif, disensor penuh',
  },
  ijazah: {
    label: 'Ijazah / Transkrip',
    labelEN: 'Diploma / Transcript',
    isSensitive: true,
    censorLevel: 'full',
    color: '#fb923c',
    bgColor: 'rgba(249,115,22,0.15)',
    icon: '🎓',
    description: 'Ijazah atau transkrip nilai — dokumen sensitif, disensor penuh',
  },
  skck: {
    label: 'SKCK',
    labelEN: 'Police Clearance',
    isSensitive: true,
    censorLevel: 'full',
    color: '#a78bfa',
    bgColor: 'rgba(139,92,246,0.15)',
    icon: '🚔',
    description: 'Surat Keterangan Catatan Kepolisian — dokumen sensitif, disensor penuh',
  },
  cv_resume: {
    label: 'CV / Resume',
    labelEN: 'CV / Resume',
    isSensitive: false,
    censorLevel: 'partial',
    color: '#34d399',
    bgColor: 'rgba(52,211,153,0.15)',
    icon: '📄',
    description: 'Curriculum Vitae — kontak disensor, konten diperlihatkan',
  },
  sertifikat: {
    label: 'Sertifikat',
    labelEN: 'Certificate',
    isSensitive: false,
    censorLevel: 'none',
    color: '#60a5fa',
    bgColor: 'rgba(96,165,250,0.15)',
    icon: '🏆',
    description: 'Sertifikat kompetensi atau pelatihan',
  },
  surat_lamaran: {
    label: 'Surat Lamaran',
    labelEN: 'Cover Letter',
    isSensitive: false,
    censorLevel: 'partial',
    color: '#38bdf8',
    bgColor: 'rgba(56,189,248,0.15)',
    icon: '✉️',
    description: 'Surat lamaran kerja — kontak disensor',
  },
  slip_gaji: {
    label: 'Slip Gaji',
    labelEN: 'Pay Slip',
    isSensitive: true,
    censorLevel: 'full',
    color: '#fbbf24',
    bgColor: 'rgba(251,191,36,0.15)',
    icon: '💰',
    description: 'Slip gaji — dokumen finansial sensitif, disensor penuh',
  },
  kartu_keluarga: {
    label: 'Kartu Keluarga',
    labelEN: 'Family Card',
    isSensitive: true,
    censorLevel: 'full',
    color: '#f472b6',
    bgColor: 'rgba(244,114,182,0.15)',
    icon: '👨‍👩‍👧‍👦',
    description: 'Kartu Keluarga — dokumen keluarga sensitif, disensor penuh',
  },
  npwp: {
    label: 'NPWP',
    labelEN: 'Tax ID',
    isSensitive: true,
    censorLevel: 'full',
    color: '#a3e635',
    bgColor: 'rgba(163,230,53,0.15)',
    icon: '🏦',
    description: 'Nomor Pokok Wajib Pajak — dokumen fiskal sensitif, disensor penuh',
  },
  paspor: {
    label: 'Paspor',
    labelEN: 'Passport',
    isSensitive: true,
    censorLevel: 'full',
    color: '#c084fc',
    bgColor: 'rgba(192,132,252,0.15)',
    icon: '🛂',
    description: 'Dokumen perjalanan internasional — dokumen sensitif, disensor penuh',
  },
  sim: {
    label: 'SIM',
    labelEN: 'Driving License',
    isSensitive: true,
    censorLevel: 'full',
    color: '#2dd4bf',
    bgColor: 'rgba(45,212,191,0.15)',
    icon: '🚗',
    description: 'Surat Izin Mengemudi — dokumen identitas, disensor penuh',
  },
  akta_lahir: {
    label: 'Akta Lahir',
    labelEN: 'Birth Certificate',
    isSensitive: true,
    censorLevel: 'full',
    color: '#f43f5e',
    bgColor: 'rgba(244,63,94,0.15)',
    icon: '👶',
    description: 'Akta kelahiran — dokumen identitas resmi, disensor penuh',
  },
  foto_diri: {
    label: 'Foto Diri',
    labelEN: 'Personal Photo',
    isSensitive: false,
    censorLevel: 'none',
    color: '#94a3b8',
    bgColor: 'rgba(148,163,184,0.15)',
    icon: '🤳',
    description: 'Foto diri atau pas foto pelamar',
  },
  dokumen_lain: {
    label: 'Dokumen Lain',
    labelEN: 'Other Document',
    isSensitive: false,
    censorLevel: 'none',
    color: '#64748b',
    bgColor: 'rgba(100,116,139,0.15)',
    icon: '📁',
    description: 'Dokumen tidak teridentifikasi atau jenis lain',
  },
};

// ─── Result Types ─────────────────────────────────────────────────────────────

export interface SplitDocumentPage {
  id: string;
  pageNumber: number;
  totalPages: number;
  rawImageBase64: string;
  censoredImageBase64: string;
  textContent: string;
  docClass: DocumentClass;
  confidence: number;
  label: string;
  isSensitive: boolean;
  censorLevel: 'none' | 'partial' | 'full';
  processedAt: string;
  sourceFileName: string;
  candidateName?: string;
}

// ─── Keyword Classification Engine ───────────────────────────────────────────

const KTP_KW = ['nik', 'kartu tanda penduduk', 'e-ktp', 'golongan darah', 'kewarganegaraan', 'provinsi', 'kabupaten', 'kecamatan', 'kelurahan'];
const IJAZAH_KW = ['ijazah', 'transkrip', 'nilai', 'diploma', 'sarjana', 'sttb', 'gelar', 'yudisium', 'kelulusan', 'lulus', 'sekolah', 'universitas', 'akademi'];
const SKCK_KW = ['skck', 'keterangan catatan kepolisian', 'polres', 'polda', 'polsek', 'berkelakuan baik'];
const CV_KW = ['curriculum vitae', 'resume', 'pengalaman kerja', 'riwayat', 'pendidikan', 'keahlian', 'skill', 'referensi', 'daftar riwayat'];
const SERTIF_KW = ['sertifikat', 'certificate', 'certify', 'certified', 'kompetensi', 'pelatihan', 'training', 'workshop'];
const SURAT_KW = ['surat lamaran', 'melamar', 'kepada yth', 'hormat saya', 'posisi yang dilamar', 'bergabung'];
const SLIP_KW = ['slip gaji', 'payslip', 'gaji pokok', 'tunjangan', 'potongan', 'take home pay', 'upah'];
const KK_KW = ['kartu keluarga', 'nomor kk', 'kepala keluarga', 'nama anggota keluarga', 'status hubungan'];
const NPWP_KW = ['npwp', 'nomor pokok wajib pajak', 'direktorat jenderal pajak', 'wajib pajak'];
const PASPOR_KW = ['passport', 'paspor', 'republic indonesia', 'date of expiry', 'date of birth', 'nationality'];
const SIM_KW = ['surat izin mengemudi', 'sim a', 'sim b', 'sim c', 'golongan sim', 'kepolisian negara'];
const AKTA_KW = ['akta kelahiran', 'akta lahir', 'catatan sipil', 'dinas kependudukan', 'tempat lahir', 'dilahirkan'];

function classifyByText(text: string): { docClass: DocumentClass; confidence: number } {
  const t = text.toLowerCase();
  const score = (keywords: string[]) =>
    keywords.reduce((acc, kw) => acc + (t.includes(kw) ? 1 : 0), 0);

  const scores: Record<DocumentClass, number> = {
    ktp: score(KTP_KW) * 15,
    ijazah: score(IJAZAH_KW) * 12,
    skck: score(SKCK_KW) * 18,
    cv_resume: score(CV_KW) * 10,
    sertifikat: score(SERTIF_KW) * 12,
    surat_lamaran: score(SURAT_KW) * 12,
    slip_gaji: score(SLIP_KW) * 15,
    kartu_keluarga: score(KK_KW) * 15,
    npwp: score(NPWP_KW) * 18,
    paspor: score(PASPOR_KW) * 18,
    sim: score(SIM_KW) * 18,
    akta_lahir: score(AKTA_KW) * 18,
    foto_diri: 0,
    dokumen_lain: 5,
  };

  const sorted = (Object.entries(scores) as [DocumentClass, number][]).sort(([, a], [, b]) => b - a);
  const best = sorted[0];
  const docClass: DocumentClass = best[1] >= 10 ? best[0] : 'dokumen_lain';
  const confidence = Math.min(98, Math.max(40, best[1]));

  return { docClass, confidence };
}

// ─── Full-Page Censoring ──────────────────────────────────────────────────────

export async function censorFullPage(imageBase64: string, docClass: DocumentClass): Promise<string> {
  if (!imageBase64) return imageBase64;
  const meta = DOCUMENT_CLASS_META[docClass];
  if (meta.censorLevel === 'none') return imageBase64;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const W = img.naturalWidth || 794;
        const H = img.naturalHeight || 1123;
        const scale = Math.min(1, 1000 / Math.max(W, H));
        const cW = Math.round(W * scale);
        const cH = Math.round(H * scale);

        const canvas = document.createElement('canvas');
        canvas.width = cW;
        canvas.height = cH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(imageBase64);

        ctx.drawImage(img, 0, 0, cW, cH);

        if (meta.censorLevel === 'full') {
          // Heavy pixelation
          const blockSize = Math.max(8, Math.floor(cW / 40));
          const small = document.createElement('canvas');
          small.width = Math.max(1, Math.floor(cW / blockSize));
          small.height = Math.max(1, Math.floor(cH / blockSize));
          const sCtx = small.getContext('2d');
          if (sCtx) {
            sCtx.imageSmoothingEnabled = false;
            sCtx.drawImage(canvas, 0, 0, small.width, small.height);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(small, 0, 0, cW, cH);
          }

          // Dark overlay
          const grad = ctx.createLinearGradient(0, 0, 0, cH);
          grad.addColorStop(0, 'rgba(15,23,42,0.88)');
          grad.addColorStop(0.5, 'rgba(15,23,42,0.82)');
          grad.addColorStop(1, 'rgba(15,23,42,0.88)');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, cW, cH);

          // Central security card
          const cardW = Math.min(cW - 40, 380);
          const cardH = 160;
          const cardX = (cW - cardW) / 2;
          const cardY = (cH - cardH) / 2;

          ctx.fillStyle = 'rgba(15,23,42,0.96)';
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(cardX, cardY, cardW, cardH, 14);
          } else {
            ctx.rect(cardX, cardY, cardW, cardH);
          }
          ctx.fill();

          ctx.strokeStyle = meta.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(cardX, cardY, cardW, cardH, 14);
          } else {
            ctx.rect(cardX, cardY, cardW, cardH);
          }
          ctx.stroke();

          const titleFontSize = Math.min(15, Math.floor(cardW / 20));
          ctx.font = `${Math.floor(titleFontSize * 1.8)}px system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(meta.icon, cardX + cardW / 2, cardY + 36);

          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${titleFontSize}px system-ui, -apple-system, sans-serif`;
          ctx.fillText(meta.label.toUpperCase(), cardX + cardW / 2, cardY + 72);

          ctx.fillStyle = meta.color;
          ctx.font = `600 ${Math.max(9, titleFontSize - 3)}px system-ui`;
          ctx.fillText('🔒 DOKUMEN SENSITIF — DISENSOR PENUH', cardX + cardW / 2, cardY + 96);

          ctx.fillStyle = 'rgba(148,163,184,0.9)';
          ctx.font = `500 ${Math.max(9, titleFontSize - 4)}px system-ui`;
          ctx.fillText(meta.description, cardX + cardW / 2, cardY + 118);

          ctx.fillStyle = 'rgba(248,250,252,0.22)';
          ctx.font = `bold ${Math.max(9, titleFontSize - 5)}px system-ui`;
          ctx.fillText('© LOXER — Galeri Berkas Pelamar • Terproteksi', cardX + cardW / 2, cardY + cardH - 12);

        } else if (meta.censorLevel === 'partial') {
          const zoneH = Math.round(cH * 0.18);
          const zoneY = cH - zoneH;

          const zoneSm = document.createElement('canvas');
          zoneSm.width = Math.max(1, Math.floor(cW / 10));
          zoneSm.height = Math.max(1, Math.floor(zoneH / 10));
          const zCtx = zoneSm.getContext('2d');
          if (zCtx) {
            zCtx.imageSmoothingEnabled = false;
            zCtx.drawImage(canvas, 0, zoneY, cW, zoneH, 0, 0, zoneSm.width, zoneSm.height);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(zoneSm, 0, 0, zoneSm.width, zoneSm.height, 0, zoneY, cW, zoneH);
          }

          ctx.fillStyle = 'rgba(15,23,42,0.85)';
          ctx.fillRect(0, zoneY, cW, zoneH);
          ctx.strokeStyle = 'rgba(56,189,248,0.5)';
          ctx.lineWidth = 1;
          ctx.strokeRect(0, zoneY, cW, zoneH);

          ctx.fillStyle = '#38bdf8';
          ctx.font = `bold ${Math.min(13, Math.floor(zoneH / 3))}px system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔒 KONTAK TERPROTEKSI LOXER', cW / 2, zoneY + zoneH / 2 - 8);
          ctx.fillStyle = '#94a3b8';
          ctx.font = `600 ${Math.min(10, Math.floor(zoneH / 4))}px system-ui`;
          ctx.fillText('Rekrutmen wajib melalui platform LOXER.id', cW / 2, zoneY + zoneH / 2 + 10);
        }

        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch (err) {
        console.warn('[censorFullPage] Error:', err);
        resolve(imageBase64);
      }
    };
    img.onerror = () => resolve(imageBase64);
    img.src = imageBase64;
  });
}

// ─── PDF.js Loader ────────────────────────────────────────────────────────────

let pdfJsCache: PdfJsLibrary | null = null;

export async function loadPdfJsForSplitter(): Promise<PdfJsLibrary | null> {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as Window & { pdfjsLib?: PdfJsLibrary };
  if (win.pdfjsLib) { pdfJsCache = win.pdfjsLib; return win.pdfjsLib; }
  if (pdfJsCache) return pdfJsCache;

  return new Promise<PdfJsLibrary>((resolve, reject) => {
    const existing = document.getElementById('pdfjs-splitter-script');
    if (existing) {
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        const lib = (window as unknown as Window & { pdfjsLib?: PdfJsLibrary }).pdfjsLib;
        if (lib) { clearInterval(poll); pdfJsCache = lib; resolve(lib); }
        if (attempts > 60) { clearInterval(poll); reject(new Error('PDF.js timeout')); }
      }, 200);
      return;
    }

    const script = document.createElement('script');
    script.id = 'pdfjs-splitter-script';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjs = (window as unknown as Window & { pdfjsLib?: PdfJsLibrary }).pdfjsLib;
      if (pdfjs) {
        pdfjs.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfJsCache = pdfjs;
        resolve(pdfjs);
      } else {
        reject(new Error('PDF.js tidak terdefinisi'));
      }
    };
    script.onerror = () => reject(new Error('Gagal memuat modul PDF.js'));
    document.head.appendChild(script);
  });
}

// ─── Main Splitter ────────────────────────────────────────────────────────────

export interface SplitOptions {
  renderScale?: number;
  maxPages?: number;
  candidateName?: string;
  onProgress?: (current: number, total: number) => void;
}

export async function splitAndClassifyPdf(
  file: File,
  options: SplitOptions = {}
): Promise<SplitDocumentPage[]> {
  const { renderScale = 1.5, maxPages, candidateName, onProgress } = options;

  const pdfjs = await loadPdfJsForSplitter();
  if (!pdfjs) throw new Error('PDF.js tidak tersedia di browser ini');

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const totalPages = maxPages ? Math.min(pdf.numPages, maxPages) : pdf.numPages;

  const results: SplitDocumentPage[] = [];

  for (let p = 1; p <= totalPages; p++) {
    onProgress?.(p, totalPages);
    try {
      const page = await pdf.getPage(p);
      const viewport = page.getViewport({ scale: renderScale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      await page.render({ canvasContext: ctx, viewport }).promise;
      const rawImageBase64 = canvas.toDataURL('image/jpeg', 0.88);

      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((i) => i.str || '').join(' ');

      const { docClass, confidence } = classifyByText(pageText);
      const meta = DOCUMENT_CLASS_META[docClass];
      const censoredImageBase64 = await censorFullPage(rawImageBase64, docClass);

      results.push({
        id: `doc_${Date.now()}_p${p}_${Math.random().toString(36).slice(2, 6)}`,
        pageNumber: p,
        totalPages,
        rawImageBase64,
        censoredImageBase64,
        textContent: pageText.slice(0, 500),
        docClass,
        confidence,
        label: meta.label,
        isSensitive: meta.isSensitive,
        censorLevel: meta.censorLevel,
        processedAt: new Date().toISOString(),
        sourceFileName: file.name,
        candidateName,
      });
    } catch (pageErr) {
      console.warn(`[pdfSplitter] Error on page ${p}:`, pageErr);
      results.push({
        id: `doc_err_${Date.now()}_p${p}`,
        pageNumber: p,
        totalPages,
        rawImageBase64: '',
        censoredImageBase64: '',
        textContent: '',
        docClass: 'dokumen_lain',
        confidence: 0,
        label: 'Gagal Dibaca',
        isSensitive: false,
        censorLevel: 'none',
        processedAt: new Date().toISOString(),
        sourceFileName: file.name,
        candidateName,
      });
    }
  }

  return results;
}
