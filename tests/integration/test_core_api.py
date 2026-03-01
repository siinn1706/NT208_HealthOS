"""Integration tests for Core BE /health endpoint."""
import pytest
import httpx

BASE_URL = "http://localhost:8000"


@pytest.mark.asyncio
async def test_health_endpoint():
    """Core BE health check should return 200 with status: ok."""
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_unauthorized_without_token():
    """Protected endpoints should return 401 without a token."""
    async with httpx.AsyncClient(base_url=BASE_URL) as client:
        response = await client.get("/v1/users/me")
    assert response.status_code == 401
