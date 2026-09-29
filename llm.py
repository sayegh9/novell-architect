#!/usr/bin/env python3
"""
llm.py -- Centralized LLM client adapter for autonovel.

Supports:
  1. Google Gemini API (GEMINI_API_KEY or GOOGLE_API_KEY)
  2. Anthropic API (ANTHROPIC_API_KEY)
"""

import os
import re
import sys
import json
import time
from pathlib import Path
from dotenv import load_dotenv


BASE_DIR = Path(os.environ.get("AUTONOVEL_PROJECT_DIR", Path(__file__).resolve().parent)).resolve()
load_dotenv(BASE_DIR / ".env", override=True)

# API Keys
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
PROVIDER = os.environ.get("AUTONOVEL_PROVIDER", "auto").strip().lower()
ANTHROPIC_BASE_URL = os.environ.get("AUTONOVEL_API_BASE_URL", "https://api.anthropic.com")
ANTHROPIC_BETA = "context-1m-2025-08-07"

# Default Model Configuration
# When using Gemini, default to gemini-3.7-flash (with reasoning & extended thinking).
# When using Anthropic, default to claude-sonnet-4-6 / opus-4-6.
IS_GEMINI = bool(GEMINI_API_KEY) or not bool(ANTHROPIC_API_KEY)

DEFAULT_WRITER_MODEL = "gemini-2.5-flash" if IS_GEMINI else "claude-sonnet-4-6"
DEFAULT_JUDGE_MODEL = "gemini-2.5-flash" if IS_GEMINI else "claude-sonnet-4-6"
DEFAULT_REVIEW_MODEL = "gemini-2.5-flash" if IS_GEMINI else "claude-opus-4-6"


WRITER_MODEL = os.environ.get("AUTONOVEL_WRITER_MODEL", DEFAULT_WRITER_MODEL)
JUDGE_MODEL = os.environ.get("AUTONOVEL_JUDGE_MODEL", DEFAULT_JUDGE_MODEL)
REVIEW_MODEL = os.environ.get("AUTONOVEL_REVIEW_MODEL", DEFAULT_REVIEW_MODEL)


_genai_configured = False

def _call_gemini(
    prompt: str,
    system: str = "",
    model: str = "gemini-2.5-flash",
    max_tokens: int = 8000,
    temperature: float = 0.7,
    timeout: int = 300,
) -> str:
    """Call Google Gemini API using header-authenticated HTTPS request (x-goog-api-key)."""
    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    m_name = model or "gemini-2.5-flash"
    if "/" in m_name:
        m_name = m_name.split("/")[-1]
    if "claude" in m_name.lower():
        m_name = "gemini-2.5-flash"

    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
    ]

    max_retries = 3
    last_error = None

    import httpx

    for attempt in range(1, max_retries + 1):
        target_model = m_name if attempt < max_retries else "gemini-2.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent"
        
        headers = {
            "x-goog-api-key": GEMINI_API_KEY,
            "Content-Type": "application/json",
        }

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
            "safetySettings": safety_settings,
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}

        try:
            with httpx.Client(timeout=timeout or 120) as client:
                resp = client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        text = "".join(part.get("text", "") for part in parts if "text" in part)
                        if text.strip():
                            return text.strip()
                    last_error = f"Empty candidate content in response from model {target_model}"
                else:
                    last_error = f"HTTP {resp.status_code}: {resp.text[:300]}"
        except Exception as e:
            last_error = str(e)

        if attempt < max_retries:
            wait_time = 3 * attempt
            print(f"  [API Retry] Gemini call attempt {attempt}/{max_retries} failed ({last_error}). Retrying in {wait_time}s...", file=sys.stderr, flush=True)
            time.sleep(wait_time)

    raise RuntimeError(f"Gemini API failed after {max_retries} attempts: {last_error}")








def _call_anthropic(
    prompt: str,
    system: str = "",
    model: str = "claude-sonnet-4-6",
    max_tokens: int = 8000,
    temperature: float = 0.7,
    timeout: int = 600,
) -> str:
    """Call Anthropic Messages API."""
    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    import httpx

    headers = {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": ANTHROPIC_BETA,
        "content-type": "application/json",
    }
    payload = {
        "model": model,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        payload["system"] = system

    resp = httpx.post(
        f"{ANTHROPIC_BASE_URL}/v1/messages",
        headers=headers,
        json=payload,
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()["content"][0]["text"]


def call_llm(
    prompt: str,
    system: str = "",
    model: str = None,
    max_tokens: int = 8000,
    temperature: float = 0.7,
    timeout: int = 600,
) -> str:
    """Dispatch to the selected provider; auto preserves legacy key priority."""
    if PROVIDER == "gemini" or (PROVIDER == "auto" and GEMINI_API_KEY):
        if not GEMINI_API_KEY:
            raise RuntimeError("Google Gemini is selected, but no Gemini API key is configured")
        target_model = model or WRITER_MODEL
        if target_model.lower().startswith("claude"):
            if PROVIDER == "auto":
                target_model = "gemini-2.5-flash"
            else:
                raise RuntimeError("Selected model is not a Gemini model")

        return _call_gemini(
            prompt=prompt,
            system=system,
            model=target_model,
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=timeout,
        )
    elif PROVIDER == "anthropic" or (PROVIDER == "auto" and ANTHROPIC_API_KEY):
        if not ANTHROPIC_API_KEY:
            raise RuntimeError("Anthropic is selected, but no Anthropic API key is configured")
        target_model = model or WRITER_MODEL
        if target_model.lower().startswith("gemini"):
            if PROVIDER == "auto":
                target_model = "claude-sonnet-4-6"
            else:
                raise RuntimeError("Selected model is not an Anthropic model")
        return _call_anthropic(
            prompt=prompt,
            system=system,
            model=target_model,
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=timeout,
        )
    else:
        raise RuntimeError("Neither Gemini nor Anthropic API key is configured")


def call_writer(prompt: str, system: str = "", max_tokens: int = 8000, temperature: float = 0.8, timeout: int = 600) -> str:

    """Call the Writer model (e.g. for drafting, worldbuilding, characters, outline)."""
    return call_llm(
        prompt=prompt,
        system=system,
        model=WRITER_MODEL,
        max_tokens=max_tokens,
        temperature=temperature,
        timeout=timeout,
    )


def call_judge(prompt: str, system: str = "", max_tokens: int = 8000, temperature: float = 0.3, timeout: int = 300) -> str:
    """Call the Judge model (e.g. for evaluation, slop checking, adversarial cuts, tournament)."""
    return call_llm(
        prompt=prompt,
        system=system,
        model=JUDGE_MODEL,
        max_tokens=max_tokens,
        temperature=temperature,
        timeout=timeout,
    )


def call_review(prompt: str, system: str = "", max_tokens: int = 8000, temperature: float = 0.3, timeout: int = 600) -> str:
    """Call the Review model (e.g. for whole-manuscript Phase 3b review)."""
    return call_llm(
        prompt=prompt,
        system=system,
        model=REVIEW_MODEL,
        max_tokens=max_tokens,
        temperature=temperature,
        timeout=timeout,
    )


# Compatibility aliases for legacy names in original scripts
call_opus = call_review
call_claude = call_writer
call_model = call_writer


def clean_json_response(text: str) -> str:
    """Clean markdown code fences and whitespace from JSON response."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```\w*\n?", "", text)
        text = re.sub(r"\n?```$", "", text)
    return text.strip()
