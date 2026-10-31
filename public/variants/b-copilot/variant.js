// Variant B "Copilot sheet": Bolo is a docked bar that rises into a half-height sheet (Gemini-overlay style).
// The conversation holds the results as tappable Paytm cards; the dimmed app above keeps updating live.
// The original #saathi / #confirm stay in the DOM (app.js binds them) but are hidden; this layer mirrors them.
(() => {
  const q = (s) => document.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MIC = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>';
  q('#app').insertAdjacentHTML('beforeend', `
    <div id="cp-dim"></div>
    <section id="cp" class="dock" aria-label="Bolo assistant">
      <div class="cp-grab"></div>
      <header class="cp-head"><span class="cp-mark"></span><div class="grow"><b>Bolo</b><small>Paytm assistant · replies in <span class="cp-lang">Hinglish</span></small></div><button class="cp-x" type="button" aria-label="Minimise">⌄</button></header>
      <div class="cp-tl"><div class="cp-hello">Namaste Udit. Bolo can check, explain and do things in your Paytm app. You approve every step.</div></div>
      <div class="cp-chips"></div>
      <form class="cp-bar"><span class="cp-mark sm"></span><input placeholder="Ask Bolo in your language…" autocomplete="off"><button type="button" class="cp-mic" aria-label="Speak">${MIC}</button></form>
    </section>`);
  const cp = q('#cp'), tl = q('.cp-tl'), m = q('#mascot');
  const open = (on = true) => { cp.className = on ? 'open' : 'dock'; document.documentElement.classList.toggle('cp-open', on); };
  const bottom = () => requestAnimationFrame(() => { tl.scrollTop = tl.scrollHeight; });
  const add = (html, cls, key) => {
    if (key) tl.querySelector(`[data-k="${key}"]`)?.remove();
    const d = document.createElement('div'); d.className = cls; if (key) d.dataset.k = key; d.innerHTML = html;
    tl.querySelector('.typing')?.remove(); tl.append(d); bottom(); chips(); return d;
  };

  q('.cp-x').onclick = () => open(false);
  q('#cp-dim').onclick = () => open(false);
  q('.cp-bar input').onfocus = () => open(true);
  q('.cp-mic').onclick = () => { open(true); m.click(); };
  q('.cp-bar').onsubmit = (e) => { e.preventDefault(); const i = q('.cp-bar input'); const v = i.value.trim(); i.value = ''; if (v) ask(v); };
  q('.cp-grab').onclick = () => open(cp.className === 'dock');

  // listening / thinking mirror the original mascot's classes
  let wasThink = false;
  new MutationObserver(() => {
    const c = m.classList, think = c.contains('think'), started = think && !wasThink; wasThink = think;
    cp.classList.toggle('listening', c.contains('listen'));
    q('.cp-bar input').placeholder = c.contains('listen') ? 'Listening… bolo, main sun rahi hoon' : 'Ask Bolo in your language…';
    if (c.contains('listen')) open(true);
    if (started) { tl.insertAdjacentHTML('beforeend', '<div class="m b typing"><i></i><i></i><i></i></div>'); bottom(); }
    if (!think) tl.querySelector('.typing')?.remove();
  }).observe(m, { attributes: true, attributeFilter: ['class'] });

  const origAsk = ask;
  ask = (t) => { if (t) { open(true); add(esc(t), 'm u'); } return origAsk(t); };
  const origSay = say;
  say = (t) => { if (t) add(esc(t), 'm b'); q('.cp-lang').textContent = replyIn; return origSay(t); };

  // ---- approvals happen inside the conversation, as a Paytm card with the two buttons ----
  const av = (n) => `<span class="cp-av">${n.split(' ').slice(0, 2).map((w) => w[0]).join('')}</span>`;
  function askCard(what) {
    if (S.bus && S.bus.stage === 'results' && !S.bus.booked) return `<div class="cp-k">Bolo picked · cheapest Paytm Assured of 872</div>
      <div class="cp-row"><div class="grow"><b>Shri Ganesh Yatra Travels</b><small>Bharat Benz AC Seater 2+2 · ★3.8</small></div><span class="cp-assured">Paytm Assured</span></div>
      <div class="cp-row big"><span>06:50 PM → 07:35 PM</span><b>₹619</b></div><small>${esc(S.bus.from)} → ${esc(S.bus.to)} · ${esc(S.bus.dateLabel)} · 49 seats left</small>`;
    if (S.pay && S.pay.name) return `<div class="cp-k">Paying</div><div class="cp-row">${av(S.pay.name)}<div class="grow"><b>${esc(S.pay.name)}</b><small>${esc(S.pay.name.split(' ')[0].toLowerCase())}@ptyes · in your contacts</small></div><b class="amt">₹${S.pay.amount}</b></div>`;
    if (S.screen === 'recharge') return `<div class="cp-k">Recharge</div><div class="cp-row"><span class="cp-op">airtel</span><div class="grow"><b>98XXX XX210</b><small>Airtel Prepaid · your regular plan</small></div><b class="amt">₹299</b></div><small>28 days · unlimited calls · 1.5 GB/day</small>`;
    return `<div class="cp-k">Bolo wants to</div><b>${esc(what)}</b>`;
  }
  const origConfirm = confirmAction;
  confirmAction = (what) => {
    const p = origConfirm(what);
    const yes = S.bus && S.bus.stage === 'results' ? 'Book for ₹619' : S.pay && S.pay.name ? 'Proceed Securely' : 'Yes, do it';
    const card = add(`${askCard(what)}<div class="cp-btns"><button class="no" type="button">Not now</button><button class="yes" type="button">${yes}</button></div>`, 'cp-card ask');
    card.querySelector('.yes').onclick = () => settle(true);
    card.querySelector('.no').onclick = () => settle(false);
    return p.then((y) => { card.querySelector('.cp-btns').outerHTML = `<div class="cp-done ${y ? '' : 'neg'}">${y ? '✓ You approved' : 'You said no'}</div>`; chips(); return y; });
  };

  // ---- results become cards in the timeline (clones keep their data-say / data-jump buttons working) ----
  const clone = (re) => { const c = [...document.querySelectorAll('#screen .bolo-card')].filter((x) => !re || re.test(x.textContent)).pop(); return c && c.innerHTML; };
  const card = (key, html) => html && add(html, 'cp-card', key);
  const receipt = (amt, line, sub) => `<div class="cp-receipt"><div class="cp-amt">₹${amt}<span class="cp-ok">✓</span></div><b>${line}</b><small>${sub}</small><span class="cp-stamp">paytm</span></div>`;
  const CARD = {
    check_txn_status: () => card('txn', clone()),
    raise_dispute: () => card('txn', clone()),
    explain_rejection: () => card('crit', clone(/criteria/)),
    loan_precheck: () => card('crit', clone(/criteria/)),
    start_fix_step: () => card('plan', clone(/Your plan/)),
    schedule_recheck: () => card('plan', clone(/Your plan/)),
    handoff_human: () => card('help', clone()),
    check_credit_score: () => card('score', `<div class="cp-k">CIBIL · via Paytm</div><div class="cp-row"><span class="cp-nh">NH</span><div class="grow"><b>No credit history yet</b><small>No loan or card, so there's nothing to score</small></div></div><button class="btn" data-say="credit score banane ka plan bana do">Build my score with Bolo</button>`),
    pay_contact: (a, out) => out === 'paid' ? card('', receipt(a.amount, `Paid to ${esc(S.txns[0].to)}`, 'UPI · just now · from UCO Bank ••1234'))
      : S.matches ? card('', `<div class="cp-k">Which one?</div>${S.matches.map((n) => `<button class="cp-pick" data-say="${esc(n)} ko ₹${a.amount} bhejo">${av(n)}${esc(n)}</button>`).join('')}`) : null,
    recharge_mobile: (a, out) => out === 'recharged' && card('', receipt(a.amount || 299, 'Airtel Prepaid recharged', '98XXX XX210 · active till 26 Nov')),
    book_bus: (a, out) => out === 'booked seat 14' && card('', receipt(619, 'Bus booked · seat 14', `Shri Ganesh Yatra · ${esc(S.bus.dateLabel)} 06:50 PM · ticket on SMS`)),
  };
  for (const [k, fn] of Object.entries(tools)) {
    if (!CARD[k]) continue;
    tools[k] = async (a = {}) => { const out = await fn(a); CARD[k](a, out); return out; };
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-jump]')) setTimeout(() => card('elig', clone(/eligible/)), 50); });

  // ---- quick replies in the user's language, tuned to where they are ----
  function chips() {
    const L = replyIn === 'English' ? 0 : replyIn === 'Hindi' ? 2 : 1;
    const t = (...a) => a[L];
    let c;
    if (pending) c = [t('Yes, go ahead', 'Haan, kar do', 'हाँ, कर दो'), t('No', 'Nahi', 'नहीं')];
    else if (S.screen === 'loan' && S.loan === 'explained') c = [t('Make me a plan', 'Plan bana do', 'प्लान बना दो'), t('When can I re-apply?', 'Dobara kab apply karun?', 'दोबारा कब अप्लाई करूँ?'), t('Talk to a human', 'Insaan se baat', 'इंसान से बात')];
    else if (S.screen === 'txn') c = [t('File a complaint', 'Complaint kar do', 'शिकायत कर दो'), t('When do I get it back?', 'Paisa kab wapas aayega?', 'पैसा कब वापस आएगा?')];
    else c = [t('Why was my loan rejected?', 'Loan reject kyun hua?', 'लोन रिजेक्ट क्यों हुआ?'), t('My ₹500 is stuck', 'Mera ₹500 atka hai', 'मेरा ₹500 अटका है'), t('Send ₹255 to Rohit', 'Rohit ko ₹255 bhejo', 'रोहित को ₹255 भेजो'), t('Bus to Delhi tomorrow', 'Kal Delhi ki bus', 'कल दिल्ली की बस')];
    q('.cp-chips').innerHTML = c.map((x) => `<button type="button" data-say="${esc(x)}">${esc(x)}</button>`).join('');
  }
  chips();
})();
