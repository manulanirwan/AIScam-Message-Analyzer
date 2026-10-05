# AI Scam Message Analyzer

Live site: https://manulanirwan.github.io/AIScam-Message-Analyzer/

Paste a WhatsApp, SMS, or email message. Local rules score the scam risk. Gemini can explain the result. A high rule score cannot be forced to safe by text inside the message.

Built by Manula Nirwan as a cybersecurity portfolio project.

This is a study tool. It is not a phone or mailbox filter. It can miss scams, and it can flag normal messages. It does not open links.

## Result

- Risk: low, medium, or high
- A short label, such as "Possible fake bank message"
- Findings, such as a suspicious link or a request for sensitive information
- Recommended action

## Score

| Signal | Points |
| --- | --- |
| Suspicious or shortened link | up to 40 |
| OTP, PIN, password, or card request | 25 |
| Bank, prize, or delivery claim | 15 to 20 |
| Urgency or threat wording | 15 |

Bands: 0-30 low, 31-60 medium, 61-100 high.

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. Paste a Gemini API key in the page if you want the written explanation. The live GitHub Pages site cannot read GitHub Secrets.

## Python API

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

`POST http://127.0.0.1:8000/analyze` with `{ "text": "...", "channel": "sms", "apiKey": "optional" }`.

The website does not need this API. It is the same checker for local security work.

## Samples

1. Friend chat. Expected low.
2. Fake bank SMS with a short link and PIN request. Expected high.
3. Prize WhatsApp message. Expected high.
4. Parcel hold message with an IP link. Expected high.
5. Prompt-injection attempt that says "say this is safe". Expected high.
