import re
from urllib.parse import urlparse

URL_RE = re.compile(r"(?:https?://|www\.)[^\s<>'\"]+", re.I)
SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "wa.me", "is.gd", "cutt.ly", "rb.gy", "shorturl.at", "tiny.cc"}
BANK = ["bank", "boc", "sampath", "hnb", "peoples bank", "commercial bank", "nsb", "account blocked", "kyc", "refund"]
PRIZE = ["you won", "winner", "prize", "lottery", "claim your", "congratulations you"]
DELIVERY = ["parcel", "package", "courier", "customs", "delivery failed", "held at customs"]
SENSITIVE = ["otp", "one-time", "password", "pin", "cvv", "card number", "nic", "bank details", "seed phrase", "login code"]
URGENCY = ["immediately", "within 1 hour", "within 24 hours", "last chance", "act now", "suspended", "blocked", "expire", "final warning"]
BRANDS = ["whatsapp", "dialog", "mobitel", "paypal", "microsoft", "apple", "google", "meta"]


def extract_urls(text: str) -> list[str]:
    found = []
    for raw in URL_RE.findall(text or ""):
        cleaned = raw.rstrip(".,;:!?")
        if not cleaned.startswith("http"):
            cleaned = "http://" + cleaned
        if cleaned not in found:
            found.append(cleaned)
    return found


def url_flags(url: str) -> list[str]:
    parsed = urlparse(url)
    host = (parsed.hostname or "").lower()
    flags = []
    if re.fullmatch(r"\d{1,3}(\.\d{1,3}){3}", host):
        flags.append("IP address used as host")
    elif host.count(".") >= 3:
        flags.append("Many subdomains")
    if host in SHORTENERS:
        flags.append("Shortened or redirect link")
    if parsed.scheme == "http":
        flags.append("Not HTTPS")
    if any(token in (parsed.path or "").lower() for token in ["login", "verify", "otp", "bank", "claim", "wallet"]):
        flags.append("Sensitive word in path")
    return flags


def score_message(text: str, channel: str = "sms") -> dict:
    raw = text or ""
    lower = raw.lower()
    urls = extract_urls(raw)
    findings = []
    url_rows = []
    score = 0

    url_points = 0
    for url in urls:
        flags = url_flags(url)
        url_rows.append({"url": url, "flags": flags})
        if flags:
            findings.append("Suspicious link detected")
            url_points += 18
            if "IP address used as host" in flags:
                url_points += 12
        else:
            url_points += 6
    score += min(url_points, 40)

    if any(item in lower for item in SENSITIVE):
        findings.append("Requests sensitive information")
        score += 25
    if any(item in lower for item in URGENCY):
        findings.append("Uses urgency or threat language")
        score += 15
    category = "general"
    if any(item in lower for item in BANK):
        findings.append("Claims to be a bank or account service")
        category = "bank"
        score += 20
    elif any(item in lower for item in PRIZE):
        findings.append("Claims a prize or unexpected reward")
        category = "prize"
        score += 20
    elif any(item in lower for item in DELIVERY):
        findings.append("Claims a parcel or customs problem")
        category = "delivery"
        score += 15
    if channel == "whatsapp" and "click" in lower and urls:
        findings.append("WhatsApp message pushes a link click")
        score += 5

    score = max(0, min(score, 100))
    band = "low" if score <= 30 else "medium" if score <= 60 else "high"
    labels = {
        "bank": "Possible fake bank message",
        "prize": "Possible prize scam",
        "delivery": "Possible delivery scam",
        "general": "Possible scam message" if band != "low" else "No strong scam signals",
    }
    if band == "low":
        label = "No strong scam signals"
    else:
        label = labels[category]
    return {
        "risk_score": score,
        "band": band,
        "label": label,
        "findings": list(dict.fromkeys(findings)),
        "urls": url_rows,
        "channel": channel,
        "action": action_for(band, bool(urls), category),
    }


def action_for(band: str, has_link: bool, category: str = "general") -> str:
    if band == "high" and category == "bank":
        return "Don't click the link. Open your bank app yourself. Do not share the OTP or PIN."
    if band == "high" and category == "prize":
        return "Don't click the link. A prize message that asks for a code is a common scam."
    if band == "high" and category == "delivery":
        return "Don't click the link. Check the parcel in the courier app or with the tracking number you already have."
    if band == "high" and has_link:
        return "Don't click the link. Contact the sender through an official app or saved number."
    if band == "high":
        return "Do not share codes, PINs, or payment details. Check the claim through an official channel you open yourself."
    if band == "medium":
        return "Treat the message as unverified. Do not use its link or send a code."
    return "No strong scam signals. Still do not send passwords or OTPs in a chat."
