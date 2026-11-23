import './styles.css';
import { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider, useApp } from './lib/store.jsx';
import { auth } from './lib/sb.js';
import { match, navigate, useLocation } from './lib/router.js';
import { PageLoader, ToastHost } from './ui.jsx';
import { Mark } from './lib/icons.jsx';
import Landing from './pages/Landing.jsx';
import { AuthPage } from './pages/Auth.jsx';

const Onboarding = lazy(() => import('./pages/Onboarding.jsx'));
const Workspace = lazy(() => import('./pages/Workspace.jsx'));
const FormShell = lazy(() => import('./pages/FormShell.jsx'));
const Respondent = lazy(() => import('./pages/Respondent.jsx'));
const RespondentChat = lazy(() => import('./pages/RespondentChat.jsx'));
const PublicReport = lazy(() => import('./pages/Report.jsx').then((m) => ({ default: m.PublicReport })));
const ReportEditor = lazy(() => import('./pages/Report.jsx').then((m) => ({ default: m.ReportEditor })));
const Settings = lazy(() => import('./pages/Settings.jsx'));
const Billing = lazy(() => import('./pages/Billing.jsx'));
const Apps = lazy(() => import('./pages/Apps.jsx'));
const BrandKits = lazy(() => import('./pages/BrandKits.jsx'));
const Inbox = lazy(() => import('./pages/Inbox.jsx'));
const Goodbye = lazy(() => import('./pages/Goodbye.jsx'));

function Splash() {
  return (
    <div className="splash" role="status" aria-label="Loading Qwery">
      <span className="splash-mark"><Mark size={64} color="var(--ink-900)" /></span>
      <p className="splash-line">Make forms worth talking about</p>
    </div>
  );
}

function Redirect({ to }) {
  useEffect(() => { navigate(to, { replace: true }); }, [to]);
  return null;
}

function Guard({ children, needsOrg = true }) {
  const app = useApp();
  if (!app.user) return <Redirect to={'/login?next=' + encodeURIComponent(location.pathname)} />;
  if (!app.ready) return <Splash />;
  if (auth.mfa.verifiedFactors().length && auth.aal() !== 'aal2') return <Redirect to="/login/verify" />;
  if (needsOrg && !app.org) return <Splash />;
  return children;
}

function Routes() {
  const { path } = useLocation();
  const app = useApp();
  let m;
  const page = (() => {
    if (path === '/') return <Landing />;
    if ((m = match('/to/:slug', path))) return <Respondent slug={m.slug} />;
    if ((m = match('/c/:token', path))) return <RespondentChat token={m.token} />;
    if ((m = match('/report/:token', path))) return <PublicReport token={m.token} />;
    if (path === '/bye') return <Goodbye />;
    if (['/signup', '/signup/email', '/login', '/login/verify', '/forgot-password', '/forgot-password/sent', '/reset-password', '/auth/callback'].includes(path)) return <AuthPage path={path} />;
    if (path === '/splash') return <Splash />;
    if (path === '/onboarding') return <Guard><Onboarding /></Guard>;
    if ((m = match('/workspace/:ws?', path))) return <Guard><Workspace wsId={m.ws} /></Guard>;
    if (match('/conversations/:id?', path)) return <Guard><Inbox /></Guard>;
    if ((m = match('/forms/:id/report', path))) return <Guard><ReportEditor formId={m.id} /></Guard>;
    if ((m = match('/forms/:id/:tab?/:sub?', path))) return <Guard><FormShell formId={m.id} tab={m.tab || 'create'} sub={m.sub} /></Guard>;
    if ((m = match('/apps/:cat?', path))) return <Guard><Apps cat={m.cat} /></Guard>;
    if ((m = match('/brand-kits/:id?/:tab?', path))) return <Guard><BrandKits id={m.id} tab={m.tab} /></Guard>;
    if ((m = match('/plans', path)) || (m = match('/checkout', path)) || (m = match('/cancel-plan', path))) return <Guard><Billing path={path} /></Guard>;
    if ((m = match('/org/:page?', path))) return <Guard><Settings area="org" page={m.page || 'admin'} /></Guard>;
    if ((m = match('/account/:page?', path))) return <Guard><Settings area="account" page={m.page || 'settings'} /></Guard>;
    return <NotFound />;
  })();
  const seg = path.split('/');
  const routeKey = ['forms', 'to', 'c', 'report'].includes(seg[1]) ? seg.slice(0, 3).join('/') : seg.slice(0, 2).join('/');
  return <Suspense fallback={<Splash />}><div key={routeKey} className="route">{page}</div></Suspense>;
}

function NotFound() {
  return (
    <div className="page-loader col gap-16" style={{ textAlign: 'center', padding: 24 }}>
      <p className="t-display-l">This page wandered off.</p>
      <p className="muted">The link may be broken, or the form was unpublished.</p>
      <a className="btn btn-primary btn-l" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Back to Qwery</a>
    </div>
  );
}

function Root() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const type = auth.consumeHash();
    if (type === 'recovery') navigate('/reset-password', { replace: true });
    else if (type && location.pathname === '/auth/callback') navigate('/workspace', { replace: true });
    setReady(true);
  }, []);
  if (!ready) return <PageLoader />;
  return (
    <AppProvider>
      <ToastHost>
        <Routes />
      </ToastHost>
    </AppProvider>
  );
}

createRoot(document.getElementById('root')).render(<Root />);
