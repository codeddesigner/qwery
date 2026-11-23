import { useEffect, useRef, useState } from 'react';
import { Icon, Logo } from '../lib/icons.jsx';
import { answerText, CHOICE_TYPES, normalizeContent, NO_ANSWER, SCALE_TYPES } from '../lib/questions.js';
import { navigate } from '../lib/router.js';
import { db } from '../lib/sb.js';
import { Btn, copy, cx, IconBtn, Menu, PageLoader, Popover, Toggle, useAsync, useToast } from '../ui.jsx';
import { MediaGallery } from './editor/parts.jsx';

const THEMES = {
  form: { name: 'This form', dots: null },
  teal: { name: 'Plain teal', bar: '#3333b5', bg: '#ffffff', ink: '#191919', dots: ['#191919', '#4d4de1', '#3333b5'] },
  orient: { name: 'Orient', bar: '#ea6a1e', bg: '#fff3e8', ink: '#33260a', dots: ['#33260a', '#ea6a1e', '#ffd991'] },
  desk: { name: 'Desk', bar: '#08703d', bg: '#f7f6f2', ink: '#14301f', dots: ['#14301f', '#08703d', '#a6f0c6'] },
};

function ReportBody({ title, content, answers, config, editable, onHide }) {
  const th = config.theme === 'form' || !config.theme ? { bar: content.theme.answer, bg: content.theme.background, ink: content.theme.question } : config.theme === 'custom' ? { bar: config.custom?.bar || '#4d4de1', bg: config.custom?.bg || '#fff', ink: config.custom?.ink || '#191919' } : THEMES[config.theme];
  const hidden = config.hidden || [];
  const qs = content.questions.filter((q) => !NO_ANSWER.has(q.type) && (editable || !hidden.includes(q.id)) && (config.openEnded || CHOICE_TYPES.has(q.type) || SCALE_TYPES.has(q.type)));
  return (
    <div style={{ background: th.bg, color: th.ink, minHeight: '100%' }}>
      {config.cover && <div style={{ height: 180, background: `url("${config.cover}") center/cover` }} />}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px 60px' }} className="col gap-24">
        {config.logo && <img src={config.logo} alt="" style={{ height: 32, objectFit: 'contain', alignSelf: 'flex-start' }} />}
        <div className="col gap-4"><h1 className="t-display-l">{title}</h1><span className="t-body-s" style={{ opacity: .7 }}>{answers.length} responses · updated live</span></div>
        {qs.map((q) => {
          const list = answers.filter((a) => a[q.id] != null && a[q.id] !== '');
          const isHidden = hidden.includes(q.id);
          return (
            <section key={q.id} className="col gap-12" style={{ opacity: isHidden ? 0.4 : 1, borderTop: '1px solid rgba(0,0,0,.08)', paddingTop: 20 }}>
              <div className="row between gap-12"><h2 className="t-h2" style={{ fontSize: 20 }}>{q.title}</h2>{editable && <button className="chip grey" onClick={() => onHide(q.id)}><Icon name={isHidden ? 'eye' : 'eye-off'} />{isHidden ? 'Show question' : 'Hide question'}</button>}</div>
              <span className="t-caption" style={{ opacity: .7 }}>{list.length} out of {answers.length} answered</span>
              {CHOICE_TYPES.has(q.type) ? (
                [...(q.choices || []), ...(q.settings?.other ? [{ id: '__other', label: 'Other' }] : [])].map((c) => {
                  const n = list.filter((a) => { const v = a[q.id]; const arr = Array.isArray(v) ? v : [v]; return c.id === '__other' ? arr.some((x) => typeof x === 'object') : arr.includes(c.id); }).length;
                  const p = list.length ? Math.round((n / list.length) * 100) : 0;
                  return (
                    <div key={c.id} className="row gap-12">
                      {q.type === 'picture_choice' && <span style={{ width: 34, height: 34, borderRadius: 4, background: c.image ? `url("${c.image}") center/cover` : 'rgba(0,0,0,.1)' }} />}
                      <div className="col gap-4 grow"><span className="row between t-body-s"><span>{c.label}</span><span className="t-caption">{n} resp. <b style={{ marginLeft: 10 }}>{p}%</b></span></span><div style={{ height: 12, background: 'rgba(0,0,0,.06)' }}><div className="bar-fill" style={{ height: '100%', width: `${p}%`, background: th.bar }} /></div></div>
                    </div>
                  );
                })
              ) : SCALE_TYPES.has(q.type) ? (() => {
                const from = q.type === 'rating' ? 1 : +(q.settings?.from ?? 0), to = q.type === 'rating' ? +(q.settings?.steps || 5) : +(q.settings?.to ?? 10);
                const vals = list.map((a) => a[q.id]).filter((v) => typeof v === 'number');
                return (
                  <div className="col gap-6">
                    <span className="t-body-s">Average {vals.length ? (vals.reduce((x, y) => x + y, 0) / vals.length).toFixed(1) : '–'}</span>
                    <div className="row gap-6" style={{ alignItems: 'flex-end' }}>
                      {Array.from({ length: to - from + 1 }, (_, i) => from + i).map((n) => { const c = vals.filter((v) => v === n).length; const p = vals.length ? (c / vals.length) * 100 : 0; return <div key={n} className="col center gap-4" style={{ width: 24 }}><div style={{ width: 24, height: 70, background: 'rgba(0,0,0,.06)', display: 'flex', alignItems: 'flex-end' }}><div style={{ width: '100%', height: `${p}%`, background: th.bar }} /></div><span className="t-caption">{n}</span></div>; })}
                    </div>
                  </div>
                );
              })() : (
                <div className="col gap-8">{list.slice(0, 30).map((a, i) => <p key={i} className="t-body-s" style={{ borderLeft: `2px solid ${th.bar}`, paddingLeft: 10 }}>{answerText(q, a[q.id])}</p>)}</div>
              )}
            </section>
          );
        })}
        {!qs.length && <p className="t-body-m" style={{ opacity: .7 }}>Nothing to show yet.</p>}
        <a href="/" style={{ alignSelf: 'flex-start', background: th.bar, color: '#fff', borderRadius: 4, padding: '4px 8px', fontSize: 11, textDecoration: 'none', display: 'inline-flex', gap: 6, alignItems: 'center' }}>Made with <Logo height={10} color="#fff" /></a>
      </div>
    </div>
  );
}

export function ReportEditor({ formId }) {
  const toast = useToast();
  const f = useAsync(async () => {
    const { data: form } = await db.from('forms').select('*').eq('id', formId).single();
    const { data: rs } = await db.from('responses').select('answers').eq('form_id', formId).order('created_at');
    return { form, answers: (rs || []).map((r) => r.answers) };
  }, [formId]);
  const [cfg, setCfg] = useState(null);
  const themeRef = useRef(null); const coverRef = useRef(null); const logoRef = useRef(null);
  const [menu, setMenu] = useState(null);
  useEffect(() => { if (f.data) setCfg({ enabled: true, openEnded: false, theme: 'teal', hidden: [], ...f.data.form.report_config }); }, [f.data]);
  if (!f.data || !cfg) return <PageLoader />;
  const { form, answers } = f.data;
  const content = normalizeContent(form.published_content || form.content);
  const link = `${location.origin}/report/${form.report_token}`;
  const save = async (patch) => { const next = { ...cfg, ...patch }; setCfg(next); await db.from('forms').update({ report_config: next }).eq('id', form.id); };
  const cur = cfg.theme === 'form' ? { name: 'This form', dots: [content.theme.question, content.theme.answer, content.theme.button] } : cfg.theme === 'custom' ? { name: 'Custom', dots: [cfg.custom?.ink, cfg.custom?.bar, cfg.custom?.bg] } : THEMES[cfg.theme];
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--q-bg-canvas)' }}>
      <aside className="col gap-14" style={{ width: 290, padding: '14px 28px', overflow: 'auto', flex: 'none' }}>
        <button className="row gap-6 t-body-s" onClick={() => navigate(`/forms/${form.id}/results/summary`)}><Icon name="chevron-left" size={14} />Back to results</button>
        <div className="col gap-6" style={{ marginTop: 18 }}><h1 className="t-h2" style={{ fontSize: 20 }}>Customize</h1><p className="t-caption muted">Add a cover image to your report, apply a design, and more</p></div>
        <span className="t-label-m" style={{ borderBottom: '1px solid var(--q-border-default)', paddingBottom: 6 }}>Access</span>
        <div className="row between t-body-s"><span>Enable link</span><Toggle on={cfg.enabled} onChange={(v) => save({ enabled: v })} label="Enable link" /></div>
        <span className="t-label-m" style={{ borderBottom: '1px solid var(--q-border-default)', paddingBottom: 6 }}>Content</span>
        <div className="row between t-body-s"><span>Show open-ended questions</span><Toggle on={cfg.openEnded} onChange={(v) => save({ openEnded: v })} label="Show open-ended questions" /></div>
        <span className="t-label-m" style={{ borderBottom: '1px solid var(--q-border-default)', paddingBottom: 6 }}>Design</span>
        <div className="row between t-body-s"><span>Cover</span>{cfg.cover ? <IconBtn icon="trash" label="Remove cover" onClick={() => save({ cover: null })} /> : <span ref={coverRef}><Btn kind="secondary" onClick={() => setMenu('cover')}>Add</Btn></span>}</div>
        <div className="row between t-body-s"><span>Logo</span>{cfg.logo ? <IconBtn icon="trash" label="Remove logo" onClick={() => save({ logo: null })} /> : <span ref={logoRef}><Btn kind="secondary" onClick={() => setMenu('logo')}>Add</Btn></span>}</div>
        <div className="row between t-body-s"><span>Theme</span>
          <button ref={themeRef} className="row gap-4 chip" style={{ border: '1px solid var(--ink-900)' }} onClick={() => setMenu('theme')}>{(cur?.dots || []).map((c, i) => <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}{cur?.name}<Icon name="chevron-down" /></button>
        </div>
        <Popover anchor={themeRef} open={menu === 'theme'} onClose={() => setMenu(null)} width={180}>
          <Menu onClose={() => setMenu(null)} items={[{ head: 'Pick a theme' }, { label: 'Design your own', icon: 'pencil', onClick: () => save({ theme: 'custom', custom: cfg.custom || { bar: '#4d4de1', bg: '#ffffff', ink: '#191919' } }) }, { label: 'This form', active: cfg.theme === 'form', onClick: () => save({ theme: 'form' }) }, ...['teal', 'orient', 'desk'].map((k) => ({ label: THEMES[k].name, active: cfg.theme === k, onClick: () => save({ theme: k }) }))]} />
        </Popover>
        {cfg.theme === 'custom' && (
          <div className="col gap-6">{[['bar', 'Bars'], ['bg', 'Background'], ['ink', 'Text']].map(([k, l]) => <label key={k} className="row between t-caption">{l}<input type="color" value={cfg.custom?.[k] || '#000000'} onChange={(e) => save({ custom: { ...cfg.custom, [k]: e.target.value } })} /></label>)}</div>
        )}
        <MediaGallery anchor={coverRef} open={menu === 'cover'} allowVideo={false} onClose={() => setMenu(null)} onPick={(m) => save({ cover: m.url })} />
        <MediaGallery anchor={logoRef} open={menu === 'logo'} allowVideo={false} onClose={() => setMenu(null)} onPick={(m) => save({ logo: m.url })} />
        {cfg.theme !== 'form' && cfg.theme !== 'custom' && <p className="t-caption muted">Theme saved ✓</p>}
      </aside>
      <div className="col" style={{ flex: 1, minWidth: 0, padding: '14px 14px 14px 0' }}>
        <div className="row gap-8" style={{ justifyContent: 'flex-end', marginBottom: 10 }}>
          <Btn kind="secondary" onClick={() => window.open(link + '?print=1')}>Print</Btn>
          <div className="row" style={{ background: '#fff', borderRadius: 999, padding: '3px 3px 3px 12px', border: '1px solid var(--q-border-default)' }}><span className="t-caption" style={{ width: 220 }} >{link.replace(/^https?:\/\//, '')}</span><Btn disabled={!cfg.enabled} onClick={() => { copy(link); toast('Report link copied', { ok: true }); }}>Copy</Btn></div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', borderRadius: 20, background: '#fff' }}>
          <ReportBody title={form.title} content={content} answers={answers} config={cfg} editable onHide={(id) => save({ hidden: cfg.hidden.includes(id) ? cfg.hidden.filter((x) => x !== id) : [...cfg.hidden, id] })} />
        </div>
      </div>
    </div>
  );
}

export function PublicReport({ token }) {
  const r = useAsync(() => db.rpc('get_public_report', { p_token: token }, { anon: true }), [token]);
  useEffect(() => { if (r.data) { document.title = `${r.data.title} · Report`; if (new URLSearchParams(location.search).get('print')) setTimeout(() => window.print(), 600); } }, [r.data]);
  if (r.loading) return <PageLoader />;
  if (!r.data) return <div className="page-loader col gap-10"><p className="t-h2">This report isn’t available.</p><p className="muted">The owner may have turned off the link.</p></div>;
  return <ReportBody title={r.data.title} content={normalizeContent(r.data.content)} answers={r.data.answers || []} config={{ theme: 'teal', hidden: [], ...r.data.config }} />;
}

export { cx };
