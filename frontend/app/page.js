"use client";

import { useEffect, useState } from "react";
import "./globals.css";
import { SAMPLES } from "../lib/samples";
import { analyzeMessage } from "../lib/analyze-client";

const KEY = "scam-analyzer-gemini-key";
const CHANNELS = ["whatsapp", "sms", "email"];

export default function Page() {
  const [text, setText] = useState(SAMPLES[1].text);
  const [channel, setChannel] = useState("sms");
  const [active, setActive] = useState("bank");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY);
    if (saved) setApiKey(saved);
  }, []);

  function saveKey(value) {
    setApiKey(value);
    if (value.trim()) window.localStorage.setItem(KEY, value.trim());
    else window.localStorage.removeItem(KEY);
  }

  async function analyze() {
    setLoading(true);
    setError("");
    try {
      setResult(await analyzeMessage(text, channel, apiKey));
    } catch (err) {
      setError(err.message || "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <nav className="nav">
        <div className="brand"><span className="mark">SM</span> AI Scam Message Analyzer</div>
        <a href="https://github.com/manulanirwan/AIScam-Message-Analyzer">GitHub</a>
      </nav>
      <header>
        <h1>Read the message before you reply.</h1>
        <p className="lede">Paste a WhatsApp, SMS, or email message. Rules mark the risk. Gemini writes the reason. Text inside the message cannot force a safe result.</p>
      </header>
      <section className="layout">
        <div className="card">
          <div className="samples">
            {CHANNELS.map((item) => (
              <button key={item} className={channel === item ? "channel active" : "channel chip"} onClick={() => setChannel(item)}>{item}</button>
            ))}
          </div>
          <div className="samples">
            {SAMPLES.map((sample) => (
              <button key={sample.id} className={active === sample.id ? "chip active" : "chip"} onClick={() => { setText(sample.text); setChannel(sample.channel); setActive(sample.id); setResult(null); }}>{sample.label}</button>
            ))}
          </div>
          <div className="phone">
            <textarea value={text} onChange={(event) => { setText(event.target.value); setActive(""); }} placeholder="Paste the WhatsApp, SMS, or email message" />
          </div>
          <div className="row">
            <button className="primary" onClick={analyze} disabled={loading || !text.trim()}>{loading ? "Checking..." : "Analyze message"}</button>
            <button className="ghost" onClick={() => { setText(""); setResult(null); setActive(""); }}>Clear</button>
          </div>
          <label htmlFor="key">Gemini API key</label>
          <input id="key" type="password" value={apiKey} onChange={(event) => saveKey(event.target.value)} placeholder="Optional. Rules still run without it." autoComplete="off" />
          <p className="note">The key stays in this browser and goes only to Google. GitHub Pages cannot hide a server key.</p>
          {error ? <p className="error">{error}</p> : null}
        </div>
        <div className="card">
          {!result ? <div className="empty">The risk stamp, findings, and recommended action appear here.</div> : (
            <>
              <div className="scorehead">
                <div>
                  <div className={`stamp ${result.band}`}>RISK: {result.band.toUpperCase()}</div>
                  <h2>{result.label}</h2>
                  <span className="badge">{result.ai_used ? "Rules + Gemini" : "Rules only"} · {result.channel}</span>
                </div>
                <strong className={result.band}>{result.risk_score}</strong>
              </div>
              <ul className="list">
                {result.findings.length === 0 ? <li>No strong finding.</li> : result.findings.map((item) => <li key={item}>{item}</li>)}
              </ul>
              <div className="callout"><strong>Recommended action: </strong>{result.action}</div>
              {result.ai_error ? <p className="error">Gemini: {result.ai_error}. Rules result is still shown. If the key is website-restricted, allow https://manulanirwan.github.io/* in Google AI Studio.</p> : null}
              <h3>Links</h3>
              <div className="list">
                {result.urls.length === 0 ? <div className="url">No link found.</div> : result.urls.map((item) => (
                  <div className="url" key={item.url}><code>{item.url}</code><div className="note">{item.flags.join(", ") || "No link flag"}</div></div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      <section className="steps">
        <div className="step"><b>Paste</b> WhatsApp, SMS, or email text. Headers are optional.</div>
        <div className="step"><b>Score</b> Links, OTP requests, bank claims, and urgency raise the score.</div>
        <div className="step"><b>Act</b> Do not use the link in the message. Open the official app yourself.</div>
      </section>
      <footer>Study tool by Manula Nirwan. This is not a phone filter. It can miss a scam and it can flag a normal message.</footer>
    </main>
  );
}
