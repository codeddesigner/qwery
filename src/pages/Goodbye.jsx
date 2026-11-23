import { useState } from 'react';
import { Icon } from '../lib/icons.jsx';
import { DEFAULT_THEME, themeVars } from '../lib/questions.js';
import { navigate } from '../lib/router.js';

export default function Goodbye() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  return (
    <div className="theme-scope page-loader col gap-16" style={{ ...themeVars(DEFAULT_THEME), textAlign: 'center', padding: 24 }}>
      <div style={{ width: 200, height: 106, borderRadius: 24, background: 'var(--ink-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-600)' }}><Icon name="send" size={36} /></div>
      <p className="t-body-m">Bon voyage!<br />Your account is gone—but we’ll be here if you need us.<br />How can we do better?</p>
      {sent ? <p className="t-body-s muted">Thank you. We read every note. 💙</p> : open ? (
        <div className="col gap-10" style={{ width: 'min(420px, 100%)' }}>
          <textarea className="textarea" autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Tell us what we could have done better…" />
          <a className="ok-btn" style={{ alignSelf: 'center', textDecoration: 'none' }} href={`mailto:feedback@qwery.to?subject=Goodbye%20feedback&body=${encodeURIComponent(text)}`} onClick={() => setSent(true)}>Send</a>
        </div>
      ) : (
        <div className="row gap-10"><button className="ok-btn" onClick={() => setOpen(true)}>Give feedback</button><span className="key-hint">press <b>Enter</b> ↵</span></div>
      )}
      <button className="t-caption muted u" onClick={() => navigate('/')}>Back to qwery</button>
    </div>
  );
}
