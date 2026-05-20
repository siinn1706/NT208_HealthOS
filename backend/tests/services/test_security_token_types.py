from datetime import datetime, timedelta, timezone

import pytest
from jose import JWTError, jwt

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_ws_ticket,
    decode_token_with_type,
)


def test_access_tokens_include_access_type_claim():
    token = create_access_token("00000000-0000-0000-0000-000000000001")
    payload = decode_token_with_type(token, expected_type="access")
    assert payload.get("typ") == "access"


def test_websocket_ticket_is_rejected_by_access_decoder():
    ws_ticket = create_ws_ticket("00000000-0000-0000-0000-000000000001")
    with pytest.raises(JWTError):
        decode_token_with_type(ws_ticket, expected_type="access", allow_legacy_access=False)


def test_access_token_is_rejected_by_ws_decoder():
    token = create_access_token("00000000-0000-0000-0000-000000000001")
    with pytest.raises(JWTError):
        decode_token_with_type(token, expected_type="ws_ticket", allow_legacy_access=False)


def test_legacy_access_token_without_type_is_temporarily_accepted():
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "00000000-0000-0000-0000-000000000001",
        "iat": now,
        "exp": now + timedelta(minutes=5),
        "jti": "legacy-token",
    }
    legacy_token = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    decoded = decode_token_with_type(legacy_token, expected_type="access", allow_legacy_access=True)
    assert decoded.get("sub") == payload["sub"]
