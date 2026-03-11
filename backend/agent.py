"""
FireReach Agent Controller
Drives Groq (Llama 3.3 70B) with function-calling to orchestrate the three tools
sequentially: signal_harvester → research_analyst → outreach_sender.
"""

import json
import os

from dotenv import load_dotenv
from groq import Groq

from prompts import SYSTEM_PROMPT
from tools import (
    tool_outreach_automated_sender,
    tool_research_analyst,
    tool_signal_harvester,
)

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.3-70b-versatile"

# Module-level singleton — one HTTP connection pool for the process lifetime
_groq_client: Groq | None = None

def _get_client() -> Groq:
    global _groq_client
    if _groq_client is None:
        _groq_client = Groq(api_key=GROQ_API_KEY)
    return _groq_client

# ---------------------------------------------------------------------------
# Tool registry
# ---------------------------------------------------------------------------

TOOL_DISPATCH = {
    "tool_signal_harvester": tool_signal_harvester,
    "tool_research_analyst": tool_research_analyst,
    "tool_outreach_automated_sender": tool_outreach_automated_sender,
}

# ---------------------------------------------------------------------------
# OpenAI-compatible tool definitions for Groq
# ---------------------------------------------------------------------------

GROQ_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "tool_signal_harvester",
            "description": (
                "Fetch live buyer signals for a company using deterministic APIs. "
                "Always call this FIRST."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "company_name": {
                        "type": "string",
                        "description": "Target company name",
                    }
                },
                "required": ["company_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "tool_research_analyst",
            "description": (
                "Generate a strategic account brief from company signals and the ICP. "
                "Call this SECOND, after tool_signal_harvester."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "company_name": {"type": "string"},
                    "signals": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of signals returned by tool_signal_harvester",
                    },
                    "icp": {
                        "type": "string",
                        "description": "The ideal customer profile provided by the user",
                    },
                },
                "required": ["company_name", "signals", "icp"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "tool_outreach_automated_sender",
            "description": (
                "Generate and automatically send a personalised outreach email. "
                "Call this THIRD and LAST, after tool_research_analyst."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "recipient_email": {"type": "string"},
                    "company_name": {"type": "string"},
                    "account_brief": {
                        "type": "string",
                        "description": "The account brief from tool_research_analyst",
                    },
                },
                "required": ["recipient_email", "company_name", "account_brief"],
            },
        },
    },
]


# ---------------------------------------------------------------------------
# Agent loop
# ---------------------------------------------------------------------------

def _force_tool_call(client: Groq, messages: list[dict], tool_name: str) -> tuple:
    """
    Force the LLM to call a specific tool by name.
    Returns (assistant_dict_for_history, tool_result).
    """
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        tools=GROQ_TOOLS,
        tool_choice={"type": "function", "function": {"name": tool_name}},
        max_tokens=1024,
    )
    assistant_msg = response.choices[0].message
    tool_call = assistant_msg.tool_calls[0]

    assistant_dict: dict = {
        "role": "assistant",
        "content": assistant_msg.content or "",
        "tool_calls": [
            {
                "id": tool_call.id,
                "type": "function",
                "function": {
                    "name": tool_call.function.name,
                    "arguments": tool_call.function.arguments,
                },
            }
        ],
    }

    tool_args = json.loads(tool_call.function.arguments)
    tool_result: dict = TOOL_DISPATCH[tool_name](**tool_args)

    tool_msg: dict = {
        "role": "tool",
        "tool_call_id": tool_call.id,
        "name": tool_name,
        "content": json.dumps(tool_result),
    }

    return assistant_dict, tool_msg, tool_result


def run_agent(company: str, icp: str, email: str) -> dict:
    """
    Run the FireReach agent pipeline — forced sequential tool calls:
      1. tool_signal_harvester
      2. tool_research_analyst
      3. tool_outreach_automated_sender

    Each tool is forced explicitly so the LLM cannot skip or stop early.
    Returns a trace dict with all intermediate and final outputs.
    """
    client = _get_client()

    messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"Run the full FireReach outreach pipeline now.\n\n"
                f"Company: {company}\n"
                f"ICP: {icp}\n"
                f"Recipient Email: {email}\n\n"
                f"Execute all three tools sequentially. "
                f"Do not stop until the email is sent."
            ),
        },
    ]

    trace: dict = {
        "company": company,
        "signals": [],
        "signal_source": "",
        "account_brief": "",
        "email_subject": "",
        "email_body": "",
        "status": "pending",
        "send_method": "",
    }

    # ── Step 1: Signal Harvester ──────────────────────────────────────────
    asst1, tool1, result1 = _force_tool_call(client, messages, "tool_signal_harvester")
    trace["signals"] = result1.get("signals", [])
    trace["signal_source"] = result1.get("source", "")
    messages.extend([asst1, tool1])

    # ── Step 2: Research Analyst ──────────────────────────────────────────
    asst2, tool2, result2 = _force_tool_call(client, messages, "tool_research_analyst")
    trace["account_brief"] = result2.get("account_brief", "")
    messages.extend([asst2, tool2])

    # ── Step 3: Outreach Sender ───────────────────────────────────────────
    asst3, tool3, result3 = _force_tool_call(client, messages, "tool_outreach_automated_sender")
    trace["email_subject"] = result3.get("email_subject", "")
    trace["email_body"] = result3.get("email_body", "")
    trace["status"] = result3.get("status", "email_sent")
    trace["send_method"] = result3.get("send_method", "")

    return trace
