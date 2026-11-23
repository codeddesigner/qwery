// Imports questions from a public Google Form (reads FB_PUBLIC_LOAD_DATA_).
const MAP = { 0: 'short_text', 1: 'long_text', 2: 'multiple_choice', 3: 'dropdown', 4: 'multiple_choice', 5: 'opinion_scale', 7: 'matrix', 9: 'date', 10: 'short_text', 6: 'statement', 8: 'statement', 13: 'file_upload', 18: 'rating' };

export default async function handler(req, res) {
  let url = String(req.query.url || '');
  if (!/^https:\/\/(docs\.google\.com\/forms|forms\.gle)\//.test(url)) { res.status(400).json({ error: 'That isn’t a Google Forms link.' }); return; }
  url = url.replace(/\/edit.*$/, '/viewform').replace(/\/prefill.*$/, '/viewform');
  try {
    const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await r.text();
    const m = html.match(/FB_PUBLIC_LOAD_DATA_\s*=\s*(\[[\s\S]*?\]);\s*<\/script>/);
    if (!m) { res.status(422).json({ error: 'We couldn’t read that form. Make sure it’s shared with “Anyone with the link”.' }); return; }
    const data = JSON.parse(m[1]);
    const items = data?.[1]?.[1] || [];
    const questions = items.filter((it) => it && it[1]).map((it) => {
      const type = MAP[it[3]] || 'short_text';
      const field = it[4]?.[0] || [];
      const choices = (field[1] || []).map((c) => c?.[0]).filter(Boolean);
      return { title: it[1], description: it[2] || '', type, required: !!field[2], choices, multiple: it[3] === 4 };
    });
    if (!questions.length) { res.status(422).json({ error: 'That form doesn’t have any questions we can import.' }); return; }
    res.status(200).json({ title: data?.[1]?.[8] || data?.[3] || 'Imported form', questions });
  } catch (e) {
    res.status(502).json({ error: 'Couldn’t reach Google Forms: ' + e.message });
  }
}
