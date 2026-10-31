// Saathi demo server: serves the Paytm-style app and proxies voice + brain calls so keys stay on the Mac.
// Run: node server.mjs  (reads .env next to this file). No dependencies.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const dir = path.dirname(new URL(import.meta.url).pathname);
if (existsSync(path.join(dir, '.env')))
  for (const line of readFileSync(path.join(dir, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
const PORT = Number(process.env.PORT || 7810);
const SARVAM = process.env.SARVAM_API_KEY || '';
const ANTHROPIC = process.env.ANTHROPIC_API_KEY || '';

async function sarvam(p, init) {
  const r = await fetch('https://api.sarvam.ai' + p, {
    ...init,
    headers: { 'api-subscription-key': SARVAM, Authorization: `Bearer ${SARVAM}`, ...init.headers },
    signal: AbortSignal.timeout(30_000),
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
const SYSTEM = readFileSync(path.join(dir, 'brain.md'), 'utf8');

// The brain returns JSON {say, actions:[{tool,args}]}; the app executes the actions on its own screens.
async function think(messages, context) {
  const sys = SYSTEM + '\n\nCURRENT APP CONTEXT (JSON):\n' + JSON.stringify(context);
  let text;
  if (ANTHROPIC) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': ANTHROPIC, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: process.env.BRAIN_MODEL || 'claude-haiku-5-5', max_tokens: 700, system: sys, messages }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) throw new Error(`Claude ${r.status} ${(await r.text()).slice(0, 200)}`);
    text = (await r.json()).content?.map((c) => c.text || '').join('') || '';
  } else if (SARVAM) {
    const r = await sarvam('/v2/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.SARVAM_BRAIN || 'sarvam-105b-conversations', temperature: 0.3, max_tokens: 500, messages: [{ role: 'system', content: sys }, ...messages] }),
    });
    text = String(r.choices?.[0]?.message?.content ?? '').replace(/<think>[\s\S]*?<\/think>/g, '');
  } else throw new Error('no brain key: set ANTHROPIC_API_KEY or SARVAM_API_KEY in app/.env');
  return pickJson(text);
}

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const body = (req) => new Promise((ok) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c))); });
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (req.method === 'GET' && url.pathname === '/api/status') return send(res, 200, { sarvam: !!SARVAM, brain: ANTHROPIC ? 'claude' : SARVAM ? 'sarvam-105b-conversations' : 'none' });
    if (req.method === 'POST' && url.pathname === '/api/chat') {
      const { messages, context } = JSON.parse(await body(req));
      return send(res, 200, await think(messages, context));
    }
    if (req.method === 'POST' && url.pathname === '/api/stt') {
      if (!SARVAM) return send(res, 503, { error: 'no SARVAM_API_KEY' });
      const form = new FormData();
      form.append('file', new Blob([await body(req)], { type: (req.headers['content-type'] || 'audio/webm').split(';')[0] }), 'speech.webm');
      form.append('model', 'saaras:v4');
      form.append('mode', 'codemix');
      const r = await sarvam('/speech-to-text', { method: 'POST', body: form });
      return send(res, 200, { text: String(r.transcript ?? '').trim(), lang: r.language_code ?? 'hi-IN' });
    }
    if (req.method === 'POST' && url.pathname === '/api/tts') {
      if (!SARVAM) return send(res, 503, { error: 'no SARVAM_API_KEY' });
      const { text, lang } = JSON.parse(await body(req));
      const r = await sarvam('/text-to-speech', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: String(text).slice(0, 2500), language_code: lang || 'hi-IN', model: 'bulbul:v4-flash', speaker: 'amit_hi_conversational' }) });
      return send(res, 200, { audio: r.audios?.[0] || null });
    }
    const file = path.join(dir, 'public', url.pathname === '/' ? 'index.html' : path.normalize(url.pathname));
    if (!file.startsWith(path.join(dir, 'public'))) return send(res, 403, {});
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch (e) {
    send(res, e.code === 'ENOENT' ? 404 : 500, { error: String(e.message || e) });
  }
}).listen(PORT, () => console.log(`Saathi demo on http://localhost:${PORT}`));
