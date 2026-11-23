import { useEffect, useState } from 'react';
import { Icon, Logo } from '../lib/icons.jsx';
import { navigate } from '../lib/router.js';
import { auth, db } from '../lib/sb.js';
import { PLANS, useApp } from '../lib/store.jsx';
import { Avatar, Btn, cx, fmtDate, IconBtn, Modal, Radio, Select, Toggle, useAsync, useToast } from '../ui.jsx';
import { AccountMenu } from './Workspace.jsx';

function Shell({ area, page, children }) {
  const nav = area === 'org'
    ? [['admin', 'Admin settings'], ['members', 'Org members'], ['billing', 'Plan & billing'], ['developer', 'Developer apps']]
    : [['settings', 'Your settings'], ['communications', 'Communications'], ['apps', 'Authorized apps'], ['tokens', 'Personal tokens']];
  return (
    <div className="set-shell">
      <div className="set-top">
        <button className="row gap-8 t-body-s" onClick={() => navigate('/workspace')}><Icon name="arrow-left" size={16} />Workspaces</button>
        <span className="grow" />
        <IconBtn icon="help" label="Help" onClick={() => window.open('mailto:support@qwery.to')} />
        <IconBtn icon="gift" label="Plans" onClick={() => navigate('/plans')} />
        <AccountMenu />
      </div>
      <div className="set-body">
        <aside className="set-side">
          <h2>{area === 'org' ? 'Organization' : 'Account'}</h2>
          {nav.map(([k, l]) => <button key={k} className={cx('item', page === k && 'on')} onClick={() => navigate(`/${area}/${k}`)}>{l}</button>)}
          <div className="set-note">
            <span className="row gap-6 t-label-s"><Icon name="settings" size={14} />Miss {area === 'org' ? 'account' : 'org'} settings?</span>
            <span>{area === 'org' ? 'Account settings are now in a single page, just for you.' : 'Org settings are now in a single page for all admins.'}</span>
            <button className="u" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(area === 'org' ? '/account' : '/org/admin')}>{area === 'org' ? 'See your settings' : 'See admin settings'}</button>
          </div>
        </aside>
        <main className="set-main"><div className="inner">{children}</div></main>
      </div>
    </div>
  );
}

function H({ title, sub }) { return <div className="col gap-6" style={{ marginBottom: 10 }}><h1 className="t-h2" style={{ fontSize: 24 }}>{title}</h1>{sub && <p className="t-body-s muted">{sub}</p>}</div>; }

function TextModal({ title, label, value, onSave, onClose, help, prefix, suffix, validate }) {
  const [v, setV] = useState(value || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  return (
    <Modal title={title} onClose={onClose} width={440} footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} disabled={!v.trim() || v === value} onClick={async () => { const e = validate?.(v); if (e) { setErr(e); return; } setBusy(true); try { await onSave(v.trim()); onClose(); } catch (x) { setErr(x.message); } finally { setBusy(false); } }}>Save</Btn></>}>
      <div className="col gap-8">
        {label && <span className="t-label-m">{label}</span>}
        {help && <p className="t-caption muted">{help}</p>}
        <div className="row" style={{ border: '1px solid var(--q-border-default)', borderRadius: 12, padding: '0 12px', height: 40 }}>
          {prefix && <span className="t-body-s tertiary">{prefix}</span>}
          <input style={{ border: 0, outline: 'none', flex: 1, fontSize: 14 }} value={v} onChange={(e) => { setV(e.target.value); setErr(''); }} autoFocus aria-label={label || title} />
          {suffix && <span className="t-body-s tertiary">{suffix}</span>}
        </div>
        {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
      </div>
    </Modal>
  );
}

/* ---------------- Org: admin ---------------- */
function Admin() {
  const app = useApp();
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const isAdmin = ['owner', 'admin'].includes(app.role);
  const exportData = async () => {
    setBusy(true);
    try {
      const [ws, forms, mem] = await Promise.all([db.from('workspaces').select('*').eq('org_id', app.org.id), db.from('forms').select('*').eq('org_id', app.org.id), db.from('org_members').select('email,role,status').eq('org_id', app.org.id)]);
      const ids = (forms.data || []).map((f) => f.id);
      const [res, conv] = ids.length ? await Promise.all([db.from('responses').select('*').in('form_id', ids), db.from('conversations').select('*,messages(*)').in('form_id', ids)]) : [{ data: [] }, { data: [] }];
      const blob = new Blob([JSON.stringify({ organization: app.org, members: mem.data, workspaces: ws.data, forms: forms.data, responses: res.data, conversations: conv.data, exported_at: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${app.org.name} qwery export.json`; a.click();
      toast('Export downloaded', { ok: true });
    } catch (e) { toast(e.message, { error: true }); } finally { setBusy(false); }
  };
  return (
    <>
      <H title="Admin settings" sub="Change your organization name and URL, or request forms data" />
      <div className="row gap-14 wrap">
        <div className="set-card col gap-12" style={{ flex: 1, minWidth: 260 }}>
          <Avatar name={app.org.name} size="lg" className="grey" />
          <span className="t-h2" style={{ fontSize: 20 }}>{app.org.name}</span>
          <Btn kind="secondary" style={{ alignSelf: 'flex-start' }} disabled={!isAdmin} onClick={() => setModal('name')}>Change name</Btn>
        </div>
        <div className="set-card grey col gap-10" style={{ flex: 1, minWidth: 260 }}>
          <span className="t-overline">Form URL</span>
          <span className="t-caption">The URL for all forms of your org contain this:</span>
          <span className="t-h2" style={{ fontSize: 20 }}>{app.org.subdomain}.qwery.to</span>
          <Btn style={{ alignSelf: 'flex-start' }} disabled={!isAdmin} onClick={() => setModal('url')}>Change URL</Btn>
        </div>
      </div>
      <div className="set-card col gap-10">
        <span className="t-overline">Form data</span>
        <p className="t-caption">Review your Org members, Workspaces, Workspace members, and your forms’ data such as questions, answer options, logic jumps and conversations in one file. Only the Account Owner can request the data export.</p>
        <Btn kind="secondary" icon="download" style={{ alignSelf: 'flex-start' }} loading={busy} disabled={app.role !== 'owner'} onClick={exportData}>Request export</Btn>
      </div>
      {modal === 'name' && <TextModal title="Change organization name" label="Organization name" value={app.org.name} onClose={() => setModal(null)} onSave={async (v) => { await db.from('organizations').update({ name: v }).eq('id', app.org.id); app.reload(); toast('Name updated', { ok: true }); }} />}
      {modal === 'url' && <TextModal title="Change your URL" label="Custom subdomain" help="Links you’ve already shared keep working. Use 3–30 lowercase letters, numbers or dashes." value={app.org.subdomain} suffix=".qwery.to" onClose={() => setModal(null)}
        validate={(v) => (!/^[a-z0-9-]{3,30}$/.test(v) ? 'Use 3–30 lowercase letters, numbers or dashes.' : null)}
        onSave={async (v) => { try { await db.from('organizations').update({ subdomain: v }).eq('id', app.org.id); } catch (e) { throw new Error(/duplicate|unique/.test(e.message) ? 'That URL is taken. Try another.' : e.message); } app.reload(); toast('URL changed', { ok: true }); }} />}
    </>
  );
}

/* ---------------- Org: members ---------------- */
function InviteModal({ onClose, onDone }) {
  const app = useApp();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [busy, setBusy] = useState(false);
  return (
    <Modal title="Invite members" onClose={onClose} width={460} footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} disabled={!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)} onClick={async () => {
      setBusy(true);
      try { await db.from('org_members').insert({ org_id: app.org.id, email: email.toLowerCase().trim(), role }); toast(`${email} invited`, { ok: true }); onDone(); onClose(); }
      catch (e) { toast(/duplicate|unique/.test(e.message) ? 'That person is already a member' : e.message, { error: true }); } finally { setBusy(false); }
    }}>Send invite</Btn></>}>
      <div className="col gap-12">
        <input className="field" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus aria-label="Email" />
        {[['admin', 'Admin', 'Manages the organization, members, billing and every shared workspace.'], ['editor', 'Editor', 'Creates and edits forms in shared workspaces. Can’t manage billing or members.']].map(([k, l, d]) => (
          <button key={k} className="radio-row" onClick={() => setRole(k)}><Radio on={role === k} /><span className="col"><span className="t-body-s">{l}</span><span className="t-caption muted">{d}</span></span></button>
        ))}
        <p className="t-caption muted">They’ll get access as soon as they sign up or log in with this email.</p>
      </div>
    </Modal>
  );
}

function Members() {
  const app = useApp();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [invite, setInvite] = useState(false);
  const m = useAsync(async () => (await db.from('org_members').select('*').eq('org_id', app.org.id).order('created_at')).data || [], [app.org.id]);
  const seats = PLANS[app.org.plan || 'free'].seats;
  const used = (m.data || []).length;
  const isAdmin = ['owner', 'admin'].includes(app.role);
  const list = (m.data || []).filter((x) => !q || x.email.includes(q.toLowerCase()));
  return (
    <>
      <H title="Org members" sub="Invite people and assign organization roles" />
      <div className="row gap-14 wrap" style={{ alignItems: 'flex-start' }}>
        <div className="col gap-14" style={{ flex: '1 1 380px' }}>
          <div className="row gap-14">
            <button className="set-card grey col gap-12" style={{ flex: 1, textAlign: 'left', minHeight: 90 }} onClick={() => isAdmin && (used >= seats ? toast('You’ve used every seat on your plan — get more seats to invite') : setInvite(true))} disabled={!isAdmin}><Icon name="invite" /><span className="t-h3" style={{ fontWeight: 400, fontSize: 18 }}>Invite members</span></button>
            <div className="set-card col gap-12" style={{ flex: 1 }}><span className="row between t-body-s"><span>Editor seats</span><b>{used} / {seats}</b></span><div className="bar-track"><div style={{ width: `${Math.min(100, (used / seats) * 100)}%` }} /></div></div>
          </div>
          <div className="set-card col gap-10">
            <div className="row between"><span className="t-overline">Organization members ({used})</span><div className="row gap-6" style={{ background: 'var(--q-bg-subtle)', borderRadius: 999, padding: '4px 10px' }}><Icon name="search" size={14} /><input style={{ border: 0, outline: 'none', background: 'none', fontSize: 13, width: 140 }} placeholder="Search by name or email" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
            {list.map((x) => (
              <div key={x.id} className="row gap-10" style={{ borderTop: '1px solid var(--q-border-default)', padding: '12px 0' }}>
                <Avatar name={x.email} className="grey" />
                <span className="col grow" style={{ minWidth: 0 }}><span className="t-body-s ellipsis">{x.email}{x.user_id === app.user.id ? ' (you)' : ''}</span><span className="t-caption muted">{x.status === 'pending' ? 'Pending confirmation' : x.role === 'owner' ? 'Account owner' : 'Member'}</span></span>
                <span className="t-caption muted" style={{ width: 80 }}>{x.last_active_at ? fmtDate(x.last_active_at) : '–'}</span>
                <div style={{ width: 120 }}>
                  {x.role === 'owner' || !isAdmin ? <span className="chip grey">{x.role[0].toUpperCase() + x.role.slice(1)}</span> : (
                    <Select value={x.role} onChange={async (r) => { if (r === 'remove') await db.from('org_members').delete().eq('id', x.id); else await db.from('org_members').update({ role: r }).eq('id', x.id); m.reload(); }}
                      options={[{ value: 'admin', label: 'Admin' }, { value: 'editor', label: 'Editor' }, { value: 'remove', label: 'Remove' }]} pill />
                  )}
                </div>
              </div>
            ))}
            <p className="t-caption muted">Learn more about roles and permissions in Qwery</p>
          </div>
        </div>
        <div className="col gap-14" style={{ flex: '0 1 220px' }}>
          <div className="set-card grey col gap-10"><Icon name="diamond" /><span className="t-label-l">Need more space?</span><span className="t-caption">Invite more people to your organization and team up on forms.</span><Btn style={{ alignSelf: 'flex-start' }} onClick={() => navigate('/plans')}>Get more seats</Btn></div>
          <div className="set-card grey col gap-10"><span className="t-label-l">Team up with agencies</span><span className="t-caption">Find a certified agency to build, design, and optimize your forms.</span><Btn kind="secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setInvite(true)} disabled={!isAdmin}>Invite agencies</Btn></div>
        </div>
      </div>
      {invite && <InviteModal onClose={() => setInvite(false)} onDone={m.reload} />}
    </>
  );
}

/* ---------------- Org: billing ---------------- */
function Billing() {
  const app = useApp();
  const toast = useToast();
  const usage = useAsync(() => db.rpc('org_usage', { p_org: app.org.id }), [app.org.id]);
  const [auto, setAuto] = useState(false);
  const [card, setCard] = useState(() => localStorage.getItem('qwery.backupNote') !== 'off');
  const plan = PLANS[app.org.plan || 'free'];
  const b = app.org.billing || {};
  const renews = app.org.plan_renews_at ? new Date(app.org.plan_renews_at) : new Date(Date.now() + 30 * 864e5);
  const isFree = (app.org.plan || 'free') === 'free';
  const isAdmin = ['owner', 'admin'].includes(app.role);
  const u = usage.data || { responses: 0, limit: plan.responses, seats: 1 };
  return (
    <>
      <H title="Plan & billing" sub="Manage your plan, payment method and invoices." />
      {card && !isFree && <div className="row gap-10 t-body-s" style={{ background: 'var(--ink-100)', borderRadius: 12, padding: '10px 14px' }}><Icon name="help" size={16} /><span className="grow">Add a backup card so your forms never pause at the limit. <button className="u" onClick={() => navigate('/checkout?update=1')}>Add backup card</button></span><IconBtn icon="x" label="Dismiss" onClick={() => { setCard(false); localStorage.setItem('qwery.backupNote', 'off'); }} /></div>}
      <div className="set-card col gap-16">
        <span className="t-h3" style={{ fontWeight: 400, borderBottom: '1px solid var(--q-border-default)', paddingBottom: 10 }}>Plan</span>
        <div className="row gap-12 wrap">
          <span style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--q-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="star" /></span>
          <span className="t-display-l" style={{ fontSize: 30 }}>Qwery {plan.name}</span>
          {!isFree && <span className="badge accent">{app.org.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly'}</span>}
          {b.cancel_at && <span className="badge warning">Plan ends {fmtDate(b.cancel_at)}</span>}
          <span className="grow" />
          {isAdmin && <Btn kind="secondary" onClick={() => navigate('/plans')}>{isFree ? 'Upgrade' : 'Change plan'}</Btn>}
          {isAdmin && !isFree && !b.cancel_at && <Btn kind="secondary" onClick={() => navigate('/cancel-plan')}>Cancel plan</Btn>}
          {isAdmin && b.cancel_at && <Btn kind="secondary" onClick={async () => { await db.from('organizations').update({ billing: { ...b, cancel_at: null } }).eq('id', app.org.id); app.reload(); toast('Your plan will renew as normal', { ok: true }); }}>Keep plan</Btn>}
        </div>
        <div className="row gap-24 wrap">
          {[['calendar', isFree ? 'Resets on' : 'Renews on', isFree ? new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : renews.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), !isFree && app.org.billing_cycle !== 'yearly' ? <button className="u accent-text t-caption" onClick={() => navigate('/checkout?plan=' + app.org.plan + '&cycle=yearly')}>Switch to yearly (save 16%)</button> : null],
            ['chart', 'Responses this month', `${u.responses} / ${u.limit.toLocaleString()}`, <span className="t-caption muted">Resets {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>],
            ['user', 'Seats', `${u.seats} / ${plan.seats}`, <button className="u accent-text t-caption" onClick={() => navigate('/org/members')}>Invite people</button>]].map(([ic, l, v, sub]) => (
            <div key={l} className="row gap-12" style={{ flex: 1, minWidth: 180 }}><span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--q-bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={ic} size={18} /></span><span className="col gap-2"><span className="t-body-s muted">{l}</span><span className="t-h2" style={{ fontSize: 20 }}>{v}</span>{sub}</span></div>
          ))}
        </div>
      </div>
      <div className="set-card col gap-12">
        <div className="row between"><span className="col gap-4"><span className="t-h3" style={{ fontWeight: 400 }}>Response usage</span><span className="t-body-s muted">You’ve used {((u.responses / u.limit) * 100).toFixed(1)}% of this month’s responses. We’ll email you at 80%.</span></span><Btn kind="secondary" onClick={() => setAuto(true)} disabled={!isAdmin}>Manage auto-upgrade</Btn></div>
        <div className="bar-track" style={{ height: 8 }}><div style={{ width: `${Math.max(1.5, Math.min(100, (u.responses / u.limit) * 100))}%`, background: 'var(--accent-500)' }} /></div>
        <div className="row between t-caption muted"><span>{u.responses} of {u.limit.toLocaleString()} responses</span><span>Auto-upgrade is {app.org.auto_upgrade ? 'on' : 'off'}</span></div>
      </div>
      <div className="row gap-14 wrap">
        <div className="set-card col gap-12" style={{ flex: 1, minWidth: 260 }}>
          <div className="row between"><span className="t-h3" style={{ fontWeight: 400 }}>Payment method</span><Btn kind="secondary" disabled={!isAdmin} onClick={() => navigate('/checkout?update=1')}>Manage</Btn></div>
          {b.card ? <div className="row gap-12"><span className="chip" style={{ fontWeight: 700, color: '#1a1f71' }}>{b.card.brand}</span><span className="col"><span className="t-body-s">{b.card.brand} •••• {b.card.last4}</span><span className="t-caption muted">Expires {b.card.exp} · Default</span></span></div> : <span className="t-body-s muted">No card on file.</span>}
          <span className="badge neutral" style={{ alignSelf: 'flex-start' }}>Test mode — no real charges</span>
        </div>
        <div className="set-card col gap-12" style={{ flex: 1, minWidth: 260 }}>
          <div className="row between"><span className="t-h3" style={{ fontWeight: 400 }}>Billing details</span><Btn kind="secondary" disabled={!isAdmin} onClick={() => navigate('/checkout?update=1')}>Update</Btn></div>
          {b.details ? <div className="row gap-20 t-body-s"><span className="col"><span className="t-caption muted">Billing address</span><span>{b.details.first} {b.details.last}</span><span>{b.details.address}</span><span>{b.details.zip} {b.details.city}{b.details.state ? `, ${b.details.state}` : ''}</span><span>{b.details.country}</span></span><span className="col"><span className="t-caption muted">Billing email</span><span>{b.details.email || app.user.email}</span></span></div> : <span className="t-body-s muted">Not added yet.</span>}
        </div>
      </div>
      <div className="set-card col gap-10">
        <span className="t-h3" style={{ fontWeight: 400 }}>Plan includes</span>
        <div className="row gap-20 wrap t-body-s">{[`${plan.responses.toLocaleString()} responses / month`, `${plan.seats} seat${plan.seats > 1 ? 's' : ''}`, 'Unlimited forms', isFree ? 'Qwery branding' : 'Remove Qwery branding', !isFree && 'Conversations inbox', ['plus', 'business'].includes(app.org.plan) && 'Brand kit', app.org.plan === 'business' && 'Drop-off analysis'].filter(Boolean).map((x) => <span key={x} className="row gap-6"><Icon name="check" size={14} />{x}</span>)}</div>
      </div>
      {(b.invoices || []).length > 0 && (
        <div className="set-card col gap-8">
          <span className="t-h3" style={{ fontWeight: 400 }}>Invoices</span>
          {b.invoices.map((i) => <div key={i.id} className="row between t-body-s" style={{ borderTop: '1px solid var(--q-border-default)', paddingTop: 8 }}><span>{fmtDate(i.date)}</span><span>{i.desc}</span><span>{i.amount}</span><span className="badge success">Paid (test)</span></div>)}
        </div>
      )}
      {auto && (
        <Modal title="Auto-upgrade" onClose={() => setAuto(false)} width={440}>
          <div className="col gap-12">
            <div className="row between"><span className="t-body-s">Automatically upgrade when you hit your limit</span><Toggle on={app.org.auto_upgrade} onChange={async (v) => { await db.from('organizations').update({ auto_upgrade: v }).eq('id', app.org.id); app.reload(); }} label="Auto-upgrade" /></div>
            <p className="t-caption muted">{app.org.auto_upgrade ? 'On: your form keeps accepting responses past the limit, and extra responses are added to your next bill.' : 'Off: your forms stop accepting responses once you reach the monthly limit.'}</p>
          </div>
        </Modal>
      )}
    </>
  );
}

function Developer() {
  return (
    <>
      <H title="Developer apps" sub="Build on top of Qwery." />
      <div className="set-card col gap-10">
        <span className="t-label-l">Webhooks</span>
        <p className="t-body-s muted">Every form can send each response to your endpoint in real time, signed with HMAC-SHA256. Open a form → Connect → Webhooks.</p>
        <div className="code-box">{`POST https://your-endpoint\nQwery-Signature: sha256=…\n\n{ "event_type": "form_response", "form_response": { "form_id": "…", "answers": { … }, "hidden": { … } } }`}</div>
      </div>
      <div className="set-card col gap-10">
        <span className="t-label-l">Embed SDK</span>
        <p className="t-body-s muted">Open any form in a popup from your own code.</p>
        <div className="code-box">{`<script src="${location.origin}/embed.js"></script>\n<script>Qwery.popup('${location.origin}/to/your-form')</script>`}</div>
      </div>
    </>
  );
}

/* ---------------- Account ---------------- */
function TwoFactor({ onClose }) {
  const toast = useToast();
  const app = useApp();
  const [step, setStep] = useState(1);
  const [factor, setFactor] = useState(null);
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const begin = async () => { setBusy(true); try { setFactor(await auth.mfa.enroll()); setStep(2); } catch (e) { setErr(e.message); } setBusy(false); };
  const verify = async () => { setBusy(true); setErr(''); try { await auth.mfa.challengeAndVerify(factor.id, code); await auth.user(); setStep(3); app.reload(); } catch (e) { setErr(/invalid/i.test(e.message) ? 'That code didn’t work. Try the newest one from your app.' : e.message); } setBusy(false); };
  return (
    <Modal onClose={onClose} width={340} hideClose>
      <div className="col center gap-12" style={{ textAlign: 'center', padding: '10px 4px' }}>
        <Logo height={16} />
        {step === 1 && <>
          <span className="avatar lg grey" style={{ width: 56, height: 56 }}><Icon name="shield" size={22} /></span>
          <p className="t-label-l">Set up two-factor authentication</p>
          <p className="t-body-s muted">Use an authenticator app like 1Password, Google Authenticator or Authy to get a 6-digit code each time you log in.</p>
          {err && <p className="err" style={{ fontSize: 12 }}>{err}</p>}
          <Btn style={{ width: '100%', height: 36 }} loading={busy} onClick={begin}>Continue</Btn>
          <button className="t-caption muted" onClick={onClose}>Not now</button>
        </>}
        {step === 2 && factor && <>
          <p className="t-label-l">Scan this QR code</p>
          <img src={factor.totp.qr_code} alt="Authenticator QR code" style={{ width: 170, height: 170 }} />
          <p className="t-caption muted">Or enter this key: <code style={{ wordBreak: 'break-all' }}>{factor.totp.secret}</code></p>
          <div className="col gap-6" style={{ width: '100%', textAlign: 'left' }}><span className="t-label-s">Verification code</span><input className="field sq" style={{ height: 40, textAlign: 'center', letterSpacing: '.3em' }} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && verify()} /></div>
          {err && <p className="err" style={{ fontSize: 12 }}>{err}</p>}
          <Btn style={{ width: '100%', height: 36 }} loading={busy} disabled={code.length !== 6} onClick={verify}>Verify</Btn>
        </>}
        {step === 3 && <>
          <span className="avatar lg" style={{ width: 56, height: 56, background: 'var(--green-100)', color: '#087443' }}><Icon name="check" size={22} /></span>
          <p className="t-label-l">2FA enabled</p>
          <p className="t-body-s muted">You’ll be asked for a code from your authenticator app each time you log in.</p>
          <Btn style={{ width: '100%', height: 36 }} onClick={() => { onClose(); toast('Two-factor authentication is on', { ok: true }); }}>Done</Btn>
        </>}
      </div>
    </Modal>
  );
}

function DeleteAccount({ onClose }) {
  const app = useApp();
  const [step, setStep] = useState(1);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const reauth = async () => { setBusy(true); setErr(''); try { await auth.signIn({ email: app.user.email, password: pw }); const f = auth.mfa.verifiedFactors(); setStep(f.length ? 2 : 3); } catch (e) { setErr(e.message); } setBusy(false); };
  const [code, setCode] = useState('');
  const mfa = async () => { setBusy(true); setErr(''); try { await auth.mfa.challengeAndVerify(auth.mfa.verifiedFactors()[0].id, code); setStep(3); } catch (e) { setErr(e.message); } setBusy(false); };
  const destroy = async () => { setBusy(true); try { await db.rpc('delete_my_account'); await auth.signOut(); navigate('/bye', { replace: true }); } catch (e) { setErr(e.message); setBusy(false); } };
  return (
    <Modal onClose={onClose} width={360} hideClose>
      <div className="col center gap-12" style={{ textAlign: 'center', padding: '10px 4px' }}>
        <Logo height={16} />
        {step === 1 && <>
          <span className="avatar lg grey" style={{ width: 56, height: 56 }}><Icon name="lock" size={22} /></span>
          <p className="t-label-l">Authenticate to continue</p>
          <p className="t-body-s muted">For your security, confirm your password before deleting your account.</p>
          <input className="field sq" type="password" style={{ height: 40 }} placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && pw && reauth()} />
          {err && <p className="err" style={{ fontSize: 12 }}>{err}</p>}
          <Btn style={{ width: '100%', height: 36 }} loading={busy} disabled={!pw} onClick={reauth}>Continue</Btn>
          <button className="t-caption muted" onClick={onClose}>Cancel</button>
        </>}
        {step === 2 && <>
          <p className="t-label-l">Enter your 2FA code</p>
          <input className="field sq" style={{ height: 40, textAlign: 'center', letterSpacing: '.3em' }} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
          {err && <p className="err" style={{ fontSize: 12 }}>{err}</p>}
          <Btn style={{ width: '100%', height: 36 }} loading={busy} disabled={code.length !== 6} onClick={mfa}>Verify</Btn>
        </>}
        {step === 3 && <>
          <span className="avatar lg" style={{ width: 56, height: 56, background: 'var(--red-100)', color: 'var(--red-500)' }}><Icon name="trash" size={22} /></span>
          <p className="t-label-l">Delete your account forever?</p>
          <p className="t-body-s muted">All your forms, conversations and responses will be deleted. This can’t be undone.</p>
          {err && <p className="err" style={{ fontSize: 12 }}>{err}</p>}
          <Btn kind="danger" style={{ width: '100%', height: 36 }} loading={busy} onClick={destroy}>Delete my account</Btn>
          <button className="t-caption muted" onClick={onClose}>Keep my account</button>
        </>}
      </div>
    </Modal>
  );
}

function PasswordModal({ onClose }) {
  const toast = useToast();
  const [a, setA] = useState(''); const [b, setB] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const ok = a.length >= 8 && /[0-9!@#$%^&*]/.test(a) && a === b;
  return (
    <Modal title="Change password" onClose={onClose} width={420} footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} disabled={!ok} onClick={async () => { setBusy(true); try { await auth.update({ password: a }); toast('Password updated', { ok: true }); onClose(); } catch (e) { setErr(e.message); } setBusy(false); }}>Update password</Btn></>}>
      <div className="col gap-8">
        <input className="field" type="password" placeholder="New password (8+ characters, a number or symbol)" value={a} onChange={(e) => setA(e.target.value)} autoFocus />
        <input className="field" type="password" placeholder="Confirm new password" value={b} onChange={(e) => setB(e.target.value)} />
        {b && a !== b && <span className="err" style={{ fontSize: 12 }}>Passwords must match</span>}
        {err && <span className="err" style={{ fontSize: 12 }}>{err}</span>}
      </div>
    </Modal>
  );
}

const AVATAR_COLORS = ['#f3d9a4', '#a9d4ff', '#a6f0c6', '#d6c2ff', '#ffb3da', '#ffd991', '#e3e3e3'];
function AccountSettings() {
  const app = useApp();
  const toast = useToast();
  const [modal, setModal] = useState(null);
  const p = app.profile || {};
  const prefs = p.prefs || {};
  const factors = auth.mfa.verifiedFactors();
  const setPref = async (k, v) => { const np = { ...prefs, [k]: v }; await db.from('profiles').update({ prefs: np }).eq('id', app.user.id); app.setProfile({ prefs: np }); };
  return (
    <>
      <H title="Your settings" sub="Put a face to your name, edit your login details, and set preferences" />
      <div className="row gap-14 wrap">
        <div className="set-card col gap-10" style={{ flex: 1, minWidth: 260 }}>
          <Avatar name={p.name} size="lg" color={p.avatar_color} />
          <span className="t-h2" style={{ fontSize: 20 }}>{p.name}</span>
          <span className="t-caption muted">Joined Qwery on {fmtDate(p.created_at || app.user.created_at)}</span>
          <div className="row gap-8"><Btn kind="secondary" onClick={() => setModal('name')}>Change name</Btn><Btn kind="secondary" onClick={() => setModal('avatar')}>Change avatar</Btn></div>
        </div>
        <div className="set-card grey col gap-10" style={{ flex: 1, minWidth: 260 }}>
          <span className="t-overline">Login details</span>
          <span className="t-caption">Your email is:</span>
          <span className="t-h2" style={{ fontSize: 20 }}>{app.user.email}</span>
          <div className="row gap-8"><Btn kind="secondary" onClick={() => setModal('email')}>Change email</Btn><Btn kind="secondary" onClick={() => setModal('password')}>Change password</Btn></div>
        </div>
      </div>
      <div className="row gap-14 wrap">
        <div className="set-card col gap-10" style={{ flex: '1 1 200px' }}>
          <span className="t-overline">Language</span><span className="t-caption">Your account language is:</span>
          <div style={{ width: 170 }}><Select value={p.language || 'English'} onChange={async (v) => { await db.from('profiles').update({ language: v }).eq('id', app.user.id); app.setProfile({ language: v }); toast('Language saved', { ok: true }); }} options={['English', 'Español', 'Français', 'Deutsch', 'Português', 'Bahasa Indonesia'].map((x) => ({ value: x, label: x }))} /></div>
        </div>
        <div className="set-card col gap-10" style={{ flex: '2 1 300px' }}>
          <span className="t-overline">Security</span>
          <p className="t-caption">Two-factor authentication (2FA) makes your account more secure by adding an extra verification step when you log in.</p>
          {factors.length ? (
            <div className="row gap-10"><span className="badge success"><Icon name="check" size={12} />2FA is on</span><Btn kind="secondary" onClick={async () => { await auth.mfa.unenroll(factors[0].id); await auth.user(); app.reload(); toast('2FA turned off'); }}>Turn off</Btn></div>
          ) : <Btn kind="secondary" icon="lock" style={{ alignSelf: 'flex-start' }} onClick={() => setModal('2fa')}>Enable 2FA</Btn>}
        </div>
      </div>
      <div className="set-card col gap-10">
        <span className="t-overline">Account data</span>
        <p className="t-caption">Choose how Qwery uses your account data to personalize its services. See Privacy Policy</p>
        <div className="row between"><span className="col"><span className="t-body-s">Tailor-made Qwery</span><span className="t-caption muted">Get a more personalized experience based on your activity</span></span><Toggle on={prefs.personalise !== false} onChange={(v) => setPref('personalise', v)} label="Tailor-made Qwery" /></div>
        <div className="row between"><span className="col"><span className="t-body-s">More relevant content</span><span className="t-caption muted">We may enrich your data using third parties to offer better content</span></span><Toggle on={!!prefs.enrich} onChange={(v) => setPref('enrich', v)} label="More relevant content" /></div>
      </div>
      <div className="set-card danger col gap-10">
        <span className="t-overline" style={{ color: 'var(--red-500)' }}>Danger zone</span>
        <p className="t-caption">All your forms, conversations and responses will be deleted forever. To keep them, cancel your subscription instead of deleting your account.</p>
        <Btn kind="danger" style={{ alignSelf: 'flex-start' }} onClick={() => setModal('delete')}>Delete account</Btn>
      </div>
      {modal === 'name' && <TextModal title="Change name" label="Your name" value={p.name} onClose={() => setModal(null)} onSave={async (v) => { await db.from('profiles').update({ name: v }).eq('id', app.user.id); app.setProfile({ name: v }); toast('Name updated', { ok: true }); }} />}
      {modal === 'email' && <TextModal title="Change email" label="New email" help="We’ll ask you to confirm the change from your new inbox." value={app.user.email} onClose={() => setModal(null)} validate={(v) => (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? 'Enter a valid email' : null)} onSave={async (v) => { await auth.update({ email: v }); toast('Check your new inbox to confirm the change', { ok: true }); }} />}
      {modal === 'password' && <PasswordModal onClose={() => setModal(null)} />}
      {modal === 'avatar' && (
        <Modal title="Change avatar" onClose={() => setModal(null)} width={360}>
          <div className="row gap-10 wrap">{AVATAR_COLORS.map((c) => <button key={c} aria-label={c} onClick={async () => { await db.from('profiles').update({ avatar_color: c }).eq('id', app.user.id); app.setProfile({ avatar_color: c }); setModal(null); }} style={{ borderRadius: '50%', outline: p.avatar_color === c ? '2px solid var(--ink-900)' : 'none', outlineOffset: 2 }}><Avatar name={p.name} size="lg" color={c} /></button>)}</div>
        </Modal>
      )}
      {modal === '2fa' && <TwoFactor onClose={() => setModal(null)} />}
      {modal === 'delete' && <DeleteAccount onClose={() => setModal(null)} />}
    </>
  );
}

function Communications() {
  const app = useApp();
  const prefs = app.profile?.prefs || {};
  const set = async (k, v) => { const np = { ...prefs, [k]: v }; await db.from('profiles').update({ prefs: np }).eq('id', app.user.id); app.setProfile({ prefs: np }); };
  const rows = [['tips', 'Product tips and ideas', 'Ways to get more from Qwery, a couple of times a month'], ['digest', 'Weekly results digest', 'A Monday summary of responses and conversations'], ['conv_notify', 'New conversation alerts', 'When a respondent starts or replies to a conversation'], ['limits', 'Usage alerts', 'When you reach 80% and 100% of your monthly responses'], ['research', 'Research invitations', 'Help shape Qwery by joining a short interview']];
  return (
    <>
      <H title="Communications" sub="Choose what Qwery sends to your inbox." />
      <div className="set-card col">
        {rows.map(([k, l, d], i) => <div key={k} className="row between" style={{ padding: '12px 0', borderTop: i ? '1px solid var(--q-border-default)' : 0 }}><span className="col"><span className="t-body-s">{l}</span><span className="t-caption muted">{d}</span></span><Toggle on={prefs[k] !== undefined ? !!prefs[k] : k !== 'research'} onChange={(v) => set(k, v)} label={l} /></div>)}
      </div>
    </>
  );
}

function Simple({ title, sub, body }) { return <><H title={title} sub={sub} /><div className="set-card"><div className="empty" style={{ padding: 30 }}><span className="ic"><Icon name="apps" /></span>{body}</div></div></>; }

export default function Settings({ area, page }) {
  useEffect(() => { document.title = 'Settings · Qwery'; }, []);
  let body;
  if (area === 'org') body = page === 'members' ? <Members /> : page === 'billing' ? <Billing /> : page === 'developer' ? <Developer /> : <Admin />;
  else body = page === 'communications' ? <Communications /> : page === 'apps' ? <Simple title="Authorized apps" sub="Apps you’ve given access to your Qwery account." body={<p className="t-body-s">You haven’t authorized any apps. Integrations you connect from a form live under that form’s Connect tab.</p>} />
    : page === 'tokens' ? <Simple title="Personal tokens" sub="Tokens for scripts that act as you." body={<p className="t-body-s">Personal tokens aren’t available yet. Use webhooks to get responses out of Qwery in real time.</p>} /> : <AccountSettings />;
  return <Shell area={area} page={page}>{body}</Shell>;
}
