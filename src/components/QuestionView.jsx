import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { ADDRESS_FIELDS, CONTACT_FIELDS, LETTERS, NO_ANSWER, TYPES, uid } from '../lib/questions.js';
import { storage } from '../lib/sb.js';
import { cx } from '../ui.jsx';

export function OkButton({ label = 'OK', onClick, disabled, check = true, hint = true }) {
  return (
    <div className="row gap-10" style={{ marginTop: 4 }}>
      <button type="button" className="ok-btn" onClick={onClick} disabled={disabled}>{label}{check && <Icon name="check" />}</button>
      {hint && <span className="key-hint">press <b>Enter</b> ↵</span>}
    </div>
  );
}

function shuffle(arr, seed) {
  const a = [...arr]; let s = seed;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------- Choices (multiple choice / yes-no / legal / conversation starter) ---------- */
function Choices({ q, value, onChange, onSubmit, editable, onEditChoice, onAddChoice, onRemoveChoice, letters = true, autoFocusKeys = true }) {
  const multiple = !!q.settings?.multiple;
  const seed = useMemo(() => Math.floor(Math.random() * 1000), []);
  let list = q.choices || [];
  if (!editable && q.settings?.randomize) list = shuffle(list, seed);
  const sel = multiple ? (Array.isArray(value) ? value : []) : value;
  const [otherText, setOtherText] = useState(typeof value === 'object' && value?.other ? value.other : '');
  const [blink, setBlink] = useState(null);
  const isOn = (id) => (multiple ? sel.includes(id) : sel === id);
  const pick = (id) => {
    if (editable) return;
    if (multiple) {
      const next = isOn(id) ? sel.filter((x) => x !== id) : [...sel, id];
      if (q.settings?.limit === 'exact' && next.length > +q.settings.limitN) return;
      onChange(next);
    } else {
      onChange(id); setBlink(id);
      setTimeout(() => onSubmit?.(id), 420);
    }
  };
  useEffect(() => {
    if (editable || !autoFocusKeys) return;
    const h = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey) return;
      const i = LETTERS.indexOf(e.key.toUpperCase());
      if (i >= 0 && i < list.length) { e.preventDefault(); pick(list[i].id); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });
  const vertical = q.settings?.vertical !== false;
  return (
    <div className={cx(vertical ? 'col' : 'row wrap')} style={{ gap: 8, alignItems: 'flex-start' }}>
      {list.map((c, i) => (
        <div key={c.id} className={cx('choice', multiple && 'square', isOn(c.id) && 'on', blink === c.id && 'blink', editable && 'choice-edit')}
          onClick={() => pick(c.id)} role={editable ? undefined : multiple ? 'checkbox' : 'radio'} aria-checked={editable ? undefined : isOn(c.id)} tabIndex={editable ? -1 : 0}
          onKeyDown={(e) => { if (!editable && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); pick(c.id); } }}>
          {letters && <span className="key">{LETTERS[i]}</span>}
          {editable ? (
            <input value={c.label} placeholder={i === 0 ? '' : 'choice'} aria-label={`Choice ${LETTERS[i]}`} onChange={(e) => onEditChoice(c.id, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onAddChoice(i); } if (e.key === 'Backspace' && !c.label && list.length > 1) { e.preventDefault(); onRemoveChoice(c.id, i); } }} autoFocus={c._focus} style={{ minWidth: 100 }} />
          ) : <span className="lbl">{c.label || 'Untitled'}</span>}
          {!editable && isOn(c.id) && <Icon name="check" className="tick" />}
          {editable && list.length > 1 && <button className="del icon-btn" aria-label="Remove choice" onClick={(e) => { e.stopPropagation(); onRemoveChoice(c.id, i); }}><Icon name="x" /></button>}
        </div>
      ))}
      {q.settings?.other && (
        editable ? <div className="choice" style={{ opacity: .7 }}><span className="key">{LETTERS[list.length]}</span><span className="lbl">Other</span></div> : (
          <div className={cx('choice', typeof value === 'object' && value?.other && 'on')}>
            <span className="key">{LETTERS[list.length]}</span>
            <input placeholder="Other" value={otherText} aria-label="Other"
              onChange={(e) => { setOtherText(e.target.value); onChange(multiple ? [...sel.filter((x) => typeof x !== 'object'), { other: e.target.value }] : { other: e.target.value }); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && otherText) onSubmit?.(); }} />
          </div>
        )
      )}
      {editable && <button type="button" className="add-choice" onClick={() => onAddChoice(list.length - 1)}>Add choice</button>}
      {!editable && multiple && (
        <>
          {q.settings?.limit === 'exact' && <span className="t-body-s" style={{ color: 'var(--t-question-70)' }}>Choose {q.settings.limitN}</span>}
          <OkButton onClick={() => onSubmit?.()} />
        </>
      )}
    </div>
  );
}

function Dropdown({ q, value, onChange, onSubmit }) {
  const [text, setText] = useState(q.choices?.find((c) => c.id === value)?.label || '');
  const [open, setOpen] = useState(false);
  const list = (q.choices || []).filter((c) => !text || c.label.toLowerCase().includes(text.toLowerCase()));
  return (
    <div className="col gap-12" style={{ position: 'relative' }}>
      <div className="row" style={{ borderBottom: '1px solid var(--t-answer-30)' }}>
        <input className="text-answer" style={{ border: 0, fontSize: 24 }} placeholder="Type or select an option" value={text} onFocus={() => setOpen(true)}
          onChange={(e) => { setText(e.target.value); setOpen(true); }} onKeyDown={(e) => { if (e.key === 'Enter' && list[0]) { onChange(list[0].id); setText(list[0].label); setOpen(false); setTimeout(() => onSubmit?.(list[0].id), 300); } }} aria-label="Choose an option" />
        <button type="button" style={{ color: 'var(--t-answer)' }} onClick={() => setOpen((o) => !o)} aria-label="Toggle options"><Icon name={open ? 'chevron-up' : 'chevron-down'} size={24} /></button>
      </div>
      {open && (
        <div className="col gap-6" style={{ maxHeight: 240, overflow: 'auto' }}>
          {list.map((c) => (
            <button type="button" key={c.id} className={cx('choice', value === c.id && 'on')} onClick={() => { onChange(c.id); setText(c.label); setOpen(false); setTimeout(() => onSubmit?.(c.id), 300); }}>
              <span className="lbl">{c.label || 'Untitled'}</span>
            </button>
          ))}
          {!list.length && <span className="t-body-s" style={{ color: 'var(--t-question-70)' }}>No suggestions found</span>}
        </div>
      )}
      {value && !open && <OkButton onClick={() => onSubmit?.()} />}
    </div>
  );
}

export function PictureChoices({ q, value, onChange, onSubmit, editable, onTileClick, mobile }) {
  const multiple = !!q.settings?.multiple;
  const sel = multiple ? (Array.isArray(value) ? value : []) : value;
  const isOn = (id) => (multiple ? sel.includes(id) : sel === id);
  const size = q.settings?.supersize ? (mobile ? 150 : 172) : (mobile ? 110 : 130);
  const pick = (id) => {
    if (editable) { onTileClick?.(id); return; }
    if (multiple) onChange(isOn(id) ? sel.filter((x) => x !== id) : [...sel, id]);
    else { onChange(id); setTimeout(() => onSubmit?.(id), 420); }
  };
  const tiles = [...(q.choices || [])];
  return (
    <div className="col gap-12">
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${size}px, ${size + 6}px))`, gap: 8 }}>
        {tiles.map((c, i) => (
          <button type="button" key={c.id} className={cx('pic-choice', isOn(c.id) && 'on')} onClick={() => pick(c.id)} aria-pressed={isOn(c.id)}>
            <div className="img" style={c.image ? { backgroundImage: `url(${c.image})`, filter: c.filter || undefined, transform: c.transform || undefined } : undefined}>{!c.image && <Icon name="image" size={24} />}</div>
            {q.settings?.showLabels !== false && <div className="cap"><span className="key">{LETTERS[i]}</span><span className="ellipsis">{c.label || (editable ? 'Add label' : '')}</span></div>}
          </button>
        ))}
        {q.settings?.other && (
          <button type="button" className={cx('pic-choice', typeof value === 'object' && value?.other && 'on')} onClick={() => !editable && onChange({ other: 'Other' })}>
            <div className="img"><Icon name="image" size={24} /></div>
            <div className="cap"><span className="key">{LETTERS[tiles.length]}</span>Other</div>
          </button>
        )}
      </div>
      {!editable && multiple && <OkButton onClick={() => onSubmit?.()} />}
    </div>
  );
}

function Scale({ q, value, onChange, onSubmit }) {
  const from = +(q.settings?.from ?? 0), to = +(q.settings?.to ?? 10);
  const cells = []; for (let i = from; i <= to; i++) cells.push(i);
  const L = q.settings?.labels || {};
  return (
    <div className="col gap-8" style={{ maxWidth: 560 }}>
      <div className="row gap-6">
        {cells.map((n) => (
          <button type="button" key={n} className={cx('scale-cell', value === n && 'on')} onClick={() => { onChange(n); setTimeout(() => onSubmit?.(n), 380); }} aria-pressed={value === n}>{n}</button>
        ))}
      </div>
      {(L.left || L.center || L.right) && (
        <div className="row between t-body-s" style={{ color: 'var(--t-question-70)' }}><span>{L.left}</span><span>{L.center}</span><span>{L.right}</span></div>
      )}
    </div>
  );
}

function Rating({ q, value, onChange, onSubmit }) {
  const n = +(q.settings?.steps || 5);
  const [hover, setHover] = useState(0);
  return (
    <div className="row gap-8" onMouseLeave={() => setHover(0)}>
      {Array.from({ length: n }, (_, i) => i + 1).map((k) => (
        <button type="button" key={k} aria-label={`${k} of ${n}`} onMouseEnter={() => setHover(k)} onClick={() => { onChange(k); setTimeout(() => onSubmit?.(k), 380); }}
          style={{ color: 'var(--t-answer)', opacity: (hover || value || 0) >= k ? 1 : 0.35 }} className="col center gap-2">
          <Icon name={(hover || value || 0) >= k ? 'star-fill' : 'star'} size={40} />
          <span style={{ fontSize: 14 }}>{k}</span>
        </button>
      ))}
    </div>
  );
}

function Ranking({ q, value, onChange, onSubmit }) {
  const order = Array.isArray(value) && value.length ? value : (q.choices || []).map((c) => c.id);
  const move = (i, d) => { const a = [...order]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div className="col gap-8">
      {order.map((id, i) => {
        const c = q.choices.find((x) => x.id === id) || { label: id };
        return (
          <div key={id} className="choice" style={{ cursor: 'default', width: 320 }}>
            <span className="key">{i + 1}</span><span className="lbl">{c.label}</span>
            <button type="button" aria-label="Move up" onClick={() => move(i, -1)} disabled={i === 0} style={{ opacity: i === 0 ? .3 : 1 }}><Icon name="chevron-up" size={18} /></button>
            <button type="button" aria-label="Move down" onClick={() => move(i, 1)} disabled={i === order.length - 1} style={{ opacity: i === order.length - 1 ? .3 : 1 }}><Icon name="chevron-down" size={18} /></button>
          </div>
        );
      })}
      <OkButton onClick={() => { if (!value) onChange(order); onSubmit?.(order); }} />
    </div>
  );
}

function Matrix({ q, value, onChange, onSubmit }) {
  const v = value || {};
  return (
    <div className="col gap-12" style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: '6px 6px', color: 'var(--t-question)' }}>
        <thead><tr><th />{q.cols.map((c) => <th key={c.id} className="t-body-s" style={{ fontWeight: 400, padding: '0 6px' }}>{c.label}</th>)}</tr></thead>
        <tbody>
          {q.rows.map((r) => (
            <tr key={r.id}>
              <td className="t-body-m" style={{ paddingRight: 12 }}>{r.label}</td>
              {q.cols.map((c) => (
                <td key={c.id} style={{ textAlign: 'center' }}>
                  <button type="button" aria-label={`${r.label}: ${c.label}`} className={cx('scale-cell', v[r.id] === c.id && 'on')} style={{ width: 40, maxWidth: 40 }} onClick={() => onChange({ ...v, [r.id]: c.id })}>
                    {v[r.id] === c.id ? <Icon name="check" size={16} /> : ''}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <OkButton onClick={() => onSubmit?.()} />
    </div>
  );
}

function Fields({ fields, cfg, value, onChange, onSubmit, preview }) {
  const v = value || {};
  const shown = fields.filter((f) => cfg?.[f.key]?.show !== false);
  return (
    <div className="col gap-16" style={{ maxWidth: 400 }}>
      {shown.map((f, i) => (
        <label key={f.key} className="col gap-4">
          <span style={{ fontSize: 15, color: 'var(--t-question)' }}>{f.label}{cfg?.[f.key]?.required ? ' *' : ''}</span>
          <input className="text-answer sm" placeholder={f.ph} value={v[f.key] || ''} disabled={preview} autoFocus={!preview && i === 0}
            type={f.key === 'email' ? 'email' : f.key === 'phone' ? 'tel' : 'text'} autoComplete={({ first_name: 'given-name', last_name: 'family-name', email: 'email', phone: 'tel', company: 'organization', line1: 'address-line1', line2: 'address-line2', city: 'address-level2', state: 'address-level1', zip: 'postal-code', country: 'country-name' })[f.key]}
            onChange={(e) => onChange({ ...v, [f.key]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') onSubmit?.(); }} />
        </label>
      ))}
      {!preview && <OkButton onClick={() => onSubmit?.()} />}
    </div>
  );
}

function DateInput({ value, onChange, onSubmit, q }) {
  const [d, m, y] = (value || '--').split('-').reverse().concat(['', '', '']).slice(0, 3);
  const parts = { d: (value || '').split('-')[2] || '', m: (value || '').split('-')[1] || '', y: (value || '').split('-')[0] || '' };
  void d; void m; void y;
  const set = (k, val) => {
    const p = { ...parts, [k]: val.replace(/\D/g, '') };
    onChange(p.y || p.m || p.d ? `${p.y}-${p.m}-${p.d}` : '');
  };
  const order = q.settings?.format === 'MMDDYYYY' ? ['m', 'd', 'y'] : q.settings?.format === 'YYYYMMDD' ? ['y', 'm', 'd'] : ['d', 'm', 'y'];
  const meta = { d: ['Day', 'DD', 2], m: ['Month', 'MM', 2], y: ['Year', 'YYYY', 4] };
  return (
    <div className="col gap-12">
      <div className="row gap-12" style={{ alignItems: 'flex-end' }}>
        {order.map((k, i) => (
          <label key={k} className="col gap-4" style={{ width: k === 'y' ? 110 : 64 }}>
            <span className="t-body-s" style={{ color: 'var(--t-question-70)' }}>{meta[k][0]}</span>
            <input className="text-answer" style={{ fontSize: 26 }} inputMode="numeric" maxLength={meta[k][2]} placeholder={meta[k][1]} value={parts[k]} onChange={(e) => set(k, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()} autoFocus={i === 0} />
          </label>
        ))}
      </div>
      <OkButton onClick={() => onSubmit?.()} />
    </div>
  );
}

function FileUpload({ value, onChange, onSubmit, preview }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const ref = useRef(null);
  const up = async (file) => {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setErr('Files must be 4MB or smaller.'); return; }
    setBusy(true); setErr('');
    try { const url = await storage.upload(file, 'responses'); onChange({ url, name: file.name, size: file.size }); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="col gap-12" style={{ maxWidth: 520 }}>
      <div className="drop-zone" style={{ borderColor: 'var(--t-answer-60)', background: 'var(--t-answer-10)', color: 'var(--t-answer)' }}
        onClick={() => !preview && ref.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); up(e.dataTransfer.files[0]); }}>
        {busy ? <span className="spin" /> : <Icon name="upload" size={28} />}
        {value?.name ? <span className="t-body-m">{value.name}</span> : <span className="t-body-m"><b>Choose file</b> or drag here</span>}
        <span className="t-caption">Size limit: 4MB</span>
        <input ref={ref} type="file" hidden onChange={(e) => up(e.target.files[0])} />
      </div>
      {err && <span className="err">{err}</span>}
      {!preview && <OkButton onClick={() => onSubmit?.()} disabled={busy} />}
    </div>
  );
}

function Signature({ value, onChange, onSubmit, preview }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); const t = e.touches?.[0] || e; return [t.clientX - r.left, t.clientY - r.top]; };
  const start = (e) => { if (preview) return; drawing.current = true; const ctx = ref.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(...pos(e)); };
  const move = (e) => { if (!drawing.current) return; e.preventDefault(); const ctx = ref.current.getContext('2d'); ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.strokeStyle = getComputedStyle(ref.current).color; ctx.lineTo(...pos(e)); ctx.stroke(); setDirty(true); };
  const end = () => { drawing.current = false; };
  const save = async () => {
    if (!dirty) { onSubmit?.(); return; }
    setBusy(true);
    try {
      const blob = await new Promise((r) => ref.current.toBlob(r, 'image/png'));
      const url = await storage.upload(new File([blob], 'signature.png', { type: 'image/png' }), 'responses');
      onChange({ url }); setTimeout(() => onSubmit?.({ url }), 50);
    } finally { setBusy(false); }
  };
  return (
    <div className="col gap-12">
      <canvas ref={ref} width={520} height={180} style={{ width: '100%', maxWidth: 520, height: 180, borderRadius: 8, border: '1px solid var(--t-answer-60)', background: 'var(--t-answer-10)', color: 'var(--t-answer)', touchAction: 'none', cursor: 'crosshair' }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end} onTouchStart={start} onTouchMove={move} onTouchEnd={end} aria-label="Signature pad" />
      <div className="row gap-12">
        {!preview && <OkButton onClick={save} disabled={busy} hint={false} />}
        {dirty && <button type="button" className="t-body-s u" style={{ color: 'var(--t-answer)' }} onClick={() => { ref.current.getContext('2d').clearRect(0, 0, 520, 180); setDirty(false); onChange(null); }}>Clear</button>}
        {value?.url && !dirty && <span className="t-body-s" style={{ color: 'var(--t-answer)' }}>Signature saved</span>}
      </div>
    </div>
  );
}

function Payment({ q, value, onChange, onSubmit, preview }) {
  const amt = q.settings?.amount ?? 10, cur = q.settings?.currency || 'USD';
  return (
    <div className="col gap-12" style={{ maxWidth: 420 }}>
      <div style={{ border: '1px solid var(--t-answer-60)', background: 'var(--t-answer-10)', borderRadius: 10, padding: 16, color: 'var(--t-answer)' }}>
        <div className="row between"><span className="t-body-m">Total</span><span style={{ fontSize: 28 }}>{new Intl.NumberFormat('en', { style: 'currency', currency: cur }).format(amt)}</span></div>
        <p className="t-caption" style={{ marginTop: 6, color: 'var(--t-question-70)' }}>Test mode — no card is charged. Connect Stripe to take real payments.</p>
      </div>
      {!preview && (value?.status ? <OkButton onClick={() => onSubmit?.()} /> : (
        <button type="button" className="ok-btn" style={{ alignSelf: 'flex-start' }} onClick={() => { const v = { amount: amt, currency: cur, status: 'test' }; onChange(v); setTimeout(() => onSubmit?.(v), 300); }}>{q.settings?.label || 'Pay now'}</button>
      ))}
    </div>
  );
}

function MultiPage({ q, value, onChange, onSubmit, preview }) {
  const v = value || {};
  return (
    <div className="col gap-16" style={{ maxWidth: 480 }}>
      {(q.fields || []).map((f, i) => (
        <label key={f.id} className="col gap-4">
          <span style={{ fontSize: 16, color: 'var(--t-question)' }}>{f.label}{f.required ? ' *' : ''}</span>
          <input className="text-answer sm" disabled={preview} value={v[f.id] || ''} placeholder="Type your answer here…" autoFocus={!preview && i === 0}
            onChange={(e) => onChange({ ...v, [f.id]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && onSubmit?.()} />
        </label>
      ))}
      {!preview && <OkButton onClick={() => onSubmit?.()} />}
    </div>
  );
}

function TextAnswer({ q, value, onChange, onSubmit, preview, autoFocus = true }) {
  const long = q.type === 'long_text';
  const ph = { email: 'name@example.com', phone: '(201) 555-0123', website: 'https://', number: 'Type your answer here…' }[q.type] || 'Type your answer here…';
  const ref = useRef(null);
  useEffect(() => { if (long && ref.current) { ref.current.style.height = 'auto'; ref.current.style.height = ref.current.scrollHeight + 'px'; } }, [value, long]);
  const props = {
    ref, className: 'text-answer', value: value ?? '', placeholder: ph, disabled: preview, autoFocus: !preview && autoFocus, 'aria-label': q.title || 'Your answer',
    onChange: (e) => onChange(q.type === 'number' ? e.target.value.replace(/[^0-9.\-]/g, '') : e.target.value),
    onKeyDown: (e) => { if (e.key === 'Enter' && !(long && e.shiftKey)) { e.preventDefault(); onSubmit?.(); } },
  };
  return (
    <div className="col gap-12">
      {long ? <textarea rows={1} {...props} /> : <input type={q.type === 'email' ? 'email' : q.type === 'phone' ? 'tel' : q.type === 'website' ? 'url' : 'text'} inputMode={q.type === 'number' ? 'decimal' : undefined} {...props} />}
      {q.settings?.maxChars && <span className="t-caption" style={{ color: 'var(--t-question-70)' }}>{String(value || '').length}/{q.settings.maxN}</span>}
      {!preview && <div className="row gap-10"><button type="button" className="ok-btn" onClick={() => onSubmit?.()}>OK<Icon name="check" /></button><span className="key-hint">{long ? <><b>Shift ⇧ + Enter ↵</b> to make a line break</> : <>press <b>Enter</b> ↵</>}</span></div>}
    </div>
  );
}

function VideoEmbed({ url }) {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  const vm = url.match(/vimeo\.com\/(\d+)/);
  const src = yt ? `https://www.youtube.com/embed/${yt[1]}` : vm ? `https://player.vimeo.com/video/${vm[1]}` : null;
  return src
    ? <iframe title="Video" src={src} style={{ width: '100%', aspectRatio: '16/9', border: 0, borderRadius: 8 }} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
    : <video src={url} controls style={{ width: '100%', borderRadius: 8 }} />;
}

export function Media({ media, inline = true }) {
  if (!media?.url || !inline) return null;
  if (media.kind === 'video') return <div style={{ maxWidth: 420, marginBottom: 6 }}><VideoEmbed url={media.url} /></div>;
  return <img src={media.url} alt={media.alt || ''} style={{ maxWidth: 360, maxHeight: 240, borderRadius: 8, objectFit: 'cover', filter: media.filter || undefined, transform: media.transform || undefined }} />;
}

/* ---------- The answer area for any question type ---------- */
export function Answer({ q, value, onChange, onSubmit, preview, editable, editHandlers = {}, mobile, onTileClick }) {
  const common = { q, value, onChange: preview ? () => {} : onChange, onSubmit: preview ? () => {} : onSubmit, preview };
  switch (q.type) {
    case 'multiple_choice': case 'yes_no': case 'legal': case 'conversation_starter':
      return <Choices {...common} editable={editable && (q.type === 'multiple_choice')} letters={q.settings?.letters !== false} {...editHandlers} autoFocusKeys={!preview} />;
    case 'dropdown': return editable ? <Choices {...common} editable letters={false} {...editHandlers} /> : <Dropdown {...common} />;
    case 'ranking': return editable ? <Choices {...common} editable letters {...editHandlers} /> : <Ranking {...common} />;
    case 'picture_choice': return <PictureChoices {...common} editable={editable} onTileClick={onTileClick} mobile={mobile} />;
    case 'nps': case 'opinion_scale': return <Scale {...common} />;
    case 'rating': return <Rating {...common} />;
    case 'matrix': return <Matrix {...common} />;
    case 'contact_info': return <Fields {...common} fields={CONTACT_FIELDS} cfg={q.settings?.fields} />;
    case 'address': return <Fields {...common} fields={ADDRESS_FIELDS} cfg={q.settings?.fields} />;
    case 'date': return <DateInput {...common} />;
    case 'file_upload': return <FileUpload {...common} />;
    case 'signature': return <Signature {...common} />;
    case 'payment': return <Payment {...common} />;
    case 'multi_page': return <MultiPage {...common} />;
    case 'welcome': case 'statement': case 'question_group':
      return preview ? <div><span className="ok-btn">{q.settings?.button || 'Continue'}</span></div> : <OkButton label={q.settings?.button || 'Continue'} check={false} onClick={() => onSubmit?.()} />;
    case 'video': return <div className="col gap-16"><VideoEmbed url={q.media?.url} /><TextAnswer {...common} /></div>;
    default: return <TextAnswer {...common} />;
  }
}

/* ---------- Full question block (respondent) ---------- */
export function QuestionBlock({ q, n, value, onChange, onSubmit, error, titleOverride, descOverride, showNumber = true, mobile, mediaInline = true }) {
  const t = TYPES[q.type];
  const big = q.type === 'welcome' || q.type === 'statement' || q.type === 'question_group';
  return (
    <div className="row" style={{ gap: 12, alignItems: 'flex-start', width: '100%' }}>
      {showNumber && n != null && !big && <span className="qnum">{n}</span>}
      <div className="col grow" style={{ gap: 16 }}>
        <div className="col gap-6">
          <h2 className="q-title" style={big ? { fontSize: mobile ? 26 : 32 } : undefined}>
            {titleOverride ?? q.title}{q.required && !NO_ANSWER.has(q.type) && !t?.noStar ? '*' : ''}
          </h2>
          {(descOverride ?? q.description) && <p className="q-desc">{descOverride ?? q.description}</p>}
        </div>
        {mediaInline && <Media media={q.media} inline={!q.media?.layout || q.media.layout === 'stack' || mobile} />}
        <Answer q={q} value={value} onChange={onChange} onSubmit={onSubmit} mobile={mobile} />
        {error && <div className="row gap-6" style={{ background: 'var(--red-100)', color: '#b42318', alignSelf: 'flex-start', padding: '4px 10px', borderRadius: 6, fontSize: 14 }}><Icon name="help" size={16} />{error}</div>}
      </div>
    </div>
  );
}

export const newChoice = (label = '') => ({ id: uid('c_'), label });
