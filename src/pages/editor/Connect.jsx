import { useMemo, useState } from 'react';
import { Icon } from '../../lib/icons.jsx';
import { db } from '../../lib/sb.js';
import { navigate } from '../../lib/router.js';
import { Btn, copy, cx, IconBtn, Modal, Radio, Select, Toggle, timeAgo, useAsync, useToast } from '../../ui.jsx';
import { useForm } from '../FormShell.jsx';

export const INTEGRATIONS = [
  { k: 'slack', name: 'Slack', icon: 'message', bg: '#d6c2ff', fg: '#5a25c4', cats: ['Conversations', 'Collaboration'], d: 'Get a message in your channel the moment a respondent starts a conversation, and reply from Slack.', live: true },
  { k: 'sheets', name: 'Google Sheets', icon: 'columns', bg: '#a6f0c6', fg: '#08703d', cats: ['Productivity', 'Analytics & reporting'], d: 'Send your data straight to Google Sheets. Automatically syncs as results come in.', live: true },
  { k: 'hubspot', name: 'HubSpot', icon: 'user', bg: '#ffd991', fg: '#8a5300', cats: ['Lead generation', 'Marketing automation'], d: 'Send contact, company, or deal info to HubSpot — including the full conversation transcript.' },
  { k: 'excel', name: 'Excel', icon: 'grid', bg: '#a6f0c6', fg: '#08703d', cats: ['Productivity', 'Analytics & reporting'], d: 'Send responses to Excel Online. Turn feedback into graphs and workflows.' },
  { k: 'zendesk', name: 'Zendesk', icon: 'inbox', bg: '#a9d4ff', fg: '#0b4db0', cats: ['Customer support', 'Conversations'], d: 'Turn any conversation into a support ticket with the original answers attached.' },
  { k: 'zapier', name: 'Zapier', icon: 'zap', bg: '#ffd991', fg: '#ea6a1e', cats: ['Automation'], d: 'Connect Qwery to 6,000+ apps with a webhook-triggered Zap.' },
  { k: 'mailchimp', name: 'Mailchimp', icon: 'mail', bg: '#ffeb7a', fg: '#705a00', cats: ['Marketing automation', 'Lead generation'], d: 'Send new contacts to your Mailchimp audiences.' },
  { k: 'notion', name: 'Notion', icon: 'page', bg: '#ece8df', fg: '#3a3833', cats: ['Productivity', 'Collaboration'], d: 'Send data to your Notion database.' },
  { k: 'salesforce', name: 'Salesforce', icon: 'building', bg: '#a9d4ff', fg: '#0b4db0', cats: ['Lead generation'], d: 'Send form responses to Salesforce.' },
  { k: 'ga', name: 'Google Analytics', icon: 'chart', bg: '#ffd991', fg: '#8a5300', cats: ['Analytics & reporting'], d: 'Discover how people find and interact with your form.', settings: true },
  { k: 'intercom', name: 'Intercom', icon: 'message', bg: '#e2e2fc', fg: '#3333b5', cats: ['Customer support', 'Conversations'], d: 'Hand conversations over to your support inbox.' },
  { k: 'teams', name: 'Microsoft Teams', icon: 'message', bg: '#e2e2fc', fg: '#3333b5', cats: ['Collaboration', 'Conversations'], d: 'Post new responses and conversations to a Teams channel.' },
  { k: 'developer', name: 'Webhooks', icon: 'link', bg: '#e2e2fc', fg: '#3333b5', cats: ['Developer tools'], d: 'Send every response to your own endpoint in real time.', tab: 'webhooks' },
];
const CATS = ['Analytics & reporting', 'Automation', 'Collaboration', 'Conversations', 'Customer support', 'Developer tools', 'Lead generation', 'Marketing automation', 'Productivity'];

const SHEETS_SCRIPT = `// Qwery → Google Sheets
// 1. In your sheet: Extensions → Apps Script, paste this, then Deploy → New deployment → Web app
// 2. Execute as: Me · Who has access: Anyone → Deploy, and copy the Web app URL
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(data.sheet) || ss.insertSheet(data.sheet);
  if (sh.getLastRow() === 0) sh.appendRow(data.headers);
  sh.appendRow(data.values);
  return ContentService.createTextOutput('ok');
}`;

function SheetsFlow({ form, onClose, onDone }) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState('new');
  const [name, setName] = useState(form.title + ' responses');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await db.from('integrations').insert({ form_id: form.id, provider: 'sheets', config: { url, sheet: name } });
      setStep(3);
    } catch (e) { toast(e.message, { error: true }); } finally { setBusy(false); }
  };
  const steps = ['Log in', 'Configure', 'Finish'];
  return (
    <div className="overlay" style={{ background: '#fff', alignItems: 'stretch', padding: 0 }}>
      <div className="col" style={{ flex: 1 }}>
        <div className="row" style={{ justifyContent: 'flex-end', padding: 16 }}><IconBtn icon="x" label="Close" onClick={onClose} /></div>
        <div className="col gap-16 grow" style={{ maxWidth: 460, margin: '0 auto', width: '100%', padding: '40px 16px', justifyContent: 'center' }}>
          {step === 1 && (
            <>
              <span style={{ width: 44, height: 44, borderRadius: 10, background: '#a6f0c6', color: '#08703d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="columns" size={22} /></span>
              <h2 className="t-h2">Connect your Google Sheet</h2>
              <p className="t-body-s muted">Qwery writes each new response as a row through a tiny Apps Script that runs in your own Google account — no extra permissions to Qwery.</p>
              <div className="code-box" style={{ maxHeight: 220, overflow: 'auto' }}>{SHEETS_SCRIPT}</div>
              <div className="row gap-8"><Btn kind="secondary" icon="copy" onClick={() => { copy(SHEETS_SCRIPT); toast('Script copied', { ok: true }); }}>Copy script</Btn><Btn onClick={() => setStep(2)}>I’ve deployed it</Btn></div>
            </>
          )}
          {step === 2 && (
            <>
              <span className="t-caption tertiary">Cool</span>
              <p className="t-body-s muted">Where do you want to send your responses?</p>
              <div className="row gap-6">{[['new', 'Create new sheet'], ['existing', 'Use existing']].map(([k, l]) => <button key={k} className={cx('chip', mode === k ? 'conv' : 'grey')} onClick={() => setMode(k)}>{l}</button>)}</div>
              <label className="col gap-6" style={{ marginTop: 20 }}><span className="t-body-s">{mode === 'new' ? 'Name your new spreadsheet tab' : 'Existing tab name'}</span><input className="field sq" style={{ height: 40 }} placeholder="E.g. Product survey results" value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="col gap-6"><span className="t-body-s">Apps Script web app URL</span><input className="field sq" style={{ height: 40 }} placeholder="https://script.google.com/macros/s/…/exec" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
              {url && !/^https:\/\/script\.google\.com\/macros\/s\//.test(url) && <span className="err" style={{ fontSize: 12 }}>That doesn’t look like an Apps Script web app URL.</span>}
              <Btn style={{ alignSelf: 'flex-start' }} loading={busy} disabled={!name || !/^https:\/\/script\.google\.com\/macros\/s\//.test(url)} onClick={save}>Create sheet</Btn>
            </>
          )}
          {step === 3 && (
            <>
              <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--green-100)', color: '#087443', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={22} /></span>
              <h2 className="t-h2">Almost there</h2>
              <p className="t-body-s muted">New responses to “{form.title}” will appear in the “{name}” tab as soon as the form is submitted. Older responses can be exported from Results → Download.</p>
              <Btn style={{ alignSelf: 'flex-start' }} onClick={() => { onDone(); onClose(); }}>Done</Btn>
            </>
          )}
        </div>
        <div className="row center gap-10 t-caption" style={{ borderTop: '1px solid var(--q-border-default)', padding: 16 }}>
          {steps.map((l, i) => (
            <span key={l} className="row gap-8">
              {i > 0 && <span style={{ width: 24, borderTop: '1px dashed var(--ink-400)' }} />}
              <span className="row gap-6" style={{ color: i + 1 <= step ? 'var(--accent-600)' : undefined }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: i + 1 < step ? 'var(--accent-600)' : i + 1 === step ? 'var(--accent-600)' : 'transparent', border: i + 1 > step ? '1px solid var(--ink-400)' : 0, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>{i + 1 < step ? <Icon name="check" size={9} /> : <span style={{ color: i + 1 === step ? '#fff' : 'var(--ink-500)' }}>{i + 1}</span>}</span>{l}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlackModal({ form, onClose, onDone }) {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const ok = /^https:\/\/hooks\.slack\.com\/services\//.test(url);
  return (
    <Modal title="Connect Slack" onClose={onClose} width={440} footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} disabled={!ok} onClick={async () => { setBusy(true); try { await db.from('integrations').insert({ form_id: form.id, provider: 'slack', config: { url } }); toast('Slack connected', { ok: true }); onDone(); onClose(); } catch (e) { toast(e.message, { error: true }); } setBusy(false); }}>Connect</Btn></>}>
      <div className="col gap-10">
        <p className="t-body-s muted">Create an <b>Incoming Webhook</b> in Slack (Apps → Incoming WebHooks → Add to Slack), pick a channel, then paste the webhook URL here.</p>
        <input className="field" placeholder="https://hooks.slack.com/services/…" value={url} onChange={(e) => setUrl(e.target.value)} autoFocus />
        {url && !ok && <span className="err" style={{ fontSize: 12 }}>Slack webhook URLs start with https://hooks.slack.com/services/</span>}
      </div>
    </Modal>
  );
}

function ViaWebhookModal({ item, onClose, goWebhooks }) {
  return (
    <Modal title={`Connect ${item.name}`} onClose={onClose} width={440} footer={<><Btn kind="secondary" onClick={onClose}>Close</Btn><Btn onClick={() => { onClose(); goWebhooks(); }}>Set up a webhook</Btn></>}>
      <div className="col gap-10">
        <span style={{ width: 40, height: 40, borderRadius: 10, background: item.bg, color: item.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={item.icon} /></span>
        <p className="t-body-s">{item.d}</p>
        <p className="t-body-s muted">Qwery connects to {item.name} through a webhook: point a Zapier, Make or n8n “Catch hook” trigger at your form, then add a {item.name} action. Every response arrives within seconds, with all answers and hidden fields.</p>
      </div>
    </Modal>
  );
}

function GAModal({ onClose }) {
  const { content, update } = useForm();
  const [id, setId] = useState(content.settings.tracking?.ga || '');
  return (
    <Modal title="Google Analytics" onClose={onClose} width={420} footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={() => { update((c) => { c.settings.tracking = { ...c.settings.tracking, ga: id }; }); onClose(); }}>Save</Btn></>}>
      <div className="col gap-8"><p className="t-body-s muted">Add your GA4 measurement ID. Page views and question steps are sent to your property from the live form.</p><input className="field" placeholder="G-XXXXXXX" value={id} onChange={(e) => setId(e.target.value)} /></div>
    </Modal>
  );
}

function Integrations({ goWebhooks }) {
  const { form } = useForm();
  const [cat, setCat] = useState('All');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null);
  const conns = useAsync(async () => (await db.from('integrations').select('*').eq('form_id', form.id)).data || [], [form.id]);
  const list = INTEGRATIONS.filter((i) => (cat === 'All' || i.cats.includes(cat)) && (!q || i.name.toLowerCase().includes(q.toLowerCase())));
  const connected = (k) => (conns.data || []).filter((c) => c.provider === k);
  const open = (i) => {
    if (i.tab === 'webhooks') return goWebhooks();
    if (i.k === 'slack') return setModal({ kind: 'slack' });
    if (i.k === 'sheets') return setModal({ kind: 'sheets' });
    if (i.k === 'ga') return setModal({ kind: 'ga' });
    setModal({ kind: 'via', item: i });
  };
  return (
    <div className="row gap-32 wrap" style={{ padding: '30px 6vw 60px', alignItems: 'flex-start' }}>
      <div className="col gap-16" style={{ width: 250 }}>
        <h1 className="t-h2" style={{ fontSize: 24 }}>Connect Qwery to your favorite apps</h1>
        <p className="t-body-s">Create workflows that work for you — and get a ping the moment a respondent starts a conversation.</p>
        <span className="t-body-m" style={{ marginTop: 16 }}>Categories</span>
        <div className="col gap-2">
          <button className={cx('cat-item', cat === 'All' && 'on')} onClick={() => setCat('All')}><span>All</span><span>{INTEGRATIONS.length}</span></button>
          {CATS.map((c) => <button key={c} className={cx('cat-item', cat === c && 'on')} onClick={() => setCat(c)}><span>{c}</span><span>{INTEGRATIONS.filter((i) => i.cats.includes(c)).length}</span></button>)}
        </div>
      </div>
      <div className="col gap-12 grow" style={{ minWidth: 300, maxWidth: 640 }}>
        <div className="row gap-8" style={{ border: '1px solid var(--ink-500)', borderRadius: 999, padding: '9px 14px', background: '#fff' }}>
          <Icon name="search" size={16} /><input style={{ border: 0, outline: 'none', flex: 1, fontSize: 15 }} placeholder="Search integrations" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search integrations" />{q && <button onClick={() => setQ('')} aria-label="Clear"><Icon name="x" size={14} /></button>}
        </div>
        {list.map((i) => {
          const c = connected(i.k);
          return (
            <div key={i.k} className="int-card">
              <span className="ic" style={{ background: i.bg, color: i.fg }}><Icon name={i.icon} /></span>
              <div className="col gap-4 grow"><span className="row gap-8 t-body-m" style={{ fontSize: 17 }}>{i.name}{c.length > 0 && <span className="badge success">Connected</span>}</span><span className="t-body-s muted">{i.d}</span></div>
              {c.length > 0 ? (
                <Btn kind="secondary" onClick={async () => { await db.from('integrations').delete().in('id', c.map((x) => x.id)); conns.reload(); }}>Disconnect</Btn>
              ) : <Btn onClick={() => open(i)}>Connect</Btn>}
            </div>
          );
        })}
        {!list.length && <p className="t-body-s muted">No integrations match.</p>}
      </div>
      {modal?.kind === 'sheets' && <SheetsFlow form={form} onClose={() => setModal(null)} onDone={conns.reload} />}
      {modal?.kind === 'slack' && <SlackModal form={form} onClose={() => setModal(null)} onDone={conns.reload} />}
      {modal?.kind === 'ga' && <GAModal onClose={() => setModal(null)} />}
      {modal?.kind === 'via' && <ViaWebhookModal item={modal.item} onClose={() => setModal(null)} goWebhooks={goWebhooks} />}
    </div>
  );
}

function EditWebhook({ hook, onClose, onSaved }) {
  const toast = useToast();
  const [h, setH] = useState({ ...hook });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(false);
  return (
    <Modal title="Edit webhook" onClose={onClose} width={420} footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={async () => { setBusy(true); try { await db.from('webhooks').update({ url: h.url, secret: h.secret, ssl_verify: h.ssl_verify, triggers: h.triggers }).eq('id', h.id); toast('Webhook saved', { ok: true }); onSaved(); onClose(); } catch (e) { toast(e.message, { error: true }); } setBusy(false); }}>Save changes</Btn></>}>
      <div className="col gap-14">
        <input className="field sq" style={{ height: 40, borderRadius: 12 }} value={h.url} onChange={(e) => setH({ ...h, url: e.target.value })} aria-label="Endpoint URL" />
        <div className="col gap-6">
          <span className="t-label-m">Secret</span>
          <span className="t-caption muted">Verify that requests are coming from Qwery and nobody else. We sign each payload with HMAC-SHA256 in the <code>Qwery-Signature</code> header.</span>
          <div className="row" style={{ border: '1px solid var(--q-border-default)', borderRadius: 12, padding: '4px 4px 4px 12px' }}>
            <input type={show ? 'text' : 'password'} style={{ border: 0, outline: 'none', flex: 1, fontSize: 14 }} placeholder="My secret" value={h.secret || ''} onChange={(e) => setH({ ...h, secret: e.target.value })} aria-label="Secret" />
            <Btn kind="secondary" onClick={() => setShow((s) => !s)}>{show ? 'Hide' : 'Show'}</Btn>
          </div>
        </div>
        <div className="col gap-6">
          <span className="t-label-m">SSL verification</span>
          <span className="t-caption muted">We verify SSL certificates when delivering payloads.</span>
          {[[true, 'On (recommended)'], [false, 'Off']].map(([v, l]) => <button key={l} className="radio-row" onClick={() => setH({ ...h, ssl_verify: v })}><Radio on={h.ssl_verify === v} /><span className="t-body-s">{l}</span></button>)}
        </div>
        <div className="col gap-6"><span className="t-label-m">Triggers</span><Select value={h.triggers} onChange={(v) => setH({ ...h, triggers: v })} options={[{ value: 'completed', label: 'Completed responses' }]} /></div>
        <div className="col gap-6">
          <span className="t-label-m">Delete webhook</span>
          <span className="t-caption muted">If you delete this webhook, we can’t get it back for you after. Qwery submissions won’t get delivered to your endpoint any more.</span>
          {del ? <div className="row gap-6"><Btn kind="danger" onClick={async () => { await db.from('webhooks').delete().eq('id', h.id); onSaved(); onClose(); }}>Yes, delete it</Btn><Btn kind="secondary" onClick={() => setDel(false)}>Keep it</Btn></div>
            : <Btn kind="danger" style={{ alignSelf: 'flex-start', fontSize: 12 }} onClick={() => setDel(true)}>Delete this webhook</Btn>}
        </div>
      </div>
    </Modal>
  );
}

function Deliveries({ hook, onClose }) {
  const log = useAsync(() => db.rpc('webhook_log', { p_webhook: hook.id }), [hook.id]);
  const toast = useToast();
  return (
    <Modal title="Deliveries" onClose={onClose} width={560} footer={<><Btn kind="secondary" icon="rotate" onClick={log.reload}>Refresh</Btn><Btn icon="send" onClick={async () => { await db.rpc('test_webhook', { p_webhook: hook.id }); toast('Test sent', { ok: true }); setTimeout(log.reload, 1500); }}>Send test</Btn></>}>
      <div className="col gap-6" style={{ minHeight: 160 }}>
        <span className="t-caption muted ellipsis">{hook.url}</span>
        {log.loading ? <span className="spin" /> : !(log.data || []).length ? (
          <div className="empty" style={{ padding: 30 }}><span className="ic"><Icon name="send" /></span><p className="t-body-s">No deliveries yet</p><p className="t-caption">They’ll show up here when someone submits your form.</p></div>
        ) : log.data.map((d) => (
          <details key={d.id} style={{ borderBottom: '1px solid var(--q-border-default)', padding: '6px 0' }}>
            <summary className="row gap-8 t-body-s" style={{ cursor: 'pointer' }}>
              <span className={cx('badge', d.status >= 200 && d.status < 300 ? 'success' : d.status ? 'danger' : 'neutral')}>{d.status || (d.error ? 'Error' : 'Pending')}</span>
              <span className="grow">{d.payload?.event_id === 'test' ? 'Test delivery' : 'Form response'}</span><span className="t-caption muted">{timeAgo(d.created_at)}</span>
            </summary>
            {d.error && <p className="err" style={{ fontSize: 12 }}>{d.error}</p>}
            <pre className="code-box" style={{ marginTop: 6, maxHeight: 200, overflow: 'auto' }}>{JSON.stringify(d.payload, null, 2)}</pre>
          </details>
        ))}
      </div>
    </Modal>
  );
}

function Webhooks() {
  const { form, canEdit } = useForm();
  const toast = useToast();
  const hooks = useAsync(async () => (await db.from('webhooks').select('*').eq('form_id', form.id).order('created_at')).data || [], [form.id]);
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState(null);
  const [logs, setLogs] = useState(null);
  const valid = /^https?:\/\/[^\s]+\.[^\s]+/.test(url);
  const empty = !(hooks.data || []).length;
  const header = (
    <div className={empty ? 'col center gap-8' : 'row gap-12'} style={empty ? { textAlign: 'center' } : { alignItems: 'flex-start' }}>
      <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent-100)', color: 'var(--accent-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name="link" size={16} /></span>
      <div className={empty ? 'col center gap-8' : 'col gap-6'}>
        <span className="t-h3" style={{ fontWeight: 400, fontSize: 17 }}>Webhooks</span>
        <p className="t-caption" style={{ maxWidth: 300 }}>Notify external services when someone completes your form. Learn more about webhooks here.</p>
        <Btn onClick={() => setAdding(true)} disabled={!canEdit} style={{ alignSelf: empty ? 'center' : 'flex-start' }}>Add a webhook</Btn>
      </div>
    </div>
  );
  return (
    <div className="col" style={{ flex: 1 }}>
      <div style={{ background: 'var(--q-bg-canvas)', padding: empty ? '80px 20px' : '36px 7vw 60px' }}>{header}</div>
      {!empty && (
        <div className="col gap-8" style={{ padding: '24px 7vw', background: 'var(--ink-100)', flex: 1 }}>
          {hooks.data.map((h) => (
            <div key={h.id} className="row gap-10" style={{ background: '#fff', borderRadius: 12, padding: '10px 14px', maxWidth: 560 }}>
              <Icon name="link" size={14} />
              <span className="grow ellipsis t-body-s">{h.url}</span>
              <span className="t-caption muted">Webhook {h.enabled ? 'ON' : 'OFF'}</span>
              <Toggle on={h.enabled} disabled={!canEdit} label="Enable webhook" onChange={async (v) => { await db.from('webhooks').update({ enabled: v }).eq('id', h.id); hooks.reload(); toast(v ? 'Webhook on — responses will be delivered' : 'Webhook paused'); }} />
              <Btn kind="secondary" onClick={() => setLogs(h)}>View deliveries</Btn>
              {canEdit && <IconBtn icon="more" label="Edit webhook" onClick={() => setEdit(h)} />}
            </div>
          ))}
        </div>
      )}
      {adding && (
        <Modal title="Add a webhook" onClose={() => setAdding(false)} width={432} footer={<><Btn kind="secondary" onClick={() => setAdding(false)}>Cancel</Btn><Btn loading={busy} disabled={!valid} onClick={async () => { setBusy(true); try { await db.from('webhooks').insert({ form_id: form.id, url, enabled: true }); setUrl(''); setAdding(false); hooks.reload(); toast('Webhook added', { ok: true }); } catch (e) { toast(e.message, { error: true }); } setBusy(false); }}>{busy ? 'Saving webhook…' : 'Save webhook'}</Btn></>}>
          <div className="col gap-6"><span className="t-label-m">Endpoint</span><span className="t-caption muted">We’ll send your webhook to this URL</span><input className="field sq" style={{ height: 40, borderRadius: 12 }} placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} autoFocus /></div>
        </Modal>
      )}
      {edit && <EditWebhook hook={edit} onClose={() => setEdit(null)} onSaved={hooks.reload} />}
      {logs && <Deliveries hook={logs} onClose={() => setLogs(null)} />}
    </div>
  );
}

export default function Connect({ sub }) {
  const { form } = useForm();
  const tab = sub === 'webhooks' ? 'webhooks' : 'integrations';
  const go = (t) => navigate(`/forms/${form.id}/connect/${t}`, { replace: true });
  return (
    <div className="col" style={{ flex: 1, minHeight: 0, overflow: 'auto', background: 'var(--q-bg-canvas)' }}>
      <div className="subnav" style={{ background: '#fff', position: 'sticky', top: 0, zIndex: 2 }}>
        <button className={tab === 'integrations' ? 'on' : ''} onClick={() => go('integrations')}>Integrations</button>
        <button className={tab === 'webhooks' ? 'on' : ''} onClick={() => go('webhooks')}>Webhooks</button>
      </div>
      {tab === 'integrations' ? <Integrations goWebhooks={() => go('webhooks')} /> : <Webhooks />}
    </div>
  );
}
