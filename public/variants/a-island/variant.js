// Variant A "Island": Bolo lives in a Dynamic-Island pill inside a reserved status strip (never over content).
// It expands into a live activity (listening → thinking → step list) and a ghost finger taps through the real UI.
// The original #saathi stays in the DOM (app.js binds it) but is hidden; this layer mirrors its state.
(() => {
  const q = (s) => document.querySelector(s);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const NAMES = { home: 'Home', loan: 'Personal Loan', bus: 'Bus Tickets', score: 'Credit Score', pay: 'Pay Anyone', history: 'Balance & History', recharge: 'Mobile Recharge', help: '24x7 Help', txn: 'Payment Details' };
  const FIXLBL = { enable_autopay: 'Turning on AutoPay', start_credit_builder: 'Starting ₹5,000 credit-builder line', link_bank_statement: 'Sharing bank statement (AA consent)' };
  const LABEL = {
    navigate: (a) => `Opening ${NAMES[a.screen] || a.screen}`, open_txn: () => 'Opening the payment',
    check_txn_status: () => 'Checking with your bank', raise_dispute: () => 'Filing a complaint with the bank',
    explain_rejection: () => "Matching Paytm's published loan criteria", loan_precheck: () => 'Soft check, no score impact',
    start_fix_step: (a) => FIXLBL[a.step] || 'Fix step', schedule_recheck: (a) => `Booking free re-check in ${a.days || 60} days`,
    book_bus: (a) => `Searching ${a.from || ''} → ${a.to || ''} buses`, check_credit_score: () => 'Fetching your credit report',
    recharge_mobile: (a) => `Picking your ₹${a.amount || 299} plan`, pay_contact: (a) => `Finding ${a.name} in contacts`,
    handoff_human: () => 'Connecting a human agent',
  };
  const DONE = { raise_dispute: 'Complaint filed', pay_contact: 'Paid', recharge_mobile: 'Recharged', book_bus: 'Bus booked', schedule_recheck: 'Plan ready', explain_rejection: 'Criteria checked', check_txn_status: 'Bank checked', check_credit_score: 'Report fetched', handoff_human: 'Agent joining' };
  const onScreen = (s) => (S.screen === s ? [] : null);
  const PATH = {
    navigate: (a) => [`#screen [data-go="${a.screen}"]`],
    open_txn: (a) => onScreen('txn') || ['#screen [data-go="history"]', `[data-txn="${a.id}"]`],
    check_txn_status: (a) => onScreen('txn') || ['#screen [data-go="history"]', `[data-txn="${a.id}"]`],
    explain_rejection: () => onScreen('loan') || ['#screen [data-go="loan"]'],
    book_bus: () => onScreen('bus') || ['#screen [data-go="bus"]'],
    check_credit_score: () => onScreen('score') || ['#screen [data-go="score"]'],
    recharge_mobile: () => onScreen('recharge') || ['#screen [data-go="recharge"]'],
    pay_contact: () => onScreen('pay') || ['#screen [data-go="pay"]'],
    handoff_human: () => onScreen('help') || ['[data-go="help"]'],
  };

  q('#app').insertAdjacentHTML('afterbegin', `
    <div id="sbar"><span>9:41</span><span class="sb-r"><svg viewBox="0 0 18 12"><path d="M1 11h2V8H1zM5 11h2V6H5zM9 11h2V3H9zM13 11h2V1h-2z" fill="currentColor"/></svg>5G <b class="batt"><i></i></b></span></div>
    <div id="island" class="compact">
      <button class="isl-row" type="button" aria-label="Talk to Bolo">
        <span class="isl-mark"><i></i><i></i><i></i></span>
        <span class="isl-status">Ask Bolo</span>
        <span class="isl-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
        <span class="isl-kbd" role="button" aria-label="Type instead">⌨</span>
      </button>
      <div class="isl-body">
        <div class="isl-heard"></div>
        <ol class="isl-steps"></ol>
        <div class="isl-said"></div>
        <form class="isl-type" hidden><input placeholder="Type to Bolo…" autocomplete="off"><button aria-label="Send">➤</button></form>
      </div>
    </div>
    <div id="finger"><span class="tip"></span><span class="ring"></span></div>`);
  const isl = q('#island'), steps = q('.isl-steps'), finger = q('#finger');
  let lastDone = '', collapseT = null;

  // ---- island state is a projection of the original mascot's classes + #heard/#said text ----
  const m = q('#mascot');
  function sync() {
    const c = m.classList, listen = c.contains('listen'), think = c.contains('think'), talk = c.contains('talk');
    const heard = q('#heard').textContent, said = q('#said').textContent;
    q('.isl-heard').textContent = listen ? '' : heard;
    q('.isl-said').textContent = said === '…' ? '' : said;
    const working = think && steps.children.length;
    const mode = listen ? 'listen' : working ? 'work' : think ? 'think' : talk ? 'speak' : null;
    q('.isl-status').textContent = { listen: 'Listening…', think: 'Thinking…', work: steps.lastElementChild?.dataset.label || 'Working…', speak: 'Bolo' }[mode] || (lastDone ? '✓ ' + lastDone : 'Ask Bolo');
    isl.className = mode ? 'open ' + mode : isl.classList.contains('open') && !q('.isl-type').hidden ? 'open' : isl.className.includes('open') ? 'open idle' : 'compact';
    clearTimeout(collapseT);
    if (!mode && q('.isl-type').hidden) collapseT = setTimeout(() => { isl.className = 'compact' + (lastDone ? ' done' : ''); }, 4500);
  }
  const mo = new MutationObserver(sync);
  mo.observe(m, { attributes: true, attributeFilter: ['class'] });
  for (const s of ['#heard', '#said']) mo.observe(q(s), { childList: true, characterData: true, subtree: true });

  q('.isl-row').onclick = (e) => {
    if (e.target.closest('.isl-kbd')) { isl.className = 'open'; q('.isl-type').hidden = false; q('.isl-type input').focus(); return; }
    m.click();
  };
  q('.isl-type').onsubmit = (e) => { e.preventDefault(); const i = q('.isl-type input'); const v = i.value.trim(); i.value = ''; q('.isl-type').hidden = true; ask(v); };

  // ---- step list ----
  const addStep = (label) => { const li = document.createElement('li'); li.dataset.label = label; li.textContent = label; steps.append(li); sync(); return li; };
  const origAsk = ask;
  ask = (t) => { if (!pending) { steps.innerHTML = ''; lastDone = ''; } return origAsk(t); };
  const origConfirm = confirmAction;
  confirmAction = (w) => { const li = addStep('Waiting for your OK'); li.className = 'wait'; return origConfirm(w).then((y) => { li.className = y ? 'ok' : 'no'; li.textContent = y ? 'You approved' : 'You said no'; return y; }); };

  // ---- ghost finger: really taps the same buttons a user would ----
  async function tapPath(sels) {
    for (const s of sels) {
      const el = [...document.querySelectorAll(s)].find((e) => e.getClientRects().length);
      if (!el) continue;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await new Promise((r) => { addEventListener('scrollend', r, { once: true }); setTimeout(r, 900); });
      const r = el.getBoundingClientRect();
      if (!finger.classList.contains('on')) { finger.style.transition = 'none'; finger.style.transform = `translate(${innerWidth / 2 - 26}px, 30px)`; finger.offsetWidth; finger.style.transition = ''; }
      finger.classList.add('on'); finger.style.transform = `translate(${r.left + r.width / 2 - 26}px, ${r.top + r.height / 2 - 26}px)`;
      el.classList.add('bolo-target'); await wait(750);
      finger.classList.add('press'); await wait(260); finger.classList.remove('press');
      el.classList.remove('bolo-target'); el.click(); await wait(550);
    }
    finger.classList.remove('on');
  }
  for (const [k, fn] of Object.entries(tools)) {
    if (k === 'none') continue;
    tools[k] = async (a = {}) => {
      const li = addStep((LABEL[k] || (() => k))(a));
      await tapPath((PATH[k] || (() => []))(a));
      const out = await fn(a);
      li.className = out === 'user said no' ? 'no' : 'ok';
      if (DONE[k] && out !== 'user said no') lastDone = DONE[k];
      sync(); return out;
    };
  }
})();
