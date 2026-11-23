import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './lib/icons.jsx';
import { TYPES } from './lib/questions.js';

export const cx = (...a) => a.filter(Boolean).join(' ');

export function Btn({ kind = 'primary', size, icon, iconRight, children, className, loading, ...rest }) {
  return (
    <button type="button" className={cx('btn', `btn-${kind}`, size && `btn-${size}`, className)} {...rest} disabled={rest.disabled || loading}>
      {loading ? <span className="spin" style={{ width: 14, height: 14 }} /> : icon && <Icon name={icon} />}
      {children}
      {iconRight && <Icon name={iconRight} />}
    </button>
  );
}

export function IconBtn({ icon, label, className, boxed, size, active, ...rest }) {
  return (
    <button type="button" className={cx('icon-btn', boxed && 'boxed', size, active && 'active', className)} aria-label={label} title={label} {...rest}>
      <Icon name={icon} />
    </button>
  );
}

export function Toggle({ on, onChange, accent, disabled, label }) {
  return <button type="button" role="switch" aria-checked={!!on} aria-label={label} disabled={disabled} className={cx('toggle', on && 'on', accent && 'accent')} onClick={() => onChange?.(!on)} />;
}

export function Check({ on, onChange, label }) {
  return (
    <button type="button" role="checkbox" aria-checked={!!on} aria-label={label} className={cx('check', on && 'on')} onClick={(e) => { e.stopPropagation(); onChange?.(!on); }}>
      {on && <Icon name="check" />}
    </button>
  );
}

export function Radio({ on }) { return <span className={cx('radio', on && 'on')} />; }

export function Seg({ options, value, onChange, className }) {
  return (
    <div className={cx('seg', className)} role="tablist">
      {options.map((o) => (
        <button type="button" key={o.value} role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.icon && <Icon name={o.icon} />}{o.label}
        </button>
      ))}
    </div>
  );
}

export function Avatar({ name = '', color, size, className, src }) {
  const ch = (name || '?').trim().charAt(0) || '?';
  return <span className={cx('avatar', size, className)} style={color ? { background: color } : undefined}>{src ? <img src={src} alt="" /> : ch}</span>;
}

export function QType({ type, n, small, tile }) {
  const t = TYPES[type] || TYPES.short_text;
  if (tile) return <span className={cx('qtile', 'cat-' + t.cat)}><Icon name={t.icon} /></span>;
  return (
    <span className={cx('qtype', 'cat-' + t.cat, small && 'sm')}>
      <Icon name={t.icon} />{n != null && <span>{n}</span>}
    </span>
  );
}

// ---------- Outside click ----------
export function useOutside(ref, fn, active = true) {
  useEffect(() => {
    if (!active) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) fn(e); };
    const k = (e) => { if (e.key === 'Escape') fn(e); };
    setTimeout(() => document.addEventListener('mousedown', h));
    document.addEventListener('keydown', k);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', k); };
  }, [active, fn, ref]);
}

// ---------- Popover anchored to a trigger, rendered in a portal ----------
export function Popover({ anchor, open, onClose, children, align = 'left', width, className, offset = 6, placement = 'bottom' }) {
  const ref = useRef(null);
  const [pos, setPos] = useState(null);
  const close = useCallback(() => onClose?.(), [onClose]);
  useOutside(ref, (e) => { if (anchor?.current && anchor.current.contains(e.target)) return; close(); }, open);
  useLayoutEffect(() => {
    if (!open || !anchor?.current) return;
    const place = () => {
      const r = anchor.current.getBoundingClientRect();
      const el = ref.current;
      const w = el?.offsetWidth || width || 200;
      const h = el?.offsetHeight || 200;
      let left = align === 'right' ? r.right - w : align === 'center' ? r.left + r.width / 2 - w / 2 : r.left;
      if (placement === 'right') left = r.right + offset;
      left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
      let top = placement === 'right' ? r.top : r.bottom + offset;
      if (top + h > window.innerHeight - 8) top = Math.max(8, (placement === 'right' ? window.innerHeight - h - 8 : r.top - h - offset));
      setPos({ left, top });
    };
    place();
    const id = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, anchor, align, width, offset, placement]);
  if (!open) return null;
  return createPortal(
    <div ref={ref} className={cx('pop', className)} style={{ position: 'fixed', left: pos?.left ?? -9999, top: pos?.top ?? -9999, width, zIndex: 150 }}>
      {children}
    </div>, document.body);
}

export function Menu({ items, onClose }) {
  return (
    <div role="menu">
      {items.map((it, i) => {
        if (it === '-') return <div key={i} className="menu-sep" />;
        if (it.head) return <div key={i} className="menu-head">{it.head}</div>;
        return (
          <button key={i} type="button" role="menuitem" className={cx('menu-item', it.danger && 'danger', it.active && 'hl')}
            onClick={() => { onClose?.(); it.onClick?.(); }} disabled={it.disabled} style={it.disabled ? { opacity: .45 } : undefined}>
            {it.icon && <Icon name={it.icon} />}<span className="grow">{it.label}</span>{it.sub && <span className="sub">{it.sub}</span>}
            {it.check && <Icon name="check" />}
          </button>
        );
      })}
    </div>
  );
}

export function MenuButton({ trigger, items, align = 'right', width = 200, className }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <span ref={ref} className={className} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} style={{ display: 'inline-flex' }}>{trigger}</span>
      <Popover anchor={ref} open={open} onClose={() => setOpen(false)} align={align} width={width}>
        <div onClick={(e) => e.stopPropagation()}><Menu items={items} onClose={() => setOpen(false)} /></div>
      </Popover>
    </>
  );
}

// ---------- Select ----------
export function Select({ value, options, onChange, placeholder = 'Select…', className, pill, renderValue, search, width, error, disabled }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const cur = options.find((o) => o.value === value);
  const list = search && q ? options.filter((o) => String(o.label).toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <div className={cx('select', className)}>
      <button type="button" ref={ref} disabled={disabled} className={cx('select-btn', pill && 'pill', error && 'err')} onClick={() => setOpen((o) => !o)}>
        {renderValue ? renderValue(cur) : cur ? <>{cur.tile}{cur.icon && <Icon name={cur.icon} size={16} />}<span className="ellipsis">{cur.label}</span></> : <span className="tertiary">{placeholder}</span>}
        <Icon name="chevron-down" className="chev" />
      </button>
      <Popover anchor={ref} open={open} onClose={() => { setOpen(false); setQ(''); }} width={width || ref.current?.offsetWidth} >
        {search && (
          <div className="input-wrap" style={{ marginBottom: 6 }}>
            <input autoFocus className="field" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 30, borderColor: 'var(--ink-900)' }} />
            <span style={{ position: 'absolute', left: 10, color: 'var(--q-text-secondary)' }}><Icon name="search" size={14} /></span>
          </div>
        )}
        <div style={{ maxHeight: 320, overflow: 'auto' }}>
          {list.map((o) => (
            <button key={String(o.value)} type="button" className={cx('menu-item', o.value === value && 'hl')} onClick={() => { onChange(o.value); setOpen(false); setQ(''); }} disabled={o.disabled} style={o.disabled ? { opacity: .45 } : undefined}>
              {o.tile}{o.icon && <Icon name={o.icon} />}
              <span className="grow">
                {o.label}
                {o.desc && <span className="t-caption muted" style={{ display: 'block', whiteSpace: 'normal' }}>{o.desc}</span>}
              </span>
            </button>
          ))}
          {!list.length && <div className="t-body-s muted" style={{ padding: 10 }}>No matches</div>}
        </div>
      </Popover>
    </div>
  );
}

// ---------- Modal ----------
export function Modal({ open = true, onClose, title, children, footer, width = 460, className, canvas, hideClose, bodyStyle }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className={cx('modal', canvas && 'canvas', className)} style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
        {(title || !hideClose) && (
          <div className="modal-head">
            {typeof title === 'string' ? <h2>{title}</h2> : title || <span />}
            {!hideClose && <IconBtn icon="x" label="Close" onClick={onClose} />}
          </div>
        )}
        <div className="modal-body" style={bodyStyle}>{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>, document.body);
}

export function Confirm({ title, body, confirmLabel = 'Confirm', danger, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose} width={420}
      footer={<>
        <Btn kind="secondary" onClick={onClose}>Cancel</Btn>
        <Btn kind={danger ? 'danger' : 'primary'} loading={busy} onClick={async () => { setBusy(true); try { await onConfirm(); onClose(); } finally { setBusy(false); } }}>{confirmLabel}</Btn>
      </>}>
      <p className="t-body-s muted">{body}</p>
    </Modal>
  );
}

// ---------- Toasts ----------
const ToastCtx = createContext(() => {});
export function ToastHost({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, opts = {}) => {
    const id = Math.random();
    setItems((x) => [...x, { id, msg, ...opts }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), opts.ms || 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      {createPortal(
        <div className="toasts" aria-live="polite">
          {items.map((t) => (
            <div key={t.id} className="toast">
              {t.ok && <span className="ok"><Icon name="check" size={12} /></span>}
              {t.error && <span className="ok" style={{ background: 'var(--red-500)' }}><Icon name="x" size={12} /></span>}
              <span>{t.msg}</span>
              <button aria-label="Dismiss" onClick={() => setItems((x) => x.filter((y) => y.id !== t.id))} style={{ color: '#fff', opacity: .7 }}><Icon name="x" /></button>
            </div>
          ))}
        </div>, document.body)}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

export function Spinner({ size = 18 }) { return <span className="spin" style={{ width: size, height: size }} />; }
export function PageLoader() { return <div className="page-loader"><Spinner size={24} /></div>; }

export function Field({ label, help, error, children }) {
  return (
    <div className="col gap-6">
      {label && <label className="lbl" style={{ marginBottom: 0 }}>{label}</label>}
      {help && <span className="help">{help}</span>}
      {children}
      {error && <span className="err" style={{ fontSize: 12 }}>{error}</span>}
    </div>
  );
}

export function useAsync(fn, deps) {
  const [state, set] = useState({ loading: true, data: null, error: null });
  const reload = useCallback(async () => {
    set((s) => ({ ...s, loading: true }));
    try { const data = await fn(); set({ loading: false, data, error: null }); return data; }
    catch (error) { set({ loading: false, data: null, error }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload, setData: (d) => set((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) };
}

export function copy(text) {
  try { navigator.clipboard.writeText(text); return true; }
  catch {
    const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
    try { document.execCommand('copy'); } finally { t.remove(); }
    return true;
  }
}

export function timeAgo(iso) {
  const s = Math.max(1, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  return fmtDate(iso);
}
export function hoursAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} minutes ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  return `${Math.floor(s / 86400)} days ago`;
}
export function fmtDate(iso) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
export function fmtTime(iso) { return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
