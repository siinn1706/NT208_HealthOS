"""Users endpoints — placeholder."""
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me")
async def get_current_user() -> dict:
    """
    TODO:
      1. Extract JWT from Authorization header (Depends(get_current_user_dep))
      2. Load user from DB via UserService
      3. Return UserResponse schema
    """
    raise HTTPException(status_code=401, detail={"code": "AUTH_REQUIRED", "message": "Not implemented yet."})
