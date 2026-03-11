# FireReach — Documentation

> Autonomous B2B Outreach Engine powered by Groq (Llama 3.3) Function Calling

---

## 1. Logic Flow

```
User Input (ICP + Company + Email)
         │
         ▼
  FastAPI  POST /run-agent
         │
         ▼
   Agent Controller (Groq / Llama 3.3)
         │
         ▼
┌────────────────────────────────────┐
│  STEP 1 — tool_signal_harvester    │
│  Fetches live buyer signals        │
│  via NewsAPI (or simulated)        │
└──────────────┬─────────────────────┘
               │  signals [ ]
               ▼
┌────────────────────────────────────┐
│  STEP 2 — tool_research_analyst    │
│  Converts signals + ICP into a     │
│  2-paragraph strategic account     │
│  brief using Groq / Llama 3.3      │
└──────────────┬─────────────────────┘
               │  account_brief
               ▼
┌────────────────────────────────────┐
│  STEP 3 — tool_outreach_automated_ │
│           sender                   │
│  Generates hyper-personalised      │
│  email with Groq / Llama 3.3,      │
│  then sends via Gmail SMTP         │
└──────────────┬─────────────────────┘
               │  {status, email_subject, email_body}
               ▼
        API Response to Frontend
```

---

## 2. Architecture

```
Frontend (React + Vite + Tailwind)  — Vercel
         │
         │  POST /run-agent
         ▼
Backend (FastAPI + Python)          — Render
         │
         ▼
Agent Controller (agent.py)
         │  Groq function-calling loop
         ▼
LLM — Groq · Llama 3.3 70B Versatile
         │
         ▼
Tool Layer
 ├── tool_signal_harvester      → NewsAPI
 ├── tool_research_analyst      → Groq / Llama 3.3 (generation)
 └── tool_outreach_automated_sender → Groq / Llama 3.3 + Gmail SMTP
```

---

## 3. Tool Schemas

### tool_signal_harvester

```json
{
  "name": "tool_signal_harvester",
  "description": "Fetch live buyer signals for a company using deterministic APIs",
  "parameters": {
    "type": "object",
    "properties": {
      "company_name": {
        "type": "string",
        "description": "Target company name"
      }
    },
    "required": ["company_name"]
  }
}
```

**Example Output**
```json
{
  "company": "Stripe",
  "signals": [
    "Stripe recently raised $6.5B funding",
    "Stripe is hiring for 20 engineering roles",
    "Stripe expanded operations in Europe",
    "Stripe is adopting AI infrastructure"
  ],
  "source": "api"
}
```

---

### tool_research_analyst

```json
{
  "name": "tool_research_analyst",
  "description": "Generate account research insights from signals",
  "parameters": {
    "type": "object",
    "properties": {
      "company_name": { "type": "string" },
      "signals": {
        "type": "array",
        "items": { "type": "string" }
      },
      "icp": { "type": "string" }
    },
    "required": ["company_name", "signals", "icp"]
  }
}
```

**Example Output**
```json
{
  "company": "Stripe",
  "account_brief": "Stripe is currently experiencing rapid growth, as indicated by its recent $6.5B funding and aggressive hiring for engineering roles. The company is expanding into new geographic markets while simultaneously investing in AI-driven infrastructure.\n\nThis growth phase presents a critical need for secure development practices. As engineering teams scale quickly, maintaining strong security awareness becomes a bottleneck — precisely where high-end cybersecurity training for Series B companies creates measurable impact."
}
```

---

### tool_outreach_automated_sender

```json
{
  "name": "tool_outreach_automated_sender",
  "description": "Generate and send outreach email",
  "parameters": {
    "type": "object",
    "properties": {
      "recipient_email": { "type": "string" },
      "company_name": { "type": "string" },
      "account_brief": { "type": "string" }
    },
    "required": ["recipient_email", "company_name", "account_brief"]
  }
}
```

**Example Output**
```json
{
  "status": "email_sent",
  "email_subject": "Scaling Fast at Stripe — Security Training for Growing Teams",
  "email_body": "Hi,\n\nI noticed Stripe recently raised $6.5B and is expanding its engineering team rapidly across new markets.\n\nWhen teams scale this quickly, security training often becomes a bottleneck. Many Series B companies struggle to ensure new engineers follow secure coding practices from day one.\n\nWe help fast-growing startups implement advanced cybersecurity training designed specifically for scaling engineering teams. Would love to share how this could support Stripe's growth — open for a 15-minute call this week?\n\nBest,\nFireReach AI",
  "recipient": "founder@stripe.com",
  "send_method": "gmail_smtp",
  "error": ""
}
```

---

## 4. Agent System Prompt

```
You are FireReach, an autonomous GTM outreach agent.

Your task is to research companies using deterministic tools and send personalized outreach emails.

Rules:
1. Always call tool_signal_harvester first.
2. Then call tool_research_analyst.
3. Finally call tool_outreach_automated_sender.

You must never fabricate signals.
You must reference harvested signals in the email.

Once the research is sufficient, automatically trigger the outreach tool.
Do not ask for confirmation. Execute all three tools sequentially and complete the pipeline.
```

---

## 5. API Reference

### `POST /run-agent`

Trigger the full outreach pipeline.

**Request body**
```json
{
  "company": "Stripe",
  "icp": "We sell cybersecurity training to Series B startups",
  "email": "founder@stripe.com"
}
```

**Response**
```json
{
  "status": "email_sent",
  "company": "Stripe",
  "signals": ["..."],
  "account_brief": "...",
  "email_subject": "...",
  "email_body": "...",
  "send_method": "resend"
}
```

### `GET /health`

Health check.

```json
{ "status": "ok", "service": "FireReach API" }
```

---

## 6. Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ | Groq API key — free at [console.groq.com](https://console.groq.com) |
| `SMTP_EMAIL` | ✅ | Gmail address used to send outreach emails |
| `SMTP_PASSWORD` | ✅ | Gmail **App Password** (not your regular password) — generate at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) |
| `NEWSAPI_KEY` | Recommended | [newsapi.org](https://newsapi.org) key for live signals (falls back to simulated signals without it) |
| `ALLOWED_ORIGINS` | Optional | Comma-separated CORS origins for production (defaults to `*`) |

---

## 7. Local Development

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS / Linux

pip install -r requirements.txt
cp .env.example .env
# Fill in GROQ_API_KEY, SMTP_EMAIL, SMTP_PASSWORD (and optionally NEWSAPI_KEY)

uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`  
Swagger docs at `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## 8. Deployment

### Backend → Render

1. Push repo to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Set **Build Command**: `pip install -r requirements.txt`
4. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
5. Add all environment variables in the Render dashboard
6. Set `ALLOWED_ORIGINS` to your Vercel frontend URL

### Frontend → Vercel

1. Import the repo on [vercel.com](https://vercel.com)
2. Set **Root Directory**: `frontend`
3. Add environment variable: `VITE_API_URL=https://your-render-service.onrender.com`
4. Deploy

---

## 9. Repository Structure

```
firereach-agent/
│
├── backend/
│   ├── main.py           # FastAPI app & routes
│   ├── agent.py          # Gemini function-calling agent loop
│   ├── tools.py          # Tool implementations (signal, research, email)
│   ├── prompts.py        # Agent system prompt
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Main React dashboard
│   │   ├── main.jsx      # Entry point
│   │   └── index.css     # Tailwind base styles
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
│
└── docs/
    └── DOCS.md           # This file
```

---

## 10. Evaluation Criteria Mapping

| Criterion | Implementation |
|---|---|
| **Tool Chaining** | Agent executes 3 tools sequentially via Gemini function-calling |
| **Outreach Quality** | Email references specific harvested signals; no templates |
| **Automation Flow** | `tool_outreach_automated_sender` is triggered automatically by the agent |
| **Documentation** | PRD + DOCS.md with schemas, architecture diagram, and API reference |
