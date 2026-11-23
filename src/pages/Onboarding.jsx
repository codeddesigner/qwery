import { useState } from 'react';
import { OkButton } from '../components/QuestionView.jsx';
import { Icon, Logo } from '../lib/icons.jsx';
import { DEFAULT_THEME } from '../lib/questions.js';
import { navigate } from '../lib/router.js';
import { db } from '../lib/sb.js';
import { useApp } from '../lib/store.jsx';
import { cx, useToast } from '../ui.jsx';
import { themeVars } from '../lib/questions.js';
import { createForm } from './Workspace.jsx';

export function Steps({ step, labels = ['Create your account', 'Customize your experience', 'Create your first form'], accent }) {
  return (
    <div className={cx('steps', accent && 'accent')} aria-label={`Step ${step} of ${labels.length}`}>
      {labels.map((l, i) => (
        <span key={l} className="row gap-10">
          {i > 0 && <span className={cx('line', i < step && 'done')} />}
          <span className={cx('s', i + 1 === step && 'cur')}>
            <span className={cx('n', i + 1 < step && 'done', i + 1 === step && 'cur')}>{i + 1 < step ? <Icon name="check" /> : i + 1}</span>{l}
          </span>
        </span>
      ))}
    </div>
  );
}

const QS = [
  { key: 'use', title: (n) => <>{n}, what’s <b>the main thing</b> you’ll be using Qwery for? *</>, options: ['School', 'Work', 'Personal'] },
  { key: 'role', title: () => <>What best <b>describes your role</b>? *</>, options: ['Founder or executive', 'Product or design', 'Marketing', 'Research', 'Customer support', 'Something else'] },
  { key: 'help', title: () => <>What do you want Qwery to help with? *</>, options: ['Get feedback', 'Get more customers and sales', 'Recruit talent', 'Engage or educate my audience', 'Conduct research', 'Manage events, projects or requests'] },
];

export default function Onboarding() {
  const app = useApp();
  const toast = useToast();
  const [i, setI] = useState(0);
  const [ans, setAns] = useState(app.profile?.onboarding || {});
  const [url, setUrl] = useState('https://');
  const [busy, setBusy] = useState(false);
  const first = (app.profile?.name || 'there').split(/[ ._]/)[0].replace(/^./, (c) => c.toUpperCase());

  const finish = async (brand) => {
    setBusy(true);
    try {
      await db.from('profiles').update({ onboarding: { ...ans, done: true, website: brand?.url || null } }).eq('id', app.user.id);
      let theme = null;
      if (brand && (brand.colors?.length || brand.logo)) {
        const accent = brand.colors?.[0] || DEFAULT_THEME.answer;
        theme = { ...DEFAULT_THEME, name: `${brand.name || 'My brand'} theme`, answer: accent, button: accent, logo: brand.logo || '' };
        await db.from('brand_kits').insert({ org_id: app.org.id, name: `${brand.name || 'My'} brand kit`, assets: { logos: brand.logo ? [{ id: 'l1', name: 'Logos', items: [brand.logo] }] : [], colors: [{ id: 'c1', name: 'Colors', items: brand.colors || [] }], fonts: [], media: [] }, themes: [theme] });
        await db.from('themes').insert({ org_id: app.org.id, name: theme.name, config: theme });
      }
      app.setProfile({ onboarding: { ...ans, done: true } });
      const ws = app.workspaces[0];
      const form = await createForm({ org: app.org, ws, user: app.user, theme });
      navigate(`/forms/${form.id}/new`, { replace: true });
    } catch (e) { toast(e.message, { error: true }); setBusy(false); }
  };

  const fetchBrand = async () => {
    if (!/^https?:\/\/[^\s.]+\.[^\s]+/.test(url)) { toast('Enter a full website address, like https://acme.com'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/brand?url=' + encodeURIComponent(url));
      const d = r.ok ? await r.json() : null;
      if (d?.colors?.length || d?.logo) toast(`Found your brand${d.colors?.length ? ' colors' : ''}${d.logo ? ' and logo' : ''} 🎨`, { ok: true });
      else toast('We couldn’t read that site’s branding — you can add it later in Brand kit.');
      await finish({ ...(d || {}), url });
    } catch { await finish(null); }
  };

  const q = QS[i];
  return (
    <div className="onb theme-scope" style={themeVars(DEFAULT_THEME)}>
      <div className="onb-top">
        <Logo height={18} />
        <Steps step={2} />
      </div>
      <div className="onb-stage" style={{ background: 'var(--ink-100)' }}>
        {i === 3 && <button className="t-body-s" style={{ position: 'absolute', right: 30, top: 30 }} onClick={() => finish(null)} disabled={busy}>I don’t have a website</button>}
        {i < 3 ? (
          <div key={i} className="onb-q slide-in">
            <span className="qnum">{i + 1}</span>
            <div className="col gap-16 grow">
              <h2 className="q-title" style={{ fontWeight: 400 }}>{q.title(first)}</h2>
              <div className="col gap-8" style={{ alignItems: 'flex-start' }}>
                {q.options.map((o, k) => (
                  <button key={o} className={cx('choice', ans[q.key] === o && 'on')} style={{ minWidth: q.options.length > 3 ? 280 : 186 }}
                    onClick={() => { setAns({ ...ans, [q.key]: o }); setTimeout(() => setI(i + 1), 450); }}>
                    <span className="key">{'ABCDEF'[k]}</span><span className="lbl">{o}</span>{ans[q.key] === o && <Icon name="check" className="tick" />}
                  </button>
                ))}
              </div>
              {ans[q.key] && <OkButton label="Continue" onClick={() => setI(i + 1)} hint={false} />}
            </div>
          </div>
        ) : (
          <div className="onb-q slide-in">
            <span className="qnum">4</span>
            <div className="col gap-16 grow">
              <div className="col gap-8">
                <h2 className="q-title">Share your website to <b>brand your forms</b> automatically</h2>
                <p className="q-desc">We’ll try to fetch your logo and colors and apply them to your forms. Review them before sharing &amp; update them anytime.</p>
              </div>
              <input className="text-answer" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || true)) fetchBrand(); }} autoFocus aria-label="Your website" style={{ maxWidth: 418 }} />
              <div className="row gap-10">
                <button className="ok-btn" onClick={fetchBrand} disabled={busy}>{busy ? <span className="spin" /> : 'Submit'}</button>
                <span className="key-hint">press <b>Cmd ⌘ + Enter</b></span>
              </div>
            </div>
          </div>
        )}
        <div className="resp-nav" style={{ position: 'absolute', right: 16, bottom: 16 }}>
          <button aria-label="Previous" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}><Icon name="chevron-up" /></button>
          <button aria-label="Next" onClick={() => setI(Math.min(3, i + 1))} disabled={i === 3 || !ans[QS[i]?.key]}><Icon name="chevron-down" /></button>
        </div>
      </div>
    </div>
  );
}
