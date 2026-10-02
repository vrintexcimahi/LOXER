import { Twitter, Linkedin, Instagram, Github, ShieldCheck } from 'lucide-react';
import BrandText from '../ui/BrandText';
import AndroidToast from '../ui/AndroidToast';
import { useAdminEasterEgg } from '../../hooks/useAdminEasterEgg';

export default function Footer() {
  const { isUnlocked, handleTriggerClick, toastMessage, toastVisible, setToastVisible } = useAdminEasterEgg();

  return (
    <footer className="bg-[#0F172A] text-slate-400">
      <div className="w-full max-w-[min(100%,1920px)] mx-auto px-[clamp(16px,3vw,48px)] py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="col-span-1 md:col-span-1">
            <div
              onClick={handleTriggerClick}
              className="flex items-center gap-2 mb-4 cursor-pointer select-none group"
              title={isUnlocked ? 'Mode Administrator Aktif' : undefined}
            >
              <img src="/branding/icon64.png" alt="LOXER Logo" className="w-8 h-8 rounded-lg group-hover:brightness-110 transition" />
              <BrandText className="text-xl font-black" />
            </div>
            <p className="text-sm leading-relaxed text-slate-500 mb-6">
              Platform rekrutmen Indonesia yang menghubungkan pencari kerja berbakat dengan perusahaan terbaik.
            </p>
            <div className="flex items-center gap-3">
              {[Twitter, Linkedin, Instagram, Github].map((Icon, index) => (
                <a
                  key={index}
                  href="#"
                  className="w-8 h-8 glass rounded-lg flex items-center justify-center hover:bg-white/15 transition-colors"
                >
                  <Icon className="w-4 h-4 text-slate-400 hover:text-cyan-400" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Pencari Kerja</h4>
            <ul className="space-y-3">
              {['Browse Lowongan', 'Buat Profil', 'Lacak Lamaran', 'Tips Karir', 'Blog'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-slate-500 hover:text-cyan-400 text-sm transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Perekrut</h4>
            <ul className="space-y-3">
              {['Pasang Lowongan', 'Magic Filter', 'Dashboard HR', 'Paket Harga', 'API'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-slate-500 hover:text-cyan-400 text-sm transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Perusahaan</h4>
            <ul className="space-y-3">
              {['Tentang Kami', 'Karir', 'Privasi', 'Syarat & Ketentuan', 'Kontak'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-slate-500 hover:text-cyan-400 text-sm transition-colors">
                    {item}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="/downloads/loxer-app.apk"
                  download="loxer-app.apk"
                  className="text-slate-500 hover:text-cyan-400 text-sm transition-colors text-left cursor-pointer flex items-center gap-1.5"
                >
                  <span>Download APK Resmi</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">Android</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p
            onClick={handleTriggerClick}
            className="text-slate-500 text-sm cursor-pointer select-none hover:text-slate-400 active:text-cyan-400 transition-colors"
            title="© 2026 LOXER"
          >
            © 2026 LOXER. Hak Cipta Dilindungi.
          </p>

          {isUnlocked && (
            <a
              href="/admin/dashboard"
              className="text-xs font-semibold text-cyan-300 bg-cyan-950/80 border border-cyan-400/30 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 hover:bg-cyan-900/50 hover:border-cyan-400/60 shadow-lg shadow-cyan-500/10 transition-all animate-in fade-in"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Portal Administrator (God Mode)</span>
            </a>
          )}

          <p className="text-slate-600 text-sm">
            Dibuat dengan <span className="text-cyan-400">love</span> di Indonesia
          </p>
        </div>
      </div>

      <AndroidToast
        message={toastMessage}
        visible={toastVisible}
        onDismiss={() => setToastVisible(false)}
      />
    </footer>
  );
}

