# Bolo: Paytm's help, on every screen, that actually does the work
Paytm Build for India AI Hackathon (Delhi, 31 Oct 2026) · Track: Autonomous AI Teammates / AI-Powered Financial Journeys

**Team:** Udit Jain · Ananya Soni

**Live demo:** https://bolo-demo-7q.seriouss.workers.dev (open link, no login). Tap the blue Bolo button and speak, or tap a suggestion. Demo video: https://bolo-demo-7q.seriouss.workers.dev/demo.mp4

## What it is
Paytm's help today is a typed chat four taps deep that asks *"please select the transaction"*. Bolo is a voice assistant that sits on every Paytm screen, knows what you're looking at, and **does the task** after your "yes":
- **Loan rejected?** Shows Paytm's own published criteria (age 23-60, credit score/history, repayment record, employment/income) against your profile, never inventing the lender's private reason, then runs a fix plan (credit-builder, bank-statement link, AutoPay) and books a re-check.
- **Money debited, not received?** Checks the status, explains RBI's reversal deadline (T+1 for person-to-person UPI, then ₹100/day), files the complaint and tracks it.
- **Fraud?** Pre-fills the National Cybercrime Portal complaint, one-tap 1930, and drafts the email to your bank.
- **Pay / recharge / bus:** "Rohit ko 50 bhej do" (matches your contacts first), "mera regular recharge kar do", "kal Delhi se Jaipur bus".
- **Credit score, today's payments, last transaction**, read aloud.
- Replies in the language you spoke: English, Hindi, Hinglish, Gujarati, Tamil, Telugu, Bengali, Marathi, Kannada, Malayalam, Punjabi, Odia.

## Safety by design
- UPI PIN never reaches the AI: PIN/OTP/password are redacted on the phone before anything is sent; money moves only after an explicit on-screen Yes and the user's own UPI PIN (the demo shows an approve button and never collects a PIN).
- No action without a tool call the user can see; a backup intent router keeps core journeys working if the model fails.
- Loan explanations use only Paytm's published criteria and the user's own data (NBFCs aren't required to share reasons; RBI DL Directions 2025 para 6(i) unmatched-lender disclosure).
- See `SECURITY.md` for the threat model and production design.

## Stack
- Front end: a Paytm-faithful web app (vanilla JS, installable PWA), screens built from real app screenshots with personal data removed.
- Voice + brain: Sarvam AI (Saaras v4 speech-to-text, sarvam-105b-conversations with JSON tool calls, Bulbul v4 text-to-speech).
- Backend: Cloudflare Worker (`worker.js`), keys only in Worker secrets. `server.mjs` is the local twin.
- Production path: Bolo ships inside the Paytm app, calls Paytm's internal APIs, and runs on Paytm-hosted models in India.

## Run locally
```
cd app && echo "SARVAM_API_KEY=..." > .env && node server.mjs   # http://localhost:7810
```
All Paytm data in the demo is simulated. Concept demo; not an official Paytm product.
