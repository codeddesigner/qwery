// Fetches a website and extracts name, logo and brand colours for brand kits.
function abs(u, base) { try { return new URL(u, base).href; } catch { return null; } }
const hex = (h) => { h = h.toLowerCase(); if (h.length === 4) h = '#' + h.slice(1).split('').map((c) => c + c).join(''); return h.slice(0, 7); };
const boring = (h) => { const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16); const max = Math.max(r, g, b), min = Math.min(r, g, b); return max - min < 24 || max < 30 || min > 235; };

export default async function handler(req, res) {
  const url = String(req.query.url || '');
  if (!/^https?:\/\/[^\s/]+\.[^\s]+/.test(url)) { res.status(400).json({ error: 'Invalid URL' }); return; }
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 7000);
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (QweryBrandBot)' }, signal: ctl.signal, redirect: 'follow' });
    clearTimeout(t);
    const html = (await r.text()).slice(0, 600000);
    const meta = (p) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${p}["'][^>]*content=["']([^"']+)`, 'i'))?.[1] || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${p}["']`, 'i'))?.[1];
    const name = meta('og:site_name') || (html.match(/<title[^>]*>([^<]+)/i)?.[1] || '').split(/[|\-–—]/)[0].trim() || new URL(url).hostname.replace(/^www\./, '');
    const icon = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*href=["']([^"']+)/i)?.[1]
      || html.match(/<img[^>]+(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]*src=["']([^"']+)/i)?.[1]
      || html.match(/<img[^>]+src=["']([^"']+)["'][^>]*(?:class|id|alt)=["'][^"']*logo/i)?.[1]
      || html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)/i)?.[1];
    const counts = {};
    const theme = meta('theme-color');
    if (theme && /^#[0-9a-f]{3,6}$/i.test(theme)) counts[hex(theme)] = 1000;
    (html.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || []).forEach((h) => { const k = hex(h); if (!boring(k)) counts[k] = (counts[k] || 0) + 1; });
    const colors = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k]) => k.toUpperCase()).slice(0, 5);
    res.setHeader('Cache-Control', 's-maxage=86400');
    res.status(200).json({ name, logo: icon ? abs(icon, r.url || url) : null, colors });
  } catch (e) {
    res.status(200).json({ name: null, logo: null, colors: [], error: e.message });
  }
}
