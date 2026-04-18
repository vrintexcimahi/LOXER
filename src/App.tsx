import { lazy, Suspense, useEffect, useState } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/useAuth';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { isDefaultAdminEmail } from './lib/constants';
import Homepage from './pages/Homepage';

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
  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const path = window.location.pathname;
  const isDefaultAdminAccount = isDefaultAdminEmail(user?.email);
  const effectiveRole = isDefaultAdminAccount ? 'admin' : userMeta?.role;

  const getHomePathByRole = () => {
    if (!user || !effectiveRole) return '/';
    if (effectiveRole === 'admin') return '/admin/dashboard';
    return effectiveRole === 'employer' ? '/employer/dashboard' : '/seeker/dashboard';
  };

  useEffect(() => {
    if (path === '/login') setAuthMode('login');
    if (path === '/register') setAuthMode('register');
  }, [path]);

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

  const renderPage = () => {
    if (path === '/seeker/dashboard') return user && effectiveRole === 'seeker' ? <SeekerDashboard /> : null;
    if (path === '/seeker/browse') return <Browse />;
    if (path === '/seeker/applications') return user && effectiveRole === 'seeker' ? <Applications /> : null;
    if (path === '/seeker/profile') return user && effectiveRole === 'seeker' ? <SeekerProfile /> : null;
    if (path === '/employer/dashboard') return user && effectiveRole === 'employer' ? <EmployerDashboard /> : null;
    if (path === '/employer/jobs') return user && effectiveRole === 'employer' ? <JobListings /> : null;
    if (path === '/employer/jobs/new') return user && effectiveRole === 'employer' ? <PostJob /> : null;
    if (path === '/employer/applicants') return user && effectiveRole === 'employer' ? <Applicants /> : null;
    if (path === '/employer/company') return user && effectiveRole === 'employer' ? <CompanyProfile /> : null;

    if (path.startsWith('/admin/')) {
      const adminPages: Record<string, JSX.Element> = {
        '/admin/dashboard': <AdminDashboard tab="overview" />,
        '/admin/users': <AdminDashboard tab="users" />,
        '/admin/jobs': <AdminDashboard tab="jobs" />,
        '/admin/applications': <AdminDashboard tab="applications" />,
        '/admin/companies': <AdminDashboard tab="companies" />,
        '/admin/logs': <AdminDashboard tab="logs" />,
        '/admin/integrations': <AdminDashboard tab="integrations" />,
        '/admin/analytics': <AdvancedAnalytics />,
        '/admin/flags': <FeatureFlags />,
        '/admin/moderation': <ModerationQueue />,
        '/admin/broadcast': <BroadcastSystem />,
        '/admin/security': <SecurityCenter />,
      };

      const page = adminPages[path];
      if (!page) return null;
      return user && effectiveRole === 'admin' ? page : null;
    }

    return null;
  };

  const page = renderPage();

  if (page === null && path !== '/') {
    window.location.href = getHomePathByRole();
    return null;
  }

  if (page) {
    return (
      <Suspense fallback={<FullScreenLoader message="Menyiapkan halaman..." />}>
        {page}
      </Suspense>
    );
  }

  return (
    <div className="bg-sky-50 min-h-screen">
      <Navbar
        onLogin={() => setAuthMode('login')}
        onRegister={() => setAuthMode('register')}
      />
      <Homepage
        onLogin={() => setAuthMode('login')}
        onRegister={() => setAuthMode('register')}
      />
      <Footer />

      {authMode && (
        <Suspense fallback={null}>
          <AuthModal
            mode={authMode}
            onClose={() => {
              setAuthMode(null);
              if (path === '/login' || path === '/register') window.history.pushState({}, '', '/');
            }}
            onSwitchMode={setAuthMode}
          />
        </Suspense>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  );
}
