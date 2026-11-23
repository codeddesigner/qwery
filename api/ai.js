// Qwery AI endpoint — Vercel AI Gateway (OpenAI-compatible), Claude Haiku 5.5.
const MODEL = 'anthropic/claude-haiku-5.5';
const clip = (v, n = 6000) => JSON.stringify(v ?? '').slice(0, n);

const PROMPTS = {
  rewrite: (b) => ({
    system: 'You rewrite survey questions so they are clear, friendly, neutral and unbiased. Reply with ONLY the rewritten question text, no quotes, no preamble. Keep the same language as the input. Max 120 characters.',
    user: `Question type: ${b.type}\nQuestion: ${String(b.title || '').slice(0, 500)}`,
  }),
  generate_form: (b) => ({
    system: `You design conversational forms. Return ONLY JSON: {"questions":[{"type":string,"title":string,"description":string,"required":boolean,"choices":string[]}],"conversation_prompt":string,"ending":string}. Allowed types: short_text,long_text,email,phone,website,number,date,multiple_choice,dropdown,yes_no,opinion_scale,nps,rating,contact_info,picture_choice,statement. Use 4-8 questions, start easy, include choices only for multiple_choice/dropdown/picture_choice. ${b.kind === 'lead' ? 'This is a lead qualification form: ask about company size, need, budget, timeline, and contact info.' : ''} conversation_prompt is a short, warm invitation to chat after submitting (under 90 chars). ending is a short thank-you title.`,
    user: String(b.prompt || '').slice(0, 1500),
    json: true,
  }),
  followup: (b) => ({
    system: 'You write ONE short, open, non-leading follow-up question for a form respondent, based on their previous answer. Reply with ONLY the question. Max 110 characters. Same language as the answer.',
    user: `Previous question: ${String(b.question || '').slice(0, 300)}\nTheir answer: ${String(b.answer || '').slice(0, 600)}\nGoal: ${String(b.goal || 'Understand the reason behind the answer').slice(0, 300)}`,
  }),
  reply: (b) => ({
    system: `You help a ${b.org || 'company'} team member reply to a form respondent in a chat. Write a short, warm, specific reply (1-3 sentences) that moves the conversation forward. Never promise things you don't know. Reply with ONLY the message text.`,
    user: `Form: ${b.form}\nTheir answers: ${clip(b.answers, 3000)}\nConversation so far (creator = us, respondent = them): ${clip(b.messages, 4000)}`,
  }),
  insight: (b) => ({
    system: 'You are a product analyst. In 2-3 short sentences, give the single most useful, specific insight about these form results (e.g. where people drop off, what unhappy respondents have in common). If a question is asked, answer it directly from the data. Plain text, no lists, no hedging filler. Never invent numbers not supported by the data.',
    user: `Form: ${b.title}\n${b.question ? `Question: ${String(b.question).slice(0, 300)}\n` : ''}Stats: ${clip(b.stats, 800)}\nDrop-off: ${clip(b.dropoff, 1500)}\nDevices: ${clip(b.devices, 300)}\nSample answers: ${clip(b.sample, 6000)}`,
  }),
  themes: (b) => ({
    system: 'Group these form responses into 3-5 themes. Return ONLY JSON: {"summary":string,"themes":[{"name":string,"sentiment":"positive"|"neutral"|"negative","share":string,"quotes":string[]}]} where share is like "40% of responses" and quotes are 1-2 short verbatim excerpts.',
    user: `Form: ${b.title}\nResponses: ${clip(b.sample, 12000)}`,
    json: true,
  }),
  share_copy: (b) => ({
    system: 'Write a link preview for a form. Return ONLY JSON {"title":string,"description":string}. Title under 60 chars, description under 140 chars, inviting and honest about time to complete.',
    user: `Form title: ${b.title}\nQuestions: ${clip(b.questions, 1200)}`,
    json: true,
  }),
};

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  const p = PROMPTS[body?.action];
  if (!p) { res.status(400).json({ error: 'Unknown action' }); return; }
  const token = process.env.AI_GATEWAY_API_KEY || req.headers['x-vercel-oidc-token'] || process.env.VERCEL_OIDC_TOKEN;
  if (!token) { res.status(503).json({ error: 'AI isn’t configured for this deployment yet.' }); return; }
  const prompt = p(body);
  try {
    const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, max_tokens: prompt.json ? 1800 : 300, temperature: 0.4,
        messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
        ...(prompt.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    const d = await r.json();
    if (!r.ok) { res.status(502).json({ error: d?.error?.message || 'AI request failed' }); return; }
    const text = (d.choices?.[0]?.message?.content || '').trim();
    if (prompt.json) {
      const m = text.match(/\{[\s\S]*\}/);
      try { res.status(200).json(JSON.parse(m ? m[0] : text)); } catch { res.status(502).json({ error: 'AI returned an unexpected format. Try again.' }); }
      return;
    }
    res.status(200).json({ text: text.replace(/^["“]|["”]$/g, '') });
  } catch (e) {
    res.status(502).json({ error: 'AI is unavailable right now. ' + e.message });
  }
}
