import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { auth, db, getSession, onAuth } from './sb.js';

const Ctx = createContext(null);

export function AppProvider({ children }) {
  const [session, setSession] = useState(getSession());
  const [state, setState] = useState({ ready: !getSession(), profile: null, orgs: [], org: null, role: null, workspaces: [] });

  useEffect(() => onAuth(setSession), []);

  const load = useCallback(async () => {
    const s = getSession();
    if (!s) { setState({ ready: true, profile: null, orgs: [], org: null, role: null, workspaces: [] }); return; }
    try {
      const [{ data: profile }, { data: mems }] = await Promise.all([
        db.from('profiles').select('*').eq('id', s.user.id).maybeSingle(),
        db.from('org_members').select('role,org_id,organizations(*)').eq('user_id', s.user.id).eq('status', 'active'),
      ]);
      const orgs = (mems || []).map((m) => ({ ...m.organizations, role: m.role }));
      const saved = localStorage.getItem('qwery.org');
      const org = orgs.find((o) => o.id === saved) || orgs.find((o) => o.role === 'owner') || orgs[0] || null;
      const { data: workspaces } = org ? await db.from('workspaces').select('*,forms(count)').eq('org_id', org.id).order('created_at') : { data: [] };
      setState({ ready: true, profile, orgs, org, role: org?.role, workspaces: workspaces || [] });
      // touch "last active" for org members list
      if (org) db.from('org_members').update({ last_active_at: new Date().toISOString() }).eq('org_id', org.id).eq('user_id', s.user.id).then(() => {}, () => {});
      // fetch fresh user (factors etc.) in the background
      auth.user().catch(() => {});
    } catch (e) {
      console.error(e);
      setState((x) => ({ ...x, ready: true }));
    }
  }, []);

  useEffect(() => { load(); }, [session?.user?.id, load]);

  const switchOrg = (id) => { localStorage.setItem('qwery.org', id); load(); };
  const value = { session, user: session?.user || null, ...state, reload: load, switchOrg, setProfile: (p) => setState((x) => ({ ...x, profile: { ...x.profile, ...p } })) };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useApp = () => useContext(Ctx);

export const PLANS = {
  free: { name: 'Free', monthly: 0, yearly: 0, responses: 10, seats: 1 },
  basic: { name: 'Basic', monthly: 29, yearly: 25, responses: 100, seats: 1 },
  plus: { name: 'Plus', monthly: 59, yearly: 50, responses: 1000, seats: 3 },
  business: { name: 'Business', monthly: 99, yearly: 83, responses: 10000, seats: 5 },
};
export const planAtLeast = (plan, min) => ['free', 'basic', 'plus', 'business'].indexOf(plan || 'free') >= ['free', 'basic', 'plus', 'business'].indexOf(min);
