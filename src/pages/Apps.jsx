import { useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { navigate } from '../lib/router.js';
import { useApp } from '../lib/store.jsx';
import { Btn, cx, IconBtn, Modal, useAsync } from '../ui.jsx';
import { db } from '../lib/sb.js';

const APPS = [
  { n: 'HubSpot', c: '#f26f3a', cat: ['Sales', 'Lead generation', 'Marketing automation'], d: 'Send contact, company, or deal info to HubSpot to quickly follow up on new leads.', top: true },
  { n: 'Google Sheets', c: '#22a05a', cat: ['Productivity', 'Analytics & reporting'], d: 'Send your data straight to Google Sheets. Automatically syncs as results come in.', top: true, live: 'sheets' },
  { n: 'Slack', c: '#6a4fd8', cat: ['Conversations', 'Collaboration'], d: 'Get a message the moment a respondent starts a conversation, and reply from Slack.', top: true, live: 'slack' },
  { n: 'Google Analytics', c: '#f3a521', cat: ['Analytics & reporting'], d: 'Discover how people find and interact with your form.', paid: true, live: 'ga' },
  { n: 'Zoho CRM', c: '#e14c45', cat: ['Sales', 'Lead generation'], d: 'Create or update a lead in Zoho from form responses.' },
  { n: 'Mailchimp', c: '#1b1b1b', cat: ['Marketing automation'], d: 'Send new contacts to your Mailchimp audiences.' },
  { n: 'Infusionsoft', c: '#3b8f3f', cat: ['Marketing automation', 'Sales'], d: 'Create new contacts in Infusionsoft.' },
  { n: 'Square', c: '#1b1b1b', cat: ['Payments & e-commerce'], d: 'Recommend products from your online store.' },
  { n: 'Google Tag Manager', c: '#3a78f2', cat: ['Analytics & reporting', 'Developer tools'], d: 'Add your own code snippets to forms for conversion tracking.', paid: true },
  { n: 'Stripe', c: '#6a4fd8', cat: ['Payments & e-commerce'], d: 'Grow your business with Stripe’s powerful payment tools.' },
  { n: 'Salesforce', c: '#2b9ad6', cat: ['Sales', 'Lead generation'], d: 'Send form responses to Salesforce.', paid: true },
  { n: 'Notion', c: '#1b1b1b', cat: ['Productivity', 'Documents'], d: 'Send data to your Notion database.' },
  { n: 'Mailgun', c: '#e14c45', cat: ['Marketing automation'], d: 'Send transactional emails when a form is submitted.' },
  { n: 'Gmail', c: '#e14c45', cat: ['Productivity', 'Customer support'], d: 'Get an email with every response.' },
  { n: 'Zapier', c: '#f26f3a', cat: ['Automation'], d: 'Connect Qwery to 6,000+ apps with Zaps.' },
  { n: 'Make', c: '#6a4fd8', cat: ['Automation'], d: 'Build visual automations triggered by responses.' },
  { n: 'Zendesk', c: '#0b4db0', cat: ['Customer support', 'Conversations'], d: 'Turn any conversation into a support ticket.' },
  { n: 'Calendly', c: '#2e6bff', cat: ['Scheduling'], d: 'Let qualified respondents book a meeting right after submitting.' },
  { n: 'Dropbox', c: '#2e6bff', cat: ['File management'], d: 'Save file uploads to a Dropbox folder.' },
  { n: 'WordPress', c: '#21759b', cat: ['CMS'], d: 'Embed forms in any WordPress page with a shortcode.' },
];
const CATS = ['CMS', 'Collaboration', 'Conversations', 'Developer tools', 'Documents', 'Payments & e-commerce', 'Productivity', 'Research & customer experience', 'Rewards', 'Sales', 'Scheduling', 'Marketing automation', 'Lead generation', 'File management', 'Analytics & reporting', 'Automation', 'Customer support'];

export default function Apps({ cat }) {
  const app = useApp();
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const [pick, setPick] = useState(null);
  const forms = useAsync(async () => (await db.from('forms').select('id,title,color').eq('org_id', app.org.id).order('updated_at', { ascending: false }).limit(30)).data || [], [app.org.id]);
  const active = cat ? decodeURIComponent(cat) : null;
  const list = APPS.filter((a) => (!active || a.cat.includes(active)) && (!q || a.n.toLowerCase().includes(q.toLowerCase()) || a.d.toLowerCase().includes(q.toLowerCase())));
  const Card = ({ a, big }) => (
    <button className="card col gap-8" style={{ padding: big ? 16 : 14, textAlign: 'left', minHeight: big ? 150 : 74, boxShadow: 'var(--elev-1)', border: '1px solid var(--q-border-subtle)' }} onClick={() => setPick(a)}>
      <div className={big ? 'col gap-10' : 'row gap-10'} style={{ alignItems: big ? 'flex-start' : 'center' }}>
        <span style={{ width: big ? 30 : 22, height: big ? 30 : 22, borderRadius: 4, background: a.c, flex: 'none' }} />
        <span className="row gap-6 t-body-s" style={{ fontSize: 15 }}>{a.n}{a.paid && <span className="badge accent" style={{ fontSize: 10 }}>Paid</span>}</span>
      </div>
      <span className="t-caption" style={{ paddingLeft: big ? 0 : 32 }}>{a.d}</span>
    </button>
  );
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 216, background: 'var(--q-bg-canvas)', padding: '18px 0', flex: 'none' }} className="col">
        <h2 className="t-h2" style={{ fontSize: 20, padding: '0 20px 18px' }}>Apps &amp; Integrations</h2>
        <button className={cx('cat-item')} style={{ borderRadius: 0, padding: '8px 14px', background: !active ? 'var(--q-bg-control)' : undefined }} onClick={() => navigate('/apps')}>Discover</button>
        <span className="t-body-s" style={{ padding: '22px 20px 8px', fontSize: 15 }}>Categories</span>
        {CATS.map((c) => <button key={c} className="cat-item" style={{ borderRadius: 0, padding: '6px 20px', fontSize: 12, background: active === c ? 'var(--q-bg-control)' : undefined }} onClick={() => navigate('/apps/' + encodeURIComponent(c))}><span>{c}</span><span>{APPS.filter((a) => a.cat.includes(c)).length || ''}</span></button>)}
      </aside>
      <main style={{ flex: 1, padding: '30px 4vw 60px', position: 'relative' }}>
        <IconBtn icon="x" label="Close" style={{ position: 'absolute', right: 24, top: 24 }} onClick={() => navigate('/workspace')} />
        <div className="row between wrap gap-12" style={{ maxWidth: 920, marginBottom: 30 }}>
          <h1 className="t-display-l" style={{ fontSize: 28 }}>{active || 'Discover Apps & Integrations'}</h1>
          <div className="row gap-8" style={{ border: `1px solid ${focus ? 'var(--ink-900)' : 'var(--q-border-default)'}`, borderRadius: 999, padding: '6px 12px', width: 220 }}>
            <Icon name="search" size={14} /><input style={{ border: 0, outline: 'none', flex: 1, fontSize: 12 }} placeholder="Enter a search term" value={q} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} onChange={(e) => setQ(e.target.value)} aria-label="Search apps" />{q && <button onClick={() => setQ('')} aria-label="Clear"><Icon name="x" size={12} /></button>}
          </div>
        </div>
        <div style={{ maxWidth: 920 }}>
          {!active && !q && <>
            <h2 className="t-h2" style={{ fontSize: 20 }}>Most popular</h2>
            <p className="t-caption" style={{ margin: '8px 0 14px' }}>Save time and effort with these top integrations for Qwery</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12, paddingBottom: 14, borderBottom: '1px solid var(--q-border-default)', marginBottom: 14 }}>{APPS.filter((a) => a.top).map((a) => <Card key={a.n} a={a} big />)}</div>
          </>}
          {q && <p className="t-body-s" style={{ marginBottom: 12 }}>{list.length} results for “{q}”</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12 }}>{list.filter((a) => active || q || !a.top).map((a) => <Card key={a.n} a={a} />)}</div>
          {!list.length && <p className="t-body-s muted">No apps match. Try “sheets”, “mail” or “crm”.</p>}
        </div>
      </main>
      {pick && (
        <Modal title={pick.n} onClose={() => setPick(null)} width={460}>
          <div className="col gap-12">
            <span style={{ width: 40, height: 40, borderRadius: 8, background: pick.c }} />
            <p className="t-body-s">{pick.d}</p>
            <p className="t-caption muted">{pick.live ? 'Pick the form to connect:' : `${pick.n} connects through a webhook (Zapier, Make or n8n). Pick a form to set it up:`}</p>
            <div className="col gap-2" style={{ maxHeight: 260, overflow: 'auto' }}>
              {(forms.data || []).map((f) => <button key={f.id} className="menu-item" onClick={() => navigate(`/forms/${f.id}/connect/${pick.live ? 'integrations' : 'webhooks'}`)}><span style={{ width: 16, height: 16, borderRadius: 4, background: f.color }} />{f.title}</button>)}
              {!(forms.data || []).length && <span className="t-body-s muted">Create a form first.</span>}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export { Btn };
