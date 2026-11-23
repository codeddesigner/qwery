import { useEffect, useMemo, useRef, useState } from 'react';
import { ai } from '../../components/FormRunner.jsx';
import { Icon } from '../../lib/icons.jsx';
import { answerText, CHOICE_TYPES, CONTACT_FIELDS, LETTERS, NO_ANSWER, SCALE_TYPES, TYPES } from '../../lib/questions.js';
import { navigate } from '../../lib/router.js';
import { db } from '../../lib/sb.js';
import { planAtLeast, useApp } from '../../lib/store.jsx';
import { Btn, Check, copy, cx, fmtTime, hoursAgo, IconBtn, Menu, MenuButton, Modal, Popover, QType, Radio, Select, Toggle, useAsync, useToast } from '../../ui.jsx';
import { useForm } from '../FormShell.jsx';

const DAY = 86400000;
const RANGES = [['today', 'Today'], ['week', 'Last week'], ['30', 'Last 30 days'], ['month', 'Last month'], ['year', 'Last year'], ['all', 'All time']];
function rangeBounds(r, custom) {
  const now = new Date(); const end = new Date(now);
  const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (r === 'custom' && custom) return [new Date(custom[0]), new Date(new Date(custom[1]).getTime() + DAY - 1)];
  if (r === 'today') return [sod, end];
  if (r === 'week') return [new Date(sod - 6 * DAY), end];
  if (r === 'month') return [new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()), end];
  if (r === 'year') return [new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()), end];
  if (r === 'all') return [new Date(2000, 0, 1), end];
  return [new Date(sod - 29 * DAY), end];
}
const inRange = (iso, [a, b]) => { const t = new Date(iso); return t >= a && t <= b; };

export function useResults(formId) {
  return useAsync(async () => {
    const [r, v, c] = await Promise.all([
      db.from('responses').select('*').eq('form_id', formId).order('created_at', { ascending: false }).limit(5000),
      db.from('visits').select('id,device,source,started,last_question,completed,created_at').eq('form_id', formId).order('created_at', { ascending: false }).limit(20000),
      db.from('conversations').select('id,response_id,status,unread_by_creator,created_at,last_message_at,respondent_label,messages(count)').eq('form_id', formId),
    ]);
    return { responses: r.data || [], visits: v.data || [], convs: c.data || [] };
  }, [formId]);
}

/* ---------------- tiny SVG charts ---------------- */
function Spark({ data, color = '#191919' }) {
  const w = 60, h = 26, max = Math.max(1, ...data);
  const pts = data.map((d, i) => `${(i / Math.max(1, data.length - 1)) * w},${h - (d / max) * (h - 2) - 1}`).join(' ');
  return <svg width={w} height={h} aria-hidden="true"><polyline points={`0,${h} ${pts} ${w},${h}`} fill={color === '#191919' ? 'rgba(25,25,25,.08)' : 'rgba(77,77,225,.1)'} stroke="none" /><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" /></svg>;
}

function LineChart({ days, series }) {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const W = 560, H = 160, pad = 26;
  const max = Math.max(4, ...series.flatMap((s) => s.data));
  const nice = Math.ceil(max / 4) * 4;
  const x = (i) => pad + (i / Math.max(1, days.length - 1)) * (W - pad - 6);
  const y = (v) => H - 18 - (v / nice) * (H - 30);
  const ticks = [0, 1, 2, 3, 4].map((i) => (nice / 4) * i);
  const labelIdx = days.length <= 7 ? days.map((_, i) => i) : [0, Math.round(days.length / 4), Math.round(days.length / 2), Math.round((3 * days.length) / 4), days.length - 1];
  return (
    <div style={{ position: 'relative' }}>
      <svg ref={ref} viewBox={`0 0 ${W} ${H + 12}`} style={{ width: '100%', height: 'auto' }} onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => { const r = ref.current.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; const i = Math.round(((px - pad) / (W - pad - 6)) * (days.length - 1)); setHover(Math.max(0, Math.min(days.length - 1, i))); }}
        role="img" aria-label="Responses over time">
        {ticks.map((t) => <g key={t}><line x1={pad} x2={W} y1={y(t)} y2={y(t)} stroke="var(--ink-100)" /><text x={pad - 6} y={y(t) + 3} textAnchor="end" fontSize="8" fill="var(--ink-500)">{Math.round(t)}</text></g>)}
        {series.map((s) => (
          <g key={s.name}>
            {s.fill && <polygon points={`${x(0)},${y(0)} ${s.data.map((d, i) => `${x(i)},${y(d)}`).join(' ')} ${x(days.length - 1)},${y(0)}`} fill="rgba(25,25,25,.05)" />}
            <polyline points={s.data.map((d, i) => `${x(i)},${y(d)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="1.5" strokeDasharray={s.dash ? '4 3' : undefined} />
          </g>
        ))}
        {labelIdx.map((i) => <text key={i} x={x(i)} y={H + 8} fontSize="8" textAnchor="middle" fill="var(--ink-500)">{days[i]?.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</text>)}
        {hover != null && <g><line x1={x(hover)} x2={x(hover)} y1={8} y2={H - 18} stroke="var(--ink-400)" strokeDasharray="2 2" />{series.map((s) => <circle key={s.name} cx={x(hover)} cy={y(s.data[hover])} r="3" fill="#fff" stroke={s.color} strokeWidth="1.5" />)}</g>}
      </svg>
      {hover != null && (
        <div style={{ position: 'absolute', left: `${(x(hover) / W) * 100}%`, top: 10, transform: `translateX(${hover > days.length / 2 ? '-110%' : '10%'})`, background: 'var(--ink-950)', color: '#fff', borderRadius: 8, padding: '8px 10px', fontSize: 11, pointerEvents: 'none', minWidth: 120 }}>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{days[hover].toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}</div>
          {series.map((s) => <div key={s.name} className="row between gap-12"><span className="row gap-6"><span style={{ width: 7, height: 7, borderRadius: 2, background: s.color === '#191919' ? '#fff' : s.color }} />{s.name}</span><b>{s.data[hover]}</b></div>)}
        </div>
      )}
    </div>
  );
}

function Donut({ parts }) {
  const total = parts.reduce((a, p) => a + p.v, 0) || 1;
  let acc = 0;
  const R = 34, C = 2 * Math.PI * R;
  const top = [...parts].sort((a, b) => b.v - a.v)[0];
  return (
    <div className="row gap-20">
      <svg width="100" height="100" viewBox="0 0 100 100" role="img" aria-label="Devices">
        {parts.map((p) => { const len = (p.v / total) * C; const el = <circle key={p.k} cx="50" cy="50" r={R} fill="none" stroke={p.c} strokeWidth="14" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform="rotate(-90 50 50)" />; acc += len; return el; })}
        <text x="50" y="50" textAnchor="middle" fontSize="16">{Math.round(((top?.v || 0) / total) * 100)}%</text>
        <text x="50" y="62" textAnchor="middle" fontSize="7" fill="var(--ink-500)">{top?.k?.toLowerCase()}</text>
      </svg>
      <div className="col gap-6">{parts.map((p) => <div key={p.k} className="col"><span className="row gap-6 t-caption"><span style={{ width: 8, height: 8, borderRadius: 2, background: p.c }} />{p.k}</span><span className="t-body-m" style={{ fontWeight: 500 }}>{Math.round((p.v / total) * 100)}%</span></div>)}</div>
    </div>
  );
}

function DatePicker({ value, custom, onChange }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [sel, setSel] = useState(custom || []);
  const label = value === 'custom' && custom ? `${new Date(custom[0]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(custom[1]).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : RANGES.find((r) => r[0] === value)?.[1];
  const first = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, i) => new Date(month.getFullYear(), month.getMonth(), i - first + 1));
  const iso = (d) => d.toISOString().slice(0, 10);
  void days;
  return (
    <>
      <button ref={ref} className="btn btn-secondary" style={{ borderRadius: 10, height: 34 }} onClick={() => setOpen(true)}><Icon name="calendar-2" />{label}<Icon name="chevron-down" /></button>
      <Popover anchor={ref} open={open} onClose={() => setOpen(false)} width={316}>
        <div className="row gap-8" style={{ alignItems: 'flex-start' }}>
          <div className="col gap-2" style={{ width: 90 }}>{RANGES.map(([k, l]) => <button key={k} className={cx('menu-item', value === k && 'hl')} style={{ fontSize: 12, padding: '6px 8px' }} onClick={() => { onChange(k); setOpen(false); }}>{l}</button>)}</div>
          <div className="col gap-6 grow">
            <div className="row between t-caption"><IconBtn icon="chevron-left" label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} />{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}<IconBtn icon="chevron-right" label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, fontSize: 10, textAlign: 'center' }}>
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => <span key={d} className="muted">{d}</span>)}
              {cells.map((d) => {
                const k = iso(d); const inM = d.getMonth() === month.getMonth();
                const on = sel.includes(k) || (sel.length === 2 && k > sel[0] && k < sel[1]);
                return <button key={k} onClick={() => setSel(sel.length === 1 ? [sel[0], k].sort() : [k])} style={{ padding: '4px 0', borderRadius: 4, background: on ? 'var(--ink-950)' : undefined, color: on ? '#fff' : inM ? undefined : 'var(--ink-300)' }}>{d.getDate()}</button>;
              })}
            </div>
            <div className="row gap-6" style={{ justifyContent: 'flex-end' }}><Btn kind="secondary" onClick={() => setOpen(false)}>Cancel</Btn><Btn disabled={sel.length !== 2} onClick={() => { onChange('custom', sel); setOpen(false); }}>Apply</Btn></div>
          </div>
        </div>
      </Popover>
    </>
  );
}

/* ---------------- Insights ---------------- */
function Insights({ data }) {
  const { form, content } = useForm();
  const app = useApp();
  const toast = useToast();
  const [range, setRange] = useState('30');
  const [custom, setCustom] = useState(null);
  const [devF, setDevF] = useState('all');
  const [compare, setCompare] = useState(true);
  const [insight, setInsight] = useState(null);
  const [asking, setAsking] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const b = rangeBounds(range, custom);
  const span = b[1] - b[0];
  const prevB = [new Date(b[0] - span), new Date(b[0].getTime() - 1)];
  const dev = (x) => devF === 'all' || x.device === devF;
  const V = data.visits.filter(dev), R = data.responses.filter(dev);
  const cur = { v: V.filter((x) => inRange(x.created_at, b)), s: V.filter((x) => x.started && inRange(x.created_at, b)), r: R.filter((x) => inRange(x.created_at, b)) };
  const prev = { v: V.filter((x) => inRange(x.created_at, prevB)), s: V.filter((x) => x.started && inRange(x.created_at, prevB)), r: R.filter((x) => inRange(x.created_at, prevB)) };
  const respIds = new Set(cur.r.map((r) => r.id));
  const convCur = data.convs.filter((c) => inRange(c.created_at, b) && (devF === 'all' || respIds.has(c.response_id)));
  const convPrev = data.convs.filter((c) => inRange(c.created_at, prevB));
  const ndays = Math.min(366, Math.max(1, Math.ceil(span / DAY)));
  const dayList = Array.from({ length: ndays }, (_, i) => new Date(b[1].getFullYear(), b[1].getMonth(), b[1].getDate() - (ndays - 1 - i)));
  const perDay = (list) => dayList.map((d) => list.filter((x) => new Date(x.created_at).toDateString() === d.toDateString()).length);
  const pct = (a, p) => (p ? Math.round(((a - p) / p) * 100) : a ? 100 : 0);
  const rate = (r, s) => (s ? (r / s) * 100 : 0);
  const stats = [
    ['eye', 'Views', cur.v.length, prev.v.length, perDay(cur.v)],
    ['play', 'Starts', cur.s.length, prev.s.length, perDay(cur.s)],
    ['check', 'Submissions', cur.r.length, prev.r.length, perDay(cur.r)],
    ['chart', 'Completion rate', rate(cur.r.length, cur.s.length), rate(prev.r.length, prev.s.length), perDay(cur.r), true],
    ['message', 'Conversations', convCur.length, convPrev.length, perDay(convCur), false, true],
  ];
  const answerable = content.questions.filter((q) => !NO_ANSWER.has(q.type));
  const starters = cur.s.length || 1;
  const drop = answerable.map((q, i) => {
    const qi = content.questions.indexOf(q);
    const reached = cur.s.filter((v) => v.completed || v.last_question >= qi).length;
    return { q, i, p: Math.round((reached / starters) * 100) };
  });
  let worst = -1, worstDrop = 0;
  drop.forEach((d, i) => { if (i > 0 && drop[i - 1].p - d.p > worstDrop) { worstDrop = drop[i - 1].p - d.p; worst = i; } });
  const devCounts = ['desktop', 'mobile', 'tablet'].map((k, i) => ({ k: k[0].toUpperCase() + k.slice(1), v: cur.v.filter((x) => x.device === k).length, c: ['#191919', '#a5a5a5', '#e3e3e3'][i] }));
  const srcMap = {}; cur.v.forEach((x) => { const s = x.source || 'Direct link'; srcMap[s] = (srcMap[s] || 0) + 1; });
  const sources = Object.entries(srcMap).sort((a, c) => c[1] - a[1]).slice(0, 5);
  const heat = Array.from({ length: 7 }, () => Array(6).fill(0));
  cur.r.forEach((r) => { const d = new Date(r.created_at); heat[(d.getDay() + 6) % 7][Math.min(5, Math.floor(d.getHours() / 4))]++; });
  const hmax = Math.max(1, ...heat.flat());
  const pro = planAtLeast(app.org.plan, 'business');

  const exportCsv = () => {
    const rows = [['Metric', 'Value'], ...stats.map((s) => [s[1], s[5] ? s[2].toFixed(1) + '%' : s[2]]), [], ['Question', 'Reached %'], ...drop.map((d) => [d.q.title, d.p])];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${form.title} insights.csv`; a.click();
  };
  const ask = async (q) => {
    setAsking(true);
    try {
      const sample = cur.r.slice(0, 60).map((r) => Object.fromEntries(answerable.map((x) => [x.title, answerText(x, r.answers[x.id])])));
      const d = await ai('insight', { title: form.title, question: q, stats: Object.fromEntries(stats.map((s) => [s[1], s[5] ? s[2].toFixed(1) + '%' : s[2]])), dropoff: drop.map((d) => ({ question: d.q.title, reached: d.p + '%' })), devices: devCounts, sample });
      setInsight(d.text);
    } catch (e) { toast(e.message, { error: true }); } finally { setAsking(false); }
  };
  useEffect(() => { if (cur.r.length >= 3 && !insight) ask(); }, []); // eslint-disable-line

  return (
    <div className="col gap-16" style={{ padding: '14px 28px 40px' }}>
      <div className="row gap-10 wrap">
        <DatePicker value={range} custom={custom} onChange={(r, c) => { setRange(r); if (c) setCustom(c); }} />
        <div style={{ width: 150 }}><Select value={devF} onChange={setDevF} options={[{ value: 'all', label: 'All devices', icon: 'monitor' }, { value: 'desktop', label: 'Desktop', icon: 'monitor' }, { value: 'mobile', label: 'Mobile', icon: 'phone' }, { value: 'tablet', label: 'Tablet', icon: 'phone' }]} /></div>
        <span className="row gap-8 t-body-s"><Toggle accent on={compare} onChange={setCompare} label="Compare to previous period" />Compare to previous {range === 'all' ? 'period' : `${ndays} days`}</span>
        <span className="grow" />
        <Btn kind="secondary" icon="link" onClick={() => navigate(`/forms/${form.id}/report`)}>Share report</Btn>
        <Btn icon="download" onClick={exportCsv}>Export</Btn>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        {stats.map(([ic, l, v, p, series, isPct, conv]) => {
          const d = isPct ? +(v - p).toFixed(1) : pct(v, p);
          return (
            <div key={l} className="stat">
              <span className="row gap-6 t-body-s"><span style={{ color: conv ? 'var(--accent-500)' : undefined }}><Icon name={ic} size={16} /></span>{l}</span>
              <div className="row between" style={{ alignItems: 'flex-end' }}><span className="big">{isPct ? `${v.toFixed(1)}%` : v.toLocaleString()}</span><Spark data={series} color={conv ? '#4d4de1' : '#191919'} /></div>
              {compare && <span className="row gap-6 t-caption muted"><span className={cx('delta', d < 0 && 'down')} style={conv ? { background: 'var(--accent-100)', color: 'var(--accent-600)' } : undefined}>{d >= 0 ? '↑' : '↓'} {Math.abs(d)}{isPct ? '' : '%'}</span>vs previous {range === 'all' ? 'period' : `${ndays} days`}</span>}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.65fr) minmax(0, 1fr)', gap: 12 }} className="ins-grid">
        <div className="stat" style={{ gap: 4 }}>
          <div className="row between wrap"><span className="t-body-m">Responses over time</span><span className="row gap-12 t-caption">{[['#191919', 'Submissions'], ['#a5a5a5', 'Starts'], ['#4d4de1', 'Conversations']].map(([c, l]) => <span key={l} className="row gap-4"><span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}</span>)}</span></div>
          <span className="t-caption muted">Daily, {RANGES.find((r) => r[0] === range)?.[1]?.toLowerCase() || 'custom range'}</span>
          <LineChart days={dayList} series={[{ name: 'Submissions', color: '#191919', data: perDay(cur.r), fill: true }, { name: 'Starts', color: '#a5a5a5', dash: true, data: perDay(cur.s) }, { name: 'Conversations', color: '#4d4de1', data: perDay(convCur) }]} />
        </div>
        <div className="stat">
          <span className="t-body-m">Where people drop off</span>
          <span className="t-caption muted">Share of starters who reached each question</span>
          <div className="col gap-8" style={{ marginTop: 8 }}>
            {!drop.length && <span className="t-caption muted">Add questions to see drop-off.</span>}
            {drop.map((d, i) => (
              <div key={d.q.id} className="row gap-10" style={{ alignItems: 'flex-start' }}>
                <span className="t-caption" style={{ width: 10, color: i === worst ? 'var(--red-500)' : undefined }}>{i + 1}</span>
                <div className="col gap-4 grow">
                  <span className="row gap-6 t-body-s" style={{ fontSize: 13 }}><span className="ellipsis">{d.q.title || 'Untitled'}</span>{i === worst && worstDrop >= 5 && <span className="badge danger" style={{ fontSize: 10 }}>−{worstDrop}% biggest drop</span>}</span>
                  <div className="bar-track"><div style={{ width: `${d.p}%`, background: i === worst && worstDrop >= 5 ? 'var(--red-500)' : undefined }} /></div>
                </div>
                <span className="t-caption" style={{ width: 34, textAlign: 'right', color: i === worst && worstDrop >= 5 ? 'var(--red-500)' : undefined }}>{d.p}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
        <div className="stat"><span className="t-body-m" style={{ marginBottom: 6 }}>Devices</span>{cur.v.length ? <Donut parts={devCounts} /> : <span className="t-caption muted">No visits yet</span>}</div>
        <div className="stat"><span className="t-body-m" style={{ marginBottom: 6 }}>Top sources</span>
          {sources.length ? sources.map(([s, n]) => <div key={s} className="col gap-4"><span className="row between t-body-s" style={{ fontSize: 13 }}><span className="ellipsis">{s}</span><span className="t-caption">{Math.round((n / cur.v.length) * 100)}%</span></span><div className="bar-track" style={{ height: 3 }}><div style={{ width: `${(n / cur.v.length) * 100}%`, background: n === sources[0][1] ? 'var(--ink-950)' : 'var(--ink-300)' }} /></div></div>) : <span className="t-caption muted">No visits yet</span>}
        </div>
        <div className="stat"><span className="t-body-m" style={{ marginBottom: 6 }}>Busiest times</span>
          <div className="heat">
            {heat.map((row, i) => [<span key={'l' + i} className="t-caption muted" style={{ fontSize: 9 }}>{'MTWTFSS'[i]}</span>, ...row.map((v, j) => <span key={i + '-' + j} className="c" title={`${v} responses`} style={{ background: `rgba(25,25,25,${0.08 + (v / hmax) * 0.82})` }} />)])}
            <span />{['12a', '4a', '8a', '12p', '4p', '8p'].map((t) => <span key={t} className="t-caption muted" style={{ fontSize: 9, textAlign: 'center' }}>{t}</span>)}
          </div>
        </div>
        <div className="stat" style={{ background: 'var(--q-bg-ai)', gap: 10 }}>
          <span className="badge ai" style={{ alignSelf: 'flex-start', background: '#fff' }}><Icon name="sparkle" size={12} />AI insight</span>
          <p className="t-body-l" style={{ fontSize: 17 }}>{asking ? 'Reading your responses…' : insight || (cur.r.length < 3 ? 'Collect a few more responses and I’ll summarise what people are telling you.' : 'Ask a question about your results.')}</p>
          {askOpen ? (
            <div className="row gap-6"><input className="field sm" autoFocus placeholder="e.g. Why do people drop off?" value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && question) { ask(question); setQuestion(''); } }} /><IconBtn icon="send" label="Ask" onClick={() => { if (question) { ask(question); setQuestion(''); } }} /></div>
          ) : <Btn kind="secondary" icon="message" style={{ alignSelf: 'flex-start', borderColor: 'var(--q-border-ai)' }} onClick={() => setAskOpen(true)} disabled={!cur.r.length}>Ask about this data</Btn>}
          {!pro && <span className="t-caption" style={{ color: 'var(--brown-600)' }}>Smart Insights are included on Business. You’re on a preview.</span>}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Summary ---------------- */
function Bars({ q, list }) {
  const counts = {}; let total = 0;
  list.forEach((r) => { const a = r.answers[q.id]; (Array.isArray(a) ? a : a != null ? [a] : []).forEach((x) => { const k = typeof x === 'object' ? 'Other' : x; counts[k] = (counts[k] || 0) + 1; total++; }); });
  const choices = [...(q.choices || []).map((c) => ({ id: c.id, label: c.label || 'Untitled', image: c.image })), ...(counts.Other ? [{ id: 'Other', label: 'Other' }] : [])];
  return (
    <div className="col gap-12" style={{ marginTop: 6 }}>
      {choices.map((c) => { const n = counts[c.id] || 0; const p = total ? Math.round((n / list.length) * 100) : 0; return (
        <div key={c.id} className="row gap-12">
          {q.type === 'picture_choice' && <span style={{ width: 34, height: 34, borderRadius: 4, background: c.image ? `url("${c.image}") center/cover` : 'var(--ink-200)', flex: 'none' }} />}
          <div className="col gap-4 grow"><span className="row between t-body-s"><span>{c.label}</span><span className="t-caption">{n} resp. <b style={{ marginLeft: 8 }}>{p}%</b></span></span><div className="bar-track" style={{ height: 14, borderRadius: 2 }}><div style={{ width: `${p}%`, background: 'var(--accent-600)', borderRadius: 2 }} /></div></div>
        </div>
      ); })}
    </div>
  );
}
function ScaleBars({ q, list }) {
  const from = q.type === 'rating' ? 1 : +(q.settings?.from ?? 0), to = q.type === 'rating' ? +(q.settings?.steps || 5) : +(q.settings?.to ?? 10);
  const vals = list.map((r) => r.answers[q.id]).filter((v) => typeof v === 'number');
  const cells = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return (
    <div className="row gap-6" style={{ alignItems: 'flex-end', marginTop: 8, overflowX: 'auto' }}>
      {cells.map((n) => { const c = vals.filter((v) => v === n).length; const p = vals.length ? Math.round((c / vals.length) * 100) : 0; return (
        <div key={n} className="col center gap-2" style={{ width: 22, flex: 'none' }}>
          <span className="t-caption" style={{ fontSize: 9 }}>{p}%</span><span className="t-caption muted" style={{ fontSize: 7 }}>{c} resp.</span>
          <div style={{ width: 22, height: 76, background: 'var(--ink-100)', display: 'flex', alignItems: 'flex-end' }}><div style={{ width: '100%', height: `${p}%`, background: 'var(--accent-600)' }} /></div>
          <span className="t-caption" style={{ fontSize: 9 }}>{n}</span>
        </div>
      ); })}
    </div>
  );
}
function TextList({ q, list, convByResp, onConv }) {
  const items = list.filter((r) => r.answers[q.id] != null && r.answers[q.id] !== '').slice(0, 20);
  return (
    <div className="col" style={{ padding: '0 20px' }}>
      {items.map((r) => {
        const a = r.answers[q.id];
        const c = convByResp[r.id];
        return (
          <div key={r.id} className="row gap-12" style={{ borderBottom: '1px solid var(--q-border-default)', padding: '12px 0', alignItems: 'flex-start' }}>
            <div className="col gap-4 grow">
              {q.type === 'contact_info' ? CONTACT_FIELDS.filter((f) => a?.[f.key]).map((f) => <span key={f.key} className="t-caption" style={{ fontSize: 11 }}>{f.label}&nbsp;&nbsp;{a[f.key]}</span>) : <span className="t-body-s" style={{ fontSize: 12 }}>{answerText(q, a)}</span>}
              <span className="t-caption tertiary" style={{ fontSize: 9 }}>{hoursAgo(r.created_at)}</span>
            </div>
            {c ? <button className="chip conv" style={{ fontSize: 11 }} onClick={() => onConv(c)}><Icon name="message" />{c.unread_by_creator ? `${c.unread_by_creator} new messages` : `${c.messages?.[0]?.count || 0} messages`}{c.unread_by_creator > 0 && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-500)' }} />}</button>
              : <button className="chip dash" style={{ fontSize: 11 }} onClick={() => onConv(null, r)}><Icon name="plus" />Start conversation</button>}
          </div>
        );
      })}
      {!items.length && <span className="t-caption muted" style={{ padding: '10px 0' }}>No answers yet</span>}
    </div>
  );
}

export async function startCreatorConversation(form, r, content) {
  const contact = content.questions.find((x) => x.type === 'contact_info');
  const emailQ = content.questions.find((x) => x.type === 'email');
  const label = (contact && [r.answers[contact.id]?.first_name, r.answers[contact.id]?.last_name].filter(Boolean).join(' ')) || (emailQ && r.answers[emailQ.id]) || 'Respondent';
  const { data } = await db.from('conversations').insert({ form_id: form.id, response_id: r.id, respondent_label: label, unread_by_creator: 0 }).select('id').single();
  return data.id;
}

function Summary({ data, reload }) {
  const { form, content } = useForm();
  const toast = useToast();
  const [hideApps, setHideApps] = useState(() => localStorage.getItem('qwery.hideApps') === '1');
  const list = data.responses;
  const convByResp = Object.fromEntries(data.convs.map((c) => [c.response_id, c]));
  const onConv = async (c, r) => {
    if (c) { navigate(`/forms/${form.id}/conversations/${c.id}`); return; }
    try { const id = await startCreatorConversation(form, r, content); reload(); navigate(`/forms/${form.id}/conversations/${id}`); } catch (e) { toast(e.message, { error: true }); }
  };
  const qs = content.questions.filter((q) => !NO_ANSWER.has(q.type));
  return (
    <div className="row gap-32 wrap" style={{ padding: '24px 4vw 60px', alignItems: 'flex-start', justifyContent: 'center' }}>
      <div className="col gap-12" style={{ width: '100%', maxWidth: 590 }}>
        <h2 className="t-h3" style={{ fontSize: 20, fontWeight: 400 }}>Response summary</h2>
        {!list.length && <div className="card" style={{ padding: 30 }}><div className="empty" style={{ padding: 10 }}><span className="ic"><Icon name="chart" /></span><p>No responses yet. Share your form to start collecting answers.</p><Btn onClick={() => navigate(`/forms/${form.id}/share`)}>Share your form</Btn></div></div>}
        {list.length > 0 && qs.map((q) => {
          const answered = list.filter((r) => r.answers[q.id] != null && r.answers[q.id] !== '' && !(Array.isArray(r.answers[q.id]) && !r.answers[q.id].length));
          const vals = answered.map((r) => r.answers[q.id]).filter((v) => typeof v === 'number');
          return (
            <div key={q.id} className="card" style={{ padding: '18px 16px 20px' }}>
              <div className="row gap-10"><QType type={q.type} n={content.questions.indexOf(q) + 1} /><span className="t-body-m grow" style={{ fontSize: 15 }}>{q.title || TYPES[q.type].label}</span>{vals.length > 0 && <span className="badge neutral">Avg. {(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)}</span>}</div>
              <p className="t-caption muted" style={{ fontSize: 9, margin: '10px 0 6px' }}>{answered.length} out of {list.length} people answered this question</p>
              {CHOICE_TYPES.has(q.type) && q.type !== 'ranking' ? <Bars q={q} list={answered} /> : SCALE_TYPES.has(q.type) ? <ScaleBars q={q} list={answered} /> : <TextList q={q} list={answered} convByResp={convByResp} onConv={onConv} />}
            </div>
          );
        })}
      </div>
      <div className="col gap-12" style={{ width: 230, paddingTop: 36 }}>
        <Btn size="l" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(`/forms/${form.id}/report`)}>Generate a report</Btn>
        <div style={{ background: 'var(--ink-100)', borderRadius: 14, padding: 12 }} className="t-caption">Share your results with anyone. Your report automatically updates as new answers come in.</div>
        {!hideApps && (
          <div className="card col gap-8" style={{ padding: 14, position: 'relative' }}>
            <IconBtn icon="x" label="Dismiss" style={{ position: 'absolute', right: 6, top: 6, width: 22, height: 22 }} onClick={() => { setHideApps(true); localStorage.setItem('qwery.hideApps', '1'); }} />
            <span className="t-label-s">Connect to your apps</span>
            <span className="t-caption" style={{ fontSize: 10 }}>Send data where you need it, set up notifications, and get pinged when someone starts a conversation.</span>
            <div className="row gap-4">{[['list', 'cat-contact'], ['message', 'cat-choice'], ['chart', 'cat-rating'], ['mail', 'cat-text'], ['link', 'cat-conversation']].map(([i, c]) => <span key={i} className={cx('qtile', c)} style={{ borderRadius: '50%', width: 22, height: 22 }}><Icon name={i} /></span>)}</div>
            <Btn kind="secondary" style={{ alignSelf: 'flex-start' }} onClick={() => navigate(`/forms/${form.id}/connect`)}>Discover more</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Responses table ---------------- */
function toRows(content, list, cols, convByResp) {
  const head = cols.map((c) => c.label);
  const rows = list.map((r) => cols.map((c) => c.value(r, convByResp)));
  return [head, ...rows];
}
function download(name, rows, kind) {
  let blob;
  if (kind === 'csv') blob = new Blob(['﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
  else {
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const xml = `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Responses"><Table>${rows.map((r) => `<Row>${r.map((c) => `<Cell><Data ss:Type="${typeof c === 'number' ? 'Number' : 'String'}">${esc(c)}</Data></Cell>`).join('')}</Row>`).join('')}</Table></Worksheet></Workbook>`;
    blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name}.${kind === 'csv' ? 'csv' : 'xls'}`; a.click();
}

function FilterModal({ filters, onApply, onClose }) {
  const { content } = useForm();
  const [f, setF] = useState(filters.length ? structuredClone(filters) : [{ q: content.questions.find((q) => !NO_ANSWER.has(q.type))?.id, op: 'includes', values: [], text: '' }]);
  const set = (i, patch) => setF((x) => x.map((y, k) => (k === i ? { ...y, ...patch } : y)));
  return (
    <Modal title="Filter responses" onClose={onClose} width={500} footer={<><a className="u t-caption accent-text" href="mailto:feedback@qwery.to" style={{ marginRight: 'auto' }}>Give feedback</a><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={() => { onApply(f.filter((x) => x.q && (x.values.length || x.text || ['answered', 'not_answered'].includes(x.op)))); onClose(); }}>Apply</Btn></>}>
      <div className="col gap-10">
        <span className="t-caption muted">Show me all responses where…</span>
        {f.map((x, i) => {
          const q = content.questions.find((y) => y.id === x.q);
          const choice = q && (CHOICE_TYPES.has(q.type) || q.type === 'conversation_starter');
          return (
            <div key={i} className="col gap-6">
              <div className="row gap-6"><div className="grow"><Select value={x.q} onChange={(v) => set(i, { q: v, values: [], text: '' })} options={content.questions.filter((y) => !NO_ANSWER.has(y.type)).map((y) => ({ value: y.id, label: y.title || TYPES[y.type].label, tile: <QType type={y.type} n={content.questions.indexOf(y) + 1} /> }))} width={380} /></div><IconBtn icon="trash" label="Remove filter" onClick={() => setF(f.filter((_, k) => k !== i))} /></div>
              <div className="row gap-6">
                <div style={{ width: 130 }}><Select value={x.op} onChange={(v) => set(i, { op: v })} pill options={[{ value: 'includes', label: choice ? 'includes' : 'contains' }, { value: 'excludes', label: choice ? 'excludes' : 'doesn’t contain' }, { value: 'answered', label: 'is answered' }, { value: 'not_answered', label: 'is not answered' }]} /></div>
                {!['answered', 'not_answered'].includes(x.op) && (choice ? (
                  <div className="row gap-4 wrap grow" style={{ border: '1px solid var(--q-border-default)', borderRadius: 10, padding: 4, minHeight: 36 }}>
                    {x.values.map((v) => <span key={v} className="chip grey">{q.choices.find((c) => c.id === v)?.label}<button onClick={() => set(i, { values: x.values.filter((y) => y !== v) })} aria-label="Remove"><Icon name="x" /></button></span>)}
                    <select className="grow" style={{ border: 0, outline: 'none', background: 'none', fontSize: 13, minWidth: 80 }} value="" onChange={(e) => e.target.value && set(i, { values: [...x.values, e.target.value] })} aria-label="Add value">
                      <option value="">{x.values.length ? '' : 'Choose…'}</option>{q.choices.filter((c) => !x.values.includes(c.id)).map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                ) : <input className="field sm grow" placeholder="Value" value={x.text} onChange={(e) => set(i, { text: e.target.value })} />)}
              </div>
            </div>
          );
        })}
        <Btn kind="secondary" icon="plus" style={{ alignSelf: 'flex-start' }} onClick={() => setF([...f, { q: content.questions.find((q) => !NO_ANSWER.has(q.type))?.id, op: 'includes', values: [], text: '' }])}>Add filter</Btn>
      </div>
    </Modal>
  );
}

function matches(content, r, f) {
  const q = content.questions.find((y) => y.id === f.q); const a = r.answers[f.q];
  const answered = a != null && a !== '' && !(Array.isArray(a) && !a.length);
  if (f.op === 'answered') return answered;
  if (f.op === 'not_answered') return !answered;
  if (f.values.length) { const arr = Array.isArray(a) ? a : [a]; const hit = f.values.some((v) => arr.includes(v)); return f.op === 'includes' ? hit : !hit; }
  const hit = answerText(q, a).toLowerCase().includes(f.text.toLowerCase());
  return f.op === 'includes' ? hit : !hit;
}

function Detail({ r, idx, total, onNav, onClose, conv, onConv, onDelete }) {
  const { content } = useForm();
  return (
    <div className="card col" style={{ width: 'min(420px, 46%)', flex: 'none', padding: 16, overflow: 'auto' }}>
      <div className="row gap-4">
        <IconBtn icon="chevron-left" label="Previous response" onClick={() => onNav(-1)} disabled={idx === 0} />
        <IconBtn icon="chevron-right" label="Next response" onClick={() => onNav(1)} disabled={idx === total - 1} />
        <span className="t-body-s grow">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} {fmtTime(r.created_at)}</span>
        <MenuButton trigger={<IconBtn icon="more" label="More" />} items={[{ label: 'Copy response ID', onClick: () => copy(r.id) }, { label: 'Delete response', danger: true, onClick: onDelete }]} />
        <IconBtn icon="x" label="Close" onClick={onClose} />
      </div>
      <div className="row gap-10" style={{ background: 'var(--accent-100)', borderRadius: 12, padding: '8px 8px 8px 12px', margin: '12px 0' }}>
        <Icon name="message" size={16} />
        <span className="grow t-caption" style={{ fontSize: 12 }}>{conv ? (conv.unread_by_creator ? `${conv.respondent_label} replied — ${conv.unread_by_creator} new message${conv.unread_by_creator === 1 ? '' : 's'}` : `Conversation with ${conv.respondent_label}`) : 'Follow up on this response'}</span>
        <Btn kind="accent" onClick={onConv}>{conv ? 'Open conversation' : 'Start conversation'}</Btn>
      </div>
      <div className="col gap-14">
        <div className="row gap-10"><Icon name="list" size={16} /><span className="col"><span className="t-caption muted">Tags</span><span className="t-caption">{r.tags?.length ? r.tags.join(', ') : '—'}</span></span></div>
        {content.questions.filter((q) => !NO_ANSWER.has(q.type)).map((q) => {
          const a = r.answers[q.id];
          return (
            <div key={q.id} className="row gap-10" style={{ alignItems: 'flex-start' }}>
              <QType type={q.type} n={content.questions.indexOf(q) + 1} />
              <span className="col gap-4"><span className="t-caption muted">{q.title}</span>
                {q.type === 'contact_info' && a ? CONTACT_FIELDS.filter((f) => a[f.key]).map((f) => <span key={f.key} className="t-body-s" style={{ fontSize: 12 }}>{a[f.key]}</span>)
                  : (q.type === 'file_upload' || q.type === 'signature') && a?.url ? <a className="u t-body-s" href={a.url} target="_blank" rel="noreferrer">{a.name || 'View file'}</a>
                    : <span className="t-body-s" style={{ fontSize: 12 }}>{answerText(q, a) || '—'}{SCALE_TYPES.has(q.type) && typeof a === 'number' ? ` / ${q.type === 'rating' ? q.settings?.steps || 5 : q.settings?.to ?? 10}` : ''}</span>}
              </span>
            </div>
          );
        })}
        {Object.entries(r.hidden || {}).map(([k, v]) => <div key={k} className="row gap-10" style={{ alignItems: 'flex-start' }}><Icon name="eye" size={16} /><span className="col"><span className="t-caption muted">{k}</span><span className="t-caption">{v}</span></span></div>)}
        <div className="row gap-10 t-caption muted"><Icon name="monitor" size={14} />{r.device || 'unknown device'} · {r.source || 'Direct link'}</div>
      </div>
    </div>
  );
}

function Responses({ data, reload }) {
  const { form, content, role } = useForm();
  const toast = useToast();
  const [range, setRange] = useState('all');
  const [custom, setCustom] = useState(null);
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState([]);
  const [sel, setSel] = useState([]);
  const [open, setOpen] = useState(null);
  const [modal, setModal] = useState(null);
  const [hidden, setHidden] = useState(() => JSON.parse(localStorage.getItem('qwery.cols.' + form.id) || '[]'));
  const [lead, setLead] = useState('email');
  const convByResp = Object.fromEntries(data.convs.map((c) => [c.response_id, c]));
  const emailOf = (r) => { for (const x of content.questions) { const a = r.answers[x.id]; if (x.type === 'email' && a) return a; if (x.type === 'contact_info' && a?.email) return a.email; } return r.hidden?.email || '–'; };
  const contactQ = content.questions.find((x) => x.type === 'contact_info');
  const allCols = [
    { key: 'date', label: 'Date', icon: 'calendar-2', value: (r) => `${new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} ${fmtTime(r.created_at)}`, render: (r) => <span className="col" style={{ fontSize: 11 }}><span>{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span><span>{fmtTime(r.created_at)}</span></span> },
    { key: 'type', label: 'Response type', icon: 'play', value: (r) => (r.completed ? 'Completed' : 'Partial'), render: (r) => <span className="chip" style={{ fontSize: 10, padding: '1px 7px' }}>{r.completed ? 'Completed' : 'Partial'}</span> },
    ...content.questions.filter((x) => !NO_ANSWER.has(x.type)).flatMap((x) => x.type === 'contact_info'
      ? CONTACT_FIELDS.filter((f) => x.settings?.fields?.[f.key]?.show !== false).map((f) => ({ key: `${x.id}.${f.key}`, label: f.label, icon: 'user', value: (r) => r.answers[x.id]?.[f.key] || '–' }))
      : [{ key: x.id, label: x.title || TYPES[x.type].label, icon: TYPES[x.type].icon, value: (r) => { const t = answerText(x, r.answers[x.id]); return t ? (SCALE_TYPES.has(x.type) ? `${t} / ${x.type === 'rating' ? x.settings?.steps || 5 : x.settings?.to ?? 10}` : t) : '–'; } }]),
    { key: 'conv', label: 'Conversation', icon: 'message', value: (r, cb) => { const c = cb[r.id]; return c ? (c.status === 'resolved' ? 'Resolved' : `${c.messages?.[0]?.count || 0} messages`) : ''; },
      render: (r) => { const c = convByResp[r.id]; if (!c) return <button className="chip dash" onClick={(e) => { e.stopPropagation(); startConv(r); }}><Icon name="plus" />Start conversation</button>; if (c.status === 'resolved') return <span className="chip ok"><Icon name="check" />Resolved</span>; if (c.unread_by_creator) return <span className="chip conv"><Icon name="message" />{c.unread_by_creator} new messages<span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-500)' }} /></span>; return <span className="chip grey"><Icon name="message" />{c.messages?.[0]?.count || 0} messages</span>; } },
    ...(content.hidden_fields || []).map((h) => ({ key: 'h.' + h, label: h, icon: 'eye', value: (r) => r.hidden?.[h] || '–' })),
    { key: 'device', label: 'Device', icon: 'monitor', value: (r) => r.device || '–' },
    { key: 'id', label: 'Response ID', icon: 'hash', value: (r) => r.id, defaultHidden: true },
  ];
  const cols = allCols.filter((c) => !(hidden.includes(c.key) || (c.defaultHidden && !hidden.includes('+' + c.key))));
  const b = rangeBounds(range, custom);
  const list = data.responses.filter((r) => inRange(r.created_at, b) && filters.every((f) => matches(content, r, f)) && (!q || JSON.stringify(r.answers).toLowerCase().includes(q.toLowerCase())));
  const startConv = async (r) => { try { const id = await startCreatorConversation(form, r, content); reload(); navigate(`/forms/${form.id}/conversations/${id}`); } catch (e) { toast(e.message, { error: true }); } };
  const del = async (ids) => { await db.from('responses').delete().in('id', ids); setSel([]); setOpen(null); reload(); toast(`${ids.length} response${ids.length === 1 ? '' : 's'} deleted`, { ok: true }); };
  const openIdx = list.findIndex((r) => r.id === open);
  const leadCol = lead === 'email' ? { label: 'Email', value: emailOf } : { label: 'Name', value: (r) => (contactQ ? [r.answers[contactQ.id]?.first_name, r.answers[contactQ.id]?.last_name].filter(Boolean).join(' ') : '') || '–' };

  if (!data.responses.length) {
    return <div className="empty" style={{ marginTop: 80 }}><span className="ic"><Icon name="inbox" /></span><p className="t-h3" style={{ color: 'var(--q-text-primary)' }}>No responses yet</p><p className="t-body-s">When people submit your form, their answers show up here.</p><Btn onClick={() => navigate(`/forms/${form.id}/share`)}>Share your form</Btn></div>;
  }
  return (
    <div className="col" style={{ padding: '12px 16px 16px', height: '100%', minHeight: 0 }}>
      <div className="row gap-8 wrap" style={{ marginBottom: 10 }}>
        <DatePicker value={range} custom={custom} onChange={(r, c) => { setRange(r); if (c) setCustom(c); }} />
        <button className="btn btn-soft" style={{ borderRadius: 10, background: filters.length ? 'var(--accent-100)' : undefined, color: filters.length ? 'var(--accent-600)' : undefined }} onClick={() => setModal('filter')}><Icon name="filter" />Filters{filters.length ? ` (${filters.length})` : ''}</button>
        {filters.length > 0 && <button className="t-caption u" onClick={() => setFilters([])}>Clear</button>}
        <div className="row gap-6" style={{ border: '1px solid var(--q-border-default)', borderRadius: 999, padding: '5px 12px', background: '#fff' }}><Icon name="search" size={14} /><input style={{ border: 0, outline: 'none', fontSize: 12, width: 160 }} placeholder="Search responses" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search responses" /></div>
        <span className="grow" />
        <IconBtn icon="columns" label="Table settings" onClick={() => setModal('cols')} />
        <IconBtn icon="download" label="Download responses" onClick={() => setModal('download')} />
      </div>
      <div className="row gap-12" style={{ flex: 1, minHeight: 0 }}>
        <div className="card" style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
          <table className="tbl">
            <thead><tr>
              <th style={{ width: 36 }}><Check on={sel.length === list.length && list.length > 0} onChange={(v) => setSel(v ? list.map((r) => r.id) : [])} label="Select all" /></th>
              <th><div style={{ width: 120 }}><Select value={lead} onChange={setLead} options={[{ value: 'email', label: 'Email' }, { value: 'name', label: 'Name' }]} pill /></div></th>
              {cols.map((c) => <th key={c.key} title={c.label}><Icon name={c.icon} />{c.label.length > 26 ? c.label.slice(0, 24) + '…' : c.label}</th>)}
            </tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className={cx(sel.includes(r.id) && 'sel', open === r.id && 'sel')} onClick={() => setOpen(r.id)}>
                  <td onClick={(e) => e.stopPropagation()}><Check on={sel.includes(r.id)} onChange={(v) => setSel(v ? [...sel, r.id] : sel.filter((x) => x !== r.id))} label="Select response" /></td>
                  <td>{leadCol.value(r)}</td>
                  {cols.map((c) => <td key={c.key}>{c.render ? c.render(r) : c.value(r, convByResp)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {!list.length && <p className="t-body-s muted" style={{ padding: 20 }}>No responses match these filters.</p>}
        </div>
        {open && openIdx >= 0 && (
          <Detail r={list[openIdx]} idx={openIdx} total={list.length} onNav={(d) => setOpen(list[openIdx + d]?.id || open)} onClose={() => setOpen(null)} conv={convByResp[open]}
            onConv={() => (convByResp[open] ? navigate(`/forms/${form.id}/conversations/${convByResp[open].id}`) : startConv(list[openIdx]))} onDelete={() => role === 'owner' ? del([open]) : toast('Only workspace owners can delete responses')} />
        )}
      </div>
      {sel.length > 0 && (
        <div className="row gap-12 t-caption" style={{ marginTop: 8 }}>
          <span>{sel.length} response{sel.length === 1 ? '' : 's'} selected</span>
          <IconBtn icon="download" label="Download selected" onClick={() => setModal('download')} />
          {role === 'owner' && <IconBtn icon="trash" label="Delete selected" style={{ color: 'var(--red-500)' }} onClick={() => setModal('del')} />}
          <button className="u accent-text" onClick={() => setSel(list.map((r) => r.id))}>Select All</button>
          <button className="u accent-text" onClick={() => setSel([])}>Clear Selection</button>
        </div>
      )}
      {modal === 'filter' && <FilterModal filters={filters} onApply={setFilters} onClose={() => setModal(null)} />}
      {modal === 'cols' && <ColumnsModal cols={allCols} hidden={hidden} onClose={() => setModal(null)} onApply={(h) => { setHidden(h); localStorage.setItem('qwery.cols.' + form.id, JSON.stringify(h)); }} />}
      {modal === 'download' && <DownloadModal counts={{ all: data.responses.length, filtered: list.length, selected: sel.length }} onClose={() => setModal(null)}
        onDownload={(which, kind) => { const src = which === 'all' ? data.responses : which === 'filtered' ? list : list.filter((r) => sel.includes(r.id)); download(`${form.title} responses`, toRows(content, src, [{ label: 'Email', value: emailOf }, ...allCols.filter((c) => c.key !== 'conv' || true)], convByResp), kind); toast('Download started', { ok: true }); }} />}
      {modal === 'del' && <Modal title={`Delete ${sel.length} responses?`} onClose={() => setModal(null)} width={420} footer={<><Btn kind="secondary" onClick={() => setModal(null)}>Cancel</Btn><Btn kind="danger" onClick={() => { del(sel); setModal(null); }}>Delete</Btn></>}><p className="t-body-s muted">Deleted responses and their conversations can’t be recovered.</p></Modal>}
    </div>
  );
}

function ColumnsModal({ cols, hidden, onApply, onClose }) {
  const [h, setH] = useState(hidden);
  const isOn = (c) => !(h.includes(c.key) || (c.defaultHidden && !h.includes('+' + c.key)));
  const toggle = (c, v) => setH((x) => { let n = x.filter((k) => k !== c.key && k !== '+' + c.key); if (!v && !c.defaultHidden) n.push(c.key); if (v && c.defaultHidden) n.push('+' + c.key); return n; });
  return (
    <Modal title="Table settings" onClose={onClose} width={420} footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn kind={JSON.stringify(h) !== JSON.stringify(hidden) ? 'primary' : 'soft'} onClick={() => { onApply(h); onClose(); }}>Apply</Btn></>}>
      <div className="col gap-4" style={{ maxHeight: '55vh', overflow: 'auto' }}>
        {cols.map((c) => <div key={c.key} className="row gap-10 t-caption" style={{ minHeight: 26 }}><Icon name="grip" size={12} style={{ color: 'var(--ink-300)' }} /><Icon name={c.icon} size={14} /><span className="grow ellipsis">{c.label}</span><Toggle on={isOn(c)} onChange={(v) => toggle(c, v)} label={c.label} /></div>)}
      </div>
    </Modal>
  );
}

function DownloadModal({ counts, onDownload, onClose }) {
  const [which, setWhich] = useState(counts.selected ? 'selected' : 'all');
  const [kind, setKind] = useState('csv');
  const opt = (v, l, d, n, disabled) => <button className={cx('radio-row', disabled && 'disabled')} onClick={() => setWhich(v)}><Radio on={which === v} /><span className="col"><span className="t-body-s">{l} ({n} responses)</span><span className="t-caption muted">{d}</span></span></button>;
  return (
    <Modal title="Choose a file to download" onClose={onClose} width={432} footer={<><Btn kind="secondary" onClick={onClose}>Cancel</Btn><Btn onClick={() => { onDownload(which, kind); onClose(); }}>Download</Btn></>}>
      <div className="col gap-6">
        {opt('all', 'All responses', 'All of your responses', counts.all)}
        {opt('filtered', 'Filtered responses', 'All the responses visible after applying filters', counts.filtered, counts.filtered === counts.all)}
        {opt('selected', 'Selected responses', 'All responses from the selected rows', counts.selected, !counts.selected)}
        <div className="divider" style={{ margin: '6px 0' }} />
        {[['csv', 'CSV file', 'Works with Google Sheets and other tools'], ['xls', 'Excel file', 'Works with Excel 2007 and newer']].map(([k, l, d]) => <button key={k} className="radio-row" onClick={() => setKind(k)}><Radio on={kind === k} /><span className="col"><span className="t-body-s">{l}</span><span className="t-caption muted">{d}</span></span></button>)}
        <div className="divider" style={{ margin: '6px 0' }} />
        <button className="radio-row"><Radio on /><span className="col"><span className="t-body-s">Direct download</span><span className="t-caption muted">Download the responses directly into your device.</span></span></button>
        <div className="col gap-4" style={{ background: 'var(--ink-100)', borderRadius: 12, padding: 12, marginTop: 8 }}><span className="t-label-s">Connect to your apps</span><span className="t-caption">Send data where you need it, set up notifications, and more. Work smarter, not harder.</span></div>
      </div>
    </Modal>
  );
}

/* ---------------- Shell ---------------- */
export default function Results({ sub }) {
  const { form, setUnread } = useForm();
  const res = useResults(form.id);
  const tab = sub || 'insights';
  const d = res.data;
  const unread = d ? d.convs.filter((c) => c.unread_by_creator > 0).length : 0;
  useEffect(() => { if (d) setUnread(unread); }, [unread, d, setUnread]);
  return (
    <div className="col" style={{ flex: 1, minHeight: 0 }}>
      <div className="res-tabs">
        {[['smart', 'Smart Insights'], ['insights', 'Insights'], ['summary', 'Summary'], ['responses', 'Responses'], ['conversations', 'Conversations']].map(([k, l]) => (
          <button key={k} className={cx('tab', tab === k && 'on')} onClick={() => navigate(k === 'conversations' ? `/forms/${form.id}/conversations` : `/forms/${form.id}/results/${k}`)}>
            <span className="row gap-6">{l}{k === 'smart' && <span style={{ color: 'var(--brown-600)' }}><Icon name="diamond" size={12} /></span>}{k === 'responses' && d && <span className="count">{d.responses.length}</span>}{k === 'conversations' && d && <span className="count">{d.convs.length}</span>}</span><span className="bar" />
          </button>
        ))}
      </div>
      <div className="res-body">
        {!d ? <div className="col gap-12" style={{ padding: 28 }}>{[0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 110 }} />)}</div>
          : tab === 'summary' ? <Summary data={d} reload={res.reload} />
            : tab === 'responses' ? <Responses data={d} reload={res.reload} />
              : tab === 'smart' ? <SmartInsights data={d} />
                : <Insights data={d} />}
      </div>
    </div>
  );
}

function SmartInsights({ data }) {
  const { form, content } = useForm();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);
  const run = async () => {
    setBusy(true);
    try {
      const qs = content.questions.filter((q) => !NO_ANSWER.has(q.type));
      const sample = data.responses.slice(0, 120).map((r) => Object.fromEntries(qs.map((x) => [x.title, answerText(x, r.answers[x.id])])));
      const d = await ai('themes', { title: form.title, sample });
      setOut(d);
    } catch (e) { toast(e.message, { error: true }); } finally { setBusy(false); }
  };
  return (
    <div className="col center gap-16" style={{ padding: '40px 20px', maxWidth: 760, margin: '0 auto' }}>
      {!out ? (
        <div className="card col center gap-12" style={{ padding: 40, textAlign: 'center', background: 'var(--q-bg-upgrade)' }}>
          <Icon name="sparkle" size={30} />
          <h2 className="t-h2">Smart Insights</h2>
          <p className="t-body-s muted" style={{ maxWidth: 420 }}>Qwery reads every answer and groups them into themes, with sentiment and the quotes that matter — so you know who to talk to first.</p>
          <Btn icon="sparkle" loading={busy} disabled={!data.responses.length} onClick={run}>{data.responses.length ? 'Analyze responses' : 'Collect responses first'}</Btn>
        </div>
      ) : (
        <div className="col gap-12" style={{ width: '100%' }}>
          <div className="row between"><h2 className="t-h2">What people are saying</h2><Btn kind="secondary" icon="rotate" loading={busy} onClick={run}>Refresh</Btn></div>
          <p className="t-body-m">{out.summary}</p>
          {(out.themes || []).map((t, i) => (
            <div key={i} className="card col gap-8" style={{ padding: 18 }}>
              <div className="row gap-8"><span className="t-h3 grow">{t.name}</span><span className={cx('badge', t.sentiment === 'negative' ? 'danger' : t.sentiment === 'positive' ? 'success' : 'neutral')}>{t.sentiment}</span><span className="badge outline">{t.share}</span></div>
              {(t.quotes || []).map((q, k) => <p key={k} className="t-body-s muted" style={{ borderLeft: '2px solid var(--accent-300)', paddingLeft: 10 }}>“{q}”</p>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export { LETTERS, Menu };
