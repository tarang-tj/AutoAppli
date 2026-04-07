from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, Query

from app.config import get_settings
from app.deps.jobs_auth import get_optional_user_id, jobs_use_supabase
from app.models.schemas import JobSearchResult, SearchRequest
from app.repositories import search_supabase
from app.services import scraper_service

router = APIRouter(tags=["search"])
logger = logging.getLogger(__name__)


def _result_payload(r: JobSearchResult) -> dict:
    d = r.model_dump()
    d["snippet"] = d.pop("des