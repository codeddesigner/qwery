import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Logo } from '../lib/icons.jsx';
import { answerableIndex, answerText, isAnswered, NO_ANSWER, nextTarget, recall, themeVars, validate } from '../lib/questions.js';
import { db } from '../lib/sb.js';
import { cx } from '../ui.jsx';
import { Media, OkButton, QuestionBlock } from './QuestionView.jsx';

export async function ai(action, payload) {
  const r = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...payload }) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'AI is unavailable right now');
  return d;
}

function device() {
  const w = window.innerWidth;
  return w < 640 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop';
}
function source() {
  const p = new URLSearchParams(location.search);
  if (p.get('utm_source')) return p.get('utm_source');
  if (p.get('src')) return p.get('src');
  if (!document.referrer) return 'Direct link';
  try { const h = new URL(document.referrer).hostname.replace(/^www\./, ''); return h.includes('instagram') ? 'Instagram' : h.includes('linkedin') ? 'LinkedIn' : h.includes('mail') ? 'Email' : h; } catch { return 'Direct link'; }
}

function ConversationPrompt({ content, orgName, onStart, onSkip, busy }) {
  const c = content.conversation || {};
  const sender = c.sender || orgName || 'The team';
  const initials = sender.split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="col gap-14" style={{ border: '1px solid var(--t-answer-60)', background: 'var(--t-answer-10)', borderRadius: 16, padding: '18px 16px', maxWidth: 420, width: '100%', textAlign: 'left', gap: 14 }}>
      <div className="row gap-12" style={{ alignItems: 'flex-start' }}>
        <span className="avatar" style={{ background: 'var(--t-answer-10)', color: 'var(--t-answer)', width: 34, height: 34 }}>{initials}</span>
        <div className="col gap-2">
          <span className="t-body-s" style={{ color: 'var(--t-answer)' }}>{sender}</span>
          <span className="t-body-m" style={{ color: 'var(--t-question)' }}>{c.prompt || 'Got two minutes to tell us more?'}</span>
        </div>
      </div>
      <div className="row gap-16" style={{ paddingLeft: 46 }}>
        <button className="ok-btn" style={{ fontSize: 17 }} onClick={onStart} disabled={busy}>{busy ? <span className="spin" /> : 'Start conversation'}</button>
        <button className="t-body-s" style={{ color: 'var(--t-answer)' }} onClick={onSkip}>Not now</button>
      </div>
    </div>
  );
}

function Ending({ ending, content, answers, hidden, vars, offerConversation, orgName, onStartConversation, busy, mode, mobile }) {
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Enter' && ending?.button?.show && ending.button.link && mode === 'live') window.open(ending.button.link, '_blank'); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [ending, mode]);
  if (!ending) return null;
  const share = encodeURIComponent(location.href);
  return (
    <div className="col center gap-16 slide-in" style={{ textAlign: 'center', width: '100%', maxWidth: 640 }}>
      <Media media={ending.media} />
      <h2 className="q-title" style={{ fontSize: mobile ? 24 : 28 }}>{recall(ending.title, answers, content, hidden, vars) || 'Thanks for completing this form'}</h2>
      {ending.description && <p className="q-desc">{recall(ending.description, answers, content, hidden, vars)}</p>}
      {ending.social && (
        <div className="row gap-8">
          {[['user', `https://www.facebook.com/sharer/sharer.php?u=${share}`], ['x-social', `https://twitter.com/intent/tweet?url=${share}`], ['link', `https://www.linkedin.com/sharing/share-offsite/?url=${share}`]].map(([ic, url]) => (
            <a key={ic} href={url} target="_blank" rel="noreferrer" aria-label="Share" style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--t-button)', color: 'var(--t-button-text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={12} /></a>
          ))}
        </div>
      )}
      {ending.button?.show && (
        <div className="row gap-10">
          <a className="ok-btn" style={{ textDecoration: 'none' }} href={ending.button.link || '/'} target={ending.button.link ? '_blank' : undefined} rel="noreferrer" onClick={(e) => mode !== 'live' && e.preventDefault()}>{ending.button.label || 'Create a Qwery'}</a>
          <span className="key-hint">press <b>Enter</b> ↵</span>
        </div>
      )}
      {offerConversation && !dismissed && (
        <div style={{ marginTop: 24, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <ConversationPrompt content={content} orgName={orgName} busy={busy} onStart={onStartConversation} onSkip={() => setDismissed(true)} />
        </div>
      )}
    </div>
  );
}

function conversationRuleMatches(content, answers) {
  const c = content.conversation || {};
  if (!c.enabled || content.settings?.conversations === false) return false;
  if (c.mode === 'rule' && c.rule?.q) {
    const q = content.questions.find((x) => x.id === c.rule.q);
    if (!q) return false;
    const fake = { ...content, logic: { [q.id]: { rules: [{ conditions: [c.rule], join: 'and', to: '__yes' }] } } };
    return nextTarget(fake, q, answers) === '__yes';
  }
  if (c.mode === 'never') return false;
  return true;
}

/**
 * mode: 'live' (records visits + submits), 'preview' (no network), 'embed-preview'
 */
export default function FormRunner({ content, form, mode = 'preview', orgName, plan = 'free', startAt, frame = 'full', onDone, hiddenValues }) {
  const qs = content.questions;
  const [idx, setIdx] = useState(() => Math.max(0, startAt ? qs.findIndex((q) => q.id === startAt) : 0));
  const [answers, setAnswers] = useState(() => {
    if (mode !== 'live' || !content.settings?.autosave) return {};
    try { return JSON.parse(localStorage.getItem('qwery.progress.' + form?.id) || '{}'); } catch { return {}; }
  });
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [ending, setEnding] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState('');
  const [responseId, setResponseId] = useState(null);
  const [convBusy, setConvBusy] = useState(false);
  const [aiTitles, setAiTitles] = useState({});
  const visit = useRef(null);
  const mobile = frame === 'mobile' || (frame === 'full' && typeof window !== 'undefined' && window.innerWidth < 640);
  const hidden = useMemo(() => {
    if (hiddenValues) return hiddenValues;
    const out = {};
    const p = new URLSearchParams((location.hash || '').replace(/^#/, '') + '&' + location.search.replace(/^\?/, ''));
    (content.hidden_fields || []).forEach((k) => { if (p.get(k)) out[k] = p.get(k); });
    return out;
  }, [content.hidden_fields, hiddenValues]);
  const baseVars = useMemo(() => Object.fromEntries((content.variables || []).map((v) => [v.name, v.value])), [content.variables]);
  const vars = useMemo(() => {
    const sc = content.scoring || {};
    if (!Object.keys(sc).length) return baseVars;
    let score = +(baseVars.score || 0);
    Object.entries(sc).forEach(([qid, pts]) => {
      const a = answers[qid];
      (Array.isArray(a) ? a : [a]).forEach((x) => { if (typeof x === 'string' && pts[x] !== undefined && pts[x] !== '') score += +pts[x]; });
    });
    return { ...baseVars, score };
  }, [baseVars, answers, content.scoring]);

  useEffect(() => { if (startAt) { const i = qs.findIndex((q) => q.id === startAt); if (i >= 0) { setIdx(i); setEnding(null); } } }, [startAt, qs]);

  useEffect(() => {
    if (mode !== 'live' || !form?.id) return;
    db.rpc('record_visit', { p_form: form.id, p_device: device(), p_source: source() }, { anon: true }).then((id) => { visit.current = id; }).catch(() => {});
  }, [mode, form?.id]);

  useEffect(() => {
    if (mode === 'live' && content.settings?.autosave && form?.id && !ending) {
      try { localStorage.setItem('qwery.progress.' + form.id, JSON.stringify(answers)); } catch {}
    }
  }, [answers, mode, form?.id, content.settings?.autosave, ending]);

  const q = qs[idx];

  // AI follow-up: generate the question text from the previous answer
  useEffect(() => {
    if (!q || q.type !== 'ai_followup' || aiTitles[q.id]) return;
    const prevIdx = q.settings?.source ? qs.findIndex((x) => x.id === q.settings.source) : idx - 1;
    const prev = qs[prevIdx];
    if (!prev) return;
    setAiTitles((t) => ({ ...t, [q.id]: '…' }));
    ai('followup', { question: prev.title, answer: answerText(prev, answers[prev.id]), goal: q.settings?.goal })
      .then((d) => setAiTitles((t) => ({ ...t, [q.id]: d.text })))
      .catch(() => setAiTitles((t) => ({ ...t, [q.id]: q.title && q.title !== 'AI follow-up' ? q.title : 'Could you tell us a bit more about that?' })));
  }, [q, idx, qs, answers, aiTitles]);

  const setAnswer = (id, v) => { setAnswers((a) => ({ ...a, [id]: v })); setError(null); };

  const finish = async (endingId, finalAnswers) => {
    if (!endingId && (content.scoreEndings || []).length) {
      const band = [...content.scoreEndings].sort((a, b) => +b.min - +a.min).find((b) => +(vars.score || 0) >= +b.min);
      if (band) endingId = band.ending;
    }
    const e = content.endings.find((x) => x.id === endingId) || content.endings[0];
    if (mode === 'live') {
      setSubmitting(true); setSubmitErr('');
      try {
        const clean = Object.fromEntries(Object.entries(finalAnswers).filter(([k]) => qs.some((x) => x.id === k && !NO_ANSWER.has(x.type))));
        const res = await db.rpc('submit_response', { p_form: form.id, p_answers: clean, p_hidden: hidden, p_variables: vars, p_device: device(), p_source: source(), p_visit: visit.current }, { anon: true });
        setResponseId(res.response_id);
        try { localStorage.removeItem('qwery.progress.' + form.id); } catch {}
        const starter = qs.find((x) => x.type === 'conversation_starter' && finalAnswers[x.id] === 'yes');
        if (starter) { await startConversation(res.response_id, finalAnswers); return; }
      } catch (err) { setSubmitErr(err.message); setSubmitting(false); return; }
      setSubmitting(false);
    }
    if (e?.type === 'redirect' && e.url) {
      if (mode === 'live') { location.href = recall(e.url, finalAnswers, content, hidden, vars); return; }
    }
    setEnding(e);
    onDone?.(finalAnswers);
  };

  const go = (val) => {
    if (!q) return;
    const cur = { ...answers, ...(val !== undefined && !(val && val.nativeEvent) ? { [q.id]: val } : {}) };
    const msg = validate(q, cur[q.id]);
    if (msg) { setError(msg); return; }
    setError(null);
    if (mode === 'live' && visit.current) db.rpc('update_visit', { p_visit: visit.current, p_question: idx + 1 }, { anon: true }).catch(() => {});
    const target = nextTarget(content, q, cur);
    setHistory((h) => [...h, idx]);
    if (target) {
      const ti = qs.findIndex((x) => x.id === target);
      if (ti >= 0) { setIdx(ti); return; }
      if (content.endings.some((x) => x.id === target)) { finish(target, cur); return; }
    }
    if (idx + 1 < qs.length) setIdx(idx + 1);
    else finish(null, cur);
  };
  const back = () => {
    if (ending) return;
    setHistory((h) => { if (!h.length) return h; const n = [...h]; const p = n.pop(); setIdx(p); return n; });
    setError(null);
  };

  const startConversation = async (rid = responseId, ans = answers) => {
    if (mode !== 'live') { alert('Conversations start for real on your published form.'); return; }
    setConvBusy(true);
    try {
      const contact = qs.find((x) => x.type === 'contact_info');
      const emailQ = qs.find((x) => x.type === 'email');
      const nm = contact ? [ans[contact.id]?.first_name, ans[contact.id]?.last_name].filter(Boolean).join(' ') : '';
      const label = nm || (emailQ && ans[emailQ.id]) || (contact && ans[contact.id]?.email) || '';
      const token = await db.rpc('start_conversation', { p_response: rid, p_label: label, p_message: null }, { anon: true });
      location.href = '/c/' + token;
    } catch (e) { setSubmitErr(e.message); setConvBusy(false); }
  };

  // keyboard nav
  useEffect(() => {
    const h = (e) => {
      if (ending || !q) return;
      if (e.target.tagName === 'TEXTAREA' || (e.target.tagName === 'INPUT' && !['ArrowUp', 'ArrowDown'].includes(e.key))) return;
      if (e.key === 'Enter' && !e.shiftKey && NO_ANSWER.has(q.type)) { e.preventDefault(); go(); }
      if (e.key === 'Enter' && !e.shiftKey && e.target === document.body && isAnswered(q, answers[q.id])) { e.preventDefault(); go(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  const total = qs.length;
  const progress = ending ? 100 : total ? Math.round((idx / total) * 100) : 0;
  const s = content.settings || {};
  const media = !ending && q?.media?.url && q.media.kind !== 'video' ? q.media : null;
  const layout = media ? (mobile && q.media.layoutMobile ? q.media.layoutMobile : q.media.layout || 'stack') : 'stack';
  const split = media && (layout === 'split_left' || layout === 'split_right');
  const wallpaper = media && layout === 'wallpaper';
  const offerConversation = !!responseId && conversationRuleMatches(content, answers) && !qs.some((x) => x.type === 'conversation_starter');
  const showBranding = s.branding !== false || plan === 'free';
  const vt = themeVars(content.theme);
  const rootStyle = { ...vt, ...(wallpaper ? { background: `linear-gradient(rgba(0,0,0,.25), rgba(0,0,0,.25)), url(${media.url}) center/cover` } : {}) };
  const bigSize = content.theme?.sizeQuestions === 'lg' ? 1.15 : content.theme?.sizeQuestions === 'sm' ? 0.88 : 1;
  const align = content.theme?.alignQuestions === 'center' ? 'center' : 'flex-start';

  if (!qs.length) {
    return <div className="theme-scope resp" style={vt}><div className="resp-stage"><p className="q-title">This form doesn’t have any questions yet.</p></div></div>;
  }

  return (
    <div className={cx('theme-scope resp')} style={{ ...rootStyle, minHeight: frame === 'full' ? '100vh' : '100%', flexDirection: split && layout === 'split_left' && !mobile ? 'row-reverse' : undefined }}>
      <div className="resp-main">
        {s.progress !== false && <div className="resp-progress"><div className="progress"><div style={{ width: progress + '%' }} /></div></div>}
        {content.theme?.logo && <img src={content.theme.logo} alt="" style={{ position: 'absolute', top: 32, left: 24, height: 28, objectFit: 'contain' }} />}
        <div className="resp-stage" style={{ alignItems: mobile ? 'flex-start' : 'center', justifyContent: align === 'center' ? 'center' : undefined }}>
          {ending ? (
            <Ending ending={ending} content={content} answers={answers} hidden={hidden} vars={vars} offerConversation={offerConversation} orgName={orgName} onStartConversation={() => startConversation()} busy={convBusy} mode={mode} mobile={mobile} />
          ) : (
            <div key={q.id} className="resp-q slide-in" style={{ fontSize: `${bigSize}em`, textAlign: align === 'center' ? 'center' : undefined, justifyContent: align }}>
              {layout === 'float' && media && !mobile ? (
                <div className="row gap-32" style={{ alignItems: 'center', width: '100%' }}>
                  <div className="grow">{renderBlock()}</div>
                  <img src={media.url} alt={media.alt || ''} style={{ width: '40%', borderRadius: 12, filter: media.filter, transform: media.transform }} />
                </div>
              ) : renderBlock()}
            </div>
          )}
        </div>
        {submitErr && <div className="row gap-8" style={{ position: 'absolute', bottom: 70, left: '50%', transform: 'translateX(-50%)', background: 'var(--red-100)', color: '#b42318', padding: '8px 14px', borderRadius: 8, fontSize: 14 }}><Icon name="help" size={16} />{submitErr}</div>}
        {submitting && <div className="row gap-8" style={{ position: 'absolute', bottom: 70, left: '50%', transform: 'translateX(-50%)', color: 'var(--t-question)' }}><span className="spin" />Submitting…</div>}
        <div className="resp-foot">
          {s.arrows !== false && !ending && (
            <div className="resp-nav">
              <button aria-label="Previous question" onClick={back} disabled={!history.length}><Icon name="chevron-up" /></button>
              <button aria-label="Next question" onClick={() => go()}><Icon name="chevron-down" /></button>
            </div>
          )}
          {showBranding && <a className="made-with" href="/" target="_blank" rel="noreferrer">Made with <Logo height={12} color="currentColor" /></a>}
        </div>
      </div>
      {split && !mobile && <div className="resp-media" style={{ backgroundImage: `url(${media.url})`, backgroundPosition: media.focal || 'center', flex: `0 0 ${media.width || 50}%`, filter: media.filter, transform: media.transform }} />}
      {split && mobile && layout !== 'stack' && <div className="resp-media" style={{ backgroundImage: `url(${media.url})`, order: -1 }} />}
    </div>
  );

  function renderBlock() {
    const title = q.type === 'ai_followup' ? (aiTitles[q.id] === '…' ? 'Thinking of a good follow-up…' : aiTitles[q.id] || q.title) : recall(q.title, answers, content, hidden, vars) || (NO_ANSWER.has(q.type) ? '' : '…');
    return (
      <QuestionBlock q={q} n={s.numbers !== false ? answerableIndex(content, q) : null} value={answers[q.id]} onChange={(v) => setAnswer(q.id, v)} onSubmit={go} error={error}
        titleOverride={title} descOverride={recall(q.description, answers, content, hidden, vars)} mobile={mobile} mediaInline={layout === 'stack' || (mobile && layout === 'float')} />
    );
  }
}

export { OkButton };
