// Minimal, dependency-free Supabase client (Auth / PostgREST / RPC / Storage)
export const SUPABASE_URL = 'https://fgppaqohseolxvskmymf.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHBhcW9oc2VvbHh2c2tteW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNzgxODUsImV4cCI6MjExMDk1NDE4NX0.1Rjvfg7LHaMYFd-C9DjyR90SJmT7QCk6MCKKSKUdpP4';
const STORE = 'qwery.session';

const listeners = new Set();
let session = null;
try { session = JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { session = null; }

function persist(s) {
  session = s;
  try { s ? localStorage.setItem(STORE, JSON.stringify(s)) : localStorage.removeItem(STORE); } catch {}
  listeners.forEach((fn) => fn(session));
}

export function onAuth(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function getSession() { return session; }

export function decodeJwt(token) {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return {}; }
}

class SbError extends Error {
  constructor(message, status, body) { super(message); this.status = status; this.body = body; }
}

function friendly(body, status) {
  const raw = body?.msg || body?.message || body?.error_description || body?.error || body?.hint || `Request failed (${status})`;
  if (/Invalid login credentials/i.test(raw)) return 'That email and password don’t match. Try again or reset your password.';
  return String(raw).replace(/^P0001: /, '');
}

async function request(path, { method = 'GET', body, headers = {}, auth = true, raw = false } = {}) {
  if (auth) await ensureFresh();
  const h = { apikey: SUPABASE_KEY, ...headers };
  const token = auth && session?.access_token ? session.access_token : SUPABASE_KEY;
  h.Authorization = `Bearer ${token}`;
  if (body !== undefined && !(body instanceof Blob) && !(body instanceof FormData) && !h['Content-Type']) h['Content-Type'] = 'application/json';
  const res = await fetch(SUPABASE_URL + path, {
    method, headers: h,
    body: body === undefined ? undefined : (body instanceof Blob || body instanceof FormData || typeof body === 'string') ? body : JSON.stringify(body),
  });
  if (raw) return res;
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    if (res.status === 401 && auth && session && /JWT|jwt|token/.test(text)) { persist(null); }
    throw new SbError(friendly(data, res.status), res.status, data);
  }
  return { data, res };
}

// ---------------- Auth ----------------
let refreshing = null;
async function ensureFresh() {
  if (!session) return;
  const now = Math.floor(Date.now() / 1000);
  if (session.expires_at && session.expires_at - now > 60) return;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST', headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: session.refresh_token }),
        });
        const data = await res.json();
        if (res.ok) persist(toSession(data)); else persist(null);
      } catch { /* offline: keep session */ }
      finally { refreshing = null; }
    })();
  }
  await refreshing;
}

function toSession(d) {
  return { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600), user: d.user };
}

export const auth = {
  async signUp({ email, password, name, prefs }) {
    await request('/rest/v1/rpc/create_account', { method: 'POST', auth: false, body: { p_email: email, p_password: password, p_name: name, p_prefs: prefs || {} } });
    return auth.signIn({ email, password });
  },
  async signIn({ email, password }) {
    const { data } = await request('/auth/v1/token?grant_type=password', { method: 'POST', auth: false, body: { email, password } });
    persist(toSession(data));
    return session;
  },
  async signOut() {
    try { await request('/auth/v1/logout', { method: 'POST' }); } catch {}
    persist(null);
  },
  async user() { const { data } = await request('/auth/v1/user'); if (session) persist({ ...session, user: data }); return data; },
  async update(attrs) { const { data } = await request('/auth/v1/user', { method: 'PUT', body: attrs }); if (session) persist({ ...session, user: data }); return data; },
  async recover(email) {
    await request(`/auth/v1/recover?redirect_to=${encodeURIComponent(location.origin + '/reset-password')}`, { method: 'POST', auth: false, body: { email } });
  },
  async settings() { const { data } = await request('/auth/v1/settings', { auth: false }); return data; },
  oauth(provider) {
    location.href = `${SUPABASE_URL}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(location.origin + '/auth/callback')}`;
  },
  // Pick up tokens from OAuth / recovery redirects (#access_token=…)
  consumeHash() {
    if (!location.hash.includes('access_token')) return null;
    const p = new URLSearchParams(location.hash.slice(1));
    const s = toSession({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_in: +p.get('expires_in') || 3600, expires_at: +p.get('expires_at') || undefined });
    persist(s);
    history.replaceState(null, '', location.pathname + location.search);
    return p.get('type') || 'signin';
  },
  aal() { return session ? decodeJwt(session.access_token).aal : null; },
  mfa: {
    async enroll() { const { data } = await request('/auth/v1/factors', { method: 'POST', body: { factor_type: 'totp', friendly_name: 'Authenticator ' + Date.now().toString(36) } }); return data; },
    async challengeAndVerify(factorId, code) {
      const { data: ch } = await request(`/auth/v1/factors/${factorId}/challenge`, { method: 'POST', body: {} });
      const { data } = await request(`/auth/v1/factors/${factorId}/verify`, { method: 'POST', body: { challenge_id: ch.id, code } });
      persist(toSession(data));
      return data;
    },
    async unenroll(factorId) { await request(`/auth/v1/factors/${factorId}`, { method: 'DELETE' }); },
    verifiedFactors() { return (session?.user?.factors || []).filter((f) => f.status === 'verified'); },
  },
};

// ---------------- PostgREST ----------------
class Query {
  constructor(table) { this.table = table; this.params = new URLSearchParams(); this.method = 'GET'; this.headers = {}; this.payload = undefined; this._single = false; }
  select(cols = '*', { count } = {}) { this.params.set('select', cols.replace(/\s+/g, '')); if (count) this.headers.Prefer = [this.headers.Prefer, `count=${count}`].filter(Boolean).join(','); return this; }
  _f(col, op, val) { this.params.append(col, `${op}.${val}`); return this; }
  eq(c, v) { return this._f(c, 'eq', v); }
  neq(c, v) { return this._f(c, 'neq', v); }
  gt(c, v) { return this._f(c, 'gt', v); }
  gte(c, v) { return this._f(c, 'gte', v); }
  lt(c, v) { return this._f(c, 'lt', v); }
  lte(c, v) { return this._f(c, 'lte', v); }
  ilike(c, v) { return this._f(c, 'ilike', v); }
  is(c, v) { return this._f(c, 'is', v); }
  in(c, arr) { return this._f(c, 'in', `(${arr.map((x) => `"${x}"`).join(',')})`); }
  or(expr) { this.params.append('or', `(${expr})`); return this; }
  order(col, { ascending = true } = {}) { this.params.append('order', `${col}.${ascending ? 'asc' : 'desc'}`); return this; }
  limit(n) { this.params.set('limit', n); return this; }
  single() { this._single = true; this.headers.Accept = 'application/vnd.pgrst.object+json'; return this; }
  maybeSingle() { this._maybe = true; return this; }
  insert(rows) { this.method = 'POST'; this.payload = rows; this.headers.Prefer = 'return=representation'; return this; }
  upsert(rows, onConflict) { this.method = 'POST'; this.payload = rows; this.headers.Prefer = 'return=representation,resolution=merge-duplicates'; if (onConflict) this.params.set('on_conflict', onConflict); return this; }
  update(vals) { this.method = 'PATCH'; this.payload = vals; this.headers.Prefer = 'return=representation'; return this; }
  delete() { this.method = 'DELETE'; this.headers.Prefer = 'return=representation'; return this; }
  async run() {
    const qs = this.params.toString();
    const { data, res } = await request(`/rest/v1/${this.table}${qs ? '?' + qs : ''}`, { method: this.method, body: this.payload, headers: this.headers });
    let count = null;
    const cr = res.headers.get('content-range');
    if (cr && cr.includes('/')) count = +cr.split('/')[1];
    if (this._maybe) return { data: Array.isArray(data) ? data[0] || null : data, count };
    return { data, count };
  }
  then(resolve, reject) { return this.run().then(resolve, reject); }
}

export const db = {
  from: (t) => new Query(t),
  async rpc(fn, args = {}, { anon = false } = {}) {
    const { data } = await request(`/rest/v1/rpc/${fn}`, { method: 'POST', body: args, auth: !anon });
    return data;
  },
};

// ---------------- Storage ----------------
export const storage = {
  publicUrl: (path) => `${SUPABASE_URL}/storage/v1/object/public/media/${path}`,
  async list(prefix) {
    const { data } = await request('/storage/v1/object/list/media', { method: 'POST', body: { prefix, limit: 60, sortBy: { column: 'created_at', order: 'desc' } } });
    return (Array.isArray(data) ? data : []).filter((x) => x.id).map((x) => storage.publicUrl(`${prefix}${x.name}`));
  },
  async upload(file, folder) {
    const uid = session?.user?.id || 'public';
    const ext = (file.name || 'file').split('.').pop().toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    const path = `${folder || uid}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    await request(`/storage/v1/object/media/${path}`, { method: 'POST', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' }, auth: !!session });
    return storage.publicUrl(path);
  },
};
