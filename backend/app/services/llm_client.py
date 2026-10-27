import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

logger = logging.getLogger(__name__)
REQUEST_TIMEOUT_SECONDS = 10


@dataclass(frozen=True)
class LLMResult:
    text: str
    used_fallback: bool
    provider: str


def _configured_provider() -> tuple[str, str] | None:
    preferred_provider = os.getenv("LLM_PROVIDER", "").strip().lower()
    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()

    if preferred_provider == "gemini":
        return ("gemini", gemini_key) if gemini_key else None
    if preferred_provider == "groq":
        return ("groq", groq_key) if groq_key else None
    if preferred_provider:
        logger.warning("Unsupported LLM_PROVIDER '%s'; using fallback.", preferred_provider)
        return None
    if gemini_key:
        return "gemini", gemini_key
    if groq_key:
        return "groq", groq_key
    return None


def _post_json(url: str, payload: dict, headers: dict[str, str]) -> dict:
    request = Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    with urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        data = json.loads(response.read().decode("utf-8"))
    if not isinstance(data, dict):
        raise ValueError("LLM provider returned an invalid response")
    return data


def _generate_gemini(prompt: str, api_key: str) -> str:
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{quote(model, safe='')}:generateContent?key={quote(api_key, safe='')}"
    )
    data = _post_json(
        url,
        {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.4, "maxOutputTokens": 500},
        },
        {},
    )
    candidates = data.get("candidates", [])
    parts = candidates[0]["content"]["parts"]
    text = "\n".join(
        part["text"] for part in parts if isinstance(part.get("text"), str)
    ).strip()
    if not text:
        raise ValueError("Gemini returned an empty response")
    return text


def _generate_groq(prompt: str, api_key: str) -> str:
    model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    data = _post_json(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.4,
            "max_tokens": 500,
        },
        {"Authorization": f"Bearer {api_key}"},
    )
    text = data["choices"][0]["message"]["content"]
    if not isinstance(text, str) or not text.strip():
        raise ValueError("Groq returned an empty response")
    return text.strip()


def generate_text(prompt: str, fallback: str) -> LLMResult:
    provider_config = _configured_provider()
    if provider_config is None:
        return LLMResult(
            text=fallback,
            used_fallback=True,
            provider="fallback",
        )

    provider, api_key = provider_config
    try:
        text = (
            _generate_gemini(prompt, api_key)
            if provider == "gemini"
            else _generate_groq(prompt, api_key)
        )
    except (
        HTTPError,
        URLError,
        TimeoutError,
        OSError,
        ValueError,
        KeyError,
        IndexError,
        TypeError,
    ) as error:
        logger.warning(
            "LLM provider %s failed (%s).",
            provider,
            type(error).__name__,
        )
        return LLMResult(
            text=fallback,
            used_fallback=True,
            provider=provider,
        )
    return LLMResult(text=text, used_fallback=False, provider=provider)
