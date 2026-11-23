import { useEffect, useMemo, useState } from 'react';
import { GoogleLogo, Icon, Logo, Mark } from '../lib/icons.jsx';
import { Link, navigate } from '../lib/router.js';
import { auth, SUPABASE_KEY, SUPABASE_URL } from '../lib/sb.js';
import { useApp } from '../lib/store.jsx';
import { Btn, Check, cx, QType, useToast } from '../ui.jsx';

/* ---------- Product preview shown on the right of auth screens ---------- */
function MiniEditor() {
  const qs = [
    ['short_text', 'Which walking-tour did you join?'],
    ['opinion_scale', 'How much would you rate your experience?'],
    ['contact_info', 'Where can we send group pictures from your tour?'],
    ['multiple_choice', 'Which tour locations interest you the most?'],
  ];
  return (
    <div style={{ width: 1440, height: 900, background: '#fff', borderRadius: 16, overflow: 'hidden', '--t-answer': '#4d4de1', '--t-answer-10': 'rgba(77,77,225,.1)', '--t-answer-30': 'rgba(77,77,225,.3)', '--t-answer-60': 'rgba(77,77,225,.6)', '--t-key-bg': 'rgba(255,255,255,.8)', '--t-radius': '999px', '--t-question': '#191919' }}>
      <div className="ed-head">
        <div className="side crumb"><Icon name="grid" /> My workspace <Icon name="chevron-right" size={12} /> My new form</div>
        <div className="tabs-c">{['Create', 'Logic', 'Connect', 'Share', 'Results'].map((t, i) => <span key={t} className={cx('toptab', i === 0 && 'on')}>{t}</span>)}</div>
        <div className="side" />
      </div>
      <div className="ed-body" style={{ height: 846 }}>
        <div className="ed-left">
          <div className="ed-qpanel" style={{ flex: 'none', height: 521 }}>
            {qs.map(([t, l], i) => <div key={i} className={cx('qitem', i === 3 && 'on')}><QType type={t} n={i + 1} /><span className="t">{l}</span></div>)}
          </div>
          <div className="ed-handle"><span /></div>
          <div className="ed-endings"><div className="row between" style={{ paddingLeft: 8 }}><span style={{ fontSize: 15 }}>Endings</span><span className="icon-btn boxed"><Icon name="plus" /></span></div></div>
        </div>
        <div className="ed-center">
          <div className="canvas-toolbar"><span className="btn btn-secondary"><Icon name="plus" />Add content</span>{['phone', 'play', 'accessibility', 'sparkle', 'translate', 'settings'].map((i) => <span key={i} className="icon-btn lg"><Icon name={i} /></span>)}</div>
          <div className="ed-stage">
            <div className="qcard" style={{ maxHeight: 478 }}>
              <div className="inner">
                <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
                  <span className="qnum">4</span>
                  <div className="col gap-6 grow">
                    <span className="q-title">Which tour locations interest you the most?</span>
                    <span className="q-desc ph">Description (optional)</span>
                    <div className="col gap-8" style={{ marginTop: 10 }}>
                      {['Blok M', 'Menteng', 'Chinatown', 'Kota Tua', 'Other/None'].map((c, i) => <span key={c} className="choice" style={{ width: 170 }}><span className="key">{'ABCDE'[i]}</span><span className="lbl">{c}</span></span>)}
                      <span className="add-choice">Add choice</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniInsights() {
  return (
    <div style={{ width: 1440, height: 900, background: '#fff', borderRadius: 16, overflow: 'hidden' }}>
      <div className="ed-head">
        <div className="side crumb"><Icon name="grid" /> My workspace <Icon name="chevron-right" size={12} /> Product feedback</div>
        <div className="tabs-c">{['Create', 'Logic', 'Connect', 'Share', 'Results'].map((t) => <span key={t} className={cx('toptab', t === 'Results' && 'on')}>{t}</span>)}</div>
        <div className="side" />
      </div>
      <div className="res-tabs">{['Smart Insights', 'Insights', 'Responses', 'Conversations'].map((t, i) => <span key={t} className={cx('tab', i === 1 && 'on')}>{t}<span className="bar" /></span>)}</div>
      <div style={{ background: 'var(--q-bg-canvas)', height: '100%', padding: '24px 145px' }}>
        <p className="t-h2" style={{ margin: '28px 0 20px' }}>Big picture</p>
        <div className="row gap-32">
          {[['Views', '2,140'], ['Starts', '1,540'], ['Submissions', '1,284'], ['Completion rate', '83.3%'], ['Time to complete', '01:52']].map(([a, b]) => (
            <div key={a} className="col gap-4"><span className="t-body-s muted">{a}</span><span style={{ fontSize: 40 }}>{b}</span></div>
          ))}
        </div>
        <div className="card" style={{ marginTop: 24, padding: 14, height: 280 }}>
          <div style={{ background: 'var(--q-bg-upgrade)', height: '100%', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Icon name="message" size={32} />
            <span className="t-h3">Question drop-off rate</span>
            <span className="t-body-s muted" style={{ textAlign: 'center', maxWidth: 360 }}>See where people abandon your form — and which questions trigger the most conversations.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthShell({ children, preview = 'editor', legal = true }) {
  return (
    <div className="auth-page">
      <nav className="auth-nav">
        <Link to="/" aria-label="Qwery home"><Logo height={26} /></Link>
        <div className="mid"><Link to="/signup">Templates</Link><Link to="/signup">Pricing</Link><Link to="/">Blog</Link></div>
        <div className="row gap-20">
          <Link to="/login" className="t-label-l" style={{ textDecoration: 'none' }}>Log in</Link>
          <button className="btn btn-primary" style={{ height: 42, padding: '0 18px', borderRadius: 10, fontSize: 15 }} onClick={() => navigate('/signup')}>Start for free</button>
        </div>
      </nav>
      <div className="auth-card">
        <div key={location.pathname} className="auth-panel">
          <Mark size={36} />
          <div className="content">{children}</div>
          {legal && <p className="auth-legal">By continuing you agree to Qwery’s <a href="#terms">Terms</a> and <a href="#privacy">Privacy Policy</a>.</p>}
        </div>
        <div className="auth-preview" aria-hidden="true">
          <div className="window" style={{ transform: 'scale(.625)' }}>{preview === 'insights' ? <MiniInsights /> : <MiniEditor />}</div>
          <div className="fade" />
        </div>
      </div>
    </div>
  );
}

function Heading({ a, b }) { return <h1 className="auth-heading">{a}<span>{b}</span></h1>; }

function Back({ to }) {
  return <button className="row gap-6 t-body-s" style={{ fontSize: 15 }} onClick={() => (to ? navigate(to) : history.back())}><Icon name="arrow-left" size={16} />Back</button>;
}

function PwInput({ value, onChange, placeholder = 'Password (8+ characters)', state, autoFocus, autoComplete = 'new-password', ok }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input className={cx('input', state)} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} autoFocus={autoFocus} aria-label={placeholder} />
      <span className="adorn">
        <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)}><Icon name={show ? 'eye-off' : 'eye'} /></button>
        {ok && <span style={{ color: 'var(--green-500)' }}><Icon name="check" /></span>}
      </span>
    </div>
  );
}

export function scorePassword(pw) {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (pw.length >= 12 && /[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (pw.length < 8) return Math.min(s, 1) || 1;
  return Math.max(s, 1);
}
const strongEnough = (pw) => pw.length >= 8 && /[0-9!@#$%^&*()_+\-=[\]{};:'",.<>/?\\|`~]/.test(pw);

function SocialButtons({ onSso }) {
  const toast = useToast();
  const google = async () => {
    try {
      const s = await auth.settings();
      if (!s?.external?.google) { toast('Google sign-in isn’t switched on for this workspace yet. Use email for now.'); return; }
      auth.oauth('google');
    } catch { toast('Couldn’t reach the sign-in service. Try again.', { error: true }); }
  };
  return (
    <div className="col gap-10">
      <button className="social-btn" onClick={google}><GoogleLogo size={18} />Continue with Google</button>
      <button className="social-btn" onClick={onSso}><Icon name="lock" />Continue with SSO</button>
    </div>
  );
}

function SsoForm({ onBack }) {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr(''); setBusy(true);
    try {
      const domain = email.split('@')[1];
      if (!domain) throw new Error('Enter your work email.');
      const r = await fetch(`${SUPABASE_URL}/auth/v1/sso`, { method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ domain, redirect_to: location.origin + '/auth/callback', skip_http_redirect: true }) });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error('There’s no SSO connection set up for ' + domain + '. Ask your admin, or use email instead.');
      location.href = d.url;
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <>
      <Back to={null} />
      <Heading a="Single sign-on" b="with your company account." />
      <input className={cx('input', err && 'error')} placeholder="Work email…" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} autoFocus aria-label="Work email" />
      {err && <p className="err">{err}</p>}
      <Btn kind="accent" className="btn-xl" loading={busy} onClick={go} disabled={!email}>Continue with SSO</Btn>
      <button className="t-body-s link" onClick={onBack}>Use another method</button>
    </>
  );
}

/* ---------------- Sign up ---------------- */
function SignupStart() {
  const [email, setEmail] = useState(sessionStorage.getItem('qwery.signup.email') || '');
  const [sso, setSso] = useState(false);
  if (sso) return <AuthShell><SsoForm onBack={() => setSso(false)} /></AuthShell>;
  const go = () => { sessionStorage.setItem('qwery.signup.email', email); navigate('/signup/email'); };
  return (
    <AuthShell>
      <div className="col gap-24" style={{ marginTop: 20 }}>
        <Heading a="Make forms" b="that talk back." />
        <div className="feature-list">
          <span className="row gap-12"><Icon name="message" />Turn any answer into a conversation</span>
          <span className="row gap-12"><Icon name="sparkle" />AI summaries of every response</span>
          <span className="row gap-12"><Icon name="link" />Share anywhere with qwery.to</span>
        </div>
        <SocialButtons onSso={() => setSso(true)} />
        <div className="divider" />
        <div className="col gap-10">
          <input className="input" type="email" placeholder="Your email…" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && email && go()} aria-label="Your email" autoComplete="email" />
          <button className={cx('btn', 'btn-xl', email ? 'btn-primary' : '')} disabled={!email} onClick={go} style={!email ? { background: 'var(--q-bg-subtle)', color: 'var(--q-text-secondary)' } : undefined}>Continue with email</button>
        </div>
      </div>
    </AuthShell>
  );
}

function SignupForm() {
  const toast = useToast();
  const [email, setEmail] = useState(sessionStorage.getItem('qwery.signup.email') || '');
  const [pw, setPw] = useState('');
  const [terms, setTerms] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState({ tips: true, personalise: true, enrich: false });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const score = scorePassword(pw);
  const ok = strongEnough(pw);
  const canSubmit = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) && ok && terms;
  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      await auth.signUp({ email, password: pw, name: email.split('@')[0], prefs });
      sessionStorage.removeItem('qwery.signup.email');
      toast('Account created — welcome to Qwery!', { ok: true });
      navigate('/onboarding', { replace: true });
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <AuthShell legal={!prefsOpen}>
      <Back to="/signup" />
      <Heading a="Create your account" b="in under a minute." />
      <div className="col gap-10">
        <input className="input" type="email" placeholder="Your email…" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Your email" autoComplete="email" />
        <div className="col">
          <PwInput value={pw} onChange={setPw} state={pw ? (ok ? 'success' : 'error') : ''} ok={ok} />
          {pw && (
            <>
              <div className="strength" aria-hidden="true">
                {[1, 2, 3, 4].map((i) => <span key={i} style={{ background: i <= score ? (ok ? 'var(--green-500)' : 'var(--red-500)') : undefined }} />)}
              </div>
              <p className="t-body-s" style={{ marginTop: 8, color: ok ? 'var(--green-500)' : 'var(--red-500)' }}>{ok ? 'Strong password' : 'Too weak. Try 8+ characters with a number or symbol.'}</p>
            </>
          )}
        </div>
      </div>
      <label className="row gap-12" style={{ alignItems: 'flex-start', fontSize: 14, cursor: 'pointer' }}>
        <Check on={terms} onChange={setTerms} label="Accept terms" />
        <span>I agree to the <a href="#terms">Terms</a>, <a href="#privacy">Privacy Policy</a> and <a href="#dpa">Data Processing Agreement</a>.</span>
      </label>
      <div className="pref-box">
        <button className="pref-head" onClick={() => setPrefsOpen((o) => !o)} aria-expanded={prefsOpen}>
          <Icon name="settings" /><span className="grow" style={{ textAlign: 'left' }}>Email &amp; data preferences</span><Icon name={prefsOpen ? 'chevron-up' : 'chevron-down'} />
        </button>
        {prefsOpen && [['tips', 'Product tips and ideas by email'], ['personalise', 'Personalise Qwery from my activity'], ['enrich', 'Enrich my profile with trusted partners']].map(([k, l]) => (
          <div key={k} className="pref-row">
            <span>{l}</span>
            <div className="yesno" role="radiogroup" aria-label={l}>
              <button className={prefs[k] ? 'on' : ''} onClick={() => setPrefs({ ...prefs, [k]: true })}>Yes</button>
              <button className={!prefs[k] ? 'on' : ''} onClick={() => setPrefs({ ...prefs, [k]: false })}>No</button>
            </div>
          </div>
        ))}
      </div>
      {err && <p className="err">{err} {/already exists/.test(err) && <Link to="/login" className="link">Log in</Link>}</p>}
      <Btn kind={canSubmit ? 'accent' : 'soft'} className="btn-xl" disabled={!canSubmit} loading={busy} onClick={submit}>Create account</Btn>
    </AuthShell>
  );
}

/* ---------------- Log in ---------------- */
function Login() {
  const app = useApp();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sso, setSso] = useState(false);
  const next = new URLSearchParams(location.search).get('next') || '/workspace';
  useEffect(() => { if (app.user && (!auth.mfa.verifiedFactors().length || auth.aal() === 'aal2')) navigate(next, { replace: true }); }, [app.user, next]);
  if (sso) return <AuthShell preview="insights"><SsoForm onBack={() => setSso(false)} /></AuthShell>;
  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      const s = await auth.signIn({ email, password: pw });
      const factors = (s.user?.factors || []).filter((f) => f.status === 'verified');
      navigate(factors.length ? '/login/verify?next=' + encodeURIComponent(next) : next, { replace: true });
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <AuthShell preview="insights">
      <Heading a="Welcome back" b="to Qwery." />
      <SocialButtons onSso={() => setSso(true)} />
      <div className="row gap-12 tertiary t-caption"><span className="divider" style={{ flex: 1 }} />or<span className="divider" style={{ flex: 1 }} /></div>
      <form className="col gap-10" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <input className="input" type="email" placeholder="Your email…" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" autoComplete="email" />
        <PwInput value={pw} onChange={setPw} placeholder="Password" autoComplete="current-password" />
        <Link to="/forgot-password" className="t-body-s u" style={{ alignSelf: 'flex-start' }}>Forgot password?</Link>
        {err && <p className="err">{err}</p>}
        <button type="submit" className={cx('btn', 'btn-xl', email && pw ? 'btn-accent' : '')} disabled={!email || !pw || busy} style={!email || !pw ? { background: 'var(--q-bg-subtle)', color: 'var(--q-text-tertiary)' } : undefined}>{busy ? <span className="spin" /> : 'Log in'}</button>
      </form>
      <p className="t-body-s muted">New to Qwery? <Link to="/signup" className="link" style={{ color: 'var(--q-text-primary)' }}>Create an account</Link></p>
    </AuthShell>
  );
}

function CenterCard({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--q-bg-canvas)', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '110px 16px' }}>
      <div className="card" style={{ width: 300, padding: '18px 26px 20px', borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
        <Logo height={16} />
        {children}
      </div>
    </div>
  );
}

function VerifyMfa() {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const next = new URLSearchParams(location.search).get('next') || '/workspace';
  const factor = auth.mfa.verifiedFactors()[0];
  useEffect(() => { if (!auth.aal() || !factor) navigate('/login', { replace: true }); }, [factor]);
  const verify = async () => {
    setErr(''); setBusy(true);
    try { await auth.mfa.challengeAndVerify(factor.id, code.trim()); navigate(next, { replace: true }); }
    catch (e) { setErr(/invalid/i.test(e.message) ? 'That code didn’t work. Check your authenticator and try again.' : e.message); } finally { setBusy(false); }
  };
  return (
    <CenterCard>
      <span className="avatar lg grey" style={{ width: 56, height: 56 }}><Icon name="shield" size={22} /></span>
      <p className="t-label-l">Two-factor authentication</p>
      <p className="t-body-s muted">Enter the 6-digit code from your authenticator app to finish logging in.</p>
      <div className="col gap-6" style={{ width: '100%', textAlign: 'left' }}>
        <label className="t-label-s">Verification code</label>
        <input className="field sq" style={{ height: 40, letterSpacing: '.3em', textAlign: 'center' }} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && verify()} autoFocus aria-label="Verification code" />
      </div>
      {err && <p className="err" style={{ fontSize: 12 }}>{err}</p>}
      <Btn kind="primary" style={{ width: '100%', height: 36, fontSize: 15 }} loading={busy} disabled={code.length !== 6} onClick={verify}>Verify</Btn>
      <button className="t-caption muted" onClick={async () => { await auth.signOut(); navigate('/login'); }}>Back to log in</button>
    </CenterCard>
  );
}

/* ---------------- Password reset ---------------- */
function Forgot() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const send = async () => {
    setBusy(true); setErr('');
    try { await auth.recover(email); sessionStorage.setItem('qwery.reset.email', email); navigate('/forgot-password/sent'); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <AuthShell preview="insights">
      <Back to="/login" />
      <Heading a="Forgot your password?" b="We’ll email you a reset link." />
      <input className="input" type="email" placeholder="Your email…" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && email && send()} aria-label="Email" autoFocus />
      {err && <p className="err">{err}</p>}
      <Btn kind={email ? 'accent' : 'soft'} className="btn-xl" disabled={!email} loading={busy} onClick={send}>Send reset link</Btn>
    </AuthShell>
  );
}

function ResetSent() {
  const email = sessionStorage.getItem('qwery.reset.email') || 'your inbox';
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <AuthShell preview="insights">
      <span style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--q-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="mail" size={22} /></span>
      <div className="col gap-14">
        <Heading a="Check your inbox" b="to reset your password." />
        <p className="t-body-m">We sent a reset link to {email}.</p>
      </div>
      <a className="btn btn-accent btn-xl" href="mailto:" style={{ textDecoration: 'none' }}>Open email app</a>
      <p className="t-body-s">Didn’t get it? <button className="link t-label-m" disabled={busy} onClick={async () => { setBusy(true); try { await auth.recover(email); toast('Link sent again', { ok: true }); } catch (e) { toast(e.message, { error: true }); } setBusy(false); }}>Resend link</button></p>
    </AuthShell>
  );
}

function ResetPassword() {
  const app = useApp();
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const email = app.user?.email || '';
  const rules = useMemo(() => [
    ['At least 8 characters', a.length >= 8],
    ['A number and a symbol', /[0-9]/.test(a) && /[^A-Za-z0-9]/.test(a)],
    ['Not your name or email', !!a && !(email && a.toLowerCase().includes(email.split('@')[0].toLowerCase()))],
    ['Passwords match', !!a && a === b],
  ], [a, b, email]);
  const valid = rules.every((r) => r[1]);
  if (!app.user) {
    return (
      <AuthShell preview="insights">
        <Heading a="This reset link" b="has expired." />
        <p className="t-body-m muted">Reset links work once and expire after an hour. Request a fresh one.</p>
        <Btn kind="accent" className="btn-xl" onClick={() => navigate('/forgot-password')}>Send a new link</Btn>
      </AuthShell>
    );
  }
  const save = async () => {
    setBusy(true); setErr('');
    try { await auth.update({ password: a }); navigate('/workspace', { replace: true }); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <AuthShell preview="insights" legal={false}>
      <Heading a="Choose a new password" b="you haven’t used before." />
      {b && a !== b && <div className="callout"><span className="x"><Icon name="x" size={12} /></span>Your passwords don’t match yet.</div>}
      {err && <div className="callout"><span className="x"><Icon name="x" size={12} /></span>{err}</div>}
      <div className="col gap-10">
        <PwInput value={a} onChange={setA} placeholder="New password" />
        <PwInput value={b} onChange={setB} placeholder="Confirm new password" state={b && a !== b ? 'error' : ''} />
        {b && a !== b && <span className="err">Passwords must match</span>}
      </div>
      <div className="rule-list">
        {rules.map(([l, ok]) => <span key={l} className="r"><span className={cx('dot', ok && 'ok')}>{ok && <Icon name="check" />}</span>{l}</span>)}
      </div>
      <Btn kind={valid ? 'accent' : 'soft'} className="btn-xl" disabled={!valid} loading={busy} onClick={save}>Update password</Btn>
    </AuthShell>
  );
}

export function AuthPage({ path }) {
  switch (path) {
    case '/signup': return <SignupStart />;
    case '/signup/email': return <SignupForm />;
    case '/login': return <Login />;
    case '/login/verify': return <VerifyMfa />;
    case '/forgot-password': return <Forgot />;
    case '/forgot-password/sent': return <ResetSent />;
    case '/reset-password': return <ResetPassword />;
    case '/auth/callback': navigate('/workspace', { replace: true }); return null;
    default: return null;
  }
}
