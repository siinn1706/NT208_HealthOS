from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/ai")


class AIGenerateRequest(BaseModel):
    user_id: str
    message: str
    history: list[dict] = []


class AIGenerateResponse(BaseModel):
    reply: str


@router.post("/generate", response_model=AIGenerateResponse)
async def generate_ai_reply(payload: AIGenerateRequest) -> AIGenerateResponse:
    return AIGenerateResponse(reply=f"Bác sĩ ảo đang xử lý: {payload.message}")
