import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Layers,
  Play,
  Pause,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Send,
  FolderUp,
  FileUp,
  MapPin,
  Clock,
  Lock,
  Download,
  Check,
  X,
} from 'lucide-react';
import { ToastType } from './AdminTalentComponents';
import { cropPasFotoFromImage, generateBlurredCvImage } from '../../lib/cvImageProcessor';
import { cleanDomicileCity, maskPhoneNumber } from '../../lib/contactPrivacyService';

interface PdfJsPage {
  getTextContent: () => Promise<{ items: Array<{ str?: string }> }>;
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
}

interface PdfJsDoc {
  numPages: number;
  getPage: (num: number) => Promise<PdfJsPage>;
}

interface PdfJsLibrary {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: { data: ArrayBuffer }) => { promise: Promise<PdfJsDoc> };
}

export interface BulkCandidateData {
  full_name: string;
  headline: string;
  category: string;
  availability: string;
  experience_years: number;
  expected_salary: number;
  rate_type: 'monthly' | 'hourly' | 'project';
  domicile_city: string;
  whatsapp_number: string;
  email: string;
  bio: string;
  skills: string[];
  portfolio_url: string;
  badge: string;
  photo_url: string;
  ai_notes: string;
  confidence_score: number;
  educations?: Array<{ school_name: string; degree: string; major?: string; start_year?: number; end_year?: number }>;
  experiences?: Array<{ company_name: string; position: string; period?: string; description?: string }>;
}

export interface BulkCvItem {
  id: string;
  file: File;
  fileName: string;
  fileSize: string;
  fileType: 'pdf' | 'image';
  status: 'pending' | 'reading' | 'extracting' | 'ready' | 'published' | 'error';
  progress: number;
  errorMsg?: string;
  data?: BulkCandidateData;
  rawPhotoBox?: [number, number, number, number] | null;
  rawFaceBox?: [number, number, number, number] | null;
  rawImageBase64?: string;
  publishedAt?: string;
}

const LOXER_STANDARD_CATEGORIES = [
  'Teknologi & IT',
  'Operasional & Logistik',
  'Keuangan & Akuntansi',
  'Servis Elektronik & Komputer',
  'Bengkel & Otomotif',
  'Kebersihan & Cleaning Service',
  'Desain, Percetakan & Sablon',
  'Pemasaran & Digital',
  'Umum & Jasa',
  'Pijat, Refleksi & Terapi Kesehatan',
  'Pertukangan & Renovasi Bangunan',
  'Salon, Barbershop & Perawatan',
  'Pengantaran, Logistik & Angkut Barang',
  'Les Privat & Kursus Mandiri',
  'Fotografi & Multimedia',
  'Teknologi & IT Mandiri',
];

async function resolveAdminToken(): Promise<string> {
  if (typeof window !== 'undefined') {
    const stored =
      localStorage.getItem('loxer_local_auth_token_admin') ||
      localStorage.getItem('loxer_local_auth_token') ||
      localStorage.getItem('loxer_auth_token');
    if (stored) return stored;
    return `local-admin-vrintex-token-${Date.now()}`;
  }
  return '';
}

export interface BulkSmartCvManagerProps {
  onToast: (type: ToastType, message: string) => void;
  onSaved: () => void;
  onSwitchToSingleMode?: () => void;
  initialFiles?: File[];
}

export function BulkSmartCvManager({
  onToast,
  onSaved,
  onSwitchToSingleMode,
  initialFiles,
}: BulkSmartCvManagerProps) {
  const [items, setItems] = useState<BulkCvItem[]>([]);
  const [isQueueRunning, setIsQueueRunning] = useState<boolean>(true);
  const [concurrency, setConcurrency] = useState<number>(2);
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready' | 'processing' | 'published' | 'error'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal Detail / Quick Edit
  const [editingItem, setEditingItem] = useState<BulkCvItem | null>(null);
  const [editFormData, setEditFormData] = useState<BulkCandidateData | null>(null);
  const [editActiveCropMode, setEditActiveCropMode] = useState<'smart_square' | 'tight_face' | 'full_frame'>('smart_square');
  const [isBulkPublishing, setIsBulkPublishing] = useState<boolean>(false);
  const [bulkPublishProgress, setBulkPublishProgress] = useState<{ current: number; total: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const customPhotoRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef<boolean>(false);

  // Load PDF.js helper
  const loadPdfJs = async (): Promise<PdfJsLibrary | null> => {
    if (typeof window === 'undefined') return null;
    const win = window as unknown as Window & { pdfjsLib?: PdfJsLibrary };
    if (win.pdfjsLib) return win.pdfjsLib;

    return new Promise<PdfJsLibrary>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        const pdfjs = (window as unknown as Window & { pdfjsLib?: PdfJsLibrary }).pdfjsLib;
        if (pdfjs) {
          pdfjs.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(pdfjs);
        } else {
          reject(new Error('PDF.js tidak terdefinisi'));
        }
      };
      script.onerror = () => reject(new Error('Gagal memuat modul PDF.js'));
      document.head.appendChild(script);
    });
  };

  // Convert files into BulkCvItem list
  const addFilesToQueue = useCallback((newFiles: FileList | File[]) => {
    const validItems: BulkCvItem[] = [];
    const filesArray = Array.from(newFiles);

    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i];
      const lower = file.name.toLowerCase();
      const isPdf = file.type === 'application/pdf' || lower.endsWith('.pdf');
      const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(lower);

      if (isPdf || isImage) {
        validItems.push({
          id: `bcv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${i}`,
          file,
          fileName: file.name,
          fileSize: `${Math.round(file.size / 1024)} KB`,
          fileType: isPdf ? 'pdf' : 'image',
          status: 'pending',
          progress: 0,
        });
      }
    }

    if (validItems.length === 0) {
      onToast('error', 'Tidak ada file PDF atau Gambar valid yang dipilih.');
      return;
    }

    setItems((prev) => [...prev, ...validItems]);
    setIsQueueRunning(true);
    onToast('success', `Berhasil menambahkan ${validItems.length} berkas CV ke antrean pemrosesan AI!`);
  }, [onToast]);

  // Initial files if passed from parent
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      addFilesToQueue(initialFiles);
    }
  }, [initialFiles, addFilesToQueue]);

  // Process a single CV item through the full AI Pipeline
  const processSingleItem = useCallback(async (item: BulkCvItem) => {
    // 1. Reading file
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, status: 'reading', progress: 20 } : it))
    );

    let imageBase64 = '';
    let cvText = '';

    try {
      if (item.fileType === 'image') {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Gagal membaca gambar'));
          reader.readAsDataURL(item.file);
        });
      } else {
        // PDF processing via PDF.js canvas render
        try {
          const pdfjs = await loadPdfJs();
          if (pdfjs) {
            const arrayBuffer = await item.file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            const pagesToRead = Math.min(pdf.numPages, 3);

            for (let p = 1; p <= pagesToRead; p++) {
              const page = await pdf.getPage(p);
              const textContent = await page.getTextContent();
              const textStr = textContent.items.map((i) => i.str || '').join(' ');
              cvText += `\n--- Halaman ${p} ---\n` + textStr;

              if (p === 1) {
                const viewport = page.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  await page.render({ canvasContext: ctx, viewport }).promise;
                  imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
                }
              }
            }
          }
        } catch (pdfErr) {
          console.warn('[BulkSmartCv] PDF client render warning, falling back to raw dataURL:', pdfErr);
          imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('Gagal membaca berkas PDF'));
            reader.readAsDataURL(item.file);
          });
        }
      }

      // 2. Calling AI Extraction
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: 'extracting', progress: 50, rawImageBase64: imageBase64 } : it
        )
      );

      const token = await resolveAdminToken();
      const resp = await fetch('/api/admin/smart-cv-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          imageBase64,
          cvText: cvText.trim(),
          fileName: item.fileName,
        }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.message || `HTTP ${resp.status} AI Gemini 3.8`);
      }

      const resData = await resp.json();
      const cv = resData.cv;
      if (!cv) throw new Error('Biodata CV tidak ditemukan dalam respon AI.');

      // 3. Cropping Pas Foto (Level MAX Presisi 1:1)
      let croppedPhoto = '';
      if (imageBase64 && cv.photo_box) {
        try {
          croppedPhoto = await cropPasFotoFromImage(
            imageBase64,
            cv.photo_box,
            cv.face_box,
            'smart_square'
          );
        } catch (cropErr) {
          console.warn('[BulkSmartCv] Crop photo error:', cropErr);
        }
      }

      // 4. Blurring Contact Area
      let blurredCv = '';
      if (imageBase64) {
        try {
          blurredCv = await generateBlurredCvImage(imageBase64, cv.contact_boxes);
        } catch (blurErr) {
          console.warn('[BulkSmartCv] Blur CV error:', blurErr);
          blurredCv = imageBase64;
        }
      }

      // 5. Structure Candidate Data
      const structuredData: BulkCandidateData = {
        full_name: cv.full_name || item.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
        headline: cv.headline || 'Pencari Kerja Aktif',
        category: cv.category || 'Umum & Jasa',
        availability: cv.availability || 'fulltime',
        experience_years: Number(cv.experience_years) || 0,
        expected_salary: 0, // KOSONGKAN TARIF SESUAI STANDAR LOXER (DITAMBAH ADMIN)
        rate_type: cv.rate_type || 'monthly',
        domicile_city: cleanDomicileCity(cv.domicile_city || 'Cimahi'),
        whatsapp_number: cv.whatsapp_number || '',
        email: cv.email || '',
        bio: cv.bio || '',
        skills: Array.isArray(cv.skills) && cv.skills.length > 0 ? cv.skills : ['Komunikasi', 'Kerja Tim'],
        portfolio_url: blurredCv || imageBase64,
        badge: cv.badge || 'SIAP KERJA',
        photo_url: croppedPhoto || '',
        ai_notes: cv.ai_notes || 'Ekstraksi otomatis oleh Bulk AI Gemini 3.8 LOXER',
        confidence_score: cv.confidence_score || 95,
        educations: cv.educations || [],
        experiences: cv.experiences || [],
      };

      // 6. Complete
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                status: 'ready',
                progress: 100,
                data: structuredData,
                rawPhotoBox: cv.photo_box || null,
                rawFaceBox: cv.face_box || null,
              }
            : it
        )
      );
    } catch (err: unknown) {
      console.error(`[BulkSmartCv Error] file ${item.fileName}:`, err);
      const msg = err instanceof Error ? err.message : 'Gagal memproses berkas';
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id ? { ...it, status: 'error', progress: 100, errorMsg: msg } : it
        )
      );
    }
  }, []);

  // Queue runner effect
  useEffect(() => {
    if (!isQueueRunning || isProcessingRef.current) return;

    const runWorker = async () => {
      isProcessingRef.current = true;

      // Find pending items
      const pendingItems = items.filter((it) => it.status === 'pending');
      const activeItems = items.filter((it) => it.status === 'reading' || it.status === 'extracting');

      if (pendingItems.length === 0 || activeItems.length >= concurrency) {
        isProcessingRef.current = false;
        return;
      }

      const availableSlots = concurrency - activeItems.length;
      const nextBatch = pendingItems.slice(0, availableSlots);

      await Promise.all(nextBatch.map((item) => processSingleItem(item)));
      isProcessingRef.current = false;
    };

    runWorker();
  }, [items, isQueueRunning, concurrency, processSingleItem]);

  // Retry a failed item
  const handleRetryItem = (id: string) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, status: 'pending', progress: 0, errorMsg: undefined } : it))
    );
    setIsQueueRunning(true);
  };

  // Retry all failed items
  const handleRetryAllErrors = () => {
    setItems((prev) =>
      prev.map((it) =>
        it.status === 'error' ? { ...it, status: 'pending', progress: 0, errorMsg: undefined } : it
      )
    );
    setIsQueueRunning(true);
    onToast('info', 'Mengulangi semua berkas yang gagal diekstrak.');
  };

  // Remove single item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  // Clear completed / published
  const handleClearCompleted = () => {
    setItems((prev) => prev.filter((it) => it.status !== 'published'));
    onToast('info', 'Antrean yang sudah diterbitkan dibersihkan.');
  };

  // Clear all items
  const handleClearAll = () => {
    if (items.length === 0) return;
    if (confirm('Kosongkan semua daftar antrean berkas CV?')) {
      setItems([]);
      onToast('info', 'Daftar antrean CV berhasil dikosongkan.');
    }
  };

  // Publish a single ready candidate
  const handlePublishSingle = async (item: BulkCvItem) => {
    if (!item.data) return;
    const token = await resolveAdminToken();

    try {
      const resp = await fetch('/api/admin/publish-smart-cv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(item.data),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.message || 'Gagal menerbitkan pelamar');
      }

      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, status: 'published', publishedAt: new Date().toLocaleTimeString() }
            : it
        )
      );
      onToast('success', `Pelamar "${item.data.full_name}" berhasil diterbitkan ke Bursa Talent!`);
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      onToast('error', `Gagal menerbitkan "${item.data.full_name}": ${msg}`);
    }
  };

  // Bulk Publish ALL Ready candidates
  const handleBulkPublishAll = async () => {
    const readyItems = items.filter((it) => it.status === 'ready' && it.data);
    if (readyItems.length === 0) {
      onToast('error', 'Tidak ada biodata berstatus "Siap Diterbitkan" saat ini.');
      return;
    }

    if (
      !confirm(
        `Terbitkan ${readyItems.length} biodata pelamar yang sudah siap langsung ke Bursa Talent LOXER?`
      )
    ) {
      return;
    }

    setIsBulkPublishing(true);
    setBulkPublishProgress({ current: 0, total: readyItems.length });

    const token = await resolveAdminToken();
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < readyItems.length; i++) {
      const item = readyItems[i];
      setBulkPublishProgress({ current: i + 1, total: readyItems.length });

      try {
        const resp = await fetch('/api/admin/publish-smart-cv', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(item.data),
        });

        if (resp.ok) {
          successCount++;
          setItems((prev) =>
            prev.map((it) =>
              it.id === item.id
                ? { ...it, status: 'published', publishedAt: new Date().toLocaleTimeString() }
                : it
            )
          );
        } else {
          failCount++;
        }
      } catch (err) {
        console.error('Bulk publish item error:', err);
        failCount++;
      }
    }

    setIsBulkPublishing(false);
    setBulkPublishProgress(null);
    onToast(
      'success',
      `Selesai menerbitkan massal! ${successCount} pelamar berhasil masuk Bursa Talent${
        failCount > 0 ? `, ${failCount} gagal` : ''
      }.`
    );
    onSaved();
  };

  // Open Quick Edit Modal
  const handleOpenEditModal = (item: BulkCvItem) => {
    if (!item.data) return;
    setEditingItem(item);
    setEditFormData({ ...item.data });
    setEditActiveCropMode('smart_square');
  };

  // Re-crop inside modal
  const handleModalReCrop = async (mode: 'smart_square' | 'tight_face' | 'full_frame') => {
    if (!editingItem || !editingItem.rawImageBase64 || !editingItem.rawPhotoBox) {
      onToast('error', 'Tidak ada koordinat foto asli untuk di-crop ulang.');
      return;
    }
    setEditActiveCropMode(mode);
    try {
      const cropped = await cropPasFotoFromImage(
        editingItem.rawImageBase64,
        editingItem.rawPhotoBox,
        editingItem.rawFaceBox,
        mode
      );
      if (cropped && editFormData) {
        setEditFormData({ ...editFormData, photo_url: cropped });
        onToast('success', `Crop disesuaikan: ${mode}`);
      }
    } catch (cropErr) {
      console.warn('Modal re-crop error:', cropErr);
      onToast('error', 'Gagal memotong ulang foto.');
    }
  };

  // Custom photo upload in modal
  const handleModalCustomPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editFormData) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditFormData({ ...editFormData, photo_url: reader.result as string });
      onToast('success', 'Foto profil berhasil diganti!');
    };
    reader.readAsDataURL(file);
  };

  // Save Modal Edits back to item
  const handleSaveModalEdits = () => {
    if (!editingItem || !editFormData) return;
    setItems((prev) =>
      prev.map((it) => (it.id === editingItem.id ? { ...it, data: editFormData } : it))
    );
    setEditingItem(null);
    setEditFormData(null);
    onToast('success', 'Perubahan biodata berhasil disimpan dalam antrean!');
  };

  // Export results as JSON
  const handleExportJson = () => {
    const readyItems = items.filter((it) => it.data).map((it) => it.data);
    if (readyItems.length === 0) {
      onToast('error', 'Belum ada data terekstraksi yang dapat diekspor.');
      return;
    }
    const blob = new Blob([JSON.stringify(readyItems, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loxer-bulk-cv-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onToast('success', `Ekspor ${readyItems.length} biodata CV berhasil diunduh.`);
  };

  // Stats calculation
  const totalCount = items.length;
  const pendingCount = items.filter((it) => it.status === 'pending').length;
  const processingCount = items.filter((it) => it.status === 'reading' || it.status === 'extracting').length;
  const readyCount = items.filter((it) => it.status === 'ready').length;
  const publishedCount = items.filter((it) => it.status === 'published').length;
  const errorCount = items.filter((it) => it.status === 'error').length;
  const overallPercent = totalCount > 0 ? Math.round(((readyCount + publishedCount) / totalCount) * 100) : 0;

  // Filtered items
  const filteredItems = items.filter((it) => {
    if (activeFilter === 'ready') return it.status === 'ready';
    if (activeFilter === 'processing') return it.status === 'reading' || it.status === 'extracting';
    if (activeFilter === 'published') return it.status === 'published';
    if (activeFilter === 'error') return it.status === 'error';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner: Bulk AI Multimodal Extractor */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/30 p-6 shadow-xl backdrop-blur-md">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <Layers className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Bulk Add CV Engine • Mass Multimodal OCR</span>
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-amber-200">
                Puluhan - Ratusan Berkas PDF
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Upload Berkas CV Massal &amp; Siapkan Biodata Otomatis</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Tarik dan lepaskan puluhan hingga ratusan berkas CV (PDF / JPG). Antrean AI memproses dokumen secara paralel, memotong pas foto 1:1, menyensor kontak, dan menyiapkan draf biodata bursa talent siap terbit dalam sekali klik.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            {onSwitchToSingleMode && (
              <button
                type="button"
                onClick={onSwitchToSingleMode}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 transition shadow-sm"
                title="Beralih ke mode ekstraksi satuan untuk 1 berkas CV atau paste clipboard"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mode Satuan (Single)</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportJson}
              disabled={readyCount + publishedCount === 0}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition shadow-sm disabled:opacity-40"
              title="Unduh seluruh data biodata hasil ekstraksi ke file JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Multi-File Upload & Ingestion Dropzone */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 backdrop-blur-md shadow-lg space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
          onChange={(e) => e.target.files && addFilesToQueue(e.target.files)}
          className="hidden"
        />
        <input
          ref={folderInputRef}
          type="file"
          {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
          multiple
          onChange={(e) => e.target.files && addFilesToQueue(e.target.files)}
          className="hidden"
        />

        <div
          tabIndex={0}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              addFilesToQueue(e.dataTransfer.files);
            }
          }}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer border-2 border-dashed border-amber-500/30 hover:border-amber-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-500/20 rounded-2xl p-8 sm:p-10 text-center transition-all duration-300 group bg-slate-950/50 hover:bg-slate-950/80 focus:outline-none"
        >
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center text-amber-300 group-hover:scale-110 group-hover:border-amber-400 group-hover:shadow-lg group-hover:shadow-amber-500/20 transition-all duration-300">
            <Layers className="w-7 h-7" />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-base sm:text-lg font-bold text-white">
            <span>📚 Tarik &amp; Lepaskan Puluhan Berkas CV PDF di Sini</span>
          </div>

          <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Pilih banyak file sekaligus (Ctrl + A / Shift + Klik) atau pilih folder arsip CV pelamar Anda. Format didukung: PDF, JPG, PNG, WEBP.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <FileUp className="w-4 h-4" />
              <span>Pilih Berkas Sekaligus (Multi-Select)</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                folderInputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 shadow-sm transition"
            >
              <FolderUp className="w-4 h-4 text-amber-400" />
              <span>Unggah 1 Folder Penuh</span>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" /> Antrean Paralel Otomatis
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" /> Potong Pas Foto 1:1 Presisi
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" /> Sensor Privasi Kontak CV
            </span>
          </div>
        </div>
      </div>

      {/* Progress & Live Control Bar */}
      {totalCount > 0 && (
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-lg space-y-4">
          {/* Top row: Summary & Batch Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Status Antrean Pemrosesan ({totalCount} Berkas)</span>
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {overallPercent}% Selesai
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {readyCount} siap diterbitkan • {publishedCount} sudah terbit • {processingCount} sedang diekstrak • {errorCount} gagal
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Concurrency Selector */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-950 text-xs">
                <span className="text-slate-400 text-[11px] font-semibold">Kecepatan:</span>
                <button
                  type="button"
                  onClick={() => setConcurrency(1)}
                  className={`px-2 py-0.5 rounded font-bold transition ${concurrency === 1 ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  title="1 Worker (Stabil / Ringan)"
                >
                  1x
                </button>
                <button
                  type="button"
                  onClick={() => setConcurrency(2)}
                  className={`px-2 py-0.5 rounded font-bold transition ${concurrency === 2 ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  title="2 Worker (Standar Rekomendasi)"
                >
                  2x
                </button>
                <button
                  type="button"
                  onClick={() => setConcurrency(3)}
                  className={`px-2 py-0.5 rounded font-bold transition ${concurrency === 3 ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
                  title="3 Worker (Cepat)"
                >
                  3x
                </button>
              </div>

              {/* Pause / Resume Button */}
              <button
                type="button"
                onClick={() => setIsQueueRunning(!isQueueRunning)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  isQueueRunning
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                    : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                }`}
              >
                {isQueueRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isQueueRunning ? 'Jeda Antrean' : 'Lanjutkan Antrean'}</span>
              </button>

              {/* Retry Errors */}
              {errorCount > 0 && (
                <button
                  type="button"
                  onClick={handleRetryAllErrors}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition"
                  title="Ulangi ekstraksi untuk berkas yang gagal"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Ulangi Gagal ({errorCount})</span>
                </button>
              )}

              {/* Clear Completed */}
              {publishedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearCompleted}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
                  title="Bersihkan yang sudah diterbitkan dari antrean"
                >
                  <span>Bersihkan Terbit</span>
                </button>
              )}

              {/* Clear All */}
              <button
                type="button"
                onClick={handleClearAll}
                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Kosongkan semua antrean"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              {/* BIG ACTION: Terbitkan Semua yang Siap */}
              <button
                type="button"
                onClick={handleBulkPublishAll}
                disabled={readyCount === 0 || isBulkPublishing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isBulkPublishing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menerbitkan ({bulkPublishProgress?.current || 0}/{bulkPublishProgress?.total || 0})...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Terbitkan Semua yang Siap ({readyCount} Pelamar)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-amber-500 via-cyan-500 to-emerald-500 h-full transition-all duration-500"
              style={{ width: `${overallPercent}%` }}
            />
          </div>

          {/* Stats Badges & Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeFilter === 'all'
                    ? 'bg-white text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                Semua ({totalCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('ready')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeFilter === 'ready'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-emerald-400 hover:text-white bg-emerald-500/10'
                }`}
              >
                Siap Diterbitkan ({readyCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('processing')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeFilter === 'processing'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-amber-400 hover:text-white bg-amber-500/10'
                }`}
              >
                Diproses ({processingCount + pendingCount})
              </button>
              {publishedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('published')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    activeFilter === 'published'
                      ? 'bg-cyan-500 text-slate-950 shadow'
                      : 'text-cyan-400 hover:text-white bg-cyan-500/10'
                  }`}
                >
                  Sudah Terbit ({publishedCount})
                </button>
              )}
              {errorCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('error')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    activeFilter === 'error'
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-rose-400 hover:text-white bg-rose-500/10'
                  }`}
                >
                  Gagal ({errorCount})
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 rounded-lg bg-slate-950 p-1 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded font-semibold transition ${viewMode === 'grid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Kartu
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded font-semibold transition ${viewMode === 'table' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >
                Tabel Ringkas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate List / Grid */}
      {totalCount > 0 && (
        <div className="space-y-4">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const data = item.data;
                const isReady = item.status === 'ready';
                const isPublished = item.status === 'published';
                const isError = item.status === 'error';
                const isWorking = item.status === 'reading' || item.status === 'extracting';

                return (
                  <div
                    key={item.id}
                    className={`relative rounded-2xl border p-4 transition-all duration-300 flex flex-col justify-between ${
                      isPublished
                        ? 'border-cyan-500/40 bg-slate-900/60 shadow-lg'
                        : isReady
                        ? 'border-emerald-500/40 bg-slate-900/90 shadow-xl hover:border-emerald-400'
                        : isError
                        ? 'border-rose-500/30 bg-rose-950/20'
                        : 'border-white/10 bg-slate-950/50'
                    }`}
                  >
                    <div>
                      {/* Card Header: Avatar & Status Badge */}
                      <div className="flex items-start gap-3">
                        <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-white/15 bg-slate-950 flex items-center justify-center shadow-inner">
                          {data?.photo_url ? (
                            <img
                              src={data.photo_url}
                              alt={data.full_name}
                              className="h-full w-full object-cover object-center"
                            />
                          ) : isWorking ? (
                            <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
                          ) : (
                            <span className="text-lg font-black text-amber-300">
                              {(data?.full_name || item.fileName).charAt(0).toUpperCase()}
                            </span>
                          )}

                          {/* Mini file type badge */}
                          <span className="absolute bottom-0.5 right-0.5 rounded bg-slate-950/90 px-1 text-[8px] font-bold text-slate-300 uppercase">
                            {item.fileType}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4
                              className="text-xs font-bold text-white truncate hover:text-amber-300 transition cursor-pointer"
                              title={data?.full_name || item.fileName}
                              onClick={() => isReady && handleOpenEditModal(item)}
                            >
                              {data?.full_name || item.fileName}
                            </h4>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-slate-500 hover:text-rose-400 p-0.5"
                              title="Hapus dari antrean"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {data?.headline || item.fileSize}
                          </p>

                          {/* Status Pill */}
                          <div className="mt-1.5 flex items-center gap-1.5">
                            {isReady && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Siap Diterbitkan
                              </span>
                            )}
                            {isPublished && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                <Check className="w-2.5 h-2.5" /> Sudah Masuk Bursa
                              </span>
                            )}
                            {isWorking && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                {item.status === 'reading' ? 'Membaca Halaman...' : 'Ekstraksi AI...'}
                              </span>
                            )}
                            {item.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-slate-800 text-slate-400">
                                <Clock className="w-2.5 h-2.5" /> Menunggu Antrean
                              </span>
                            )}
                            {isError && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                <AlertTriangle className="w-2.5 h-2.5" /> Gagal
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Working Progress */}
                      {isWorking && (
                        <div className="mt-3 space-y-1">
                          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-amber-400 h-full transition-all duration-300"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Error details */}
                      {isError && (
                        <div className="mt-3 p-2 rounded-xl bg-rose-950/40 border border-rose-500/20 text-[10px] text-rose-300 flex items-center justify-between gap-2">
                          <span className="truncate">{item.errorMsg || 'Gagal mengekstrak biodata'}</span>
                          <button
                            type="button"
                            onClick={() => handleRetryItem(item.id)}
                            className="px-2 py-0.5 bg-rose-500/30 hover:bg-rose-500/50 rounded font-bold shrink-0 text-white"
                          >
                            Ulangi
                          </button>
                        </div>
                      )}

                      {/* Ready Candidate Details Preview */}
                      {data && (
                        <div className="mt-3 space-y-2 pt-2 border-t border-white/5">
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold border border-white/5">
                              {data.category}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-semibold border border-white/5 flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" /> {data.domicile_city}
                            </span>
                            {data.experience_years > 0 && (
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                                {data.experience_years} thn exp
                              </span>
                            )}
                          </div>

                          {/* Skills Pills */}
                          {data.skills && data.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {data.skills.slice(0, 3).map((sk, idx) => (
                                <span
                                  key={idx}
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                                >
                                  {sk}
                                </span>
                              ))}
                              {data.skills.length > 3 && (
                                <span className="text-[9px] px-1 py-0.2 text-slate-500">
                                  +{data.skills.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Contact & Privacy Status */}
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1">
                            <span className="flex items-center gap-1 text-emerald-400">
                              <Lock className="w-2.5 h-2.5" />
                              <span>{data.whatsapp_number ? maskPhoneNumber(data.whatsapp_number) : 'Tanpa No. HP'}</span>
                            </span>
                            <span className="text-slate-500 text-[9px]">Gaji: Nego</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Actions Footer */}
                    {isReady && (
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 transition"
                        >
                          <Eye className="w-3 h-3 text-cyan-400" />
                          <span>Tinjau &amp; Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePublishSingle(item)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow transition"
                        >
                          <Send className="w-3 h-3" />
                          <span>Terbitkan</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table Mode */
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/90 shadow-lg">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/10">
                  <tr>
                    <th className="px-4 py-3">Kandidat</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Domisili</th>
                    <th className="px-4 py-3">Kontak (Disensor)</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {filteredItems.map((item) => {
                    const data = item.data;
                    const isReady = item.status === 'ready';
                    const isPublished = item.status === 'published';
                    const isError = item.status === 'error';

                    return (
                      <tr key={item.id} className="hover:bg-white/5 transition">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 shrink-0 rounded-lg overflow-hidden border border-white/10 bg-slate-950 flex items-center justify-center">
                              {data?.photo_url ? (
                                <img src={data.photo_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <span className="font-bold text-amber-300">
                                  {(data?.full_name || item.fileName).charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-white">{data?.full_name || item.fileName}</p>
                              <p className="text-[10px] text-slate-400">{data?.headline || item.fileSize}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{data?.category || '-'}</td>
                        <td className="px-4 py-3">{data?.domicile_city || '-'}</td>
                        <td className="px-4 py-3 font-mono text-[11px]">
                          {data?.whatsapp_number ? maskPhoneNumber(data.whatsapp_number) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {isReady && (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                              Siap Terbit
                            </span>
                          )}
                          {isPublished && (
                            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30">
                              Sudah Terbit
                            </span>
                          )}
                          {isError && (
                            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
                              Gagal
                            </span>
                          )}
                          {(item.status === 'reading' || item.status === 'extracting') && (
                            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3 animate-spin" /> Sedang Proses...
                            </span>
                          )}
                          {item.status === 'pending' && (
                            <span className="text-[10px] text-slate-500">Antrean</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isReady && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(item)}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-xs font-semibold"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePublishSingle(item)}
                                  className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded text-xs"
                                >
                                  Terbitkan
                                </button>
                              </>
                            )}
                            {isError && (
                              <button
                                type="button"
                                onClick={() => handleRetryItem(item.id)}
                                className="px-2 py-1 bg-rose-500/30 hover:bg-rose-500/50 text-white rounded text-xs"
                              >
                                Ulangi
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(item.id)}
                              className="p-1 text-slate-500 hover:text-rose-400"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* QUICK EDIT / DETAIL MODAL */}
      {editingItem && editFormData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Tinjau &amp; Sesuaikan Biodata Kandidat
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Photo Crop and Adjuster */}
            <div className="rounded-xl border border-white/10 bg-slate-950/70 p-3.5 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                Pas Foto Kandidat
              </span>
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 shrink-0 rounded-xl overflow-hidden border border-white/20 bg-slate-900 shadow-inner flex items-center justify-center">
                  {editFormData.photo_url ? (
                    <img src={editFormData.photo_url} alt="" className="h-full w-full object-cover object-center" />
                  ) : (
                    <span className="text-2xl font-black text-cyan-400">
                      {editFormData.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleModalReCrop('smart_square')}
                      className={`px-2 py-1 text-[10px] font-bold rounded transition ${
                        editActiveCropMode === 'smart_square'
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      🎯 1:1 Wajah
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModalReCrop('tight_face')}
                      className={`px-2 py-1 text-[10px] font-bold rounded transition ${
                        editActiveCropMode === 'tight_face'
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      🔍 Zoom
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModalReCrop('full_frame')}
                      className={`px-2 py-1 text-[10px] font-bold rounded transition ${
                        editActiveCropMode === 'full_frame'
                          ? 'bg-cyan-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      🖼️ Penuh
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => customPhotoRef.current?.click()}
                      className="text-xs text-cyan-400 hover:text-cyan-300 underline font-semibold"
                    >
                      + Ganti / Upload Foto
                    </button>
                    <input
                      ref={customPhotoRef}
                      type="file"
                      accept="image/*"
                      onChange={handleModalCustomPhoto}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Editable Form Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Nama Lengkap
                </label>
                <input
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Headline Posisi / Keahlian
                </label>
                <input
                  value={editFormData.headline}
                  onChange={(e) => setEditFormData({ ...editFormData, headline: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Kategori Bursa Talent
                </label>
                <select
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white"
                >
                  {LOXER_STANDARD_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Kota Domisili (Hanya Nama Kota)
                </label>
                <input
                  value={editFormData.domicile_city}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, domicile_city: cleanDomicileCity(e.target.value) })
                  }
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  WhatsApp / HP (Disensor Otomatis)
                </label>
                <input
                  value={editFormData.whatsapp_number}
                  onChange={(e) => setEditFormData({ ...editFormData, whatsapp_number: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                  Email Pelamar
                </label>
                <input
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                Ringkasan Profil (Bio)
              </label>
              <textarea
                rows={3}
                value={editFormData.bio}
                onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-xs text-white leading-relaxed"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveModalEdits}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
