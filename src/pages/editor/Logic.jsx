import { useMemo, useRef, useState } from 'react';
import { Icon } from '../../lib/icons.jsx';
import { blockLabel, CHOICE_TYPES, LETTERS, NO_ANSWER, opsFor, SCALE_TYPES, TYPES } from '../../lib/questions.js';
import { Btn, cx, IconBtn, Modal, QType, Select, Toggle, useToast } from '../../ui.jsx';
import { useForm } from '../FormShell.jsx';

const NODE_W = 168, COL_W = 240, ROW_H = 92;

function targetsOf(content, q, i) {
  const L = content.logic?.[q.id];
  const t = new Set();
  if (L) {
    (L.rules || []).forEach((r) => r.to && t.add(r.to));
    t.add(L.otherwise || content.questions[i + 1]?.id || content.endings[0]?.id);
  } else t.add(content.questions[i + 1]?.id || content.endings[0]?.id);
  return [...t].filter(Boolean);
}

function layoutGraph(content) {
  const ids = [...content.questions.map((q) => q.id), ...content.endings.map((e) => e.id)];
  const depth = Object.fromEntries(ids.map((id) => [id, 0]));
  const edges = [];
  content.questions.forEach((q, i) => targetsOf(content, q, i).forEach((to) => edges.push({ from: q.id, to, branch: !!content.logic?.[q.id] })));
  // longest-path layering (graph is a DAG because backward jumps are invalid)
  for (let pass = 0; pass < ids.length; pass++) {
    let changed = false;
    edges.forEach((e) => { if (depth[e.to] < depth[e.from] + 1) { depth[e.to] = depth[e.from] + 1; changed = true; } });
    if (!changed) break;
  }
  const maxQ = Math.max(0, ...content.questions.map((q) => depth[q.id]));
  content.endings.forEach((e) => { depth[e.id] = Math.max(depth[e.id], maxQ + 1); });
  const cols = {};
  ids.forEach((id) => { (cols[depth[id]] = cols[depth[id]] || []).push(id); });
  const pos = {};
  Object.entries(cols).forEach(([d, list]) => list.forEach((id, k) => { pos[id] = { x: 24 + d * COL_W, y: 40 + (k - (list.length - 1) / 2) * ROW_H }; }));
  return { pos, edges };
}

function NodeLabel({ content, id }) {
  const b = blockLabel(content, id);
  if (!b) return null;
  if (b.kind === 'q') return <><QType type={b.q.type} n={b.n} /><span className="clamp2" style={{ WebkitLineClamp: 3 }}>{b.q.title || TYPES[b.q.type].label}</span></>;
  return <><span className="qtype cat-layout" style={{ gap: 6 }}><Icon name="image" />{b.n}</span><span className="clamp2">{b.e.title || b.e.url}</span></>;
}

function TargetSelect({ content, from, value, onChange, error, placeholder = 'Select…' }) {
  const fromIdx = content.questions.findIndex((q) => q.id === from);
  const opts = [
    ...content.questions.map((q, i) => ({ value: q.id, label: q.title || TYPES[q.type].label, tile: <QType type={q.type} n={i + 1} small />, disabled: i === fromIdx })),
    ...content.endings.map((e, i) => ({ value: e.id, label: e.title || e.url || 'Ending', tile: <span className="qtype cat-layout sm"><Icon name="image" />{LETTERS[i]}</span> })),
  ];
  return <Select value={value} onChange={onChange} options={opts} placeholder={placeholder} error={error} width={360} />;
}

function ValueInput({ q, value, onChange }) {
  if (!q) return <input className="field sm" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  if (CHOICE_TYPES.has(q.type) || q.type === 'conversation_starter') return <Select value={value} onChange={onChange} options={(q.choices || []).map((c, i) => ({ value: c.id, label: c.label || `Choice ${LETTERS[i]}` }))} placeholder="Choose…" />;
  if (SCALE_TYPES.has(q.type)) {
    const from = q.type === 'rating' ? 1 : +(q.settings?.from ?? 0), to = q.type === 'rating' ? +(q.settings?.steps || 5) : +(q.settings?.to ?? 10);
    return <Select value={value} onChange={onChange} options={Array.from({ length: to - from + 1 }, (_, i) => ({ value: String(from + i), label: String(from + i) }))} placeholder="Value" />;
  }
  return <input className="field sm" style={{ height: 34 }} placeholder="Value" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
}

function backwardError(content, from, to) {
  if (!to) return null;
  const fi = content.questions.findIndex((q) => q.id === from);
  const ti = content.questions.findIndex((q) => q.id === to);
  if (ti >= 0 && ti <= fi) return 'You can’t jump back to a skipped question or a different question branch.';
  return null;
}

/* ---------- Branching modal (TF 099–108) ---------- */
function BranchingModal({ focus, onClose }) {
  const { content, update } = useForm();
  const toast = useToast();
  const [logic, setLogic] = useState(() => {
    const l = structuredClone(content.logic || {});
    if (focus && !l[focus]) l[focus] = { rules: [], otherwise: null };
    return l;
  });
  const ids = content.questions.map((q) => q.id).filter((id) => logic[id]);
  const set = (qid, fn) => setLogic((l) => { const n = structuredClone(l); fn(n[qid]); return n; });
  const errors = [];
  ids.forEach((qid) => { const L = logic[qid]; [...(L.rules || []).map((r) => r.to), L.otherwise].forEach((t) => { if (backwardError(content, qid, t)) errors.push(qid); }); });
  const addable = content.questions.filter((q) => !logic[q.id] && !NO_ANSWER.has(q.type) || (!logic[q.id] && NO_ANSWER.has(q.type)));
  return (
    <Modal onClose={onClose} width={500} canvas hideClose title={<h2 className="t-h2" style={{ fontSize: 20 }}>Branching, segmentation and calculations</h2>} bodyStyle={{ padding: 0 }}
      footer={<>
        <button className="row gap-6 t-body-s danger-text" style={{ marginRight: 'auto' }} onClick={() => setLogic({})}><Icon name="trash" size={14} />Delete all rules</button>
        <Btn kind="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={() => { if (errors.length) { toast('Fix the highlighted jumps before saving'); return; } update((c) => { c.logic = logic; }); toast('Logic saved', { ok: true }); onClose(); }}>Save</Btn>
      </>}>
      <div style={{ background: '#fff', borderRadius: 20, margin: '0 10px', padding: 14, maxHeight: '62vh', overflow: 'auto' }} className="col gap-12">
        {!ids.length && <p className="t-body-s muted" style={{ padding: 12 }}>No rules yet. Pick a question below to start branching.</p>}
        {ids.map((qid) => {
          const qi = content.questions.findIndex((q) => q.id === qid);
          const q = content.questions[qi];
          const L = logic[qid];
          return (
            <div key={qid} className="rule-block">
              <div className="hd"><QType type={q.type} n={qi + 1} /><span className="grow">{q.title || TYPES[q.type].label}</span><IconBtn icon="trash" label="Remove logic for this question" onClick={() => setLogic((l) => { const n = { ...l }; delete n[qid]; return n; })} /></div>
              <div className="bd">
                {(L.rules || []).map((r, ri) => (
                  <div key={ri} className="col gap-8" style={{ borderBottom: '1px solid var(--q-border-default)', paddingBottom: 10 }}>
                    {r.conditions.map((c, ci) => {
                      const cq = content.questions.find((x) => x.id === c.q);
                      const ops = opsFor(cq);
                      return (
                        <div key={ci} className="col gap-6">
                          <div className="row gap-8">
                            {ci === 0 ? <span className="chip" style={{ width: 52, justifyContent: 'space-between' }}>If</span> : (
                              <div style={{ width: 70 }}><Select value={r.join || 'and'} onChange={(v) => set(qid, (x) => { x.rules[ri].join = v; })} options={[{ value: 'and', label: 'and' }, { value: 'or', label: 'or' }]} pill /></div>
                            )}
                            <div className="grow"><Select value={c.q} onChange={(v) => set(qid, (x) => { x.rules[ri].conditions[ci] = { q: v, op: opsFor(content.questions.find((y) => y.id === v))[0].v, value: '' }; })}
                              options={content.questions.slice(0, qi + 1).filter((x) => !NO_ANSWER.has(x.type)).map((x) => ({ value: x.id, label: x.title || TYPES[x.type].label, tile: <QType type={x.type} n={content.questions.indexOf(x) + 1} small /> }))} width={340} /></div>
                            {r.conditions.length > 1 && <IconBtn icon="x" label="Remove condition" onClick={() => set(qid, (x) => { x.rules[ri].conditions.splice(ci, 1); })} />}
                          </div>
                          <div className="row gap-8" style={{ paddingLeft: ci === 0 ? 60 : 78 }}>
                            <div style={{ width: 150 }}><Select value={c.op} onChange={(v) => set(qid, (x) => { x.rules[ri].conditions[ci].op = v; })} options={ops.map((o) => ({ value: o.v, label: o.l }))} width={200} /></div>
                            {!['answered', 'not_answered'].includes(c.op) && <div className="grow"><ValueInput q={cq} value={c.value} onChange={(v) => set(qid, (x) => { x.rules[ri].conditions[ci].value = v; })} /></div>}
                          </div>
                        </div>
                      );
                    })}
                    <button className="row gap-6 t-caption" style={{ alignSelf: 'flex-end' }} onClick={() => set(qid, (x) => { x.rules[ri].conditions.push({ q: qid, op: opsFor(q)[0].v, value: '' }); })}><Icon name="plus" size={12} />Add condition</button>
                    <div className="row gap-8"><span style={{ width: 44 }} className="t-caption">Then</span><span className="chip">Go to</span><div className="grow"><TargetSelect content={content} from={qid} value={r.to} onChange={(v) => set(qid, (x) => { x.rules[ri].to = v; })} error={!!backwardError(content, qid, r.to)} /></div></div>
                    {backwardError(content, qid, r.to) && <p className="err" style={{ fontSize: 11, paddingLeft: 100 }}>{backwardError(content, qid, r.to)}</p>}
                    <button className="row gap-6 t-caption danger-text" onClick={() => set(qid, (x) => { x.rules.splice(ri, 1); })}><Icon name="trash" size={12} />Delete rule</button>
                  </div>
                ))}
                <div className="row gap-8">
                  <span className="t-caption" style={{ whiteSpace: 'nowrap' }}>{(L.rules || []).length ? 'All other cases go to' : 'Always go to'}</span>
                  <div className="grow"><TargetSelect content={content} from={qid} value={L.otherwise} onChange={(v) => set(qid, (x) => { x.otherwise = v; })} error={!!backwardError(content, qid, L.otherwise)} placeholder="Next in order" /></div>
                </div>
                {backwardError(content, qid, L.otherwise) && <p className="err" style={{ fontSize: 11 }}>{backwardError(content, qid, L.otherwise)} <a className="u" href="#branching">More about branching.</a></p>}
                {!NO_ANSWER.has(q.type) && <button className="row gap-6 t-caption" onClick={() => set(qid, (x) => { x.rules = [...(x.rules || []), { conditions: [{ q: qid, op: opsFor(q)[0].v, value: '' }], join: 'and', to: null }]; })}><Icon name="plus" size={12} />Add rule</button>}
              </div>
            </div>
          );
        })}
        {addable.length > 0 && (
          <Select value={null} placeholder="+ Add logic for a question" onChange={(v) => setLogic((l) => ({ ...l, [v]: { rules: [], otherwise: null } }))}
            options={addable.map((q) => ({ value: q.id, label: q.title || TYPES[q.type].label, tile: <QType type={q.type} n={content.questions.indexOf(q) + 1} small /> }))} width={400} />
        )}
      </div>
    </Modal>
  );
}

/* ---------- Conversation triggers ---------- */
function ConversationModal({ onClose }) {
  const { content, update } = useForm();
  const [c, setC] = useState(structuredClone(content.conversation));
  const rq = content.questions.find((q) => q.id === c.rule?.q);
  return (
    <Modal title="Conversation triggers" onClose={onClose} width={480} footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={() => { update((x) => { x.conversation = c; }); onClose(); }}>Save</Btn></>}>
      <div className="col gap-14">
        <p className="t-body-s muted">Invite respondents to chat with you from the thank-you screen. Conversations show up in the Conversations tab.</p>
        <div className="row between"><span className="t-body-s">Invite respondents to a conversation</span><Toggle on={!!c.enabled} onChange={(v) => setC({ ...c, enabled: v })} label="Enable conversations" /></div>
        {c.enabled && (
          <>
            <div className="col gap-6">
              {[['ending', 'Everyone who submits'], ['rule', 'Only when an answer matches a rule']].map(([k, l]) => (
                <button key={k} className="radio-row" onClick={() => setC({ ...c, mode: k, rule: k === 'rule' ? c.rule || { q: content.questions.find((q) => !NO_ANSWER.has(q.type))?.id, op: 'answered' } : c.rule })}><span className={cx('radio', c.mode === k && 'on')} style={{ marginTop: 3 }} /><span className="t-body-s">{l}</span></button>
              ))}
            </div>
            {c.mode === 'rule' && (
              <div className="col gap-8" style={{ background: 'var(--q-bg-canvas)', borderRadius: 12, padding: 12 }}>
                <Select value={c.rule?.q} onChange={(v) => setC({ ...c, rule: { q: v, op: opsFor(content.questions.find((q) => q.id === v))[0].v, value: '' } })} options={content.questions.filter((q) => !NO_ANSWER.has(q.type)).map((q) => ({ value: q.id, label: q.title || TYPES[q.type].label, tile: <QType type={q.type} n={content.questions.indexOf(q) + 1} small /> }))} />
                <div className="row gap-8">
                  <div style={{ width: 170 }}><Select value={c.rule?.op} onChange={(v) => setC({ ...c, rule: { ...c.rule, op: v } })} options={opsFor(rq).map((o) => ({ value: o.v, label: o.l }))} /></div>
                  {!['answered', 'not_answered'].includes(c.rule?.op) && <div className="grow"><ValueInput q={rq} value={c.rule?.value} onChange={(v) => setC({ ...c, rule: { ...c.rule, value: v } })} /></div>}
                </div>
              </div>
            )}
            <label className="col gap-6"><span className="t-label-m">Who’s inviting?</span><input className="field" placeholder="e.g. Ada from Lovelace Labs" value={c.sender || ''} onChange={(e) => setC({ ...c, sender: e.target.value })} /></label>
            <label className="col gap-6"><span className="t-label-m">Invitation message</span><textarea className="textarea" value={c.prompt || ''} onChange={(e) => setC({ ...c, prompt: e.target.value })} /></label>
          </>
        )}
      </div>
    </Modal>
  );
}

/* ---------- Quiz & scoring ---------- */
function ScoringModal({ onClose }) {
  const { content, update } = useForm();
  const [scoring, setScoring] = useState(structuredClone(content.scoring || {}));
  const [bands, setBands] = useState(structuredClone(content.scoreEndings || []));
  const qs = content.questions.filter((q) => CHOICE_TYPES.has(q.type) && q.type !== 'ranking');
  return (
    <Modal title="Quiz and scoring" onClose={onClose} width={520} footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={() => { update((c) => { c.scoring = scoring; c.scoreEndings = bands; if (!c.variables.some((v) => v.name === 'score')) c.variables.push({ name: 'score', type: 'number', value: '0' }); }); onClose(); }}>Save</Btn></>}>
      <div className="col gap-14" style={{ maxHeight: '60vh', overflow: 'auto' }}>
        <p className="t-body-s muted">Give points to answers. Respondents’ totals are stored in <span className="badge accent">@score</span> — recall it with {'{{var:score}}'} and route people to different endings.</p>
        {!qs.length && <p className="t-body-s">Add a multiple choice, picture choice or yes/no question to score answers.</p>}
        {qs.map((q) => (
          <div key={q.id} className="col gap-6">
            <span className="row gap-8 t-body-s"><QType type={q.type} n={content.questions.indexOf(q) + 1} small />{q.title || 'Untitled'}</span>
            {q.choices.map((c) => (
              <div key={c.id} className="row gap-8" style={{ paddingLeft: 12 }}>
                <span className="grow t-body-s">{c.label || 'Untitled'}</span>
                <input type="number" className="field sm" style={{ width: 80 }} value={scoring[q.id]?.[c.id] ?? ''} placeholder="0" onChange={(e) => setScoring((s) => ({ ...s, [q.id]: { ...(s[q.id] || {}), [c.id]: e.target.value } }))} aria-label={`Points for ${c.label}`} />
              </div>
            ))}
          </div>
        ))}
        <div className="divider" />
        <span className="t-label-m">Endings by score</span>
        {bands.map((b, i) => (
          <div key={i} className="row gap-8">
            <span className="t-body-s">Score ≥</span><input type="number" className="field sm" style={{ width: 80 }} value={b.min} onChange={(e) => setBands((x) => x.map((y, k) => (k === i ? { ...y, min: e.target.value } : y)))} />
            <div className="grow"><Select value={b.ending} onChange={(v) => setBands((x) => x.map((y, k) => (k === i ? { ...y, ending: v } : y)))} options={content.endings.map((e, k) => ({ value: e.id, label: `${LETTERS[k]} · ${e.title || e.url}` }))} /></div>
            <IconBtn icon="x" label="Remove" onClick={() => setBands((x) => x.filter((_, k) => k !== i))} />
          </div>
        ))}
        <button className="row gap-6 t-body-s" onClick={() => setBands((x) => [...x, { min: '0', ending: content.endings[0]?.id }])}><Icon name="plus" size={14} />Add score band</button>
      </div>
    </Modal>
  );
}

/* ---------- Hidden fields (TF 110–112) ---------- */
function HiddenFieldsModal({ onClose }) {
  const { content, update } = useForm();
  const [fields, setFields] = useState([...(content.hidden_fields || [])]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const add = (n) => { const k = n.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'); if (k && !fields.includes(k)) setFields([...fields, k]); setName(''); setAdding(false); };
  return (
    <Modal title="Hidden fields" onClose={onClose} width={432} footer={<><Btn kind="ghost" onClick={onClose}>Cancel</Btn><Btn onClick={() => { update((c) => { c.hidden_fields = fields; }); onClose(); }}>Save</Btn></>}>
      <div className="col gap-12">
        {fields.length > 0 && <div className="row gap-6 wrap">{fields.map((f) => <span key={f} className="chip grey"><Icon name="eye" />{f}<button aria-label={`Remove ${f}`} onClick={() => setFields(fields.filter((x) => x !== f))}><Icon name="x" /></button></span>)}</div>}
        {adding ? (
          <div className="row gap-6"><input className="field sm" autoFocus placeholder="field_name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add(name)} /><Btn onClick={() => add(name)}>Add</Btn></div>
        ) : <Btn kind="secondary" icon="plus" style={{ alignSelf: 'flex-start' }} onClick={() => setAdding(true)}>Add new field</Btn>}
        <span className="t-caption muted">Suggested hidden fields</span>
        <div className="row gap-6 wrap">{['email', 'name', 'utm_source', 'utm_campaign', 'user_id'].filter((x) => !fields.includes(x)).map((s) => <button key={s} className="chip grey" onClick={() => add(s)}><Icon name="eye" />{s}<Icon name="plus" /></button>)}</div>
        <div className="divider" />
        <span className="t-label-s">Learn how to use hidden fields</span>
        <div className="row gap-8">
          {[['What are hidden fields?', 'linear-gradient(135deg,#f3c08a,#eba35b)', 'Hidden fields carry data you already have — like a user ID — into each response, without asking.'], ['Populate hidden fields with a CRM', 'linear-gradient(135deg,#f3f1ec,#e3ded2)', 'Add #field=value to your share link, or map fields from your email tool’s merge tags.'], ['How to use hidden fields', 'linear-gradient(135deg,#f5d860,#efc93a)', 'Recall them in questions with {{hidden:field}}, filter results, or branch with logic.']].map(([t, bg, d]) => (
            <div key={t} title={d} style={{ flex: 1, height: 88, borderRadius: 10, background: bg, padding: 10, display: 'flex', alignItems: 'flex-end', fontSize: 12 }}>{t}</div>
          ))}
        </div>
        {fields.length > 0 && <p className="t-caption muted">Your link will look like: <code>…/to/{'{slug}'}#{fields.map((f) => `${f}=xxxxx`).join('&')}</code></p>}
      </div>
    </Modal>
  );
}

/* ---------- Variables (TF 113–118) ---------- */
function VariablesModal({ onClose }) {
  const { content, update } = useForm();
  const base = [{ name: 'score', type: 'number', hint: 'For lead scores, quiz results, or anything else you want to score' }, { name: 'price', type: 'number', hint: 'Requires a Payment question' }, { name: 'segment', type: 'text' }];
  const [vars, setVars] = useState(() => {
    const v = structuredClone(content.variables || []);
    base.forEach((b) => { if (!v.some((x) => x.name === b.name)) v.push({ name: b.name, type: b.type, value: '', default: true }); });
    return v;
  });
  const set = (i, k, val) => setVars((v) => v.map((x, j) => (j === i ? { ...x, [k]: val } : x)));
  const row = (v, i) => (
    <div key={i} className="col gap-6" style={{ background: '#fff', borderRadius: 10, padding: '10px 12px' }}>
      <div className="row gap-8">
        {v.default ? <span className="badge accent" style={{ border: '1px solid var(--accent-300)' }}>@{v.name}</span> : <input className="field sm" style={{ width: 120 }} value={v.name} onChange={(e) => set(i, 'name', e.target.value.replace(/[^a-z0-9_]/gi, '_'))} aria-label="Variable name" />}
        <span>=</span>
        <div style={{ width: 92 }}><Select value={v.type} onChange={(t) => set(i, 'type', t)} options={[{ value: 'number', label: 'Number' }, { value: 'text', label: 'Text' }]} /></div>
        <input className="field sm sq grow" placeholder="Enter the starting value" value={v.value} onChange={(e) => set(i, 'value', e.target.value)} type={v.type === 'number' ? 'number' : 'text'} />
        {!v.default && <IconBtn icon="x" label="Remove variable" onClick={() => setVars((x) => x.filter((_, j) => j !== i))} />}
      </div>
      {base.find((b) => b.name === v.name)?.hint && <span className="t-caption muted" style={{ fontSize: 10 }}>{base.find((b) => b.name === v.name).hint}</span>}
    </div>
  );
  return (
    <Modal onClose={onClose} width={500} canvas hideClose title={<div className="col"><h2 className="t-h3" style={{ fontSize: 17, fontWeight: 400 }}>Variables</h2><span className="t-caption muted">Enable more complex calculations</span></div>}
      footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={() => { update((c) => { c.variables = vars.filter((v) => v.value !== '' || !v.default).map(({ default: _d, ...x }) => x); }); onClose(); }}>Save</Btn></>}>
      <div className="col gap-8">
        <span className="t-label-s">Default variables</span>
        {vars.map((v, i) => v.default && row(v, i))}
        <span className="t-label-s" style={{ marginTop: 10 }}>Custom variables</span>
        {vars.map((v, i) => !v.default && row(v, i))}
        <button className="t-caption u accent-text" style={{ alignSelf: 'flex-start' }} onClick={() => setVars((v) => [...v, { name: `variable_${v.filter((x) => !x.default).length}`, type: 'text', value: '' }])}>+ Add custom variable</button>
      </div>
    </Modal>
  );
}

/* ---------- Page ---------- */
export default function Logic() {
  const { content } = useForm();
  const [modal, setModal] = useState(null);
  const [side, setSide] = useState('main');
  const [pan, setPan] = useState({ x: 40, y: 220 });
  const [zoom, setZoom] = useState(1);
  const drag = useRef(null);
  const { pos, edges } = useMemo(() => layoutGraph(content), [content]);
  const hasBranch = Object.keys(content.logic || {}).length > 0;
  const nodes = [...content.questions.map((q) => q.id), ...content.endings.map((e) => e.id)];
  const fit = () => { setPan({ x: 40, y: 220 }); setZoom(1); };
  const cards = side === 'main' ? [
    { k: 'conv', ic: 'message', t: 'Conversation triggers', d: 'Invite respondents to chat when an answer matches a rule', set: content.conversation?.enabled },
    { k: 'branch', ic: 'branch', t: 'Branching, segmentation and calculations', d: 'Create rules to branch flows or calculate prices', set: hasBranch, setText: 'Customize the flow, segment respondents and calculate prices' },
    { k: 'quiz', ic: 'list', t: 'Quiz and scoring', d: 'Assign points or endings based on answers', set: Object.keys(content.scoring || {}).length > 0 },
    { k: 'personal', ic: 'hash', t: 'Personalize with data', d: 'Bring in external data and create variables', set: (content.hidden_fields || []).length > 0 || (content.variables || []).length > 0 },
  ] : [
    { k: 'hidden', t: 'Hidden Fields', d: 'Bring external data to your form', set: (content.hidden_fields || []).length > 0 },
    { k: 'vars', t: 'Variables', d: 'Enable more complex calculations', set: (content.variables || []).length > 0 },
  ];
  return (
    <div className="logic-wrap">
      <aside className="logic-side">
        {side !== 'main' && <button className="row gap-8 t-body-s" style={{ padding: '4px 6px 8px' }} onClick={() => setSide('main')}><Icon name="chevron-left" size={14} />Personalize with data</button>}
        {cards.map((c) => (
          <button key={c.k} className="logic-card" onClick={() => (c.k === 'personal' ? setSide('personal') : setModal(c.k))}>
            {c.ic && <Icon name={c.ic} />}
            <span className="t-label-m" style={{ fontWeight: 500 }}>{c.t}</span>
            {c.set ? <span className="row gap-6 t-caption muted"><Icon name="check" size={12} />{c.setText || 'Logic set'}</span> : <span className="t-caption muted">{c.d}</span>}
          </button>
        ))}
      </aside>
      <div className={cx('logic-map', drag.current && 'panning')} role="img" aria-label="Logic map"
        onMouseDown={(e) => { if (e.target.closest('.lnode')) return; drag.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; }}
        onMouseMove={(e) => { if (drag.current) setPan({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }); }}
        onMouseUp={() => { drag.current = null; }} onMouseLeave={() => { drag.current = null; }}
        onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom((z) => Math.min(1.6, Math.max(0.4, z - e.deltaY * 0.002))); } else setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY })); }}>
        {!content.questions.length ? <div className="empty" style={{ marginTop: 120 }}><span className="ic"><Icon name="logic" /></span><p>Add questions in the Create tab to build logic.</p></div> : (
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>
            <svg style={{ position: 'absolute', overflow: 'visible', left: 0, top: 0 }} width="1" height="1">
              <defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="#191919" strokeWidth="1.2" /></marker></defs>
              {edges.map((e, i) => {
                const a = pos[e.from], b = pos[e.to];
                if (!a || !b) return null;
                const x1 = a.x + NODE_W + 10, y1 = a.y + 20, x2 = b.x - 4, y2 = b.y + 20;
                const mx = (x1 + x2) / 2;
                return <path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke="#191919" strokeWidth="1" markerEnd="url(#arr)" />;
              })}
            </svg>
            {nodes.map((id) => {
              const p = pos[id];
              const isQ = content.questions.some((q) => q.id === id);
              return (
                <div key={id} className="lnode" style={{ left: p.x, top: p.y }} onClick={() => isQ && setModal({ branch: id })} role={isQ ? 'button' : undefined} tabIndex={isQ ? 0 : -1}>
                  <NodeLabel content={content} id={id} />
                  {isQ && <span className="plus" style={{ top: 12 }}><Icon name="plus" /></span>}
                  {isQ && content.logic?.[id] && <span style={{ position: 'absolute', right: -26, top: 12 }}><Icon name="branch" size={14} /></span>}
                </div>
              );
            })}
          </div>
        )}
        <div className="map-tools">
          <IconBtn icon="search" label="Zoom to fit" onClick={fit} />
          <IconBtn icon="plus" label="Zoom in" onClick={() => setZoom((z) => Math.min(1.6, z + 0.1))} />
          <IconBtn icon="minus" label="Zoom out" onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))} />
          <IconBtn icon="grid" label="Reset view" onClick={fit} />
        </div>
        {!hasBranch && content.questions.length > 1 && (
          <div className="row gap-8 t-body-s" style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', background: '#fff', borderRadius: 999, padding: '6px 14px', boxShadow: 'var(--elev-1)' }}>
            <Icon name="logic" size={16} />Click a question to add branching. Drag to move around, pinch or ⌘ + scroll to zoom.
          </div>
        )}
      </div>
      {(modal === 'branch' || modal?.branch) && <BranchingModal focus={modal?.branch} onClose={() => setModal(null)} />}
      {modal === 'conv' && <ConversationModal onClose={() => setModal(null)} />}
      {modal === 'quiz' && <ScoringModal onClose={() => setModal(null)} />}
      {modal === 'hidden' && <HiddenFieldsModal onClose={() => setModal(null)} />}
      {modal === 'vars' && <VariablesModal onClose={() => setModal(null)} />}
    </div>
  );
}
