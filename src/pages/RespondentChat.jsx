import { useEffect, useRef, useState } from 'react';
import { Icon, Logo } from '../lib/icons.jsx';
import { themeVars } from '../lib/questions.js';
import { db } from '../lib/sb.js';
import { cx, fmtTime, Spinner } from '../ui.jsx';

export default function RespondentChat({ token }) {
  const [conv, setConv] = useState(null);
  const [err, setErr] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  const load = async () => {
    try { const c = await db.rpc('get_public_conversation', { p_token: token }, { anon: true }); if (!c) setErr('This conversation link isn’t valid.'); else setConv(c); }
    catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); const t = setInterval(load, 4000); return () => clearInterval(t); }, [token]); // eslint-disable-line
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [conv?.messages?.length]);
  useEffect(() => { if (conv) document.title = `Chat · ${conv.org_name}`; }, [conv?.org_name]); // eslint-disable-line
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await db.rpc('post_respondent_message', { p_token: token, p_body: text.trim() }, { anon: true }); setText(''); await load(); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  if (err && !conv) return <div className="page-loader col gap-10"><p className="t-h2">{err}</p><a href="/" className="t-body-s u">Go to Qwery</a></div>;
  if (!conv) return <div className="page-loader"><Spinner size={24} /></div>;
  const tv = themeVars(conv.theme || {});
  const initials = (conv.org_name || 'Q').split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="theme-scope" style={{ ...tv, minHeight: '100vh', display: 'flex', flexDirection: 'column', color: 'var(--t-question)' }}>
      <header className="row gap-12" style={{ padding: '16px 20px', borderBottom: '1px solid var(--t-answer-10)', maxWidth: 760, width: '100%', margin: '0 auto' }}>
        <span className="avatar" style={{ background: 'var(--t-answer-10)', color: 'var(--t-answer)' }}>{initials}</span>
        <span className="col grow"><span className="t-label-l">{conv.org_name}</span><span className="t-caption" style={{ color: 'var(--t-question-70)' }}>About “{conv.form_title}” · {conv.status === 'resolved' ? 'Resolved' : 'Usually replies within a day'}</span></span>
      </header>
      <main className="col gap-16" style={{ flex: 1, overflow: 'auto', padding: '24px 20px', maxWidth: 760, width: '100%', margin: '0 auto' }}>
        <p className="t-body-s" style={{ textAlign: 'center', color: 'var(--t-question-70)' }}>Thanks for your answers! This is a private conversation with {conv.org_name}. Bookmark this page to come back to it.</p>
        {!conv.messages.length && <p className="t-body-m" style={{ textAlign: 'center' }}>Say hi 👋 — a real person will read it.</p>}
        {conv.messages.map((m) => (
          <div key={m.id} className={cx('msg', m.sender === 'respondent' ? 'me' : 'them')} style={{ maxWidth: '85%' }}>
            <div className="col" style={{ alignItems: m.sender === 'respondent' ? 'flex-end' : 'flex-start' }}>
              <span className="meta" style={{ color: 'var(--t-question-70)' }}>{m.sender === 'respondent' ? 'You' : conv.org_name} · {fmtTime(m.created_at)}</span>
              <div className="bubble" style={m.sender === 'respondent' ? { background: 'var(--t-button)', color: 'var(--t-button-text)' } : { background: 'var(--t-answer-10)', color: 'var(--t-question)' }}>{m.body}</div>
            </div>
          </div>
        ))}
        <div ref={end} />
      </main>
      <form className="composer" style={{ maxWidth: 720, width: 'calc(100% - 32px)', margin: '0 auto 16px', alignSelf: 'center' }} onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message…" aria-label="Message" autoFocus />
        <button type="submit" className={cx('send', text.trim() && 'ready')} style={text.trim() ? { background: 'var(--t-button)', color: 'var(--t-button-text)' } : undefined} disabled={busy || !text.trim()} aria-label="Send"><Icon name="send" size={18} /></button>
      </form>
      {err && <p className="err" style={{ textAlign: 'center', marginBottom: 8 }}>{err}</p>}
      <a href="/" className="row center gap-6 t-caption" style={{ textDecoration: 'none', padding: '0 0 14px', color: 'var(--t-question-70)' }}>Powered by <Logo height={11} color="currentColor" /></a>
    </div>
  );
}
