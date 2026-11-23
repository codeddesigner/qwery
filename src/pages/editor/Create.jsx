import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ai } from '../../components/FormRunner.jsx';
import { Answer, Media } from '../../components/QuestionView.jsx';
import { Icon } from '../../lib/icons.jsx';
import { ADDRESS_FIELDS, answerableIndex, CHOICE_TYPES, CONTACT_FIELDS, LETTERS, newEnding, newQuestion, NO_ANSWER, opsFor, TEMPLATES, themeVars, TYPES, uid } from '../../lib/questions.js';
import { navigate } from '../../lib/router.js';
import { useApp } from '../../lib/store.jsx';
import { Btn, cx, IconBtn, Menu, Modal, Popover, QType, Select, Seg, Toggle, useToast } from '../../ui.jsx';
import { useForm } from '../FormShell.jsx';
import { AccountMenu } from '../Workspace.jsx';
import { AccessibilityPanel, AddContentModal, DesignPanel, FormSettingsModal, IconSources, ImageEditor, MediaGallery, PreviewModal } from './parts.jsx';

/* ---------------- contentEditable text that doesn’t fight the caret ---------------- */
function Editable({ value, onChange, className, placeholder, tag: Tag = 'div', style, onEnter, autoFocus }) {
  const ref = useRef(null);
  useLayoutEffect(() => { if (ref.current && ref.current.innerText !== (value || '')) ref.current.innerText = value || ''; }, [value]);
  useEffect(() => { if (autoFocus && ref.current) { ref.current.focus(); const r = document.createRange(); r.selectNodeContents(ref.current); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } }, [autoFocus]);
  return (
    <Tag ref={ref} className={cx('editable', className)} contentEditable suppressContentEditableWarning data-ph={placeholder} style={style} role="textbox" aria-label={placeholder}
      onInput={(e) => onChange(e.currentTarget.innerText.replace(/\n$/, ''))}
      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEnter?.(); } }}
      onPaste={(e) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }} />
  );
}

/* ---------------- TF 015 / 020: How do you want to build your form? ---------------- */
export function BuildChooser() {
  const { form, ws, update } = useForm();
  const [modal, setModal] = useState(null);
  const [tpl, setTpl] = useState(false);
  const go = (tab) => setModal(tab);
  const after = () => navigate(`/forms/${form.id}/create`, { replace: true });
  return (
    <div className="ws-shell">
      <div className="ed-head">
        <div className="side crumb"><Icon name="grid" /><button onClick={() => navigate('/workspace/' + form.workspace_id)}>{ws?.name || 'My workspace'}</button><Icon name="chevron-right" size={12} />{form.title}</div>
        <div className="side row gap-16" style={{ justifyContent: 'flex-end' }}><IconBtn icon="help" label="Help" /><AccountMenu /></div>
      </div>
      <div className="ws-frame" style={{ alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <h1 className="t-h2" style={{ marginBottom: 26, textAlign: 'center' }}>How do you want to build your form?</h1>
        <div className="row gap-14 wrap center" style={{ maxWidth: 640, width: '100%' }}>
          <button className="big-option" onClick={() => go('elements')}>
            <span style={{ position: 'relative', width: 48, height: 48, marginBottom: 12 }}>
              <span style={{ position: 'absolute', right: 0, top: 0, width: 20, height: 20, borderRadius: '50%', background: '#a9d4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={14} /></span>
              <span style={{ position: 'absolute', left: 4, top: 12, width: 24, height: 24, borderRadius: '50%', border: '1.5px dashed var(--ink-900)' }} />
              <span style={{ position: 'absolute', left: 4, bottom: 0 }}><Icon name="arrow-left" size={16} style={{ transform: 'rotate(-45deg)' }} /></span>
            </span>
            <span className="t-body-m">Start from scratch</span><span className="t-caption muted">Build from a list of ready-made form elements.</span>
          </button>
          <button className="big-option" onClick={() => go('import')}>
            <span className="col center" style={{ marginBottom: 8 }}><Icon name="monitor" size={34} /><span className="row gap-2" style={{ marginTop: 4 }}>{[0, 1, 2].map((i) => <span key={i} style={{ width: 13, height: 10, borderRadius: i === 2 ? 6 : 2, background: '#d6c2ff' }} />)}</span></span>
            <span className="t-body-m">Import questions</span><span className="t-caption muted">Copy and paste questions or import from Google Forms.</span>
          </button>
          <button className="big-option" onClick={() => go('ai')}>
            <span style={{ marginBottom: 12, position: 'relative' }}><Icon name="sparkle" size={34} /><span style={{ position: 'absolute', right: -10, top: -8, color: 'var(--lavender-600)' }}><Icon name="sparkle" size={14} /></span></span>
            <span className="t-body-m">Create with AI</span><span className="t-caption muted">Use AI to help generate questions — and where to start conversations.</span>
          </button>
        </div>
        <button className="row gap-8 t-body-s" style={{ marginTop: 40 }} onClick={() => setTpl(true)}><span className="u">Or, start from a template</span><span style={{ width: 20, height: 20, borderRadius: '50%', background: '#d6c2ff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="list" size={12} /></span></button>
      </div>
      {modal && <AddContentModal initialTab={modal} onClose={() => setModal(null)} onAdd={(x) => {
        if (x.type) update((c) => { c.questions.push(newQuestion(x.type)); });
        if (x.ending) update((c) => { c.endings.push(newEnding(x.ending)); });
        after();
      }} />}
      {tpl && (
        <Modal title="Start from a template" onClose={() => setTpl(false)} width={640}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {TEMPLATES.map((t) => (
              <button key={t.key} className="big-option" style={{ padding: 16, alignItems: 'flex-start', textAlign: 'left', minWidth: 0 }} onClick={() => {
                const b = t.build();
                update((c) => { c.questions = b.questions; if (b.logic) c.logic = b.logic; if (b.conversation) c.conversation = { ...c.conversation, ...b.conversation }; if (b.variables) c.variables = b.variables; });
                after();
              }}>
                <span className="t-label-m">{t.title}</span><span className="t-caption muted">{t.blurb}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------------- Left: questions + endings ---------------- */
function QuestionList({ sel, setSel }) {
  const { content, update, canEdit } = useForm();
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [menu, setMenu] = useState(null);
  const menuRef = useRef({});
  const anchorFor = (id) => menuRef.current[id] || (menuRef.current[id] = { current: null });
  const [endMenu, setEndMenu] = useState(false);
  const endRef = useRef(null);
  const [split, setSplit] = useState(60);
  const leftRef = useRef(null);
  const trig = content.conversation?.mode === 'rule' ? content.conversation?.rule?.q : null;
  const move = (from, to) => update((c) => { const [x] = c.questions.splice(from, 1); c.questions.splice(to > from ? to - 1 : to, 0, x); });
  const startResize = (e) => {
    const r = leftRef.current.getBoundingClientRect();
    const mv = (ev) => setSplit(Math.min(85, Math.max(20, ((ev.clientY - r.top) / r.height) * 100)));
    const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
    e.preventDefault();
  };
  return (
    <div className="ed-left" ref={leftRef}>
      <div className="ed-qpanel" style={{ flex: `1 1 ${split}%` }} onDragOver={(e) => e.preventDefault()}>
        {!content.questions.length && <p className="t-body-s muted" style={{ padding: 12 }}>No questions yet. Use <b>Add content</b> to start.</p>}
        {content.questions.map((q, i) => (
          <div key={q.id} draggable={canEdit} onDragStart={() => setDrag(i)} onDragEnd={() => { setDrag(null); setOver(null); }}
            onDragOver={(e) => { e.preventDefault(); const r = e.currentTarget.getBoundingClientRect(); setOver({ i, pos: e.clientY < r.top + r.height / 2 ? 'above' : 'below' }); }}
            onDrop={() => { if (drag != null && over) move(drag, over.pos === 'above' ? over.i : over.i + 1); setDrag(null); setOver(null); }}
            className={cx('qitem', sel === q.id && 'on', drag === i && 'dragging', over?.i === i && drag !== i && `drop-${over.pos}`, menu === q.id && 'menu-open')}
            onClick={() => setSel(q.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setSel(q.id)}>
            <QType type={q.type} n={i + 1} />
            <span className="t">{q.title || <span className="tertiary">{TYPES[q.type]?.label}</span>}</span>
            {trig === q.id && <span className="conv-dot" title="Starts conversations" />}
            {canEdit && <button ref={anchorFor(q.id)} className="more" aria-label="Question options" onClick={(e) => { e.stopPropagation(); setMenu(menu === q.id ? null : q.id); }}><Icon name="kebab" /></button>}
            <Popover anchor={anchorFor(q.id)} open={menu === q.id} onClose={() => setMenu(null)} width={140} placement="right">
              <Menu onClose={() => setMenu(null)} items={[
                { label: 'Duplicate', icon: 'copy', onClick: () => update((c) => { const copy = { ...structuredClone(q), id: uid('q_') }; if (copy.choices) copy.choices = copy.choices.map((x) => ({ ...x, id: uid('c_') })); c.questions.splice(i + 1, 0, copy); }) },
                { label: 'Delete', icon: 'trash', danger: true, onClick: () => { update((c) => { c.questions = c.questions.filter((x) => x.id !== q.id); delete c.logic[q.id]; }); if (sel === q.id) setSel(content.questions[i + 1]?.id || content.questions[i - 1]?.id || null); } },
              ]} />
            </Popover>
          </div>
        ))}
      </div>
      <div className="ed-handle" onMouseDown={startResize} role="separator" aria-label="Resize panels"><span /></div>
      <div className="ed-endings" style={{ flex: `1 1 ${100 - split}%` }}>
        <div className="row" style={{ paddingLeft: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 15 }} className="grow">Endings</span>
          {canEdit && <button ref={endRef} className="icon-btn boxed" aria-label="Add ending" onClick={() => setEndMenu((o) => !o)}><Icon name="plus" /></button>}
          <Popover anchor={endRef} open={endMenu} onClose={() => setEndMenu(false)} width={170} placement="right">
            <div className="menu-head" style={{ fontWeight: 400 }}>Choose an ending type</div>
            <Menu onClose={() => setEndMenu(false)} items={[
              { label: 'End Screen', icon: 'page', onClick: () => { const e = newEnding('end'); update((c) => { c.endings.push(e); }); setSel(e.id); } },
              { label: 'Redirect to URL', icon: 'link', onClick: () => { const e = newEnding('redirect'); update((c) => { c.endings.push(e); }); setSel(e.id); } },
            ]} />
          </Popover>
        </div>
        {content.endings.map((e, i) => (
          <div key={e.id} className={cx('qitem', sel === e.id && 'on')} onClick={() => setSel(e.id)} role="button" tabIndex={0}>
            <span className="qtype cat-layout" style={{ gap: 6 }}><Icon name={e.type === 'redirect' ? 'link' : 'image'} />{LETTERS[i]}</span>
            <span className="t">{e.type === 'redirect' ? (e.url || 'Redirect to URL') : e.title || 'End screen'}</span>
            {canEdit && content.endings.length > 1 && <button className="more" aria-label="Delete ending" onClick={(ev) => { ev.stopPropagation(); update((c) => { c.endings = c.endings.filter((x) => x.id !== e.id); }); if (sel === e.id) setSel(content.questions[0]?.id); }}><Icon name="trash" /></button>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Canvas ---------------- */
function Canvas({ sel, mobile, onTile }) {
  const { content, update, canEdit } = useForm();
  const toast = useToast();
  const q = content.questions.find((x) => x.id === sel);
  const ending = content.endings.find((x) => x.id === sel);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const aiRef = useRef(null);
  const [focusChoice, setFocusChoice] = useState(null);
  const vars = themeVars(content.theme);
  const setQ = (fn) => update((c) => { const x = c.questions.find((y) => y.id === sel); if (x) fn(x, c); });
  const setE = (fn) => update((c) => { const x = c.endings.find((y) => y.id === sel); if (x) fn(x, c); });

  const runAi = async () => {
    setAiOpen(true); setAiBusy(true); setAiText('');
    try { const d = await ai('rewrite', { title: q.title, type: TYPES[q.type].label }); setAiText(d.text); }
    catch (e) { setAiText(''); toast(e.message, { error: true }); setAiOpen(false); } finally { setAiBusy(false); }
  };

  if (!q && !ending) {
    return <div className="qcard" style={vars}><div className="inner" style={{ alignItems: 'center', textAlign: 'center' }}><p className="t-h3 muted">Select a question, or add one with “Add content”.</p></div></div>;
  }
  if (ending) {
    return (
      <div className={cx('qcard theme-scope', mobile && 'mobile')} style={vars}>
        <div className="inner" style={{ alignItems: 'center', textAlign: 'center', gap: 14 }}>
          {ending.type === 'redirect' ? (
            <div className="col gap-10 center"><Icon name="link" size={28} /><p className="q-title">Redirect to</p><input className="field" style={{ maxWidth: 420 }} value={ending.url} onChange={(e) => setE((x) => { x.url = e.target.value; })} placeholder="https://" disabled={!canEdit} /><p className="t-caption muted">Respondents go straight to this address after submitting. You can recall answers with {'{{question-id}}'}.</p></div>
          ) : (
            <>
              <Media media={ending.media} />
              <Editable className="q-title" style={{ fontSize: mobile ? 22 : 28 }} value={ending.title} placeholder="Say thanks" onChange={(v) => setE((x) => { x.title = v; })} />
              <Editable className="q-desc" value={ending.description} placeholder="Description (optional)" onChange={(v) => setE((x) => { x.description = v; })} />
              {ending.social && <div className="row gap-8">{['link', 'x-social', 'user'].map((i) => <span key={i} style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--t-button)', color: 'var(--t-button-text)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={i} size={12} /></span>)}</div>}
              {ending.button?.show && <div className="row gap-10"><span className="ok-btn">{ending.button.label || 'Create a Qwery'}</span><span className="key-hint">press <b>Enter</b> ↵</span></div>}
            </>
          )}
        </div>
      </div>
    );
  }

  const media = q.media?.url && q.media.kind !== 'video' ? q.media : null;
  const layout = media ? (mobile && q.media.layoutMobile ? q.media.layoutMobile : q.media.layout || 'stack') : 'stack';
  const split = media && ['split_left', 'split_right'].includes(layout) && !mobile;
  const wallpaper = media && layout === 'wallpaper';
  const n = answerableIndex(content, q);
  const editHandlers = {
    onEditChoice: (id, v) => setQ((x) => { const c = x.choices.find((y) => y.id === id); if (c) c.label = v; }),
    onAddChoice: (i) => { const id = uid('c_'); setQ((x) => { x.choices.splice(i + 1, 0, { id, label: '' }); }); setFocusChoice(id); },
    onRemoveChoice: (id) => setQ((x) => { x.choices = x.choices.filter((y) => y.id !== id); }),
  };
  const qWithFocus = focusChoice ? { ...q, choices: q.choices?.map((c) => (c.id === focusChoice ? { ...c, _focus: true } : c)) } : q;

  return (
    <div className={cx('qcard theme-scope', mobile && 'mobile')} style={{ ...vars, ...(wallpaper ? { background: `linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)), url(${media.url}) center/cover` } : {}), flexDirection: layout === 'split_left' ? 'row-reverse' : 'row' }}>
      <div className="inner" style={split ? { padding: '40px 36px' } : undefined}>
        {canEdit && !NO_ANSWER.has(q.type) && (
          <button ref={aiRef} className="icon-btn" aria-label="Optimize with AI" title="Optimize with AI" style={{ position: 'absolute', right: split ? 'calc(50% + 16px)' : 24, top: mobile ? 8 : 90, color: 'var(--type-choice-fg)' }} onClick={runAi} disabled={!q.title?.trim()}><Icon name="sparkle" /></button>
        )}
        <Popover anchor={aiRef} open={aiOpen} onClose={() => setAiOpen(false)} width={208} align="right">
          <div className="row between"><span className="t-caption" style={{ fontSize: 12 }}>Optimize with AI</span><IconBtn icon="x" label="Close" onClick={() => setAiOpen(false)} style={{ width: 20, height: 20 }} /></div>
          <div className="ai-quote">{aiBusy ? <span className="row gap-6"><span className="spin" style={{ width: 12, height: 12 }} />Rewriting…</span> : aiText}</div>
          <div className="row between">
            <Btn style={{ fontSize: 11, padding: '4px 10px' }} disabled={aiBusy || !aiText} onClick={() => { setQ((x) => { x.title = aiText; }); setAiOpen(false); }}>Use this text</Btn>
            <IconBtn icon="rotate" label="Try again" onClick={runAi} />
          </div>
        </Popover>
        <div className="row gap-12" style={{ alignItems: 'flex-start', fontSize: content.theme.sizeQuestions === 'lg' ? '1.1em' : content.theme.sizeQuestions === 'sm' ? '.9em' : undefined }}>
          {n != null && content.settings.numbers !== false && <span className="qnum">{n}</span>}
          <div className="col grow" style={{ gap: 16, minWidth: 0 }}>
            <div className="col gap-6">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <Editable key={q.id} className="q-title title grow" value={q.title} placeholder={q.type === 'ai_followup' ? 'Fallback question (AI writes the real one live)' : 'Your question here. Recall information with @'} onChange={(v) => setQ((x) => { x.title = v; })} autoFocus={!q.title} />
                {q.required && !NO_ANSWER.has(q.type) && <span className="q-title">*</span>}
              </div>
              <Editable key={q.id + 'd'} className="q-desc" value={q.description} placeholder="Description (optional)" onChange={(v) => setQ((x) => { x.description = v; })} />
            </div>
            {(layout === 'stack' || (mobile && layout !== 'wallpaper')) && media && <Media media={q.media} />}
            {q.media?.kind === 'video' && q.type !== 'video' && <Media media={q.media} />}
            {q.type === 'ai_followup' && <span className="badge ai" style={{ alignSelf: 'flex-start' }}><Icon name="sparkle" size={12} />AI writes this question from the previous answer</span>}
            <div style={{ pointerEvents: CHOICE_TYPES.has(q.type) || q.type === 'picture_choice' ? 'auto' : 'none', paddingLeft: q.type === 'multiple_choice' ? 0 : 0 }}>
              <Answer q={qWithFocus} value={undefined} onChange={() => {}} onSubmit={() => {}} preview editable={canEdit && ['multiple_choice', 'dropdown', 'ranking', 'picture_choice'].includes(q.type)} editHandlers={editHandlers} mobile={mobile} onTileClick={onTile} />
            </div>
            {q.type === 'picture_choice' && canEdit && <button className="add-choice" onClick={() => setQ((x) => { x.choices.push({ id: uid('c_'), label: '', image: '' }); })}>Add choice</button>}
          </div>
        </div>
      </div>
      {split && <div className="media-side" style={{ backgroundImage: `url(${media.url})`, backgroundPosition: media.focal || 'center', flex: `0 0 ${media.width || 50}%`, filter: media.filter, transform: media.transform }} />}
    </div>
  );
}

/* ---------------- Right: settings ---------------- */
function SettingRow({ label, children, muted = true }) {
  return <div className="rp-row"><span style={{ color: muted ? undefined : 'var(--q-text-primary)' }}>{label}</span>{children}</div>;
}

function Counter({ value, max = 24 }) { return <span className="t-caption tertiary" style={{ alignSelf: 'flex-end', fontSize: 10 }}>{(value || '').length}/{max}</span>; }

function convertType(q, type) {
  const fresh = newQuestion(type, { id: q.id, title: q.title, description: q.description, required: q.required, media: q.media });
  if (fresh.choices && q.choices && !['yes_no', 'legal'].includes(type)) fresh.choices = q.choices.map((c) => ({ ...c }));
  return fresh;
}

const TYPE_OPTIONS = Object.entries(TYPES).filter(([k]) => !['end_screen', 'redirect'].includes(k)).map(([k, t]) => ({ value: k, label: t.label, tile: <QType type={k} tile /> }));

function MediaSection({ q, setQ }) {
  const ref = useRef(null);
  const edRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [ed, setEd] = useState(false);
  const [dev, setDev] = useState('desktop');
  const m = q.media;
  const layoutKey = dev === 'mobile' ? 'layoutMobile' : 'layout';
  const layouts = [['none', 'None'], ['stack', 'Stack'], ['float', 'Float'], ['split_left', 'Split left'], ['split_right', 'Split right'], ['wallpaper', 'Wallpaper']];
  const thumb = (k) => {
    const img = <span style={{ width: 14, height: 18, borderRadius: 3, background: m?.url ? `url("${m.url}") center/cover` : 'var(--ink-300)', flex: 'none' }} />;
    const lines = <span className="col gap-2"><span style={{ width: 14, height: 2, background: 'var(--ink-400)' }} /><span style={{ width: 10, height: 2, background: 'var(--ink-400)' }} /></span>;
    if (k === 'none') return lines;
    if (k === 'stack') return <span className="col gap-2 center">{img}{lines}</span>;
    if (k === 'float') return <span className="row gap-4">{lines}{img}</span>;
    if (k === 'split_left') return <span className="row gap-4" style={{ width: '100%', height: '100%' }}><span style={{ flex: 1, height: '100%', background: m?.url ? `url("${m.url}") center/cover` : 'var(--ink-300)' }} />{lines}</span>;
    if (k === 'split_right') return <span className="row gap-4" style={{ width: '100%', height: '100%', paddingLeft: 6 }}>{lines}<span style={{ flex: 1, height: '100%', background: m?.url ? `url("${m.url}") center/cover` : 'var(--ink-300)' }} /></span>;
    return <span style={{ width: '100%', height: '100%', background: m?.url ? `url("${m.url}") center/cover` : 'var(--ink-300)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ background: '#fff', padding: 3, borderRadius: 2 }}>{lines}</span></span>;
  };
  return (
    <>
      <div className="rp-sec">
        <div className="row between">
          <span className="rp-title">Image or video</span>
          {m?.url ? (
            <span className="row gap-2">
              <IconBtn icon="copy" label="Replace" onClick={() => setOpen(true)} />
              {m.kind !== 'video' && <span ref={edRef}><IconBtn icon="settings" label="Edit image" onClick={() => setEd(true)} /></span>}
              <IconBtn icon="trash" label="Remove media" onClick={() => setQ((x) => { delete x.media; })} />
            </span>
          ) : <span ref={ref}><IconBtn icon="plus" label="Add image or video" boxed onClick={() => setOpen(true)} /></span>}
        </div>
        <MediaGallery anchor={ref.current ? ref : edRef} open={open} onClose={() => setOpen(false)} onPick={(pick) => setQ((x) => { x.media = { ...pick, layout: x.media?.layout || 'stack' }; })} />
        {m?.url && m.kind !== 'video' && <ImageEditor anchor={edRef} open={ed} onClose={() => setEd(false)} value={m} onSave={(v) => setQ((x) => { x.media = { ...x.media, ...v, focal: v.crop }; })} />}
        {m?.url && m.kind !== 'video' && <input className="field sm" placeholder="Alt text (describe the image)" value={m.alt || ''} onChange={(e) => setQ((x) => { x.media.alt = e.target.value; })} />}
      </div>
      {m?.url && m.kind !== 'video' && (
        <div className="rp-sec">
          <div className="row between"><span className="rp-title">Layout</span>
            <span className="row gap-2"><IconBtn icon="monitor" label="Desktop layout" active={dev === 'desktop'} onClick={() => setDev('desktop')} /><IconBtn icon="phone" label="Mobile layout" active={dev === 'mobile'} onClick={() => setDev('mobile')} /></span>
          </div>
          <div className="layout-grid">
            {layouts.map(([k, l]) => (
              <button key={k} className={cx('layout-opt', (m[layoutKey] || (dev === 'mobile' ? m.layout : 'stack')) === k && 'on')} onClick={() => setQ((x) => { if (k === 'none') { delete x.media; return; } x.media[layoutKey] = k; })}>
                <span className="lb">{thumb(k)}</span>{l}
              </button>
            ))}
          </div>
          {['split_left', 'split_right'].includes(m.layout) && (
            <>
              <SettingRow label={<span className="row gap-6"><Icon name="image" />Focal point</span>}>
                <select className="field sm" style={{ width: 92, borderRadius: 8 }} value={m.focal || 'center'} onChange={(e) => setQ((x) => { x.media.focal = e.target.value; })}>{['center', 'top', 'bottom', 'left', 'right'].map((f) => <option key={f} value={f}>{f[0].toUpperCase() + f.slice(1)}</option>)}</select>
              </SettingRow>
              <SettingRow label={<span className="row gap-6"><Icon name="columns" />Image width</span>}>
                <select className="field sm" style={{ width: 80, borderRadius: 8 }} value={m.width || 50} onChange={(e) => setQ((x) => { x.media.width = +e.target.value; })}>{[30, 40, 50, 60].map((w) => <option key={w} value={w}>{w}%</option>)}</select>
              </SettingRow>
            </>
          )}
        </div>
      )}
    </>
  );
}

function ConversationSection({ q }) {
  const { content, update } = useForm();
  const c = content.conversation || {};
  const on = c.enabled && c.mode === 'rule' && c.rule?.q === q.id;
  const ops = opsFor(q);
  const rule = on ? c.rule : null;
  const presets = CHOICE_TYPES.has(q.type)
    ? [...(q.settings?.other ? [{ value: JSON.stringify({ op: 'answered' }), label: 'Invite if answer is “Other”' }] : []), ...q.choices.map((ch) => ({ value: JSON.stringify({ op: 'is', value: ch.id }), label: `Invite if answer is “${ch.label || 'Untitled'}”` })), { value: JSON.stringify({ op: 'answered' }), label: 'Invite everyone who answers' }]
    : ['nps', 'opinion_scale', 'rating'].includes(q.type)
      ? [{ value: JSON.stringify({ op: 'lte', value: q.type === 'rating' ? '2' : '6' }), label: `Invite if score is ${q.type === 'rating' ? '2' : '6'} or lower` }, { value: JSON.stringify({ op: 'gte', value: q.type === 'rating' ? '4' : '9' }), label: `Invite if score is ${q.type === 'rating' ? '4' : '9'} or higher` }, { value: JSON.stringify({ op: 'answered' }), label: 'Invite everyone who answers' }]
      : [{ value: JSON.stringify({ op: 'answered' }), label: 'Invite everyone who answers' }];
  void ops;
  const cur = rule ? JSON.stringify({ op: rule.op, ...(rule.value !== undefined ? { value: rule.value } : {}) }) : presets[0].value;
  return (
    <div className="rp-sec">
      <span className="rp-title">Conversation</span>
      <SettingRow label="Allow conversations"><Toggle on={on} onChange={(v) => update((x) => { x.conversation = v ? { ...x.conversation, enabled: true, mode: 'rule', rule: { q: q.id, ...JSON.parse(presets[0].value) } } : { ...x.conversation, mode: 'ending' }; })} label="Allow conversations" /></SettingRow>
      {on && (
        <Select value={presets.some((p) => p.value === cur) ? cur : presets[0].value} onChange={(v) => update((x) => { x.conversation.rule = { q: q.id, ...JSON.parse(v) }; })}
          options={presets.map((p) => ({ ...p, tile: <span className="qtile cat-conversation"><Icon name="message" /></span> }))} />
      )}
    </div>
  );
}

function QuestionSettings({ q }) {
  const { update, content } = useForm();
  const setQ = (fn) => update((c) => { const x = c.questions.find((y) => y.id === q.id); if (x) fn(x); });
  const s = q.settings || {};
  const tog = (k, l) => <SettingRow key={k} label={l}><Toggle on={!!s[k]} onChange={(v) => setQ((x) => { x.settings = { ...x.settings, [k]: v }; })} label={l} /></SettingRow>;
  const req = !NO_ANSWER.has(q.type) && <SettingRow key="req" label="Required"><Toggle on={!!q.required} onChange={(v) => setQ((x) => { x.required = v; })} label="Required" /></SettingRow>;
  const rows = [];
  switch (q.type) {
    case 'multiple_choice': case 'dropdown':
      rows.push(req);
      if (q.type === 'multiple_choice') {
        rows.push(tog('multiple', 'Multiple selection'));
        if (s.multiple) rows.push(
          <div key="lim" className="row gap-6">
            <div className="grow"><Select value={s.limit || 'unlimited'} onChange={(v) => setQ((x) => { x.settings.limit = v; })} options={[{ value: 'unlimited', label: 'Unlimited' }, { value: 'exact', label: 'Exact number' }, { value: 'range', label: 'Range' }]} /></div>
            {s.limit === 'exact' && <input className="field sq" style={{ width: 40, height: 40, padding: 6, textAlign: 'center' }} type="number" min={1} max={q.choices.length} value={s.limitN || 1} onChange={(e) => setQ((x) => { x.settings.limitN = +e.target.value; })} aria-label="Exact number" />}
          </div>,
          s.limit === 'range' && <div key="rng" className="row gap-6 t-body-s"><input className="field sm" type="number" min={1} value={s.limitMin || 1} onChange={(e) => setQ((x) => { x.settings.limitMin = +e.target.value; })} aria-label="Minimum" />to<input className="field sm" type="number" min={1} value={s.limitMax || q.choices.length} onChange={(e) => setQ((x) => { x.settings.limitMax = +e.target.value; })} aria-label="Maximum" /></div>,
        );
      }
      rows.push(tog('randomize', 'Randomize'));
      if (q.type === 'multiple_choice') rows.push(tog('other', '“Other” option'), <SettingRow key="v" label="Vertical alignment"><Toggle on={s.vertical !== false} onChange={(v) => setQ((x) => { x.settings.vertical = v; })} label="Vertical alignment" /></SettingRow>);
      break;
    case 'picture_choice':
      rows.push(req, tog('showLabels', 'Show labels'), tog('supersize', 'Supersize'), tog('multiple', 'Multiple selection'), tog('randomize', 'Randomize'), tog('other', '“Other” option'));
      rows.push(
        <details key="alt" className="t-body-s"><summary className="rp-row" style={{ cursor: 'pointer', listStyle: 'none' }}><span>Choices alt text</span><Icon name="chevron-down" size={14} /></summary>
          <div className="col gap-6" style={{ marginTop: 6 }}>{q.choices.map((c, i) => <input key={c.id} className="field sm" placeholder={`Alt text for ${LETTERS[i]}`} value={c.alt || ''} onChange={(e) => setQ((x) => { x.choices[i].alt = e.target.value; })} />)}</div>
        </details>,
      );
      break;
    case 'opinion_scale': case 'nps': {
      rows.push(req);
      if (q.type === 'opinion_scale') rows.push(
        <div key="rng" className="row gap-6 t-body-s">
          <div style={{ flex: 1 }}><Select value={s.from ?? 0} onChange={(v) => setQ((x) => { x.settings.from = v; })} options={[0, 1].map((n) => ({ value: n, label: String(n) }))} /></div>to
          <div style={{ flex: 1 }}><Select value={s.to ?? 10} onChange={(v) => setQ((x) => { x.settings.to = v; })} options={[5, 6, 7, 8, 9, 10].map((n) => ({ value: n, label: String(n) }))} /></div>
        </div>,
      );
      const L = s.labels || {};
      ['left', 'center', 'right'].forEach((k) => {
        const num = k === 'left' ? s.from ?? 0 : k === 'right' ? s.to ?? 10 : Math.round(((s.from ?? 0) + (s.to ?? 10)) / 2);
        rows.push(<div key={k} className="col gap-2"><input className="field sm" maxLength={24} placeholder={`${num} label`} value={L[k] || ''} onChange={(e) => setQ((x) => { x.settings.labels = { ...x.settings.labels, [k]: e.target.value }; })} /><Counter value={L[k]} /></div>);
      });
      break;
    }
    case 'rating':
      rows.push(req, <SettingRow key="st" label="Steps"><select className="field sm" style={{ width: 70, borderRadius: 8 }} value={s.steps || 5} onChange={(e) => setQ((x) => { x.settings.steps = +e.target.value; })}>{[3, 4, 5, 6, 7, 8, 9, 10].map((n) => <option key={n}>{n}</option>)}</select></SettingRow>);
      break;
    case 'contact_info': case 'address': {
      const F = q.type === 'contact_info' ? CONTACT_FIELDS : ADDRESS_FIELDS;
      F.forEach((f) => {
        const cfg = s.fields?.[f.key] || { show: true };
        rows.push(
          <div key={f.key} className="rp-row">
            <span>{f.label}</span>
            <IconBtn icon={cfg.show ? 'eye' : 'eye-off'} label={cfg.show ? `Hide ${f.label}` : `Show ${f.label}`} onClick={() => setQ((x) => { x.settings.fields[f.key] = { ...cfg, show: !cfg.show }; })} />
            <button className="icon-btn" aria-label={`${f.label} required`} aria-pressed={!!cfg.required} title={cfg.required ? 'Required' : 'Optional'} onClick={() => setQ((x) => { x.settings.fields[f.key] = { ...cfg, required: !cfg.required }; })} style={{ color: cfg.required ? 'var(--accent-500)' : 'var(--q-text-tertiary)', fontSize: 18, fontWeight: 600 }}>*</button>
          </div>,
        );
        if (f.key === 'phone' && q.type === 'contact_info') rows.push(<Select key="cty" value={s.country || 'US'} onChange={(v) => setQ((x) => { x.settings.country = v; })} options={[['US', 'United States', '#b22234'], ['GB', 'United Kingdom', '#012169'], ['NG', 'Nigeria', '#008751'], ['ID', 'Indonesia', '#ce1126'], ['DE', 'Germany', '#000'], ['FR', 'France', '#0055a4'], ['IN', 'India', '#ff9933'], ['CA', 'Canada', '#d52b1e']].map(([v, l, c]) => ({ value: v, label: l, tile: <span style={{ width: 24, height: 18, borderRadius: 3, background: c }} /> }))} />);
        if (f.key === 'email' && q.type === 'contact_info') rows.push(<div key="enr" className="rp-row" style={{ background: 'var(--q-bg-control)', borderRadius: 8, padding: '0 6px', fontSize: 12 }}><span className="row gap-4">Data enrichment <Icon name="help" size={12} /><span style={{ color: 'var(--brown-600)' }}><Icon name="diamond" size={12} /></span></span><Toggle on={false} disabled label="Data enrichment" /></div>);
      });
      break;
    }
    case 'short_text': case 'long_text':
      rows.push(req, tog('maxChars', 'Max characters'));
      if (s.maxChars) rows.push(<input key="mx" type="number" className="field sm" value={s.maxN || 120} onChange={(e) => setQ((x) => { x.settings.maxN = +e.target.value; })} aria-label="Max characters" />);
      break;
    case 'number':
      rows.push(req, <div key="mm" className="row gap-6"><input className="field sm" placeholder="Min" type="number" value={s.min} onChange={(e) => setQ((x) => { x.settings.min = e.target.value; })} /><input className="field sm" placeholder="Max" type="number" value={s.max} onChange={(e) => setQ((x) => { x.settings.max = e.target.value; })} /></div>);
      break;
    case 'date':
      rows.push(req, <Select key="fmt" value={s.format || 'DDMMYYYY'} onChange={(v) => setQ((x) => { x.settings.format = v; })} options={[{ value: 'DDMMYYYY', label: 'DD/MM/YYYY' }, { value: 'MMDDYYYY', label: 'MM/DD/YYYY' }, { value: 'YYYYMMDD', label: 'YYYY/MM/DD' }]} />);
      break;
    case 'payment':
      rows.push(req,
        <label key="amt" className="col gap-4 t-body-s">Amount<input type="number" min={0} className="field sm" value={s.amount} onChange={(e) => setQ((x) => { x.settings.amount = +e.target.value; })} /></label>,
        <Select key="cur" value={s.currency || 'USD'} onChange={(v) => setQ((x) => { x.settings.currency = v; })} options={['USD', 'EUR', 'GBP', 'NGN', 'IDR', 'CAD'].map((c) => ({ value: c, label: c }))} />,
        <label key="lbl" className="col gap-4 t-body-s">Button<input className="field sm" value={s.label || ''} onChange={(e) => setQ((x) => { x.settings.label = e.target.value; })} /></label>,
        <p key="n" className="t-caption muted">Payments run in test mode until Stripe is connected under Connect.</p>);
      break;
    case 'matrix':
      rows.push(req,
        <span key="r" className="t-label-s">Rows</span>,
        ...q.rows.map((r, i) => <div key={r.id} className="row gap-4"><input className="field sm" value={r.label} onChange={(e) => setQ((x) => { x.rows[i].label = e.target.value; })} />{q.rows.length > 1 && <IconBtn icon="x" label="Remove row" onClick={() => setQ((x) => { x.rows.splice(i, 1); })} />}</div>),
        <button key="ar" className="add-choice t-body-s" style={{ color: 'var(--accent-600)', fontSize: 13 }} onClick={() => setQ((x) => { x.rows.push({ id: uid('r_'), label: `Row ${x.rows.length + 1}` }); })}>Add row</button>,
        <span key="c" className="t-label-s">Columns</span>,
        ...q.cols.map((c, i) => <div key={c.id} className="row gap-4"><input className="field sm" value={c.label} onChange={(e) => setQ((x) => { x.cols[i].label = e.target.value; })} />{q.cols.length > 1 && <IconBtn icon="x" label="Remove column" onClick={() => setQ((x) => { x.cols.splice(i, 1); })} />}</div>),
        <button key="ac" className="add-choice" style={{ color: 'var(--accent-600)', fontSize: 13 }} onClick={() => setQ((x) => { x.cols.push({ id: uid('k_'), label: `Column ${x.cols.length + 1}` }); })}>Add column</button>);
      break;
    case 'multi_page':
      rows.push(<span key="f" className="t-label-s">Fields</span>,
        ...(q.fields || []).map((f, i) => <div key={f.id} className="row gap-4"><input className="field sm" value={f.label} onChange={(e) => setQ((x) => { x.fields[i].label = e.target.value; })} /><button className="icon-btn" title="Required" style={{ color: f.required ? 'var(--accent-500)' : 'var(--q-text-tertiary)' }} onClick={() => setQ((x) => { x.fields[i].required = !f.required; })}>*</button>{q.fields.length > 1 && <IconBtn icon="x" label="Remove" onClick={() => setQ((x) => { x.fields.splice(i, 1); })} />}</div>),
        <button key="af" className="add-choice" style={{ color: 'var(--accent-600)', fontSize: 13 }} onClick={() => setQ((x) => { x.fields.push({ id: uid('f_'), label: `Question ${x.fields.length + 1}` }); })}>Add field</button>);
      break;
    case 'welcome': case 'statement': case 'question_group':
      rows.push(<label key="b" className="col gap-4 t-body-s">Button<input className="field sm" maxLength={24} value={s.button || ''} onChange={(e) => setQ((x) => { x.settings.button = e.target.value; })} /><Counter value={s.button} /></label>);
      break;
    case 'ai_followup': {
      rows.push(
        <label key="src" className="col gap-4 t-body-s">Follow up on<Select value={s.source || ''} onChange={(v) => setQ((x) => { x.settings.source = v; })} options={[{ value: '', label: 'Previous question' }, ...content.questions.filter((x) => x.id !== q.id && !NO_ANSWER.has(x.type)).map((x, i) => ({ value: x.id, label: x.title || `Question ${i + 1}` }))]} /></label>,
        <label key="g" className="col gap-4 t-body-s">Goal<textarea className="textarea" style={{ minHeight: 70 }} value={s.goal || ''} onChange={(e) => setQ((x) => { x.settings.goal = e.target.value; })} /></label>, req);
      break;
    }
    default: rows.push(req);
  }
  return <>{rows.filter(Boolean)}</>;
}

function RightPanel({ sel }) {
  const { content, update, canEdit } = useForm();
  const [tab, setTab] = useState('content');
  const q = content.questions.find((x) => x.id === sel);
  const ending = content.endings.find((x) => x.id === sel);
  const setQ = (fn) => update((c) => { const x = c.questions.find((y) => y.id === sel); if (x) fn(x); });
  const setE = (fn) => update((c) => { const x = c.endings.find((y) => y.id === sel); if (x) fn(x); });
  const eRef = useRef(null);
  const [eMedia, setEMedia] = useState(false);
  return (
    <aside className="ed-right" aria-label="Question settings">
      <div className="rp-tabs" role="tablist">
        {[['content', 'Content'], ['design', 'Design']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={cx('tab', tab === k && 'on')} onClick={() => setTab(k)}>{l}<span className="bar" /></button>)}
      </div>
      <div className="scroll" style={!canEdit ? { pointerEvents: 'none', opacity: .6 } : undefined}>
        {tab === 'design' ? <DesignPanel /> : q ? (
          <>
            <div className="rp-sec">
              <span className="rp-title">Question</span>
              <Seg value={q.type === 'video' ? 'video' : 'text'} onChange={(v) => setQ((x) => { if (v === 'video') { Object.assign(x, convertType(x, 'video')); } else if (x.type === 'video') { Object.assign(x, convertType(x, 'short_text')); } })} options={[{ value: 'text', label: 'Text', icon: 'text' }, { value: 'video', label: 'Video', icon: 'image' }]} />
              {q.type === 'video' && <input className="field sm" placeholder="Video URL (YouTube, Vimeo, .mp4)" value={q.media?.url || ''} onChange={(e) => setQ((x) => { x.media = { kind: 'video', url: e.target.value }; })} />}
            </div>
            <div className="rp-sec"><Select value={q.type} onChange={(t) => setQ((x) => { const n = convertType(x, t); Object.keys(x).forEach((k) => delete x[k]); Object.assign(x, n); })} options={TYPE_OPTIONS} search width={232} /></div>
            <div className="rp-sec" style={{ gap: 2 }}><span className="rp-title" style={{ marginBottom: 6 }}>Settings</span><QuestionSettings q={q} /></div>
            {!NO_ANSWER.has(q.type) && q.type !== 'conversation_starter' && <ConversationSection q={q} />}
            {q.type !== 'video' && <MediaSection q={q} setQ={setQ} />}
          </>
        ) : ending ? (
          <>
            <div className="rp-sec"><Select value={ending.type} onChange={(t) => setE((x) => { Object.assign(x, newEnding(t === 'redirect' ? 'redirect' : 'end'), { id: x.id }); })} options={[{ value: 'end', label: 'End Screen', tile: <QType type="statement" tile /> }, { value: 'redirect', label: 'Redirect to URL', tile: <QType type="redirect" tile /> }]} /></div>
            {ending.type === 'end' && (
              <div className="rp-sec" style={{ gap: 6 }}>
                <span className="rp-title">Settings</span>
                <SettingRow label="Social share icons"><Toggle on={!!ending.social} onChange={(v) => setE((x) => { x.social = v; })} label="Social share icons" /></SettingRow>
                <SettingRow label="Button"><Toggle on={!!ending.button?.show} onChange={(v) => setE((x) => { x.button = { ...x.button, show: v }; })} label="Button" /></SettingRow>
                {ending.button?.show && <><input className="field sm" maxLength={24} value={ending.button.label || ''} onChange={(e) => setE((x) => { x.button.label = e.target.value; })} aria-label="Button label" /><Counter value={ending.button.label} /></>}
                {ending.button?.show && <SettingRow label="Button link"><Toggle on={!!ending.button?.linkOn} onChange={(v) => setE((x) => { x.button.linkOn = v; if (!v) x.button.link = ''; })} label="Button link" /></SettingRow>}
                {ending.button?.show && ending.button?.linkOn && <input className="field sm" placeholder="https://" value={ending.button.link || ''} onChange={(e) => setE((x) => { x.button.link = e.target.value; })} aria-label="Button link" />}
              </div>
            )}
            {ending.type === 'end' && (
              <div className="rp-sec">
                <div className="row between"><span className="rp-title">Image or video</span>{ending.media?.url ? <IconBtn icon="trash" label="Remove" onClick={() => setE((x) => { delete x.media; })} /> : <span ref={eRef}><IconBtn icon="plus" label="Add media" boxed onClick={() => setEMedia(true)} /></span>}</div>
                <MediaGallery anchor={eRef} open={eMedia} onClose={() => setEMedia(false)} onPick={(m) => setE((x) => { x.media = m; })} />
              </div>
            )}
          </>
        ) : <p className="t-body-s muted" style={{ padding: 16 }}>Select a question to see its settings.</p>}
      </div>
    </aside>
  );
}

/* ---------------- Picture tile actions (TF 049) ---------------- */
function TileActions({ tile, q, onClose }) {
  const { update } = useForm();
  const [gallery, setGallery] = useState(!tile.image);
  const [editor, setEditor] = useState(false);
  const anchor = useRef(document.getElementById('tile-anchor'));
  const setC = (fn) => update((c) => { const x = c.questions.find((y) => y.id === q.id); const ch = x?.choices.find((y) => y.id === tile.id); if (ch) fn(ch, x); });
  return (
    <>
      {!gallery && !editor && (
        <Popover anchor={anchor} open onClose={onClose} width={200}>
          <div className="col gap-6" style={{ padding: 4 }}>
            <input className="field sm" placeholder="Label" value={tile.label} autoFocus onChange={(e) => setC((c) => { c.label = e.target.value; })} aria-label="Choice label" />
            <Menu onClose={() => {}} items={[
              { label: tile.image ? 'Replace image' : 'Add image', icon: 'image', onClick: () => setGallery(true) },
              ...(tile.image ? [{ label: 'Edit image', icon: 'settings', onClick: () => setEditor(true) }] : []),
              { label: 'Delete choice', icon: 'trash', danger: true, onClick: () => { update((c) => { const x = c.questions.find((y) => y.id === q.id); x.choices = x.choices.filter((y) => y.id !== tile.id); }); onClose(); } },
            ]} />
          </div>
        </Popover>
      )}
      <MediaGallery anchor={anchor} open={gallery} allowVideo={false} onClose={() => { setGallery(false); if (!tile.image) onClose(); }} onPick={(m) => { setC((c) => { c.image = m.url; if (!c.label && m.alt) c.label = m.alt; }); setGallery(false); }} />
      <ImageEditor anchor={anchor} open={editor} onClose={() => { setEditor(false); onClose(); }} value={tile} onSave={(v) => setC((c) => { c.filter = v.filter; c.transform = v.transform; })} />
    </>
  );
}

/* ---------------- Page ---------------- */
export default function Create() {
  const { content, update, canEdit, form } = useForm();
  const app = useApp();
  const [sel, setSel] = useState(() => content.questions[0]?.id || content.endings[0]?.id);
  const [mobile, setMobile] = useState(false);
  const [modal, setModal] = useState(null);
  const [tile, setTile] = useState(null);
  const a11yRef = useRef(null);
  const [a11y, setA11y] = useState(false);
  useEffect(() => { if (!content.questions.length && canEdit && !sessionStorage.getItem('qwery.addShown.' + form.id)) { sessionStorage.setItem('qwery.addShown.' + form.id, '1'); setModal('add'); } }, []); // eslint-disable-line
  const add = (x) => {
    if (x.focus) { setSel(x.focus); return; }
    if (x.ending) { const e = newEnding(x.ending); update((c) => { c.endings.push(e); }); setSel(e.id); return; }
    const nq = newQuestion(x.type);
    update((c) => { const i = c.questions.findIndex((y) => y.id === sel); c.questions.splice(i >= 0 ? i + 1 : c.questions.length, 0, nq); });
    setSel(nq.id);
  };
  const q = content.questions.find((x) => x.id === sel);
  return (
    <div className="ed-body">
      <IconSources />
      <QuestionList sel={sel} setSel={setSel} />
      <div className="ed-center">
        <div className="canvas-toolbar" role="toolbar" aria-label="Canvas tools">
          <Btn kind="secondary" icon="plus" onClick={() => setModal('add')} disabled={!canEdit}>Add content</Btn>
          <span className="vdiv" />
          <IconBtn size="lg" icon="phone" label={mobile ? 'Desktop view' : 'Mobile view'} active={mobile} onClick={() => setMobile((m) => !m)} />
          <IconBtn size="lg" icon="play" label="Preview" onClick={() => setModal('preview')} />
          <span className="vdiv" />
          <span ref={a11yRef}><IconBtn size="lg" icon="accessibility" label="Accessibility check" active={a11y} onClick={() => setA11y((o) => !o)} /></span>
          <IconBtn size="lg" icon="sparkle" label="Create with AI" onClick={() => setModal('ai')} disabled={!canEdit} />
          <IconBtn size="lg" icon="translate" label="Language" onClick={() => setModal('lang')} />
          <IconBtn size="lg" icon="settings" label="Form settings" onClick={() => setModal('settings')} />
          {(app.org.plan || 'free') === 'free' && <span className="grow" />}
        </div>
        <AccessibilityPanel anchor={a11yRef} open={a11y} onClose={() => setA11y(false)} />
        <div className="ed-stage">
          <span id="tile-anchor" style={{ position: 'absolute', left: '50%', top: '40%' }} />
          <Canvas sel={sel} mobile={mobile} onTile={(id) => setTile(q?.choices.find((c) => c.id === id))} />
        </div>
      </div>
      <RightPanel sel={sel} />
      {modal === 'add' && <AddContentModal onClose={() => setModal(null)} onAdd={add} />}
      {modal === 'ai' && <AddContentModal initialTab="ai" onClose={() => setModal(null)} onAdd={add} />}
      {modal === 'settings' && <FormSettingsModal onClose={() => setModal(null)} />}
      {modal === 'lang' && <FormSettingsModal initial="language" onClose={() => setModal(null)} />}
      {modal === 'preview' && <PreviewModal onClose={() => setModal(null)} startAt={q?.id} initial={mobile ? 'mobile' : 'desktop'} />}
      {tile && q && <TileActions key={tile.id} tile={q.choices.find((c) => c.id === tile.id) || tile} q={q} onClose={() => setTile(null)} />}
    </div>
  );
}
