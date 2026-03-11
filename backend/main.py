"""
FireReach FastAPI Backend
Exposes POST /run-agent which triggers the full agentic outreach pipeline.
"""

import os
import re
import time
import uuid
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field, field_validator
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from agent import run_agent

load_dotenv()

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(
    title="FireReach API",
    description="Autonomous B2B outreach engine powered by Groq / Llama 3.3 function-calling.",
    version="1.0.0",
    # Disable the default OpenAPI docs in production to reduce attack surface.
    docs_url="/docs" if os.getenv("ENV", "dev") != "production" else None,
    redoc_url=None,
)

# ---------------------------------------------------------------------------
# Trusted host — reject HTTP Host header spoofing
# ---------------------------------------------------------------------------

_trusted_hosts = os.getenv("TRUSTED_HOSTS", "localhost,127.0.0.1").split(",")
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[h.strip() for h in _trusted_hosts] + ["*"] if os.getenv("ENV") != "production" else [h.strip() for h in _trusted_hosts],
)

# ---------------------------------------------------------------------------
# Security headers middleware
# ---------------------------------------------------------------------------

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Cache-Control"] = "no-store"
        # Only add HSTS in production (requires HTTPS)
        if os.getenv("ENV") == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# ---------------------------------------------------------------------------
# CORS — explicit origin list, no wildcard
# ---------------------------------------------------------------------------

_raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,https://rabbitt-ai-submission.vercel.app")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ---------------------------------------------------------------------------
# Request body size limit — prevent DoS via huge payloads (32 KB max)
# ---------------------------------------------------------------------------

class LimitBodySizeMiddleware(BaseHTTPMiddleware):
    _max_bytes = 32_768  # 32 KB

    async def dispatch(self, request: Request, call_next) -> Response:
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self._max_bytes:
            return Response(
                content='{"detail":"Request body too large"}',
                status_code=413,
                media_type="application/json",
            )
        return await call_next(request)

app.add_middleware(LimitBodySizeMiddleware)

# ---------------------------------------------------------------------------
# In-memory rate limiter (per IP, max 5 requests / 60 seconds)
# ---------------------------------------------------------------------------

_rate_store: Dict[str, list] = defaultdict(list)
RATE_LIMIT = 5
RATE_WINDOW = 60


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    window_start = now - RATE_WINDOW
    _rate_store[ip] = [t for t in _rate_store[ip] if t > window_start]
    if len(_rate_store[ip]) >= RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests. Limit: {RATE_LIMIT} per {RATE_WINDOW}s.",
        )
    _rate_store[ip].append(now)

# ---------------------------------------------------------------------------
# Background job store
# ---------------------------------------------------------------------------

_jobs: Dict[str, dict] = {}
_executor = ThreadPoolExecutor(max_workers=4)

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def _run_job(job_id: str, company: str, icp: str, email: str) -> None:
    try:
        result = run_agent(company=company, icp=icp, email=email)
        _jobs[job_id] = {"status": "done", "result": result}
    except Exception:
        # Never surface internal error details to the client
        _jobs[job_id] = {"status": "error", "error": "Pipeline execution failed. Check server logs."}

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

_SAFE_TEXT = re.compile(r"[^\w\s.,@!?'\-:()/&]", re.UNICODE)
_MAX_ICP = 500
_MAX_COMPANY = 100


class OutreachRequest(BaseModel):
    company: str = Field(..., min_length=1, max_length=_MAX_COMPANY)
    icp: str = Field(..., min_length=10, max_length=_MAX_ICP)
    email: EmailStr

    @field_validator("company", "icp", mode="before")
    @classmethod
    def strip_and_sanitise(cls, v: str) -> str:
        if not isinstance(v, str):
            raise ValueError("Must be a string")
        v = v.strip()
        v = _SAFE_TEXT.sub("", v)
        return v


class JobAccepted(BaseModel):
    job_id: str
    status: str = "queued"
    poll_url: str


class OutreachResponse(BaseModel):
    status: str
    company: str
    signals: List[str] = []
    account_brief: str = ""
    email_subject: str = ""
    email_body: str = ""
    send_method: str = ""


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: Optional[OutreachResponse] = None
    error: Optional[str] = None

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "FireReach API"}


@app.post("/run-agent", response_model=JobAccepted, status_code=202)
def run_outreach(request: OutreachRequest, http_request: Request):
    """
    Enqueue the FireReach agent pipeline. Returns a job_id immediately.
    Poll GET /job/{job_id} for the result to avoid gateway timeouts.
    """
    client_ip = http_request.client.host if http_request.client else "unknown"
    _check_rate_limit(client_ip)

    job_id = str(uuid.uuid4())
    _jobs[job_id] = {"status": "running"}

    _executor.submit(
        _run_job,
        job_id,
        request.company,
        request.icp,
        str(request.email),
    )

    return JobAccepted(job_id=job_id, status="queued", poll_url=f"/job/{job_id}")


@app.get("/job/{job_id}", response_model=JobStatusResponse)
def get_job(job_id: str):
    """Poll until status is 'done' or 'error'."""
    # Validate format before looking up — prevents path traversal / enumeration
    if not _UUID_RE.match(job_id):
        raise HTTPException(status_code=400, detail="Invalid job ID format")

    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    entry = _jobs[job_id]
    if entry["status"] == "done":
        return JobStatusResponse(
            job_id=job_id,
            status="done",
            result=OutreachResponse(**entry["result"]),
        )
    if entry["status"] == "error":
        return JobStatusResponse(job_id=job_id, status="error", error=entry["error"])

    return JobStatusResponse(job_id=job_id, status="running")

# ---------------------------------------------------------------------------
# Background job store (avoids 30s gateway timeouts)
# ---------------------------------------------------------------------------

_jobs: Dict[str, dict] = {}
_executor = ThreadPoolExecutor(max_workers=4)

def _run_job(job_id: str, company: str, icp: str, email: str) -> None:
    try:
        result = run_agent(company=company, icp=icp, email=email)
        _jobs[job_id] = {"status": "done", "result": result}
    except Exception as exc:
        _jobs[job_id] = {"status": "error", "error": str(exc)}

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

_SAFE_TEXT = re.compile(r"[^\w\s.,@!?'\-:()/&]", re.UNICODE)
_MAX_ICP = 500
_MAX_COMPANY = 100


class OutreachRequest(BaseModel):
    company: str = Field(..., min_length=1, max_length=_MAX_COMPANY)
    icp: str = Field(..., min_length=10, max_length=_MAX_ICP)
    email: EmailStr

    @field_validator("company", "icp", mode="before")
    @classmethod
    def strip_and_sanitise(cls, v: str) -> str:
        v = v.strip()
        # Remove characters that have no place in a company name or ICP description
        v = _SAFE_TEXT.sub("", v)
        return v


class JobAccepted(BaseModel):
    job_id: str
    status: str = "queued"
    poll_url: str


class OutreachResponse(BaseModel):
    status: str
    company: str
    signals: List[str] = []
    account_brief: str = ""
    email_subject: str = ""
    email_body: str = ""
    send_method: str = ""


class JobStatusResponse(BaseModel):
    job_id: str
    status: str          # queued | running | done | error
    result: Optional[OutreachResponse] = None
    error: Optional[str] = None

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "FireReach API"}


@app.post("/run-agent", response_model=JobAccepted, status_code=202)
def run_outreach(request: OutreachRequest, http_request: Request):
    """
    Enqueue the FireReach agent pipeline and immediately return a job ID.
    Poll GET /job/{job_id} for the result — avoids gateway timeout on long runs.
    """
    client_ip = http_request.client.host if http_request.client else "unknown"
    _check_rate_limit(client_ip)

    job_id = str(uuid.uuid4())
    _jobs[job_id] = {"status": "running"}

    _executor.submit(
        _run_job,
        job_id,
        request.company,
        request.icp,
        str(request.email),
    )

    return JobAccepted(
        job_id=job_id,
        status="queued",
        poll_url=f"/job/{job_id}",
    )


@app.get("/job/{job_id}", response_model=JobStatusResponse)
def get_job(job_id: str):
    """Poll this endpoint until status == 'done' or 'error'."""
    if job_id not in _jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    entry = _jobs[job_id]
    if entry["status"] == "done":
        return JobStatusResponse(
            job_id=job_id,
            status="done",
            result=OutreachResponse(**entry["result"]),
        )
    if entry["status"] == "error":
        return JobStatusResponse(job_id=job_id, status="error", error=entry["error"])

    return JobStatusResponse(job_id=job_id, status="running")
