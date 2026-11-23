import { useMemo, useRef, useState } from 'react';
import FormRunner, { ai } from '../../components/FormRunner.jsx';
import { Icon, Logo } from '../../lib/icons.jsx';
import { CHOICE_TYPES, LETTERS, SCALE_TYPES } from '../../lib/questions.js';
import { db } from '../../lib/sb.js';
import { useApp } from '../../lib/store.jsx';
import { Btn, copy, cx, IconBtn, Modal, Select, Toggle, useToast } from '../../ui.jsx';
import { useForm } from '../FormShell.jsx';
import { publicLink } from '../Workspace.jsx';
import { MediaGallery } from './parts.jsx';

const qrUrl = (text, size = 360) => `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(text)}`;

function QrModal({ link, onClose }) {
  return (
    <Modal title="Get the QR code" onClose={onClose} width={420} footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><a className="btn btn-primary" href={qrUrl(link, 1000) + '&format=png'} download="qwery-qr.png" target="_blank" rel="noreferrer">Download QR Code</a></>}>
      <p className="t-caption muted">Scan the code to launch your form. Works online and offline (though you’ll need a printer, obviously).</p>
      <img className="qr-box" src={qrUrl(link)} alt={`QR code for ${link}`} />
    </Modal>
  );
}

function CustomizeModal({ onClose }) {
  const { form, patchForm } = useForm();
  const app = useApp();
  const toast = useToast();
  const [slug, setSlug] = useState(form.custom_slug || '');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const def = `${location.origin}/to/${form.slug}`;
  const save = async () => {
    const s = slug.trim().replace(/[^a-zA-Z0-9-_]/g, '');
    if (s.length < 3) { setErr('Use at least 3 letters, numbers, dashes or underscores.'); return; }
    setBusy(true); setErr('');
    try {
      const free = await db.rpc('slug_available', { p_slug: s, p_form: form.id });
      if (!free) { setErr('That link is taken — try another.'); return; }
      await patchForm({ custom_slug: s });
      toast('Custom link saved', { ok: true }); onClose();
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  void app;
  return (
    <Modal title="Customize link" onClose={onClose} width={420}>
      <div className="col gap-12">
        <p className="t-caption muted">Let people know what your form is about. Remember to update links you already shared if you change this.</p>
        <span className="t-label-s">Custom link</span>
        <div className="row" style={{ border: '1px solid var(--ink-900)', borderRadius: 999, padding: '3px 3px 3px 10px' }}>
          <span className="t-caption tertiary">…{location.host}/to/</span>
          <input style={{ border: 0, outline: 'none', flex: 1, fontSize: 13, minWidth: 0 }} value={slug} onChange={(e) => setSlug(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} autoFocus aria-label="Custom link" />
          <Btn loading={busy} onClick={save}>Save</Btn>
        </div>
        {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
        <div className="col gap-8" style={{ background: 'var(--accent-100)', border: '1px solid var(--accent-500)', borderRadius: 14, padding: 12, fontSize: 12 }}>
          <span className="row gap-8 t-label-s"><Icon name="help" size={14} />Your default link will still work</span>
          <span>{def} is the default link for your form.</span>
          <span>If you’re going to embed your form in apps or web pages (like a Medium article, Notion, or a WordPress page) then use this default link.</span>
          <div className="row gap-8"><Btn kind="secondary" onClick={() => { copy(def); toast('Default link copied', { ok: true }); }}>Copy the default link</Btn>{form.custom_slug && <button className="t-label-s" onClick={async () => { await patchForm({ custom_slug: null }); setSlug(''); toast('Reverted to the default link'); }}>Revert changes</button>}</div>
        </div>
      </div>
    </Modal>
  );
}

function EmailEmbed({ link, content }) {
  const toast = useToast();
  const q = content.questions[0];
  const color = content.theme.button;
  const html = useMemo(() => {
    if (!q) return '';
    let ans = `<a href="${link}" style="display:inline-block;background:${color};color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-family:Arial,sans-serif">Start</a>`;
    if (CHOICE_TYPES.has(q.type) && q.choices?.length) ans = q.choices.map((c, i) => `<a href="${link}?prefill=${q.id}:${c.id}" style="display:block;margin:6px 0;padding:8px 12px;border:1px solid ${color};border-radius:999px;color:${color};text-decoration:none;font-family:Arial,sans-serif">${LETTERS[i]} &nbsp;${c.label}</a>`).join('');
    else if (SCALE_TYPES.has(q.type) && q.type !== 'rating') { const f = +(q.settings?.from ?? 0), t = +(q.settings?.to ?? 10); ans = Array.from({ length: t - f + 1 }, (_, i) => `<a href="${link}?prefill=${q.id}:${f + i}" style="display:inline-block;width:32px;margin:2px;padding:8px 0;text-align:center;border:1px solid ${color};border-radius:6px;color:${color};text-decoration:none;font-family:Arial,sans-serif">${f + i}</a>`).join(''); }
    return `<table role="presentation" style="max-width:560px;margin:0 auto"><tr><td style="font-family:Arial,sans-serif;padding:16px"><p style="font-size:20px;color:#191919;margin:0 0 12px">${q.title}</p>${ans}</td></tr></table>`;
  }, [q, link, color]);
  if (!q) return <p className="t-body-s muted" style={{ padding: 24 }}>Add a question to embed your form in an email.</p>;
  return (
    <div className="col gap-16" style={{ padding: 24, maxWidth: 680, margin: '0 auto', width: '100%' }}>
      <h2 className="t-h2">Embed in an email</h2>
      <p className="t-body-s muted">Paste this into your email tool’s HTML block. The first question appears in the email — clicking an answer opens the form with it already filled in.</p>
      <div className="card bordered" style={{ padding: 16 }} dangerouslySetInnerHTML={{ __html: html }} />
      <div className="code-box" style={{ maxHeight: 160, overflow: 'auto' }}>{html}</div>
      <Btn icon="copy" style={{ alignSelf: 'flex-start' }} onClick={() => { copy(html); toast('Email code copied', { ok: true }); }}>Copy code</Btn>
    </div>
  );
}

const MODES = [['standard', 'Standard'], ['full', 'Full page'], ['popup', 'Popup'], ['slider', 'Slider'], ['popover', 'Popover'], ['sidetab', 'Side tab']];
function embedCode(link, cfg, title) {
  const attrs = Object.entries({ 'data-qwery': cfg.mode, 'data-url': link, 'data-width': `${cfg.width}${cfg.wunit}`, 'data-height': `${cfg.height}${cfg.hunit}`, 'data-button-text': cfg.text, 'data-button-color': cfg.color, 'data-font-size': cfg.fontSize, 'data-radius': cfg.radius, 'data-size': cfg.size, 'data-transparency': cfg.transparency, 'data-hide-headers': cfg.hideHeaders ? 'true' : null, 'data-as-text': cfg.asText ? 'true' : null })
    .filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`).join(' ');
  if (cfg.mode === 'wordpress') return `[qwery url="${link}" height="${cfg.height}"]`;
  return `<div ${attrs} title="${title}"></div>\n<script src="${location.origin}/embed.js" async></script>`;
}

function WebEmbed({ link }) {
  const { form, content } = useForm();
  const app = useApp();
  const toast = useToast();
  const [tab, setTab] = useState('design');
  const [cfg, setCfg] = useState({ mode: 'standard', width: 100, wunit: '%', height: 500, hunit: 'px', fullMobile: true, hideHeaders: false, transparency: 0, size: 'Large', text: 'Send feedback', color: content.theme.button, fontSize: 20, radius: 65, asText: false, name: '' });
  const [code, setCode] = useState(false);
  const [mob, setMob] = useState(false);
  const [pop, setPop] = useState(false);
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const btnStyle = { background: cfg.asText ? 'transparent' : cfg.color, color: cfg.asText ? cfg.color : '#fff', fontSize: cfg.fontSize, borderRadius: `${cfg.radius / 100 * 30}px`, padding: '8px 18px', textDecoration: cfg.asText ? 'underline' : 'none' };
  const lines = <>{[350, 350, 350, 350, 350, 275].map((w, i) => <span key={i} style={{ display: 'block', width: w, maxWidth: '90%', height: 8, borderRadius: 4, background: 'var(--ink-100)', margin: '10px auto' }} />)}</>;
  const runner = <FormRunner content={content} form={form} mode="preview" frame={mob ? 'mobile' : 'box'} orgName={app.org.name} plan={app.org.plan} />;
  return (
    <>
      <div className="ed-center" style={{ gap: 0 }}>
        <div className="canvas-toolbar">
          <input className="field sm" style={{ width: 180, border: 0, background: 'var(--q-bg-control)' }} placeholder="Embed name" value={cfg.name} onChange={(e) => set('name', e.target.value)} aria-label="Embed name" />
          <span className="grow" />
          <Btn onClick={() => setCode(true)}>Start embedding</Btn>
          <IconBtn size="lg" icon="phone" label="Mobile preview" active={mob} onClick={() => setMob((m) => !m)} />
        </div>
        <div className="ed-stage">
          <div style={{ width: '100%', maxWidth: mob ? 300 : 760, height: '100%', maxHeight: 520, border: '1px solid var(--q-border-default)', borderRadius: 24, background: cfg.mode === 'standard' ? 'var(--ink-100)' : '#fff', overflow: 'hidden', position: 'relative', padding: cfg.mode === 'standard' ? 16 : 0 }}>
            {cfg.mode === 'standard' && <>{lines.props.children.slice(0, 1)}<div style={{ height: Math.min(cfg.height, 360), width: `${cfg.width}%`, maxWidth: '100%', margin: '10px auto', borderRadius: 16, overflow: 'hidden', background: '#fff', position: 'relative' }}><div style={{ position: 'absolute', inset: 0, overflow: 'auto', opacity: 1 - cfg.transparency / 100 }}>{runner}</div></div>{lines.props.children.slice(5)}</>}
            {cfg.mode === 'full' && <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>{runner}</div>}
            {['popup', 'slider', 'popover', 'sidetab'].includes(cfg.mode) && (
              <div className="col center" style={{ height: '100%', padding: 24 }}>
                <div style={{ width: '100%', position: 'absolute', top: 20 }}>{lines}</div>
                {cfg.mode === 'popup' && <><button style={btnStyle} onClick={() => setPop(true)}>{cfg.text}</button><span className="t-caption muted" style={{ marginTop: 10 }}>Hit the button to see your popup in action</span></>}
                {cfg.mode === 'slider' && <button style={{ ...btnStyle, position: 'absolute', right: 0, top: '45%', borderRadius: '8px 0 0 8px' }} onClick={() => setPop(true)}>{cfg.text}</button>}
                {cfg.mode === 'popover' && <button style={{ ...btnStyle, position: 'absolute', right: 20, bottom: 20, width: 54, height: 54, borderRadius: '50%', padding: 0 }} onClick={() => setPop(true)} aria-label={cfg.text}><Icon name="message" /></button>}
                {cfg.mode === 'sidetab' && <button style={{ ...btnStyle, position: 'absolute', right: -42, top: '45%', transform: 'rotate(-90deg)', borderRadius: '8px 8px 0 0' }} onClick={() => setPop(true)}>{cfg.text}</button>}
                {pop && (
                  <div style={{ position: 'absolute', inset: cfg.mode === 'popup' ? '6%' : cfg.mode === 'popover' ? 'auto 20px 84px auto' : '0 0 0 auto', width: cfg.mode === 'popover' ? 300 : cfg.mode === 'popup' ? undefined : '55%', height: cfg.mode === 'popover' ? 380 : undefined, background: '#fff', borderRadius: 14, boxShadow: 'var(--elev-2)', overflow: 'hidden' }}>
                    <IconBtn icon="x" label="Close" style={{ position: 'absolute', right: 6, top: 6, zIndex: 3 }} onClick={() => setPop(false)} />
                    <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>{runner}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <aside className="ed-right">
        <div className="rp-tabs">{[['design', 'Design'], ['advanced', 'Advanced'], ['sdk', 'Embed SDK']].map(([k, l]) => <button key={k} className={cx('tab', tab === k && 'on')} onClick={() => setTab(k)} style={{ fontSize: 14 }}>{l}<span className="bar" /></button>)}</div>
        <div className="scroll">
          {tab === 'design' && (
            <>
              <div className="rp-sec"><span className="t-label-s">Embed mode</span>
                <div className="row gap-6 wrap">{MODES.map(([k, l]) => <button key={k} title={l} aria-label={l} className={cx('icon-btn', cfg.mode === k && 'active')} style={{ width: 58, height: 26, border: '1px solid var(--q-border-default)', borderRadius: 8, background: cfg.mode === k ? 'var(--q-bg-control)' : '#fff', outline: cfg.mode === k ? '1.5px solid var(--ink-900)' : 'none' }} onClick={() => setCfg((c) => ({ ...c, mode: k }))}><span className="t-caption" style={{ fontSize: 10 }}>{l}</span></button>)}</div>
              </div>
              <div className="rp-sec" style={{ gap: 8 }}>
                <span className="t-label-s">Settings</span>
                {['standard', 'full'].includes(cfg.mode) ? (
                  <>
                    {cfg.mode === 'standard' && <>
                      <span className="t-caption">Width</span>
                      <div className="row gap-6"><input type="number" className="field sm" value={cfg.width} onChange={(e) => set('width', +e.target.value)} /><div style={{ width: 70 }}><Select value={cfg.wunit} onChange={(v) => set('wunit', v)} options={[{ value: '%', label: '%' }, { value: 'px', label: 'px' }]} pill /></div></div>
                      <span className="t-caption">Height</span>
                      <div className="row gap-6"><input type="number" className="field sm" value={cfg.height} onChange={(e) => set('height', +e.target.value)} /><div style={{ width: 70 }}><Select value={cfg.hunit} onChange={(v) => set('hunit', v)} options={[{ value: 'px', label: 'px' }, { value: 'vh', label: 'vh' }]} pill /></div></div>
                    </>}
                    <div className="rp-row"><span>Full-screen on mobile</span><Toggle on={cfg.fullMobile} onChange={(v) => set('fullMobile', v)} label="Full-screen on mobile" /></div>
                    <div className="rp-row"><span>Hide headers</span><Toggle on={cfg.hideHeaders} onChange={(v) => set('hideHeaders', v)} label="Hide headers" /></div>
                    <span className="t-caption">Background transparency (%)</span>
                    <div className="row gap-6"><input type="range" className="range" min={0} max={100} value={cfg.transparency} onChange={(e) => set('transparency', +e.target.value)} /><span className="chip">{cfg.transparency}</span></div>
                  </>
                ) : (
                  <>
                    <span className="t-caption">Popup size</span>
                    <Select value={cfg.size} onChange={(v) => set('size', v)} options={['Small', 'Medium', 'Large'].map((x) => ({ value: x, label: x }))} pill />
                    <span className="t-caption">Button text</span>
                    <input className="field sm" maxLength={24} value={cfg.text} onChange={(e) => set('text', e.target.value)} /><span className="t-caption tertiary" style={{ alignSelf: 'flex-end', fontSize: 10 }}>{cfg.text.length}/24</span>
                    <div className="rp-row"><span>Button color</span><input type="color" value={cfg.color} onChange={(e) => set('color', e.target.value)} style={{ width: 28, height: 20, border: 0, background: 'none' }} aria-label="Button color" /></div>
                    <span className="t-caption">Font size (px)</span>
                    <div className="row gap-6"><input type="range" className="range" min={12} max={32} value={cfg.fontSize} onChange={(e) => set('fontSize', +e.target.value)} /><span className="chip">{cfg.fontSize}</span></div>
                    <span className="t-caption">Rounded corners (%)</span>
                    <div className="row gap-6"><input type="range" className="range" min={0} max={100} value={cfg.radius} onChange={(e) => set('radius', +e.target.value)} /><span className="chip">{cfg.radius}</span></div>
                    <div className="rp-row"><span>Change button to text</span><Toggle on={cfg.asText} onChange={(v) => set('asText', v)} label="Change button to text" /></div>
                    <div className="rp-row"><span>Hide headers</span><Toggle on={cfg.hideHeaders} onChange={(v) => set('hideHeaders', v)} label="Hide headers" /></div>
                  </>
                )}
              </div>
            </>
          )}
          {tab === 'advanced' && <div className="rp-sec"><p className="t-caption muted">Pass hidden fields from the host page by adding <code>data-hidden="product_id=123,user_id=456"</code> to the embed element. UTM parameters on the host page are forwarded automatically.</p></div>}
          {tab === 'sdk' && <div className="rp-sec"><p className="t-caption muted">Open the form from your own code:</p><div className="code-box">{`<script src="${location.origin}/embed.js"></script>\n<script>\n  Qwery.popup('${link}', { size: 'Large' })\n</script>`}</div></div>}
        </div>
      </aside>
      {code && (
        <Modal title={cfg.mode === 'wordpress' ? 'Embed with WordPress' : 'Embed in a web page'} onClose={() => setCode(false)} width={520}>
          <div className="col gap-12">
            <div className="row gap-6">{[['html', 'HTML'], ['wordpress', 'WordPress']].map(([k, l]) => <button key={k} className={cx('chip', (k === 'wordpress') === (cfg.mode === 'wordpress') ? 'conv' : '')} onClick={() => set('mode', k === 'wordpress' ? 'wordpress' : (cfg.prevMode || 'standard'))}>{l}</button>)}</div>
            <p className="t-caption muted">{cfg.mode === 'wordpress' ? 'Add the Qwery shortcode to any page or post. Or paste the HTML code into a Custom HTML block.' : 'Paste this code where you want the form to appear on your site.'}</p>
            <div className="code-box">{embedCode(link, cfg, form.title)}</div>
            <Btn icon="copy" style={{ alignSelf: 'flex-start' }} onClick={() => { copy(embedCode(link, cfg, form.title)); toast('Embed code copied', { ok: true }); }}>Copy code</Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

function LinkSettings({ link }) {
  const { form, patchForm, content } = useForm();
  const toast = useToast();
  const share = form.share || {};
  const [title, setTitle] = useState(share.title ?? form.title);
  const [desc, setDesc] = useState(share.description ?? '');
  const [busy, setBusy] = useState(false);
  const [gal, setGal] = useState(false);
  const upRef = useRef(null);
  const [tab, setTab] = useState('options');
  const save = (patch) => patchForm({ share: { ...form.share, ...patch } });
  const enc = encodeURIComponent(link);
  return (
    <aside className="ed-right">
      <div className="rp-tabs">{[['options', 'Share options'], ['advanced', 'Advanced']].map(([k, l]) => <button key={k} className={cx('tab', tab === k && 'on')} onClick={() => setTab(k)} style={{ fontSize: 15 }}>{l}<span className="bar" /></button>)}</div>
      <div className="scroll">
        {tab === 'options' ? (
          <>
            <div className="rp-sec">
              <span className="t-body-s">Share in:</span>
              <div className="row gap-6">
                {[['user', `https://www.facebook.com/sharer/sharer.php?u=${enc}`, 'Facebook'], ['columns', `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`, 'LinkedIn'], ['x-social', `https://twitter.com/intent/tweet?url=${enc}&text=${encodeURIComponent(title)}`, 'X'], ['list', `mailto:?subject=${encodeURIComponent(title)}&body=${enc}`, 'Email'], ['sparkle', `https://wa.me/?text=${enc}`, 'WhatsApp']].map(([ic, url, l]) => (
                  <a key={l} href={url} target="_blank" rel="noreferrer" className="icon-btn boxed" style={{ width: 38, height: 34 }} aria-label={`Share on ${l}`} title={l}><Icon name={ic} /></a>
                ))}
              </div>
            </div>
            <div className="rp-sec">
              <span className="t-label-m" style={{ fontSize: 14 }}>Link settings</span>
              <span className="t-caption muted">Preview</span>
              <div style={{ height: 70 * 1.4, borderRadius: 12, background: share.image ? `url("${share.image}") center/cover` : 'var(--ink-950)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{!share.image && <Logo height={14} color="#fff" />}</div>
              <span className="t-caption muted">Thumbnail</span>
              <div className="row gap-6">
                <span ref={upRef}><Btn kind="secondary" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setGal(true)}>Upload</Btn></span>
                <Btn kind="secondary" style={{ fontSize: 11, padding: '4px 10px' }} loading={busy} onClick={async () => {
                  setBusy(true);
                  try { const d = await ai('share_copy', { title: form.title, questions: content.questions.map((q) => q.title).slice(0, 6) }); setDesc(d.description); await save({ description: d.description, title: d.title || title }); if (d.title) setTitle(d.title); toast('Generated a title and description ✨', { ok: true }); }
                  catch (e) { toast(e.message, { error: true }); } finally { setBusy(false); }
                }}>Generate with AI</Btn>
                {share.image && <IconBtn icon="trash" label="Remove thumbnail" onClick={() => save({ image: null })} />}
              </div>
              <MediaGallery anchor={upRef} open={gal} onClose={() => setGal(false)} allowVideo={false} onPick={(m) => save({ image: m.url })} />
              <span className="t-caption muted">Title</span>
              <input className="field sq" style={{ height: 36, borderRadius: 12 }} value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => save({ title })} aria-label="Link title" />
              <span className="t-caption muted">Description</span>
              <textarea className="textarea" style={{ minHeight: 70, borderRadius: 12 }} value={desc} placeholder="Two minutes, five questions — and a real person reads every answer." onChange={(e) => setDesc(e.target.value)} onBlur={() => save({ description: desc })} aria-label="Link description" />
              <div className="rp-row" style={{ fontSize: 13 }}><span>Show in search results</span><Toggle on={!!share.indexable} onChange={(v) => save({ indexable: v })} label="Show in search results" /></div>
            </div>
          </>
        ) : (
          <div className="rp-sec">
            <span className="t-label-s">Prefill answers</span>
            <p className="t-caption muted">Add <code>?prefill=question_id:value</code> to the link to start with an answer selected.</p>
            <span className="t-label-s">Track sources</span>
            <p className="t-caption muted">Add <code>?utm_source=newsletter</code> to see where respondents came from in Insights → Top sources.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

export default function Share() {
  const { form, content, canEdit } = useForm();
  const app = useApp();
  const toast = useToast();
  const [view, setView] = useState('link');
  const [modal, setModal] = useState(null);
  const [mob, setMob] = useState(false);
  const base = publicLink(form);
  const hiddenPart = (content.hidden_fields || []).length ? '#' + content.hidden_fields.map((h) => `${h}=xxxxx`).join('&') : '';
  const link = base + hiddenPart;
  const notPublished = form.status !== 'published';
  return (
    <div className="share-wrap">
      <aside className="share-side">
        {[['link', 'link', 'Share the link'], ['email', 'mail', 'Embed in an email'], ['web', 'columns', 'Embed in a web page'], ['conv', 'message', 'Share a conversation link']].map(([k, ic, l]) => (
          <button key={k} className={cx('item', view === k && 'on')} onClick={() => setView(k)}><Icon name={ic} />{l}</button>
        ))}
      </aside>
      {notPublished && view !== 'web' && (
        <div className="ed-center" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="empty"><span className="ic"><Icon name="send" /></span><p className="t-h3" style={{ color: 'var(--q-text-primary)' }}>Publish your form to share it</p><p className="t-body-s">Your link goes live the moment you hit Publish.</p></div>
        </div>
      )}
      {!notPublished && view === 'link' && (
        <>
          <div className="ed-center">
            <div className="canvas-toolbar">
              <Btn icon="link" onClick={() => { copy(link); toast('Link copied', { ok: true }); }}>Copy link</Btn>
              <input className="field sm grow" readOnly value={link} onFocus={(e) => e.target.select()} style={{ borderRadius: 8 }} aria-label="Form link" />
              <button className="row gap-6 t-body-s" onClick={() => canEdit && setModal('custom')}><Icon name="pencil" size={14} />Customize</button>
              <IconBtn icon="mail" label="Share by email" onClick={() => setView('email')} />
              <IconBtn icon="grid" label="QR code" onClick={() => setModal('qr')} />
              <IconBtn icon="phone" label="Mobile preview" active={mob} onClick={() => setMob((m) => !m)} />
            </div>
            <div className="ed-stage">
              <div style={{ width: '100%', maxWidth: mob ? 300 : 760, height: '100%', maxHeight: 520, border: '1px solid var(--q-border-default)', borderRadius: 24, overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }}><FormRunner content={form.published_content || content} form={form} mode="preview" frame={mob ? 'mobile' : 'box'} orgName={app.org.name} plan={app.org.plan} /></div>
              </div>
            </div>
          </div>
          <LinkSettings link={link} />
        </>
      )}
      {!notPublished && view === 'email' && <div className="ed-center" style={{ overflow: 'auto', background: 'var(--q-bg-canvas)', borderRadius: 20 }}><EmailEmbed link={base} content={form.published_content || content} /></div>}
      {view === 'web' && (notPublished ? <div className="ed-center" style={{ alignItems: 'center', justifyContent: 'center' }}><div className="empty"><span className="ic"><Icon name="send" /></span><p className="t-h3" style={{ color: 'var(--q-text-primary)' }}>Publish your form to embed it</p></div></div> : <WebEmbed link={base} />)}
      {!notPublished && view === 'conv' && (
        <div className="ed-center" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div className="card bordered col gap-12" style={{ padding: 24, maxWidth: 520 }}>
            <span style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent-100)', color: 'var(--accent-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="message" /></span>
            <h2 className="t-h2">Share a conversation link</h2>
            <p className="t-body-s muted">This link skips the questions and opens a chat with your team straight away — perfect for follow-ups in email or support replies. Each person who opens it starts their own conversation.</p>
            <div className="row gap-8"><input className="field sm grow" readOnly value={base + '?talk=1'} aria-label="Conversation link" /><Btn icon="copy" onClick={() => { copy(base + '?talk=1'); toast('Conversation link copied', { ok: true }); }}>Copy</Btn></div>
          </div>
        </div>
      )}
      {modal === 'qr' && <QrModal link={base} onClose={() => setModal(null)} />}
      {modal === 'custom' && <CustomizeModal onClose={() => setModal(null)} />}
    </div>
  );
}
