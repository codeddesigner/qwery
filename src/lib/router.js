import { useEffect, useState } from 'react';

const subs = new Set();
export function navigate(to, { replace = false } = {}) {
  if (to === location.pathname + location.search) return;
  history[replace ? 'replaceState' : 'pushState'](null, '', to);
  subs.forEach((f) => f());
  window.scrollTo(0, 0);
}
window.addEventListener('popstate', () => subs.forEach((f) => f()));

export function useLocation() {
  const [, set] = useState(0);
  useEffect(() => { const f = () => set((n) => n + 1); subs.add(f); return () => subs.delete(f); }, []);
  return { path: location.pathname, query: new URLSearchParams(location.search) };
}

// match('/forms/:id/:tab?', path) → params | null
export function match(pattern, path) {
  const pp = pattern.split('/').filter(Boolean);
  const xs = path.replace(/\/+$/, '').split('/').filter(Boolean);
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    const p = pp[i];
    const opt = p.endsWith('?');
    const key = p.replace(/^:/, '').replace(/\?$/, '');
    if (p.startsWith(':')) {
      if (xs[i] === undefined) { if (opt) continue; return null; }
      params[key] = decodeURIComponent(xs[i]);
    } else if (p !== xs[i]) return null;
  }
  if (xs.length > pp.length) return null;
  return params;
}

export function Link({ to, children, className, onClick, ...rest }) {
  return (
    <a href={to} className={className} {...rest}
      onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || rest.target) return; e.preventDefault(); onClick?.(e); navigate(to); }}>
      {children}
    </a>
  );
}
