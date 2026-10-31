// Offline scripted demo for the UI variants: #demo=<flow> replays a fixed brain script through the REAL
// ask() → say() → tools path (only fetch is stubbed), so each variant's UI reacts exactly as it would live.
// Extra hash keys: hold=listen (end in the listening pose), hold=confirm (never auto-approve), hold=think (brain never answers), steps=N (stop after N turns).
// Load BEFORE app.js (it patches fetch before app.js asks /api/status).
(() => {
  const H = new URLSearchParams(location.hash.slice(1));
  const flow = H.get('demo');
  if (!flow) return;
  // headless virtual time can freeze CSS transitions mid-way; variants drop them under html.demo-still
  if (H.has('still')) document.documentElement.classList.add('demo-still');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const T = (heard, say, actions = []) => [heard, { say, actions }];
  const FLOWS = {
    loan: [
      T('mera loan reject kyun hua?', 'Lender exact reason nahi batata, par Paytm ke published criteria se milaya: 4 mein se 4 abhi poore nahi. Plan banaun?', [{ tool: 'explain_rejection' }]),
      T('haan, plan bana do', 'Teen steps hain, har ek aapke OK se karungi.', [
        { tool: 'start_fix_step', args: { step: 'enable_autopay' } }, { tool: 'start_fix_step', args: { step: 'start_credit_builder' } },
        { tool: 'start_fix_step', args: { step: 'link_bank_statement' } }, { tool: 'schedule_recheck', args: { days: 60 } }]),
    ],
    txn: [
      T('Sharma Kirana ko ₹500 bheje the, unko mile nahi', 'Bank se check kiya: ₹500 kat gaye, Sharma Kirana ko nahi pahunche. Complaint file kar doon?', [{ tool: 'check_txn_status', args: { id: 'T1029' } }]),
      T('haan, complaint kar do', 'Complaint file ho gayi. Kal tak paisa wapas aana chahiye; late hua to bank aapko ₹100 roz dega.', [{ tool: 'raise_dispute', args: { id: 'T1029' } }]),
    ],
    pay: [T('Rohit ko 255 bhej do', 'Contacts mein Rohit Verma mile. ₹255 bhej rahi hoon, aap confirm karo.', [{ tool: 'pay_contact', args: { name: 'Rohit', amount: 255 } }])],
    recharge: [T('mera 299 wala recharge kar do', 'Aapka regular ₹299 Airtel plan, 28 din. Confirm karo.', [{ tool: 'recharge_mobile', args: { amount: 299 } }])],
    bus: [T('kal Noida se Delhi ki bus book karo', '872 buses mein sabse sasti Paytm Assured: Shri Ganesh Yatra, 6:50 PM, ₹619. Book karoon?', [{ tool: 'book_bus', args: { from: 'Noida', to: 'Delhi', date: 'kal' } }])],
    score: [T('mera credit score kitna hai?', 'Abhi score bana hi nahi, koi loan ya card nahi hai. Chhoti credit line 6 mahine time pe bharo, pehla score ban jayega.', [{ tool: 'check_credit_score' }])],
    hindi: [T('मेरा ₹500 अटका है, शर्मा किराना को नहीं पहुँचा', 'बैंक से चेक किया: ₹500 कट गए, पर शर्मा किराना को नहीं पहुँचे। शिकायत दर्ज कर दूँ?', [{ tool: 'check_txn_status', args: { id: 'T1029' } }])],
    help: [T('kisi insaan se baat karao', 'Human agent ko jod rahi hoon; unhe poori baat pehle se pata hogi.', [{ tool: 'handoff_human', args: { summary: '₹500 to Sharma Kirana debited, not credited. User wants a human.' } }])],
  };
  let next = null, hang = false;
  const real = window.fetch.bind(window);
  window.fetch = async (u, o) => {
    const p = String(u);
    if (p.includes('/api/status')) return new Response('{"sarvam":false,"brain":"demo"}');
    if (p.includes('/api/tts')) return new Response('{}');
    if (p.includes('/api/chat')) { await wait(900); if (hang) await new Promise(() => {}); return new Response(JSON.stringify(next)); }
    return real(u, o);
  };
  // Headless has no voice: finish "speaking" after a reading-speed delay so the UI leaves the talking state.
  speechSynthesis.speak = (ut) => setTimeout(() => ut.onend && ut.onend(), 600 + ut.text.length * 25);
  addEventListener('load', async () => {
    const hold = H.get('hold');
    const oc = confirmAction;
    confirmAction = (w) => { const p = oc(w); if (hold !== 'confirm') setTimeout(() => settle(true), 1500); return p; };
    const op = askPin;
    askPin = (w) => { const p = op(w); setTimeout(() => document.querySelector('#pad button')?.click(), 1100); return p; };
    const turns = (FLOWS[flow] || []).slice(0, H.has('steps') ? +H.get('steps') : 99);
    await wait(900);
    for (const [k, [heard, reply]] of turns.entries()) {
      const m = document.querySelector('#mascot');
      m.classList.add('listen'); document.querySelector('#heard').textContent = 'Listening… bolo, main sun rahi hoon';
      await wait(1500); m.classList.remove('listen');
      next = reply; hang = hold === 'think' && k === turns.length - 1;
      await ask(heard); await wait(2000);
    }
    if (hold === 'listen') { document.querySelector('#mascot').classList.add('listen'); document.querySelector('#heard').textContent = 'Listening… bolo, main sun rahi hoon'; }
  });
})();
