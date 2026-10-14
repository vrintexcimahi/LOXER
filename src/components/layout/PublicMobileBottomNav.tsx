import { Home, Search, ShoppingBag, User, Briefcase, Users } from 'lucide-react';
import { useAuth } from '../../contexts/useAuth';
import ClayIcon from '../ui/ClayIcon';

interface PublicMobileBottomNavProps {
  currentPath?: string;
  onLogin?: () => void;
}

export default function PublicMobileBottomNav({
  currentPath = typeof window !== 'undefined' ? window.location.pathname : '/',
}: PublicMobileBottomNavProps) {
  const { user, userMeta } = useAuth();

  const getDashboardPath = () => {
    if (!userMeta) return '/';
    if (userMeta.role === 'employer') return '/employer/dashboard';
    if (userMeta.role === 'admin' || userMeta.role === 'superadmin') return '/admin/dashboard';
    return '/seeker/dashboard';
  };

  interface NavItem {
    label: string;
    icon: typeof Home;
    href: string;
    active: boolean;
    isCenterAction?: boolean;
    onClick?: () => void;
  }

  const navItems: NavItem[] = [
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
      label: user ? 'Profil' : 'Bursa Talent',
      icon: user ? User : Users,
      href: user ? getDashboardPath() : '/talents',
      active: currentPath.startsWith('/talents'),
    },
  ];

  return (
    <nav
      aria-label="Navigasi Bawah Mobile LOXER"
      className="loxer-mobile-nav md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl border-t border-cyan-500/20 bg-[#0f172a]/95 px-2 pt-1 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-2xl text-slate-200"
    >
      <div className="flex items-center justify-between max-w-md mx-auto relative">
        {navItems.map((item) => {
              if (item.isCenterAction) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    aria-current={item.active ? 'page' : undefined}
                    className="flex flex-1 flex-col items-center justify-center -mt-5 active:scale-90 transition-transform group"
                  >
                    <ClayIcon icon={item.icon} active={item.active} elevated />
                    <span
                      className={`text-[10px] tracking-tight mt-1 ${
                        item.active ? 'text-cyan-400 font-extrabold' : 'text-slate-400 font-medium'
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.active && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-0.5 shadow-sm shadow-cyan-400/50" />}
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
                    <ClayIcon icon={item.icon} active={item.active} />
                    <span className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[64px] ${item.active ? 'text-cyan-400 font-extrabold' : 'text-slate-400 font-medium'}`}>
                      {item.label}
                    </span>
                    {item.active && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-0.5 shadow-sm shadow-cyan-400/50" />}
                  </button>
                );
              }

              return (
                <a
                  key={item.label}
                  href={item.href}
                  aria-current={item.active ? 'page' : undefined}
                  className="flex flex-1 flex-col items-center justify-center min-h-[48px] py-1 active:scale-95 transition-transform"
                >
                  <ClayIcon icon={item.icon} active={item.active} />
                  <span
                    className={`text-[10px] tracking-tight mt-0.5 truncate max-w-[64px] ${
                      item.active ? 'text-cyan-400 font-extrabold' : 'text-slate-400 font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.active && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-0.5 shadow-sm shadow-cyan-400/50" />}
                </a>
              );
        })}
      </div>
    </nav>
  );
}
