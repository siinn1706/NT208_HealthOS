"""Contract checks for chat image attachment upload."""
from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.api.v1.endpoints import conversations as conv_ep
from app.core.security import get_current_user
from app.main import app


PNG_BYTES = b"\x89PNG\r\n\x1a\n" + (b"\x00" * 32)


@pytest_asyncio.fixture
async def authed_client():
    fake_user = type(
        "User",
        (),
        {"id": uuid.uuid4(), "email": "chat-upload@local", "hashed_password": "x"},
    )()

    async def override_current_user():
        return fake_user

    app.dependency_overrides[get_current_user] = override_current_user
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, fake_user
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_upload_chat_image_returns_attachment_metadata(authed_client, monkeypatch):
    client, fake_user = authed_client
    captured: dict[str, object] = {}

    def fake_upload_file(*, bucket: str, key: str, file_bytes: bytes, content_type: str):
        captured.update({
            "bucket": bucket,
            "key": key,
            "file_bytes": file_bytes,
            "content_type": content_type,
        })
        return f"http://storage.local/{bucket}/{key}"

    monkeypatch.setattr(conv_ep, "upload_file", fake_upload_file)

    res = await client.post(
        "/v1/conversations/uploads/image",
        files={"image": ("chat.png", PNG_BYTES, "image/png")},
    )

    assert res.status_code == 201
    payload = res.json()["data"]
    assert payload["url"].startswith("http://storage.local/")
    assert payload["name"] == "chat.png"
    assert payload["size"] == len(PNG_BYTES)
    assert payload["mime_type"] == "image/png"
    assert captured["content_type"] == "image/png"
    assert captured["file_bytes"] == PNG_BYTES
    assert str(fake_user.id) in str(captured["key"])


@pytest.mark.asyncio
async def test_upload_chat_image_rejects_unsupported_bytes(authed_client):
    client, _fake_user = authed_client

    res = await client.post(
        "/v1/conversations/uploads/image",
        files={"image": ("chat.txt", b"not an image", "text/plain")},
    )

    assert res.status_code == 415
    body = res.json()
    error_payload = body.get("detail", body)
    assert error_payload["error"]["code"] == "UNSUPPORTED_MEDIA_TYPE"


@pytest.mark.asyncio
async def test_upload_chat_image_rejects_empty_file(authed_client):
    client, _fake_user = authed_client

    res = await client.post(
        "/v1/conversations/uploads/image",
        files={"image": ("empty.png", b"", "image/png")},
    )

    assert res.status_code == 400
    body = res.json()
    error_payload = body.get("detail", body)
    assert error_payload["error"]["code"] == "EMPTY_FILE"
