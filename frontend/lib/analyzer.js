const URL_RE = /(?:https?:\/\/|www\.)[^\s<>'"]+/gi;
const SHORTENERS = ["bit.ly", "tinyurl.com", "t.co", "wa.me", "is.gd", "cutt.ly", "rb.gy", "shorturl.at", "tiny.cc"];
const BANK = ["bank", "boc", "sampath", "hnb", "peoples bank", "commercial bank", "nsb", "account blocked", "kyc", "refund"];
const PRIZE = ["you won", "winner", "prize", "lottery", "claim your", "congratulations you"];
const DELIVERY = ["parcel", "package", "courier", "customs", "delivery failed", "held at customs"];
const SENSITIVE = ["otp", "one-time", "password", "pin", "cvv", "card number", "nic", "bank details", "seed phrase", "login code"];
const URGENCY = ["immediately", "within 1 hour", "within 24 hours", "last chance", "act now", "suspended", "blocked", "expire", "final warning"];

function extractUrls(text) {
  const found = [];
  for (const raw of String(text || "").match(URL_RE) || []) {
    let cleaned = raw.replace(/[.,;:!?]+$/, "");
    if (!cleaned.startsWith("http")) cleaned = `http://${cleaned}`;
    if (!found.includes(cleaned)) found.push(cleaned);
  }
  return found;
}

function urlFlags(url) {
  let parsed;
  try { parsed = new URL(url); } catch { return ["Unreadable link"]; }
  const host = parsed.hostname.toLowerCase();
  const flags = [];
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) flags.push("IP address used as host");
  else if (host.split(".").length - 1 >= 3) flags.push("Many subdomains");
  if (SHORTENERS.includes(host)) flags.push("Shortened or redirect link");
  if (parsed.protocol === "http:") flags.push("Not HTTPS");
  if (["login", "verify", "otp", "bank", "claim", "wallet"].some((token) => parsed.pathname.toLowerCase().includes(token))) flags.push("Sensitive word in path");
  return flags;
}

export function scoreMessage(text, channel = "sms") {
  const raw = text || "";
  const lower = raw.toLowerCase();
  const urls = extractUrls(raw);
  const findings = [];
  const urlRows = [];
  let score = 0;
  let urlPoints = 0;

  for (const url of urls) {
    const flags = urlFlags(url);
    urlRows.push({ url, flags });
    if (flags.length) {
      findings.push("Suspicious link detected");
      urlPoints += 18;
      if (flags.includes("IP address used as host")) urlPoints += 12;
    } else urlPoints += 6;
  }
  score += Math.min(urlPoints, 40);
  if (SENSITIVE.some((item) => lower.includes(item))) {
    findings.push("Requests sensitive information");
    score += 25;
  }
  if (URGENCY.some((item) => lower.includes(item))) {
    findings.push("Uses urgency or threat language");
    score += 15;
  }
  let category = "general";
  if (BANK.some((item) => lower.includes(item))) {
    findings.push("Claims to be a bank or account service");
    category = "bank";
    score += 20;
  } else if (PRIZE.some((item) => lower.includes(item))) {
    findings.push("Claims a prize or unexpected reward");
    category = "prize";
    score += 20;
  } else if (DELIVERY.some((item) => lower.includes(item))) {
    findings.push("Claims a parcel or customs problem");
    category = "delivery";
    score += 15;
  }
  if (channel === "whatsapp" && lower.includes("click") && urls.length) {
    findings.push("WhatsApp message pushes a link click");
    score += 5;
  }
  score = Math.max(0, Math.min(score, 100));
  const band = score <= 30 ? "low" : score <= 60 ? "medium" : "high";
  const labels = {
    bank: "Possible fake bank message",
    prize: "Possible prize scam",
    delivery: "Possible delivery scam",
    general: band === "low" ? "No strong scam signals" : "Possible scam message",
  };
  return {
    risk_score: score,
    band,
    label: band === "low" ? "No strong scam signals" : labels[category],
    findings: [...new Set(findings)],
    urls: urlRows,
    channel,
    action: actionFor(band, urls.length > 0, category),
  };
}

export function actionFor(band, hasLink, category = "general") {
  if (band === "high" && category === "bank") return "Don't click the link. Open your bank app yourself. Do not share the OTP or PIN.";
  if (band === "high" && category === "prize") return "Don't click the link. A prize message that asks for a code is a common scam.";
  if (band === "high" && category === "delivery") return "Don't click the link. Check the parcel in the courier app or with the tracking number you already have.";
  if (band === "high" && hasLink) return "Don't click the link. Contact the sender through an official app or saved number.";
  if (band === "high") return "Do not share codes, PINs, or payment details. Check the claim through an official channel you open yourself.";
  if (band === "medium") return "Treat the message as unverified. Do not use its link or send a code.";
  return "No strong scam signals. Still do not send passwords or OTPs in a chat.";
}
