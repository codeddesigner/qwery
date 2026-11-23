import { useEffect, useState } from 'react';
import FormRunner from '../components/FormRunner.jsx';
import { Icon, Logo } from '../lib/icons.jsx';
import { normalizeContent, themeVars } from '../lib/questions.js';
import { db } from '../lib/sb.js';
import { Spinner } from '../ui.jsx';

function loadGA(id) {
  if (!id || !/^G-[A-Z0-9]+$/i.test(id) || window.gtag) return;
  const s = document.createElement('script'); s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`; document.head.appendChild(s);
  window.dataLayer = window.dataLayer || []; window.gtag = function () { window.dataLayer.push(arguments); }; window.gtag('js', new Date()); window.gtag('config', id);
}

export default function Respondent({ slug }) {
  const [state, setState] = useState({ loading: true });
  const params = new URLSearchParams(location.search);
  useEffect(() => {
    db.rpc('get_public_form', { p_slug: slug }, { anon: true })
      .then((f) => {
        if (!f) { setState({ missing: true }); return; }
        const content = normalizeContent(f.content);
        // ?prefill=question_id:value — answers carried in from email embeds
        const pre = params.get('prefill');
        if (pre) {
          const [qid, ...rest] = pre.split(':'); const val = rest.join(':');
          const q = content.questions.find((x) => x.id === qid);
          if (q) { try { const k = 'qwery.progress.' + f.id; const cur = JSON.parse(localStorage.getItem(k) || '{}'); cur[qid] = /^\d+$/.test(val) && !q.choices ? +val : (q.settings?.multiple ? [val] : val); localStorage.setItem(k, JSON.stringify(cur)); } catch {} }
        }
        document.title = f.share?.title || f.title;
        const meta = document.querySelector('meta[name="description"]'); if (meta && f.share?.description) meta.content = f.share.description;
        if (!f.share?.indexable) { const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex'; document.head.appendChild(m); }
        loadGA(content.settings?.tracking?.ga);
        setState({ form: f, content });
      })
      .catch((e) => setState({ error: e.message }));
  }, [slug]); // eslint-disable-line

  if (state.loading) return <div className="page-loader"><Spinner size={24} /></div>;
  if (state.missing || state.error) {
    return (
      <div className="page-loader col gap-12" style={{ textAlign: 'center', padding: 24 }}>
        <Icon name="help" size={28} />
        <p className="t-h2">{state.error ? 'We couldn’t load this form.' : 'This form isn’t available.'}</p>
        <p className="muted">{state.error || 'The link may be wrong, or the form was unpublished.'}</p>
        <a href="/" className="row gap-6 t-body-s" style={{ marginTop: 20, textDecoration: 'none' }}>Made with <Logo height={13} /></a>
      </div>
    );
  }
  const { form, content } = state;
  if (form.closed) {
    return (
      <div className="theme-scope resp" style={themeVars(content.theme)}>
        <div className="resp-stage col gap-12" style={{ textAlign: 'center' }}>
          <p className="q-title" style={{ fontSize: 28 }}>This form is now closed</p>
          <p className="q-desc">{form.org_name} isn’t accepting new responses. Thanks for stopping by!</p>
        </div>
      </div>
    );
  }
  if (params.get('talk') === '1') return <TalkStarter form={form} content={content} />;
  return <FormRunner content={content} form={form} mode="live" orgName={form.org_name} plan={form.plan} />;
}

function TalkStarter({ form, content }) {
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const start = async () => {
    setBusy(true); setErr('');
    try {
      const r = await db.rpc('submit_response', { p_form: form.id, p_answers: {}, p_hidden: { via: 'conversation-link' }, p_variables: {}, p_device: window.innerWidth < 640 ? 'mobile' : 'desktop', p_source: 'Conversation link', p_visit: null }, { anon: true });
      const token = await db.rpc('start_conversation', { p_response: r.response_id, p_label: name || 'Visitor', p_message: msg }, { anon: true });
      location.href = '/c/' + token;
    } catch (e) { setErr(e.message); setBusy(false); }
  };
  return (
    <div className="theme-scope resp" style={themeVars(content.theme)}>
      <div className="resp-stage">
        <div className="col gap-16" style={{ maxWidth: 480, width: '100%' }}>
          <p className="q-title" style={{ fontSize: 28 }}>Chat with {content.conversation?.sender || form.org_name}</p>
          <p className="q-desc">{content.conversation?.prompt || 'Tell us what’s on your mind — a real person will reply.'}</p>
          <input className="text-answer sm" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea className="text-answer sm" rows={3} placeholder="Write your message…" value={msg} onChange={(e) => setMsg(e.target.value)} />
          {err && <p className="err">{err}</p>}
          <div><button className="ok-btn" onClick={start} disabled={busy || !msg.trim()}>{busy ? <span className="spin" /> : 'Start conversation'}</button></div>
        </div>
      </div>
    </div>
  );
}
