import { useState } from 'react';
import { OkButton } from '../components/QuestionView.jsx';
import { Icon, Logo } from '../lib/icons.jsx';
import { DEFAULT_THEME, themeVars } from '../lib/questions.js';
import { navigate } from '../lib/router.js';
import { db } from '../lib/sb.js';
import { PLANS, useApp } from '../lib/store.jsx';
import { Btn, cx, IconBtn, Modal, Select, Toggle, useToast } from '../ui.jsx';
import { Steps } from './Onboarding.jsx';

const FEATURES = {
  free: [['Responses', '10 per month'], ['Seats', '1 seat'], ['Forms', 'Unlimited forms', 'AI form builder included']],
  basic: [['Responses', '100 per month', '+ $3 per extra 100'], ['Seats', '1 seat'], ['Collect more', 'Payments and file uploads'], ['Connects with', ['Sheets', 'Zapier']], ['Advanced', null, null, [['branch', 'Logic jumps'], ['upload', 'File uploads']]]],
  plus: [['Responses', '1,000 per month', '+ $10 per extra 500'], ['Seats', '3 seats', '+ $12 per extra seat'], ['Conversations', 'Chat from any answer'], ['Connects with', ['Sheets', 'Zapier', 'Notion']], ['Advanced', null, null, [['sparkle', 'Remove Qwery branding'], ['image', 'Brand kit'], ['inbox', 'Conversation inbox']]]],
  business: [['Responses', '10,000 per month', '+ $20 per extra 2,500'], ['Seats', '5 seats', '+ $12 per extra seat'], ['Conversations', 'Routing and inbox rules'], ['Connects with', ['Sheets', 'Notion', 'Salesforce']], ['Advanced', null, null, [['chart', 'Drop-off analysis'], ['branch', 'Conversation routing'], ['help', 'Priority support']]]],
};
const BLURB = { free: 'For trying Qwery and simple forms.', basic: 'Forms that plug into your workflow.', plus: 'On-brand forms that start conversations.', business: 'Deeper insight and team routing.' };
const ICON = { free: null, basic: 'link', plus: 'star', business: 'chart' };
const COUPONS = { '40OFF12QWERY': { pct: 40, label: '40% off Plus for 12 months' }, EDU50: { pct: 50, label: '50% off any paid plan' } };
const COUNTRIES = ['United States of America', 'United Kingdom', 'Nigeria', 'Indonesia', 'Germany', 'France', 'Canada', 'India', 'Australia', 'Netherlands', 'Spain', 'Brazil', 'South Africa', 'Kenya', 'Ghana', 'Japan', 'Singapore'];

function Frame({ step, labels, children, onClose }) {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div className="onb-top"><Steps step={step} labels={labels} accent /><IconBtn icon="x" label="Close" style={{ marginLeft: 'auto' }} onClick={onClose} /></div>
      <div style={{ flex: 1, margin: '0 16px 16px', background: 'var(--q-bg-canvas)', borderRadius: 24, padding: '20px 4vw 30px', position: 'relative' }}>{children}</div>
    </div>
  );
}

function Plans() {
  const app = useApp();
  const [cycle, setCycle] = useState('yearly');
  const cur = app.org.plan || 'free';
  return (
    <Frame step={1} labels={['Choose a plan', 'Billing and payment']} onClose={() => navigate('/org/billing')}>
      <div className="row between wrap gap-12" style={{ padding: '10px 18px 20px' }}>
        <h1 className="t-display-l" style={{ fontSize: 34 }}>Choose a plan</h1>
        <div className="row" style={{ border: '1px solid var(--q-border-default)', borderRadius: 999, padding: 3, background: '#fff' }}>
          <button className={cx('btn', cycle === 'monthly' ? 'btn-primary' : 'btn-ghost')} style={{ fontWeight: 400 }} onClick={() => setCycle('monthly')}>Pay monthly</button>
          <button className={cx('btn', cycle === 'yearly' ? 'btn-primary' : 'btn-ghost')} style={{ fontWeight: 400 }} onClick={() => setCycle('yearly')}>Pay yearly <span className="badge" style={{ background: '#fff', color: 'var(--ink-900)', marginLeft: 4 }}>−16%</span></button>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--elev-1)' }}>
        <div className="row gap-10 t-body-s" style={{ background: 'var(--ink-100)', padding: '10px 18px' }}><Icon name="gift" size={16} />Nonprofit, school or student? Get 50% off any paid plan. <button className="u accent-text" onClick={() => navigate(`/checkout?plan=plus&cycle=${cycle}&coupon=EDU50`)}>Apply for a discount</button></div>
        <div className="row" style={{ padding: '20px 0 24px', overflowX: 'auto', alignItems: 'stretch' }}>
          {Object.entries(PLANS).map(([k, p]) => {
            const price = cycle === 'yearly' ? p.yearly : p.monthly;
            return (
              <div key={k} className="plan-col">
                <span className="row gap-8 t-h2" style={{ fontSize: 20 }}>{ICON[k] && <Icon name={ICON[k]} size={18} />}{p.name}{k === 'business' && <span className="badge accent">Best value</span>}</span>
                <span className="price"><sup>$</sup>{price}<small>/month</small></span>
                <span className="t-caption muted">{k === 'free' ? 'Free forever' : cycle === 'yearly' ? `$${price * 12} billed yearly` : 'Billed monthly'}</span>
                <span className="t-body-s" style={{ margin: '10px 0' }}>{BLURB[k]}</span>
                {k === cur ? <Btn kind="soft" disabled style={{ width: '100%' }}>Your current plan</Btn>
                  : k === 'free' ? <Btn kind="secondary" style={{ width: '100%' }} onClick={() => navigate('/cancel-plan')}>Downgrade</Btn>
                    : <button className={cx('btn', k === 'business' ? 'btn-accent' : '')} style={{ width: '100%', background: k === 'business' ? undefined : 'var(--accent-50)', color: k === 'business' ? undefined : 'var(--accent-600)', height: 34 }} onClick={() => navigate(`/checkout?plan=${k}&cycle=${cycle}`)}>{k === 'business' ? 'Upgrade to Business' : 'Upgrade'}</button>}
                {FEATURES[k].map(([h, v, sub, list]) => (
                  <div key={h} className="col gap-2">
                    <h4>{h}</h4>
                    {Array.isArray(v) ? <span className="row gap-10 wrap">{v.map((x) => <span key={x} className="row gap-4"><span className="chip grey" style={{ padding: '0 5px', fontSize: 10 }}>{x[0]}</span>{x}</span>)}</span> : v && <span>{v}</span>}
                    {sub && <span className="t-caption muted">{sub}</span>}
                    {list && list.map(([ic, l]) => <span key={l} className="fea"><Icon name={ic} />{l}</span>)}
                  </div>
                ))}
                {k === 'free' && <span className="grow" />}
                {k === 'free' && <span className="col gap-6 t-caption" style={{ marginTop: 20 }}><span className="accent-text">Compare all features →</span><span>Need SSO or HIPAA? Talk to sales →</span></span>}
              </div>
            );
          })}
        </div>
      </div>
    </Frame>
  );
}

function Checkout() {
  const app = useApp();
  const toast = useToast();
  const p = new URLSearchParams(location.search);
  const update = p.get('update') === '1';
  const [plan, setPlan] = useState(p.get('plan') || (app.org.plan !== 'free' ? app.org.plan : 'plus'));
  const [cycle, setCycle] = useState(p.get('cycle') || app.org.billing_cycle || 'monthly');
  const b = app.org.billing || {};
  const [d, setD] = useState(b.details || { first: '', last: '', address: '', zip: '', city: '', state: '', country: '', email: app.user.email });
  const [detailsSaved, setDetailsSaved] = useState(!!b.details);
  const [card, setCard] = useState({ name: '', number: '', exp: '', cvc: '' });
  const [cardSaved, setCardSaved] = useState(!!b.card);
  const [couponOn, setCouponOn] = useState(!!p.get('coupon'));
  const [code, setCode] = useState(p.get('coupon') || '');
  const [coupon, setCoupon] = useState(p.get('coupon') && COUPONS[p.get('coupon')] ? p.get('coupon') : null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const P = PLANS[plan];
  const price = cycle === 'yearly' ? P.yearly * 12 : P.monthly;
  const disc = coupon ? +(price * COUPONS[coupon].pct / 100).toFixed(2) : 0;
  const digits = card.number.replace(/\D/g, '');
  const brand = /^4/.test(digits) ? 'VISA' : /^5[1-5]/.test(digits) ? 'Mastercard' : /^3[47]/.test(digits) ? 'Amex' : 'Card';
  const luhn = (n) => { let s = 0; for (let i = 0; i < n.length; i++) { let x = +n[n.length - 1 - i]; if (i % 2) { x *= 2; if (x > 9) x -= 9; } s += x; } return n.length >= 13 && s % 10 === 0; };
  const cardOk = card.name.trim().length > 1 && luhn(digits) && /^(0[1-9]|1[0-2])\/\d{2}$/.test(card.exp) && /^\d{3,4}$/.test(card.cvc);
  const detailsOk = d.first && d.last && d.address && d.zip && d.city && d.country;
  const saveBilling = async (patch) => { await db.from('organizations').update({ billing: { ...app.org.billing, ...patch } }).eq('id', app.org.id); };
  const pay = async () => {
    setBusy(true);
    try {
      const inv = { id: Date.now().toString(36), date: new Date().toISOString(), desc: `Qwery ${P.name} (${cycle})`, amount: `$${(price - disc).toFixed(2)}` };
      const renew = new Date(); renew.setMonth(renew.getMonth() + (cycle === 'yearly' ? 12 : 1));
      await db.from('organizations').update({ plan, billing_cycle: cycle, plan_renews_at: renew.toISOString(), billing: { ...b, details: d, card: b.card, coupon, cancel_at: null, invoices: [inv, ...(b.invoices || [])] } }).eq('id', app.org.id);
      await app.reload();
      setDone(true);
    } catch (e) { toast(e.message, { error: true }); } finally { setBusy(false); }
  };
  const F = (k, l, ph) => <label className="col gap-4"><span className="t-caption muted">{l}</span><input className="field sq" style={{ height: 38 }} value={d[k] || ''} placeholder={ph} onChange={(e) => setD({ ...d, [k]: e.target.value })} /></label>;
  if (done) {
    return (
      <div className="page-loader col gap-16" style={{ textAlign: 'center', padding: 24, background: 'var(--q-bg-canvas)' }}>
        <span style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--accent-100)', color: 'var(--accent-600)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="star" size={28} /></span>
        <h1 className="t-display-l">Welcome to {P.name}!</h1>
        <p className="t-body-m muted" style={{ maxWidth: 420 }}>You can now collect {P.responses.toLocaleString()} responses a month with {P.seats} seat{P.seats > 1 ? 's' : ''}{plan !== 'basic' ? ', start conversations from any answer, and remove Qwery branding' : ''}.</p>
        <Btn size="l" onClick={() => navigate('/workspace')}>Back to my forms</Btn>
      </div>
    );
  }
  return (
    <Frame step={2} labels={['Choose a plan', 'Billing and payment']} onClose={() => navigate('/org/billing')}>
      <div className="row center" style={{ position: 'relative', marginBottom: 24 }}><button className="row gap-6 t-body-s" style={{ position: 'absolute', left: 0 }} onClick={() => navigate(update ? '/org/billing' : '/plans')}><Icon name="chevron-left" size={14} />Back</button><h1 className="t-h2">{update ? 'Payment details' : 'Billing and payment'}</h1></div>
      <div className="row gap-24 wrap" style={{ alignItems: 'flex-start' }}>
        <div className="col gap-14" style={{ flex: '1 1 420px', maxWidth: 560 }}>
          <div className="card col gap-12" style={{ padding: 18 }}>
            <div className="row between"><span className="t-label-m">1. Billing details</span>{detailsSaved && <span className="badge accent">Saved</span>}</div>
            {detailsSaved ? (
              <>
                {[['First Name', d.first], ['Last Name', d.last], ['Address', d.address], ['Postal code, city, state, country', `${d.zip}, ${d.city}${d.state ? ', ' + d.state : ''}, ${d.country}`]].map(([l, v]) => <div key={l} className="col gap-4"><span className="t-caption muted">{l}</span><span className="t-body-s">{v}</span></div>)}
                <Btn kind="secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setDetailsSaved(false)}>Edit billing details</Btn>
              </>
            ) : (
              <>
                <div className="row gap-10">{F('first', 'First Name', 'Ada')}{F('last', 'Last Name', 'Lovelace')}</div>
                {F('address', 'Address', '12 Analytical Row')}
                <div className="row gap-10">{F('zip', 'Postal code', '94025')}{F('city', 'City', 'Menlo Park')}{F('state', 'State', 'California')}</div>
                <label className="col gap-4"><span className="t-caption muted">Country</span><Select value={d.country} onChange={(v) => setD({ ...d, country: v })} options={COUNTRIES.map((c) => ({ value: c, label: c }))} search placeholder="Select a country" /></label>
                {F('email', 'Billing email', app.user.email)}
                <Btn style={{ alignSelf: 'flex-start' }} disabled={!detailsOk} onClick={async () => { await saveBilling({ details: d }); setDetailsSaved(true); toast('Billing details saved', { ok: true }); }}>Save billing details</Btn>
              </>
            )}
          </div>
          <div className="card col gap-12" style={{ padding: 18 }}>
            <div className="row between"><span className="t-label-m">2. Payment method</span>{cardSaved && <span className="badge accent">Saved</span>}</div>
            {cardSaved ? (
              <><div className="col gap-4"><span className="t-caption muted">Credit card</span><span className="t-body-s">{(b.card || {}).brand || brand} with last 4 digits - {(b.card || {}).last4 || digits.slice(-4)}</span></div><Btn kind="secondary" style={{ alignSelf: 'flex-start' }} onClick={() => setCardSaved(false)}>Edit payment method</Btn></>
            ) : (
              <>
                <span className="badge warning" style={{ alignSelf: 'flex-start' }}>Test mode — use 4242 4242 4242 4242. No card is charged.</span>
                <label className="col gap-4"><span className="t-caption muted">Name on card</span><input className={cx('field sq', card.name && card.name.trim().length < 2 && 'error')} style={{ height: 38 }} value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} autoComplete="cc-name" /></label>
                <label className="col gap-4"><span className="t-caption muted">Card number</span><input className={cx('field sq', digits.length >= 13 && !luhn(digits) && 'error')} style={{ height: 38 }} inputMode="numeric" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d ]/g, '').replace(/(\d{4})(?=\d)/g, '$1 ').slice(0, 23) })} autoComplete="cc-number" placeholder="1234 1234 1234 1234" /></label>
                <div className="row gap-10">
                  <label className="col gap-4 grow"><span className="t-caption muted">Expiry</span><input className="field sq" style={{ height: 38 }} placeholder="MM/YY" value={card.exp} onChange={(e) => setCard({ ...card, exp: e.target.value.replace(/[^\d]/g, '').replace(/^(\d{2})(\d)/, '$1/$2').slice(0, 5) })} autoComplete="cc-exp" /></label>
                  <label className="col gap-4 grow"><span className="t-caption muted">CVC</span><input className="field sq" style={{ height: 38 }} inputMode="numeric" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })} autoComplete="cc-csc" /></label>
                </div>
                <Btn style={{ alignSelf: 'flex-start' }} disabled={!cardOk} onClick={async () => { const c = { brand, last4: digits.slice(-4), exp: card.exp }; await saveBilling({ card: c }); await app.reload(); setCardSaved(true); toast('Payment info updated!', { ok: true }); }}>Save payment method</Btn>
              </>
            )}
          </div>
        </div>
        {!update && (
          <div className="col gap-12" style={{ flex: '0 1 300px' }}>
            <div className="card col gap-10" style={{ padding: 16 }}>
              <span className="t-label-m">Your new plan</span>
              <div style={{ display: 'flex', gap: 6 }}><div className="grow"><Select value={plan} onChange={setPlan} options={['basic', 'plus', 'business'].map((k) => ({ value: k, label: PLANS[k].name }))} /></div><div style={{ width: 110 }}><Select value={cycle} onChange={setCycle} options={[{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }]} /></div></div>
              <div className="row between t-body-s"><span>{P.name} ({cycle})</span><span>{price} USD</span></div>
              <span className="t-body-s">{P.responses >= 1000 ? `${P.responses / 1000}k` : P.responses} responses/mo</span>
              <span className="t-body-s">{P.seats} seat{P.seats > 1 ? 's' : ''}</span>
              {coupon && <div className="row between t-body-s accent-text"><span>Coupon discount (−{COUPONS[coupon].pct}%)</span><span>−{disc.toFixed(2)} USD</span></div>}
              <div className="divider" />
              <div className="row between t-label-m"><span>Total (excl. tax)</span><span>{(price - disc).toFixed(2)} USD</span></div>
              <p className="t-caption muted">You’ll pay now, prorated for the current billing period. Renews {cycle}. You can cancel any time.</p>
              <Btn icon="card" size="l" style={{ width: '100%', height: 40 }} disabled={!detailsSaved || !cardSaved} loading={busy} onClick={pay}>Pay and upgrade</Btn>
            </div>
            <div className="col gap-10" style={{ background: 'var(--ink-100)', borderRadius: 16, padding: 14 }}>
              <div className="row between t-body-s"><span>Coupon code</span><Toggle on={couponOn} onChange={setCouponOn} label="Coupon code" /></div>
              {couponOn && <>
                <div className="row gap-6"><input className="field sq" style={{ height: 38, background: '#fff' }} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Code" /><Btn onClick={() => { if (COUPONS[code]) { setCoupon(code); toast('Coupon applied', { ok: true }); } else toast('That coupon isn’t valid'); }}>Apply</Btn></div>
                {coupon && <span className="row gap-6 t-caption"><Icon name="check" size={12} />{COUPONS[coupon].label}</span>}
              </>}
            </div>
          </div>
        )}
      </div>
    </Frame>
  );
}

/* ---------------- Cancellation flow ---------------- */
function Q({ n, title, sub, children }) {
  return (
    <div className="onb-q slide-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      {n && <span className="qnum">{n}</span>}
      <div className="col gap-14 grow"><h2 className="q-title" style={{ fontSize: 20 }}>{title}</h2>{sub && <p className="q-desc" style={{ fontSize: 16 }}>{sub}</p>}{children}</div>
    </div>
  );
}
function Cancel() {
  const app = useApp();
  const toast = useToast();
  const [i, setI] = useState(0);
  const [a, setA] = useState({ reasons: [] });
  const [stars, setStars] = useState(0);
  const P = PLANS[app.org.plan || 'free'];
  const renew = app.org.plan_renews_at ? new Date(app.org.plan_renews_at) : new Date(Date.now() + 30 * 864e5);
  const step = i === 0 ? 2 : i < 6 ? 3 : 4;
  const next = () => setI(i + 1);
  const vars = themeVars(DEFAULT_THEME);
  const reasons = ['The number of projects I am working on has reduced', 'The project I was working on has finished', 'The activities of my business are reducing in general', 'I didn’t get enough responses with my forms', 'I was trying something new but it wasn’t successful', 'I can’t afford it', 'I struggle with reaching enough people', 'Customer support is not good enough', 'My business is making budget cuts', 'Other'];
  const confirm = async () => {
    await db.from('organizations').update({ billing: { ...app.org.billing, cancel_at: renew.toISOString() } }).eq('id', app.org.id);
    await db.from('feedback').insert({ user_id: app.user.id, kind: 'cancellation', data: a });
    await app.reload();
    next();
  };
  const choice = (opts, key, multi) => (
    <div className="col gap-8" style={{ alignItems: 'flex-start' }}>
      {opts.map((o, k) => {
        const on = multi ? a[key].includes(o) : a[key] === o;
        return <button key={o} className={cx('choice', multi && 'square', on && 'on')} style={{ minWidth: 260, fontSize: 16 }} onClick={() => { if (multi) setA({ ...a, [key]: on ? a[key].filter((x) => x !== o) : [...a[key], o] }); else { setA({ ...a, [key]: o }); setTimeout(() => setI(key === 'intro' && o === 'I’d rather skip' ? 6 : i + 1), 400); } }}><span className="key">{'ABCDEFGHIJ'[k]}</span><span className="lbl">{o}</span>{on && <Icon name="check" className="tick" />}</button>;
      })}
    </div>
  );
  return (
    <Frame step={step} labels={['Choose a plan', 'Review plan changes', 'Cancellation survey', 'Confirmation']} onClose={() => navigate('/org/billing')}>
      <div className="row center" style={{ position: 'relative', marginBottom: 8 }}>{i > 0 && i < 7 && <button className="row gap-6 t-body-s" style={{ position: 'absolute', left: 0 }} onClick={() => setI(i - 1)}><Icon name="chevron-left" size={14} />Back</button>}<h1 className="t-h3" style={{ fontWeight: 400, fontSize: 18 }}>{i === 0 ? 'Review plan change' : i < 6 ? 'Exit survey' : 'Confirmation'}</h1></div>
      {i > 0 && i < 6 && <div className="progress" style={{ '--t-answer': '#4d4de1', '--t-answer-30': 'var(--ink-200)', marginBottom: 20 }}><div style={{ width: `${(i / 6) * 100}%` }} /></div>}
      <div className="theme-scope" style={{ ...vars, background: 'transparent', padding: '20px 0 60px' }}>
        {i === 0 && (
          <div className="card col gap-14" style={{ maxWidth: 520, margin: '0 auto', padding: 24 }}>
            <span className="t-h2">You’re moving from {P.name} to Free</span>
            <p className="t-body-s muted">Your {P.name} plan stays active until {renew.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. After that:</p>
            {[`Responses drop from ${P.responses.toLocaleString()} to 10 a month`, `Seats drop from ${P.seats} to 1`, 'Conversations and the inbox switch off', 'Qwery branding comes back on your forms'].map((x) => <span key={x} className="row gap-8 t-body-s"><Icon name="x" size={14} style={{ color: 'var(--red-500)' }} />{x}</span>)}
            <div className="row gap-8"><Btn onClick={next}>Continue</Btn><Btn kind="secondary" onClick={() => navigate('/org/billing')}>Keep {P.name}</Btn></div>
          </div>
        )}
        {i === 1 && <Q n="1" title="We’re sorry to see you go. Mind telling us why?" sub="It takes a minute and helps us get better.">{choice(['Sure, let’s do it', 'I’d rather skip'], 'intro')}</Q>}
        {i === 2 && <Q n="2" title="Are you moving to another tool?">{choice(['Yes — another form builder', 'Yes — building our own', 'No, I just don’t need forms right now'], 'alt')}</Q>}
        {i === 3 && <Q n="3" title="Are any of the following causing you to stop using data collection tools altogether?*" sub="Choose as many as you like">{choice(reasons, 'reasons', true)}<OkButton onClick={() => a.reasons.length ? next() : toast('Choose at least one')} /></Q>}
        {i === 4 && <Q n="4" title="Did you know? You can keep your workflows running on Free with Zapier." sub="Connect your form to 6,000+ apps through a webhook — no paid plan needed."><OkButton label="Good to know" check={false} onClick={next} /></Q>}
        {i === 5 && <Q n="5" title="Anything else you’d like to tell us?"><textarea className="text-answer" rows={2} placeholder="Type your answer here…" value={a.other || ''} onChange={(e) => setA({ ...a, other: e.target.value })} /><OkButton onClick={next} /></Q>}
        {i === 6 && (
          <div className="card col gap-14" style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
            <span className="t-h2">Confirm cancellation</span>
            <p className="t-body-s muted">Your plan ends on {renew.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. You won’t be charged again, and your forms and responses stay safe on Free.</p>
            <div className="row gap-8"><Btn kind="danger" onClick={confirm}>Cancel my plan</Btn><Btn kind="secondary" onClick={() => navigate('/org/billing')}>Keep {P.name}</Btn></div>
          </div>
        )}
        {i === 7 && <Q title="Cancellation acknowledged. How would you rate your experience with Qwery?">
          <div className="row gap-8">{[1, 2, 3, 4, 5].map((k) => <button key={k} onClick={async () => { setStars(k); await db.from('feedback').insert({ user_id: app.user.id, kind: 'rating', data: { stars: k } }); setTimeout(next, 500); }} style={{ color: 'var(--t-answer)', opacity: stars >= k ? 1 : .35 }} aria-label={`${k} stars`}><Icon name={stars >= k ? 'star-fill' : 'star'} size={40} /></button>)}</div>
        </Q>}
        {i === 8 && (
          <div className="col center gap-12" style={{ textAlign: 'center' }}>
            <span className="avatar lg" style={{ width: 56, height: 56, background: 'var(--green-100)', color: '#087443' }}><Icon name="check" size={22} /></span>
            <h2 className="t-h2">Thanks for rating — your cancellation is confirmed.</h2>
            <p className="t-body-s muted">Changed your mind? You can keep your plan from Plan &amp; billing any time before it ends.</p>
            <Btn onClick={() => navigate('/org/billing')}>Back to Plan &amp; billing</Btn>
          </div>
        )}
      </div>
      <a className="made-with" style={{ position: 'absolute', left: 24, top: 70, background: 'transparent', color: 'var(--ink-900)' }} href="/"><Logo height={16} /></a>
    </Frame>
  );
}

export default function Billing({ path }) {
  const app = useApp();
  if (!['owner', 'admin'].includes(app.role)) {
    return <div className="page-loader col gap-10"><p className="t-h2">Only admins can change the plan.</p><Btn onClick={() => navigate('/workspace')}>Back</Btn></div>;
  }
  if (path === '/checkout') return <Checkout />;
  if (path === '/cancel-plan') return <Cancel />;
  return <Plans />;
}

export { Modal };
