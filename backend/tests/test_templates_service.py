"""Tests for templates service."""
import pytest
from app.services.templates_service import (
    make_template,
    render_template,
    TEMPLATE_CATEGORIES,
)


def test_template_has_required_fields():
    """Template should have all required fields."""
    t = make_template(
        user_id="user-1",
        name="My Template",
        template_type="resume",
        content="Hello {{name}}",
        category="tech",
        is_default=True,
    )

    assert t["id"].startswith("tpl-")
    assert t["user_id"] == "user-1"
    assert t["name"] == "My Template"
    assert t["template_type"] == "resume"
    assert t["content"] == "Hello {{name}}"
    assert t["category"] == "tech"
    assert t["is_default"] is True
    assert t["created_at"]
    assert t["updated_at"]


def test_template_custom_fields():
    """Template should accept only expected fields."""
    t = make_template(
        name="Test",
        template_type="cover_letter",
        category="finance",
    )
    assert t["template_type"] == "cover_letter"
    assert t["category"] == "finance"
    assert t["is_default"] is False
    assert t["content"] == ""


def test_template_unique_ids():
    """Each template should get a unique ID."""
    t1 = make_template(name="Template 1")
    t2 = make_template(name="Template 2")
    assert t1["id"] != t2["id"]
    assert t1["id"].startswith("tpl-")
    assert t2["id"].startswith("tpl-")


def test_render_template_basic():
    """Should replace placeholders with provided variables."""
    template = {
        "content": "Hello {{name}}, welcome to {{company}}! You're applying for {{role}}."
    }
    variables = {
        "name": "Alice",
        "company": "Stripe",
        "role": "Senior Engineer",
    }
    result = render_template(template, variables)
    assert result == "Hello Alice, welcome to Stripe! You're applying for Senior Engineer."


def test_render_template_missing_var():
    """Missing variables should be left as placeholders."""
    template = {"content": "Name: {{name}}, Email: {{email}}"}
    variables = {"name": "Bob"}
    result = render_template(template, variables)
    assert "Bob" in result
    assert "{{email}}" in result


def test_render_template_extra_vars():
    """Extra variables should be ignored."""
    template = {"content": "Hello {{name}}"}
    variables = {"name": "Carol", "extra": "data", "unused": "field"}
    result = render_template(template, variables)
    assert result == "Hello Carol"


def test_categories_dict():
    """TEMPLATE_CATEGORIES should contain expected keys."""
    assert "tech" in TEMPLATE_CATEGORIES
    assert "finance" in TEMPLATE_CATEGORIES
    assert "general" in TEMPLATE_CATEGORIES
    assert "creative" in TEMPLATE_CATEGORIES
    assert TEMPLATE_CATEGORIES["tech"] == "Technology"
    assert TEMPLATE_CATEGORIES["finance"] == "Finance"


def test_template_default_values():
    """Template should have sensible defaults."""
    t = make_template()
    assert t["name"] == ""
    assert t["template_type"] == "resume"
    assert t["content"] == ""
    assert t["category"] == "general"
    assert t["is_default"] is False
