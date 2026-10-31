// Variant C "Character": layered on top of the shared app.js (same tools, brain and API calls).
// Adds: moods (happy / sad / point), walking to the card being discussed, live lip-sync, confetti, #demo=<flow>.
(() => {
  const M = $('#mascot'), SA = $('#saathi');
  const DEMO = new URLSearchParams(location.hash.slice(1)).get('demo');

  // ---------- moods ----------
  let moodT;
  const mood = (m, ms = 2800) => { M.classList.remove('happy', 'sad'); clearTimeout(moodT); if (!m) return; M.classList.add(m); if (ms) moodT = setTimeout(() => M.classList.remove(m), ms); };
  window.boloMood = mood;

  function celebrate() {
    mood('happy', 2600);
    try { navigator.vibrate?.([18, 40, 18]); } catch {}
    const r = M.getBoundingClientRect(), box = $('#confetti');
    const C = ['#00BAF2', '#002E6E', '#FFC531', '#21A04B', '#7FD6F7', '#004299'];
    for (let i = 0; i < 22; i++) {
      const e = document.createElement('i'); if (i % 3 === 0) e.className = 'r';
      const a = Math.PI * (1.05 + Math.random() * .9), d = 90 + Math.random() * 120;
      e.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + 20}px;background:${C[i % C.length]};--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d + 60}px;--r:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 120}ms`;
      box.appendChild(e); setTimeout(() => e.remove(), 1700);
    }
    const card = document.querySelector('#screen .bolo-card.pointed') || [...document.querySelectorAll('#screen .bolo-card')].pop();
    if (card) { card.classList.remove('bounce'); void card.offsetWidth; card.classList.add('bounce'); }
  }
  window.boloCelebrate = celebrate;

  // Wrap every tool: mood follows the outcome. Same tool names/args, so the brain contract is unchanged.
  const WIN = /^(paid|recharged|booked|filed|done:|handed off)/;
  for (const k of Object.keys(tools)) {
    const f = tools[k];
    tools[k] = async (a) => {
      const out = await f(a);
      const s = typeof out === 'string' ? out : '';
      if (k === 'check_txn_status' && /not yet credited|Debited/i.test(s)) mood('sad', 0);
      else if (s === 'user said no') mood('sad', 1800);
      else if (WIN.test(s)) setTimeout(celebrate, 250);
      return out;
    };
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-jump]')) setTimeout(celebrate, 400); });

  // ---------- walk to the card being talked about (never on top of content: the card opens a perch gap) ----------
  const _render = render;
  let walkT;
  render = function () {
    _render();
    if (S.screen !== 'txn') M.classList.remove('sad');
    const card = [...document.querySelectorAll('#screen .flash:not(.ov)')].pop() || document.querySelector('#screen .bolo-card');
    clearTimeout(walkT);
    if (!card) return home();
    card.classList.add('pointed');
    walkT = setTimeout(() => { card.scrollIntoView({ behavior: DEMO ? 'auto' : 'smooth', block: 'center' }); walkT = setTimeout(() => perch(card), DEMO ? 60 : 520); }, 30);
  };
  // Perch: Bolo + his words move into a gap the card opens above itself, so neither covers any content.
  let perchedOn = null;
  function home() { perchedOn = null; SA.classList.remove('away'); SA.style.cssText = ''; M.classList.remove('point', 'perched'); }
  function perch(card) {
    perchedOn = card;
    const app = $('#app').getBoundingClientRect();
    SA.classList.add('away'); M.classList.add('point', 'perched');
    SA.style.width = card.getBoundingClientRect().width + 'px';
    const h = SA.offsetHeight;
    card.style.marginTop = (h + 12) + 'px';
    const c = card.getBoundingClientRect();
    SA.style.left = (c.left - app.left) + 'px';
    SA.style.top = (c.top - app.top - h - 6) + 'px';
  }
  new ResizeObserver(() => { if (perchedOn && perchedOn.isConnected) perch(perchedOn); }).observe(SA);

  // reserve the open reply panel's height at the page bottom (content is never trapped under it)
  new ResizeObserver(() => { const b = $('#bubble'); document.documentElement.style.setProperty('--panel', (b.hidden || $('#saathi').classList.contains('away') ? 0 : b.offsetHeight + 12) + 'px'); }).observe($('#bubble'));
  if (/sheet=pin/.test(location.hash)) { $('#pin').hidden = true; askPin('Pay ₹255 to Rohit Verma'); }

  // ---------- lip-sync: mouth opening follows the real TTS audio amplitude ----------
  let ac, raf;
  const setAmp = (v) => M.style.setProperty('--amp', v.toFixed(3));
  function lipsFrom(audio) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume?.();
      const src = ac.createMediaElementSource(audio), an = ac.createAnalyser(); an.fftSize = 512;
      src.connect(an); an.connect(ac.destination);
      const buf = new Uint8Array(an.fftSize); M.classList.add('lips');
      const tick = () => { an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) s += (v - 128) ** 2; setAmp(Math.min(1, Math.sqrt(s / buf.length) / 28)); raf = requestAnimationFrame(tick); };
      cancelAnimationFrame(raf); tick();
      audio.addEventListener('ended', () => { cancelAnimationFrame(raf); M.classList.remove('lips'); setAmp(0); });
    } catch (e) { M.classList.remove('lips'); }
  }
  const _Audio = window.Audio;
  window.Audio = function (src) { const a = new _Audio(src); a.addEventListener('play', () => lipsFrom(a), { once: true }); return a; };
  // browser-voice fallback has no amplitude: syllable-like random envelope
  function fakeLips(ms) {
    M.classList.add('lips'); const t0 = performance.now();
    const tick = (t) => { const k = (t - t0) / 1000; setAmp(Math.max(0, .45 + .4 * Math.sin(k * 17) * Math.sin(k * 5.3) + (Math.random() - .5) * .2)); if (t - t0 < ms) raf = requestAnimationFrame(tick); else { M.classList.remove('lips'); setAmp(0); } };
    cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
  }
  const _speak = speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak = (u) => { fakeLips(Math.min(9000, 70 * (u.text || '').length)); _speak(u); };


  $('#askchip').onclick = () => { $('#bubble').hidden = false; $('#kbd').click(); };

  // ---------- #demo=<flow>: scripted, offline (no brain, no TTS) for screenshots and rehearsal ----------
  if (!DEMO) return;
  say = async (text) => { clearTimeout(hideT); $('#bubble').hidden = false; $('#said').textContent = text; M.classList.add('talk'); if (!/still/.test(location.hash)) fakeLips(60000); };
  const P = new URLSearchParams(location.hash.slice(1));
  const heard = (t) => { $('#bubble').hidden = false; $('#heard').textContent = '“' + t + '”'; };
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const autoYes = () => { const iv = setInterval(() => { if (!$('#confirm').hidden) { clearInterval(iv); setTimeout(() => $('#cyes').click(), 500); } }, 100); const iv2 = setInterval(() => { const b = $('#pad .paynow'); if (b && !$('#pin').hidden) { clearInterval(iv2); setTimeout(() => b.click(), 500); } }, 100); };
  const flows = {
    idle: async () => { go('home'); $('#bubble').hidden = false; $('#said').innerHTML = '<div class="bolo-name">Bolo</div>Namaste Udit. Tap karke boliye, main kar deta hoon.'; },
    listen: async () => { go('home'); M.classList.add('listen'); $('#bubble').hidden = false; $('#heard').textContent = 'Listening… boliye, main sun raha hoon'; $('#said').textContent = ''; },
    think: async () => { S.loan = 'rejected'; go('loan'); heard('yeh loan reject kyun hua?'); $('#said').textContent = '…'; M.classList.add('think'); },
    loan: async () => { S.loan = 'rejected'; go('loan'); heard('yeh loan reject kyun hua?'); await wait(150); tools.explain_rejection({}); S.loan = 'explained'; render(); say('Lender reason nahi batata. Paytm ke criteria se check kiya: 4 mein se 4 abhi green nahi hain. Plan banaun?'); },
    plan: async () => { S.loan = 'explained'; go('loan'); heard('AutoPay on kar do'); autoYes(); await tools.start_fix_step({ step: 'enable_autopay' }); say('AutoPay on ho gaya. Ek step aur green.'); },
    eligible: async () => { Object.keys(S.fixes).forEach((k) => (S.fixes[k] = true)); S.recheckDays = 60; S.loan = 'eligible'; go('loan'); say('Sab checks green! Lender B se ₹40,000 ke liye eligible ho.'); setTimeout(celebrate, 300); },
    txn: async () => { S.openTxn = 'T1029'; go('txn'); heard('mera ₹500 wala payment nahi pahuncha'); await tools.check_txn_status({ id: 'T1029' }); say('Paisa bank se kat gaya par Sharma Kirana tak nahi pahuncha. Kal tak wapas aana chahiye. Complaint file karun?'); },
    dispute: async () => { S.openTxn = 'T1029'; go('txn'); heard('haan complaint kar do'); if (P.get('auto')) autoYes(); await tools.raise_dispute({ id: 'T1029' }); say('Complaint file ho gayi. Bank late hua toh ₹100 roz milenge.'); },
    pay: async () => { heard('Rohit ko 255 bhej do'); say('Rohit Verma ko ₹255 bhejun?'); if (P.get('auto')) autoYes(); await tools.pay_contact({ name: 'Rohit', amount: 255 }); say('Ho gaya, ₹255 Rohit ko chale gaye.'); },
    recharge: async () => { heard('mera recharge kar do'); autoYes(); await tools.recharge_mobile({ amount: 299 }); say('₹299 ka recharge ho gaya, 26 Nov tak chalega.'); },
    bus: async () => { heard('kal Noida se Delhi bus book karo'); if (P.get('auto')) autoYes(); await tools.book_bus({ from: 'Noida', to: 'Delhi', date: 'kal' }); say('Seat 14 book ho gayi, ticket SMS pe aa gaya.'); },
    score: async () => { heard('mera credit score kitna hai?'); tools.check_credit_score({}); say('Abhi score bana hi nahi, kyunki koi loan ya card nahi hai. Main bana sakta hoon plan.'); },
  };
  setTimeout(() => (flows[DEMO] || flows.idle)(), 700);
})();
