"""Stable error code enum for all ApiException raises.

Backend always returns an English technical message for developer logs.
Clients (mobile/frontend) map error codes to localized user-facing strings
via the api.error.{lowercase_code} i18n key, with fallback to detail.message.
"""

from enum import Enum


class ErrorCode(str, Enum):
    # ── Auth ──────────────────────────────────────────────────────────────
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    ACCOUNT_NOT_FOUND_EMAIL = "ACCOUNT_NOT_FOUND_EMAIL"
    ACCOUNT_DELETED = "ACCOUNT_DELETED"
    UNAUTHORIZED = "UNAUTHORIZED"

    # ── OTP / verification ────────────────────────────────────────────────
    OTP_INVALID = "OTP_INVALID"
    OTP_LOCKED = "OTP_LOCKED"
    OTP_REQUIRED = "OTP_REQUIRED"
    SESSION_EXPIRED = "SESSION_EXPIRED"

    # ── Password ──────────────────────────────────────────────────────────
    PASSWORD_BREACHED = "PASSWORD_BREACHED"

    # ── MFA ───────────────────────────────────────────────────────────────
    MFA_ALREADY_ENABLED = "MFA_ALREADY_ENABLED"
    MFA_NOT_ENABLED = "MFA_NOT_ENABLED"
    MFA_NOT_SETUP = "MFA_NOT_SETUP"
    MFA_STATE_SAVE_FAILED = "MFA_STATE_SAVE_FAILED"
    MFA_STORAGE_MISCONFIGURED = "MFA_STORAGE_MISCONFIGURED"
    MFA_CHALLENGE_INVALID = "MFA_CHALLENGE_INVALID"
    MFA_CHALLENGE_LOCKED = "MFA_CHALLENGE_LOCKED"
    INVALID_TOTP_CODE = "INVALID_TOTP_CODE"

    # ── Conflict ──────────────────────────────────────────────────────────
    EMAIL_TAKEN = "EMAIL_TAKEN"
    USERNAME_TAKEN = "USERNAME_TAKEN"
    CONFLICT = "CONFLICT"

    # ── Not found ─────────────────────────────────────────────────────────
    NOT_FOUND = "NOT_FOUND"

    # ── Permission ────────────────────────────────────────────────────────
    FORBIDDEN = "FORBIDDEN"

    # ── Validation ────────────────────────────────────────────────────────
    VALIDATION_FAILED = "VALIDATION_FAILED"
    INVALID_PREFIX = "INVALID_PREFIX"

    # ── Rate limit ────────────────────────────────────────────────────────
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"

    # ── Admin ─────────────────────────────────────────────────────────────
    ADMIN_CANNOT_BAN_SELF = "ADMIN_CANNOT_BAN_SELF"
    SYSTEM_USER_PROTECTED = "SYSTEM_USER_PROTECTED"

    # ── Subscriptions ─────────────────────────────────────────────────────
    SUBSCRIPTION_PLAN_MISMATCH = "SUBSCRIPTION_PLAN_MISMATCH"
    DEFAULT_SUBSCRIPTION_PLAN_MISSING = "DEFAULT_SUBSCRIPTION_PLAN_MISSING"
    INACTIVE_SUBSCRIPTION_PLAN = "INACTIVE_SUBSCRIPTION_PLAN"
    NO_ACTIVE_SUBSCRIPTION = "NO_ACTIVE_SUBSCRIPTION"

    # ── Upstream / infra ──────────────────────────────────────────────────
    UPSTREAM_ERROR = "UPSTREAM_ERROR"
    ENDPOINT_GONE = "ENDPOINT_GONE"

    # ── Server ────────────────────────────────────────────────────────────
    INTERNAL_ERROR = "INTERNAL_ERROR"
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
