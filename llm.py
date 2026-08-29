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
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR / ".env", override=True)

# API Keys
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
ANTHROPIC_BASE_URL = os.environ.get("AUTONOVEL_API_BASE_URL", "https://api.anthropic.com")
ANTHROPIC_BETA = "context-1m-2025-08-07"

# Default Model Configuration
# When using Gemini, default to gemini-2.5-pro / flash.
# When using Anthropic, default to claude-sonnet-4-6 / opus-4-6.
IS_GEMINI = bool(GEMINI_API_KEY) or not bool(ANTHROPIC_API_KEY)

DEFAULT_WRITER_MODEL = "gemini-2.5-pro" if IS_GEMINI else "claude-sonnet-4-6"
DEFAULT_JUDGE_MODEL = "gemini-2.5-pro" if IS_GEMINI else "claude-sonnet-4-6"
DEFAULT_REVIEW_MODEL = "gemini-2.5-pro" if IS_GEMINI else "claude-opus-4-6"

WRITER_MODEL = os.environ.get("AUTONOVEL_WRITER_MODEL", DEFAULT_WRITER_MODEL)
JUDGE_MODEL = os.environ.get("AUTONOVEL_JUDGE_MODEL", DEFAULT_JUDGE_MODEL)
REVIEW_MODEL = os.environ.get("AUTONOVEL_REVIEW_MODEL", DEFAULT_REVIEW_MODEL)


def _call_gemini(
    prompt: str,
    system: str = "",
    model: str = "gemini-2.5-pro",
    max_tokens: int = 8000,
    temperature: float = 0.7,
    timeout: int = 600,
) -> str:
    """Call Google Gemini API using google-genai SDK or REST fallback."""
    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY not set in .env", file=sys.stderr)
        sys.exit(1)

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=GEMINI_API_KEY)
        config = types.GenerateContentConfig(
            system_instruction=system if system else None,
            temperature=temperature,
            max_output_tokens=max_tokens,
        )
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config,
        )
        if response.text is not None:
            return response.text
        # Fallback if text is empty or filtered
        if response.candidates and response.candidates[0].content:
            parts = response.candidates[0].content.parts
            return "".join(p.text for p in parts if hasattr(p, "text") and p.text)
        return ""
    except Exception as e:
        # Fallback to direct HTTP request using httpx
        import httpx
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
            },
        }
        if system:
            payload["systemInstruction"] = {"parts": [{"text": system}]}

        resp = httpx.post(url, json=payload, timeout=timeout)
        resp.raise_for_status()
        data = resp.json()
        candidates = data.get("candidates", [])
        if candidates and "content" in candidates[0]:
            parts = candidates[0]["content"].get("parts", [])
            return "".join(part.get("text", "") for part in parts)
        raise RuntimeError(f"Gemini API returned unexpected response: {data}")


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
    """Generic LLM call dispatching to Gemini or Anthropic based on available keys."""
    # Determine provider
    if GEMINI_API_KEY:
        target_model = model or WRITER_MODEL
        # Normalize if user had Claude model name in env
        if "claude" in target_model.lower():
            target_model = "gemini-2.5-pro"
        return _call_gemini(
            prompt=prompt,
            system=system,
            model=target_model,
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=timeout,
        )
    elif ANTHROPIC_API_KEY:
        target_model = model or WRITER_MODEL
        if "gemini" in target_model.lower():
            target_model = "claude-sonnet-4-6"
        return _call_anthropic(
            prompt=prompt,
            system=system,
            model=target_model,
            max_tokens=max_tokens,
            temperature=temperature,
            timeout=timeout,
        )
    else:
        print("ERROR: Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is set in .env", file=sys.stderr)
        sys.exit(1)


def call_writer(prompt: str, system: str = "", max_tokens: int = 16000, temperature: float = 0.8, timeout: int = 600) -> str:
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
