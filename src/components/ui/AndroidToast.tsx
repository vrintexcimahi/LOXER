interface AndroidToastProps {
  message: string;
  visible: boolean;
  onDismiss?: () => void;
}

export default function AndroidToast({ message, visible, onDismiss }: AndroidToastProps) {
  if (!message) return null;

  return (
    <div
      aria-live="polite"
      onClick={onDismiss}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[999999] pointer-events-auto cursor-pointer transition-all duration-300 ease-out transform ${
        visible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2.5 rounded-full border border-cyan-500/40 bg-slate-900/95 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-2xl shadow-cyan-500/30 backdrop-blur-md">
        <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="tracking-wide select-none">{message}</span>
      </div>
    </div>
  );
}
