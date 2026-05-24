import pytest
from fastapi import status

from app.api.v1.endpoints.auth import check_password_breach_endpoint
from app.exceptions import ApiException


@pytest.mark.asyncio
async def test_check_password_breach_returns_410() -> None:
    with pytest.raises(ApiException) as exc_info:
        await check_password_breach_endpoint()

    exc = exc_info.value
    assert exc.status_code == status.HTTP_410_GONE
    assert exc.detail["code"] == "ENDPOINT_GONE"
    assert "range" in exc.detail["message"].lower()
