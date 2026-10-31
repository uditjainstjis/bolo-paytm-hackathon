// Bolo concept demo: a Paytm-style app whose screens are driven by a voice assistant's tool calls.
// All data below is demo data. Nothing here touches a real account.
const $ = (s) => document.querySelector(s);
const S = {
  screen: 'home',
  user: { name: 'Udit Jain', pan: 'XXXXX1234F', age: 20 },
  txns: [
    { id: 'R2003', to: 'Neha Didi', amount: 250, when: 'Today, 1:05 PM', status: 'in', upi: 'neha.d@okicici' },
    { id: 'R2002', to: 'Gupta Traders', amount: 1200, when: 'Today, 11:40 AM', status: 'in', upi: 'guptatraders@ybl' },
    { id: 'R2001', to: 'Aman Uncle', amount: 500, when: 'Today, 10:24 AM', status: 'in', upi: 'aman.k@ptyes' },
    { id: 'T1029', to: 'Sharma Kirana Store', amount: 500, when: 'Today, 9:42 AM', status: 'pending', note: 'Money debited, not credited', upi: 'sharmakirana@ybl' },
    { id: 'T1028', to: 'Rohit Verma', amount: 10, when: '26 Oct, 11:42 PM', status: 'ok', upi: 'rohitv@ptyes' },
    { id: 'T1027', to: 'Airtel Prepaid', amount: 299, when: '28 Oct', status: 'ok', upi: 'airtel@paytm' },
    { id: 'T1026', to: 'Priya Sharma', amount: 1340, when: '28 Aug', status: 'in', upi: 'priya.s@okaxis' },
  ],
  contacts: ['Rohit Verma', 'Priya Sharma', 'Aman Uncle', 'Neha Didi', 'Gupta Traders', 'Kavya Singh', 'Raju Bhaiya', 'Meera Ma\'am'],
  pay: null,

  openTxn: null,
  loan: 'offer', // offer → pan → checking → rejected → explained → plan → eligible
  fixes: { enable_autopay: false, link_bank_statement: false, start_credit_builder: false },
  recheckDays: null,
  bus: null,
  tickets: [],
};
// The user's own credit-report factors (demo). Lenders' private reasons are never shown or claimed.
const FACTORS = [
  { id: 'age', icon: '🎂', title: 'Age 23 to 60', you: 'You: 20', ok: false, why: "Listed in Paytm's own loan FAQ.", fix: null },
  { id: 'thin', icon: '📄', title: 'Credit score & credit history', you: 'You: no history yet', ok: false, why: 'No repayment record for lenders to look at.', fix: 'start_credit_builder' },
  { id: 'rep', icon: '🗓️', title: 'Repayment track record', you: 'You: none yet', ok: false, why: 'Builds automatically once you have a small credit line paid on time.', fix: 'enable_autopay' },
  { id: 'inc', icon: '🏦', title: 'Employment / income', you: 'You: not verified', ok: false, why: 'No salary or bank statement linked.', fix: 'link_bank_statement' },
];
const FIXES = {
  start_credit_builder: { label: 'Start a ₹5,000 credit-builder line (reports to bureau)', ask: 'Start a ₹5,000 credit-builder line that reports to the credit bureau' },
  link_bank_statement: { label: 'Share 6 months of bank statement (Account Aggregator consent)', ask: 'Share your bank statement via Account Aggregator, for loan checks only' },
  enable_autopay: { label: 'Turn on AutoPay so no EMI is ever missed', ask: 'Turn on AutoPay for future EMIs' },
};
const FAQ = [
  ['Why was my application rejected?', 'Approval of loan application is basis the lender policy, which is impacted by credit score and credit history along with multiple other criteria including age and location.'],
  ['When can I re-apply?', 'You are eligible to re-apply for a loan after a span of 90 days.'],
  ['How can I increase my chances of getting a personal loan?', 'To be eligible for a loan, you should be within the age group of 23-60 years. Additionally, your credit score, due repayment track record and employment status significantly influence your potential for loan approval.'],
];
const LENDERS = ['Lender A (NBFC)', 'Lender B (NBFC)', 'Lender C (Bank)'];

const I = {
  qr: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
  send: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 13l3-3 3 3M12 10v7"/>',
  bank: '<path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  list: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M12 7l-1.5 4h3L12 15"/>',
  card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h4"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9V16h7v-2.1A6 6 0 0012 3z"/>',
  car: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3zM7 13h2M15 13h2"/>',
  flight: '<path d="M2 13l20-4-3 4H2zM8 12l-2-5M10 13l3 6"/>',
  train: '<rect x="6" y="3" width="12" height="14" rx="3"/><path d="M6 11h12M9 21l1-4M15 21l-1-4M9 14h.01M15 14h.01"/>',
  bus: '<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 11h16M7 20v-3M17 20v-3M8 14h.01M16 14h.01"/>',
  hotel: '<path d="M4 21V5l8-2v18M12 9h8v12M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2"/>',
  loan: '<path d="M9 4h6l-1.5 3h-3zM7 9c-2 3-3 6-2 9 1 2 4 3 7 3s6-1 7-3c1-3 0-6-2-9z"/><path d="M10 13h4M10 15.5h4M11 13c2 0 2 2.5 0 2.5l3 3"/>',
  chart: '<path d="M4 20V10M9 20V6M14 20v-8M19 20V4"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 017-2.5A4 4 0 0119 10c0 5.5-7 10-7 10z"/>',
  gauge: '<path d="M4 16a8 8 0 1116 0M12 16l4-5"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
};
const ico = (k, round) => `<span class="ic ${round ? 'round' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${I[k]}</svg></span>`;

// ---------- screens ----------
const pic = (f, label, go) => `<button class="tile" ${go ? `data-go="${go}"` : ''}><img class="pic" src="icons/${f}.png" alt=""><span>${label}</span></button>`;
const chip = (f, label) => `<span class="chip"><img src="icons/${f}.png" alt="">${label}</span>`;
const tile = (ic, label, go, round) => `<button class="tile" ${go ? `data-go="${go}"` : ''}>${I[ic] ? ico(ic, round) : `<span class="ic">${ic}</span>`}<span>${label}</span></button>`;
const money = (n) => '₹' + n.toLocaleString('en-IN');
const pill = (s) => s === 'ok' ? '<span class="pill ok">Paid</span>' : s === 'pending' ? '<span class="pill wait">Pending</span>' : s === 'refunded' ? '<span class="pill ok">Refunded</span>' : '<span class="pill bad">Failed</span>';

// ---------- screens built on Udit's real Paytm screenshots (public/shots, personal data painted out) ----------
// Overlay coords are in 414-wide units of the 828px shots; cqw makes them scale with the phone width.
const u = (v) => (v / 4.14).toFixed(3) + 'cqw';
const box = (x, y, w, h) => `left:${u(x)};top:${u(y)};${w ? `width:${u(w)};` : ''}${h ? `height:${u(h)};` : ''}`;
const shot = (img, inner = '') => `<div class="shot"><img src="shots/${img}.jpg" alt="" draggable="false">${inner}</div>`;
const tx = (x, y, html, fs, css = '') => `<div class="ov t" style="${box(x, y)}font-size:${u(fs)};${css}">${html}</div>`;
const ctr = (y, html, fs, css = '') => `<div class="ov t" style="left:0;width:100cqw;text-align:center;top:${u(y)};font-size:${u(fs)};${css}">${html}</div>`;
const hot = (x, y, w, h, attr) => `<button class="ov hot" style="${box(x, y, w, h)}" ${attr}></button>`;
const back = (to = 'home') => hot(0, 0, 70, 62, `data-go="${to}" aria-label="Back"`);
const initials = (n) => n.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const AVC = [['#FAE1C1', '#6B503E'], ['#E9E2FB', '#5B3FB8'], ['#DDF3E4', '#2E6B45'], ['#FDE2E6', '#9B3046']];
const avatar = (x, y, d, n, k = 0) => `<div class="ov av2" style="${box(x, y, d, d)}font-size:${u(d * 0.36)};background:${AVC[k % 4][0]};color:${AVC[k % 4][1]}">${initials(n)}</div>`;
const WORDS = 'Zero One Two Three Four Five Six Seven Eight Nine Ten Eleven Twelve Thirteen Fourteen Fifteen Sixteen Seventeen Eighteen Nineteen'.split(' ');
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const words = (n) => n < 20 ? WORDS[n] : n < 100 ? TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + WORDS[n % 10] : '') : n < 1000 ? WORDS[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + words(n % 100) : '') : n < 100000 ? words(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + words(n % 1000) : '') : String(n);
const rupeeWords = (n) => `Rupee${n === 1 ? '' : 's'} ${words(Math.floor(n))} Only`;
const boloCard = (inner, cls = 'flash') => `<div class="bolo-card ${cls}"><div class="bolo-tag"><span class="mini-bolo"></span>Bolo</div>${inner}</div>`;

const screens = {
  home: () => `<img class="hdr" src="shots/home_top.jpg" alt="">` + shot('home',
    hot(113, 205, 93, 110, 'data-go="pay" aria-label="Pay Anyone"') + hot(300, 205, 95, 110, 'data-go="history" aria-label="Balance & History"') +
    hot(207, 815, 93, 90, 'data-go="bus" aria-label="Bus"') + hot(20, 1235, 92, 90, 'data-go="loan" aria-label="Loan"') +
    hot(25, 1525, 110, 165, 'data-go="score" aria-label="Check Your Credit Score"')),

  history: () => {
    const spent = S.txns.filter((t) => t.status !== 'in').reduce((a, t) => a + t.amount, 0);
    return shot('history', back() + tx(30, 199, 'Saving A/c: 1234', 12.5) + `<div class="ov t" style="right:${u(52)};top:${u(619)};font-size:${u(15)};font-weight:600">${money(spent)}</div>`) +
    `<div class="hlist">${S.txns.map((t, k) => `<button class="hrow2" data-txn="${t.id}"><span class="av3" style="background:${AVC[k % 4][0]};color:${AVC[k % 4][1]}">${initials(t.to)}</span>
      <span class="grow"><span class="hn2">${t.to}</span><span class="hd2">${t.when}</span><span class="hc2">${t.status === 'in' ? '💵 Money Received' : t.status === 'pending' ? '⏳ Pending' : '💸 Money Transfer'}</span></span>
      <span class="ha2 ${t.status === 'in' ? 'in' : ''}">${t.status === 'in' ? '+ ' : '- '}${money(t.amount)}<small${t.status === 'pending' ? ' class="pend2"' : ''}>${t.status === 'pending' ? 'Pending' : t.status === 'in' ? 'In' : 'Paid'}</small></span></button>`).join('')}</div>
    <div class="pfoot">paytm <span>|</span> UPI</div>`;
  },

  txn: () => {
    const t = S.txns.find((x) => x.id === S.openTxn) || S.txns[0];
    const pend = t.status === 'pending', inn = t.status === 'in';
    const title = pend ? 'Payment Pending' : inn ? 'Money Received' : 'Money Sent';
    const icon = pend ? '<span class="stat pend">⏳</span>' : '<svg class="stat" viewBox="0 0 24 24"><path fill="#21A04B" d="M12 1l2.6 2.1 3.3-.4 1.2 3.1 3.1 1.2-.4 3.3L23 12l-2.1 2.6.4 3.3-3.1 1.2-1.2 3.1-3.3-.4L12 23l-2.6-2.1-3.3.4-1.2-3.1-3.1-1.2.4-3.3L1 12l2.1-2.6-.4-3.3 3.1-1.2 1.2-3.1 3.3.4z"/><path d="M7.5 12.3l3 3 6-6" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
    return shot('txn', back('history') + hot(338, 18, 70, 36, 'data-go="help" aria-label="Help"') + hot(100, 426, 120, 38, 'data-go="history" aria-label="View History"') +
      tx(51, 21, title, 19, 'font-weight:500') +
      tx(31, 119, `${money(t.amount)}${icon}`, 30, 'font-weight:700;display:flex;align-items:center;gap:' + u(8)) +
      tx(31, 166, rupeeWords(t.amount), 14) + tx(64, 259, pend ? 'Pending' : inn ? 'Money Received' : 'Money Transfer', 12.5, pend ? 'color:#B26A00' : '') +
      tx(33, 391, 'UPI ID: ******1234@ptyes on', 14) +
      tx(33, 539, t.to, 20, 'font-weight:700') + avatar(330, 540, 50, t.to, 1) + tx(33, 570, `UPI ID: ${t.upi || 'demo@ptyes'}`, 14) +
      tx(33, 633, `${inn ? 'Received' : 'Paid'} at ${t.when.replace('Today, ', '')}, 31 Oct 2026`, 14) +
      tx(33, 659, `UPI Ref No: 6171501${t.id.slice(1)}05 <span style="color:#1E5FC7;font-weight:600">Copy</span>`, 13.5)) +
      `<div class="below">${pend && !t.check && !t.ticket ? `<div class="warn2">⏳ ${money(t.amount)} debited from your bank, not yet credited to ${t.to}</div>` : ''}
      ${t.check && !t.ticket ? boloCard(`<b>Bolo checked with your bank</b><div>${t.check}</div>`) : ''}
      ${t.ticket ? boloCard(`<b>Bolo filed a complaint for you</b><div class="tl">
        <div class="done"><b>${money(t.amount)} debited</b><span>Today, 9:42 AM · not credited to ${t.to}</span></div>
        <div class="done"><b>Complaint filed by Bolo</b><span>Ref ${t.ticket} · just now</span></div>
        <div><b>Auto-reversal by tomorrow (T+1)</b><span>Bolo will tell you the moment it lands</span></div>
        <div><b>₹100/day to you if the bank is late</b><span>RBI turnaround-time rule</span></div></div>`) : ''}</div>`;
  },

  recharge: () => {
    const r = S.recharge || {};
    return `<div class="card"><div class="hrow" style="border:0;padding-top:0"><span class="op">airtel</span><div class="grow"><div class="hn" style="font-weight:600">Udit Jain</div><div class="hn">98XXX XX210</div><div class="muted">Airtel Prepaid - Delhi NCR <span style="color:#1D6FD8;font-weight:600">Change</span></div></div></div>
      <hr style="border:0;border-top:1px solid #E6EAF0;margin:6px 0 14px">
      <div style="font-weight:600">Your regular plan (last recharged 28 Oct):</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px"><b style="font-size:32px">₹299</b><button class="pillnavy">Recharge</button></div>
      <div class="muted" style="font-size:15px">28 Days - Unlimited calls + 1.5 GB/day + 100 SMS/day</div>
      ${r.done ? '<div class="banner flash" style="margin-top:12px">✅ Recharge successful: ₹299 plan active till 26 Nov.</div>' : ''}</div>
      <div class="card" style="background:#EEF2F8"><b>Quick Data Recharges</b><div class="hscroll" style="margin-top:10px"><span class="qchip">₹19 • 1GB • 1 Day ›</span><span class="qchip">₹29 • 2GB • 1 Day ›</span><span class="qchip">₹49 • 6GB • 1 Day ›</span></div></div>
      <div class="searchbar">🔍 Search e.g. 349 or 28 days</div>
      ${[[299, '28 Days', '1.5 GB/day', '₹10.7/Day', 'Your regular'], [349, '28 Days', 'Unlimited 5G + 2 GB/day', '₹12.5/Day', '5G + Hotstar'], [859, '84 Days', '1.5 GB/day', '₹10.2/Day', 'Long validity']].map(([p, v, dt, pd, tag]) => `
      <div class="card plan ${p === 299 && r.picked ? 'picked flash' : ''}"><span class="plantag">${tag}</span><div class="plan-row"><div><b style="font-size:26px">₹${p}</b><div class="muted">${pd}</div></div><div><div class="muted">Validity</div><b>${v}</b></div><div><div class="muted">Data</div><b>${dt}</b></div><span class="muted">›</span></div></div>`).join('')}`;
  },
  report: () => {
    const f = S.report || {}; const t = S.txns.find((x) => x.id === f.id) || S.txns[0];
    const ref = '6171501' + t.id.slice(1) + '05';
    const mail = `To: Nodal Officer, UCO Bank (customer grievance)
Subject: ${f.fraud ? 'Unauthorised / fraudulent UPI transaction' : 'UPI amount debited but not credited'}: ₹${t.amount}, UPI Ref ${ref}

Dear Sir/Madam,

On ${t.when}, ₹${t.amount} was debited from my Saving A/c ending 7369 via UPI (Ref No. ${ref}) to ${t.to} (${t.upi || 'UPI ID on record'}). ${f.fraud ? 'I did not authorise this payment / I was deceived into making it, and I have reported it on the National Cybercrime Portal (Acknowledgement ' + (f.ack || 'pending') + ').' : 'The amount has not reached the beneficiary and has not been reversed.'}

${f.fraud ? 'Under RBI\'s customer-protection rules, as I am reporting within 3 working days, please block further debits, raise a chargeback/recovery with the beneficiary bank and credit the amount back to my account.' : 'As per RBI\'s turnaround-time rules, failed UPI transactions must be reversed by T+1, with ₹100 per day compensation for delays. Please reverse the amount and credit the compensation.'}

Please share the complaint reference number.

Regards,
Udit Jain · 98XXX XX210`;
    return `${f.fraud ? `<div class="bolo-card flash"><div class="bolo-tag"><span class="mini-bolo"></span>Cybercrime complaint, ready to file</div>
      <div class="hrow"><div class="grow"><div class="muted">Portal</div><b>cybercrime.gov.in (National Cybercrime Reporting Portal)</b></div></div>
      <div class="hrow"><div class="grow"><div class="muted">Fraud type</div><b>UPI / Online financial fraud</b></div></div>
      <div class="hrow"><div class="grow"><div class="muted">Amount · Date</div><b>₹${t.amount} · ${t.when}</b></div></div>
      <div class="hrow"><div class="grow"><div class="muted">UPI Ref · Paid to</div><b>${ref} · ${t.to} (${t.upi || '-'})</b></div></div>
      <div class="hrow" style="border:0"><div class="grow"><div class="muted">What happened</div>${f.desc || 'Money was taken through UPI without my consent.'}</div></div>
      ${f.ack ? `<div class="banner">✅ Filed. Acknowledgement no. <b>${f.ack}</b></div>` : ''}
      <a class="callbtn" href="tel:1930">📞 Call 1930 now (first hour matters)</a></div>` : ''}
      <div class="card flash"><h3>Email to your bank</h3><pre class="mail">${mail}</pre>
      <div style="display:flex;gap:10px"><button class="obtn" onclick="navigator.clipboard&&navigator.clipboard.writeText(document.querySelector('.mail').textContent)">Copy</button><a class="obtn" href="mailto:?subject=${encodeURIComponent('UPI complaint ₹' + t.amount + ', Ref ' + ref)}&body=${encodeURIComponent(mail)}">Open in Mail</a></div></div>`;
  },
  pay: () => {
    if (S.pay && S.pay.name) {
      const n = S.pay.name, a = S.pay.amount || 0;
      return shot('payamt', hot(0, 0, 70, 50, 'data-go="pay" aria-label="Back" data-clearpay="1"') + avatar(180, 10, 54, n, 1) +
        ctr(78, `${n} <svg viewBox="0 0 24 24" style="width:${u(17)};height:${u(17)};vertical-align:-0.1em"><circle cx="12" cy="12" r="11" fill="#1A9CF5"/><path d="M7 12.5l3.2 3 6.5-6.5" stroke="#fff" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>`, 19, 'font-weight:700') +
        ctr(134, `${n.split(' ')[0].toLowerCase()}@ptyes`, 12.5, 'font-weight:600') +
        ctr(212, `<span style="font-size:.38em;vertical-align:.95em;margin-right:.08em;font-weight:500">₹</span>${a.toLocaleString('en-IN')}`, 82, 'font-weight:700;letter-spacing:-.02em;line-height:1.15') +
        ctr(315, rupeeWords(a), 13));
    }
    const c4 = S.contacts.slice(0, 4);
    const rec = S.txns.filter((t) => t.status !== 'pending').filter((t) => t.to !== 'Airtel Prepaid').slice(0, 2);
    return shot('pay', back() + hot(330, 14, 84, 36, 'data-go="help" aria-label="Help"') +
      c4.map((n, k) => avatar(32 + k * 93.5, 180, 70, n, k + 2) + `<div class="ov t" style="${box(16 + k * 93.5, 258, 102)}font-size:${u(13.5)};text-align:center;line-height:1.25;white-space:normal">${n}</div>`).join('') +
      rec.map((t, k) => avatar(31, 623 + k * 85, 52, t.to, k) + tx(92, 640 + k * 85, t.to, 17)).join(''));
  },

  loan: () => {
    if (S.loan === 'offer') return `<div class="card"><div class="muted">Personal Loan</div><div class="big">Up to ₹2,00,000</div>
      <div class="muted">Instant approval · Paperless · Lending partners: ${LENDERS.length}</div>
      <button class="btn" data-loan="pan">Check offer</button></div>`;
    if (S.loan === 'pan') return `<div class="card"><h3>Verify PAN</h3><input class="field" value="${S.user.pan}" disabled>
      <div class="muted" style="margin-top:8px">We will check your eligibility with our lending partners.</div><button class="btn" data-loan="checking">Continue</button></div>`;
    if (S.loan === 'checking') return `<div class="card"><h3>Checking with lenders…</h3><div class="muted">This takes a few seconds</div></div>`;
    const docIll = `<svg viewBox="0 0 90 80" width="96" height="86"><rect x="22" y="6" width="50" height="62" rx="4" fill="#E8EEFB" stroke="#9DB2DE"/><rect x="14" y="12" width="50" height="62" rx="4" fill="#fff" stroke="#9DB2DE"/><path d="M22 26h32M22 34h32M22 42h24M22 50h28" stroke="#C9D6EE" stroke-width="3"/><circle cx="64" cy="56" r="11" fill="#E5484D"/><path d="M59 51l10 10M69 51l-10 10" stroke="#fff" stroke-width="3"/></svg>`;
    const rej = `<div class="lp"><div class="lp-head"><h2>Sorry, the lender cannot proceed with your application</h2>${docIll}</div>
      <p class="lp-sub">Your application could not clear our lender partner policy. You may please try after 90 days to check your eligibility</p></div>`;
    const offers = `<div class="lp">
      <div class="offer"><span class="tag">LOAN AGAINST MUTUAL FUNDS</span>
        <div class="offer-row"><div><div class="offer-t">Get India ka sabse sasta loan</div><div class="offer-s">Starting at 0.83% p.m.</div></div>
        <div class="offer-amt"><small>GET UP TO</small><b>₹2 Cr</b><span>Loan</span></div></div>
        <div class="offer-foot">•Funds keep growing • Pay only interest as EMI</div><button class="apply">Apply Now</button></div>
      <h4 class="lp-h">You can explore Gold loan for funds</h4>
      <div class="offer"><span class="tag">100% secure storage of gold</span><div class="offer-t" style="margin-top:10px">Get Gold loan with interest rates starting at 0.99% per month</div>
        <div class="offer-s">Loan upto 25 lakhs with minimal documentation</div><button class="apply">Apply Now</button></div>
      <h4 class="lp-h">Frequently Asked Questions (FAQs)</h4>
      ${FAQ.map(([q, a], k) => `<div class="faq2"><span class="fq-ic">${['📱', '🔁', '📶'][k]}</span><div><div class="fq-q">${q}</div><div class="fq-a">${a}</div></div></div>`).join('')}
      <div class="needhelp"><span class="nh-ic">?</span><div><b>Need more help?</b><div class="fq-a">FAQs about Personal Loan</div></div><span class="muted">›</span></div></div>`;
    const boloCard = (inner, flash) => `<div class="bolo-card ${flash ? 'flash' : ''}"><div class="bolo-tag"><span class="mini-bolo"></span>Bolo</div>${inner}</div>`;
    if (S.loan === 'rejected') return rej + boloCard(`<div>Lender ne reason nahi bataya? Tap me and ask <b>"yeh reject kyun hua?"</b></div>`, true) + offers;
    const elig = S.loan === 'eligible';
    const PROG = { start_credit_builder: 'You: credit line started, reporting to bureau', link_bank_statement: 'You: statement shared via AA, verifying', enable_autopay: 'You: AutoPay on, no missed EMI' };
    const st = (f) => elig ? 'ok' : (f.fix && S.fixes[f.fix]) ? 'prog' : 'bad';
    const notMet = FACTORS.filter((f) => st(f) === 'bad').length;
    const factors = boloCard(`<h3>Paytm's published criteria vs your profile</h3>
      <div class="fsum ${elig ? 'good' : ''}">${elig ? 'All 4 checks green' : `${notMet} of ${FACTORS.length} not met yet` + (notMet < FACTORS.length ? ` · ${FACTORS.length - notMet} in progress` : '')}</div>
      ${FACTORS.map((f, k) => `<div class="factor ${st(f)}" style="--d:${k * 150}ms"><span class="mark">${st(f) === 'ok' ? '✓' : st(f) === 'prog' ? '◔' : '✕'}</span><div style="flex:1"><b>${f.title}</b><br><span class="pill ${st(f) === 'bad' ? 'wait' : 'ok'}">${elig ? (f.id === 'age' ? 'You: 20 · Lender B lends from 18' : (PROG[f.fix] || 'Done')) : st(f) === 'prog' ? PROG[f.fix] : f.you}</span><div class="muted">${st(f) !== 'bad' && f.fix ? 'Bolo did this step with your OK.' : f.why}</div></div></div>`).join('')}
      <div class="muted" style="margin-top:8px">The lender doesn't share its exact reason, so this is a checklist, not a verdict.</div>`, false);
    const allFixed = Object.keys(FIXES).every((k) => S.fixes[k]);
    const plan = boloCard(`<h3>Your plan to become eligible</h3>
      ${Object.entries(FIXES).map(([k, f]) => `<div class="step ${S.fixes[k] ? 'done' : ''}"><div class="tick">${S.fixes[k] ? '✓' : ''}</div><div>${f.label}</div></div>`).join('')}
      <div class="step ${S.recheckDays ? 'done' : ''}"><div class="tick">${S.recheckDays ? '✓' : ''}</div><div>${S.recheckDays ? `Free re-check booked in <b>${S.recheckDays} days</b>; Bolo re-applies once every check is green` : 'Free re-check + auto re-apply once every check is green'} (no score impact)</div></div>
      ${S.recheckDays && allFixed && !elig ? '<button class="btn ghost" data-jump="60">⏩ Demo: jump ahead to when every check is green</button>' : ''}`, S.loan === 'plan');
    if (elig) return boloCard(`<h3 style="color:var(--green)">Every check green: you're eligible</h3><div class="big">₹40,000</div><div class="muted">Lender B (NBFC) · 18+ with bureau history, clean credit-builder repayments, income verified · Pre-qualified on soft check · Simulated for demo</div><button class="btn" data-say="haan, apply kar do">Apply now</button>`, true) + factors + plan;
    return rej + factors + (S.loan === 'plan' ? plan : '') + offers;

  },

  bus: () => {
    const b = S.bus || {};
    const route = (y) => ctr(y, `<b style="font-weight:600">${b.from || 'Noida'} → ${b.to || 'Delhi'}</b><br>${b.dateLabel || 'Sat, 31 Oct'}${b.stage === 'results' ? ' · 872 buses' : ''}`, 12.5, 'line-height:1.4');
    if (b.stage === 'loading') return shot('bus_loading', back() + route(15));
    if (b.stage === 'results') return shot('bus_results', back() + route(15) +
      (b.pick === 0 ? `<div class="ov picked2 flash2" style="${box(13, 248, 388, 196)}"></div><div class="ov pickbolo" style="right:${u(22)};top:${u(236)};font-size:${u(11.5)}"><span class="mini-bolo"></span>Bolo picked: cheapest Paytm Assured</div>` : '') +
      (b.pick === 0 && b.booked ? `<div class="ov booked2" style="${box(150, 400, 240, 34)}font-size:${u(13)}">✅ Booked · seat 14 · ticket on SMS</div>` : ''));
    return shot('bus', back() + hot(355, 14, 59, 36, 'data-go="help" aria-label="Help"') + tx(72, 214, b.from || 'Noida', 17) + tx(72, 270, b.to || 'Delhi', 17));
  },

  score: () => shot('score', back() + hot(355, 14, 59, 36, 'data-go="help" aria-label="Help"') +
      ctr(61, 'Hi Udit, <span style="color:#F2A008">your score isn\'t generated yet</span>', 14.5) +
      ctr(180, '<span class="nh2">NH</span>', 60, 'font-weight:800;letter-spacing:.02em;line-height:1') + ctr(248, 'No credit history', 11.5, 'color:#555') +
      tx(93, 353, 'None yet', 13) + `<div class="ov pill2" style="${box(296, 327)}font-size:${u(11)}">No history</div>` +
      hot(10, 560, 195, 205, 'data-go="loan" aria-label="Personal Loan"')) +
    `<div class="below">${boloCard('No loan or card yet, so there\'s nothing to score. A small credit line paid on time for ~6 months creates your first score.<button class="btn" data-say="credit score banane ka plan bana do">Build my score with Bolo</button>', '')}</div>`,

  help: () => shot('help', back()) + `<div class="below">${S.tickets.map((t) => boloCard(`<b>Ticket ${t.id} · handed to a human agent</b><div>${t.summary}</div><div class="muted" style="margin-top:6px">Agent joins in ~2 min · they already have this context, no need to repeat</div>`)).join('')}</div>`,


  profile: () => `<div class="card"><h3>Udit Jain</h3><div class="muted">PAN ${S.user.pan} · UPI udit@paytm</div></div>
      <div class="card"><b>About this build</b><div class="muted">Concept demo for the Paytm Build for India AI Hackathon. Not an official Paytm app. All data is demo data.</div></div>`,
};

const TITLES = { report: 'Report & Escalate', recharge: 'Mobile Recharge', pay: 'Pay Anyone', score: 'Credit Score', history: '', txn: 'Payment Details', loan: 'Personal Loan', bus: 'Bus Tickets', help: '24x7 Help', profile: 'Profile' };
function render() {
  const sub = S.screen !== 'home';
  $('#top').classList.toggle('sub', sub);
  $('#scanqr').hidden = sub;
  $('#title').innerHTML = S.screen === 'loan' ? '<span class="pl-logo"><span class="rupee">₹</span><span>Personal<br>Loan</span></span>' : (TITLES[S.screen] || '');
  document.body.classList.toggle('white', S.screen === 'loan');
  document.body.className = document.body.className.replace(/\bs-\w+/g, '').trim(); document.body.classList.add('s-' + S.screen);
  document.body.classList.toggle('shotmode', S.screen !== 'loan' && S.screen !== 'profile');
  $('#scanqr').hidden = S.screen !== 'home';
  $('#screen').innerHTML = screens[S.screen]();
  const changed = [...document.querySelectorAll('#screen .flash')].pop();
  if (changed) changed.scrollIntoView({ behavior: 'smooth', block: 'center' });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}
function go(screen) { if (screens[screen]) { S.screen = screen; render(); } }

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-go],[data-txn],[data-loan],[data-jump],[data-say]');
  if (!el) return;
  if (el.dataset.clearpay) S.pay = null;
  if (el.dataset.go) go(el.dataset.go);
  if (el.dataset.txn) { S.openTxn = el.dataset.txn; go('txn'); }
  if (el.dataset.loan) loanStep(el.dataset.loan);
  if (el.dataset.jump) { S.loan = 'eligible'; render(); say('Sab checks green! ✅ Lender B se ₹40,000 ke liye eligible ho. Apply karoon?'); }
  if (el.dataset.say) ask(el.dataset.say);
});

function loanStep(step) {
  S.loan = step; render();
setTimeout(() => { $('#bubble').hidden = false; $('#said').innerHTML = '<div class="bolo-name">Bolo</div>Hey Udit! Mujhe tap karo aur bas bolo 😎'; hideSoon(5000); }, 600);
  if (step === 'checking') setTimeout(() => { S.loan = 'rejected'; render(); }, 1800);
}

// ---------- confirm + PIN (the user always approves; Bolo never sees a PIN) ----------
let pending = null;
function confirmAction(what) {
  return new Promise((ok) => { pending = ok; $('#cwhat').textContent = what; $('#confirm').hidden = false; });
}
function settle(yes) { if (!pending) return; $('#confirm').hidden = true; const p = pending; pending = null; p(yes); }
$('#cyes').onclick = () => settle(true);
$('#cno').onclick = () => settle(false);
function askPin(what) {
  // Demo only: no PIN digits are ever collected here. In the real app this is Paytm's own UPI PIN screen.
  return new Promise((ok) => {
    $('#pinwhat').textContent = what; $('#pin').hidden = false;
    $('#pad').innerHTML = '<button class="paynow" style="grid-column:1/-1">Pay</button>';
    $('#pad').onclick = (e) => { if (e.target.matches('button')) { $('#pin').hidden = true; ok(true); } };
  });
}

// ---------- tools the brain can call ----------
const log = (m) => { const d = document.createElement('div'); d.textContent = new Date().toLocaleTimeString() + '  ' + m; $('#log').prepend(d); };
function matchContacts(q) {
  const norm = (x) => x.toLowerCase().replace(/[^a-zऀ-ॿ ]/g, '').replace(/\s+/g, ' ').trim();
  const n = norm(q); const first = n.split(' ')[0];
  const exact = S.contacts.filter((c) => norm(c) === n);
  if (exact.length) return exact;
  return S.contacts.filter((c) => { const cn = norm(c); return cn.includes(n) || n.includes(cn) || cn.split(' ').some((w) => w === first || (first.length > 3 && w.startsWith(first.slice(0, 4)))); });
}
const tools = {
  navigate: ({ screen }) => go(screen),
  open_txn: ({ id }) => { if (S.txns.find((t) => t.id === id)) { S.openTxn = id; go('txn'); } },
  check_txn_status: ({ id }) => {
    const t = S.txns.find((x) => x.id === id); if (!t) return 'no such txn';
    t.check = t.status === 'pending' ? 'Debited from your bank, not yet credited to the merchant. The bank must auto-reverse by the next working day (T+1).' : 'Completed successfully.';
    S.openTxn = id; go('txn'); return t.check;
  },
  raise_dispute: async ({ id }) => {
    const t = S.txns.find((x) => x.id === id); if (!t) return 'no such txn';
    if (!(await confirmAction(`File a complaint for ${money(t.amount)} to ${t.to} (ID ${t.id})`))) return 'user said no';
    t.ticket = 'CMP' + Math.floor(100000 + Math.random() * 900000); S.openTxn = id; go('txn'); return 'filed ' + t.ticket;
  },
  loan_precheck: () => { S.loan = 'explained'; go('loan'); return 'soft check done, no score impact'; },
  explain_rejection: () => { if (['offer', 'pan', 'checking'].includes(S.loan)) S.loan = 'rejected'; S.loan = 'explained'; go('loan'); return FACTORS.map((f) => f.title).join('; '); },
  start_fix_step: async ({ step }) => {
    const f = FIXES[step]; if (!f) return 'unknown step';
    if (!(await confirmAction(f.ask))) return 'user said no';
    S.fixes[step] = true; S.loan = 'plan'; go('loan'); return 'done: ' + step;
  },
  schedule_recheck: ({ days }) => { S.recheckDays = days || 60; S.loan = 'plan'; go('loan'); return 'booked'; },
  book_bus: async ({ from, to, date }) => {
    const tmr = /tom|kal/i.test(date || ''); date = date || 'today';
    S.bus = { from, to, date, dateLabel: tmr ? 'Sun, 1 Nov' : 'Sat, 31 Oct' }; go('bus');
    await new Promise((r) => setTimeout(r, 900)); S.bus.stage = 'loading'; render();
    await new Promise((r) => setTimeout(r, 1400)); S.bus.stage = 'results'; S.bus.pick = 0; render();
    if (!(await confirmAction(`Book SHRI GANESH YATRA TRAVELS ${from} → ${to}, ${S.bus.dateLabel}, 06:50 PM, ₹619`))) return 'user said no';
    await askPin('Pay ₹619 to Shri Ganesh Yatra Travels'); S.bus.booked = true; render(); return 'booked seat 14';
  },
  check_credit_score: () => { go('score'); return 'shown: no score yet (NH)'; },
  report_fraud: async ({ id, description }) => {
    const t = S.txns.find((x) => x.id === id) || S.txns.find((x) => x.status === 'pending') || S.txns[0];
    S.report = { id: t.id, fraud: true, desc: description }; go('report');
    if (!(await confirmAction(`File a cybercrime complaint for ₹${t.amount} (${t.to}) and draft the bank email`))) return 'user said no';
    S.report.ack = '3' + Math.floor(1e13 + Math.random() * 9e13); render(); return 'filed ' + S.report.ack;
  },
  draft_bank_email: ({ id }) => { const t = S.txns.find((x) => x.id === id) || S.txns.find((x) => x.status === 'pending') || S.txns[0]; if (!(S.report && S.report.id === t.id)) S.report = { id: t.id, fraud: false }; go('report'); return 'drafted'; },
  recharge_mobile: async ({ amount }) => {
    const amt = Number(String(amount || 299).replace(/[^\d.]/g, '')) || 299;
    S.recharge = { picked: true }; go('recharge'); await new Promise((r) => setTimeout(r, 900));
    if (!(await confirmAction(`Recharge 98XXX XX210 (Airtel) with ₹${amt} · 28 days, 1.5 GB/day`))) return 'user said no';
    await askPin(`Pay ₹${amt} to Airtel Prepaid`);
    S.recharge = { picked: true, done: true }; S.txns.unshift({ id: 'T' + (1030 + S.txns.length), to: 'Airtel Prepaid', amount: amt, when: 'Just now', status: 'ok', upi: 'airtel@paytm' }); render(); return 'recharged';
  },
  pay_contact: async ({ name, amount }) => {
    const amt = Number(String(amount).replace(/[^\d.]/g, ''));
    if (!name || !amt) return 'need name and amount';
    // Look in the contact list first, like the real app.
    S.pay = null; S.match = name; go('pay'); await new Promise((r) => setTimeout(r, 700));
    const found = matchContacts(name); S.match = null;
    if (found.length === 0) { render(); return { speak: replyIn === 'English' ? `I couldn't find ${name} in your contacts. Tell me their mobile number or UPI ID.` : replyIn === 'Hindi' ? `${name} आपके contacts में नहीं मिले। उनका mobile number या UPI ID बताइए।` : `${name} aapke contacts mein nahi mile. Unka mobile number ya UPI ID bataiye.` }; }
    if (found.length > 1) { S.matches = found; render(); return { speak: replyIn === 'English' ? `I found ${found.length} matches: ${found.join(', ')}. Who should I pay?` : replyIn === 'Hindi' ? `Contacts में ${found.length} लोग मिले: ${found.join(', ')}। किसको भेजना है?` : `Contacts mein ${found.length} log mile: ${found.join(', ')}. Kisko bhejna hai?` }; }
    name = found[0]; S.matches = null;
    S.pay = { name, amount: amt }; go('pay'); await new Promise((r) => setTimeout(r, 900));
    if (!(await confirmAction(`Pay ${money(amt)} to ${name}`))) { S.pay = null; return 'user said no'; }
    await askPin(`Pay ${money(amt)} to ${name}`);
    S.pay = null; S.txns.unshift({ id: 'T' + (1030 + S.txns.length), to: name, amount: amt, when: 'Just now', status: 'ok' }); go('history'); return 'paid';
  },
  handoff_human: ({ summary }) => { S.tickets.unshift({ id: 'HLP' + Math.floor(1000 + Math.random() * 9000), summary }); go('help'); return 'handed off'; },
  none: () => {},
};

// ---------- the assistant ----------
const history = [];
const code = new URLSearchParams(location.search).get('k');
try { if (code) localStorage.setItem('k', code); } catch {}
const access = () => { try { return localStorage.getItem('k') || ''; } catch { return code || ''; } };
const api = async (p, opts = {}, tries = 2) => {
  for (let i = 0; ; i++) {
    try { return await fetch(p, { ...opts, signal: AbortSignal.timeout(12000), headers: { ...(opts.headers || {}), 'x-access': access() } }); }
    catch (e) { if (i + 1 >= tries) throw e; log('retry ' + p + ': ' + e.message); }
  }
};
// Never let a PIN/OTP/password reach the model, even if the user says it out loud.
const redact = (t) => t.replace(/(pin|otp|password|passcode|cvv|पिन)(\D{0,12})\d{3,8}/gi, '$1$2[hidden]');
let status = { sarvam: false, brain: 'none' };
fetch('/api/status').then((r) => r.json()).then((s) => { status = s; log(`brain: ${s.brain} · sarvam voice: ${s.sarvam}`); });

let replyIn = 'Hinglish';
const LANGS = { 'hi-IN': 'Hindi', 'en-IN': 'English', 'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'bn-IN': 'Bengali', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati', 'kn-IN': 'Kannada', 'ml-IN': 'Malayalam', 'pa-IN': 'Punjabi', 'od-IN': 'Odia' };
let spokenLang = null; // set from speech-to-text for the next ask()
const HINGLISH = /\b(hai|hua|kyun|kya|kar|karo|mera|meri|mujhe|nahi|bhej|kal|aaj|paisa|bhai|yaar|dikhao|kardo|batao|haan|bana|banao|theek|accha|achha|karna|chahiye|mujhe|aage|badho|bolo|kitna|kitne|aaye|kyu)\b/i;
function context() {
  return {
    reply_in: replyIn,
    screen: S.screen, user: S.user.name,
    open_txn: S.openTxn && S.screen === 'txn' ? S.txns.find((t) => t.id === S.openTxn) : null,
    contacts: S.contacts,
    recent_txns: S.txns.map(({ id, to, amount, status, note }) => ({ id, to, amount, status, note })),
    credit_score: 'none yet: CIBIL shows NH (no credit history); about 6 months of a small credit line paid on time creates a first score',
    bus_state: S.bus ? { from: S.bus.from, to: S.bus.to, date: S.bus.dateLabel, booked: !!S.bus.booked } : null,
    today_summary: (() => { const td = S.txns.filter((t) => /^(Today|Just now)/.test(t.when)); const inn = td.filter((t) => t.status === 'in'); const last = S.txns[0];
      return { received_today_count: inn.length, received_today_total: inn.reduce((a, t) => a + t.amount, 0), received_from: inn.map((t) => `${t.to} ₹${t.amount}`), sent_today_count: td.filter((t) => t.status !== 'in').length,
        last_transaction: last ? `${last.status === 'in' ? 'received from' : 'paid to'} ${last.to}, ₹${last.amount}, ${last.when}${last.status === 'pending' ? ' (pending)' : ''}` : null }; })(),
    loan_state: S.loan, fixes_done: Object.keys(S.fixes).filter((k) => S.fixes[k]), recheck_days: S.recheckDays,
  };
}

let lang = 'hi-IN';
let hideT = null;
const hideSoon = (ms = 7000) => { clearTimeout(hideT); hideT = setTimeout(() => { if (!rec && !$('#mascot').classList.contains('think') && document.activeElement !== $('#typein') && $('#typed').hidden) $('#bubble').hidden = true; }, ms); };
const talking = (on) => { $('#mascot').classList.toggle('talk', on); if (!on) hideSoon(); };
async function say(text) {
  clearTimeout(hideT); $('#bubble').hidden = false; $('#said').textContent = text; talking(true); hideSoon(12000);
  if (status.sarvam) {
    try {
      const r = await (await api('/api/tts', { method: 'POST', body: JSON.stringify({ text, lang: replyIn === 'English' ? 'en-IN' : (Object.keys(LANGS).find((k) => LANGS[k] === replyIn) || 'hi-IN') }) })).json();
      if (r.audio) { player.src = 'data:audio/wav;base64,' + r.audio; player.onended = () => talking(false); await player.play(); return; }
    } catch (e) { log('tts failed: ' + e.message); }
  }
  const u = new SpeechSynthesisUtterance(text); u.lang = 'hi-IN'; u.onend = () => talking(false); speechSynthesis.cancel(); speechSynthesis.speak(u);
}

async function ask(text) {
  if (!text) return;
  if (pending) { settle(/\b(haan|han|ha|yes|ok|okay|kar do|karo|theek)\b/i.test(text)); return; }
  if (spokenLang && LANGS[spokenLang]) replyIn = /[a-z]/i.test(text) && !/[^\x00-\x7F]/.test(text) && spokenLang === 'hi-IN' ? 'Hinglish' : LANGS[spokenLang];
  else replyIn = /[\u0900-\u097F]/.test(text) ? 'Hindi' : HINGLISH.test(text) ? 'Hinglish' : 'English';
  spokenLang = null;
  const clean = redact(text);
  if (clean !== text) log('redacted a secret before sending');
  text = clean;
  $('#bubble').hidden = false; $('#heard').textContent = '“' + text + '”'; $('#said').textContent = '…';
  $('#mascot').classList.add('think');
  history.push({ role: 'user', content: replyIn === 'Hinglish' ? text : `${text} (reply in ${replyIn}${replyIn === 'Hindi' ? ', Devanagari script' : ''})` });
  try {
    const r = await (await api('/api/chat', { method: 'POST', body: JSON.stringify({ messages: history.slice(-12), context: context() }) })).json();
    if (r.error) throw new Error(r.error);
    history.push({ role: 'assistant', content: JSON.stringify(r) });
    say(r.say || '');
    for (const a of r.actions || []) {
      log(`→ ${a.tool} ${JSON.stringify(a.args || {})}`);
      const out = await (tools[a.tool] || tools.none)(a.args || {});
      if (out) log(`  ← ${typeof out === 'object' ? out.speak : out}`);
      if (out && out.speak) say(out.speak);
      if (out === 'user said no') { say('Theek hai, nahi kiya. Kuch aur?'); break; }
    }
    if ((r.actions || []).some((a) => a.tool && a.tool !== 'none')) { hideSoon(3500); /* let the user see what Bolo did */

    }
  } catch (e) { say('Network issue, ek baar phir boliye.'); log('error: ' + e.message); }
  $('#mascot').classList.remove('think');
}

// ---------- voice in: tap to talk, tap again to send ----------
function toWav(chunks, rate) {
  const n = chunks.reduce((a, c) => a + c.length, 0), all = new Float32Array(n); let o = 0;
  for (const c of chunks) { all.set(c, o); o += c.length; }
  const step = rate / 16000, len = Math.floor(n / step), buf = new DataView(new ArrayBuffer(44 + len * 2));
  const w = (p, t) => [...t].forEach((ch, i) => buf.setUint8(p + i, ch.charCodeAt(0)));
  w(0, 'RIFF'); buf.setUint32(4, 36 + len * 2, true); w(8, 'WAVEfmt '); buf.setUint32(16, 16, true); buf.setUint16(20, 1, true); buf.setUint16(22, 1, true);
  buf.setUint32(24, 16000, true); buf.setUint32(28, 32000, true); buf.setUint16(32, 2, true); buf.setUint16(34, 16, true); w(36, 'data'); buf.setUint32(40, len * 2, true);
  for (let i = 0; i < len; i++) { const v = Math.max(-1, Math.min(1, all[Math.floor(i * step)])); buf.setInt16(44 + i * 2, v * 0x7fff, true); }
  return new Blob([buf], { type: 'audio/wav' });
}
let rec = null, chunks = [];
// iOS Safari / home-screen app: audio must be unlocked inside the tap itself, before any await.
let sharedCtx = null; const player = new Audio(); player.playsInline = true;
function unlockAudio() {
  try { sharedCtx = sharedCtx || new (window.AudioContext || window.webkitAudioContext)(); sharedCtx.resume(); } catch {}
  try { player.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAgD4AAAB9AAACABAAZGF0YQAAAAA='; player.play().catch(() => {}); } catch {}
}
async function startListening() {
  $('#mascot').classList.add('listen'); $('#bubble').hidden = false; $('#heard').textContent = 'Listening… bolo, main sun raha hoon';
  if (status.sarvam && navigator.mediaDevices?.getUserMedia) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    log('mic on');
    const r = window.MediaRecorder ? new MediaRecorder(stream) : { state: 'recording', stop() { this.state = 'inactive'; this.onstop && this.onstop(); }, start() {} }; chunks = [];
    rec = r;
    // Auto-send when the user stops talking: ~1.3 s of quiet after some speech, or 12 s max.
    const ctx = sharedCtx || new (window.AudioContext || window.webkitAudioContext)(); sharedCtx = ctx; if (ctx.state === 'suspended') await ctx.resume();
    const an = ctx.createAnalyser(); an.fftSize = 1024; const src = ctx.createMediaStreamSource(stream); src.connect(an);
    // Also capture raw PCM so we can send a WAV: Android's WebM has no duration header and Sarvam misreads it as >30 s.
    const pcm = []; const proc = ctx.createScriptProcessor(4096, 1, 1);
    proc.onaudioprocess = (e) => pcm.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    src.connect(proc); proc.connect(ctx.destination);
    r.wav = () => toWav(pcm, ctx.sampleRate);
    const buf = new Uint8Array(an.fftSize); let spoke = false, quietSince = 0; const started = Date.now();
    const vad = setInterval(() => {
      an.getByteTimeDomainData(buf);
      let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v - 128));
      const now = Date.now();
      if (peak > 14) { spoke = true; quietSince = 0; $('#heard').textContent = 'Listening… 🎙️'; }
      else if (spoke && !quietSince) quietSince = now;
      if ((spoke && quietSince && now - quietSince > 1300) || now - started > 12000 || (!spoke && now - started > 7000)) {
        clearInterval(vad); try { proc.disconnect(); src.disconnect(); } catch {}
        if (r.state === 'recording') { r.stop(); $('#mascot').classList.remove('listen'); rec = null; }
      }
    }, 100);
    r.ondataavailable = (e) => chunks.push(e.data);
    r.onstop = async () => {
      // Bug fixed 31 Oct: the click handler nulls `rec` before onstop fires, so use the local recorder.
      stream.getTracks().forEach((t) => t.stop());
      const blob = r.wav ? r.wav() : new Blob(chunks, { type: r.mimeType || 'audio/webm' });
      if (blob.size < 2000) { $('#heard').textContent = 'Kuch suna nahi, phir se tap karke boliye.'; return; }
      log(`recorded ${Math.round(blob.size / 1024)} KB ${blob.type}`);
      $('#heard').textContent = '…';
      try {
        const r = await (await api('/api/stt', { method: 'POST', headers: { 'content-type': blob.type }, body: blob })).json();
        if (r.error) throw new Error(r.error);
        if (r.lang) { lang = r.lang; spokenLang = r.lang; }
        if (!r.text) { $('#heard').textContent = 'Kuch suna nahi, phir se tap karke boliye.'; return; }
        ask(r.text);
      } catch (e) { log('stt failed: ' + e.message); say('Sun nahi paaya, ek baar phir boliye.'); }
    };
    r.start();
  } else {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { $('#heard').textContent = 'Voice not available here, type below.'; $('#mascot').classList.remove('listen'); return; }
    rec = new SR(); rec.lang = 'hi-IN'; rec.interimResults = false;
    rec.onresult = (e) => ask(e.results[0][0].transcript);
    rec.onend = () => { $('#mascot').classList.remove('listen'); rec = null; };
    rec.start();
  }
}
let starting = false;
$('#mascot').onclick = () => {
  if (starting) return;
  if (rec) { rec.stop(); $('#mascot').classList.remove('listen'); rec = null; return; }
  starting = true; setTimeout(() => (starting = false), 800); unlockAudio();
  startListening().catch((e) => { log('mic: ' + e.message); $('#heard').textContent = 'Mic blocked, type below.'; $('#mascot').classList.remove('listen'); });
};
$('#bclose').onclick = (e) => { e.stopPropagation(); $('#bubble').hidden = true; $('#typed').hidden = true; };
$('#kbd').onclick = () => { $('#typed').hidden = false; $('#typein').focus(); };
$('#typed').onsubmit = (e) => { e.preventDefault(); const v = $('#typein').value.trim(); $('#typein').value = ''; ask(v); };
if (/debug/.test(location.search) || localStorage.getItem('debug')) document.body.classList.add('debug');
$('#logbtn').onclick = () => { $('#log').hidden = !$('#log').hidden; };

// Deep links for screenshots: #screen=loan&loan=plan&bus=results&txn=T1029&pay=Rohit%20Verma:255&sheet=confirm|pin
const H = new URLSearchParams(location.hash.slice(1));
if (H.get('loan')) S.loan = H.get('loan');
if (H.get('txn')) S.openTxn = H.get('txn');
if (H.get('bus')) S.bus = { from: 'Delhi', to: 'Noida', dateLabel: 'Sat, 31 Oct', stage: H.get('bus'), pick: 0 };
if (H.get('pay')) { const [name, amount] = H.get('pay').split(':'); S.pay = { name, amount: +amount || 0 }; }
if (H.get('loan') === 'plan') { S.fixes.enable_autopay = true; S.recheckDays = 60; }
if (H.get('loan') === 'eligible' || H.get('allfixed')) { Object.keys(S.fixes).forEach((k) => { S.fixes[k] = true; }); S.recheckDays = 60; }
if (H.get('ticket')) S.txns[0].ticket = 'CMP482913';
if (screens[H.get('screen')]) S.screen = H.get('screen');
if (S.screen === 'txn' && !S.openTxn) S.openTxn = 'T1029';
render();
if (H.get('sheet') === 'confirm') confirmAction('Pay ₹255 to Rohit Verma');
if (H.get('sheet') === 'pin') askPin('Pay ₹255 to Rohit Verma');
if (H.get('bubble')) setTimeout(() => { $('#bubble').hidden = false; $('#heard').textContent = '“yeh reject kyun hua?”'; $('#said').textContent = 'Lender reason nahi batata, par Paytm ke criteria se check kiya: age aur credit history abhi kam hai. Plan banaun?'; }, 700);

if (H.get('hots')) document.body.classList.add('hots');
if (!H.get('screen')) setTimeout(() => { $('#bubble').hidden = false; $('#said').innerHTML = '<div class="bolo-name">Bolo</div>Hey Udit! Mujhe tap karo aur bas bolo 😎'; hideSoon(5000); }, 600);
