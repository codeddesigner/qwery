// Question type registry — categories and colours follow the Figma "Question type badge" component.
export const TYPES = {
  conversation_starter: { label: 'Conversation starter', cat: 'conversation', icon: 'message', group: 'Qwery' },
  ai_followup: { label: 'AI follow-up', cat: 'conversation', icon: 'sparkle', group: 'Qwery' },
  contact_info: { label: 'Contact Info', cat: 'contact', icon: 'user', group: 'Contact info' },
  email: { label: 'Email', cat: 'contact', icon: 'mail', group: 'Contact info' },
  phone: { label: 'Phone Number', cat: 'contact', icon: 'phone', group: 'Contact info' },
  address: { label: 'Address', cat: 'contact', icon: 'globe', group: 'Contact info' },
  website: { label: 'Website', cat: 'contact', icon: 'link', group: 'Contact info' },
  long_text: { label: 'Long Text', cat: 'text', icon: 'text', group: 'Text & Video' },
  short_text: { label: 'Short Text', cat: 'text', icon: 'text', group: 'Text & Video' },
  video: { label: 'Video', cat: 'text', icon: 'play', group: 'Text & Video' },
  multiple_choice: { label: 'Multiple Choice', cat: 'choice', icon: 'list', group: 'Choice' },
  dropdown: { label: 'Dropdown', cat: 'choice', icon: 'chevron-down', group: 'Choice' },
  picture_choice: { label: 'Picture Choice', cat: 'choice', icon: 'image', group: 'Choice' },
  yes_no: { label: 'Yes/No', cat: 'choice', icon: 'check', group: 'Choice' },
  legal: { label: 'Legal', cat: 'choice', icon: 'lock', group: 'Choice' },
  number: { label: 'Number', cat: 'other', icon: 'hash', group: 'Other' },
  date: { label: 'Date', cat: 'other', icon: 'calendar-2', group: 'Other' },
  payment: { label: 'Payment', cat: 'other', icon: 'card', group: 'Other' },
  file_upload: { label: 'File Upload', cat: 'other', icon: 'upload', group: 'Other' },
  signature: { label: 'Signature', cat: 'other', icon: 'signature', group: 'Other' },
  nps: { label: 'Net Promoter Score®', cat: 'rating', icon: 'chart', group: 'Rating & ranking' },
  opinion_scale: { label: 'Opinion Scale', cat: 'rating', icon: 'scale', group: 'Rating & ranking' },
  rating: { label: 'Rating', cat: 'rating', icon: 'star', group: 'Rating & ranking' },
  ranking: { label: 'Ranking', cat: 'rating', icon: 'list', group: 'Rating & ranking' },
  matrix: { label: 'Matrix', cat: 'rating', icon: 'grid', group: 'Rating & ranking' },
  welcome: { label: 'Welcome Screen', cat: 'layout', icon: 'home', group: 'Layout' },
  statement: { label: 'Statement', cat: 'layout', icon: 'text', group: 'Layout' },
  question_group: { label: 'Question Group', cat: 'layout', icon: 'folder', group: 'Layout' },
  multi_page: { label: 'Multi-Question Page', cat: 'layout', icon: 'columns', group: 'Layout' },
  end_screen: { label: 'End Screen', cat: 'layout', icon: 'check', group: 'Layout' },
  redirect: { label: 'Redirect to URL', cat: 'layout', icon: 'link', group: 'Layout' },
};

export const RECOMMENDED = ['short_text', 'multiple_choice', 'statement', 'opinion_scale', 'email'];
export const GROUPS = ['Contact info', 'Text & Video', 'Choice', 'Other', 'Rating & ranking', 'Layout'];
export const NO_ANSWER = new Set(['welcome', 'statement', 'question_group']);
export const CHOICE_TYPES = new Set(['multiple_choice', 'dropdown', 'picture_choice', 'yes_no', 'legal', 'ranking']);
export const SCALE_TYPES = new Set(['nps', 'opinion_scale', 'rating']);
export const TEXTISH = new Set(['short_text', 'long_text', 'email', 'phone', 'website', 'number', 'video', 'ai_followup']);

export const uid = (p = '') => p + Math.random().toString(36).slice(2, 9);
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const CONTACT_FIELDS = [
  { key: 'first_name', label: 'First name', ph: 'Jane' },
  { key: 'last_name', label: 'Last name', ph: 'Smith' },
  { key: 'phone', label: 'Phone number', ph: '(201) 555-0123' },
  { key: 'email', label: 'Email', ph: 'name@example.com' },
  { key: 'company', label: 'Company', ph: 'Acme Corporation' },
];
export const ADDRESS_FIELDS = [
  { key: 'line1', label: 'Address', ph: '65 Hansen Way' },
  { key: 'line2', label: 'Address line 2', ph: 'Apartment 4' },
  { key: 'city', label: 'City/Town', ph: 'Palo Alto' },
  { key: 'state', label: 'State/Region/Province', ph: 'California' },
  { key: 'zip', label: 'Zip/Post code', ph: '94304' },
  { key: 'country', label: 'Country', ph: 'United States' },
];

export function newQuestion(type, extra = {}) {
  const base = { id: uid('q_'), type, title: '', description: '', required: false, settings: {}, ...extra };
  switch (type) {
    case 'multiple_choice': case 'dropdown': case 'ranking':
      base.choices = [{ id: uid('c_'), label: '' }];
      if (type === 'ranking') base.choices = [{ id: uid('c_'), label: 'Option 1' }, { id: uid('c_'), label: 'Option 2' }, { id: uid('c_'), label: 'Option 3' }];
      base.settings = { multiple: false, limit: 'unlimited', limitN: 2, randomize: false, other: false, vertical: true };
      break;
    case 'picture_choice':
      base.choices = [{ id: uid('c_'), label: '', image: '' }];
      base.settings = { showLabels: true, supersize: false, multiple: false, randomize: false, other: false };
      break;
    case 'yes_no': base.choices = [{ id: 'yes', label: 'Yes' }, { id: 'no', label: 'No' }]; break;
    case 'legal': base.choices = [{ id: 'accept', label: 'I accept' }, { id: 'decline', label: 'I don’t accept' }]; break;
    case 'opinion_scale': base.settings = { from: 0, to: 10, labels: { left: '', center: '', right: '' } }; break;
    case 'nps': base.settings = { from: 0, to: 10, labels: { left: 'Not likely', center: '', right: 'Extremely likely' } }; break;
    case 'rating': base.settings = { steps: 5, shape: 'star' }; break;
    case 'matrix': base.rows = [{ id: uid('r_'), label: 'Row 1' }, { id: uid('r_'), label: 'Row 2' }]; base.cols = [{ id: uid('k_'), label: 'Poor' }, { id: uid('k_'), label: 'Okay' }, { id: uid('k_'), label: 'Great' }]; break;
    case 'contact_info': base.settings = { fields: Object.fromEntries(CONTACT_FIELDS.map((f) => [f.key, { show: f.key !== 'company', required: false }])), country: 'US' }; break;
    case 'address': base.settings = { fields: Object.fromEntries(ADDRESS_FIELDS.map((f) => [f.key, { show: true, required: f.key === 'line1' }])) }; break;
    case 'short_text': case 'long_text': base.settings = { maxChars: false, maxN: 120 }; break;
    case 'number': base.settings = { min: '', max: '' }; break;
    case 'date': base.settings = { format: 'DDMMYYYY', separator: '/' }; break;
    case 'payment': base.settings = { amount: 10, currency: 'USD', label: 'Pay now' }; break;
    case 'welcome': base.title = 'Hey there 👋'; base.settings = { button: 'Start' }; break;
    case 'statement': base.settings = { button: 'Continue', quote: false }; break;
    case 'conversation_starter': base.title = 'Want to talk it through with our team?'; base.description = 'Reply here and a real person will pick it up.'; base.choices = [{ id: 'yes', label: 'Yes, let’s chat' }, { id: 'no', label: 'Not now' }]; break;
    case 'ai_followup': base.title = 'AI follow-up'; base.settings = { source: '', goal: 'Dig deeper into the reason behind the previous answer' }; break;
    case 'multi_page': base.fields = [{ id: uid('f_'), label: 'Question 1', type: 'short_text', required: false }, { id: uid('f_'), label: 'Question 2', type: 'short_text', required: false }]; break;
    case 'question_group': base.settings = { button: 'Continue' }; break;
    default: break;
  }
  return base;
}

export function newEnding(kind = 'end') {
  return kind === 'redirect'
    ? { id: uid('e_'), type: 'redirect', title: 'Redirect to URL', url: 'https://' }
    : { id: uid('e_'), type: 'end', title: 'Thank you for your feedback!', description: '', social: false, button: { show: false, label: 'Create a Qwery', link: '' }, media: null };
}

export const DEFAULT_THEME = {
  name: 'Qwery Indigo', font: 'Calamantus', question: '#191919', answer: '#4D4DE1', button: '#4D4DE1', buttonText: '#FFFFFF', background: '#FFFFFF',
  backgroundImage: '', logo: '', corners: 'rounded', sizeWelcome: 'md', sizeQuestions: 'md', alignWelcome: 'left', alignQuestions: 'left',
};

export const GALLERY_THEMES = [
  DEFAULT_THEME,
  { ...DEFAULT_THEME, name: 'Mono', answer: '#191919', button: '#191919', background: '#F0F0F0' },
  { ...DEFAULT_THEME, name: 'Paper', answer: '#3A3833', button: '#191919', background: '#F7F6F2', font: 'Georgia' },
  { ...DEFAULT_THEME, name: 'Forest', question: '#14301F', answer: '#08703D', button: '#08703D', background: '#EFFAF3' },
  { ...DEFAULT_THEME, name: 'Sunset', question: '#33260A', answer: '#EA6A1E', button: '#EA6A1E', background: '#FFF3E8' },
  { ...DEFAULT_THEME, name: 'Night', question: '#F7F6F2', answer: '#BDBDFA', button: '#BDBDFA', buttonText: '#17175A', background: '#101010' },
  { ...DEFAULT_THEME, name: 'Lavender', question: '#3A1A2E', answer: '#E0368C', button: '#E0368C', background: '#FFF0F8' },
  { ...DEFAULT_THEME, name: 'Ocean', question: '#161D45', answer: '#2E6BFF', button: '#2E6BFF', background: '#EEF3FF' },
];

export const DEFAULT_SETTINGS = {
  branding: true, arrows: true, progress: true, numbers: true, letters: true,
  autosave: true, freeNav: false, conversations: true, language: 'English',
  access: { closed: false, close_at: '', response_limit: '' },
  tracking: { ga: '', pixel: '' },
};

export function emptyContent() {
  return { questions: [], endings: [newEnding('end')], theme: { ...DEFAULT_THEME }, settings: { ...DEFAULT_SETTINGS }, logic: {}, hidden_fields: [], variables: [], conversation: { enabled: true, mode: 'ending', prompt: 'Got two minutes to tell us more?', sender: '' } };
}

export function normalizeContent(c) {
  const e = emptyContent();
  const out = { ...e, ...(c || {}) };
  out.theme = { ...DEFAULT_THEME, ...(c?.theme || {}) };
  out.settings = { ...DEFAULT_SETTINGS, ...(c?.settings || {}), access: { ...DEFAULT_SETTINGS.access, ...(c?.settings?.access || {}) } };
  out.questions = out.questions || [];
  out.endings = out.endings?.length ? out.endings : e.endings;
  out.conversation = { ...e.conversation, ...(c?.conversation || {}) };
  return out;
}

// ---------- Theme → CSS variables ----------
function hexToRgb(hex) {
  const h = (hex || '#000').replace('#', '');
  const v = h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6);
  return [parseInt(v.slice(0, 2), 16) || 0, parseInt(v.slice(2, 4), 16) || 0, parseInt(v.slice(4, 6), 16) || 0];
}
export const rgba = (hex, a) => { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; };
export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) { const l1 = luminance(a), l2 = luminance(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); }

export const FONTS = ['Calamantus', 'System font', 'Arial', 'Helvetica Neue', 'Courier', 'Georgia', 'ABeeZee', 'Abel', 'Abhaya Libre', 'Aboreto', 'Abril Fatface', 'Abyssinica SIL', 'Aclonica', 'Inter', 'Lora', 'Merriweather', 'Montserrat', 'Nunito', 'Playfair Display', 'Poppins', 'Roboto', 'Space Grotesk', 'Work Sans'];
const SYSTEM = new Set(['Calamantus', 'System font', 'Arial', 'Helvetica Neue', 'Courier', 'Georgia']);
export function fontStack(f) {
  if (!f || f === 'Calamantus') return "'Calamantus', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
  if (f === 'System font') return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  return `'${f}', 'Calamantus', -apple-system, sans-serif`;
}
export function loadFont(f) {
  if (!f || SYSTEM.has(f)) return;
  const id = 'gf-' + f.replace(/\s+/g, '-');
  if (document.getElementById(id)) return;
  const l = document.createElement('link');
  l.id = id; l.rel = 'stylesheet';
  l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;700&display=swap`;
  document.head.appendChild(l);
}

export function themeVars(t) {
  const th = { ...DEFAULT_THEME, ...(t || {}) };
  loadFont(th.font);
  const radius = th.corners === 'square' ? '0px' : th.corners === 'soft' ? '6px' : '999px';
  const box = th.corners === 'square' ? '0px' : th.corners === 'soft' ? '4px' : '8px';
  return {
    '--t-question': th.question, '--t-answer': th.answer, '--t-button': th.button, '--t-button-text': th.buttonText, '--t-background': th.background,
    '--t-answer-10': rgba(th.answer, 0.1), '--t-answer-30': rgba(th.answer, 0.3), '--t-answer-60': rgba(th.answer, 0.6), '--t-question-70': rgba(th.question, 0.7),
    '--t-key-bg': luminance(th.background) < 0.2 ? 'rgba(0,0,0,.4)' : 'rgba(255,255,255,.8)', '--t-radius': radius, '--t-radius-box': box, '--t-font': fontStack(th.font),
    background: th.backgroundImage ? `${th.background} url(${th.backgroundImage}) center/cover` : th.background,
  };
}

// ---------- Answers ----------
export function isAnswered(q, a) {
  if (a == null) return false;
  if (Array.isArray(a)) return a.length > 0;
  if (typeof a === 'object') return Object.values(a).some((v) => v !== '' && v != null);
  return String(a).trim() !== '';
}

export function validate(q, a) {
  if (NO_ANSWER.has(q.type)) return null;
  if (q.type === 'contact_info' || q.type === 'address') {
    const fields = q.type === 'contact_info' ? CONTACT_FIELDS : ADDRESS_FIELDS;
    for (const f of fields) {
      const cfg = q.settings?.fields?.[f.key];
      if (!cfg?.show) continue;
      const v = (a || {})[f.key];
      if ((cfg.required || q.required) && !String(v || '').trim() && f.key !== 'line2' && f.key !== 'company') return `Please fill in ${f.label.toLowerCase()}`;
      if (f.key === 'email' && v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Hmm, that email doesn’t look right';
    }
    return null;
  }
  if (q.type === 'multi_page') {
    for (const f of q.fields || []) if (f.required && !String((a || {})[f.id] || '').trim()) return `Please answer “${f.label}”`;
    return null;
  }
  if (q.required && !isAnswered(q, a)) return 'Please fill this in';
  if (!isAnswered(q, a)) return null;
  if (q.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)) return 'Hmm, that email doesn’t look right';
  if (q.type === 'website' && !/^(https?:\/\/)?[^\s.]+\.[^\s]{2,}/.test(a)) return 'Hmm, that URL doesn’t look right';
  if (q.type === 'phone' && String(a).replace(/\D/g, '').length < 6) return 'Hmm, that number doesn’t look right';
  if (q.type === 'number') {
    if (isNaN(+a)) return 'Numbers only, please';
    if (q.settings?.min !== '' && q.settings?.min != null && +a < +q.settings.min) return `Must be at least ${q.settings.min}`;
    if (q.settings?.max !== '' && q.settings?.max != null && +a > +q.settings.max) return `Must be at most ${q.settings.max}`;
  }
  if ((q.type === 'short_text' || q.type === 'long_text') && q.settings?.maxChars && String(a).length > +q.settings.maxN) return `Max ${q.settings.maxN} characters`;
  if (q.settings?.multiple && Array.isArray(a)) {
    if (q.settings.limit === 'exact' && a.length !== +q.settings.limitN) return `Choose exactly ${q.settings.limitN}`;
    if (q.settings.limit === 'range' && (a.length < +(q.settings.limitMin || 1) || a.length > +(q.settings.limitMax || 99))) return `Choose between ${q.settings.limitMin || 1} and ${q.settings.limitMax || 99}`;
  }
  return null;
}

export function answerText(q, a) {
  if (a == null || a === '') return '';
  if (q?.type === 'contact_info' || q?.type === 'address') return Object.values(a || {}).filter(Boolean).join(', ');
  if (q?.type === 'multi_page') return (q.fields || []).map((f) => a?.[f.id]).filter(Boolean).join(' · ');
  if (q?.type === 'matrix') return Object.entries(a || {}).map(([r, c]) => `${q.rows?.find((x) => x.id === r)?.label || r}: ${q.cols?.find((x) => x.id === c)?.label || c}`).join('; ');
  if (q?.type === 'file_upload' || q?.type === 'signature') return typeof a === 'string' ? a : a?.url || '';
  if (Array.isArray(a)) return a.map((x) => choiceLabel(q, x)).join(', ');
  if (CHOICE_TYPES.has(q?.type) || q?.type === 'conversation_starter') return choiceLabel(q, a);
  if (q?.type === 'payment') return a?.status ? `${a.amount} ${a.currency} (${a.status})` : String(a);
  if (typeof a === 'object') return JSON.stringify(a);
  return String(a);
}
export function choiceLabel(q, id) {
  if (id && typeof id === 'object' && id.other) return id.other;
  const c = q?.choices?.find((x) => x.id === id);
  return c ? c.label || 'Untitled' : String(id);
}

// ---------- Logic ----------
export const OPS = {
  choice: [{ v: 'is', l: 'is' }, { v: 'is_not', l: 'is not' }],
  number: [{ v: 'eq', l: 'is equal to' }, { v: 'neq', l: 'is not equal to' }, { v: 'lt', l: 'is lower than' }, { v: 'lte', l: 'is lower or equal to' }, { v: 'gt', l: 'is greater than' }, { v: 'gte', l: 'is greater or equal to' }],
  text: [{ v: 'eq', l: 'is equal to' }, { v: 'neq', l: 'is not equal to' }, { v: 'contains', l: 'contains' }, { v: 'not_contains', l: 'does not contain' }, { v: 'begins', l: 'begins with' }, { v: 'ends', l: 'ends with' }],
  answered: [{ v: 'answered', l: 'is answered' }, { v: 'not_answered', l: 'is not answered' }],
};
export function opsFor(q) {
  if (!q) return OPS.text;
  if (CHOICE_TYPES.has(q.type) || q.type === 'conversation_starter') return [...OPS.choice, ...OPS.answered];
  if (SCALE_TYPES.has(q.type) || q.type === 'number') return [...OPS.number, ...OPS.answered];
  return [...OPS.text, ...OPS.answered];
}

function test(op, a, value, q) {
  if (op === 'answered') return isAnswered(q, a);
  if (op === 'not_answered') return !isAnswered(q, a);
  if (op === 'is' || op === 'is_not') {
    const has = Array.isArray(a) ? a.includes(value) : a === value;
    return op === 'is' ? has : !has;
  }
  const n = parseFloat(a), v = parseFloat(value);
  const s = String(answerText(q, a) || '').toLowerCase(), t = String(value ?? '').toLowerCase();
  switch (op) {
    case 'eq': return isNaN(n) ? s === t : n === v;
    case 'neq': return isNaN(n) ? s !== t : n !== v;
    case 'lt': return n < v; case 'lte': return n <= v; case 'gt': return n > v; case 'gte': return n >= v;
    case 'contains': return s.includes(t); case 'not_contains': return !s.includes(t);
    case 'begins': return s.startsWith(t); case 'ends': return s.endsWith(t);
    default: return false;
  }
}

// Returns the id of the next block (question id, ending id) or null for "next in order".
export function nextTarget(content, q, answers) {
  const L = content.logic?.[q.id];
  if (!L) return null;
  for (const rule of L.rules || []) {
    const results = (rule.conditions || []).map((c) => test(c.op, answers[c.q], c.value, content.questions.find((x) => x.id === c.q)));
    const ok = rule.join === 'or' ? results.some(Boolean) : results.every(Boolean);
    if (results.length && ok && rule.to) return rule.to;
  }
  return L.otherwise || null;
}

export function blockLabel(content, id) {
  const qi = content.questions.findIndex((q) => q.id === id);
  if (qi >= 0) return { kind: 'q', q: content.questions[qi], n: qi + 1 };
  const ei = content.endings.findIndex((e) => e.id === id);
  if (ei >= 0) return { kind: 'e', e: content.endings[ei], n: LETTERS[ei] };
  return null;
}

export function answerableIndex(content, q) {
  let n = 0;
  for (const x of content.questions) { if (x.id === q.id) return NO_ANSWER.has(x.type) ? null : n + 1; if (!NO_ANSWER.has(x.type)) n++; }
  return null;
}

export function recall(text, answers, content, hidden = {}, vars = {}) {
  if (!text || !text.includes('{{')) return text;
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key) => {
    if (key.startsWith('hidden:')) return hidden[key.slice(7)] ?? '';
    if (key.startsWith('var:')) return vars[key.slice(4)] ?? '';
    const q = content.questions.find((x) => x.id === key);
    return q ? answerText(q, answers[key]) : '';
  });
}

export const TEMPLATES = [
  {
    key: 'csat', title: 'Customer satisfaction survey', blurb: 'Create a customer satisfaction survey that invites unhappy respondents to a conversation.',
    build() {
      const q1 = newQuestion('nps', { title: 'How likely are you to recommend us to a friend?', required: true });
      const q2 = newQuestion('long_text', { title: 'What’s the one thing we could do better?' });
      const q3 = newQuestion('email', { title: 'Where can we reach you?', description: 'Only if you’d like a reply from our team.' });
      return { title: 'Customer satisfaction', questions: [q1, q2, q3], logic: {}, conversation: { enabled: true, mode: 'rule', rule: { q: q1.id, op: 'lte', value: '6' }, prompt: 'Sorry to hear that — got two minutes to tell us what went wrong?' } };
    },
  },
  {
    key: 'usability', title: 'Usability test', blurb: 'Create a usability test that follows up on every “hard” rating with a quick chat.',
    build() {
      const q1 = newQuestion('short_text', { title: 'What were you trying to do today?', required: true });
      const q2 = newQuestion('opinion_scale', { title: 'How easy was it to get done?', description: '0 being very hard, 10 being effortless', required: true });
      const q3 = newQuestion('multiple_choice', { title: 'Which part slowed you down the most?' });
      q3.choices = ['Finding the feature', 'Understanding the screen', 'Waiting for things to load', 'Nothing — it was smooth'].map((label) => ({ id: uid('c_'), label }));
      return { title: 'Usability test', questions: [q1, q2, q3], conversation: { enabled: true, mode: 'rule', rule: { q: q2.id, op: 'lte', value: '4' }, prompt: 'That sounded frustrating. Mind walking us through it?' } };
    },
  },
  {
    key: 'open', title: 'Open feedback', blurb: 'Create a short, open-ended questions form to gather feedback, then talk it through.',
    build() {
      const q1 = newQuestion('short_text', { title: 'What’s your name?' });
      const q2 = newQuestion('long_text', { title: 'What’s on your mind?', required: true });
      const q3 = newQuestion('conversation_starter', { title: 'Want to talk it through with our team?' });
      return { title: 'Open feedback', questions: [q1, q2, q3] };
    },
  },
  {
    key: 'tour', title: 'Tour feedback', blurb: 'A walking-tour feedback form with a rating, contact details and picture choice.',
    build() {
      const q1 = newQuestion('short_text', { title: 'Which walking-tour did you join?', description: 'each route, tour guide, and time of tour makes an experience unique!' });
      const q2 = newQuestion('opinion_scale', { title: 'How much would you rate your experience?', description: '0 being unpleasant, 10 being awesome & would highly recommend' });
      const q3 = newQuestion('contact_info', { title: 'Where can we send group pictures from your tour?' });
      const q4 = newQuestion('multiple_choice', { title: 'Which tour locations interest you the most?', description: 'Choose as many as you like' });
      q4.choices = ['Blok M', 'Menteng', 'Chinatown', 'Kota Tua', 'Other/None'].map((label) => ({ id: uid('c_'), label }));
      q4.settings.multiple = true;
      const q5 = newQuestion('short_text', { title: 'We apologize for the unpleasant experience :(', description: 'What could we have done better?' });
      return {
        title: 'Tour Feedback', questions: [q1, q2, q3, q4, q5],
        logic: { [q2.id]: { rules: [{ conditions: [{ q: q2.id, op: 'lt', value: '4' }], join: 'and', to: q5.id }], otherwise: q3.id } },
      };
    },
  },
  {
    key: 'lead', title: 'Lead qualification', blurb: 'Qualify leads with a few sharp questions and a scoring variable.',
    build() {
      const q1 = newQuestion('contact_info', { title: 'Let’s start with the basics', required: true });
      const q2 = newQuestion('multiple_choice', { title: 'How big is your team?' });
      q2.choices = ['Just me', '2–10', '11–50', '51–200', '200+'].map((label) => ({ id: uid('c_'), label }));
      const q3 = newQuestion('dropdown', { title: 'When are you looking to get started?' });
      q3.choices = ['This week', 'This month', 'This quarter', 'Just exploring'].map((label) => ({ id: uid('c_'), label }));
      return { title: 'Lead qualification', questions: [q1, q2, q3], variables: [{ name: 'score', type: 'number', value: '0' }] };
    },
  },
  {
    key: 'event', title: 'Event registration', blurb: 'Collect sign-ups, dietary needs and a signature for your next event.',
    build() {
      const q1 = newQuestion('contact_info', { title: 'Who’s coming?', required: true });
      const q2 = newQuestion('yes_no', { title: 'Will you join the dinner afterwards?' });
      const q3 = newQuestion('long_text', { title: 'Any dietary requirements we should know about?' });
      const q4 = newQuestion('legal', { title: 'Do you agree to be photographed at the event?', required: true });
      return { title: 'Event registration', questions: [q1, q2, q3, q4] };
    },
  },
];
