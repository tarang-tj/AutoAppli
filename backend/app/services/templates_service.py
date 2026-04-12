"""Document templates — save and reuse cover letter & resume templates."""
from __future__ import annotations

import uuid
import re
from datetime import datetime, timezone


TEMPLATE_CATEGORIES = {
    "tech": "Technology",
    "finance": "Finance",
    "general": "General",
    "creative": "Creative",
}


def make_template(
    *,
    user_id: str | None = None,
    name: str = "",
    template_type: str = "resume",
    content: str = "",
    category: str = "general",
    is_default: bool = False,
) -> dict:
    """Create a template dict with UUID, metadata, and timestamps."""
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": f"tpl-{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "name": name,
        "template_type": template_type,
        "content": content,
        "category": category,
        "is_default": is_default,
        "created_at": now,
        "updated_at": now,
    }


def render_template(template: dict, variables: dict[str, str]) -> str:
    """Replace {{key}} placeholders in template content with variable values.

    Missing variables are left as-is.
    Extra variables are ignored.
    """
    content = template.get("content", "")

    # Find all {{key}} patterns
    placeholders = re.findall(r"\{\{([^}]+)\}\}", content)

    # Replace each placeholder that has a value
    for key in placeholders:
        if key in variables:
            value = str(variables[key])
            content = content.replace(f"{{{{{key}}}}}", value)

    return content
