"""
FireReach Tool Layer
Implements the three agent tools:
  1. tool_signal_harvester   — live company signals via NewsAPI
  2. tool_research_analyst   — strategic account brief via Groq (Llama 3.3)
  3. tool_outreach_automated_sender — email generation + Gmail SMTP delivery
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import httpx
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")
SMTP_EMAIL = os.getenv("SMTP_EMAIL", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

GROQ_MODEL = "llama-3.3-70b-versatile"

# Module-level singleton — reuse the HTTP connection pool
_groq_client: Groq | None = None

def _get_groq() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=GROQ_API_KEY)
    return _groq_client


# ---------------------------------------------------------------------------
# TOOL 1 — Signal Harvester
# ---------------------------------------------------------------------------

def tool_signal_harvester(company_name: str) -> dict:
    """
    Fetch live buyer signals for a target company.
    Uses NewsAPI when a key is configured; falls back to simulated signals
    so the agent pipeline still runs during demos without API keys.
    """
    signals: list[str] = []
    source = "api"

    if NEWSAPI_KEY:
        try:
            with httpx.Client(timeout=10) as client:
                resp = client.get(
                    "https://newsapi.org/v2/everything",
                    params={
                        "q": f'"{company_name}"',
                        "sortBy": "publishedAt",
                        "pageSize": 10,
                        "language": "en",
                        "apiKey": NEWSAPI_KEY,
                    },
                )
            data = resp.json()
            if data.get("status") == "ok":
                for article in data.get("articles", []):
                    title = (article.get("title") or "").strip()
                    # Prefer articles that mention the company name directly
                    if title and company_name.lower() in title.lower():
                        signals.append(title)
                    if len(signals) >= 5:
                        break
                # Fall back to any titles if none matched by name
                if not signals:
                    for article in data.get("articles", [])[:5]:
                        title = (article.get("title") or "").strip()
                        if title:
                            signals.append(title)
        except Exception:
            signals = []

    if not signals:
        source = "simulated"
        signals = [
            f"{company_name} recently announced strong ARR growth",
            f"{company_name} is actively hiring senior engineering and GTM roles",
            f"{company_name} expanded product offerings this quarter",
            f"{company_name} raised a significant funding round",
            f"{company_name} is investing in AI-driven infrastructure",
        ]

    return {
        "company": company_name,
        "signals": signals[:5],
        "source": source,
    }


# ---------------------------------------------------------------------------
# TOOL 2 — Research Analyst
# ---------------------------------------------------------------------------

def tool_research_analyst(company_name: str, signals: list, icp: str) -> dict:
    """
    Convert company signals + ICP into a 2-paragraph strategic account brief.
    Uses Groq (Llama 3.3 70B) to produce concise, actionable text.
    """
    client = _get_groq()

    signals_text = "\n".join(f"- {s}" for s in signals)

    prompt = f"""You are a senior B2B sales research analyst.

Company: {company_name}
ICP (Ideal Customer Profile): {icp}

Signals:
{signals_text}

Write a 2-paragraph account brief:
- Paragraph 1: Summarise {company_name}'s current situation using the signals above. Be specific; cite at least one signal.
- Paragraph 2: Identify the likely pain points this company faces and explain why the ICP offering is a strategic fit right now.

Rules:
- No bullet points, no headers — prose only.
- Under 160 words total.
- Sound like a sharp analyst, not a marketing brochure."""

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": "You are a senior B2B sales research analyst."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=350,
        temperature=0.6,
    )
    brief = response.choices[0].message.content.strip()

    return {
        "company": company_name,
        "account_brief": brief,
    }


# ---------------------------------------------------------------------------
# TOOL 3 — Outreach Automated Sender
# ---------------------------------------------------------------------------

def tool_outreach_automated_sender(
    recipient_email: str,
    company_name: str,
    account_brief: str,
) -> dict:
    """
    Generate a hyper-personalised outreach email using Groq (Llama 3.3),
    then send it via Gmail SMTP with an App Password.
    Falls back to simulation when SMTP credentials are not configured.
    """
    client = _get_groq()

    # ---- Generate email content ----------------------------------------
    prompt = f"""You are an elite B2B cold-email copywriter.

Company: {company_name}
Account Brief: {account_brief}

Write a cold outreach email that:
- Opens with a SPECIFIC signal from the brief (not a generic opener)
- Has a subject line that references that signal (max 10 words)
- Body = 3 short paragraphs:
    Paragraph 1: Reference the signal as a hook (2 sentences)
    Paragraph 2: Connect their likely pain point to what we offer (2-3 sentences)
    Paragraph 3: Soft CTA — ask for a brief call or reply (1-2 sentences)
- Sounds human, never templated
- Signed: FireReach AI

Respond in EXACTLY this format (no extra text before or after):
SUBJECT: <subject here>
BODY:
<body here>"""

    raw = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": "You are an elite B2B cold-email copywriter."},
            {"role": "user", "content": prompt},
        ],
        max_tokens=500,
        temperature=0.7,
    ).choices[0].message.content.strip()

    # ---- Parse subject / body ------------------------------------------
    subject = f"Quick note for {company_name}'s team"
    body_lines: list[str] = []
    in_body = False

    for line in raw.split("\n"):
        if line.upper().startswith("SUBJECT:"):
            subject = line.split(":", 1)[1].strip()
        elif line.upper().strip() == "BODY:":
            in_body = True
        elif in_body:
            body_lines.append(line)

    body = "\n".join(body_lines).strip() or raw

    # ---- Send via Gmail SMTP -------------------------------------------
    email_sent = False
    send_method = "none"
    error_msg = ""

    if SMTP_EMAIL and SMTP_PASSWORD:
        try:
            msg = MIMEMultipart()
            msg["From"] = SMTP_EMAIL
            msg["To"] = recipient_email
            msg["Subject"] = subject
            msg.attach(MIMEText(body, "plain"))
            with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
                server.ehlo()
                server.starttls()
                server.login(SMTP_EMAIL, SMTP_PASSWORD)
                server.sendmail(SMTP_EMAIL, recipient_email, msg.as_string())
            email_sent = True
            send_method = "gmail_smtp"
        except Exception as exc:
            error_msg = str(exc)
            email_sent = False
    else:
        # Demo / dev mode — no SMTP credentials configured
        email_sent = True
        send_method = "simulated"
        error_msg = "No SMTP credentials configured — delivery simulated for demo"

    return {
        "status": "email_sent" if email_sent else "email_failed",
        "email_subject": subject,
        "email_body": body,
        "recipient": recipient_email,
        "send_method": send_method,
        "error": error_msg,
    }
