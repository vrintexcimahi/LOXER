import { lazy, Suspense, useEffect, useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { DeviceProvider } from './contexts/DeviceContext';
import { useAuth } from './contexts/useAuth';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { isDefaultAdminEmail } from './lib/constants';
import { supabase } from './lib/supabase';
import { syncQueuedApplications } from './lib/offlineSyncService';
import { UserRole } from './lib/types';
import Homepage from './pages/Homepage';
import OfflineIndicator from './components/pwa/OfflineIndicator';
import PwaUpdateNotification from './components/pwa/PwaUpdateNotification';
import BrowserCachePrompt from './components/pwa/BrowserCachePrompt';
import PublicMobileBottomNav from './components/layout/PublicMobileBottomNav';

const AuthModal = lazy(() => import('./pages/auth/AuthModal'));
const SeekerDashboard = lazy(() => import('./pages/seeker/SeekerDashboard'));
const Browse = lazy(() => import('./pages/seeker/Browse'));
const Applications = lazy(() => import('./pages/seeker/Applications'));
const SeekerProfile = lazy(() => import('./pages/seeker/SeekerProfile'));
const EmployerDashboard = lazy(() => import('./pages/employer/EmployerDashboard'));
const JobListings = lazy(() => import('./pages/employer/JobListings'));
const PostJob = lazy(() => import('./pages/employer/PostJob'));
const Applicants = lazy(() => import('./pages/employer/Applicants'));
const CompanyProfile = lazy(() => import('./pages/employer/CompanyProfile'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdvancedAnalytics = lazy(() => import('./pages/admin/AdvancedAnalytics'));
const FeatureFlags = lazy(() => import('./pages/admin/FeatureFlags'));
const ModerationQueue = lazy(() => import('./pages/admin/ModerationQueue'));
const BroadcastSystem = lazy(() => import('./pages/admin/BroadcastSystem'));
const SecurityCenter = lazy(() => import('./pages/admin/SecurityCenter'));
const LogMonitoring = lazy(() => import('./pages/admin/LogMonitoring'));
const DatabaseBackup = lazy(() => import('./pages/admin/DatabaseBackup'));
const DeveloperWorkbench = lazy(() => import('./pages/admin/DeveloperWorkbench'));
const TalentMarketplace = lazy(() => import('./pages/public/TalentMarketplace'));
const SeekerMarketplace = lazy(() => import('./pages/seeker/SeekerMarketplace'));
const ProductMarketplace = lazy(() => import('./pages/public/ProductMarketplace'));

type AuthMode = 'login' | 'register' | null;

function FullScreenLoader({ message = 'Memuat LOXER...' }: { message?: string }) {
  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/60 text-sm">{message}</p>
      </div>
    </div>
  );
}

import { getActiveSimRole } from './lib/simSession';

function Router() {
  const { user, userMeta, loading, configured } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('seeker');
  const [path, setPath] = useState<string>(() => window.location.pathname);
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const simRole = getActiveSimRole();
  const previewRole = searchParams?.get('preview_role') || searchParams?.get('role') || simRole;

  const isGodModeUnlocked = (() => {
    try {
      if (previewRole && previewRole !== 'admin') return false;
      if (previewRole === 'admin') return true;
      return (
        sessionStorage.getItem('loxer_admin_unlocked') === 'true' ||
        sessionStorage.getItem('app_admin_unlocked') === 'true'
      );
    } catch {
      return false;
    }
  })();
  const isDefaultAdminAccount = (!previewRole || previewRole === 'admin') && (isDefaultAdminEmail(user?.email) || isGodModeUnlocked);
  const effectiveRole = previewRole === 'admin'
    ? 'admin'
    : previewRole === 'employer'
    ? 'employer'
    : previewRole === 'seeker' || previewRole === 'freelancer' || previewRole === 'jasa'
    ? 'seeker'
    : isDefaultAdminAccount
    ? 'admin'
    : userMeta?.role;


  const handleOpenRegister = (role: UserRole = 'seeker') => {
    setAuthInitialRole(role);
    setAuthMode('register');
  };

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const getHomePathByRole = () => {
    if (previewRole === 'admin') return '/admin/dashboard';
    if (previewRole === 'employer') return '/employer/dashboard';
    if (previewRole === 'seeker') return '/seeker/dashboard';
    if (previewRole === 'freelancer' || previewRole === 'jasa') return '/seeker/marketplace';
    if (!user || !effectiveRole) return '/';
    if (effectiveRole === 'admin' || effectiveRole === 'superadmin') return '/admin/dashboard';
    return effectiveRole === 'employer' ? '/employer/dashboard' : '/seeker/dashboard';
  };

  useEffect(() => {
    if (path === '/login') setAuthMode('login');
    if (path === '/register') {
      setAuthInitialRole('seeker');
      setAuthMode('register');
    }
  }, [path]);

  // Automatic PWA Offline Sync when internet connectivity is restored
  useEffect(() => {
    const handleOnlineSync = () => {
      if (supabase) {
        void syncQueuedApplications(supabase);
      }
    };

    window.addEventListener('online', handleOnlineSync);
    if (typeof navigator !== 'undefined' && navigator.onLine && supabase) {
      void syncQueuedApplications(supabase);
    }

    return () => {
      window.removeEventListener('online', handleOnlineSync);
    };
  }, []);

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!configured) {
    return (
      <div className="min-h-screen gradient-hero flex items-center justify-center px-6">
        <div className="max-w-xl w-full rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6 text-white">
          <h1 className="text-xl font-semibold mb-2">Supabase belum dikonfigurasi</h1>
          <p className="text-white/70 text-sm mb-4">
            Aplikasi butuh environment variable agar fitur auth/data bekerja.
          </p>
          <div className="text-sm text-white/80 space-y-2">
            <p>1) Buat file <code className="text-white">.env</code> di root project.</p>
            <p>2) Isi variabel berikut:</p>
            <pre className="rounded-lg bg-black/30 p-3 overflow-auto text-xs">
{`VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...`}
            </pre>
            <p>Contoh ada di <code className="text-white">.env.example</code>.</p>
          </div>
        </div>
      </div>
    );
  }

  const isRoleAuthorized = (role: 'seeker' | 'employer' | 'admin' | 'superadmin') => {
    if (previewRole === role) return true;
    if ((previewRole === 'freelancer' || previewRole === 'jasa') && role === 'seeker') return true;
    if (role === 'admin' && (isDefaultAdminAccount || isGodModeUnlocked || effectiveRole === 'superadmin' || effectiveRole === 'admin')) return true;
    if (role === 'superadmin' && (isDefaultAdminAccount || isGodModeUnlocked || effectiveRole === 'superadmin')) return true;
    return Boolean(user && effectiveRole === role);
  };

  const renderPage = () => {
    if (path === '/seeker/dashboard') return isRoleAuthorized('seeker') ? <SeekerDashboard /> : null;
    if (path === '/browse' || path === '/seeker/browse') return <Browse />;
    if (path === '/seeker/applications') return isRoleAuthorized('seeker') ? <Applications /> : null;
    if (path === '/seeker/profile') return isRoleAuthorized('seeker') ? <SeekerProfile /> : null;
    if (path === '/seeker/marketplace') return isRoleAuthorized('seeker') ? <SeekerMarketplace /> : null;
    if (path === '/marketplace' || path === '/products') return <ProductMarketplace />;
    if (path === '/talents' || path === '/employer/talents' || path === '/pelamar' || path === '/pelamar-kerja' || path === '/freelance' || path === '/jasa') return <TalentMarketplace />;
    if (path === '/employer/dashboard') return isRoleAuthorized('employer') ? <EmployerDashboard /> : null;
    if (path === '/employer/jobs') return isRoleAuthorized('employer') ? <JobListings /> : null;
    if (path === '/employer/jobs/new' || (path.startsWith('/employer/jobs/') && path.endsWith('/edit'))) return isRoleAuthorized('employer') ? <PostJob /> : null;
    if (path === '/employer/applicants') return isRoleAuthorized('employer') ? <Applicants /> : null;
    if (path === '/employer/company') return isRoleAuthorized('employer') ? <CompanyProfile /> : null;

    if (path.startsWith('/admin/')) {
      const isSuper = isRoleAuthorized('superadmin');
      const isAdmin = isRoleAuthorized('admin') || isSuper;

      if (!isAdmin) return null;

      const adminPages: Record<string, JSX.Element> = {
        '/admin/dashboard': <AdminDashboard tab="overview" />,
        '/admin/users': <AdminDashboard tab="users" />,
        '/admin/user-data': <AdminDashboard tab="users" subTab="intelligence" />,
        '/admin/devices': <AdminDashboard tab="users" subTab="devices" />,
        '/admin/jobs': <AdminDashboard tab="jobs" />,
        '/admin/applications': <AdminDashboard tab="applications" />,
        '/admin/companies': <AdminDashboard tab="companies" />,
        '/admin/integrations': <AdminDashboard tab="integrations" />,
        '/admin/moderation': <ModerationQueue />,
      };
      
      if (path === '/admin/editor') {
        window.location.href = '/admin/dashboard';
        return null;
      }

      const superPages: Record<string, JSX.Element> = {
        '/admin/logs': <LogMonitoring initialTab="audit" />,
        '/admin/audit-logs': <LogMonitoring initialTab="audit" />,
        '/admin/audit-log': <LogMonitoring initialTab="audit" />,
        '/admin/analytics': <AdvancedAnalytics />,
        '/admin/flags': <FeatureFlags />,
        '/admin/broadcast': <BroadcastSystem />,
        '/admin/security': <SecurityCenter />,
        '/admin/monitoring': <LogMonitoring />,
        '/admin/backup': <DatabaseBackup />,
        '/admin/dev-workbench': <DeveloperWorkbench />,
      };

      if (superPages[path] && !isSuper) {
        window.location.href = '/admin/dashboard';
        return null;
      }
      
      const page = adminPages[path] || (isSuper ? superPages[path] : null);
      return page || null;
    }

    return null;
  };

  const page = renderPage();

  if (page === null && path !== '/') {
    if ((path === '/login' || path === '/register') && !user) {
      // Allow unauthenticated visitor to view the login or register modal on homepage
    } else {
      const homePath = getHomePathByRole();
      if (homePath !== path && !homePath.startsWith(path)) {
        window.location.href = homePath;
      }
      return null;
    }
  }

  return (
    <>
      <OfflineIndicator />
      <PwaUpdateNotification />
      <BrowserCachePrompt />
      {page ? (
        <Suspense fallback={<FullScreenLoader message="Menyiapkan halaman..." />}>
          {page}
        </Suspense>
      ) : (
        <div className="bg-sky-50 min-h-screen pb-20 md:pb-0">
          <Navbar
            onLogin={() => setAuthMode('login')}
            onRegister={handleOpenRegister}
          />
          <Homepage
            onLogin={() => setAuthMode('login')}
            onRegister={handleOpenRegister}
          />
          <Footer />
          <PublicMobileBottomNav
            currentPath="/"
            onLogin={() => setAuthMode('login')}
          />

          {authMode && (
            <Suspense fallback={null}>
              <AuthModal
                mode={authMode}
                initialRole={authInitialRole}
                onClose={() => {
                  setAuthMode(null);
                  if (path === '/login' || path === '/register') {
                    window.history.pushState({}, '', '/');
                    setPath('/');
                  }
                }}
                onSwitchMode={setAuthMode}
              />
            </Suspense>
          )}
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DeviceProvider>
        <Router />
      </DeviceProvider>
    </AuthProvider>
  );
}
