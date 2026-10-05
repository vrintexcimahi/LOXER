import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Minimize2,
  Download,
  ExternalLink,
  ShieldCheck,
  Check,
  AlertCircle,
  Move,
} from 'lucide-react';
import { downloadImageSafely, openImageSafelyInNewTab } from '../../lib/imageViewerHelper';

export interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  title?: string;
  subtitle?: string;
  downloadFilename?: string;
}

export default function ImageViewerModal({
  isOpen,
  onClose,
  imageUrl,
  title = 'Pratinjau Dokumen CV',
  subtitle = 'Kontak terproteksi privasi resmi aplikasi LOXER',
  downloadFilename = 'dokumen-cv-loxer.jpg',
}: ImageViewerModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset transforms when opened or imageUrl changes
  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setImageError(false);
      setImageLoaded(false);
      setDownloadSuccess(false);
    }
  }, [isOpen, imageUrl]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(prev - 0.25, 0.5);
      if (next <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  // Handle ESC and keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      } else if (e.key === '0') {
        handleReset();
      } else if (e.key.toLowerCase() === 'r') {
        handleRotate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Prevent background scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose, handleZoomIn, handleZoomOut, handleReset, handleRotate]);

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) {
      setScale((prev) => Math.min(prev + 0.15, 4));
    } else {
      setScale((prev) => {
        const next = Math.max(prev - 0.15, 0.5);
        if (next <= 1) setPosition({ x: 0, y: 0 });
        return next;
      });
    }
  };

  // Mouse drag to pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Double click to toggle zoom
  const handleDoubleClick = () => {
    if (scale > 1) {
      handleReset();
    } else {
      setScale(2);
    }
  };

  const handleDownload = async () => {
    if (!imageUrl) return;
    setDownloading(true);
    const success = await downloadImageSafely(imageUrl, downloadFilename);
    setDownloading(false);
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    }
  };

  const handleOpenNewTab = () => {
    if (!imageUrl) return;
    openImageSafelyInNewTab(imageUrl, title);
  };

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] flex flex-col bg-slate-950/95 backdrop-blur-xl animate-fade-in select-none text-white overflow-hidden"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-slate-950/80 backdrop-blur-md z-30 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-[240px] sm:max-w-md">
              {title}
            </h3>
            <p className="text-[11px] text-cyan-300/80 truncate max-w-[240px] sm:max-w-md flex items-center gap-1.5">
              <span>{subtitle}</span>
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Open in New Tab Button (Safe Blob fallback) */}
          <button
            type="button"
            onClick={handleOpenNewTab}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition shadow-sm"
            title="Buka dokumen di tab baru browser (Aman dari eror)"
          >
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tab Baru</span>
          </button>

          {/* Download Button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/20 hover:bg-cyan-500/30 text-xs font-semibold text-cyan-300 transition shadow-sm"
            title="Unduh berkas CV ke perangkat"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-bold">Tersimpan!</span>
              </>
            ) : downloading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden xs:inline">Unduh Berkas</span>
              </>
            )}
          </button>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/10 transition"
            title="Tutup Pratinjau (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div
        className="relative flex-1 flex items-center justify-center overflow-hidden p-2 sm:p-6 cursor-default"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        style={{
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
      >
        {/* Loading Spinner */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-cyan-400">
            <div className="w-10 h-10 border-3 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
            <span className="text-xs font-medium text-slate-400">Memuat resolusi penuh...</span>
          </div>
        )}

        {/* Broken Image Fallback */}
        {imageError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-sm rounded-2xl border border-red-500/30 bg-slate-900/90 text-slate-300 space-y-3">
            <div className="p-3 rounded-full bg-red-500/20 text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-white">Gagal Membuka Gambar Dokumen</h4>
            <p className="text-xs text-slate-400">
              Tautan atau data gambar tidak valid atau tidak dapat dimuat oleh browser.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setImageError(false);
                  setImageLoaded(false);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs hover:bg-cyan-400 transition"
              >
                Coba Lagi
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-medium text-xs hover:bg-slate-700 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          <div
            className="transition-transform duration-75 will-change-transform flex items-center justify-center max-h-full max-w-full"
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt={title}
              draggable={false}
              onDoubleClick={handleDoubleClick}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              className="max-h-[82vh] max-w-[92vw] object-contain rounded-lg shadow-2xl transition-opacity duration-200 pointer-events-auto"
              style={{
                opacity: imageLoaded ? 1 : 0,
              }}
            />
          </div>
        )}

        {/* Draggable hint indicator when zoomed */}
        {scale > 1 && (
          <div className="absolute top-4 left-4 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 text-[11px] text-cyan-300 backdrop-blur-md pointer-events-none shadow-lg">
            <Move className="w-3.5 h-3.5 text-cyan-400" />
            <span>Tahan & geser mouse untuk menggeser berkas</span>
          </div>
        )}
      </div>

      {/* Floating Bottom Toolbar */}
      <div className="px-4 py-3 border-t border-white/10 bg-slate-950/85 backdrop-blur-md z-30 shrink-0 flex flex-wrap items-center justify-between gap-3">
        {/* Info & Zoom level */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-mono text-cyan-300 font-bold bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-lg">
            {Math.round(scale * 100)}%
          </span>
          <span className="hidden sm:inline text-slate-500">•</span>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            Klik ganda / scroll mouse untuk zoom
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 sm:gap-2 mx-auto sm:mx-0">
          {/* Zoom Out */}
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-300 hover:text-white border border-white/10 transition"
            title="Perkecil (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          {/* Reset Zoom */}
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white border border-white/10 transition"
            title="Kembalikan ke Ukuran Normal (0)"
          >
            100%
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 4}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 text-slate-300 hover:text-white border border-white/10 transition"
            title="Perbesar (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-white/10 mx-1" />

          {/* Rotate 90 deg */}
          <button
            type="button"
            onClick={handleRotate}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition"
            title="Putar Dokumen 90° (R)"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 transition"
            title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Open in new tab (Mobile visible) */}
          <button
            type="button"
            onClick={handleOpenNewTab}
            className="sm:hidden p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-white/10 transition"
            title="Tab Baru"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>

        {/* Privacy Note */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
          <span>Informasi kontak otomatis disensor oleh LOXER AI</span>
        </div>
      </div>
    </div>
  );
}
