import { useRef, useState } from 'react';
import { Icon, Logo } from '../lib/icons.jsx';
import { Link, navigate } from '../lib/router.js';
import { useApp } from '../lib/store.jsx';
import { Popover } from '../ui.jsx';

const CARDS = [
  { l: 0, t: 0, w: 150, h: 200, c: '#5a25c4', lt: 70, lw: 90 },
  { l: 200, t: 0, w: 280, h: 210, c: '#ffe1dd', lt: 75, lw: 220 },
  { l: 510, t: 0, w: 170, h: 210, c: '#08703d', lt: 75, lw: 110 },
  { l: 0, t: 230, w: 150, h: 200, c: '#f04438', lt: 70, lw: 90 },
  { l: 190, t: 230, w: 300, h: 200, c: '#5a25c4', lt: 70, lw: 240 },
  { l: 510, t: 230, w: 170, h: 200, c: '#f04438', lt: 70, lw: 110 },
  { l: 0, t: 460, w: 150, h: 200, c: '#5a25c4', lt: 70, lw: 90 },
  { l: 220, t: 440, w: 260, h: 210, c: '#a6f0c6', lt: 75, lw: 200 },
  { l: 510, t: 450, w: 170, h: 190, c: '#ffe1dd', lt: 65, lw: 110 },
];

const MENUS = {
  Products: [
    { t: 'Forms', d: 'Conversational forms people finish', to: '/signup' },
    { t: 'Conversations', d: 'Reply to respondents from their answers', to: '/signup' },
    { t: 'Insights', d: 'Drop-offs, devices and AI summaries', to: '/signup' },
    { t: 'Integrations', d: 'Slack, Sheets, HubSpot, webhooks', to: '/signup' },
  ],
  Solutions: [
    { t: 'Customer feedback', d: 'CSAT and NPS that start conversations', to: '/signup' },
    { t: 'User research', d: 'Usability tests with follow-up chats', to: '/signup' },
    { t: 'Lead generation', d: 'Qualify leads with scoring logic', to: '/signup' },
  ],
  Resources: [
    { t: 'Templates', d: 'Start from a proven form', to: '/signup' },
    { t: 'Help center', d: 'Guides for every feature', to: '/signup' },
    { t: 'Webhooks docs', d: 'Payloads and signatures', to: '/signup' },
  ],
};

function NavMenu({ label }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button ref={ref} onClick={() => setOpen((o) => !o)} aria-expanded={open}>{label}<Icon name="chevron-down" /></button>
      <Popover anchor={ref} open={open} onClose={() => setOpen(false)} width={300} align="left">
        {MENUS[label].map((x) => (
          <button key={x.t} className="menu-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }} onClick={() => { setOpen(false); navigate(x.to); }}>
            <span className="t-label-m">{x.t}</span><span className="t-caption muted">{x.d}</span>
          </button>
        ))}
      </Popover>
    </>
  );
}

export default function Landing() {
  const app = useApp();
  const authed = !!app.user;
  return (
    <div style={{ background: '#fff', minHeight: '100vh' }}>
      <nav className="land-nav" aria-label="Main">
        <Link to="/" aria-label="Qwery home"><Logo height={24.6} /></Link>
        <div className="mid">
          <NavMenu label="Products" />
          <NavMenu label="Solutions" />
          <NavMenu label="Resources" />
          <Link to="/signup">Enterprise</Link>
          <Link to={authed ? '/plans' : '/signup'}>Pricing</Link>
        </div>
        {authed ? (
          <button className="btn btn-primary" onClick={() => navigate('/workspace')}>Go to workspace</button>
        ) : (
          <div className="row gap-24" style={{ marginLeft: 'auto' }}>
            <Link to="/login" className="t-label-l" style={{ fontSize: 15, textDecoration: 'none' }}>Log in</Link>
            <button className="btn btn-primary" onClick={() => navigate('/signup')}>Sign up</button>
          </div>
        )}
      </nav>

      <main className="land-hero">
        <div className="collage" aria-hidden="true">
          {CARDS.map((c, i) => (
            <div key={i} className="card" style={{ left: c.l, top: c.t, width: c.w, height: c.h, background: c.c, animation: `rise .6s ${i * 0.05}s both` }}>
              <div className="lines" style={{ top: c.lt }}>{[0, 1, 2].map((k) => <span key={k} style={{ width: c.lw }} />)}</div>
            </div>
          ))}
        </div>
        <div className="land-copy">
          <h1>Get to know your customers with forms that start conversations</h1>
          <p>Collect the data you need to <b style={{ fontWeight: 600 }}>understand customers</b> — then talk to them about it, right from their answers.</p>
          <div><button className="btn btn-primary btn-l" onClick={() => navigate(authed ? '/workspace' : '/signup')}>Get started–it’s free</button></div>
        </div>
      </main>

      <section className="land-section" aria-labelledby="how">
        <h2 id="how" className="t-display-l" style={{ marginBottom: 32, maxWidth: 640 }}>Every answer can become a conversation.</h2>
        <div className="land-grid">
          {[
            { bg: '#e2e2fc', fg: '#3333b5', ic: 'message', t: 'Turn any answer into a conversation', d: 'Set a rule — like a low score — and Qwery invites that respondent to chat with you, right from the thank-you screen.' },
            { bg: '#fff0f8', fg: '#e0368c', ic: 'sparkle', t: 'AI that does the busywork', d: 'Rewrite questions, generate whole forms from a goal, and get a plain-language summary of what respondents are telling you.' },
            { bg: '#d3f8e2', fg: '#08703d', ic: 'link', t: 'Share anywhere', d: 'A clean link, a QR code, or an embed for any web page — with branded previews and custom URLs.' },
          ].map((x) => (
            <div key={x.t} className="land-tile" style={{ background: x.bg }}>
              <span style={{ color: x.fg }}><Icon name={x.ic} size={24} /></span>
              <h3 className="t-h2" style={{ color: 'var(--q-text-primary)' }}>{x.t}</h3>
              <p className="t-body-m muted">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="land-section" style={{ paddingTop: 0 }}>
        <div className="row between wrap gap-24" style={{ background: 'var(--ink-950)', color: '#fff', borderRadius: 28, padding: '48px 40px' }}>
          <div className="col gap-8">
            <h2 className="t-display-l">Make forms worth talking about.</h2>
            <p style={{ color: 'var(--ink-300)' }}>Free forever for simple forms. Upgrade when you need conversations at scale.</p>
          </div>
          <button className="btn btn-l" style={{ background: '#fff', color: 'var(--ink-950)' }} onClick={() => navigate(authed ? '/workspace' : '/signup')}>Start for free</button>
        </div>
      </section>

      <footer className="land-foot">
        <Logo height={18} />
        <span>© {new Date().getFullYear()} Qwery. Forms that start conversations.</span>
      </footer>
    </div>
  );
}
