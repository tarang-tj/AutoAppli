from typing import Annotated

import jwt
from fastapi import APIRouter, Header

from app.config import get_settings
from app.deps.jobs_auth import decode_supabase_user_sub, jobs_use_supabase

rou