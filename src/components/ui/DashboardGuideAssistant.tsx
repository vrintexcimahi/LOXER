import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, BookOpenText, ExternalLink, Sparkles, X } from 'lucide-react';

export interface DashboardGuideAssistantItem {
  id: string;
  label: string;
  description: string;
  href: string;
  summary: string;
  detailFunctions: string[];
  usageTips: string[];
  actionLabel?: string;
}

interface DashboardGuideAssistantProps {
  workspaceLabel: string;
  workspaceDescription: string;
  storageKey: string;
  currentGuideId?: string;
  guides: DashboardGuideAssistantItem[];
}

function readStoredGuide(storageKey: string) {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(storageKey) || '';
  } catch {
    return '';
  }
}

export default function DashboardGuideAssistant({
  workspaceLabel,
  workspaceDescription,
  storageKey,
  currentGuideId,
  guides,
}: DashboardGuideAssistantProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedGuideId, setSelectedGuideId] = useState(() => readStoredGuide(storageKey));

  const selectedGuide = useMemo(() => {
    return guides.find((guide) => guide.id === selectedGuideId) || guides.find((guide) => guide.id === currentGuideId) || guides[0];
  }, [currentGuideId, guides, selectedGuideId]);

  useEffect(() => {
    if (!selectedGuide && guides[0]) {
      setSelectedGuideId(guides[0].id);
      return;
    }

    if (selectedGuide?.id && selectedGuide.id !== selectedGuideId) {
      setSelectedGuideId(selectedGuide.id);
    }
  }, [guides, selectedGuide, selectedGuideId]);

  useEffect(() => {
    if (!selectedGuideId || typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(storageKey, selectedGuideId);
    } catch {
      // Ignore localStorage write issues; assistant still works in-memory.
    }
  }, [selectedGuideId, storageKey]);

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  if (!selectedGuide) return null;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-24 right-4 z-[120] flex items-end justify-end sm:bottom-6 sm:right-6"
    >
      {open ? (
        <div className="w-[min(420px,calc(100vw-1.5rem))] rounded-3xl border border-sky-100 bg-white p-5 shadow-2xl shadow-sky-900/20">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700">
                <Sparkles className="h-3.5 w-3.5" />
                Bot Assistant
              </div>
              <h3 className="mt-3 text-lg font-black text-slate-800">{workspaceLabel}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">{workspaceDescription}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl border border-sky-100 p-2 text-slate-400 transition-colors hover:border-sky-200 hover:text-sky-600"
              aria-label="Tutup panduan"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Pilih menu untuk penjelasan</label>
              <select
                value={selectedGuide.id}
                onChange={(event) => setSelectedGuideId(event.target.value)}
                className="input-field !py-2.5"
              >
                {guides.map((guide) => (
                  <option key={guide.id} value={guide.id}>
                    {guide.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Menu aktif</p>
              <p className="mt-2 text-base font-bold text-slate-800">{selectedGuide.label}</p>
              <p className="mt-1 text-sm text-slate-500">{selectedGuide.description}</p>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{selectedGuide.summary}</p>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-white p-4">
              <div className="flex items-center gap-2 text-slate-800">
                <BookOpenText className="h-4 w-4 text-cyan-600" />
                <p className="text-sm font-semibold">Fungsi detail</p>
              </div>
              <div className="mt-3 space-y-2">
                {selectedGuide.detailFunctions.map((item) => (
                  <div key={item} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-sky-100 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">Cara pakai singkat</p>
              <div className="mt-3 space-y-2">
                {selectedGuide.usageTips.map((item) => (
                  <div key={item} className="rounded-xl border border-sky-100 px-3 py-2 text-sm text-slate-600">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Buka menu terkait</p>
                <p className="text-xs text-slate-300">Langsung menuju halaman yang dipilih untuk melihat fungsinya.</p>
              </div>
              <a
                href={selectedGuide.href}
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
              >
                {selectedGuide.actionLabel || 'Buka Menu'}
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-3 rounded-full border border-cyan-300/40 bg-slate-950 px-4 py-3 text-white shadow-2xl shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:bg-slate-900"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/30">
          <Bot className="h-5 w-5" />
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs uppercase tracking-[0.18em] text-cyan-200">Panduan</span>
          <span className="block text-sm font-semibold">{selectedGuide.label}</span>
        </span>
      </button>
    </div>
  );
}
