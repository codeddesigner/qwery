import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon, Mark } from '../lib/icons.jsx';
import { emptyContent, normalizeContent, TEMPLATES } from '../lib/questions.js';
import { navigate } from '../lib/router.js';
import { auth, db } from '../lib/sb.js';
import { PLANS, useApp } from '../lib/store.jsx';
import { Avatar, Btn, Confirm, copy, cx, fmtDate, IconBtn, Menu, MenuButton, Modal, Popover, Select, Seg, useAsync, useToast } from '../ui.jsx';

const SWATCHES = ['#b86a4b', '#5a25c4', '#08703d', '#4d4de1', '#e0368c', '#ea6a1e', '#2e6bff', '#705a00'];

export async function createForm({ org, ws, user, title = 'My new form', content, theme }) {
  const c = normalizeContent(content || emptyContent());
  if (theme) c.theme = { ...c.theme, ...theme };
  const { data } = await db.from('forms').insert({
    org_id: org.id, workspace_id: ws.id, title, content: c, created_by: user.id,
    color: SWATCHES[Math.floor(Math.random() * SWATCHES.length)],
  }).select('*').single();
  return data;
}

export async function formFromTemplate({ org, ws, user, key }) {
  const t = TEMPLATES.find((x) => x.key === key);
  const built = t.build();
  const c = normalizeContent({ ...emptyContent(), ...built, conversation: { ...emptyContent().conversation, ...(built.conversation || {}) } });
  return createForm({ org, ws, user, title: built.title || t.title, content: c });
}

export const publicLink = (f) => `${location.origin}/to/${f.custom_slug || f.slug}`;

/* ---------------- Top bar (shared with other app pages) ---------------- */
export function AccountMenu() {
  const app = useApp();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button ref={ref} onClick={() => setOpen((o) => !o)} aria-label="Account menu"><Avatar name={app.profile?.name || app.user?.email} color={app.profile?.avatar_color} /></button>
      <Popover anchor={ref} open={open} onClose={() => setOpen(false)} align="right" width={240}>
        <div className="col" style={{ padding: '8px 10px 10px' }}>
          <span className="t-label-m ellipsis">{app.profile?.name}</span>
          <span className="t-caption muted ellipsis">{app.user?.email}</span>
        </div>
        <Menu onClose={() => setOpen(false)} items={[
          { head: 'Account' },
          { label: 'Your settings', icon: 'user', onClick: () => navigate('/account') },
          { label: 'Communications', icon: 'bell', onClick: () => navigate('/account/communications') },
          { label: 'Authorized apps', icon: 'apps', onClick: () => navigate('/account/apps') },
          '-',
          { label: 'Plan & billing', icon: 'diamond', onClick: () => navigate('/org/billing') },
          { label: 'Help center', icon: 'help', onClick: () => window.open('mailto:support@qwery.to') },
          '-',
          { label: 'Log out', icon: 'logout', onClick: async () => { await auth.signOut(); navigate('/login'); } },
        ]} />
      </Popover>
    </>
  );
}

export function OrgSwitcher() {
  const app = useApp();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button ref={ref} className="row gap-8" onClick={() => setOpen((o) => !o)} aria-label="Organization menu">
        <Avatar name={app.org?.name} className="accent" />
        <span className="t-body-s" style={{ fontSize: 15 }}>{app.profile?.name || app.org?.name}</span>
        <Icon name="chevron-down" size={14} />
      </button>
      <Popover anchor={ref} open={open} onClose={() => setOpen(false)} width={240}>
        <Menu onClose={() => setOpen(false)} items={[
          { head: 'Organization' },
          { label: 'Admin settings', onClick: () => navigate('/org/admin') },
          { label: 'Org members', onClick: () => navigate('/org/members') },
          { label: 'Plan & billing', onClick: () => navigate('/org/billing') },
          { label: 'Developer apps', onClick: () => navigate('/org/developer') },
          '-',
          { head: 'Your organizations' },
        ]} />
        {app.orgs.map((o) => (
          <button key={o.id} className={cx('menu-item', o.id === app.org?.id && 'hl')} onClick={() => { setOpen(false); app.switchOrg(o.id); navigate('/workspace'); }}>
            <Avatar name={o.name} size="sm" className="accent" />
            <span className="col grow" style={{ minWidth: 0 }}>
              <span className="row gap-6 t-label-s">{o.name}<span className="badge accent" style={{ border: '1px solid var(--accent-500)', background: '#fff', padding: '0 6px' }}>{o.role[0].toUpperCase() + o.role.slice(1)}</span></span>
              <span className="t-caption muted">{PLANS[o.plan]?.name || 'Free'} Plan</span>
            </span>
          </button>
        ))}
      </Popover>
    </>
  );
}

export function TopBar({ children }) {
  return (
    <div className="ws-top">
      <button onClick={() => navigate('/workspace')} aria-label="Home"><Mark size={20} /></button>
      <OrgSwitcher />
      <span className="grow">{children}</span>
      <IconBtn icon="help" label="Help" onClick={() => window.open('mailto:support@qwery.to')} />
      <IconBtn icon="gift" label="What’s new" onClick={() => navigate('/plans')} />
      <AccountMenu />
    </div>
  );
}

/* ---------------- Modals ---------------- */
function NewWorkspaceModal({ onClose }) {
  const app = useApp();
  const toast = useToast();
  const [name, setName] = useState('');
  const [priv, setPriv] = useState(false);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setTouched(true);
    if (!name.trim()) return;
    setBusy(true);
    try {
      const { data } = await db.from('workspaces').insert({ org_id: app.org.id, name: name.trim(), is_private: priv, owner_id: app.user.id }).select('*').single();
      await db.from('workspace_members').insert({ workspace_id: data.id, user_id: app.user.id, email: app.user.email, role: 'owner' });
      await app.reload();
      toast('Workspace created', { ok: true });
      onClose();
      navigate('/workspace/' + data.id);
    } catch (e) { toast(e.message, { error: true }); } finally { setBusy(false); }
  };
  return (
    <Modal title="Create a new workspace" onClose={onClose} width={420}
      footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={save}>Create workspace</Btn></>}>
      <div className="col gap-16">
        <div className="col gap-6">
          <input className={cx('field', touched && !name.trim() && 'error')} placeholder="Workspace name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} autoFocus aria-label="Workspace name" />
          {touched && !name.trim() && <span className="err" style={{ fontSize: 12 }}>A workspace name is required</span>}
        </div>
        <div className="col gap-8">
          {[[false, 'Shared', 'Everyone in your organization can find and open it.'], [true, 'Private', 'Only you, and people you invite, can see it.']].map(([v, l, d]) => (
            <button key={l} className="radio-row" onClick={() => setPriv(v)}><span className={cx('radio', priv === v && 'on')} style={{ marginTop: 3 }} /><span className="col"><span className="t-body-s">{l}</span><span className="t-caption muted">{d}</span></span></button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

const ROLE_OPTS = [
  { value: 'owner', label: 'Owner', desc: 'Can create, and manage forms and responses. Can manage members, and delete workspace.' },
  { value: 'edit', label: 'Can edit', desc: 'Can create and edit forms, but not delete forms or responses. Can’t manage members.' },
  { value: 'view', label: 'Can view', desc: 'Can only view forms and edit form sharing. Can’t view logic nor delete forms or responses.' },
];

function ManageWorkspaceModal({ ws, onClose }) {
  const app = useApp();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('edit');
  const [busy, setBusy] = useState(false);
  const members = useAsync(() => db.from('workspace_members').select('*').eq('workspace_id', ws.id).neq('role', 'none').order('created_at').then((r) => r.data), [ws.id]);
  const orgMembers = useAsync(() => db.from('org_members').select('email,user_id').eq('org_id', app.org.id).then((r) => r.data), [app.org.id]);
  const suggestions = (orgMembers.data || []).filter((m) => email && m.email.includes(email.toLowerCase()) && !(members.data || []).some((x) => x.email === m.email));
  const invite = async (addr = email) => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) { toast('Enter a valid email address'); return; }
    setBusy(true);
    try {
      await db.from('workspace_members').upsert({ workspace_id: ws.id, email: addr.toLowerCase(), role }, 'workspace_id,email');
      setEmail(''); members.reload();
      toast(`${addr} invited as ${ROLE_OPTS.find((r) => r.value === role).label.toLowerCase()}`, { ok: true });
    } catch (e) { toast(e.message, { error: true }); } finally { setBusy(false); }
  };
  const isOwner = ws.myRole === 'owner';
  return (
    <Modal title={`Manage ${ws.name}`} onClose={onClose} width={600}>
      <div className="col gap-16">
        {isOwner && (
          <div className="row gap-8" style={{ position: 'relative' }}>
            <div className="row grow" style={{ border: '1px solid var(--q-border-default)', borderRadius: 999, paddingRight: 4 }}>
              <input className="field" style={{ border: 0 }} placeholder="Invite by email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && invite()} aria-label="Invite by email" />
              <div style={{ width: 120 }}><Select value={role} onChange={setRole} options={ROLE_OPTS} width={240} renderValue={(c) => <span className="t-body-s">{c?.label}</span>} className="borderless" /></div>
            </div>
            <Btn loading={busy} onClick={() => invite()} style={{ height: 36 }}>Send Invite</Btn>
            {suggestions.length > 0 && (
              <div className="pop" style={{ top: 42, left: 0, width: 320 }}>
                {suggestions.slice(0, 5).map((s) => <button key={s.email} className="menu-item" onClick={() => invite(s.email)}><Avatar name={s.email} size="sm" />{s.email}</button>)}
              </div>
            )}
          </div>
        )}
        <div className="t-overline muted">Workspace members ({members.data?.length || 0})</div>
        <div className="col gap-10">
          {(members.data || []).map((m) => (
            <div key={m.id} className="row gap-10">
              <Avatar name={m.email} size="sm" color="var(--type-rating-bg)" />
              <span className="col grow"><span className="t-body-s">{m.email}{m.user_id === app.user.id ? ' (You)' : ''}</span><span className="t-caption muted">{m.status === 'pending' ? 'Pending — will join when they sign up' : 'Member'}</span></span>
              {isOwner && m.user_id !== app.user.id ? (
                <div style={{ width: 130 }}>
                  <Select value={m.role} width={260} onChange={async (r) => { if (r === '__remove') await db.from('workspace_members').delete().eq('id', m.id); else await db.from('workspace_members').update({ role: r }).eq('id', m.id); members.reload(); }}
                    options={[...ROLE_OPTS, { value: '__remove', label: 'Remove from workspace' }]} renderValue={(c) => <span className="t-body-s">{c?.label}</span>} />
                </div>
              ) : <span className="t-body-s muted">{ROLE_OPTS.find((r) => r.value === m.role)?.label}</span>}
            </div>
          ))}
        </div>
        <div className="divider" />
        <span className="row gap-6 t-caption muted"><Icon name="user" size={14} />{ws.is_private ? 'Private workspace' : `Shared workspace in ${app.org.name} org.`}</span>
      </div>
    </Modal>
  );
}

function SearchModal({ onClose }) {
  const app = useApp();
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  useEffect(() => {
    const id = setTimeout(async () => {
      if (!q.trim()) { setRes([]); return; }
      const { data } = await db.from('forms').select('id,title,color,workspace_id,updated_at').eq('org_id', app.org.id).ilike('title', `*${q.trim()}*`).order('updated_at', { ascending: false }).limit(20);
      setRes(data || []);
    }, 180);
    return () => clearTimeout(id);
  }, [q, app.org.id]);
  const wsName = (id) => app.workspaces.find((w) => w.id === id)?.name || '';
  return (
    <Modal onClose={onClose} width={560} hideClose title={
      <div className="row gap-8 grow" style={{ border: '1px solid var(--ink-900)', borderRadius: 999, padding: '6px 12px' }}>
        <Icon name="search" size={16} /><input autoFocus style={{ border: 0, outline: 'none', flex: 1, fontSize: 15 }} placeholder="Search forms in this organization" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search forms" />
        {q && <button onClick={() => setQ('')} aria-label="Clear"><Icon name="x" size={16} /></button>}
      </div>}>
      <div className="col gap-4" style={{ minHeight: 120 }}>
        {q && !res.length && <p className="t-body-s muted" style={{ padding: 12 }}>No forms match “{q}”.</p>}
        {!q && <p className="t-body-s muted" style={{ padding: 12 }}>Type to search every workspace you can access.</p>}
        {res.map((f) => (
          <button key={f.id} className="menu-item" onClick={() => { onClose(); navigate(`/forms/${f.id}/create`); }}>
            <span style={{ width: 20, height: 20, borderRadius: 4, background: f.color }} />
            <span className="grow">{f.title}</span><span className="t-caption muted">{wsName(f.workspace_id)} · {fmtDate(f.updated_at)}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

function RenameModal({ title, value, onSave, onClose }) {
  const [v, setV] = useState(value);
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose} width={432} footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn kind={v.trim() && v !== value ? 'primary' : 'soft'} disabled={!v.trim() || v === value} loading={busy} onClick={async () => { setBusy(true); try { await onSave(v.trim()); onClose(); } finally { setBusy(false); } }}>Save</Btn></>}>
      <input className="field sq" style={{ height: 40, borderRadius: 12 }} value={v} onChange={(e) => setV(e.target.value)} autoFocus onFocus={(e) => e.target.select()} onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) { onSave(v.trim()); onClose(); } }} aria-label="Name" />
    </Modal>
  );
}
export { RenameModal };

function DeleteWorkspace({ ws, count, onClose, onDone }) {
  const [step, setStep] = useState(1);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  if (step === 1) {
    return (
      <Modal title="Delete workspace?" onClose={onClose} width={440} footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn kind="danger" onClick={() => setStep(2)}>Delete</Btn></>}>
        <p className="t-body-s muted">“{ws.name}” and its {count} form{count === 1 ? '' : 's'} — including all responses and conversations — will be deleted forever.</p>
      </Modal>
    );
  }
  return (
    <Modal title="Confirm delete" onClose={onClose} width={440} footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn kind="danger" disabled={typed !== ws.name} loading={busy} onClick={async () => { setBusy(true); await db.from('workspaces').delete().eq('id', ws.id); setBusy(false); onDone(); }}>Delete forever</Btn></>}>
      <div className="col gap-10">
        <p className="t-body-s muted">Type <b style={{ color: 'var(--q-text-primary)' }}>{ws.name}</b> to confirm.</p>
        <input className="field" value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus aria-label="Workspace name" />
      </div>
    </Modal>
  );
}

/* ---------------- Page ---------------- */
export default function Workspace({ wsId }) {
  const app = useApp();
  const toast = useToast();
  const ws = app.workspaces.find((w) => w.id === wsId) || app.workspaces[0];
  const [view, setView] = useState(localStorage.getItem('qwery.view') || 'list');
  const [sort, setSort] = useState(localStorage.getItem('qwery.sort') || 'created');
  const [modal, setModal] = useState(null);
  const [openPriv, setOpenPriv] = useState(true);
  const [openShared, setOpenShared] = useState(true);
  const [hidden, setHidden] = useState(() => JSON.parse(localStorage.getItem('qwery.hideSuggest') || '[]'));
  const [bannerOff, setBannerOff] = useState(() => sessionStorage.getItem('qwery.banner') === 'off');
  const forms = useAsync(() => (ws ? db.rpc('workspace_forms', { p_ws: ws.id }) : Promise.resolve([])), [ws?.id]);
  const unread = useAsync(() => db.rpc('org_unread', { p_org: app.org.id }), [app.org.id]);
  const usage = useAsync(() => db.rpc('org_usage', { p_org: app.org.id }), [app.org.id]);
  const myRole = useAsync(() => (ws ? db.from('workspace_members').select('role').eq('workspace_id', ws.id).eq('user_id', app.user.id).maybeSingle().then((r) => r.data?.role || (app.role === 'editor' ? 'edit' : 'owner')) : null), [ws?.id]);

  useEffect(() => { if (app.profile && !app.profile.onboarding?.done && !app.workspaces.some((w) => (w.forms?.[0]?.count || 0) > 0)) navigate('/onboarding', { replace: true }); }, [app.profile, app.workspaces]);
  useEffect(() => { localStorage.setItem('qwery.view', view); localStorage.setItem('qwery.sort', sort); }, [view, sort]);

  const sorted = useMemo(() => {
    const list = [...(forms.data || [])];
    if (sort === 'updated') list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    else if (sort === 'alpha') list.sort((a, b) => a.title.localeCompare(b.title));
    else list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return list;
  }, [forms.data, sort]);

  if (!ws) return <TopBar />;
  const priv = app.workspaces.filter((w) => w.is_private);
  const shared = app.workspaces.filter((w) => !w.is_private);
  const role = myRole.data;
  const canEdit = role === 'owner' || role === 'edit';
  const isFree = (app.org.plan || 'free') === 'free';

  const newForm = async () => {
    if (!canEdit) { toast('You have view access to this workspace'); return; }
    const f = await createForm({ org: app.org, ws, user: app.user });
    navigate(`/forms/${f.id}/new`);
  };
  const useTemplate = async (key) => {
    const f = await formFromTemplate({ org: app.org, ws, user: app.user, key });
    navigate(`/forms/${f.id}/create`);
  };
  const duplicate = async (f, target = ws) => {
    const { data: full } = await db.from('forms').select('*').eq('id', f.id).single();
    await db.from('forms').insert({ org_id: app.org.id, workspace_id: target.id, title: target.id === ws.id ? `${full.title} (copy)` : full.title, content: full.content, color: full.color, created_by: app.user.id }).select('id');
    forms.reload(); app.reload();
    toast(target.id === ws.id ? 'Form duplicated' : `Copied to ${target.name}`, { ok: true });
  };
  const moveTo = async (f, target) => {
    await db.from('forms').update({ workspace_id: target.id }).eq('id', f.id);
    forms.reload(); app.reload();
    toast(`Moved to ${target.name}`, { ok: true });
  };
  const formMenu = (f) => [
    { label: 'Open', onClick: () => navigate(`/forms/${f.id}/create`) },
    { label: 'Copy link', onClick: () => { copy(publicLink(f)); toast(f.status === 'published' ? 'Link copied' : 'Link copied — publish the form so it works', { ok: true }); } },
    '-',
    { label: 'Logic', onClick: () => navigate(`/forms/${f.id}/logic`) },
    { label: 'Connect', onClick: () => navigate(`/forms/${f.id}/connect`) },
    { label: 'Share', onClick: () => navigate(`/forms/${f.id}/share`) },
    { label: 'Results', onClick: () => navigate(`/forms/${f.id}/results`) },
    { label: 'Conversations', onClick: () => navigate(`/forms/${f.id}/conversations`) },
    '-',
    { label: 'Rename', disabled: !canEdit, onClick: () => setModal({ kind: 'renameForm', f }) },
    { label: 'Duplicate', disabled: !canEdit, onClick: () => duplicate(f) },
    { label: 'Copy to', sub: '›', disabled: !canEdit, onClick: () => setModal({ kind: 'pickWs', f, mode: 'copy' }) },
    { label: 'Move to', sub: '›', disabled: !canEdit, onClick: () => setModal({ kind: 'pickWs', f, mode: 'move' }) },
    '-',
    { label: 'Delete', danger: true, disabled: role !== 'owner', onClick: () => setModal({ kind: 'deleteForm', f }) },
  ];
  const wsMenu = [
    { label: 'Rename', disabled: role !== 'owner', onClick: () => setModal({ kind: 'renameWs' }) },
    { label: 'Manage members', onClick: () => setModal({ kind: 'manage' }) },
    '-',
    ...(ws.owner_id !== app.user.id ? [{ label: 'Leave workspace', danger: true, onClick: () => setModal({ kind: 'leave' }) }] : []),
    ...(role === 'owner' ? [{ label: 'Delete workspace', danger: true, onClick: () => setModal({ kind: 'deleteWs' }) }] : []),
  ];
  const suggestions = TEMPLATES.slice(0, 3).filter((t) => !hidden.includes(t.key));
  const resetDate = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);

  return (
    <div className="ws-shell">
      <TopBar />
      {isFree && !bannerOff && (
        <div className="row center gap-12" style={{ margin: '0 16px 10px', border: '1px solid var(--brown-600)', background: 'var(--brown-50)', borderRadius: 14, height: 40, fontSize: 14, position: 'relative' }}>
          <span style={{ color: 'var(--brown-600)' }}><Icon name="diamond" size={16} /></span>
          Hey! Just to let you know you can collect {PLANS.free.responses} responses this month for free.
          <button className="btn btn-upgrade" style={{ padding: '3px 10px', fontSize: 12 }} onClick={() => navigate('/plans')}>Get more responses</button>
          <IconBtn icon="x" label="Dismiss" style={{ position: 'absolute', right: 8 }} onClick={() => { setBannerOff(true); sessionStorage.setItem('qwery.banner', 'off'); }} />
        </div>
      )}
      <div className="ws-frame">
        <div className="ws-tabs">
          <button className="tab on">Forms<span className="bar" /></button>
          <button className="tab" onClick={() => navigate('/apps')}>Integrations<span className="bar" /></button>
          <button className="tab" onClick={() => navigate('/brand-kits')}>Brand kit<span className="bar" /></button>
        </div>
        <div className="ws-body">
          <aside className="ws-side">
            <div className="sec"><Btn icon="plus" onClick={newForm} style={{ width: '100%' }}>Create a new form</Btn></div>
            <div className="sec"><button className="item" onClick={() => setModal({ kind: 'search' })}><Icon name="search" />Search</button></div>
            <div className="sec"><button className="item" onClick={() => navigate('/conversations')}><Icon name="inbox" /><span className="grow">Conversations</span>{unread.data > 0 && <span className="count solid">{unread.data}</span>}</button></div>
            <div className="sec" style={{ borderBottom: 0, flex: 1, overflow: 'auto' }}>
              <div className="row between" style={{ padding: '0 2px 10px 10px' }}><span className="row gap-8 t-body-s"><Icon name="grid" size={16} />Workspaces</span><IconBtn icon="plus" label="New workspace" boxed onClick={() => setModal({ kind: 'newWs' })} style={{ borderRadius: 999 }} /></div>
              <button className="item" onClick={() => setOpenPriv((o) => !o)}><span className="grow">Private</span><Icon name={openPriv ? 'chevron-up' : 'chevron-down'} size={12} /></button>
              {openPriv && (priv.length ? priv.map((w) => <WsItem key={w.id} w={w} on={w.id === ws.id} />) : <span className="t-body-s tertiary" style={{ padding: '6px 10px', display: 'block' }}>No workspaces</span>)}
              <button className="item" style={{ marginTop: 6 }} onClick={() => setOpenShared((o) => !o)}><span className="grow">Shared</span><Icon name={openShared ? 'chevron-up' : 'chevron-down'} size={12} /></button>
              {openShared && shared.map((w) => <WsItem key={w.id} w={w} on={w.id === ws.id} />)}
            </div>
            {usage.data && (
              <div className="sec" style={{ borderTop: '1px solid var(--q-border-default)', borderBottom: 0 }}>
                <div className="t-caption" style={{ fontWeight: 500 }}>Responses collected</div>
                <div style={{ margin: '6px 0 2px' }}><span className="t-h3">{usage.data.responses}</span><span className="t-caption muted"> / {usage.data.limit.toLocaleString()}</span></div>
                <div className="t-caption muted">Resets on {resetDate.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</div>
                <button className="chip" style={{ marginTop: 8 }} onClick={() => navigate('/plans')}>Increase response limit</button>
              </div>
            )}
          </aside>

          <main key={ws.id} className="ws-main">
            <div className="row gap-12 wrap" style={{ paddingBottom: 18, borderBottom: '1px solid var(--q-border-default)' }}>
              <h1 className="t-h1" style={{ fontSize: 28 }}>{ws.name}</h1>
              <MenuButton trigger={<IconBtn icon="more" label="Workspace options" />} items={wsMenu} align="left" />
              <button className="row gap-6 t-body-s" onClick={() => setModal({ kind: 'manage' })}><Icon name="invite" size={16} />Invite</button>
              <span className="grow" />
              <Select value={sort} onChange={setSort} pill width={180} options={[{ value: 'created', label: 'Date created', icon: 'calendar-2' }, { value: 'updated', label: 'Last updated', icon: 'calendar-2' }, { value: 'alpha', label: 'Alphabetical', icon: 'list' }]} />
              <Seg className="sm" value={view} onChange={setView} options={[{ value: 'list', label: 'List', icon: 'list' }, { value: 'grid', label: 'Grid', icon: 'grid' }]} />
            </div>

            {suggestions.length > 0 && (
              <div className="row gap-16 wrap" style={{ margin: '22px 0 26px' }}>
                {suggestions.map((t) => (
                  <div key={t.key} className="suggest">
                    <Icon name="sparkle" className="spark" />
                    <div className="col gap-10 grow">
                      <span style={{ paddingRight: 18 }}>{t.blurb}</span>
                      <button className="btn btn-secondary" style={{ alignSelf: 'flex-start', borderRadius: 999 }} onClick={() => useTemplate(t.key)} disabled={!canEdit}>Use this form</button>
                    </div>
                    <IconBtn icon="x" label="Dismiss suggestion" style={{ position: 'absolute', right: 8, top: 8, width: 22, height: 22 }}
                      onClick={() => { const h = [...hidden, t.key]; setHidden(h); localStorage.setItem('qwery.hideSuggest', JSON.stringify(h)); }} />
                  </div>
                ))}
              </div>
            )}

            {forms.loading && !forms.data ? (
              <div className="col gap-8" style={{ marginTop: 24 }}>{[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 44 }} />)}</div>
            ) : !sorted.length ? (
              <div className="empty" style={{ marginTop: 20 }}>
                <span className="ic"><Icon name="folder" /></span>
                <p className="t-h3" style={{ color: 'var(--q-text-primary)' }}>{ws.is_private ? 'This private workspace is empty' : 'There’s nothing here yet'}</p>
                <p className="t-body-s">Create a form, or move one here from another workspace.</p>
                {canEdit && <Btn icon="plus" onClick={newForm}>Create a new form</Btn>}
              </div>
            ) : view === 'list' ? (
              <div key="list" className="col gap-8" style={{ marginTop: suggestions.length ? 0 : 22 }}>
                <div className="form-head"><span /><span>Responses</span><span>Completion</span><span>Conversations</span><span>Updated</span><span>Integrations</span><span /></div>
                {sorted.map((f) => (
                  <div key={f.id} className="form-row" onClick={() => navigate(`/forms/${f.id}/create`)} role="link" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && navigate(`/forms/${f.id}/create`)}>
                    <span className="row gap-12" style={{ minWidth: 0 }}><span className="sw" style={{ background: f.color }} /><span className="ellipsis">{f.title}</span>{f.status === 'draft' && <span className="badge neutral">Draft</span>}</span>
                    <span>{f.responses || '–'}</span>
                    <span>{f.starts ? `${Math.min(100, (f.responses / f.starts) * 100).toFixed(1)}%` : '–'}</span>
                    <span style={{ color: 'var(--accent-500)' }}>{f.conversations ? <span className="row center gap-4">{f.conversations}{f.unread > 0 && <span className="conv-dot" style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--accent-500)' }} />}</span> : '–'}</span>
                    <span>{fmtDate(f.updated_at)}</span>
                    <span className="row center" onClick={(e) => { e.stopPropagation(); navigate(`/forms/${f.id}/connect`); }} title="Integrations"><Icon name="apps" size={18} />{f.integrations > 0 && <span className="t-caption" style={{ marginLeft: 2 }}>{f.integrations}</span>}</span>
                    <span className="row center" onClick={(e) => e.stopPropagation()}><MenuButton trigger={<IconBtn icon="more" label="Form options" />} items={formMenu(f)} width={190} /></span>
                  </div>
                ))}
              </div>
            ) : (
              <div key="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 14, marginTop: suggestions.length ? 0 : 22 }}>
                {sorted.map((f) => (
                  <div key={f.id} className="form-tile" onClick={() => navigate(`/forms/${f.id}/create`)}>
                    <span className="sw" style={{ background: f.color }} />
                    <div className="row between"><span className="t-body-s ellipsis">{f.title}</span><span onClick={(e) => e.stopPropagation()}><MenuButton trigger={<IconBtn icon="more" label="Form options" />} items={formMenu(f)} width={190} /></span></div>
                    <span className="t-caption muted">{f.responses || 0} responses</span>
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {modal?.kind === 'newWs' && <NewWorkspaceModal onClose={() => setModal(null)} />}
      {modal?.kind === 'search' && <SearchModal onClose={() => setModal(null)} />}
      {modal?.kind === 'manage' && <ManageWorkspaceModal ws={{ ...ws, myRole: role }} onClose={() => setModal(null)} />}
      {modal?.kind === 'renameWs' && <RenameModal title="Rename workspace" value={ws.name} onClose={() => setModal(null)} onSave={async (v) => { await db.from('workspaces').update({ name: v }).eq('id', ws.id); app.reload(); }} />}
      {modal?.kind === 'renameForm' && <RenameModal title="Rename this form" value={modal.f.title} onClose={() => setModal(null)} onSave={async (v) => { await db.from('forms').update({ title: v }).eq('id', modal.f.id); forms.reload(); }} />}
      {modal?.kind === 'deleteForm' && <Confirm title="Delete form?" danger confirmLabel="Delete" body={`“${modal.f.title}” and all its responses and conversations will be deleted. This can’t be undone.`} onClose={() => setModal(null)}
        onConfirm={async () => { await db.from('forms').delete().eq('id', modal.f.id); forms.reload(); app.reload(); toast('Form deleted', { ok: true }); }} />}
      {modal?.kind === 'leave' && <Confirm title="Leave workspace?" danger confirmLabel="Leave" body={`You’ll lose access to “${ws.name}” and its forms. An owner can invite you back.`} onClose={() => setModal(null)}
        onConfirm={async () => {
          const { data: mine } = await db.from('workspace_members').select('id').eq('workspace_id', ws.id).eq('user_id', app.user.id).maybeSingle();
          if (mine) await db.from('workspace_members').update({ role: 'none' }).eq('id', mine.id);
          else await db.from('workspace_members').insert({ workspace_id: ws.id, user_id: app.user.id, email: app.user.email, role: 'none' });
          await app.reload(); navigate('/workspace'); toast(`You left ${ws.name}`, { ok: true });
        }} />}
      {modal?.kind === 'deleteWs' && <DeleteWorkspace ws={ws} count={sorted.length} onClose={() => setModal(null)} onDone={async () => { setModal(null); await app.reload(); navigate('/workspace'); toast('Workspace deleted', { ok: true }); }} />}
      {modal?.kind === 'pickWs' && (
        <Modal title={modal.mode === 'copy' ? 'Copy to workspace' : 'Move to workspace'} onClose={() => setModal(null)} width={380}>
          <div className="col gap-2">
            {app.workspaces.filter((w) => modal.mode === 'copy' || w.id !== ws.id).map((w) => (
              <button key={w.id} className="menu-item" onClick={async () => { setModal(null); modal.mode === 'copy' ? await duplicate(modal.f, w) : await moveTo(modal.f, w); }}>
                <Icon name={w.is_private ? 'lock' : 'grid'} /><span className="grow">{w.name}</span>{w.id === ws.id && <span className="t-caption muted">current</span>}
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function WsItem({ w, on }) {
  return (
    <button className={cx('item', on && 'on')} onClick={() => navigate('/workspace/' + w.id)}>
      <span className="grow ellipsis">{w.name}</span><span className="t-caption muted">{w.forms?.[0]?.count ?? ''}</span>
    </button>
  );
}
