// Serves /to/:slug with per-form Open Graph tags (for link previews), then boots the SPA.
const SB = 'https://fgppaqohseolxvskmymf.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZncHBhcW9oc2VvbHh2c2tteW1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUzNzgxODUsImV4cCI6MjExMDk1NDE4NX0.1Rjvfg7LHaMYFd-C9DjyR90SJmT7QCk6MCKKSKUdpP4';
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export default async function handler(req, res) {
  const slug = String(req.query.slug || '').slice(0, 80);
  const origin = `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  let shell = '';
  try { shell = await (await fetch(origin + '/app.html')).text(); } catch { shell = ''; }
  if (!shell) { res.status(500).send('Unavailable'); return; }
  let form = null;
  try {
    const r = await fetch(`${SB}/rest/v1/rpc/get_public_form`, { method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_slug: slug }) });
    form = r.ok ? await r.json() : null;
  } catch { form = null; }
  if (form) {
    const title = form.share?.title || form.title;
    const desc = form.share?.description || `Answer “${form.title}” — it only takes a couple of minutes.`;
    const img = form.share?.image && /^https?:/.test(form.share.image) ? form.share.image : `${origin}/og.png`;
    const tags = `<title>${esc(title)}</title>
<meta property="og:type" content="website" /><meta property="og:title" content="${esc(title)}" /><meta property="og:description" content="${esc(desc)}" />
<meta property="og:image" content="${esc(img)}" /><meta property="og:url" content="${esc(origin + '/to/' + slug)}" />
<meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${esc(title)}" /><meta name="twitter:description" content="${esc(desc)}" />
${form.share?.indexable ? '' : '<meta name="robots" content="noindex" />'}`;
    shell = shell.replace(/<title>[\s\S]*?<\/title>/, '').replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(desc)}" />`).replace('</head>', tags + '\n</head>');
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  res.status(200).send(shell);
}
