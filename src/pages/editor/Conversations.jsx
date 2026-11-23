import { useEffect, useRef, useState } from 'react';
import { ai } from '../../components/FormRunner.jsx';
import { Icon } from '../../lib/icons.jsx';
import { answerText, NO_ANSWER } from '../../lib/questions.js';
import { navigate } from '../../lib/router.js';
import { db } from '../../lib/sb.js';
import { useApp } from '../../lib/store.jsx';
import { Avatar, Btn, copy, cx, fmtTime, IconBtn, MenuButton, QType, Seg, timeAgo, useToast } from '../../ui.jsx';
import { useForm } from '../FormShell.jsx';

export function ConversationsView({ formId, orgId, selected, basePath, onUnread }) {
  const app = useApp();
  const toast = useToast();
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('open');
  const [msgs, setMsgs] = useState([]);
  const [resp, setResp] = useState(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const endRef = useRef(null);
  const cur = list?.find((c) => c.id === selected);

  const loadList = async () => {
    let q = db.from('conversations').select('*,forms!inner(id,title,org_id,published_content,content),responses(answers,created_at),messages(body,sender,created_at)').order('last_message_at', { ascending: false }).limit(200);
    if (formId) q = q.eq('form_id', formId);
    if (orgId) q = q.eq('forms.org_id', orgId);
    const { data } = await q;
    const sorted = (data || []).map((c) => ({ ...c, last: [...(c.messages || [])].sort((a, b) => a.created_at.localeCompare(b.created_at)).pop() }));
    setList(sorted);
    onUnread?.(sorted.filter((c) => c.unread_by_creator > 0).length);
  };
  const loadThread = async (id) => {
    const { data } = await db.from('messages').select('*').eq('conversation_id', id).order('created_at');
    setMsgs((m) => (JSON.stringify(m.map((x) => x.id)) === JSON.stringify((data || []).map((x) => x.id)) ? m : data || []));
  };
  useEffect(() => { loadList(); const t = setInterval(loadList, 8000); return () => clearInterval(t); }, [formId, orgId]); // eslint-disable-line
  useEffect(() => {
    if (!selected) return;
    loadThread(selected); setSuggestion('');
    db.from('conversations').update({ unread_by_creator: 0 }).eq('id', selected).then(() => setList((l) => l?.map((c) => (c.id === selected ? { ...c, unread_by_creator: 0 } : c))));
    const t = setInterval(() => loadThread(selected), 4000);
    return () => clearInterval(t);
  }, [selected]); // eslint-disable-line
  useEffect(() => { if (cur?.responses) setResp(cur.responses); else setResp(null); }, [cur]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);
  useEffect(() => { if (!selected && list?.length) { const first = list.find((c) => (filter === 'open' ? c.status === 'open' : c.status === 'resolved')) || list[0]; if (first && window.innerWidth > 820) navigate(`${basePath}/${first.id}`, { replace: true }); } }, [list, selected]); // eslint-disable-line

  const send = async (body = text) => {
    if (!body.trim() || !cur) return;
    setSending(true);
    try {
      const { data } = await db.from('messages').insert({ conversation_id: cur.id, sender: 'creator', author_id: app.user.id, body: body.trim() }).select('*').single();
      setMsgs((m) => [...m, data]); setText(''); setSuggestion('');
      if (cur.status === 'resolved') await db.from('conversations').update({ status: 'open' }).eq('id', cur.id);
      loadList();
    } catch (e) { toast(e.message, { error: true }); } finally { setSending(false); }
  };
  const suggest = async () => {
    if (!cur) return;
    setSuggesting(true);
    try {
      const content = cur.forms.published_content || cur.forms.content;
      const answers = (content.questions || []).filter((q) => !NO_ANSWER.has(q.type)).map((q) => ({ question: q.title, answer: answerText(q, cur.responses?.answers?.[q.id]) }));
      const d = await ai('reply', { form: cur.forms.title, answers, messages: msgs.map((m) => ({ from: m.sender, text: m.body })), org: app.org.name });
      setSuggestion(d.text);
    } catch (e) { toast(e.message, { error: true }); } finally { setSuggesting(false); }
  };
  const setStatus = async (status) => { await db.from('conversations').update({ status }).eq('id', cur.id); toast(status === 'resolved' ? 'Marked as resolved' : 'Reopened', { ok: true }); loadList(); };
  const respondentLink = cur ? `${location.origin}/c/${cur.token}` : '';
  const shown = (list || []).filter((c) => (filter === 'open' ? c.status === 'open' : c.status === 'resolved'));
  const content = cur ? cur.forms.published_content || cur.forms.content : null;

  return (
    <div className="conv-wrap">
      <aside className="conv-list" style={selected && window.innerWidth <= 820 ? { display: 'none' } : undefined}>
        <Seg value={filter} onChange={setFilter} options={[{ value: 'open', label: `Open (${(list || []).filter((c) => c.status === 'open').length})` }, { value: 'resolved', label: 'Resolved' }]} />
        {!list ? [0, 1, 2].map((i) => <div key={i} className="skel" style={{ height: 76 }} />) : !shown.length ? (
          <div className="empty" style={{ padding: '40px 10px' }}><span className="ic"><Icon name="message" /></span><p className="t-body-s">{filter === 'open' ? 'No open conversations' : 'Nothing resolved yet'}</p><p className="t-caption">When respondents accept your invitation — or you start one from Results — it lands here.</p></div>
        ) : shown.map((c) => (
          <button key={c.id} className={cx('thread', c.id === selected && 'sel')} onClick={() => navigate(`${basePath}/${c.id}`)}>
            <Avatar name={c.respondent_label} className="grey" size="lg" />
            <span className="col grow" style={{ minWidth: 0, gap: 2 }}>
              <span className="row between"><span className={cx('ellipsis', c.unread_by_creator ? 't-label-l' : 't-body-m')} style={{ fontSize: c.unread_by_creator ? 17 : 15 }}>{c.respondent_label}</span><span className="t-caption muted">{timeAgo(c.last_message_at)}</span></span>
              <span className="t-caption muted ellipsis">{c.forms.title}</span>
              <span className="row gap-6"><span className={cx('ellipsis grow t-body-s', c.unread_by_creator ? '' : 'muted')} style={{ fontWeight: c.unread_by_creator ? 500 : 400 }}>{c.last ? `${c.last.sender === 'creator' ? 'You: ' : ''}${c.last.body}` : 'No messages yet'}</span>{c.unread_by_creator > 0 && <span className="unread" />}</span>
            </span>
          </button>
        ))}
      </aside>
      <section className="conv-main" aria-label="Conversation">
        {!cur ? <div className="empty" style={{ margin: 'auto' }}><span className="ic"><Icon name="inbox" /></span><p>Select a conversation</p></div> : (
          <>
            <div className="row gap-12" style={{ padding: '14px 20px', borderBottom: '1px solid var(--q-border-default)' }}>
              {window.innerWidth <= 820 && <IconBtn icon="arrow-left" label="Back" onClick={() => navigate(basePath)} />}
              <Avatar name={cur.respondent_label} className="grey" />
              <span className="col grow" style={{ minWidth: 0 }}><span className="t-label-l">{cur.respondent_label}</span><span className="t-caption muted ellipsis">{cur.forms.title} · started {timeAgo(cur.created_at)} ago</span></span>
              <Btn kind="secondary" icon="link" onClick={() => { copy(respondentLink); toast('Respondent link copied — send it to keep chatting', { ok: true }); }}>Copy link</Btn>
              {cur.status === 'open' ? <Btn icon="check" onClick={() => setStatus('resolved')}>Resolve</Btn> : <Btn kind="secondary" onClick={() => setStatus('open')}>Reopen</Btn>}
              <MenuButton trigger={<IconBtn icon="more" label="More" />} items={[{ label: 'View response', onClick: () => navigate(`/forms/${cur.form_id}/results/responses`) }, { label: 'Open form', onClick: () => navigate(`/forms/${cur.form_id}/create`) }]} />
            </div>
            <div className="row" style={{ flex: 1, minHeight: 0 }}>
              <div className="col" style={{ flex: 1, minWidth: 0 }}>
                <div className="msgs">
                  {resp && (
                    <div className="col gap-6" style={{ alignSelf: 'center', background: '#fff', borderRadius: 14, padding: '12px 14px', maxWidth: 420, width: '100%', border: '1px solid var(--q-border-default)' }}>
                      <span className="t-caption muted">Answered {timeAgo(resp.created_at)} ago</span>
                      {(content.questions || []).filter((q) => !NO_ANSWER.has(q.type) && resp.answers?.[q.id] != null && resp.answers[q.id] !== '').slice(0, 6).map((q) => (
                        <div key={q.id} className="row gap-8" style={{ alignItems: 'flex-start' }}><QType type={q.type} small /><span className="col"><span className="t-caption muted">{q.title}</span><span className="t-body-s">{answerText(q, resp.answers[q.id])}</span></span></div>
                      ))}
                    </div>
                  )}
                  {!msgs.length && <p className="t-body-s muted" style={{ textAlign: 'center' }}>No messages yet. Say hello — they’ll see it next time they open their conversation link.</p>}
                  {msgs.map((m) => (
                    <div key={m.id} className={cx('msg', m.sender === 'creator' ? 'me' : m.sender === 'ai' ? 'ai' : 'them')}>
                      {m.sender !== 'creator' ? <Avatar name={m.sender === 'ai' ? 'AI' : cur.respondent_label} className="grey" /> : <Avatar name={app.profile?.name} color="var(--accent-100)" />}
                      <div className="col" style={{ alignItems: m.sender === 'creator' ? 'flex-end' : 'flex-start' }}>
                        <span className="meta">{m.sender === 'creator' ? 'You' : cur.respondent_label} · {fmtTime(m.created_at)}</span>
                        <div className="bubble">{m.body}</div>
                      </div>
                    </div>
                  ))}
                  {suggestion && (
                    <div className="msg ai">
                      <span className="avatar" style={{ background: 'var(--ink-950)', color: '#fff' }}><Icon name="sparkle" size={14} /></span>
                      <div className="col gap-6"><span className="meta">Qwery AI · suggestion</span><div className="bubble">{suggestion}</div>
                        <div className="row gap-6"><Btn kind="accent" onClick={() => send(suggestion)} loading={sending}>Send</Btn><Btn kind="secondary" onClick={() => { setText(suggestion); setSuggestion(''); }}>Edit</Btn><button className="t-caption muted" onClick={() => setSuggestion('')}>Dismiss</button></div>
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
                <form className="composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
                  <Icon name="plus" />
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Reply to ${cur.respondent_label}…`} aria-label="Reply" />
                  <IconBtn icon="sparkle" label="Suggest a reply" onClick={suggest} disabled={suggesting} />
                  <button type="submit" className={cx('send', text.trim() && 'ready')} aria-label="Send" disabled={sending || !text.trim()}>{sending ? <span className="spin" style={{ width: 14, height: 14 }} /> : <Icon name="send" size={18} />}</button>
                </form>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function Conversations({ sub }) {
  const { form, setUnread } = useForm();
  return <ConversationsView formId={form.id} selected={sub} basePath={`/forms/${form.id}/conversations`} onUnread={setUnread} />;
}
