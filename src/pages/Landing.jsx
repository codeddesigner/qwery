// Marketing landing page — built from the "Qwery · Landing page" frame (Figma 147:86).
import { useState } from 'react';
import { GoogleLogo, Icon, Logo } from '../lib/icons.jsx';
import { DEFAULT_THEME, themeVars } from '../lib/questions.js';
import { Link, navigate } from '../lib/router.js';
import { auth } from '../lib/sb.js';
import { useApp } from '../lib/store.jsx';
import { cx } from '../ui.jsx';

const SALES = 'mailto:sales@qwery.to?subject=Qwery%20for%20my%20team';
// Theme variables for the live respondent mock-ups; the surface colour comes from the card, not the theme.
const THEME = (() => { const v = themeVars(DEFAULT_THEME); delete v.background; return v; })();

const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

/* ---------- small building blocks (mirror the Figma components) ---------- */

const BADGE_ICON = { choice: 'list', contact: 'user', rating: 'scale', text: 'text', conversation: 'message' };
function Badge({ cat, n }) {
  return <span className={cx('qtype', 'cat-' + cat)}><Icon name={BADGE_ICON[cat]} />{n != null && <span>{n}</span>}</span>;
}

function Eyebrow({ cat, children, center }) {
  return <div className={cx('lp-eyebrow', center && 'center')}>{cat && <Badge cat={cat} />}<span>{children}</span></div>;
}

function Chip({ kind, children }) {
  const map = {
    start: ['dash', 'plus'], unread: ['conv', 'message'], open: ['grey', 'message'], resolved: ['ok', 'check'],
  };
  const [cls, icon] = map[kind];
  return <span className={cx('chip', cls)}><Icon name={icon} />{children}{kind === 'unread' && <i className="lp-dot" />}</span>;
}

function Bubble({ me, meta, children }) {
  return (
    <div className={cx('lp-bubble', me && 'me')}>
      {meta && <span className="meta">{meta}</span>}
      <p>{children}</p>
    </div>
  );
}

function Accordion({ items, open, setOpen }) {
  return (
    <div className="lp-acc">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <div key={it.t} className={cx('item', on && 'on')}>
            <button className="head" aria-expanded={on} onClick={() => setOpen(i)}>
              <Icon name={it.icon} size={18} />
              <span>{it.t}</span>
              <Icon name={on ? 'chevron-up' : 'chevron-down'} size={14} className="chev" />
            </button>
            <div className="body" aria-hidden={!on}><div><p>{it.d}</p></div></div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- hero ---------- */

const HERO_CHOICES = ['A friend recommended you', 'Searching online', 'Something else'];
const HERO_REPLIES = [
  ['Who should we thank? We’d love to send them something.', 'My colleague Ada — she uses it for onboarding.'],
  ['What were you searching for? Happy to point you the right way.', 'Something for customer feedback.'],
  ['Tell me more — what are you hoping to solve?', 'Our surveys get answers but no context.'],
];

function HeroBento() {
  const [pick, setPick] = useState(1);
  const [ask, reply] = HERO_REPLIES[pick];
  return (
    <div className="lp-bento hero" style={THEME} aria-label="Example: a question that starts a conversation">
      <div className="lp-card lp-q">
        <div className="q"><Badge cat="choice" n={2} /><span>What brought you to us today?</span></div>
        {HERO_CHOICES.map((c, i) => (
          <button key={c} className={cx('choice', pick === i && 'on')} onClick={() => setPick(i)} aria-pressed={pick === i}>
            <span className="key">{'ABC'[i]}</span><span className="lbl">{c}</span>
            {pick === i && <Icon name="check" className="tick" />}
          </button>
        ))}
        <span className="ok-btn">OK <Icon name="check" /></span>
      </div>
      <div key={pick} className="lp-card lp-conv">
        <Chip kind="start">Start conversation</Chip>
        <Bubble meta="You · now">{ask}</Bubble>
        <Bubble me>{reply}</Bubble>
      </div>
    </div>
  );
}

/* ---------- feature: build ---------- */

const BUILD_ITEMS = [
  { icon: 'list', t: 'Every question type you need', d: 'Choices, ratings, files, payments, dates and more. Add them by typing “/” or one question at a time.' },
  { icon: 'logic', t: 'Logic that adapts to each answer', d: 'Jump, skip and score based on what people say, so everyone only sees the questions that matter to them.' },
  { icon: 'image', t: 'Your brand, your look', d: 'Fonts, colours, logos and backgrounds — or pull your brand straight from your website in one click.' },
];
const QUESTIONS = ['Which walking tour did you join?', 'How would you rate it?', 'Where can we send photos?', 'Anything else to add?'];

function BuildBento({ view }) {
  if (view === 1) {
    return (
      <div key="logic" className="lp-card lp-panel">
        <div className="lp-panel-head"><Icon name="logic" size={15} /><span>Logic</span></div>
        <div className="lp-rule">
          <span className="w">If</span>
          <div className="lp-select"><Badge cat="rating" n={2} /><span>How would you rate it?</span><Icon name="chevron-down" size={16} /></div>
          <div className="row gap-8"><div className="lp-select sm"><span>is less than</span><Icon name="chevron-down" size={16} /></div><div className="lp-select sm num"><span>3</span></div></div>
          <span className="w">then jump to</span>
          <div className="lp-select"><Badge cat="text" n={3} /><span>What could we do better?</span><Icon name="chevron-down" size={16} /></div>
        </div>
        <div className="lp-rule-foot"><Chip kind="start">Start conversation</Chip><span>when they answer</span></div>
      </div>
    );
  }
  if (view === 2) {
    const SW = ['#4D4DE1', '#191919', '#E0368C', '#08703D', '#EA6A1E'];
    return (
      <div key="brand" className="lp-card lp-panel">
        <div className="lp-panel-head"><Icon name="image" size={15} /><span>Design</span></div>
        <div className="lp-brand" style={{ ...THEME, '--t-answer': '#E0368C', '--t-answer-10': 'rgba(224,54,140,.1)', '--t-answer-30': 'rgba(224,54,140,.3)', '--t-answer-60': 'rgba(224,54,140,.6)', '--t-button': '#E0368C' }}>
          <span className="lp-brand-logo"><i />Juniper Tours</span>
          <p>How would you rate it?</p>
          <div className="row gap-4">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={cx('scale-cell', n === 4 && 'on')}>{n}</span>)}</div>
        </div>
        <div className="lp-swatches">{SW.map((c, i) => <span key={c} style={{ background: c }} className={cx(i === 2 && 'on')} />)}<span className="lp-swatch-add"><Icon name="plus" size={14} /></span></div>
      </div>
    );
  }
  return (
    <div key="types" className="lp-card lp-panel">
      <div className="lp-panel-head"><Icon name="plus" size={15} /><span>Add question</span></div>
      <div className="lp-select"><span className="qtile cat-choice"><Icon name="list" /></span><span>Multiple Choice</span><Icon name="chevron-down" size={16} /></div>
      {QUESTIONS.map((q, i) => (
        <div key={q} className={cx('lp-qitem', i === 1 && 'on')}>
          <Badge cat="choice" n={i + 1} /><span>{q}</span>{i === 1 && <Icon name="message" size={16} className="conv" />}
        </div>
      ))}
    </div>
  );
}

/* ---------- feature: conversations ---------- */

const CONV_ITEMS = [
  { icon: 'message', t: 'Start a chat from any answer', d: 'Reply to a respondent right from their answer. They get your message by email and can write back, with the full context kept in one thread.' },
  { icon: 'inbox', t: 'One inbox for every reply', d: 'Every conversation across every form lands in one place, with unread counts, filters and the answer that started it.' },
  { icon: 'sparkle', t: 'AI summaries for each thread', d: 'Catch up in seconds: Qwery summarises long threads and suggests a reply in your tone.' },
];
const THREADS = [
  { av: 'SR', n: 'Sage Rowan', a: 'Answered “Setup took a while”', chip: ['unread', '2 new'] },
  { av: 'MO', n: 'Mira Okafor', a: 'Rated onboarding 4/10', chip: ['open', '5 messages'] },
  { av: 'JL', n: 'Jonah Lee', a: 'Asked about the API', chip: ['resolved', 'Resolved'] },
];

function ConvBento({ view }) {
  if (view === 1) {
    return (
      <div key="inbox" className="lp-card lp-thread">
        <div className="lp-panel-head"><Icon name="inbox" size={15} /><span>Conversations</span><span className="lp-count">3</span></div>
        {THREADS.map((t, i) => (
          <div key={t.n} className={cx('lp-inbox-row', i === 0 && 'on')}>
            <span className="lp-av">{t.av}</span>
            <span className="n"><b>{t.n}</b><small>{t.a}</small></span>
            <Chip kind={t.chip[0]}>{t.chip[1]}</Chip>
          </div>
        ))}
      </div>
    );
  }
  if (view === 2) {
    return (
      <div key="ai" className="lp-card lp-thread">
        <div className="lp-head"><span className="lp-av">SR</span><span className="n"><b>Sage Rowan</b><small>Answered “Setup took a while”</small></span><Chip kind="open">5 messages</Chip></div>
        <div className="lp-ai">
          <span className="t"><Icon name="sparkle" size={15} />Summary</span>
          <p>Sage’s team struggled to connect their CRM on the first try. A setup guide fixed it; they’re now sending forms weekly.</p>
          <span className="t sub">Suggested reply</span>
          <p className="draft">Glad it’s working now! Want me to set up a 10-minute call to walk through automations?</p>
        </div>
      </div>
    );
  }
  return (
    <div key="thread" className="lp-card lp-thread">
      <div className="lp-head"><span className="lp-av">SR</span><span className="n"><b>Sage Rowan</b><small>Answered “Setup took a while”</small></span><Chip kind="open">5 messages</Chip></div>
      <Bubble meta="You">Thanks for being honest. What slowed you down?</Bubble>
      <Bubble me>Connecting our CRM took two tries.</Bubble>
      <Bubble>Got it. Here’s a 2-minute guide.</Bubble>
      <div className="lp-notify"><span>Email me when they reply</span><span className="toggle on" aria-hidden="true" /></div>
    </div>
  );
}

/* ---------- platform tabs ---------- */

const FORMS = [
  { n: 'Customer pulse', r: '1,284', c: '83%', v: '212', u: '2h ago', sw: '#b86b47' },
  { n: 'Event RSVP — Lagos meetup', r: '96', c: '91%', v: '14', u: 'Yesterday', sw: '#4d4de1' },
  { n: 'Product designer application', r: '41', c: '68%', v: '9', u: '3 days ago', sw: '#08703d' },
];

function PlatformBento({ tab }) {
  if (tab === 1) {
    return (
      <div key="c" className="lp-card lp-ws">
        <div className="lp-ws-head"><h3>Conversations</h3><span className="chip conv"><Icon name="message" />3 unread</span></div>
        {THREADS.map((t) => (
          <div key={t.n} className="lp-ws-row">
            <span className="lp-av">{t.av}</span><span className="name">{t.n}</span><span className="muted grow">{t.a}</span>
            <span className="muted">Customer pulse</span><Chip kind={t.chip[0]}>{t.chip[1]}</Chip>
          </div>
        ))}
      </div>
    );
  }
  if (tab === 2) {
    const stats = [['Views', '3,412'], ['Starts', '1,548'], ['Submissions', '1,284'], ['Completion rate', '83%']];
    const drop = [['Which walking tour did you join?', 100], ['How would you rate it?', 92], ['Where can we send photos?', 74], ['Anything else to add?', 61]];
    return (
      <div key="i" className="lp-card lp-ws">
        <div className="lp-ws-head"><h3>Insights · Customer pulse</h3><span className="chip grey">Last 30 days</span></div>
        <div className="lp-stats">{stats.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
        <div className="lp-drop">
          {drop.map(([q, p], i) => (
            <div key={q}><span className="q"><Badge cat={i === 1 ? 'rating' : 'choice'} n={i + 1} />{q}</span><span className="bar-track"><div style={{ width: p + '%' }} /></span><span className="p">{p}%</span></div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div key="f" className="lp-card lp-ws">
      <div className="lp-ws-head"><h3>My workspace</h3><button className="btn btn-primary" onClick={() => navigate('/signup')}><Icon name="message" size={16} />Create form</button></div>
      {FORMS.map((f, i) => (
        <div key={f.n} className={cx('lp-form-row', i === 0 && 'hover')}>
          <span className="sw" style={{ background: f.sw }} /><span className="name">{f.n}</span>
          <span>{f.r}</span><span>{f.c}</span><span>{f.v}</span><span>{f.u}</span><span><Icon name="apps" /></span><Icon name="more" />
        </div>
      ))}
    </div>
  );
}

/* ---------- static content ---------- */

const APPS = ['Google Sheets', 'Slack', 'Notion', 'HubSpot', 'Zapier', 'Salesforce', 'Airtable', 'Stripe'];
const TEAMS = [
  { cat: 'contact', t: 'Marketing', d: 'Lead forms that qualify and follow up in the same thread.' },
  { cat: 'rating', t: 'Product', d: 'Research surveys with AI summaries of every answer.' },
  { cat: 'text', t: 'People & HR', d: 'Applications and onboarding check-ins with replies.' },
  { cat: 'conversation', t: 'Customer success', d: 'NPS and feedback that turns into a real conversation.', dark: true },
];
const FAQ = [
  ['Is there a free plan?', 'Yes. The Free plan includes unlimited forms and 10 responses a month. Paid plans start at $29/month, or less when billed yearly.'],
  ['Can respondents reply to me?', 'Yes. When you start a conversation from an answer, the respondent gets your message by email with a private link. They can reply right away — no account needed — and the whole thread stays attached to their answer.'],
  ['How do conversations work?', 'Turn on conversations for a question, or set a rule like “score below 6”. Qwery then invites that person to chat from the thank-you screen, or you can reach out yourself from Results. Every reply lands in your Conversations inbox.'],
  ['Which tools does Qwery connect with?', 'Google Sheets, Slack, Notion, HubSpot, Zapier, Salesforce, Airtable and Stripe, plus webhooks and an API for everything else. New responses can be sent to any of them automatically.'],
  ['Can I use my own domain?', 'Every form gets a clean qwery.to link you can customise. Business plans can also serve forms from your own domain, like forms.yourcompany.com.'],
  ['Does Qwery support SSO and HIPAA?', 'SSO with SAML is available on the Business plan. For HIPAA and other compliance requirements, talk to our sales team about the Enterprise plan.'],
];
const STEPS = [
  { t: '01 — Build your form', d: 'Type it like a doc, or describe it and let AI draft it.' },
  { t: '02 — Share your link', d: 'Send qwery.to/your-form, embed it, or print a QR code.' },
  { t: '03 — Collect answers', d: 'Responses arrive live, with drop-off and summary insights.' },
  { t: '04 — Start a conversation', d: 'Reply to any answer and keep the thread in one inbox.' },
];

/* ---------- page ---------- */

export default function Landing() {
  const app = useApp();
  const authed = !!app.user;
  const start = () => navigate(authed ? '/workspace' : '/signup');
  const [buildOpen, setBuildOpen] = useState(0);
  const [convOpen, setConvOpen] = useState(0);
  const [tab, setTab] = useState(0);
  const [faq, setFaq] = useState(0);

  const FOOT = [
    ['Product', [['Forms', () => scrollTo('product')], ['Conversations', () => scrollTo('conversations')], ['Insights', () => { setTab(2); scrollTo('platform'); }], ['Templates', () => scrollTo('teams')], ['Pricing', () => navigate(authed ? '/plans' : '/signup')]]],
    ['Integrations', [['Google Sheets', start], ['Slack', start], ['Notion', start], ['HubSpot', start], ['All integrations', () => navigate(authed ? '/apps' : '/signup')]]],
    ['Resources', [['Help center', () => scrollTo('faq')], ['Guides', () => scrollTo('how')], ['Blog', () => scrollTo('product')], ['Status', () => scrollTo('faq')]]],
    ['Company', [['About', () => scrollTo('top')], ['Careers', () => { location.href = 'mailto:careers@qwery.to'; }], ['Terms', () => navigate('/signup')], ['Privacy', () => navigate('/signup')]]],
  ];

  return (
    <div className="lp" id="top">
      <div className="lp-announce">
        <Chip kind="start">Start conversation</Chip>
        <span>New: AI summaries for every conversation.</span>
        <button className="lp-link" onClick={() => { setConvOpen(2); scrollTo('conversations'); }}>Learn more <Icon name="arrow-right" size={16} /></button>
      </div>

      <nav className="lp-nav" aria-label="Main">
        <Link to="/" aria-label="Qwery home"><Logo height={24} /></Link>
        <div className="tabs">
          <button className="toptab" onClick={() => scrollTo('product')}>Product</button>
          <button className="toptab" onClick={() => scrollTo('teams')}>Templates</button>
          <button className="toptab" onClick={() => (authed ? navigate('/plans') : scrollTo('faq'))}>Pricing</button>
          <button className="toptab" onClick={() => scrollTo('how')}>Blog</button>
        </div>
        <div className="actions">
          <a className="btn btn-l btn-ghost lp-sales" href={SALES}>Talk to sales</a>
          {authed ? (
            <button className="btn btn-l btn-primary" onClick={() => navigate('/workspace')}>Go to workspace</button>
          ) : (
            <>
              <Link to="/login" className="btn btn-l btn-secondary">Log in</Link>
              <button className="btn btn-l btn-primary" onClick={() => navigate('/signup')}>Get started for free</button>
            </>
          )}
        </div>
      </nav>

      <header className="lp-hero">
        <div className="lp-hero-copy">
          <Eyebrow cat="conversation">Forms that talk back</Eyebrow>
          <h1>Questions that<br className="lp-br" /> start conversations</h1>
          <p className="lead">Qwery turns forms into two-way conversations. Ask anything, hear the answer, then reply right from it.</p>
          {authed ? (
            <div className="lp-signup"><button className="btn btn-primary btn-l" onClick={start}>Go to your workspace <Icon name="arrow-right" size={18} /></button></div>
          ) : (
            <>
              <div className="lp-signup">
                <button className="lp-sso" onClick={() => auth.oauth('google')}><GoogleLogo size={18} />Sign up with Google</button>
                <button className="lp-sso" onClick={() => auth.oauth('azure')}><span className="ms" aria-hidden="true"><i /><i /><i /><i /></span>Sign up with Microsoft</button>
              </div>
              <p className="lp-email"><Link to="/signup/email">Sign up free with email.</Link><span>No credit card required</span></p>
            </>
          )}
        </div>
        <HeroBento />
      </header>

      <section className="lp-apps" aria-label="Integrations">
        <p>Works with the tools you already use</p>
        <ul>{APPS.map((a) => <li key={a}>{a}</li>)}</ul>
      </section>

      <section className="lp-feature" id="product">
        <div className="lp-text">
          <Eyebrow cat="choice">Forms</Eyebrow>
          <h2>A better way to ask<br className="lp-br" /> your questions</h2>
          <Accordion items={BUILD_ITEMS} open={buildOpen} setOpen={setBuildOpen} />
        </div>
        <div className="lp-bento" style={THEME}><BuildBento view={buildOpen} /></div>
      </section>

      <section className="lp-feature flip" id="conversations">
        <div className="lp-bento accent"><ConvBento view={convOpen} /></div>
        <div className="lp-text">
          <Eyebrow cat="conversation">Conversations</Eyebrow>
          <h2>Turn answers into<br className="lp-br" /> conversations</h2>
          <Accordion items={CONV_ITEMS} open={convOpen} setOpen={setConvOpen} />
        </div>
      </section>

      <section className="lp-center" id="how">
        <Eyebrow center>How it works</Eyebrow>
        <h2>From question to conversation.<br className="lp-br" /> No extra tools required.</h2>
        <div className="lp-steps" style={THEME}>
          <div className="lp-step">
            <div className="lp-tile">
              <div className="lp-card lp-mini">
                <div className="lp-select"><span className="qtile cat-choice"><Icon name="list" /></span><span>Rating</span><Icon name="chevron-down" size={16} /></div>
                <span className="lp-hint">Type <span className="key-hint">press <b>/</b></span> to add a question</span>
              </div>
            </div>
            <h3>{STEPS[0].t}</h3><p>{STEPS[0].d}</p>
          </div>
          <div className="lp-step">
            <div className="lp-tile">
              <div className="lp-card lp-mini">
                <span className="lp-url"><Icon name="link" size={13} />qwery.to/event-feedback</span>
                <button className="btn btn-secondary" onClick={(e) => { e.currentTarget.textContent = 'Copied!'; }}>Copy link</button>
              </div>
            </div>
            <h3>{STEPS[1].t}</h3><p>{STEPS[1].d}</p>
          </div>
          <div className="lp-step">
            <div className="lp-tile">
              <div className="lp-card lp-mini">
                <b className="lp-mini-t">128 responses this week</b>
                <div className="lp-scale">{[6, 7, 8, 9, 10].map((n) => <span key={n} className={cx('scale-cell', n === 9 && 'on')}>{n}</span>)}</div>
              </div>
            </div>
            <h3>{STEPS[2].t}</h3><p>{STEPS[2].d}</p>
          </div>
          <div className="lp-step">
            <div className="lp-tile accent">
              <div className="lp-card lp-mini">
                <Chip kind="unread">3 new messages</Chip>
                <Bubble me>Can you tell me more?</Bubble>
              </div>
            </div>
            <h3>{STEPS[3].t}</h3><p>{STEPS[3].d}</p>
          </div>
        </div>
      </section>

      <section className="lp-center" id="teams">
        <Eyebrow center>Built for every team</Eyebrow>
        <h2>One tool for every question<br className="lp-br" /> your team needs to ask.</h2>
        <div className="lp-teams">
          {TEAMS.map((t) => (
            <div key={t.t} className={cx('lp-team', t.dark && 'dark')}>
              <Badge cat={t.cat} />
              <h3>{t.t}</h3>
              <p>{t.d}</p>
              <button className={cx('btn', t.dark ? 'btn-secondary' : 'btn-ghost')} onClick={start}>See templates <Icon name="arrow-right" size={16} /></button>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-center" id="platform">
        <Eyebrow center>The Qwery platform</Eyebrow>
        <h2>There’s more to forms<br className="lp-br" /> than collecting answers</h2>
        <div className="lp-tabs" role="tablist">
          {['Forms', 'Conversations', 'Insights'].map((t, i) => (
            <button key={t} role="tab" aria-selected={tab === i} className={cx('toptab', tab === i && 'on')} onClick={() => setTab(i)}>{t}</button>
          ))}
        </div>
        <div className="lp-bento wide"><PlatformBento tab={tab} /></div>
      </section>

      <section className="lp-center lp-faq-wrap" id="faq">
        <h2 className="faq-title">Frequently asked questions</h2>
        <div className="lp-faq">
          {FAQ.map(([q, a], i) => {
            const on = faq === i;
            return (
              <div key={q} className={cx('q', on && 'on')}>
                <button className="h" aria-expanded={on} onClick={() => setFaq(on ? -1 : i)}><span>{q}</span><Icon name={on ? 'chevron-up' : 'chevron-down'} size={16} /></button>
                <div className="a" aria-hidden={!on}><div><p>{a}</p></div></div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="lp-center lp-cta">
        <Eyebrow center>Get started</Eyebrow>
        <h2 className="big">From the first question<br className="lp-br" /> to the follow-up</h2>
        <p className="lead">Forms, conversations and insights in one place.</p>
        <div className="row gap-8 lp-cta-btns">
          <button className="btn btn-l btn-primary" onClick={start}>Start for free <Icon name="arrow-right" size={20} /></button>
          <a className="btn btn-l btn-secondary" href={SALES}>Talk to sales</a>
        </div>
        <div className="lp-states">
          <div className="lp-tile"><div className="lp-card lp-status"><Chip kind="resolved">Resolved</Chip><b>Answer received</b></div></div>
          <div className="lp-tile accent"><div className="lp-card lp-status"><Chip kind="start">Start conversation</Chip><b>Conversation started</b></div></div>
          <div className="lp-tile"><div className="lp-card lp-status"><Chip kind="unread">3 new messages</Chip><b>Waiting for reply</b></div></div>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="inner">
          <div className="top">
            <p className="tag">Ask better.<br />Hear more.</p>
            <div className="cols">
              {FOOT.map(([h, links]) => (
                <div key={h} className="col">
                  <b>{h}</b>
                  {links.map(([l, fn]) => <button key={l} onClick={fn}>{l}</button>)}
                </div>
              ))}
            </div>
          </div>
          <div className="logo"><Logo height={30} color="#fff" /></div>
          <div className="bottom">
            <span>© {new Date().getFullYear()} Qwery · qwery.to</span>
            <span className="social">
              <a href="https://x.com" target="_blank" rel="noreferrer">X</a>
              <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">LinkedIn</a>
              <a href="https://www.instagram.com" target="_blank" rel="noreferrer">Instagram</a>
              <a href="https://www.youtube.com" target="_blank" rel="noreferrer">YouTube</a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
