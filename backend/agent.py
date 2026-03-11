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

def run_agent(company: str, icp: str, email: str) -> dict:
    """
    Run the FireReach agent pipeline.

    Drives the Groq model (Llama 3.3 70B) through sequential tool calls:
      1. tool_signal_harvester
      2. tool_research_analyst
      3. tool_outreach_automated_sender

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
        "account_brief": "",
        "email_subject": "",
        "email_body": "",
        "status": "pending",
        "send_method": "",
    }

    for _ in range(10):  # safety cap — pipeline is only 3 steps
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
            tools=GROQ_TOOLS,
            tool_choice="auto",
            max_tokens=1024,
        )

        assistant_msg = response.choices[0].message

        # Serialise to a plain dict so the history stays JSON-safe across turns.
        # Appending the raw Groq object would crash on the second loop iteration.
        assistant_dict: dict = {"role": "assistant", "content": assistant_msg.content or ""}
        if assistant_msg.tool_calls:
            assistant_dict["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments,
                    },
                }
                for tc in assistant_msg.tool_calls
            ]
        messages.append(assistant_dict)

        # If no tool calls, agent is done
        if not assistant_msg.tool_calls:
            break

        # Execute every tool call in the turn (Groq may batch them)
        for tool_call in assistant_msg.tool_calls:
            tool_name = tool_call.function.name
            if tool_name not in TOOL_DISPATCH:
                continue

            tool_args = json.loads(tool_call.function.arguments)
            tool_result: dict = TOOL_DISPATCH[tool_name](**tool_args)

            # Record results in trace
            if tool_name == "tool_signal_harvester":
                trace["signals"] = tool_result.get("signals", [])
            elif tool_name == "tool_research_analyst":
                trace["account_brief"] = tool_result.get("account_brief", "")
            elif tool_name == "tool_outreach_automated_sender":
                trace["email_subject"] = tool_result.get("email_subject", "")
                trace["email_body"] = tool_result.get("email_body", "")
                trace["status"] = tool_result.get("status", "unknown")
                trace["send_method"] = tool_result.get("send_method", "")

            # Feed the tool result back into the conversation
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "name": tool_name,
                    "content": json.dumps(tool_result),
                }
            )

    # Mark as incomplete if the outreach tool was never reached
    if trace["status"] == "pending":
        trace["status"] = "incomplete"

    return trace
