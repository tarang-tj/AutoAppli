from __future__ import annotations

import anthropic

from app.config import get_settings

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        settings = get_settings()
        if not settings.ANTHROPIC_API_KEY:
            raise RuntimeError(
                "ANTHROPIC_API_KEY is not set. Add it to backend/.env (see .env.example)."
            )
        _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


async def generate_text(
    *,
    system: str,
    user_message: str,
    max_tokens: int = 4096,
    temperature: float = 0.7,
) -> str:
    """Send a single-turn message to Claude and return the assistant text."""
    settings = get_settings()
    client = _get_client()
    message = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user_message}],
        temperature=temperature,
    )
    block = message.content[0]
    if block.type != "text":
        raise RuntimeError("Unexpected Claude response block type")
    return block.text
