// Drives the Bolo app open in Chrome on the phone (via adb forward tcp:9222) and runs a battery of utterances.
// Usage: node test/phone_test.mjs [cases.json]   Prints one line per case: what Bolo said, which tools ran, final screen.
const tabs = await (await fetch('http://localhost:9222/json')).json();
const tab = tabs.find((t) => t.type === 'page' && t.url.startsWith('https://bolo-demo-7q.seriouss.workers.dev'));
if (!tab) throw new Error('Bolo tab not open on the phone');
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((ok) => (ws.onopen = ok));
let id = 0; const waiting = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (waiting.has(d.id)) { waiting.get(d.id)(d); waiting.delete(d.id); } };
const ev = (expression) => new Promise((ok) => { const i = ++id; waiting.set(i, ok); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } })); })
  .then((d) => d.result?.result?.value ?? d.result?.exceptionDetails?.exception?.description);

// Fresh code on the phone, and browser TTS instead of Sarvam during tests to save credits.
await ev('location.reload(); 1'); await new Promise((r) => setTimeout(r, 4000));
const ws2 = ws; await ev('1');
const fs = await import('node:fs');
const cases = JSON.parse(fs.readFileSync(process.argv[2] || new URL('./cases.json', import.meta.url), 'utf8'));
// The app's top-level consts are global lexical bindings, so they are reachable from Runtime.evaluate.
const reset = `status.sarvam=false;speechSynthesis.cancel();S.screen='home';S.loan='offer';S.fixes={enable_autopay:false,link_bank_statement:false,start_credit_builder:false};S.recheckDays=null;S.bus=null;S.tickets=[];S.txns.forEach(t=>{delete t.check;delete t.ticket});history.length=0;document.querySelector('#log').innerHTML='';render();'ok'`;
for (const c of cases) {
  if (c.reset !== false) await ev(reset);
  if (c.setup) await ev(c.setup);
  const out = [];
  for (const u of [].concat(c.say)) {
    const t0 = Date.now();
    // Auto-answer any confirm sheet with c.confirm (default yes) so flows complete unattended.
    await ev(`(async()=>{ const p = ask(${JSON.stringify(u)}); const tick=setInterval(()=>{ if(!document.querySelector('#confirm').hidden) settle(${c.confirm !== false}); if(!document.querySelector('#pin').hidden) document.querySelector('#pad button')?.click(); },300); await p; await new Promise(r=>setTimeout(r,1500)); clearInterval(tick); })()`);
    const r = await ev(`({said: document.querySelector('#said').textContent, log: [...document.querySelectorAll('#log div')].map(d=>d.textContent.replace(/^\\S+\\s+\\S*\\s*/,'')).reverse(), screen: S.screen, loan: S.loan, fixes: Object.keys(S.fixes).filter(k=>S.fixes[k]), bus: S.bus, tickets: S.tickets.length, disputes: S.txns.filter(t=>t.ticket).map(t=>t.id)})`);
    out.push({ u, ms: Date.now() - t0, ...r });
  }
  console.log(`\n## ${c.name}`);
  for (const o of out) console.log(`  > ${o.u}\n    Bolo: ${o.said}\n    tools: ${o.log.filter((l) => l.includes('→')).join(' | ') || '(none)'}\n    state: screen=${o.screen} loan=${o.loan} fixes=${o.fixes} bus=${o.bus ? JSON.stringify(o.bus) : '-'} tickets=${o.tickets} disputes=${o.disputes}  [${o.ms}ms]`);
}
await ev('status.sarvam=true; 1');
ws.close();
