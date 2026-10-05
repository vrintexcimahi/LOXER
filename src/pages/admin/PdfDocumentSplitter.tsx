import React, { useState, useCallback, useRef } from 'react';
import {
  Scissors,
  FolderOpen,
  Shield,
  Eye,
  EyeOff,
  Download,
  Loader2,
  Archive,
  FileText,
  X,
  Lock,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
} from 'lucide-react';
import {
  splitAndClassifyPdf,
  SplitDocumentPage,
  DOCUMENT_CLASS_META,
  DocumentClass,
  censorFullPage,
} from '../../lib/pdfDocumentSplitter';
import { ToastType } from './AdminTalentComponents';

export type { SplitDocumentPage };
export { DOCUMENT_CLASS_META };

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PdfDocumentSplitterProps {
  /** Files to pre-load (optional) — PDF files from parent smart-upload */
  initialFiles?: File[];
  /** Candidate name to tag all pages with */
  candidateName?: string;
  /** Initial active tab */
  defaultTab?: 'split' | 'gallery';
  onToast: (type: ToastType, message: string) => void;
  /** Called when gallery has been updated / pages archived */
  onArchived?: (pages: SplitDocumentPage[]) => void;
}

// ─── Persistent Gallery Store (IndexedDB + In-Memory) ─────────────────────────
const DB_NAME = 'loxer_documents_db';
const DB_STORE = 'applicant_docs';

let _globalGallery: SplitDocumentPage[] = [];

function openDocDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function loadGalleryFromDb(): Promise<SplitDocumentPage[]> {
  const db = await openDocDb();
  if (!db) return _globalGallery;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, 'readonly');
      const store = tx.objectStore(DB_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const items = req.result as SplitDocumentPage[];
        if (items && items.length > 0) {
          _globalGallery = items;
          resolve(items);
        } else {
          resolve(_globalGallery);
        }
      };
      req.onerror = () => resolve(_globalGallery);
    } catch {
      resolve(_globalGallery);
    }
  });
}

export async function saveGalleryToDb(pages: SplitDocumentPage[]): Promise<void> {
  const db = await openDocDb();
  if (!db) return;
  try {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    for (const p of pages) {
      store.put(p);
    }
  } catch (e) {
    console.warn('[DocDb] save error:', e);
  }
}

export async function clearGalleryFromDb(): Promise<void> {
  const db = await openDocDb();
  if (!db) return;
  try {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    store.clear();
  } catch (e) {
    console.warn('[DocDb] clear error:', e);
  }
}

export function getDocumentGallery(): SplitDocumentPage[] {
  return _globalGallery;
}

export function appendToGallery(pages: SplitDocumentPage[]): void {
  _globalGallery = [..._globalGallery, ...pages];
  saveGalleryToDb(pages);
}

export function clearGallery(): void {
  _globalGallery = [];
  clearGalleryFromDb();
}

// ─── Helper: download a base64 image as file ────────────────────────────────

function downloadBase64(dataUrl: string, filename: string): void {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PdfDocumentSplitter({
  initialFiles,
  candidateName,
  defaultTab,
  onToast,
  onArchived,
}: PdfDocumentSplitterProps) {
  const [pages, setPages] = useState<SplitDocumentPage[]>([]);
  const [gallery, setGallery] = useState<SplitDocumentPage[]>(_globalGallery);
  const [isSplitting, setIsSplitting] = useState(false);
  const [splitProgress, setSplitProgress] = useState<{ current: number; total: number } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>(initialFiles || []);
  const [activeTab, setActiveTab] = useState<'split' | 'gallery'>(defaultTab || 'split');
  const [viewingPage, setViewingPage] = useState<SplitDocumentPage | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [galleryFilter, setGalleryFilter] = useState<DocumentClass | 'all'>('all');
  const [galleryPage, setGalleryPage] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const GALLERY_PAGE_SIZE = 12;

  // Load persisted gallery from IndexedDB
  React.useEffect(() => {
    loadGalleryFromDb().then((items) => {
      if (items && items.length > 0) {
        setGallery([...items]);
      }
    });
  }, []);

  // Sync initialFiles if prop changes
  React.useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      setSelectedFiles(initialFiles);
    }
  }, [initialFiles]);

  // ── File Selection ────────────────────────────────────────────────────────
  const handleFilesSelected = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      );
      if (arr.length === 0) {
        onToast('error', 'Tidak ada file PDF valid yang dipilih. Pastikan file berformat PDF.');
        return;
      }
      setSelectedFiles(arr);
      setPages([]);
      onToast('info', `${arr.length} berkas PDF siap dipecah. Klik "Pecah Dokumen" untuk mulai.`);
    },
    [onToast]
  );

  // ── Main Split Action ─────────────────────────────────────────────────────
  const handleSplit = useCallback(async () => {
    if (selectedFiles.length === 0) {
      onToast('error', 'Pilih berkas PDF terlebih dahulu.');
      return;
    }

    setIsSplitting(true);
    setPages([]);
    setSplitProgress(null);
    const allPages: SplitDocumentPage[] = [];

    for (const file of selectedFiles) {
      try {
        onToast('info', `Memproses: ${file.name}…`);
        const result = await splitAndClassifyPdf(file, {
          renderScale: 1.5,
          candidateName: candidateName || file.name.replace(/\.[^/.]+$/, ''),
          onProgress: (current, total) => {
            setSplitProgress({ current, total });
          },
        });
        allPages.push(...result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Gagal';
        onToast('error', `Gagal memecah ${file.name}: ${msg}`);
      }
    }

    setPages(allPages);
    setSplitProgress(null);
    setIsSplitting(false);

    if (allPages.length > 0) {
      const sensitiveCount = allPages.filter((p) => p.isSensitive).length;
      onToast(
        'success',
        `✅ Berhasil memecah ${allPages.length} halaman dari ${selectedFiles.length} berkas PDF. ${sensitiveCount > 0 ? `${sensitiveCount} halaman sensitif otomatis disensor.` : ''}`
      );
    }
  }, [selectedFiles, candidateName, onToast]);

  // ── Archive to Gallery ────────────────────────────────────────────────────
  const handleArchiveAll = useCallback(() => {
    if (pages.length === 0) {
      onToast('error', 'Tidak ada halaman yang diproses untuk diarsipkan.');
      return;
    }

    appendToGallery(pages);
    const updated = getDocumentGallery();
    _globalGallery = updated;
    setGallery([...updated]);
    setActiveTab('gallery');
    onArchived?.(pages);
    onToast('success', `🗄️ ${pages.length} halaman berhasil diarsipkan ke Galeri Berkas Pelamar!`);
  }, [pages, onToast, onArchived]);

  // ── Re-classify a page manually ──────────────────────────────────────────
  const handleReclassify = useCallback(
    async (pageId: string, newClass: DocumentClass) => {
      const meta = DOCUMENT_CLASS_META[newClass];
      setPages((prev) =>
        prev.map((p) => {
          if (p.id !== pageId) return p;
          return {
            ...p,
            docClass: newClass,
            label: meta.label,
            isSensitive: meta.isSensitive,
            censorLevel: meta.censorLevel,
          };
        })
      );

      // Re-censor in background
      const page = pages.find((p) => p.id === pageId);
      if (page) {
        try {
          const newCensored = await censorFullPage(page.rawImageBase64, newClass);
          setPages((prev) =>
            prev.map((p) => (p.id === pageId ? { ...p, censoredImageBase64: newCensored } : p))
          );
          onToast('success', `Halaman ${page.pageNumber} reklasifikasi → ${meta.label} ✓`);
        } catch {
          onToast('error', 'Gagal memperbarui sensor setelah reklasifikasi.');
        }
      }
    },
    [pages, onToast]
  );

  // ── Gallery clear ─────────────────────────────────────────────────────────
  const handleClearGallery = () => {
    if (!confirm('Kosongkan seluruh galeri berkas pelamar? Tindakan ini tidak dapat dibatalkan.')) return;
    clearGallery();
    _globalGallery = [];
    setGallery([]);
    onToast('info', 'Galeri berkas pelamar dikosongkan.');
  };

  // ── Filtered gallery ─────────────────────────────────────────────────────
  const filteredGallery = galleryFilter === 'all'
    ? gallery
    : gallery.filter((p) => p.docClass === galleryFilter);

  const galleryTotalPages = Math.ceil(filteredGallery.length / GALLERY_PAGE_SIZE);
  const gallerySlice = filteredGallery.slice(
    galleryPage * GALLERY_PAGE_SIZE,
    (galleryPage + 1) * GALLERY_PAGE_SIZE
  );

  // ── Class filter options from gallery ────────────────────────────────────
  const galleryClasses = Array.from(new Set(gallery.map((p) => p.docClass)));

  // ── Stats ────────────────────────────────────────────────────────────────
  const sensitiveCount = pages.filter((p) => p.isSensitive).length;
  const classBreakdown = pages.reduce<Record<string, number>>((acc, p) => {
    acc[p.label] = (acc[p.label] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header Banner ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-violet-950/40 p-5 shadow-xl">
        <div className="absolute right-0 top-0 -mr-12 -mt-12 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/4 bottom-0 -mb-12 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
              <Scissors className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
              <span>Smart PDF Splitter • Auto-Klasifikasi & Sensor AI</span>
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📂 Pecah Dokumen & Galeri Berkas Pelamar</span>
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Upload PDF multi-halaman → setiap halaman dipecah otomatis → diklasifikasikan (KTP, Ijazah, SKCK, CV, dll.) →
              dokumen sensitif disensor penuh secara otomatis → diarsipkan ke galeri berkas pelamar.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              id="pdf-splitter-tab-split"
              onClick={() => setActiveTab('split')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'split'
                  ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25'
                  : 'text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              Pecah PDF
            </button>
            <button
              id="pdf-splitter-tab-gallery"
              onClick={() => setActiveTab('gallery')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all relative ${
                activeTab === 'gallery'
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/60'
              }`}
            >
              <Archive className="w-3.5 h-3.5" />
              Galeri Berkas
              {gallery.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4.5 h-4.5 flex items-center justify-center rounded-full bg-emerald-400 text-slate-950 text-[9px] font-black">
                  {gallery.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── TAB: SPLIT ──────────────────────────────────────────────────────── */}
      {activeTab === 'split' && (
        <div className="space-y-5">
          {/* File Upload Zone */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/90 p-5 shadow-lg space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,.pdf"
              onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
              className="hidden"
            />

            <div
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.length) handleFilesSelected(e.dataTransfer.files);
              }}
              className="cursor-pointer border-2 border-dashed border-violet-500/30 hover:border-violet-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-500/20 rounded-2xl p-8 text-center transition-all duration-300 group bg-slate-950/50 hover:bg-slate-950/80 focus:outline-none"
            >
              <div className="mx-auto w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-400/30 flex items-center justify-center text-violet-300 group-hover:scale-110 group-hover:border-violet-400 group-hover:shadow-lg group-hover:shadow-violet-500/20 transition-all duration-300">
                <Scissors className="w-7 h-7" />
              </div>
              <div className="mt-4 text-base font-bold text-white">
                📄 Tarik & Lepaskan Berkas PDF Multi-Halaman di Sini
              </div>
              <p className="mt-1.5 text-xs text-slate-400 max-w-lg mx-auto">
                Setiap halaman akan dipecah, diklasifikasikan, dan disensor otomatis. Format: PDF saja.
              </p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-violet-500 hover:bg-violet-400 text-white shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <FolderOpen className="w-4 h-4" />
                Pilih Berkas PDF
              </button>
            </div>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-400">
                  {selectedFiles.length} berkas PDF dipilih:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-400/20 text-xs text-violet-300"
                    >
                      <FileText className="w-3 h-3" />
                      <span className="max-w-[140px] truncate">{f.name}</span>
                      <span className="text-slate-500">({Math.round(f.size / 1024)} KB)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action button */}
            <div className="flex items-center gap-3">
              <button
                id="pdf-splitter-run-btn"
                type="button"
                onClick={handleSplit}
                disabled={isSplitting || selectedFiles.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg hover:from-violet-400 hover:to-purple-500 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSplitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      Memecah…{' '}
                      {splitProgress
                        ? `(Hal. ${splitProgress.current}/${splitProgress.total})`
                        : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-4 h-4" />
                    <span>Pecah Dokumen Sekarang</span>
                  </>
                )}
              </button>

              {pages.length > 0 && (
                <button
                  id="pdf-splitter-archive-btn"
                  type="button"
                  onClick={handleArchiveAll}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all"
                >
                  <Archive className="w-4 h-4" />
                  Arsipkan ke Galeri ({pages.length})
                </button>
              )}
            </div>

            {/* Progress bar */}
            {isSplitting && splitProgress && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Memproses halaman {splitProgress.current} dari {splitProgress.total}…</span>
                  <span>{Math.round((splitProgress.current / splitProgress.total) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-300"
                    style={{ width: `${(splitProgress.current / splitProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Split Results Summary */}
          {pages.length > 0 && !isSplitting && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 space-y-4">
              {/* Stats row */}
              <div className="flex flex-wrap gap-3">
                <div className="flex-1 min-w-[120px] rounded-xl bg-slate-800/80 border border-white/5 p-3 text-center">
                  <div className="text-2xl font-black text-white">{pages.length}</div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Total Halaman</div>
                </div>
                <div className="flex-1 min-w-[120px] rounded-xl bg-red-950/30 border border-red-500/20 p-3 text-center">
                  <div className="text-2xl font-black text-red-400">{sensitiveCount}</div>
                  <div className="text-[10px] text-red-300/70 font-semibold uppercase mt-0.5">Sensitif (Disensor)</div>
                </div>
                <div className="flex-1 min-w-[120px] rounded-xl bg-emerald-950/30 border border-emerald-500/20 p-3 text-center">
                  <div className="text-2xl font-black text-emerald-400">{pages.length - sensitiveCount}</div>
                  <div className="text-[10px] text-emerald-300/70 font-semibold uppercase mt-0.5">Aman Ditampilkan</div>
                </div>
              </div>

              {/* Class breakdown badges */}
              <div className="flex flex-wrap gap-2">
                {Object.entries(classBreakdown).map(([label, count]) => {
                  const entry = Object.entries(DOCUMENT_CLASS_META).find(([, m]) => m.label === label);
                  const meta = entry ? entry[1] : null;
                  return (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                      style={{
                        color: meta?.color || '#94a3b8',
                        borderColor: `${meta?.color || '#94a3b8'}33`,
                        background: meta?.bgColor || 'rgba(100,116,139,0.1)',
                      }}
                    >
                      <span>{meta?.icon || '📁'}</span>
                      {label}
                      <span className="px-1 py-0 rounded-full bg-white/10 text-[10px] font-black">{count}</span>
                      {meta?.isSensitive && <Lock className="w-3 h-3" />}
                    </span>
                  );
                })}
              </div>

              {/* Security notice */}
              {sensitiveCount > 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                  <Shield className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300 leading-relaxed">
                    <strong>{sensitiveCount} halaman sensitif</strong> (KTP, Ijazah, SKCK, dll.) telah otomatis disensor penuh dengan enkripsi visual.
                    Data asli <strong>tidak tersimpan di server</strong> — hanya versi tersensor yang diarsipkan.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Paginated result cards */}
          {pages.length > 0 && !isSplitting && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {pages.map((page) => {
                const meta = DOCUMENT_CLASS_META[page.docClass];
                return (
                  <div
                    key={page.id}
                    className="group relative rounded-xl border overflow-hidden bg-slate-900 transition-all hover:scale-[1.03] hover:shadow-xl cursor-pointer"
                    style={{ borderColor: `${meta.color}33` }}
                    onClick={() => { setViewingPage(page); setShowRaw(false); }}
                  >
                    {/* Page thumbnail */}
                    <div className="relative aspect-[3/4] overflow-hidden bg-slate-800">
                      <img
                        src={page.isSensitive ? page.censoredImageBase64 : page.censoredImageBase64 || page.rawImageBase64}
                        alt={`Halaman ${page.pageNumber}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Sensitive overlay badge */}
                      {page.isSensitive && (
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-950/90 border border-red-500/50 text-[9px] font-black text-red-300">
                          <Lock className="w-2.5 h-2.5" />
                          SENSOR
                        </div>
                      )}
                      {/* Zoom icon on hover */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ZoomIn className="w-7 h-7 text-white drop-shadow" />
                      </div>
                    </div>

                    {/* Card info */}
                    <div className="p-2 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-slate-400">Hal. {page.pageNumber}/{page.totalPages}</span>
                        <span className="text-[10px] font-semibold" style={{ color: meta.color }}>
                          {meta.icon} {meta.label}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-500 truncate">{page.sourceFileName}</div>
                    </div>

                    {/* Reclassify button */}
                    <select
                      className="w-full text-[9px] bg-slate-800 border-t border-white/5 text-slate-300 px-2 py-1 cursor-pointer focus:outline-none"
                      value={page.docClass}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleReclassify(page.id, e.target.value as DocumentClass);
                      }}
                    >
                      {(Object.entries(DOCUMENT_CLASS_META) as [DocumentClass, typeof DOCUMENT_CLASS_META[DocumentClass]][]).map(([cls, m]) => (
                        <option key={cls} value={cls}>
                          {m.icon} {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: GALLERY ────────────────────────────────────────────────────── */}
      {activeTab === 'gallery' && (
        <div className="space-y-4">
          {/* Gallery header + controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-white/10 bg-slate-900/80">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Archive className="w-4 h-4 text-emerald-400" />
                Galeri Berkas Pelamar
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                  {gallery.length} berkas
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Seluruh halaman berkas pelamar yang telah dipecah, diklasifikasikan, dan disensor.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearGallery}
                disabled={gallery.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition disabled:opacity-40"
              >
                <X className="w-3.5 h-3.5" />
                Kosongkan
              </button>
            </div>
          </div>

          {/* Class filter tabs */}
          {gallery.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setGalleryFilter('all'); setGalleryPage(0); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  galleryFilter === 'all'
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-400 hover:text-white bg-slate-800/60'
                }`}
              >
                Semua ({gallery.length})
              </button>
              {galleryClasses.map((cls) => {
                const m = DOCUMENT_CLASS_META[cls];
                const count = gallery.filter((p) => p.docClass === cls).length;
                return (
                  <button
                    key={cls}
                    onClick={() => { setGalleryFilter(cls); setGalleryPage(0); }}
                    className="px-3 py-1 rounded-full text-xs font-semibold border transition"
                    style={{
                      color: galleryFilter === cls ? '#fff' : m.color,
                      background: galleryFilter === cls ? m.color : m.bgColor,
                      borderColor: `${m.color}44`,
                    }}
                  >
                    {m.icon} {m.label} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Gallery grid */}
          {gallery.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 space-y-3">
              <Archive className="w-12 h-12 text-slate-700" />
              <p className="text-sm font-medium">Galeri berkas masih kosong.</p>
              <p className="text-xs text-slate-600">
                Pecah berkas PDF terlebih dahulu, lalu klik "Arsipkan ke Galeri".
              </p>
            </div>
          ) : filteredGallery.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
              Tidak ada berkas dengan tipe ini.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                {gallerySlice.map((page) => {
                  const meta = DOCUMENT_CLASS_META[page.docClass];
                  return (
                    <div
                      key={page.id}
                      className="group relative rounded-xl border overflow-hidden bg-slate-900 hover:scale-[1.03] hover:shadow-xl cursor-pointer transition-all"
                      style={{ borderColor: `${meta.color}33` }}
                      onClick={() => { setViewingPage(page); setShowRaw(false); }}
                    >
                      <div className="relative aspect-[3/4] overflow-hidden bg-slate-800">
                        <img
                          src={page.isSensitive ? page.censoredImageBase64 : (page.censoredImageBase64 || page.rawImageBase64)}
                          alt={`${page.label} hal. ${page.pageNumber}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {page.isSensitive && (
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-950/90 border border-red-500/50 text-[9px] font-black text-red-300">
                            <Lock className="w-2.5 h-2.5" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ZoomIn className="w-7 h-7 text-white drop-shadow" />
                        </div>
                      </div>
                      <div className="p-2">
                        <div className="text-[9px] font-bold truncate" style={{ color: meta.color }}>
                          {meta.icon} {meta.label}
                        </div>
                        <div className="text-[8px] text-slate-500 truncate">
                          {page.candidateName || page.sourceFileName}
                        </div>
                        <div className="text-[8px] text-slate-600">Hal. {page.pageNumber}/{page.totalPages}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {galleryTotalPages > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setGalleryPage((p) => Math.max(0, p - 1))}
                    disabled={galleryPage === 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-slate-400">
                    Halaman {galleryPage + 1} / {galleryTotalPages}
                  </span>
                  <button
                    onClick={() => setGalleryPage((p) => Math.min(galleryTotalPages - 1, p + 1))}
                    disabled={galleryPage >= galleryTotalPages - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── Lightbox Modal ───────────────────────────────────────────────────── */}
      {viewingPage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setViewingPage(null)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <span className="text-lg">{DOCUMENT_CLASS_META[viewingPage.docClass].icon}</span>
                <div>
                  <div className="text-sm font-bold text-white">{viewingPage.label}</div>
                  <div className="text-[10px] text-slate-400">
                    Hal. {viewingPage.pageNumber}/{viewingPage.totalPages} • {viewingPage.sourceFileName}
                  </div>
                </div>
                {viewingPage.isSensitive && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-950 border border-red-500/50 text-[10px] font-black text-red-300">
                    <Lock className="w-3 h-3" />
                    SENSITIF
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Toggle raw / censored - only allow raw if not sensitive (admin safety) */}
                {!viewingPage.isSensitive && viewingPage.censorLevel !== 'none' && (
                  <button
                    onClick={() => setShowRaw((r) => !r)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-white/10 transition"
                  >
                    {showRaw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showRaw ? 'Tampil Tersensor' : 'Tampil Asli'}
                  </button>
                )}
                <button
                  onClick={() =>
                    downloadBase64(
                      viewingPage.censoredImageBase64 || viewingPage.rawImageBase64,
                      `${viewingPage.docClass}_hal${viewingPage.pageNumber}.jpg`
                    )
                  }
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Unduh
                </button>
                <button
                  onClick={() => setViewingPage(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal image */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-slate-950/50">
              <img
                src={
                  showRaw && !viewingPage.isSensitive
                    ? viewingPage.rawImageBase64
                    : viewingPage.censoredImageBase64 || viewingPage.rawImageBase64
                }
                alt={viewingPage.label}
                className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-xl"
              />
            </div>

            {/* Modal footer info */}
            <div className="px-4 py-3 border-t border-white/10 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Klasifikasi</div>
                <div className="text-xs font-bold mt-0.5" style={{ color: DOCUMENT_CLASS_META[viewingPage.docClass].color }}>
                  {viewingPage.label}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Sensor</div>
                <div className={`text-xs font-bold mt-0.5 ${
                  viewingPage.censorLevel === 'full' ? 'text-red-400' :
                  viewingPage.censorLevel === 'partial' ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {viewingPage.censorLevel === 'full' ? '🔒 Penuh' :
                   viewingPage.censorLevel === 'partial' ? '🔐 Sebagian' : '✅ Tidak Disensor'}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Akurasi AI</div>
                <div className="text-xs font-bold text-cyan-400 mt-0.5">{viewingPage.confidence}%</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PdfDocumentSplitter;
