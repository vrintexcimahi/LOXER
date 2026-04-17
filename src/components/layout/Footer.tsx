import { Briefcase, Twitter, Linkedin, Instagram, Github } from 'lucide-react';
import BrandText from '../ui/BrandText';

export default function Footer() {
  return (
    <footer className="bg-[#0F172A] text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 gradient-cta rounded-lg flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-white" />
              </div>
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
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-sm">© 2024 LOXER. Hak Cipta Dilindungi.</p>
          <p className="text-slate-600 text-sm">
            Dibuat dengan <span className="text-cyan-400">love</span> di Indonesia
          </p>
        </div>
      </div>
    </footer>
  );
}

