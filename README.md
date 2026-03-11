# FireReach — Autonomous B2B Outreach Engine

> Built for the Rabbitt AI Hackathon | Groq (Llama 3.3 70B) + Gmail SMTP + NewsAPI

FireReach is a single-feature agentic AI system that eliminates manual SDR grunt work. Give it a target company and your ICP — it autonomously harvests live signals, researches the account, writes a hyper-personalised email, and sends it.

---

## How It Works

```
User Input (ICP + Company + Email)
        │
        ▼
  [tool_signal_harvester]   — Fetches live signals via NewsAPI (funding, hiring, etc.)
        │
        ▼
  [tool_research_analyst]   — Generates a 2-paragraph Account Brief via Groq / Llama 3.3
        │
        ▼
  [tool_outreach_automated_sender] — Writes + sends a personalised email via Gmail SMTP
```

The agent uses **Groq function-calling** to chain the three tools in strict order — no templates, no manual steps.

---

## Stack

| Layer | Tech |
|---|---|
| LLM | Groq — Llama 3.3 70B Versatile |
| Backend | FastAPI (Python 3.11+) |
| Frontend | React 18 + Vite 5 + Tailwind CSS 3 |
| Signals | NewsAPI (live) + simulated fallback |
| Email | Gmail SMTP with App Passwords |
| Deploy | Render (backend) + Vercel (frontend) |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- [Groq API key](https://console.groq.com) (free)
- Gmail App Password
- [NewsAPI key](https://newsapi.org) (free tier)

### Backend

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Fill in GROQ_API_KEY, SMTP_EMAIL, SMTP_PASSWORD, NEWSAPI_KEY
python -m uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
# Optional: set VITE_API_URL in .env (defaults to http://localhost:8000)
npm run dev
```

Open `http://localhost:5173`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GROQ_API_KEY` | ✅ | Groq API key |
| `SMTP_EMAIL` | ✅ | Gmail address |
| `SMTP_PASSWORD` | ✅ | Gmail App Password |
| `NEWSAPI_KEY` | Recommended | Live signals (falls back to simulated) |
| `ALLOWED_ORIGINS` | Production | Comma-separated CORS origins |

---

## Rubric Coverage

| Category | Implementation |
|---|---|
| Tool Chaining | `agent.py` drives strict Signal → Research → Send via Groq function-calling |
| Outreach Quality | Email explicitly references harvested signals — zero-template policy enforced in system prompt |
| Automation Flow | `tool_outreach_automated_sender` fires automatically once research is complete |
| UI/UX | Clean React dashboard with live pipeline stepper + full result panels |
| Documentation | Full `DOCS.md` with logic flow, tool schemas, system prompt, API reference |

---

## Documentation

See [docs/DOCS.md](docs/DOCS.md) for:
- Full logic flow diagram
- Tool schemas (input/output specs)
- System prompt
- API reference
- Deployment guide

---

## Deployment

See **Section 8** of [DOCS.md](docs/DOCS.md) for step-by-step Render + Vercel instructions.
