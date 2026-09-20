// ==============================================================================
// LOXER Admin - Developer Mode (Dual-View Testing Workbench)
// ==============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Smartphone,
  Monitor,
  RotateCw,
  ArrowLeft,
  ArrowRight,
  Lock,
  Maximize2,
  Minimize2,
  ExternalLink,
  Wifi,
  Battery,
  Sparkles,
  Zap,
  Globe,
  Sliders,
  Check,
} from 'lucide-react';
import GodModeLayout from './GodModeLayout';

interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  type: 'phone' | 'tablet';
}

const DEVICE_PRESETS: DevicePreset[] = [
  { id: 'iphone-15-pro', name: 'iPhone 15 Pro', width: 393, height: 852, type: 'phone' },
  { id: 'pixel-8', name: 'Google Pixel 8', width: 412, height: 915, type: 'phone' },
  { id: 'iphone-se', name: 'iPhone SE', width: 375, height: 667, type: 'phone' },
  { id: 'ipad-mini', name: 'iPad Mini', width: 768, height: 1024, type: 'tablet' },
];

const QUICK_ROUTES = [
  { label: 'Home (/)', path: '/' },
  { label: 'Browse (/browse)', path: '/browse' },
  { label: 'Login (/login)', path: '/login' },
  { label: 'Register (/register)', path: '/register' },
  { label: 'Seeker (/seeker/dashboard)', path: '/seeker/dashboard' },
  { label: 'Employer (/employer/dashboard)', path: '/employer/dashboard' },
  { label: 'Admin (/admin/dashboard)', path: '/admin/dashboard' },
  { label: 'CMS Editor (/admin/editor)', path: '/admin/editor' },
];

export default function DeveloperWorkbench() {
  // Navigation & Route state
  const [currentPath, setCurrentPath] = useState('/');
  const [inputUrl, setInputUrl] = useState('/');
  const [cacheBuster, setCacheBuster] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Device & Display options
  const [selectedDevice, setSelectedDevice] = useState<DevicePreset>(DEVICE_PRESETS[0]);
  const [zoomScale, setZoomScale] = useState<number>(0.85);
  const [showAutoFillMenu, setShowAutoFillMenu] = useState(false);
  const [autoFillNotification, setAutoFillNotification] = useState<string | null>(null);

  // Live status bar time
  const [currentTime, setCurrentTime] = useState('09:41');

  // Iframe references
  const mobileIframeRef = useRef<HTMLIFrameElement | null>(null);
  const desktopIframeRef = useRef<HTMLIFrameElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Update clock every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, []);

  // Compute full URL for iframes
  const getIframeUrl = useCallback(
    (targetPath: string) => {
      const cleanPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
      if (cacheBuster) {
        const separator = cleanPath.includes('?') ? '&' : '?';
        return `${cleanPath}${separator}_cb=${Date.now()}`;
      }
      return cleanPath;
    },
    [cacheBuster]
  );

  // Synchronize both iframes to a new path
  const navigateBoth = useCallback(
    (newPath: string) => {
      const cleanPath = newPath.startsWith('/') ? newPath : `/${newPath}`;
      setCurrentPath(cleanPath);
      setInputUrl(cleanPath);

      const fullUrl = getIframeUrl(cleanPath);
      if (mobileIframeRef.current) {
        mobileIframeRef.current.src = fullUrl;
      }
      if (desktopIframeRef.current) {
        desktopIframeRef.current.src = fullUrl;
      }
    },
    [getIframeUrl]
  );

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateBoth(inputUrl);
  };

  const reloadBoth = () => {
    navigateBoth(currentPath);
  };

  // Listen to inner iframe navigation (same-origin localhost:3030)
  useEffect(() => {
    const checkNavigation = () => {
      try {
        if (desktopIframeRef.current?.contentWindow) {
          const desktopPath = desktopIframeRef.current.contentWindow.location.pathname;
          if (desktopPath && desktopPath !== currentPath && !desktopPath.includes('about:blank')) {
            setCurrentPath(desktopPath);
            setInputUrl(desktopPath);
            if (mobileIframeRef.current && mobileIframeRef.current.contentWindow) {
              const mobilePath = mobileIframeRef.current.contentWindow.location.pathname;
              if (mobilePath !== desktopPath) {
                mobileIframeRef.current.src = getIframeUrl(desktopPath);
              }
            }
          }
        }
      } catch {
        // Cross-origin safe ignore
      }
    };

    const timer = setInterval(checkNavigation, 1200);
    return () => clearInterval(timer);
  }, [currentPath, getIframeUrl]);

  // Autofill form injector
  const injectFormData = (type: 'seeker' | 'employer' | 'admin') => {
    const creds = {
      seeker: { email: 'seeker@demo.com', password: 'seeker123' },
      employer: { email: 'employer@demo.com', password: 'employer123' },
      admin: { email: 'loxer-admin-1776448925326@example.com', password: 'admin123' },
    }[type];

    const fillIframe = (iframe: HTMLIFrameElement | null) => {
      if (!iframe?.contentDocument) return;
      const doc = iframe.contentDocument;

      const emailInput = (doc.querySelector('input[type="email"]') ||
        doc.querySelector('input[name="email"]') ||
        doc.querySelector('input[placeholder*="email" i]')) as HTMLInputElement | null;

      const passwordInput = (doc.querySelector('input[type="password"]') ||
        doc.querySelector('input[name="password"]') ||
        doc.querySelector('input[placeholder*="password" i]')) as HTMLInputElement | null;

      if (emailInput) {
        emailInput.value = creds.email;
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      if (passwordInput) {
        passwordInput.value = creds.password;
        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
        passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    fillIframe(mobileIframeRef.current);
    fillIframe(desktopIframeRef.current);

    setShowAutoFillMenu(false);
    setAutoFillNotification(`Data ${type.toUpperCase()} berhasil diinjeksikan ke formulir aktif.`);
    setTimeout(() => setAutoFillNotification(null), 3000);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <GodModeLayout
      title="Developer Mode Workbench"
      description="Dual-view testing workbench: Mobile Chassis Simulator & Desktop Browser side-by-side."
    >
      <div
        ref={containerRef}
        className={`space-y-4 ${
          isFullscreen ? 'fixed inset-0 z-50 bg-slate-950 p-4 overflow-y-auto' : ''
        }`}
      >
        {/* Main Testing Control Toolbar */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-4 shadow-xl space-y-3">
          {/* Upper Toolbar: URL input, device select, scale, actions */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* URL Synchronizer Bar */}
            <form onSubmit={handleUrlSubmit} className="flex-1 flex items-center gap-2">
              <div className="flex items-center gap-1 text-slate-400">
                <button
                  type="button"
                  onClick={() => {
                    window.history.back();
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Kembali"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.history.forward();
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Maju"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={reloadBoth}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Reload Kedua Tampilan"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              <div className="relative flex-1 flex items-center">
                <span className="absolute left-3 flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">http://localhost:3030</span>
                </span>
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="/browse atau /admin/dashboard"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 sm:pl-48 pr-16 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="absolute right-2 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-lg transition cursor-pointer"
                >
                  Go
                </button>
              </div>
            </form>

            {/* Controls Right */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Device Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-300">
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <select
                  value={selectedDevice.id}
                  onChange={(e) => {
                    const found = DEVICE_PRESETS.find((d) => d.id === e.target.value);
                    if (found) setSelectedDevice(found);
                  }}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1"
                >
                  {DEVICE_PRESETS.map((d) => (
                    <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                      {d.name} ({d.width}×{d.height})
                    </option>
                  ))}
                </select>
              </div>

              {/* Zoom Scale */}
              <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-300">
                <Sliders className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={zoomScale}
                  onChange={(e) => setZoomScale(Number(e.target.value))}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value={0.75} className="bg-slate-900">Zoom 75%</option>
                  <option value={0.85} className="bg-slate-900">Zoom 85%</option>
                  <option value={1.0} className="bg-slate-900">Zoom 100%</option>
                </select>
              </div>

              {/* Cache-Buster toggle */}
              <label
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs cursor-pointer select-none transition ${
                  cacheBuster
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title="Sertakan timestamp _cb=Date.now() pada URL untuk bypass cache"
              >
                <input
                  type="checkbox"
                  checked={cacheBuster}
                  onChange={(e) => setCacheBuster(e.target.checked)}
                  className="sr-only"
                />
                <Zap className="w-3.5 h-3.5" />
                <span>Cache-Buster</span>
              </label>

              {/* Auto-fill Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAutoFillMenu(!showAutoFillMenu)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Fill Form</span>
                </button>

                {showAutoFillMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 text-xs space-y-1 animate-in fade-in">
                    <p className="px-2.5 py-1 text-[10px] uppercase font-bold text-slate-400">Pilih Data Dummy:</p>
                    <button
                      type="button"
                      onClick={() => injectFormData('seeker')}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer transition"
                    >
                      <span>Akun Seeker (Budi Santoso)</span>
                      <span className="text-[10px] text-cyan-400 font-mono">seeker</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => injectFormData('employer')}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer transition"
                    >
                      <span>Akun Employer (PT Vrintex)</span>
                      <span className="text-[10px] text-purple-400 font-mono">employer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => injectFormData('admin')}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-200 flex items-center justify-between cursor-pointer transition"
                    >
                      <span>Akun Administrator</span>
                      <span className="text-[10px] text-emerald-400 font-mono">admin</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Fullscreen Sandbox button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh Sandbox'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* External open link */}
              <a
                href={currentPath}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition"
                title="Buka Halaman Aktif di Tab Baru"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Route Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              <span>Rute Cepat:</span>
            </span>
            {QUICK_ROUTES.map((route) => {
              const isActive = currentPath === route.path;
              return (
                <button
                  key={route.path}
                  type="button"
                  onClick={() => navigateBoth(route.path)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition cursor-pointer border ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                      : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                  }`}
                >
                  {route.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Auto-fill notification toast */}
        {autoFillNotification && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-200 text-xs shadow-lg animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{autoFillNotification}</span>
          </div>
        )}

        {/* Dual-View Split Workbench */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT SIDE: Mobile Chassis Simulator */}
          <div className="xl:col-span-5 flex flex-col items-center justify-start">
            <div className="mb-2 flex items-center justify-between w-full px-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Mobile Chassis Simulator</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500">
                {selectedDevice.name} ({selectedDevice.width} × {selectedDevice.height} px)
              </span>
            </div>

            {/* Smartphone Physical Frame */}
            <div
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'top center',
              }}
              className="relative rounded-[50px] p-3.5 bg-gradient-to-b from-slate-700 via-slate-900 to-slate-950 border-4 border-slate-700/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
            >
              {/* Outer button hardware bumps */}
              <div className="absolute -left-4 top-24 w-1 h-10 bg-slate-700 rounded-l-md" />
              <div className="absolute -left-4 top-38 w-1 h-12 bg-slate-700 rounded-l-md" />
              <div className="absolute -left-4 top-52 w-1 h-12 bg-slate-700 rounded-l-md" />
              <div className="absolute -right-4 top-32 w-1 h-16 bg-slate-700 rounded-r-md" />

              {/* Screen Bezel container */}
              <div
                style={{
                  width: selectedDevice.width,
                  height: selectedDevice.height,
                }}
                className="relative bg-black rounded-[38px] overflow-hidden flex flex-col border border-slate-800"
              >
                {/* Smartphone Status Bar with Dynamic Island */}
                <div className="relative h-11 bg-slate-950 text-white flex items-center justify-between px-6 shrink-0 z-30 select-none">
                  {/* Left clock */}
                  <span className="text-xs font-bold font-mono tracking-tight">{currentTime}</span>

                  {/* Center Dynamic Island pill */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-2 h-7 w-28 bg-black rounded-full border border-white/5 flex items-center justify-center gap-2 px-2 shadow-inner">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
                    <div className="w-2 h-2 rounded-full bg-cyan-500/40 animate-pulse" />
                  </div>

                  {/* Right Status Indicators */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-200">
                    <span className="text-[10px] font-extrabold font-mono tracking-tighter">5G</span>
                    <Wifi className="w-3.5 h-3.5" />
                    <Battery className="w-4 h-4 fill-white" />
                  </div>
                </div>

                {/* Mobile Viewport Iframe */}
                <div className="flex-1 w-full bg-slate-950 relative overflow-hidden">
                  <iframe
                    ref={mobileIframeRef}
                    src={getIframeUrl(currentPath)}
                    title="Mobile Simulator View"
                    className="w-full h-full border-none bg-white"
                  />
                </div>

                {/* Bottom Home Indicator Bar */}
                <div className="h-5 bg-slate-950 flex items-center justify-center shrink-0 z-30 select-none">
                  <div className="w-32 h-1 bg-white/70 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE: Desktop Browser Mockup */}
          <div className="xl:col-span-7 flex flex-col">
            <div className="mb-2 flex items-center justify-between px-2 text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Monitor className="w-4 h-4 text-purple-400" />
                <span>Desktop Browser Mockup</span>
              </span>
              <span className="font-mono text-[11px] text-slate-500">Fluid Responsive Desktop</span>
            </div>

            {/* Desktop Window Frame */}
            <div className="rounded-2xl border border-slate-700/70 bg-slate-950 shadow-2xl overflow-hidden flex flex-col h-[780px]">
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ff5f56] inline-block shadow-sm" />
                  <span className="w-3 h-3 rounded-full bg-[#ffbd2e] inline-block shadow-sm" />
                  <span className="w-3 h-3 rounded-full bg-[#27c93f] inline-block shadow-sm" />
                </div>

                {/* Desktop Omnibox */}
                <div className="flex-1 max-w-lg mx-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono">
                  <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span className="truncate">http://localhost:3030{currentPath}</span>
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  <button
                    type="button"
                    onClick={reloadBoth}
                    className="p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                    title="Reload"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Desktop Iframe Body */}
              <div className="flex-1 w-full bg-slate-950 relative overflow-hidden">
                <iframe
                  ref={desktopIframeRef}
                  src={getIframeUrl(currentPath)}
                  title="Desktop Browser Mockup View"
                  className="w-full h-full border-none bg-white"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </GodModeLayout>
  );
}
