import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { normalizeContent } from '../lib/questions.js';
import { navigate } from '../lib/router.js';
import { db } from '../lib/sb.js';
import { useApp } from '../lib/store.jsx';
import { Btn, copy, cx, IconBtn, Modal, PageLoader, useToast } from '../ui.jsx';
import { AccountMenu, publicLink } from './Workspace.jsx';

const Create = lazy(() => import('./editor/Create.jsx'));
const Logic = lazy(() => import('./editor/Logic.jsx'));
const Connect = lazy(() => import('./editor/Connect.jsx'));
const Share = lazy(() => import('./editor/Share.jsx'));
const Results = lazy(() => import('./editor/Results.jsx'));
const Conversations = lazy(() => import('./editor/Conversations.jsx'));
const BuildChooser = lazy(() => import('./editor/Create.jsx').then((m) => ({ default: m.BuildChooser })));

const FormCtx = createContext(null);
export const useForm = () => useContext(FormCtx);

const TABS = [['create', 'Create'], ['logic', 'Logic'], ['connect', 'Connect'], ['share', 'Share'], ['results', 'Results'], ['conversations', 'Conversations']];

export default function FormShell({ formId, tab, sub }) {
  const app = useApp();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [content, setContent] = useState(null);
  const [err, setErr] = useState(null);
  const [saving, setSaving] = useState('saved');
  const [role, setRole] = useState('edit');
  const [published, setPublished] = useState(null);
  const [unread, setUnread] = useState(0);
  const timer = useRef(null);
  const latest = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await db.from('forms').select('*').eq('id', formId).single();
      setForm(data);
      setContent(normalizeContent(data.content));
      latest.current = normalizeContent(data.content);
      const { data: r } = await db.rpc('ws_role', { p_ws: data.workspace_id }).then((d) => ({ data: d }), () => ({ data: 'edit' }));
      setRole(r || 'view');
      const { count } = await db.from('conversations').select('id', { count: 'exact' }).eq('form_id', formId).gt('unread_by_creator', 0).limit(1);
      setUnread(count || 0);
    } catch (e) { setErr(e); }
  }, [formId]);
  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (c) => {
    setSaving('saving');
    try {
      const now = new Date().toISOString();
      await db.from('forms').update({ content: c, updated_at: now }).eq('id', formId);
      setForm((f) => ({ ...f, updated_at: now, content: c }));
      setSaving('saved');
    } catch (e) { setSaving('error'); toast('Couldn’t save — check your connection. ' + e.message, { error: true }); }
  }, [formId, toast]);

  const update = useCallback((fn) => {
    setContent((prev) => {
      const next = typeof fn === 'function' ? fn(structuredClone(prev)) || prev : { ...prev, ...fn };
      latest.current = next;
      setSaving('dirty');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => save(latest.current), 700);
      return next;
    });
  }, [save]);

  useEffect(() => {
    const flush = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; save(latest.current); } };
    window.addEventListener('beforeunload', flush);
    return () => { window.removeEventListener('beforeunload', flush); flush(); };
  }, [save]);

  const patchForm = async (vals) => {
    const { data } = await db.from('forms').update(vals).eq('id', formId).select('*').single();
    setForm(data);
    return data;
  };

  const publish = async () => {
    clearTimeout(timer.current);
    const c = latest.current;
    const empty = !c.questions.length;
    if (empty) { toast('Add at least one question before publishing'); return; }
    try {
      const first = form.status !== 'published';
      const data = await patchForm({ content: c, published_content: c, status: 'published', published_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      setSaving('saved');
      if (first) setPublished(data); else toast('Changes published 🎉', { ok: true });
    } catch (e) { toast(e.message, { error: true }); }
  };

  if (err) return <div className="page-loader col gap-12"><p className="t-h2">We couldn’t open this form.</p><p className="muted">{err.status === 406 ? 'It may have been deleted, or you don’t have access.' : err.message}</p><Btn onClick={() => navigate('/workspace')}>Back to workspace</Btn></div>;
  if (!form || !content) return <PageLoader />;

  const ws = app.workspaces.find((w) => w.id === form.workspace_id);
  const pending = form.status === 'published' && JSON.stringify(form.published_content) !== JSON.stringify(content);
  const ctx = { form, setForm, patchForm, content, update, save: () => save(latest.current), saving, role, canEdit: role === 'owner' || role === 'edit', publish, ws, reload: load, setUnread };

  if (tab === 'new') {
    return <FormCtx.Provider value={ctx}><Suspense fallback={<PageLoader />}><BuildChooser /></Suspense></FormCtx.Provider>;
  }
  const View = { create: Create, logic: Logic, connect: Connect, share: Share, results: Results, conversations: Conversations }[tab] || Create;

  return (
    <FormCtx.Provider value={ctx}>
      <div className="ed">
        <header className="ed-head">
          <div className="side crumb">
            <Icon name="grid" />
            <button onClick={() => navigate('/workspace/' + form.workspace_id)}>{ws?.name || 'My workspace'}</button>
            <Icon name="chevron-right" size={12} />
            <span className="ellipsis" style={{ color: 'var(--q-text-secondary)' }} title={form.title}>{form.title}</span>
            {tab === 'create' && <span className="t-caption tertiary" style={{ marginLeft: 6 }}>{saving === 'saving' ? 'Saving…' : saving === 'dirty' ? '' : saving === 'error' ? 'Not saved' : ''}</span>}
          </div>
          <nav className="tabs-c" aria-label="Form sections">
            {TABS.map(([k, l]) => (
              <button key={k} className={cx('toptab', tab === k && 'on')} onClick={() => navigate(`/forms/${form.id}/${k}`)} aria-current={tab === k ? 'page' : undefined}>
                {l}{k === 'conversations' && unread > 0 && <span className="count" style={{ marginLeft: 6 }}>{unread}</span>}
              </button>
            ))}
          </nav>
          <div className="side row gap-16" style={{ justifyContent: 'flex-end' }}>
            {(app.org.plan || 'free') === 'free' && tab === 'create' && (
              <button className="btn" style={{ background: 'var(--q-bg-upgrade)', color: 'var(--q-text-upgrade)' }} onClick={() => navigate('/plans')}>View plans</button>
            )}
            {['create', 'logic', 'share'].includes(tab) && ctx.canEdit && (
              <Btn icon="play" onClick={publish} kind={form.status === 'published' && !pending ? 'secondary' : 'primary'}>{form.status === 'published' && !pending ? 'Published' : 'Publish'}</Btn>
            )}
            <span className="vdiv" style={{ height: 24 }} />
            <IconBtn icon="help" label="Help" onClick={() => window.open('mailto:support@qwery.to')} />
            <AccountMenu />
          </div>
        </header>
        <Suspense fallback={<PageLoader />}><View sub={sub} /></Suspense>
      </div>
      {published && <PublishedModal form={published} onClose={() => setPublished(null)} />}
    </FormCtx.Provider>
  );
}

function PublishedModal({ form, onClose }) {
  const toast = useToast();
  const link = publicLink(form);
  const next = [
    { bg: '#e8897a', icon: 'apps', label: 'Set up integrations and notifications', to: 'connect' },
    { bg: '#c98bd9', icon: 'link', label: 'Share or embed your form', to: 'share' },
    { bg: '#4d4de1', icon: 'message', label: 'Reply to conversations as they come in', to: 'conversations' },
  ];
  return (
    <Modal onClose={onClose} width={572} canvas hideClose bodyStyle={{ padding: 0 }}>
      <div className="row center" style={{ padding: '18px 20px 14px', position: 'relative' }}>
        <h2 className="t-h2">Your form has been published! 🎉</h2>
        <IconBtn icon="x" label="Close" onClick={onClose} style={{ position: 'absolute', right: 16 }} />
      </div>
      <div style={{ background: '#fff', borderRadius: 20, margin: '0 10px 10px', padding: '18px 24px 36px' }}>
        <div className="row gap-8" style={{ border: '1px solid var(--q-border-default)', borderRadius: 10, padding: '4px 4px 4px 10px', maxWidth: 420, margin: '0 auto' }}>
          <span className="grow ellipsis t-body-s">{link}</span>
          <Btn style={{ padding: '3px 8px', borderRadius: 8, fontSize: 12 }} onClick={() => { copy(link); toast('Link copied', { ok: true }); }}>Copy link</Btn>
        </div>
        <p className="t-body-m" style={{ textAlign: 'center', margin: '30px 0 16px' }}>Here’s what you can do next:</p>
        <div className="row gap-14 center wrap" style={{ gap: 14 }}>
          {next.map((n) => (
            <button key={n.to} onClick={() => { onClose(); navigate(`/forms/${form.id}/${n.to}`); }} style={{ width: 126, border: '1px solid var(--q-border-default)', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
              <div style={{ background: n.bg, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ background: '#fff', borderRadius: 10, width: 68, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={n.icon} /></span>
              </div>
              <div className="t-caption" style={{ padding: '10px 8px', minHeight: 50 }}>{n.label}</div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
