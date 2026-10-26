import { lazy, Suspense, useEffect, useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { DeviceProvider } from './contexts/DeviceContext';
import { useAuth } from './contexts/useAuth';
import Navbar from './components/layout/Navbar';
import { isDefaultAdminEmail } from './lib/constants';
import { supabase } from './lib/supabase';
import { syncQueuedApplications } from './lib/offlineSyncService';
import { UserRole } from './lib/types';
import Homepage from './pages/Homepage';
import OfflineIndicator from './components/pwa/OfflineIndicator';
import PublicMobileBottomNav from './components/layout/PublicMobileBottomNav';
import { AppAccessProvider, useAppAccess } from './contexts/AppAccessContext';
import InstallAppModal from './components/app/InstallAppModal';
import SecretAdminModal from './components/app/SecretAdminModal';
import WebModeBanner from './components/app/WebModeBanner';
import VisitorTracker from './components/VisitorTracker';
import { navigateTo } from './lib/navigation';
import { markAsAppClient } from './lib/appAccessService';

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
const AdminInternalLogin = lazy(() => import('./pages/admin/AdminInternalLogin'));
const AdvancedAnalytics = lazy(() => import('./pages/admin/AdvancedAnalytics'));
const FeatureFlags = lazy(() => import('./pages/admin/FeatureFlags'));
const ModerationQueue = lazy(() => import('./pages/admin/ModerationQueue'));
const BroadcastSystem = lazy(() => import('./pages/admin/BroadcastSystem'));
const SecurityCenter = lazy(() => import('./pages/admin/SecurityCenter'));
const LogMonitoring = lazy(() => import('./pages/admin/LogMonitoring'));
const DatabaseBackup = lazy(() => import('./pages/admin/DatabaseBackup'));
const DeveloperWorkbench = lazy(() => import('./pages/admin/DeveloperWorkbench'));
const AdminSystemSettings = lazy(() => import('./pages/admin/AdminSystemSettings'));
const TalentMarketplace = lazy(() => import('./pages/public/TalentMarketplace'));
const CvGenerator = lazy(() => import('./pages/cv/CvGenerator'));
const LiveInterviewRoom = lazy(() => import('./pages/interview/LiveInterviewRoom'));
import { getActiveSimRole } from './lib/simSession';

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

function Router() {
  const { user, userMeta, loading, configured } = useAuth();
  const {
    isSuperAdmin,
    isViewOnlyWeb,
    installModalOpen,
    installModalAction,
    secretAdminModalOpen,
    requireApp,
    openInstallModal,
    closeInstallModal,
    openSecretAdminModal,
    closeSecretAdminModal,
  } = useAppAccess();
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [authInitialRole, setAuthInitialRole] = useState<UserRole>('seeker');
  const [path, setPath] = useState<string>(() => window.location.pathname);
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const simRole = getActiveSimRole();
  const rawPreviewRole = searchParams?.get('preview_role') || simRole;
  const previewRole = rawPreviewRole && ['admin', 'employer', 'seeker', 'freelancer', 'jasa'].includes(rawPreviewRole) ? rawPreviewRole : null;

  const isGodModeUnlocked = (() => {
    try {
      if (previewRole && previewRole !== 'admin') return false;
      if (previewRole === 'admin' || isSuperAdmin) return true;
      return (
        sessionStorage.getItem('loxer_admin_unlocked') === 'true' ||
        sessionStorage.getItem('app_admin_unlocked') === 'true' ||
        sessionStorage.getItem('loxer_super_admin_bypass') === 'true'
      );
    } catch {
      return false;
    }
  })();
  const isDefaultAdminAccount = (!previewRole || previewRole === 'admin') && (isDefaultAdminEmail(user?.email) || isGodModeUnlocked || isSuperAdmin);
  const effectiveRole = previewRole === 'admin'
    ? 'admin'
    : previewRole === 'employer'
    ? 'employer'
    : previewRole === 'seeker' || previewRole === 'freelancer' || previewRole === 'jasa'
    ? 'seeker'
    : userMeta?.role
    ? userMeta.role
    : isDefaultAdminAccount
    ? 'admin'
    : 'seeker';


  const handleOpenRegister = (role: UserRole = 'seeker') => {
    if (!requireApp('Mendaftar Akun')) {
      return;
    }
    setAuthInitialRole(role);
    setAuthMode('register');
  };

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    const handleDocumentClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = (e.target as HTMLElement)?.closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      if (
        !href ||
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('#') ||
        href.startsWith('blob:') ||
        href.startsWith('javascript:')
      ) {
        return;
      }
      if (target.getAttribute('target') === '_blank' || target.hasAttribute('download')) return;

      e.preventDefault();
      if (window.location.pathname !== href) {
        window.history.pushState({}, '', href);
        setPath(window.location.pathname);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    const handleAppInstalled = () => {
      markAsAppClient();
      closeInstallModal();
      if ('Notification' in window && Notification.permission === 'default') {
        try {
          Notification.requestPermission();
        } catch {
          // ignore
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleDocumentClick);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleDocumentClick);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [closeInstallModal]);

  useEffect(() => {
    const isInterviewPath =
      path === '/interview' ||
      path.startsWith('/interview/') ||
      path === '/live-interview' ||
      path === '/live' ||
      path.startsWith('/live/') ||
      path === '/live-call' ||
      path === '/wawancara' ||
      path === '/interview-ai' ||
      path === '/ai-interview';

    if (isInterviewPath && (!user || (isViewOnlyWeb && !isSuperAdmin))) {
      if (!user) {
        setAuthMode('login');
      }
      if (isViewOnlyWeb && !isSuperAdmin) {
        openInstallModal('Akses Fitur Live Interview AI');
      }
      window.history.replaceState({}, '', '/browse');
      setPath('/browse');
      return;
    }

    if (isViewOnlyWeb && (path.startsWith('/seeker/') || path.startsWith('/employer/'))) {
      requireApp('Mengakses Portal Pengguna');
      window.history.replaceState({}, '', '/browse');
      setPath('/browse');
    } else if (path === '/seeker/marketplace') {
      window.history.replaceState({}, '', '/talents');
      setPath('/talents');
    } else if (path === '/marketplace' || path === '/products') {
      window.history.replaceState({}, '', '/browse');
      setPath('/browse');
    } else if (path === '/admin/editor' || path === '/admin/jobs' || path === '/admin/jasa') {
      window.history.replaceState({}, '', '/admin/dashboard');
      setPath('/admin/dashboard');
    }
  }, [isViewOnlyWeb, path, requireApp, user, isSuperAdmin, openInstallModal]);

  // Mandat Audit: Perketat semua menu halaman publik view-only & wajib munculkan popup instal PWA
  useEffect(() => {
    if (!isViewOnlyWeb) return;

    const isPublicPage =
      path === '/' ||
      path === '' ||
      path === '/browse' ||
      path === '/seeker/browse' ||
      path.startsWith('/talents') ||
      path === '/pelamar' ||
      path === '/pelamar-kerja' ||
      path === '/freelance' ||
      path === '/jasa' ||
      path.startsWith('/cv') ||
      path.startsWith('/buat-cv') ||
      path.startsWith('/cv-maker') ||
      path.startsWith('/cv-generator');

    if (!isPublicPage) return;

    let contextualAction = 'Akses Penuh Layanan Resmi LOXER';
    if (path === '/' || path === '') {
      contextualAction = 'Akses Lengkap Lowongan Kerja & Karir';
    } else if (path === '/browse' || path === '/seeker/browse') {
      contextualAction = 'Melamar Lowongan & Akses Lengkap Loker';
    } else if (path.startsWith('/talents') || path === '/pelamar' || path === '/pelamar-kerja' || path === '/freelance' || path === '/jasa') {
      contextualAction = 'Akses Kontak & Rekrut Tenaga Kerja';
    } else if (path.startsWith('/cv') || path.startsWith('/buat-cv') || path.startsWith('/cv-maker') || path.startsWith('/cv-generator')) {
      contextualAction = 'Buat CV Lengkap, Ekspor PDF & Interview AI';
    }

    const timer = setTimeout(() => {
      openInstallModal(contextualAction);
    }, 600);

    return () => clearTimeout(timer);
  }, [path, isViewOnlyWeb, openInstallModal]);

  const getHomePathByRole = () => {
    if (previewRole === 'admin') return '/admin/dashboard';
    if (previewRole === 'employer') return '/employer/dashboard';
    if (previewRole === 'seeker') return '/seeker/dashboard';
    if (previewRole === 'freelancer' || previewRole === 'jasa') return '/talents';
    if (!user || !effectiveRole) return '/';
    if (effectiveRole === 'admin' || effectiveRole === 'superadmin') return '/admin/dashboard';
    return effectiveRole === 'employer' ? '/employer/dashboard' : '/seeker/dashboard';
  };

  useEffect(() => {
    if (path === '/login') setAuthMode('login');
    if (path === '/register') {
      if (!requireApp('Mendaftar Akun')) {
        window.history.pushState({}, '', '/');
        setPath('/');
        return;
      }
      setAuthInitialRole('seeker');
      setAuthMode('register');
    }
    if (path === '/admin-secret' || path === '/secret-admin') {
      openSecretAdminModal();
    }
  }, [path, requireApp, openSecretAdminModal]);

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
    if (role === 'admin' && (isDefaultAdminAccount || isGodModeUnlocked || effectiveRole === 'superadmin' || effectiveRole === 'admin' || isSuperAdmin)) return true;
    if (role === 'superadmin' && (isDefaultAdminAccount || isGodModeUnlocked || effectiveRole === 'superadmin' || isSuperAdmin)) return true;
    if (isViewOnlyWeb && (role === 'seeker' || role === 'employer')) return false;
    if (previewRole === role) return true;
    if ((previewRole === 'freelancer' || previewRole === 'jasa') && role === 'seeker') return true;
    return Boolean(user && effectiveRole === role);
  };

  const renderPage = () => {
    // Mode Web View-Only: akses portal dashboard Seeker/Employer dialihkan dengan popup edukasi
    if (isViewOnlyWeb && (path.startsWith('/seeker/') || path.startsWith('/employer/'))) {
      return <Browse />;
    }

    if (path === '/seeker/dashboard') return isRoleAuthorized('seeker') ? <SeekerDashboard /> : null;
    if (path === '/browse' || path === '/seeker/browse') return <Browse />;
    if (path === '/seeker/applications') return isRoleAuthorized('seeker') ? <Applications /> : null;
    if (path === '/seeker/profile') return isRoleAuthorized('seeker') ? <SeekerProfile /> : null;
    if (path === '/seeker/marketplace') {
      setTimeout(() => navigateTo('/talents', true), 0);
      return <TalentMarketplace />;
    }
    if (path === '/marketplace' || path === '/products') {
      setTimeout(() => navigateTo('/browse', true), 0);
      return <Browse />;
    }
    if (path === '/talents' || path === '/employer/talents' || path === '/pelamar' || path === '/pelamar-kerja' || path === '/freelance' || path === '/jasa') return <TalentMarketplace />;
  if (path === '/cv' || path === '/buat-cv' || path === '/cv-maker' || path === '/cv-generator') {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <CvGenerator />
      </Suspense>
    );
  }
  if (
    path === '/interview' ||
    path.startsWith('/interview/') ||
    path === '/live-interview' ||
    path === '/live' ||
    path.startsWith('/live/') ||
    path === '/live-call' ||
    path === '/wawancara' ||
    path === '/interview-ai' ||
    path === '/ai-interview'
  ) {
    if (!user) {
      setTimeout(() => {
        setAuthMode('login');
        if (isViewOnlyWeb) openInstallModal('Akses Fitur Live Interview AI');
        navigateTo('/browse', true);
      }, 0);
      return null;
    }
    if (isViewOnlyWeb && !isSuperAdmin) {
      setTimeout(() => {
        openInstallModal('Akses Fitur Live Interview AI');
        navigateTo('/browse', true);
      }, 0);
      return null;
    }

    return (
      <Suspense fallback={<FullScreenLoader message="Menyiapkan Ruang Interview AI (Live)..." />}>
        <LiveInterviewRoom />
      </Suspense>
    );
  }
    if (path === '/employer/dashboard') return isRoleAuthorized('employer') ? <EmployerDashboard /> : null;
    if (path === '/employer/jobs') return isRoleAuthorized('employer') ? <JobListings /> : null;
    if (path === '/employer/jobs/new' || (path.startsWith('/employer/jobs/') && path.endsWith('/edit'))) return isRoleAuthorized('employer') ? <PostJob /> : null;
    if (path === '/employer/applicants') return isRoleAuthorized('employer') ? <Applicants /> : null;
    if (path === '/employer/company') return isRoleAuthorized('employer') ? <CompanyProfile /> : null;

    const normalizedPath = path.toLowerCase().replace(/\/+$/, '') || '/';

    if (
      normalizedPath === '/superadmin' ||
      normalizedPath === '/super-admin' ||
      normalizedPath === '/admin' ||
      normalizedPath === '/akses/superadmin' ||
      normalizedPath === '/akses/admin' ||
      normalizedPath === '/admin-login'
    ) {
      if (normalizedPath === '/admin' && (isRoleAuthorized('admin') || isRoleAuthorized('superadmin'))) {
        setTimeout(() => navigateTo('/admin/dashboard', true), 0);
        return <AdminDashboard tab="overview" />;
      }
      return <AdminInternalLogin />;
    }

    if (normalizedPath.startsWith('/admin/') || normalizedPath === '/admin') {
      const isSuper = isRoleAuthorized('superadmin');
      const isAdmin = isRoleAuthorized('admin') || isSuper;

      if (!isAdmin) {
        if (effectiveRole === 'employer') {
          setTimeout(() => {
            if (isViewOnlyWeb) openInstallModal('Akses Portal Perusahaan LOXER');
            navigateTo('/employer/dashboard', true);
          }, 0);
          return null;
        }
        if (effectiveRole === 'seeker') {
          setTimeout(() => {
            if (isViewOnlyWeb) openInstallModal('Akses Portal Pekerja LOXER');
            navigateTo('/seeker/dashboard', true);
          }, 0);
          return null;
        }
        return null;
      }

      const adminPages: Record<string, JSX.Element> = {
        '/admin/dashboard': <AdminDashboard tab="overview" />,
        '/admin/users': <AdminDashboard tab="users" />,
        '/admin/user-data': <AdminDashboard tab="users" subTab="intelligence" />,
        '/admin/devices': <AdminDashboard tab="users" subTab="devices" />,
        '/admin/applications': <AdminDashboard tab="applications" />,
        '/admin/traffic': <AdminDashboard tab="applications" subTab="traffic" />,
        '/admin/live': <AdminDashboard tab="applications" subTab="traffic" />,
        '/admin/companies': <AdminDashboard tab="companies" />,
        '/admin/integrations': <AdminDashboard tab="integrations" />,
        '/admin/moderation': <ModerationQueue />,
        '/admin/settings': <AdminSystemSettings />,
      };

      if (normalizedPath === '/admin/editor' || normalizedPath === '/admin/jobs' || normalizedPath === '/admin/jasa') {
        setTimeout(() => navigateTo('/admin/dashboard', true), 0);
        return <AdminDashboard tab="overview" />;
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
        '/admin/settings': <AdminSystemSettings />,
      };

      if (superPages[normalizedPath] && !isSuper && normalizedPath !== '/admin/settings') {
        setTimeout(() => navigateTo('/admin/dashboard', true), 0);
        return <AdminDashboard tab="overview" />;
      }

      const page = adminPages[normalizedPath] || (isSuper ? superPages[normalizedPath] : null);
      return page || null;
    }

    return null;
  };

  const page = renderPage();
  const normalizedCurrentPath = path.toLowerCase().replace(/\/+$/, '') || '/';

  if (page === null && path !== '/') {
    if ((path === '/login' || path === '/register') && !user) {
      // Allow unauthenticated visitor to view the login or register modal on homepage
    } else if (
      normalizedCurrentPath === '/superadmin' ||
      normalizedCurrentPath === '/super-admin' ||
      normalizedCurrentPath === '/admin' ||
      normalizedCurrentPath === '/akses/superadmin' ||
      normalizedCurrentPath === '/akses/admin' ||
      normalizedCurrentPath === '/admin-login'
    ) {
      // Allow unauthenticated internal staff to access the portal
    } else {
      const homePath = getHomePathByRole();
      if (homePath !== path && !homePath.startsWith(path)) {
        setTimeout(() => navigateTo(homePath, true), 0);
      }
      return null;
    }
  }

  return (
    <>
      <OfflineIndicator />
      <InstallAppModal
        isOpen={installModalOpen}
        actionTitle={installModalAction}
        onClose={closeInstallModal}
      />
      <SecretAdminModal
        isOpen={secretAdminModalOpen}
        onClose={closeSecretAdminModal}
      />
      <WebModeBanner />
      {page ? (
        <Suspense fallback={<FullScreenLoader message="Menyiapkan halaman..." />}>
          {page}
        </Suspense>
      ) : (
        <div className="bg-slate-50 dark:bg-[#071220] text-slate-800 dark:text-slate-100 min-h-screen pb-20 md:pb-0 transition-colors duration-200">
          <Navbar
            onLogin={() => setAuthMode('login')}
            onRegister={handleOpenRegister}
          />
          <Homepage
            onLogin={() => setAuthMode('login')}
            onRegister={handleOpenRegister}
          />
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
        <AppAccessProvider>
          <VisitorTracker />
          <Router />
        </AppAccessProvider>
      </DeviceProvider>
    </AuthProvider>
  );
}
