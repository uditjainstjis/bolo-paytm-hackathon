// Cloudflare Worker version of server.mjs: same /api routes, static files from public/ via the ASSETS binding.
// Secrets: SARVAM_API_KEY, ACCESS_CODE (testers open the link with ?k=<code> once; the app stores it).
import SYSTEM from './brain.md';

async function sarvam(env, p, init) {
  const r = await fetch('https://api.sarvam.ai' + p, {
    ...init,
    headers: { 'api-subscription-key': env.SARVAM_API_KEY, ...init.headers },
  });
  if (!r.ok) throw new Error(`Sarvam ${p} ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}
function pickJson(text) {
  // The model sometimes repeats itself or wraps JSON in prose: take the first balanced {...} that parses and has "say".
  for (let i = text.indexOf('{'); i !== -1; i = text.indexOf('{', i + 1)) {
    let depth = 0, inStr = false;
    for (let j = i; j < text.length; j++) {
      const c = text[j];
      if (inStr) { if (c === '\\') j++; else if (c === '"') inStr = false; continue; }
      if (c === '"') inStr = true; else if (c === '{') depth++; else if (c === '}' && --depth === 0) {
        try { const o = JSON.parse(text.slice(i, j + 1)); if (typeof o.say === 'string') return o; } catch {}
        break;
      }
    }
  }
  return { say: text.replace(/\{[\s\S]*$/, '').trim(), actions: [] };
}
// Backup intent router: used when the model fails or claims an action without doing it, so a demo line never dies.
function route(text, ctx = {}) {
  const t = text.toLowerCase(); const en = /\(reply in english\)/.test(t);
  const pend = (ctx.recent_txns || []).find((x) => x.status === 'pending') || { id: 'T1029' };
  const amt = (t.match(/(\d[\d,]*)/) || [])[1]?.replace(/,/g, '');
  const name = (t.match(/([a-zऀ-ॿ]+)\s+(ko|को|to)\b/) || [])[1];
  if (/fraud|scam|dhokha|धोखा|फ्रॉड|nikal liye|chura/.test(t)) return { say: en ? "I'm here. Filing a cybercrime complaint and drafting your bank email. Please also call 1930 now." : 'Main yahin hoon. Cybercrime complaint aur bank ka email taiyaar kar raha hoon, abhi 1930 pe call bhi kar dijiye.', actions: [{ tool: 'report_fraud', args: { id: pend.id } }] };
  if (/insaan|human|agent|person|इंसान/.test(t)) return { say: en ? 'Connecting you to a human agent with a summary.' : 'Aapko human agent se jod raha hoon, poori baat likh ke bhej di hai.', actions: [{ tool: 'handoff_human', args: { summary: text } }] };
  if (/credit score|cibil|स्कोर|score/.test(t)) return { say: en ? "You don't have a score yet (CIBIL shows NH, no history). A small credit line paid on time for ~6 months creates one." : 'Abhi aapka score bana hi nahi hai (CIBIL: NH). Chhoti credit line 6 mahine time pe bharoge toh score ban jayega.', actions: [{ tool: 'check_credit_score', args: {} }] };
  if (/loan|लोन/.test(t) && /reject|kyun|why|nahi|नहीं|क्यों|pass/.test(t)) return { say: en ? "The lender doesn't share its exact reason, but against Paytm's own criteria your age, credit history and income are amber. Want a plan?" : 'Lender exact reason nahi batata, par Paytm ke criteria pe age, credit history aur income amber hain. Plan banaun?', actions: [{ tool: 'explain_rejection', args: {} }] };
  if (/plan|aage|next|continue/.test(t)) { const done = ctx.fixes_done || []; const step = ['start_credit_builder', 'link_bank_statement', 'enable_autopay'].find((x) => !done.includes(x)); return step ? { say: en ? 'Starting the next step, tap Yes below.' : 'Agla step shuru kar raha hoon, neeche Yes dabaiye.', actions: [{ tool: 'start_fix_step', args: { step } }, { tool: 'schedule_recheck', args: { days: 60 } }] } : { say: en ? 'All steps are done; re-check is booked.' : 'Saare steps ho gaye, re-check book hai.', actions: [] }; }
  if (/recharge|रिचार्ज/.test(t)) return { say: en ? 'Setting up your regular ₹299 recharge, tap Yes below.' : 'Aapka regular ₹299 recharge set kar raha hoon, neeche Yes dabaiye.', actions: [{ tool: 'recharge_mobile', args: { amount: amt || 299 } }] };
  if (/bus|बस/.test(t)) { const m = t.match(/([a-z]+)\s+(se|से|from)\s+([a-z]+)/) || t.match(/from\s+([a-z]+)\s+to\s+([a-z]+)/); if (m) { const [from, to] = m[2] === 'se' || m[2] === 'से' || m[2] === 'from' ? [m[1], m[3]] : [m[1], m[2]]; return { say: en ? `Finding buses ${from} to ${to}.` : `${from} se ${to} ki bus dhoondh raha hoon.`, actions: [{ tool: 'book_bus', args: { from: from[0].toUpperCase() + from.slice(1), to: to[0].toUpperCase() + to.slice(1), date: /kal|tomorrow/.test(t) ? 'tomorrow' : 'today' } }] }; } }
  if (/kat gaya|kat gaye|कट गय|nahi pahu|nahi mila|पहुंचा नहीं|debit|fail|deduct|nahi aaya|atak/.test(t)) return /complaint|शिकायत|dispute|file/.test(t) ? { say: en ? 'Filing a complaint for that payment, tap Yes below.' : 'Us payment ki complaint file kar raha hoon, neeche Yes dabaiye.', actions: [{ tool: 'raise_dispute', args: { id: pend.id } }] } : { say: en ? 'Checking that payment with your bank.' : 'Us payment ka status bank se check kar raha hoon.', actions: [{ tool: 'check_txn_status', args: { id: pend.id } }] };
  if (name && amt && /bhej|send|pay|भेज/.test(t) && !/bheje the|bheja tha|bheje\b|sent yesterday|kal .*bhej/.test(t)) return { say: en ? `Paying ₹${amt} to ${name}, tap Yes below.` : `${name} ko ₹${amt} bhej raha hoon, neeche Yes dabaiye.`, actions: [{ tool: 'pay_contact', args: { name, amount: Number(amt) } }] };
  if (/complaint|शिकायत|dispute/.test(t)) return { say: en ? 'Filing the complaint, tap Yes below.' : 'Complaint file kar raha hoon, neeche Yes dabaiye.', actions: [{ tool: 'raise_dispute', args: { id: pend.id } }] };
  if (/paisa|paise|पैसा|money|payment|पहुं|pahuch|pahunch|kat gaya|कट/.test(t)) return { say: en ? 'Checking that payment with your bank.' : 'Us payment ka status bank se check kar raha hoon.', actions: [{ tool: 'check_txn_status', args: { id: pend.id } }] };
  if (/mail|email|ईमेल/.test(t)) return { say: en ? 'Drafting the email to your bank.' : 'Bank ke liye email draft kar raha hoon.', actions: [{ tool: 'draft_bank_email', args: { id: pend.id } }] };
  if (/history|हिस्ट्री/.test(t)) return { say: en ? 'Opening your history.' : 'History khol raha hoon.', actions: [{ tool: 'navigate', args: { screen: 'history' } }] };
  return null;
}
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
// Security caps (SECURITY.md): request sizes, message length, app-context size, audio size.
const CAP = { body: 64_000, msg: 2_000, ctx: 8_000, audio: 2_000_000 };
// Same rule as the client's redact(), applied again here so a PIN/OTP, Aadhaar, card number or PAN never reaches the model even if the client is bypassed.
const redact = (t) => String(t)
  .replace(/(^|[^a-z])(pin|otp|password|passcode|cvv|पिन|ओटीपी)(\D{0,12})\d(?:[\s-]?\d){2,}/gi, '$1$2$3[hidden]')
  .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}(?:[\s-]?\d{1,7})?\b/g, '[hidden]')
  .replace(/\b[a-z]{5}\d{4}[a-z]\b/gi, '[hidden]');
// ponytail: per-isolate counter, so a determined abuser spread across colos gets more; use Cloudflare's rate-limiting binding for a hard limit.
const hits = new Map();
function limited(ip) {
  const now = Date.now(), h = hits.get(ip);
  if (hits.size > 5000) hits.clear();
  if (!h || now - h.t > 60_000) { hits.set(ip, { t: now, n: 1 }); return false; }
  return ++h.n > 300; // ~20 voice turns a minute (chat + tts + stt each); a shared venue Wi-Fi IP still fits a live demo
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (url.pathname === '/api/status') return json({ sarvam: true, brain: 'sarvam-105b-conversations' });
    if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);
    const origin = req.headers.get('origin');
    if (origin && origin !== url.origin) return json({ error: 'forbidden' }, 403); // browsers on other sites can't spend our credits
    if (Number(req.headers.get('content-length')) > (url.pathname === '/api/stt' ? CAP.audio : CAP.body)) return json({ error: 'too large' }, 413);
    if (limited(req.headers.get('cf-connecting-ip') || 'unknown')) return json({ error: 'too many requests, wait a minute' }, 429);
    if (env.ACCESS_CODE && req.headers.get('x-access') !== env.ACCESS_CODE) return json({ error: 'access code needed' }, 401);
    try {
      if (url.pathname === '/api/chat') {
        const raw = await req.text();
        if (raw.length > CAP.body) return json({ error: 'too large' }, 413);
        const { messages, context } = JSON.parse(raw);
        const ctx = JSON.stringify(context ?? {});
        if (ctx.length > CAP.ctx) return json({ error: 'too large' }, 413);
        const sys = SYSTEM + '\n\nCURRENT APP CONTEXT (JSON):\n' + ctx;
        // Only user/assistant turns (a client can't smuggle in a "system" message), each capped and redacted.
        const msgs = (Array.isArray(messages) ? messages : []).filter((m) => m && (m.role === 'user' || m.role === 'assistant')).slice(-12)
          .map((m) => ({ role: m.role, content: redact(String(m.content ?? '').slice(0, CAP.msg)) }));
        if (!msgs.length || msgs[msgs.length - 1].role !== 'user') return json({ error: 'bad request' }, 400);
        const call = (m, temperature) => sarvam(env, '/v2/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'sarvam-105b-conversations', temperature, max_tokens: 500, messages: [{ role: 'system', content: sys }, ...m] }),
        });
        // Sarvam sometimes returns an empty answer (503 "no content") for a given input: retry once with a JSON nudge.
        const last = msgs[msgs.length - 1];
        let out = null;
        for (const [m, temp] of [[msgs, 0.3], [[...msgs.slice(-3, -1), { ...last, content: last.content + ' (reply in JSON)' }], 0.5]]) {
          try { const r = await call(m, temp); const text = String(r.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, ''); if (text.trim()) { out = pickJson(text); break; } } catch {}
        }
        const backup = route(last.content, context);
        // Model failed, or claimed an action without calling a tool: use the router's action.
        if (!out) out = backup || { say: 'Ek second, network slow hai. Phir se boliye?', actions: [] };
        // ...but never turn a model refusal ("nahi kar sakta") into a payment.
        else if (backup && !(out.actions || []).some((a) => a.tool && a.tool !== 'none') && !(backup.actions.some((a) => a.tool === 'pay_contact') && /(nahi|nahin|नहीं) kar (sakta|sakti|sakunga|paunga)|cannot|can't|won't/i.test(out.say || '')) && /(ho gaya|kar diya|bhej diye|bhej diya|done|✅|file kar di|kar raha|kar rahi|dhoondh|check)/i.test(out.say || '')) out.actions = backup.actions;
        return json(out);
      }
      if (url.pathname === '/api/stt') {
        const audio = await req.arrayBuffer();
        if (audio.byteLength > CAP.audio) return json({ error: 'too large' }, 413);
        const form = new FormData();
        form.append('file', new Blob([audio], { type: (req.headers.get('content-type') || 'audio/webm').split(';')[0] }), 'speech.webm');
        form.append('model', 'saaras:v4');
        form.append('mode', 'codemix');
        // Android's MediaRecorder WebM has no duration header; Sarvam sometimes reads it as >30 s. Retry labelled as Ogg.
        let r;
        try { r = await sarvam(env, '/speech-to-text', { method: 'POST', body: form }); }
        catch (e) {
          if (!/duration|Invalid file/i.test(e.message)) throw e;
          const f2 = new FormData();
          f2.append('file', new Blob([audio], { type: 'audio/ogg' }), 'speech.ogg');
          f2.append('model', 'saaras:v4'); f2.append('mode', 'codemix');
          r = await sarvam(env, '/speech-to-text', { method: 'POST', body: f2 });
        }
        return json({ text: String(r.transcript ?? '').trim(), lang: r.language_code ?? 'hi-IN' });
      }
      if (url.pathname === '/api/tts') {
        const { text, lang } = await req.json();
        const r = await sarvam(env, '/text-to-speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: String(text).slice(0, 600), language_code: /^[a-z]{2}-IN$/.test(lang) ? lang : 'hi-IN', model: 'bulbul:v4-flash', speaker: 'amit_hi_conversational' }) });
        return json({ audio: r.audios?.[0] || null });
      }
      return json({ error: 'not found' }, 404);
    } catch (e) {
      console.error(e); // details stay in Worker logs; never echo upstream error bodies to the client
      return json({ error: 'upstream error, try again' }, 502);
    }
  },
};
