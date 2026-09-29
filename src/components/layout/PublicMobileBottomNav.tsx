import { Home, Search, ShoppingBag, User, Briefcase } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';

interface PublicMobileBottomNavProps {
  currentPath?: string;
  onLogin?: () => void;
}

export default function PublicMobileBottomNav({
  currentPath = typeof window !== 'undefined' ? window.location.pathname : '/',
  onLogin,
}: PublicMobileBottomNavProps) {
  const { user, userMeta } = useAuth();

  const getDashboardPath = () => {
    if (!userMeta) return '/';
    if (userMeta.role === 'employer') return '/employer/dashboard';
    if (userMeta.role === 'admin' || userMeta.role === 'superadmin') return '/admin/dashboard';
    return '/seeker/dashboard';
  };

  const navItems = [
    {
      label: 'Home',
      icon: Home,
      href: '/',
      active: currentPath === '/',
    },
    {
      label: 'Iklan Loker',
      icon: Search,
      href: '/browse',
      active: currentPath.startsWith('/browse'),
    },
    {
      label: 'Marketplace',
      icon: ShoppingBag,
      href: '/marketplace',
      active: currentPath.startsWith('/marketplace'),
      isCenterAction: true,
    },
    {
      label: user ? 'Dashboard' : 'Untuk HRD',
      icon: Briefcase,
      href: user ? getDashboardPath() : '/#employer-section',
      active: currentPath.startsWith('/employer'),
    },
    {
      label: user ? 'Profil' : 'Masuk',
      icon: User,
      href: user ? getDashboardPath() : '#login',
      active: false,
      onClick: !user ? onLogin : undefined,
    },
  ];

  return (
    <nav
      aria-label="Navigasi Bawah Mobile LOXER"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t border-cyan-500/20 bg-[#0f172a]/95 px-2 pt-1 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-2xl text-slate-200"
    >
      <div className="flex items-center justify-between max-w-md mx-auto relative">
        {navItems.map((item) => {
          if (item.isCenterAction) {
            return (
              <a
                key={item.label}
                href={item.href}
                className="flex flex-col items-center justify-center -mt-5 active:scale-90 transition-transform group focus:outline-none"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-tr from-cyan-500 to-sky-400 text-slate-950 shadow-cyan-500/40 group-hover:brightness-110 transition-all">
                  <item.icon className="w-6 h-6" strokeWidth={2.4} />
                </div>
                <span
                  className={`text-[10px] tracking-tight mt-1 font-bold ${
                    item.active ? 'text-cyan-400' : 'text-slate-300'
                  }`}
                >
                  {item.label}
                </span>
              </a>
            );
          }

          if (item.onClick) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="flex flex-1 flex-col items-center justify-center min-h-[48px] py-1 active:scale-95 transition-transform"
              >
                <div className="flex items-center justify-center px-3 py-1 rounded-full text-slate-400 hover:text-slate-200">
                  <item.icon className="w-5 h-5" strokeWidth={1.8} />
                </div>
                <span className="text-[10px] tracking-tight mt-0.5 truncate max-w-[64px] text-slate-400 font-medium">
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <a
              key={item.label}
              href={item.href}
              className="flex flex-1 flex-col items-center justify-center min-h-[48px] py-1 active:scale-95 transition-transform"
            >
              <div
                className={`flex items-center justify-center px-3 py-1 rounded-full transition-all duration-200 ${
                  item.active
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-sm border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <item.icon className="w-5 h-5" strokeWidth={item.active ? 2.2 : 1.8} />
              </div>
              <span
                className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[64px] ${
                  item.active ? 'text-cyan-300 font-bold' : 'text-slate-400 font-medium'
                }`}
              >
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
