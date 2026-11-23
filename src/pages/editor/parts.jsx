import { useEffect, useMemo, useRef, useState } from 'react';
import FormRunner, { ai } from '../../components/FormRunner.jsx';
import { Icon, Logo } from '../../lib/icons.jsx';
import { contrast, DEFAULT_THEME, emptyContent, FONTS, fontStack, GALLERY_THEMES, GROUPS, loadFont, newQuestion, RECOMMENDED, TYPES, uid } from '../../lib/questions.js';
import { db, getSession, storage } from '../../lib/sb.js';
import { useApp } from '../../lib/store.jsx';
import { Btn, cx, IconBtn, Modal, Popover, QType, Select, Seg, Toggle, useAsync, useToast } from '../../ui.jsx';
import { useForm } from '../FormShell.jsx';

/* ---------- Stock imagery: generated gradients (no third-party API) ---------- */
const STOCK = [
  ['#5a4632', '#9c6b45', '#2b2622'], ['#8e2f2a', '#c9b8a2', '#3c4a52'], ['#8fb7dc', '#e5e1d3', '#6f8f55'], ['#f2a7c6', '#e86ea6', '#7b2b5a'],
  ['#5b4a3a', '#a88b6c', '#e9dcc7'], ['#2e6bff', '#a9d4ff', '#ffffff'], ['#08703d', '#a6f0c6', '#ffeb7a'], ['#101010', '#4d4de1', '#bdbdfa'],
  ['#ea6a1e', '#ffd991', '#fff3e8'], ['#3a3833', '#ece8df', '#f7f6f2'], ['#17175a', '#4d4de1', '#e2e2fc'], ['#e0368c', '#ffb3da', '#fff0f8'],
].map(([a, b, c], i) => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="760" viewBox="0 0 800 760"><defs><linearGradient id="g${i}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient><filter id="b${i}"><feGaussianBlur stdDeviation="30"/></filter></defs><rect width="800" height="760" fill="url(#g${i})"/>${i % 3 === 0 ? `<circle cx="560" cy="210" r="90" fill="#f5a300" opacity=".95"/><ellipse cx="300" cy="760" rx="520" ry="230" fill="${a}" opacity=".7"/>` : ''}<rect width="800" height="760" fill="url(#g${i})" opacity=".25" filter="url(#b${i})"/></svg>`));

export const ICON_SET = ['message', 'sparkle', 'star', 'user', 'mail', 'phone', 'globe', 'calendar', 'chart', 'gift', 'bell', 'home', 'image', 'link', 'lock', 'smile', 'thumb', 'zap', 'diamond', 'send'];
const iconUri = (name, color = '#4d4de1') => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="-6 -6 32 32"><rect x="-6" y="-6" width="32" height="32" fill="#f3f3fe"/><g style="color:${color}">${document.querySelector(`#icon-src-${name}`)?.innerHTML || ''}</g></svg>`);

/* ---------- Media gallery (TF 036 / 043 / 195) ---------- */
export function MediaGallery({ anchor, open, onClose, onPick, allowVideo = true }) {
  const app = useApp();
  const toast = useToast();
  const [tab, setTab] = useState('upload');
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [url, setUrl] = useState('');
  const fileRef = useRef(null);
  const mine = useAsync(async () => {
    if (!open || tab !== 'mine') return [];
    return storage.list(getSession().user.id + '/');
  }, [open, tab]);
  const kits = useAsync(async () => (open && tab === 'brand' ? (await db.from('brand_kits').select('*').eq('org_id', app.org.id)).data : []), [open, tab]);
  const upload = async (file) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast('Images only — JPG, PNG, or GIF.'); return; }
    if (file.size > 4 * 1024 * 1024) { toast('Images must be 4MB or smaller.'); return; }
    setBusy(true);
    try { const u = await storage.upload(file); onPick({ url: u, kind: 'image', alt: file.name.replace(/\.[^.]+$/, '') }); onClose(); }
    catch (e) { toast(e.message, { error: true }); } finally { setBusy(false); }
  };
  const tabs = [['upload', 'Upload'], ['brand', 'Brand kit'], ['image', 'Image'], ...(allowVideo ? [['video', 'Video']] : []), ['icon', 'Icon'], ['mine', 'My gallery']];
  return (
    <Popover anchor={anchor} open={open} onClose={onClose} width={316} align="right" className="media-gallery">
      <div className="row between" style={{ padding: '4px 4px 8px' }}><span className="t-body-s">Media gallery</span><IconBtn icon="x" label="Close" onClick={onClose} /></div>
      <div className="row gap-12" style={{ borderBottom: '1px solid var(--q-border-default)', padding: '0 4px', overflowX: 'auto' }}>
        {tabs.map(([k, l]) => <button key={k} className={cx('tab', tab === k && 'on')} style={{ fontSize: 12, gap: 6, padding: '4px 0 0', whiteSpace: 'nowrap' }} onClick={() => setTab(k)}>{l}<span className="bar" /></button>)}
      </div>
      <div style={{ padding: '10px 4px 4px', minHeight: 220 }}>
        {tab === 'upload' && (
          <div className={cx('drop-zone', over && 'over')} style={{ height: 260 }} onClick={() => fileRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { e.preventDefault(); setOver(false); upload(e.dataTransfer.files[0]); }}>
            {busy ? <span className="spin" /> : <><span><span className="u">Upload</span> or drop an image right here</span><span className="t-caption muted">JPG, PNG, or GIF. Up to 4MB.</span></>}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files[0])} />
          </div>
        )}
        {tab === 'image' && (
          <div className="col gap-10">
            <div className="row gap-6"><input className="field sm" placeholder="Paste an image URL" value={url} onChange={(e) => setUrl(e.target.value)} /><Btn disabled={!/^https?:\/\//.test(url)} onClick={() => { onPick({ url, kind: 'image' }); onClose(); }}>Add</Btn></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {STOCK.map((s, i) => <button key={i} onClick={() => { onPick({ url: s, kind: 'image', alt: 'Abstract gradient' }); onClose(); }} style={{ aspectRatio: '1', borderRadius: 6, backgroundImage: `url("${s}")`, backgroundSize: 'cover' }} aria-label={`Stock image ${i + 1}`} />)}
            </div>
          </div>
        )}
        {tab === 'video' && (
          <div className="col gap-8">
            <span className="t-caption muted">Paste a YouTube, Vimeo or .mp4 link.</span>
            <div className="row gap-6"><input className="field sm" placeholder="https://youtube.com/watch?v=…" value={url} onChange={(e) => setUrl(e.target.value)} /><Btn disabled={!/^https?:\/\//.test(url)} onClick={() => { onPick({ url, kind: 'video' }); onClose(); }}>Add</Btn></div>
          </div>
        )}
        {tab === 'icon' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {ICON_SET.map((n) => <button key={n} className="icon-btn boxed" style={{ width: '100%', height: 48 }} onClick={() => { onPick({ url: iconUri(n), kind: 'image', alt: n }); onClose(); }} aria-label={n}><Icon name={n} /></button>)}
          </div>
        )}
        {tab === 'brand' && (
          <div className="col gap-10">
            {kits.loading ? <span className="spin" /> : !(kits.data || []).length ? <span className="t-body-s muted">No brand kits yet. Create one from the Brand kit tab in your workspace.</span> :
              kits.data.map((k) => {
                const items = [...(k.assets.logos || []).flatMap((g) => g.items), ...(k.assets.media || []).flatMap((g) => g.items)];
                return (
                  <div key={k.id} className="col gap-6"><span className="t-label-s">{k.name}</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                      {items.map((u, i) => <button key={i} onClick={() => { onPick({ url: u, kind: 'image' }); onClose(); }} style={{ aspectRatio: '1', borderRadius: 6, background: `var(--q-bg-subtle) url("${u}") center/contain no-repeat` }} aria-label="Brand asset" />)}
                      {!items.length && <span className="t-caption muted">No images in this kit</span>}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
        {tab === 'mine' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {mine.loading && <span className="spin" />}
            {(mine.data || []).map((u) => <button key={u} onClick={() => { onPick({ url: u, kind: 'image' }); onClose(); }} style={{ aspectRatio: '1', borderRadius: 6, background: `var(--q-bg-subtle) url("${u}") center/cover` }} aria-label="Uploaded image" />)}
            {!mine.loading && !(mine.data || []).length && <span className="t-body-s muted" style={{ gridColumn: '1/-1' }}>Images you upload will show up here.</span>}
          </div>
        )}
      </div>
    </Popover>
  );
}

// hidden icon sources so the icon tab can serialise SVG paths
export function IconSources() {
  return <div style={{ display: 'none' }} aria-hidden="true">{ICON_SET.map((n) => <span key={n} id={`icon-src-${n}`}><Icon name={n} /></span>)}</div>;
}

/* ---------- Image editor (TF 050–052) ---------- */
export function ImageEditor({ anchor, open, onClose, value, onSave }) {
  const [tab, setTab] = useState('adjust');
  const parse = (v) => ({ b: +(v?.filter?.match(/brightness\(([\d.]+)\)/)?.[1] ?? 1) * 100 - 100, c: +(v?.filter?.match(/contrast\(([\d.]+)\)/)?.[1] ?? 1) * 100 - 100, r: +(v?.transform?.match(/rotate\((-?\d+)deg\)/)?.[1] ?? 0), f: /scaleX\(-1\)/.test(v?.transform || ''), fx: v?.filter?.match(/(grayscale|sepia)\(1\)/)?.[1] || '', crop: v?.crop || 'center' });
  const [s, setS] = useState(parse(value));
  useEffect(() => { if (open) setS(parse(value)); }, [open]); // eslint-disable-line
  const out = () => ({
    filter: [`brightness(${(100 + s.b) / 100})`, `contrast(${(100 + s.c) / 100})`, s.fx && `${s.fx}(1)`].filter(Boolean).join(' '),
    transform: [s.r && `rotate(${s.r}deg)`, s.f && 'scaleX(-1)'].filter(Boolean).join(' ') || undefined,
    crop: s.crop,
  });
  return (
    <Popover anchor={anchor} open={open} onClose={onClose} width={250} align="right">
      <div className="row between" style={{ padding: '2px 4px' }}><span className="t-body-s">Image editor</span><IconBtn icon="x" label="Close" onClick={onClose} /></div>
      <div className="row gap-12" style={{ borderBottom: '1px solid var(--q-border-default)', padding: '0 4px', marginBottom: 8 }}>
        {[['crop', 'Crop'], ['adjust', 'Adjustments'], ['filters', 'Filters']].map(([k, l]) => <button key={k} className={cx('tab', tab === k && 'on')} style={{ fontSize: 12, gap: 6, padding: '4px 0 0' }} onClick={() => setTab(k)}>{l}<span className="bar" /></button>)}
      </div>
      <div className="col gap-10" style={{ padding: '0 4px', fontSize: 12 }}>
        {tab === 'crop' && (
          <div className="col gap-6"><span className="t-label-s">Focal point</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 4 }}>
              {['top left', 'top', 'top right', 'left', 'center', 'right', 'bottom left', 'bottom', 'bottom right'].map((p) => <button key={p} className={cx('chip', s.crop === p && 'conv')} style={{ justifyContent: 'center' }} onClick={() => setS({ ...s, crop: p })}>{p}</button>)}
            </div>
          </div>
        )}
        {tab === 'adjust' && (
          <>
            <span className="t-label-s">Transform</span>
            <div className="row between"><span>Rotate</span><span className="row gap-4"><IconBtn icon="arrow-left" label="Rotate left" onClick={() => setS({ ...s, r: (s.r - 90) % 360 })} /><IconBtn icon="arrow-right" label="Rotate right" onClick={() => setS({ ...s, r: (s.r + 90) % 360 })} /></span></div>
            <div className="row between"><span>Flip</span><IconBtn icon="flip" label="Flip horizontally" active={s.f} onClick={() => setS({ ...s, f: !s.f })} /></div>
            <div className="divider" />
            <span className="t-label-s">Color</span>
            <div className="row between"><span>Brightness</span><span>{s.b}</span></div>
            <input type="range" className="range" min={-100} max={100} value={s.b} onChange={(e) => setS({ ...s, b: +e.target.value })} aria-label="Brightness" />
            <div className="row between"><span>Contrast</span><span>{s.c}</span></div>
            <input type="range" className="range" min={-100} max={100} value={s.c} onChange={(e) => setS({ ...s, c: +e.target.value })} aria-label="Contrast" />
          </>
        )}
        {tab === 'filters' && (
          <div className="row gap-6 wrap">{[['', 'None'], ['grayscale', 'Mono'], ['sepia', 'Sepia']].map(([k, l]) => <button key={l} className={cx('chip', s.fx === k && 'conv')} onClick={() => setS({ ...s, fx: k })}>{l}</button>)}</div>
        )}
        <div className="divider" />
        <div className="row gap-6" style={{ justifyContent: 'flex-end', paddingBottom: 4 }}>
          <Btn kind="secondary" onClick={() => setS(parse({}))}>Reset</Btn>
          <Btn onClick={() => { onSave(out()); onClose(); }}>Save</Btn>
        </div>
      </div>
    </Popover>
  );
}

/* ---------- Colour picker (TF 058) ---------- */
const PALETTE = ['#7f8f3f', '#6cc9c9', '#f2c94c', '#ea6a1e', '#5aa2f0', '#c1578f', '#4b1d3f', '#4d4de1', '#2f6f8f', '#191919', '#ffffff', '#f7f6f2', '#ffd991', '#a6f0c6', '#e0368c'];
export function ColorButton({ value, onChange, label }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  return (
    <>
      <button ref={ref} className="swatch-btn" onClick={() => setOpen((o) => !o)} aria-label={`${label} colour ${value}`}><span className="dot" style={{ background: value }} /><Icon name="chevron-down" /></button>
      <Popover anchor={ref} open={open} onClose={() => setOpen(false)} width={112 + 24} align="right" placement="bottom">
        <div className="col gap-8" style={{ padding: 4 }}>
          <input type="color" value={/^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000'} onChange={(e) => { setHex(e.target.value); onChange(e.target.value.toUpperCase()); }} style={{ width: '100%', height: 70, border: 0, padding: 0, background: 'none', cursor: 'pointer' }} aria-label="Pick colour" />
          <div className="row gap-4"><span style={{ width: 14, height: 14, borderRadius: 3, background: hex, flex: 'none' }} /><input className="field sm" style={{ height: 22, fontSize: 11, padding: '2px 6px' }} value={hex} onChange={(e) => { setHex(e.target.value); if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value.toUpperCase()); }} aria-label="Hex value" /></div>
          <div className="color-grid" style={{ gridTemplateColumns: 'repeat(5, 18px)' }}>{PALETTE.map((c) => <button key={c} className={c.toLowerCase() === (value || '').toLowerCase() ? 'on' : ''} style={{ background: c, border: '1px solid rgba(0,0,0,.08)' }} onClick={() => onChange(c.toUpperCase())} aria-label={c} />)}</div>
        </div>
      </Popover>
    </>
  );
}

/* ---------- Design tab: themes + theme editor (TF 054–060) ---------- */
export function DesignPanel() {
  const { content, update } = useForm();
  const app = useApp();
  const toast = useToast();
  const [mode, setMode] = useState('list');
  const [which, setWhich] = useState('mine');
  const mine = useAsync(async () => (await db.from('themes').select('*').eq('org_id', app.org.id).order('created_at', { ascending: false })).data || [], [app.org.id]);
  const kits = useAsync(async () => (await db.from('brand_kits').select('id,name,themes').eq('org_id', app.org.id)).data || [], [app.org.id]);
  const [draft, setDraft] = useState(content.theme);
  const original = useRef(content.theme);
  const fontRef = useRef(null);
  const [fontOpen, setFontOpen] = useState(false);
  const [fq, setFq] = useState('');
  const bgRef = useRef(null); const logoRef = useRef(null);
  const [bgOpen, setBgOpen] = useState(false); const [logoOpen, setLogoOpen] = useState(false);
  const apply = (t) => { setDraft(t); update((c) => { c.theme = { ...t }; }); };
  const set = (k, v) => apply({ ...draft, [k]: v });
  const themes = which === 'mine' ? [...(kits.data || []).flatMap((k) => k.themes || []).map((t) => ({ config: t, name: t.name })), ...(mine.data || [])] : GALLERY_THEMES.map((t) => ({ config: t, name: t.name }));
  if (mode === 'edit') {
    const t = draft;
    return (
      <div className="col">
        <div className="rp-sec" style={{ paddingBottom: 6 }}>
          <div className="row gap-8"><IconBtn icon="chevron-left" label="Back" onClick={() => setMode('list')} /><span className="t-body-s" style={{ fontSize: 15 }}>{t.name || 'My theme'}</span></div>
          <button ref={fontRef} className="select-btn" onClick={() => setFontOpen(true)} style={{ fontFamily: fontStack(t.font) }}><span className="grow">{t.font}</span><Icon name="chevron-down" className="chev" /></button>
          <Popover anchor={fontRef} open={fontOpen} onClose={() => { setFontOpen(false); setFq(''); }} width={212}>
            <div className="row gap-6" style={{ border: '1px solid var(--ink-900)', borderRadius: 999, padding: '4px 10px', margin: '2px 2px 6px' }}><Icon name="search" size={14} /><input autoFocus value={fq} onChange={(e) => setFq(e.target.value)} placeholder="Search fonts" style={{ border: 0, outline: 'none', fontSize: 12, width: '100%' }} /></div>
            <div style={{ maxHeight: 260, overflow: 'auto' }}>
              {FONTS.filter((f) => f.toLowerCase().includes(fq.toLowerCase())).map((f) => <button key={f} className={cx('menu-item', t.font === f && 'hl')} style={{ fontSize: 12, fontFamily: fontStack(f) }} onMouseEnter={() => loadFont(f)} onClick={() => { set('font', f); setFontOpen(false); }}>{f}</button>)}
            </div>
          </Popover>
        </div>
        <div className="rp-sec" style={{ gap: 4 }}>
          {[['question', 'Questions'], ['answer', 'Answers'], ['button', 'Buttons'], ['buttonText', 'Button text'], ['background', 'Background']].map(([k, l]) => (
            <div key={k} className="rp-row"><span style={{ color: 'var(--q-text-primary)' }}>{l}</span><ColorButton value={t[k]} label={l} onChange={(v) => set(k, v)} /></div>
          ))}
          <div className="rp-row"><span style={{ color: 'var(--q-text-primary)' }}>Background image</span>
            {t.backgroundImage ? <IconBtn icon="trash" label="Remove background image" onClick={() => set('backgroundImage', '')} /> : <button ref={bgRef} className="btn btn-soft" style={{ borderRadius: 6 }} onClick={() => setBgOpen(true)}>Add</button>}
          </div>
          <MediaGallery anchor={bgRef} open={bgOpen} onClose={() => setBgOpen(false)} allowVideo={false} onPick={(m) => set('backgroundImage', m.url)} />
        </div>
        <div className="rp-sec">
          <div className="rp-row"><span style={{ color: 'var(--q-text-primary)' }}>Brand logo</span>
            {t.logo ? <span className="row gap-4"><img src={t.logo} alt="" style={{ height: 22, maxWidth: 70, objectFit: 'contain' }} /><IconBtn icon="trash" label="Remove logo" onClick={() => set('logo', '')} /></span> : <button ref={logoRef} className="btn btn-soft" style={{ borderRadius: 6 }} onClick={() => setLogoOpen(true)}>Add</button>}
          </div>
          <MediaGallery anchor={logoRef} open={logoOpen} onClose={() => setLogoOpen(false)} allowVideo={false} onPick={(m) => set('logo', m.url)} />
        </div>
        <div className="rp-sec">
          <span className="rp-title" style={{ fontWeight: 400 }}>Rounded corners</span>
          <div className="row gap-6">
            {[['square', 0], ['soft', 6], ['rounded', 14]].map(([k, r]) => (
              <button key={k} aria-label={k} onClick={() => set('corners', k)} className={cx('icon-btn', t.corners === k && 'active')} style={{ width: 34, height: 30 }}>
                <span style={{ width: 16, height: 16, borderLeft: '2px solid currentColor', borderTop: '2px solid currentColor', borderBottom: '2px solid currentColor', borderRadius: `${r}px 0 0 ${r}px` }} />
              </button>
            ))}
          </div>
        </div>
        {[['Welcome screen & endings', 'sizeWelcome', 'alignWelcome'], ['Questions', 'sizeQuestions', 'alignQuestions']].map(([l, sk, ak]) => (
          <div key={sk} className="rp-sec">
            <span className="rp-title" style={{ fontWeight: 400 }}>{l}</span>
            <div className="row between">
              <div className="size-seg">{[['lg', 'Lg'], ['md', 'Md'], ['sm', 'Sm']].map(([k, x]) => <button key={k} className={t[sk] === k ? 'on' : ''} onClick={() => set(sk, k)}>{x}</button>)}</div>
              <div className="row gap-2"><IconBtn icon="align-center" label="Center" active={t[ak] === 'center'} onClick={() => set(ak, 'center')} /><IconBtn icon="align" label="Left" active={t[ak] !== 'center'} onClick={() => set(ak, 'left')} /></div>
            </div>
          </div>
        ))}
        <div className="row between" style={{ padding: '12px 16px 16px', position: 'sticky', bottom: 0, background: 'var(--q-bg-canvas)' }}>
          <button className="t-body-s muted" onClick={() => apply(original.current)}>Revert</button>
          <Btn onClick={async () => {
            const name = draft.name && !GALLERY_THEMES.some((g) => g.name === draft.name) ? draft.name : `My theme ${(mine.data?.length || 0) + 1}`;
            await db.from('themes').insert({ org_id: app.org.id, name, config: { ...draft, name } });
            apply({ ...draft, name }); mine.reload(); toast('Theme saved', { ok: true }); setMode('list');
          }}>Save as new theme</Btn>
        </div>
      </div>
    );
  }
  return (
    <div className="col">
      <button className="rp-sec row between" style={{ flexDirection: 'row' }} onClick={() => location.assign('/brand-kits')}><span className="rp-title" style={{ fontWeight: 400 }}>Brand kit</span><Icon name="chevron-right" size={16} /></button>
      <div className="rp-sec">
        <div className="row between"><span className="rp-title" style={{ fontWeight: 400 }}>Themes</span><IconBtn icon="plus" label="New theme" onClick={() => { original.current = content.theme; setDraft({ ...content.theme, name: '' }); setMode('edit'); }} /></div>
        <Seg value={which} onChange={setWhich} options={[{ value: 'mine', label: 'My themes' }, { value: 'gallery', label: 'Gallery' }]} />
        <div className="col gap-8">
          {which === 'mine' && (
            <ThemeCard t={content.theme} name={content.theme.name || 'Current theme'} current onEdit={() => { original.current = content.theme; setDraft(content.theme); setMode('edit'); }} />
          )}
          {themes.filter((x) => !(which === 'mine' && x.config?.name === content.theme.name)).map((x, i) => (
            <ThemeCard key={x.id || x.name + i} t={x.config} name={x.name} onClick={() => { apply({ ...x.config }); toast(`Applied ${x.name}`, { ok: true }); }}
              onDelete={x.id ? async () => { await db.from('themes').delete().eq('id', x.id); mine.reload(); } : null} />
          ))}
          {which === 'mine' && !themes.length && <span className="t-caption muted">Saved themes show up here. Edit the current theme and “Save as new theme”.</span>}
        </div>
      </div>
    </div>
  );
}

function ThemeCard({ t, name, onClick, onEdit, current, onDelete }) {
  return (
    <div className="row gap-10" style={{ background: '#fff', borderRadius: 12, padding: 8, border: current ? '1.5px solid var(--accent-500)' : '1px solid var(--q-border-default)', cursor: 'pointer' }} onClick={onClick || onEdit}>
      <div style={{ width: 54, height: 40, borderRadius: 6, background: t.backgroundImage ? `url(${t.backgroundImage}) center/cover` : t.background, border: '1px solid var(--q-border-subtle)', padding: 6, display: 'flex', flexDirection: 'column', gap: 4, fontFamily: fontStack(t.font) }}>
        <span style={{ color: t.question, fontSize: 10, lineHeight: 1 }}>Aa</span>
        <span style={{ height: 6, width: 30, borderRadius: 3, background: t.answer }} />
        <span style={{ height: 6, width: 16, borderRadius: 3, background: t.button }} />
      </div>
      <span className="grow t-body-s ellipsis">{name}</span>
      {current && <IconBtn icon="pencil" label="Edit theme" onClick={(e) => { e.stopPropagation(); onEdit(); }} />}
      {onDelete && <IconBtn icon="trash" label="Delete theme" onClick={(e) => { e.stopPropagation(); onDelete(); }} />}
    </div>
  );
}

/* ---------- Add content modal (TF 016 / 021 / 022) ---------- */
export function parseImport(text) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim());
  const out = [];
  for (const raw of lines) {
    const isChoice = /^\s+\S/.test(raw) || /^\s*([-*•–]|[a-zA-Z][).]|\d+[).])\s+/.test(raw);
    const text = raw.trim().replace(/^([-*•–]|[a-zA-Z][).]|\d+[).])\s+/, '');
    if (isChoice && out.length) {
      const q = out[out.length - 1];
      if (q.type !== 'multiple_choice') { q.type = 'multiple_choice'; q.choices = []; q.settings = { multiple: false, limit: 'unlimited', limitN: 2, randomize: false, other: false, vertical: true }; }
      q.choices.push({ id: uid('c_'), label: text });
    } else {
      const t = /e-?mail/i.test(text) ? 'email' : /phone|number to reach/i.test(text) ? 'phone' : /rate|scale|how likely/i.test(text) ? 'opinion_scale' : /website|url/i.test(text) ? 'website' : 'short_text';
      out.push(newQuestion(t, { title: text }));
    }
  }
  return out;
}

export function AddContentModal({ onClose, onAdd, initialTab = 'elements' }) {
  const { content, update } = useForm();
  const toast = useToast();
  const [tab, setTab] = useState(initialTab);
  const [q, setQ] = useState('');
  const [text, setText] = useState('');
  const [aiKind, setAiKind] = useState(null);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [gUrl, setGUrl] = useState('');
  const [gOpen, setGOpen] = useState(false);
  const pick = (type) => {
    if (type === 'end_screen' || type === 'redirect') { onAdd({ ending: type === 'redirect' ? 'redirect' : 'end' }); onClose(); return; }
    onAdd({ type }); onClose();
  };
  const all = Object.entries(TYPES).filter(([k]) => !q || TYPES[k].label.toLowerCase().includes(q.toLowerCase()));
  const doImport = (qs) => { update((c) => { c.questions.push(...qs); }); toast(`Imported ${qs.length} question${qs.length === 1 ? '' : 's'}`, { ok: true }); onClose(); onAdd({ focus: qs[0]?.id }); };
  const importGoogle = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/gform?url=' + encodeURIComponent(gUrl));
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Couldn’t read that form');
      const qs = d.questions.map((x) => {
        const nq = newQuestion(x.type, { title: x.title, description: x.description || '', required: !!x.required });
        if (x.choices?.length && nq.choices) nq.choices = x.choices.map((label) => ({ id: uid('c_'), label }));
        if (x.multiple && nq.settings) nq.settings.multiple = true;
        return nq;
      });
      doImport(qs);
    } catch (e) { toast(e.message, { error: true }); } finally { setBusy(false); }
  };
  const generate = async () => {
    setBusy(true);
    try {
      const d = await ai('generate_form', { prompt, kind: aiKind });
      const qs = (d.questions || []).map((x) => {
        const type = TYPES[x.type] ? x.type : 'short_text';
        const nq = newQuestion(type, { title: x.title, description: x.description || '', required: !!x.required });
        if (x.choices?.length && nq.choices && !['yes_no', 'legal'].includes(type)) nq.choices = x.choices.map((label) => ({ id: uid('c_'), label: String(label) }));
        return nq;
      });
      if (!qs.length) throw new Error('The AI didn’t return any questions. Try describing your goal differently.');
      update((c) => {
        c.questions.push(...qs);
        if (d.conversation_prompt) c.conversation = { ...c.conversation, enabled: true, prompt: d.conversation_prompt };
        if (d.ending) c.endings[0] = { ...c.endings[0], title: d.ending };
      });
      toast(`Added ${qs.length} questions ✨`, { ok: true });
      onClose(); onAdd({ focus: qs[0].id });
    } catch (e) { toast(e.message, { error: true }); } finally { setBusy(false); }
  };
  const Item = ({ type, boxed }) => (
    <button className={cx('el-item', boxed && 'boxed')} onClick={() => pick(type)}><QType type={type} tile />{TYPES[type].label}</button>
  );
  return (
    <Modal onClose={onClose} width={762} canvas hideClose bodyStyle={{ padding: 0 }}>
      <div className="row gap-8" style={{ padding: '14px 20px 10px', position: 'relative' }}>
        {[['elements', 'Add form elements'], ['import', 'Import questions'], ['ai', 'Create with AI']].map(([k, l]) => <button key={k} className={cx('toptab', tab === k && 'on')} onClick={() => setTab(k)}>{l}</button>)}
        <IconBtn icon="x" label="Close" onClick={onClose} style={{ position: 'absolute', right: 16, top: 14 }} />
      </div>
      <div style={{ background: tab === 'elements' ? '#fff' : 'transparent', borderRadius: 20, margin: '0 10px 10px', padding: tab === 'elements' ? '26px 24px' : '16px 22px 20px', minHeight: 300 }}>
        {tab === 'elements' && (
          <div style={{ display: 'grid', gridTemplateColumns: '158px 1fr 1fr 1fr', gap: 22 }}>
            <div className="col gap-8">
              <div className="row gap-6" style={{ border: '1px solid var(--q-border-default)', borderRadius: 999, padding: '6px 10px', marginBottom: 10 }}><Icon name="search" size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search form elements" style={{ border: 0, outline: 'none', fontSize: 12, width: '100%' }} aria-label="Search form elements" /></div>
              {!q && <>
                <span className="row gap-4 t-label-m" style={{ fontWeight: 400 }}><Logo height={12} /></span>
                <Item type="conversation_starter" boxed /><Item type="ai_followup" boxed />
                <span className="el-cat" style={{ marginTop: 12 }}>Recommended</span>
                {RECOMMENDED.map((t) => <Item key={t} type={t} boxed />)}
              </>}
            </div>
            {q ? (
              <div className="col gap-2" style={{ gridColumn: 'span 3' }}>{all.map(([k]) => <Item key={k} type={k} />)}{!all.length && <span className="t-body-s muted">No elements match “{q}”.</span>}</div>
            ) : [['Contact info', 'Text & Video'], ['Choice', 'Other'], ['Rating & ranking', 'Layout']].map((pair, i) => (
              <div key={i} className="col">
                {pair.map((g) => (
                  <div key={g} className="col gap-2" style={{ marginBottom: 14 }}>
                    {g !== 'Layout' && <span className="el-cat">{g}</span>}
                    {g === 'Layout' && <span style={{ height: 18 }} />}
                    {Object.entries(TYPES).filter(([, t]) => t.group === g).map(([k]) => <Item key={k} type={k} />)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {tab === 'import' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 14 }}>
            <div className="col gap-8">
              <span className="t-body-s">Form questions</span>
              <textarea className="textarea" style={{ minHeight: 230, borderColor: 'var(--ink-900)' }} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Copy and paste or type in your questions, and press enter after each one.\n\nWhich tour did you join?\n  Blok M\n  Menteng\nWhat could we do better?'} autoFocus />
            </div>
            <div className="col gap-12">
              <div className="col gap-8 center" style={{ textAlign: 'center', padding: '6px 8px 14px', borderBottom: '1px solid var(--q-border-default)' }}>
                <span className="t-caption" style={{ fontSize: 12 }}>Save time — upload your questions directly from a Google Form</span>
                {!gOpen ? <Btn kind="secondary" onClick={() => setGOpen(true)}>Import Google Form</Btn> : (
                  <div className="col gap-6" style={{ width: '100%' }}>
                    <input className="field sm" placeholder="https://docs.google.com/forms/…" value={gUrl} onChange={(e) => setGUrl(e.target.value)} autoFocus />
                    <Btn loading={busy} disabled={!/docs\.google\.com\/forms|forms\.gle/.test(gUrl)} onClick={importGoogle}>Import</Btn>
                    <span className="t-caption muted">The form must be shared publicly (“Anyone with the link”).</span>
                  </div>
                )}
              </div>
              <div style={{ background: 'var(--accent-100)', border: '1px solid var(--accent-500)', borderRadius: 14, padding: 12, fontSize: 11 }} className="col gap-6">
                <Icon name="help" size={14} />
                <span>• Import questions in most languages</span><span>• Add any answer choices below your questions (indent them or start with “-”)</span><span>• Edit and adjust formatting later</span>
              </div>
            </div>
            <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end' }}>
              <Btn kind={text.trim() ? 'primary' : 'soft'} disabled={!text.trim()} onClick={() => doImport(parseImport(text))}>Import questions</Btn>
            </div>
          </div>
        )}
        {tab === 'ai' && (
          !aiKind ? (
            <div className="row gap-14 wrap">
              {[['all', 'sparkle', '#d6c2ff', 'For all forms', 'Use AI to create questions for any form and business goal.'], ['lead', 'columns', '#a9d4ff', 'For lead qualification forms', 'Qualify your leads with AI-generated questions and scoring rules.']].map(([k, ic, bg, t, d]) => (
                <button key={k} className="row gap-12" style={{ flex: 1, minWidth: 260, textAlign: 'left', alignItems: 'flex-start', border: '1px solid var(--q-border-default)', borderRadius: 14, padding: 14, background: '#fff' }} onClick={() => setAiKind(k)}>
                  <span style={{ width: 34, height: 34, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={ic} size={18} /></span>
                  <span className="col gap-4"><span className="t-body-s" style={{ fontSize: 15 }}>{t}</span><span className="t-caption muted">{d}</span></span>
                </button>
              ))}
            </div>
          ) : (
            <div className="col gap-12">
              <button className="row gap-6 t-body-s" onClick={() => setAiKind(null)}><Icon name="arrow-left" size={14} />Back</button>
              <span className="t-h3">{aiKind === 'lead' ? 'Who are you trying to qualify?' : 'What’s the goal of your form?'}</span>
              <textarea className="textarea" style={{ minHeight: 120 }} autoFocus value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={aiKind === 'lead' ? 'e.g. B2B SaaS buyers with 20+ employees who need SSO, budget over $5k/year' : 'e.g. Find out why customers cancel their subscription, and invite unhappy ones to chat'} />
              <div className="row between"><span className="t-caption muted">AI suggestions can be wrong — review every question before publishing.</span><Btn icon="sparkle" loading={busy} disabled={prompt.trim().length < 8} onClick={generate}>Generate questions</Btn></div>
            </div>
          )
        )}
      </div>
    </Modal>
  );
}

/* ---------- Form settings (TF 079–085) ---------- */
const LANGS = ['Arabic', 'English', 'Catalan', 'Chinese (simplified)', 'Chinese (traditional)', 'Croatian', 'Czech', 'Danish', 'Dutch', 'Estonian', 'Finnish', 'French', 'German (formal)', 'German (informal)', 'Greek', 'Hebrew', 'Hungarian', 'Italian', 'Japanese', 'Korean', 'Norwegian', 'Polish', 'Portuguese (Brazil)', 'Portuguese (Portugal)', 'Russian', 'Spanish', 'Swedish', 'Turkish', 'Ukrainian'];
export function FormSettingsModal({ onClose, initial = 'general' }) {
  const { content, update } = useForm();
  const app = useApp();
  const [page, setPage] = useState(initial);
  const [s, setS] = useState(structuredClone(content.settings));
  const [upsell, setUpsell] = useState(false);
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));
  const Row = ({ k, l, hint, disabled }) => (
    <div className="row between" style={{ minHeight: 40 }}><span className="col"><span className="t-body-s" style={{ fontSize: 14 }}>{l}</span>{hint && <span className="t-caption muted">{hint}</span>}</span><Toggle on={!!s[k]} disabled={disabled} onChange={(v) => set(k, v)} label={l} /></div>
  );
  if (upsell) {
    return (
      <Modal onClose={() => setUpsell(false)} width={720} canvas>
        <div className="col center gap-12" style={{ minHeight: 360, textAlign: 'center' }}>
          <span style={{ width: 74, height: 74, borderRadius: '50%', background: 'var(--accent-100)', color: 'var(--accent-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="translate" size={28} /></span>
          <h2 className="t-h3" style={{ fontSize: 18, fontWeight: 400 }}>Automate form translations</h2>
          <p className="t-body-s muted" style={{ maxWidth: 300 }}>Automatically translate your form to respondents in your selected languages</p>
          <button className="btn btn-upgrade" onClick={() => location.assign('/plans')}><Icon name="diamond" />Upgrade plan</button>
          <p className="t-caption" style={{ color: 'var(--brown-600)', maxWidth: 260 }}>Available on these plans: Business, Enterprise, Growth Pro, Growth Custom</p>
        </div>
      </Modal>
    );
  }
  const nav = [['general', 'General'], ['access', 'Access & Scheduling'], ['language', 'Language'], '-', ['tracking', 'Tracking'], ['refs', 'Block References'], '-', ['followups', 'Follow-ups']];
  return (
    <Modal onClose={onClose} width={500} canvas hideClose title={<h2 className="t-h2" style={{ fontSize: 20 }}>Form settings</h2>} footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={() => { update((c) => { c.settings = s; }); onClose(); }}>Save</Btn></>}>
      <div className="row gap-14" style={{ alignItems: 'flex-start' }}>
        <div className="col gap-2" style={{ width: 112, flex: 'none' }}>
          {nav.map((n, i) => n === '-' ? <div key={i} className="divider" style={{ margin: '6px 0' }} /> : (
            <button key={n[0]} className={cx('cat-item')} style={{ fontSize: 12, background: page === n[0] ? 'var(--q-bg-control)' : undefined, justifyContent: 'flex-start', gap: 6 }} onClick={() => setPage(n[0])}>{n[0] === 'followups' && <Icon name="link" size={12} />}{n[1]}</button>
          ))}
        </div>
        <div className="grow" style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', minHeight: 300 }}>
          {page === 'general' && (
            <div className="col">
              <span className="t-label-m" style={{ margin: '4px 0 6px' }}>Display</span>
              <Row k="branding" l="Qwery branding" hint={(app.org.plan || 'free') === 'free' ? 'Remove branding on the Plus plan' : null} disabled={(app.org.plan || 'free') === 'free'} />
              <Row k="arrows" l="Navigation arrows" /><Row k="progress" l="Progress bar" /><Row k="numbers" l="Question number" /><Row k="letters" l="Letters on answers" />
              <div className="divider" style={{ margin: '8px 0' }} />
              <span className="t-label-m" style={{ margin: '4px 0 6px' }}>Preferences</span>
              <Row k="autosave" l="Autosave progress" /><Row k="freeNav" l="Free form navigation" /><Row k="conversations" l="Start conversations from answers" />
            </div>
          )}
          {page === 'access' && (
            <div className="col gap-12">
              <span className="t-label-m">Access &amp; Scheduling</span>
              <div className="row between"><span className="t-body-s">Close form now</span><Toggle on={!!s.access.closed} onChange={(v) => set('access', { ...s.access, closed: v })} label="Close form" /></div>
              <label className="col gap-4"><span className="t-body-s">Close on a date</span><input type="datetime-local" className="field sm" value={s.access.close_at || ''} onChange={(e) => set('access', { ...s.access, close_at: e.target.value })} /></label>
              <label className="col gap-4"><span className="t-body-s">Close after this many responses</span><input type="number" min="1" className="field sm" placeholder="No limit" value={s.access.response_limit || ''} onChange={(e) => set('access', { ...s.access, response_limit: e.target.value })} /></label>
            </div>
          )}
          {page === 'language' && (
            <div className="col gap-10">
              <span className="t-label-m">Form Languages</span>
              <div className="row between gap-8"><span className="t-body-s">Main language</span><div style={{ width: 180 }}><Select value={s.language} onChange={(v) => set('language', v)} options={LANGS.map((l) => ({ value: l, label: l }))} search width={232} /></div></div>
              <div className="divider" />
              <div className="row between"><span className="row gap-6 t-label-m">Translations <span style={{ color: 'var(--brown-600)' }}><Icon name="diamond" size={14} /></span></span><Toggle on={false} onChange={() => setUpsell(true)} label="Translations" /></div>
              <p className="t-caption muted">Turn on automatic translations in your form. If someone doesn’t understand your form’s language, they can switch it to their browser’s default language.</p>
            </div>
          )}
          {page === 'tracking' && (
            <div className="col gap-10">
              <span className="t-label-m">Tracking</span>
              <label className="col gap-4"><span className="t-body-s">Google Analytics 4 measurement ID</span><input className="field sm" placeholder="G-XXXXXXX" value={s.tracking?.ga || ''} onChange={(e) => set('tracking', { ...s.tracking, ga: e.target.value })} /></label>
              <label className="col gap-4"><span className="t-body-s">Meta Pixel ID</span><input className="field sm" placeholder="1234567890" value={s.tracking?.pixel || ''} onChange={(e) => set('tracking', { ...s.tracking, pixel: e.target.value })} /></label>
            </div>
          )}
          {page === 'refs' && (
            <div className="col gap-8"><span className="t-label-m">Block References</span><p className="t-caption muted">Reference IDs for each question — use them in webhooks, hidden fields and answer recall (type {'{{'}id{'}}'} in a question title).</p>
              {content.questions.map((q, i) => <div key={q.id} className="row gap-8 t-caption"><QType type={q.type} n={i + 1} small /><span className="grow ellipsis">{q.title || 'Untitled'}</span><code style={{ fontSize: 11 }}>{q.id}</code></div>)}
            </div>
          )}
          {page === 'followups' && (
            <div className="col gap-10"><span className="t-label-m">Follow-ups</span><p className="t-caption muted">Invite respondents to a conversation after they submit. Configure who gets invited from the Logic tab → Conversation triggers.</p>
              <div className="row between"><span className="t-body-s">Allow conversations</span><Toggle on={s.conversations !== false} onChange={(v) => set('conversations', v)} label="Allow conversations" /></div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Preview (TF 074–076) ---------- */
export function PreviewModal({ onClose, startAt, initial = 'desktop' }) {
  const { content, form } = useForm();
  const app = useApp();
  const [dev, setDev] = useState(initial);
  const [key, setKey] = useState(0);
  return (
    <div className="overlay" style={{ background: 'rgba(16,16,16,.85)', flexDirection: 'column', gap: 12 }}>
      <div className="row gap-10" style={{ color: '#fff' }}>
        <Seg className="dark" value={dev} onChange={setDev} options={[{ value: 'desktop', label: 'Desktop', icon: 'monitor' }, { value: 'mobile', label: 'Mobile', icon: 'phone' }]} />
        <button className="btn btn-secondary" onClick={() => setKey((k) => k + 1)}><Icon name="rotate" />Restart</button>
        <button className="btn btn-secondary" onClick={onClose}><Icon name="x" />Close preview</button>
      </div>
      <div style={{ width: dev === 'mobile' ? 375 : 'min(1200px, 94vw)', height: dev === 'mobile' ? 'min(740px, 84vh)' : '84vh', borderRadius: dev === 'mobile' ? 36 : 16, overflow: 'hidden', background: '#fff', border: dev === 'mobile' ? '10px solid #222' : 0, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'auto' }}>
          <FormRunner key={key + dev} content={content} form={form} mode="preview" frame={dev === 'mobile' ? 'mobile' : 'box'} orgName={app.org.name} plan={app.org.plan} startAt={startAt} />
        </div>
      </div>
      <span className="t-caption" style={{ color: 'var(--ink-300)' }}>Preview — answers here aren’t saved.</span>
    </div>
  );
}

/* ---------- Accessibility (TF 077–078) ---------- */
export function AccessibilityPanel({ anchor, open, onClose }) {
  const { content } = useForm();
  const t = content.theme;
  const [openSec, setOpenSec] = useState('color');
  const checks = useMemo(() => {
    const bg = t.background || '#fff';
    const color = [
      ['Questions have enough color contrast with background.', contrast(t.question, bg) >= 4.5],
      ['Answers have enough color contrast with background.', contrast(t.answer, bg) >= 3],
      ['Buttons have enough color contrast with background.', contrast(t.button, bg) >= 3],
      ['Button text has enough color contrast with button background.', contrast(t.buttonText, t.button) >= 4.5],
    ];
    const imgs = [...content.questions.filter((q) => q.media?.url && q.media.kind !== 'video').map((q) => [`“${q.title || 'Untitled'}” image has alt text.`, !!q.media.alt]),
      ...content.questions.filter((q) => q.type === 'picture_choice').flatMap((q) => q.choices.filter((c) => c.image).map((c) => [`Picture “${c.label || 'untitled'}” has a label or alt text.`, !!(c.label || c.alt)]))];
    const cont = content.questions.map((q, i) => [`Question ${i + 1} has a title.`, !!q.title?.trim()]);
    const other = [['Form has a progress indicator or numbered questions.', content.settings.progress !== false || content.settings.numbers !== false], ['Navigation arrows are available for keyboard users.', content.settings.arrows !== false]];
    return { color, alt: imgs.length ? imgs : [['No images need alt text.', true]], content: cont.length ? cont : [['Add questions to check content.', true]], other };
  }, [t, content]);
  const sec = (k, l, desc) => {
    const list = checks[k]; const ok = list.every((x) => x[1]);
    return (
      <div key={k} style={{ borderTop: '1px solid var(--q-border-default)' }}>
        <button className="row between" style={{ width: '100%', padding: '10px 0' }} onClick={() => setOpenSec(openSec === k ? null : k)}>
          <span className="t-body-s">{l}</span><span className="row gap-6"><span className={cx('badge', ok ? 'accent' : 'danger')} style={{ fontSize: 10 }}>{ok ? 'All clear!' : `${list.filter((x) => !x[1]).length} to fix`}</span><Icon name={openSec === k ? 'chevron-up' : 'chevron-down'} size={14} /></span>
        </button>
        {openSec === k && (
          <div className="col gap-8" style={{ paddingBottom: 10, fontSize: 12 }}>
            {desc && <p className="t-caption muted">{desc}</p>}
            {list.map(([m, good], i) => <span key={i} className="row gap-8" style={{ alignItems: 'flex-start', color: good ? undefined : 'var(--red-500)' }}><Icon name={good ? 'check' : 'x'} size={14} />{m}</span>)}
          </div>
        )}
      </div>
    );
  };
  return (
    <Popover anchor={anchor} open={open} onClose={onClose} width={360} align="center">
      <div className="col" style={{ padding: '4px 8px' }}>
        <div className="row between" style={{ paddingBottom: 8 }}><span className="t-body-s" style={{ fontSize: 15 }}>Accessibility</span><IconBtn icon="x" label="Close" onClick={onClose} /></div>
        {sec('color', 'Color', 'Contrast between text, button, and background ensures your content is readable. Contrast ratio of 3:1 for graphics and large text, and 4.5 for small text.')}
        {sec('alt', 'Alt text')}
        {sec('content', 'Content')}
        {sec('other', 'Other')}
      </div>
    </Popover>
  );
}

export function useNewForm() { return emptyContent; }
export { DEFAULT_THEME };
