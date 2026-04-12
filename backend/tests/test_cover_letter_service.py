"""Tests for the cover letter generation service."""

import pytest

from app.services.cover_letter_service import generate_cover_letter, TONE_OPTIONS


@pytest.mark.asyncio
async def test_generate_cover_letter_with_defaults():
    """Test generating a cover letter with default parameters."""
    result = await generate_cover_letter()

    assert "id" in result
    assert result["id"].startswith("cl-")
    assert "content" in result
    assert len(result["content"]) > 0
    assert result["tone"] == "professional"
    assert "created_at" in result


@pytest.mark.asyncio
async def test_generate_cover_letter_with_all_fields():
    """Test generating a cover letter with all fields specified."""
    result = await generate_cover_letter(
        job_title="Senior Data Engineer",
        company="Databricks",
        job_description="Lead data engineering initiatives...",
        resume_text="10 years of experience in data engineering",
        tone="enthusiastic",
        instructions="Emphasize leadership experience",
    )

    assert "id" in result
    assert result["tone"] == "enthusiastic"
    assert "content" in result
    assert len(result["content"]) > 0
    assert "created_at" in result


@pytest.mark.asyncio
@pytest.mark.parametrize("tone", TONE_OPTIONS)
async def test_generate_cover_letter_all_tones(tone: str):
    """Test generating cover letters with all available tone options."""
    result = await generate_cover_letter(
        job_title="Software Engineer",
        company="Tech Company",
        tone=tone,
    )

    assert result["tone"] == tone
    assert "content" in result
    assert len(result["content"]) > 0


@pytest.mark.asyncio
async def test_generate_cover_letter_template_mode():
    """Test that cover letter generation works without API key."""
    result = await generate_cover_letter(
        job_title="Data Scientist",
        company="Google",
        tone="formal",
    )

    # Should still return valid structure
    assert result["id"].startswith("cl-")
    assert result["tone"] == "formal"
    assert "content" in result
    assert len(result["content"]) > 100  # Should have reasonable content


@pytest.mark.asyncio
async def test_generate_cover_letter_with_special_instructions():
    """Test generating a cover letter with special instructions."""
    result = await generate_cover_letter(
        job_title="Product Manager",
        company="Stripe",
        job_description="Lead product strategy for payment processing",
        instructions="Focus on experience with fintech and fraud detection",
        tone="professional",
    )

    assert "Product Manager" not in result["id"]  # ID should be independent
    assert result["tone"] == "professional"
    assert "content" in result


@pytest.mark.asyncio
async def test_generate_cover_letter_empty_fields():
    """Test that cover letter generation handles empty fields gracefully."""
    result = await generate_cover_letter(
        job_title="",
        company="",
        job_description="",
        resume_text="",
    )

    # Should still generate valid content
    assert "id" in result
    assert result["id"].startswith("cl-")
    assert "content" in result
    assert len(result["content"]) > 0
