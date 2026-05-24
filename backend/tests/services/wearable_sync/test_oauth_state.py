"""Unit tests for the OAuth state signer used by the Google Health flow.

These tests exercise the four failure modes that matter:

  1. Round-trip succeeds when the same session re-presents its state.
  2. A token bound to user A cannot be redeemed by user B (CSRF defence).
  3. A token whose ``exp`` claim has passed is rejected.
  4. A token whose signature was tampered with is rejected.

We don't test against a real Google flow — the state token is opaque to
Google, so the only thing that matters is that ``verify_state`` is the
inverse of ``sign_state`` AND that mismatches blow up clearly.
"""
from __future__ import annotations

import datetime
import uuid

import pytest
from jose import jwt

from app.core.config import settings
from app.services.wearable_sync import oauth_state


def test_sign_verify_roundtrip():
    """Happy path — same user mints and consumes the state."""
    user_id = uuid.uuid4()
    token = oauth_state.sign_state(user_id)
    assert isinstance(token, str) and token
    # Encoded payload should at least contain ``typ=oauth_state``.
    decoded = jwt.decode(
        token,
        settings.secret_key,
        algorithms=[settings.algorithm],
        options={"verify_aud": False, "verify_iss": False},
    )
    assert decoded["typ"] == "oauth_state"
    # Round-trip returns the same UUID.
    assert oauth_state.verify_state(token, expected_user_id=user_id) == user_id


def test_verify_rejects_subject_mismatch():
    """The whole point of the state — user A's token cannot pin a
    Google account onto user B's HealthOS profile."""
    user_a = uuid.uuid4()
    user_b = uuid.uuid4()
    token = oauth_state.sign_state(user_a)
    with pytest.raises(oauth_state.OAuthStateError):
        oauth_state.verify_state(token, expected_user_id=user_b)


def test_verify_rejects_tampered_token():
    """Any single-character change should invalidate the signature."""
    user_id = uuid.uuid4()
    token = oauth_state.sign_state(user_id)
    # Flip the last character of the payload — jose returns segments
    # joined by '.', the last segment is the signature. Mutating the
    # very last character is a tiny but cryptographically meaningful
    # change.
    tampered = token[:-2] + ("A" if token[-2] != "A" else "B") + token[-1]
    with pytest.raises(oauth_state.OAuthStateError):
        oauth_state.verify_state(tampered, expected_user_id=user_id)


def test_verify_rejects_expired_token():
    """A state token older than the configured TTL must be rejected.

    We construct an artificially-old payload directly rather than
    sleeping the test out — same key, same algorithm, but ``exp`` is
    one second ago.
    """
    user_id = uuid.uuid4()
    now = datetime.datetime.now(datetime.timezone.utc)
    expired_payload = {
        "sub": str(user_id),
        "iat": int((now - datetime.timedelta(seconds=120)).timestamp()),
        "exp": int((now - datetime.timedelta(seconds=1)).timestamp()),
        "typ": "oauth_state",
        "nonce": "x" * 16,
    }
    expired_token = jwt.encode(
        expired_payload, settings.secret_key, algorithm=settings.algorithm
    )
    with pytest.raises(oauth_state.OAuthStateError):
        oauth_state.verify_state(expired_token, expected_user_id=user_id)


def test_verify_rejects_wrong_typ():
    """Defence in depth — a regular access token (typ='access') should
    not be accepted as an OAuth state even if it carries the right sub.
    Catches the case where a caller accidentally passes the user's own
    JWT as the state."""
    user_id = uuid.uuid4()
    now = datetime.datetime.now(datetime.timezone.utc)
    fake_access = jwt.encode(
        {
            "sub": str(user_id),
            "iat": int(now.timestamp()),
            "exp": int((now + datetime.timedelta(seconds=300)).timestamp()),
            "typ": "access",  # wrong typ
            "nonce": "x" * 16,
        },
        settings.secret_key,
        algorithm=settings.algorithm,
    )
    with pytest.raises(oauth_state.OAuthStateError):
        oauth_state.verify_state(fake_access, expected_user_id=user_id)


def test_verify_rejects_empty_token():
    """Defence against null state — coercion of None or '' into the
    callback must surface a clean 400 rather than a noisy 500."""
    with pytest.raises(oauth_state.OAuthStateError):
        oauth_state.verify_state("", expected_user_id=uuid.uuid4())


def test_two_signs_for_same_user_produce_distinct_tokens():
    """The ``nonce`` claim makes back-to-back signs distinguishable.

    Same user, same minute → still two unique strings, so Google can't
    cache one and accidentally short-circuit a later attempt.
    """
    user_id = uuid.uuid4()
    a = oauth_state.sign_state(user_id)
    b = oauth_state.sign_state(user_id)
    assert a != b
