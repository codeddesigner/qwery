import { useRef, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { DEFAULT_THEME, FONTS, fontStack, loadFont, uid } from '../lib/questions.js';
import { navigate } from '../lib/router.js';
import { db } from '../lib/sb.js';
import { useApp } from '../lib/store.jsx';
import { Btn, Confirm, cx, IconBtn, MenuButton, Modal, PageLoader, Select, useAsync, useToast } from '../ui.jsx';
import { ColorButton, MediaGallery } from './editor/parts.jsx';

function CreateFlow({ onClose, onCreated }) {
  const app = useApp();
  const toast = useToast();
  const [step, setStep] = useState('method');
  const [name, setName] = useState('');
  const [url, setUrl] = useState('https://');
  const [busy, setBusy] = useState(false);
  const create = async (assets = {}, themes = []) => {
    setBusy(true);
    try {
      const { data } = await db.from('brand_kits').insert({ org_id: app.org.id, name: name.trim() || 'My brand kit', assets: { logos: [], fonts: [], colors: [], media: [], ...assets }, themes }).select('*').single();
      toast('Brand kit created', { ok: true }); onCreated(data);
    } catch (e) { toast(e.message, { error: true }); } finally { setBusy(false); }
  };
  const match = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/brand?url=' + encodeURIComponent(url));
      const d = r.ok ? await r.json() : {};
      if (!name.trim() && d.name) setName(d.name);
      const accent = d.colors?.[0] || DEFAULT_THEME.answer;
      await create({ logos: d.logo ? [{ id: uid('g_'), name: 'Logos', items: [d.logo] }] : [], colors: d.colors?.length ? [{ id: uid('g_'), name: 'Website colors', items: d.colors }] : [] },
        [{ ...DEFAULT_THEME, name: `${d.name || name || 'Brand'} theme`, answer: accent, button: accent, logo: d.logo || '' }]);
    } catch (e) { toast(e.message, { error: true }); setBusy(false); }
  };
  if (step === 'method') {
    return (
      <Modal onClose={onClose} width={740} canvas hideClose bodyStyle={{ padding: 0 }}>
        <IconBtn icon="x" label="Close" onClick={onClose} style={{ position: 'absolute', right: 18, top: 18 }} />
        <div className="col center gap-24" style={{ minHeight: 430, padding: 24 }}>
          <h2 className="t-h2">How would you like to create this brand kit?</h2>
          <div className="row gap-12 wrap center">
            {[['scratch', 'plus', '#a9d4ff', 'Start from scratch', 'Upload your own logos, colors and branded assets'], ['match', 'sparkle', '#a6f0c6', 'Match my brand', 'Automatically match your website’s branding']].map(([k, ic, bg, t, d]) => (
              <button key={k} className="big-option" style={{ width: 180, minWidth: 180, padding: 22 }} onClick={() => setStep(k)}>
                <span style={{ width: 42, height: 42, borderRadius: 4, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}><Icon name={ic} /></span>
                <span className="t-body-s" style={{ fontSize: 15 }}>{t}</span><span className="t-caption muted">{d}</span>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    );
  }
  return (
    <Modal title="Name brand kit" onClose={onClose} width={420} footer={<><Btn kind="secondary" onClick={() => setStep('method')}>Back</Btn><Btn loading={busy} disabled={step === 'scratch' ? !name.trim() : !/^https?:\/\/[^\s.]+\.[^\s]+/.test(url)} onClick={() => (step === 'scratch' ? create() : match())}>Create</Btn></>}>
      <div className="col gap-10">
        <input className="field" placeholder="e.g. Good Guide brand kit" value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Brand kit name" />
        {step === 'match' && <><span className="t-caption muted">Your website</span><input className="field" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Website" /></>}
      </div>
    </Modal>
  );
}

function Section({ title, children, onAdd, addRef }) {
  return (
    <div className="card col gap-10" style={{ padding: '12px 14px' }}>
      <div className="row between"><span className="t-body-s" style={{ fontSize: 15 }}>{title}</span><span ref={addRef}><IconBtn icon="plus" label={`Add to ${title}`} boxed onClick={onAdd} /></span></div>
      {children}
    </div>
  );
}

function Kit({ id, tab }) {
  const toast = useToast();
  const kit = useAsync(async () => (await db.from('brand_kits').select('*').eq('id', id).single()).data, [id]);
  const [gal, setGal] = useState(null);
  const [del, setDel] = useState(null);
  const refs = { logos: useRef(null), media: useRef(null) };
  const groupRefs = useRef({});
  const gref = (gid) => groupRefs.current[gid] || (groupRefs.current[gid] = { current: null });
  if (!kit.data) return <PageLoader />;
  const k = kit.data;
  const A = { logos: [], fonts: [], colors: [], media: [], ...k.assets };
  const save = async (assets, themes = k.themes) => { kit.setData({ ...k, assets, themes }); await db.from('brand_kits').update({ assets, themes }).eq('id', id); };
  const addGroup = (key, name) => save({ ...A, [key]: [...A[key], { id: uid('g_'), name, items: [] }] });
  const setGroup = (key, gid, fn) => save({ ...A, [key]: A[key].map((g) => (g.id === gid ? fn({ ...g }) : g)) });
  const groupMenu = (key, g) => <MenuButton trigger={<IconBtn icon="more" label="Group options" />} items={[{ label: 'Rename', onClick: () => { const n = prompt('Rename group', g.name); if (n) setGroup(key, g.id, (x) => ({ ...x, name: n })); } }, { label: 'Delete', danger: true, onClick: () => setDel({ key, g }) }]} />;
  const mediaGroup = (key, g) => (
    <div key={g.id} className="col gap-8">
      <div className="row between t-caption"><span>{g.name}</span><span className="row gap-2">{groupMenu(key, g)}<span ref={gref(g.id)}><IconBtn icon="plus" label="Add image" onClick={() => setGal({ key, gid: g.id })} /></span></span></div>
      <div className="row gap-8 wrap">
        {g.items.map((u, i) => <div key={i} style={{ position: 'relative' }}><div style={{ width: key === 'logos' ? 60 : 70, height: key === 'logos' ? 20 : 46, background: `var(--q-bg-subtle) url("${u}") center/${key === 'logos' ? 'contain' : 'cover'} no-repeat`, borderRadius: 4, padding: key === 'logos' ? 0 : 0, boxSizing: 'content-box', border: key === 'logos' ? '6px solid var(--q-bg-subtle)' : 0 }} /><button className="icon-btn" style={{ position: 'absolute', right: -8, top: -8, width: 18, height: 18, background: '#fff', borderRadius: '50%', boxShadow: 'var(--elev-1)' }} aria-label="Remove" onClick={() => setGroup(key, g.id, (x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))}><Icon name="x" size={10} /></button></div>)}
        {!g.items.length && <span className="t-caption muted">No images yet</span>}
      </div>
      <MediaGallery anchor={gref(g.id)} open={gal?.gid === g.id} allowVideo={false} onClose={() => setGal(null)} onPick={(m) => setGroup(key, g.id, (x) => ({ ...x, items: [...x.items, m.url] }))} />
    </div>
  );
  return (
    <div style={{ minHeight: '100vh', background: 'var(--q-bg-canvas)' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid var(--q-border-default)' }}>
        <div className="row gap-8 t-caption" style={{ padding: '10px 16px' }}><button className="muted" onClick={() => navigate('/brand-kits')}>Brand kits</button>/<span>{k.name}</span></div>
        <div className="tabs" style={{ paddingLeft: 80 }}>{[['assets', 'Assets'], ['themes', 'Themes']].map(([t, l]) => <button key={t} className={cx('tab', (tab || 'assets') === t && 'on')} style={{ fontSize: 13 }} onClick={() => navigate(`/brand-kits/${id}/${t}`)}>{l}<span className="bar" /></button>)}</div>
      </div>
      <div className="col gap-8" style={{ maxWidth: 380, margin: '14px auto', padding: '0 12px 40px' }}>
        {(tab || 'assets') === 'assets' ? (
          <>
            <Section title="Logos" onAdd={() => addGroup('logos', 'New logo collection')}>{A.logos.map((g) => mediaGroup('logos', g))}</Section>
            <Section title="Fonts" onAdd={() => save({ ...A, fonts: [...A.fonts, { id: uid('f_'), name: 'Calamantus' }] })}>
              {!A.fonts.length && <span className="t-caption">Select a pre-existing font, or upload a custom one</span>}
              {A.fonts.map((f, i) => <div key={f.id} className="row gap-6"><div className="grow"><Select value={f.name} onChange={(v) => { loadFont(v); save({ ...A, fonts: A.fonts.map((x, j) => (j === i ? { ...x, name: v } : x)) }); }} options={FONTS.map((x) => ({ value: x, label: x }))} search renderValue={(c) => <span style={{ fontFamily: fontStack(c?.value) }}>{c?.label}</span>} /></div><IconBtn icon="trash" label="Remove font" onClick={() => save({ ...A, fonts: A.fonts.filter((_, j) => j !== i) })} /></div>)}
            </Section>
            <Section title="Colors" onAdd={() => addGroup('colors', 'New colors asset')}>
              {A.colors.map((g) => (
                <div key={g.id} className="col gap-8">
                  <div className="row between t-caption"><span>{g.name}</span>{groupMenu('colors', g)}</div>
                  <div className="row gap-8 wrap">
                    {g.items.map((c, i) => <ColorButton key={i} value={c} label="Brand color" onChange={(v) => setGroup('colors', g.id, (x) => ({ ...x, items: x.items.map((y, j) => (j === i ? v : y)) }))} />)}
                    <IconBtn icon="plus" label="Add color" onClick={() => setGroup('colors', g.id, (x) => ({ ...x, items: [...x.items, '#4D4DE1'] }))} />
                  </div>
                </div>
              ))}
            </Section>
            <Section title="Media" onAdd={() => addGroup('media', 'New media collection')}>{A.media.map((g) => mediaGroup('media', g))}</Section>
          </>
        ) : (
          <div className="card col gap-10" style={{ padding: 14 }}>
            <div className="row between"><span className="t-body-s" style={{ fontSize: 15 }}>Themes</span><IconBtn icon="plus" label="New theme" boxed onClick={() => { const c = A.colors[0]?.items?.[0] || DEFAULT_THEME.answer; save(A, [...(k.themes || []), { ...DEFAULT_THEME, name: `${k.name} theme ${(k.themes || []).length + 1}`, answer: c, button: c, logo: A.logos[0]?.items?.[0] || '', font: A.fonts[0]?.name || 'Calamantus' }]); toast('Theme added — pick it from Design → Themes in any form', { ok: true }); }} /></div>
            {(k.themes || []).map((t, i) => (
              <div key={i} className="row gap-10" style={{ border: '1px solid var(--q-border-default)', borderRadius: 12, padding: 8 }}>
                <div style={{ width: 54, height: 40, borderRadius: 6, background: t.background, border: '1px solid var(--q-border-subtle)', padding: 6, fontFamily: fontStack(t.font) }} className="col gap-4"><span style={{ fontSize: 10, color: t.question }}>Aa</span><span style={{ height: 6, width: 30, borderRadius: 3, background: t.answer }} /></div>
                <input className="field sm grow" value={t.name} onChange={(e) => save(A, k.themes.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label="Theme name" />
                <ColorButton value={t.answer} label="Accent" onChange={(v) => save(A, k.themes.map((x, j) => (j === i ? { ...x, answer: v, button: v } : x)))} />
                <IconBtn icon="trash" label="Delete theme" onClick={() => save(A, k.themes.filter((_, j) => j !== i))} />
              </div>
            ))}
            {!(k.themes || []).length && <span className="t-caption muted">Themes built from this kit appear in every form’s Design tab.</span>}
          </div>
        )}
      </div>
      {del && <Confirm title="Delete media group?" danger confirmLabel="Delete" body={`“${del.g.name}” and everything in it will be removed from this brand kit.`} onClose={() => setDel(null)} onConfirm={() => save({ ...A, [del.key]: A[del.key].filter((x) => x.id !== del.g.id) })} />}
    </div>
  );
}

export default function BrandKits({ id, tab }) {
  const app = useApp();
  const [create, setCreate] = useState(false);
  const [del, setDel] = useState(null);
  const kits = useAsync(async () => (await db.from('brand_kits').select('*').eq('org_id', app.org.id).order('created_at')).data || [], [app.org.id]);
  if (id) return <Kit id={id} tab={tab} />;
  return (
    <div style={{ minHeight: '100vh', background: 'var(--q-bg-canvas)' }}>
      <div style={{ background: '#fff', borderBottom: '1px solid var(--q-border-default)', padding: '10px 14px' }}><IconBtn icon="arrow-left" label="Back" onClick={() => navigate('/workspace')} /></div>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '30px 24px' }}>
        <h1 className="t-h2" style={{ fontSize: 20 }}>Brand kits</h1>
        <Btn icon="plus" style={{ margin: '14px 0 12px' }} onClick={() => setCreate(true)}>New brand kit</Btn>
        <div className="divider" style={{ marginBottom: 24 }} />
        {!kits.data?.length && !kits.loading && <div className="empty"><span className="ic"><Icon name="image" /></span><p className="t-h3" style={{ color: 'var(--q-text-primary)' }}>No brand kits yet</p><p className="t-body-s">Keep logos, colors, fonts and themes in one place, so every form looks like you.</p></div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 152px)', gap: 14 }}>
          {(kits.data || []).map((k) => {
            const logo = k.assets?.logos?.[0]?.items?.[0];
            return (
              <div key={k.id} className="card" style={{ overflow: 'hidden', cursor: 'pointer', boxShadow: 'var(--elev-1)' }} onClick={() => navigate('/brand-kits/' + k.id)}>
                <div style={{ height: 106, background: logo ? `var(--ink-100) url("${logo}") center/60% no-repeat` : 'var(--ink-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="t-caption">{!logo && k.name}</div>
                <div className="row between" style={{ padding: '6px 10px' }}><span className="t-caption ellipsis">{k.name}</span><span onClick={(e) => e.stopPropagation()}><MenuButton trigger={<IconBtn icon="more" label="Brand kit options" />} items={[{ label: 'Open', onClick: () => navigate('/brand-kits/' + k.id) }, { label: 'Delete', danger: true, onClick: () => setDel(k) }]} /></span></div>
              </div>
            );
          })}
        </div>
      </div>
      {create && <CreateFlow onClose={() => setCreate(false)} onCreated={(k) => { setCreate(false); navigate('/brand-kits/' + k.id); }} />}
      {del && <Confirm title="Delete brand kit?" danger confirmLabel="Delete" body={`“${del.name}” will be deleted. Forms already using its themes keep their look.`} onClose={() => setDel(null)} onConfirm={async () => { await db.from('brand_kits').delete().eq('id', del.id); kits.reload(); }} />}
    </div>
  );
}
