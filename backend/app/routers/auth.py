from fastapi import APIRouter

router = APIRouter(tags=["auth"])


@router.get("/auth/me")
async def get_me():
    return {"user": None, "message": "Auth not configured - running in local mode"}
