"""SEO text generation. AI is used only to rephrase the page's own words; it may not add facts.

Order: configured AI providers, then a rule-based fallback that always works.
"""

import json
import re

import httpx
from django.conf import settings

TITLE_MAX = 60
DESC_MAX = 155
SOURCE_LIMIT = 6000  # characters of the page sent to the AI

PROMPT = (
    "You write search-engine metadata for a web page. Use ONLY facts that appear in the page "
    "text below. Do not add numbers, names, prices, results, awards, years or claims that are "
    "not in the text. Reply with JSON only: "
    '{"title": "...", "description": "..."}. '
    f"The title must be at most {TITLE_MAX} characters, the description between 100 and "
    f"{DESC_MAX} characters. Keep the language of the page.\n\nPAGE TITLE: %s\n\nPAGE TEXT:\n%s"
)


def plain_text(markdown: str) -> str:
    """Markdown -> readable plain text (enough for summaries; not a full parser)."""
    text = re.sub(r"```.*?```", " ", markdown, flags=re.S)
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"^[#>\-*+\d.\s]+", "", text, flags=re.M)
    text = re.sub(r"[*_`~|]", "", text)
    text = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _cut(text: str, limit: int) -> str:
    """Shorten at a word boundary, never mid-word."""
    text = text.strip()
    if len(text) <= limit:
        return text
    cut = text[: limit - 1].rsplit(" ", 1)[0].rstrip(",;:-")
    return cut + "…"


def rule_based(title: str, excerpt: str, body: str) -> dict:
    text = plain_text(body)
    source = excerpt.strip() or text
    return {
        "title": _cut(title, TITLE_MAX),
        "description": _cut(source, DESC_MAX) if source else _cut(title, DESC_MAX),
    }


# --- grounding check ------------------------------------------------------------------
def _numbers(text: str) -> set[str]:
    return set(re.findall(r"\d[\d,.]*\d|\d", text))


def grounded(result: dict, source_text: str) -> bool:
    """Reject output that contains a number the page never mentioned (a classic made-up fact)."""
    return _numbers(result["title"] + " " + result["description"]) <= _numbers(source_text)


def _parse(raw: str) -> dict:
    raw = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip()
    data = json.loads(raw)
    title, desc = str(data["title"]).strip(), str(data["description"]).strip()
    if not title or not desc or len(title) > TITLE_MAX + 10 or len(desc) > DESC_MAX + 15:
        raise ValueError("unusable length")
    return {"title": title, "description": desc}


# --- providers --------------------------------------------------------------------------
def _anthropic(prompt: str) -> str:
    r = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={"x-api-key": settings.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01"},
        json={
            "model": settings.AI_MODELS["anthropic"],
            "max_tokens": 300,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=20.0,
    )
    r.raise_for_status()
    return r.json()["content"][0]["text"]


def _gemini(prompt: str) -> str:
    model = settings.AI_MODELS["gemini"]
    r = httpx.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        headers={"x-goog-api-key": settings.GEMINI_API_KEY},
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=20.0,
    )
    r.raise_for_status()
    return r.json()["candidates"][0]["content"]["parts"][0]["text"]


def _groq(prompt: str) -> str:
    r = httpx.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
        json={
            "model": settings.AI_MODELS["groq"],
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 300,
        },
        timeout=20.0,
    )
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"]


PROVIDERS = {
    "anthropic": (_anthropic, lambda: settings.ANTHROPIC_API_KEY),
    "gemini": (_gemini, lambda: settings.GEMINI_API_KEY),
    "groq": (_groq, lambda: settings.GROQ_API_KEY),
}


def generate(title: str, excerpt: str, body: str) -> dict:
    """Returns {"title", "description", "source": "ai" | "rule"}. Never raises."""
    source_text = f"{title} {excerpt} {plain_text(body)}"
    prompt = PROMPT % (title, f"{excerpt}\n{plain_text(body)}"[:SOURCE_LIMIT])
    for name in settings.AI_PROVIDERS:
        call, key = PROVIDERS.get(name, (None, None))
        if call is None or not key():
            continue
        try:
            result = _parse(call(prompt))
        except Exception:  # noqa: BLE001  any provider/parse failure -> try the next one
            continue
        if grounded(result, source_text):
            return {**result, "source": "ai"}
    return {**rule_based(title, excerpt, body), "source": "rule"}
