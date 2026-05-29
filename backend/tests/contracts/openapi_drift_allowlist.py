"""Exact temporary OpenAPI drift allowlist for the Core contract gate."""

# Current live-vs-committed Core OpenAPI drift from admin/chat/subscription work.
# Exact category/method/path/detail entries only; new drift still fails the gate.
# TODO(remove by 2026-06-15): regenerate or manually commit these Core contract entries.
EXACT_OPENAPI_DRIFT_ALLOWLIST: frozenset[tuple[str, str, str, str]] = frozenset(
    {
        ("missing-in-contract", "get", "/v1/admin/overview", "Present in runtime, absent in contract"),
        ("missing-in-contract", "get", "/v1/admin/subscription-plans", "Present in runtime, absent in contract"),
        ("missing-in-contract", "post", "/v1/admin/subscription-plans", "Present in runtime, absent in contract"),
        (
            "missing-in-contract",
            "patch",
            "/v1/admin/subscription-plans/{plan_id}",
            "Present in runtime, absent in contract",
        ),
        ("missing-in-contract", "get", "/v1/admin/users", "Present in runtime, absent in contract"),
        ("missing-in-contract", "get", "/v1/admin/users/{user_id}", "Present in runtime, absent in contract"),
        ("missing-in-contract", "post", "/v1/admin/users/{user_id}/ban", "Present in runtime, absent in contract"),
        (
            "missing-in-contract",
            "get",
            "/v1/admin/users/{user_id}/subscription",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "patch",
            "/v1/admin/users/{user_id}/subscription",
            "Present in runtime, absent in contract",
        ),
        ("missing-in-contract", "post", "/v1/admin/users/{user_id}/unban", "Present in runtime, absent in contract"),
        (
            "shape-mismatch",
            "post",
            "/v1/auth/check-password-breach",
            "Response shape differs: live-only status codes ['200']",
        ),
        ("missing-in-contract", "get", "/v1/chat/conversations", "Present in runtime, absent in contract"),
        ("missing-in-contract", "post", "/v1/chat/conversations", "Present in runtime, absent in contract"),
        ("missing-in-contract", "get", "/v1/chat/conversations/pending", "Present in runtime, absent in contract"),
        (
            "missing-in-contract",
            "get",
            "/v1/chat/conversations/{conversation_id}",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "post",
            "/v1/chat/conversations/{conversation_id}/accept",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "get",
            "/v1/chat/conversations/{conversation_id}/messages",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "post",
            "/v1/chat/conversations/{conversation_id}/messages",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "delete",
            "/v1/chat/conversations/{conversation_id}/messages/{message_id}",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "patch",
            "/v1/chat/conversations/{conversation_id}/messages/{message_id}",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "delete",
            "/v1/chat/conversations/{conversation_id}/messages/{message_id}/pin",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "post",
            "/v1/chat/conversations/{conversation_id}/messages/{message_id}/pin",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "post",
            "/v1/chat/conversations/{conversation_id}/messages/{message_id}/reactions",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "get",
            "/v1/chat/conversations/{conversation_id}/pinned",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "post",
            "/v1/chat/conversations/{conversation_id}/read",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "post",
            "/v1/chat/conversations/{conversation_id}/reject",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "patch",
            "/v1/chat/conversations/{conversation_id}/settings",
            "Present in runtime, absent in contract",
        ),
        ("missing-in-contract", "get", "/v1/chat/users/search", "Present in runtime, absent in contract"),
        (
            "missing-in-contract",
            "patch",
            "/v1/conversations/{conversation_id}",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "post",
            "/v1/conversations/{conversation_id}/leave",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "post",
            "/v1/conversations/{conversation_id}/members",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "delete",
            "/v1/conversations/{conversation_id}/members/{user_id}",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "post",
            "/v1/conversations/{conversation_id}/members/{user_id}/role",
            "Present in runtime, absent in contract",
        ),
        (
            "missing-in-contract",
            "post",
            "/v1/conversations/{conversation_id}/transfer-owner",
            "Present in runtime, absent in contract",
        ),
        ("missing-in-contract", "get", "/v1/subscription-plans", "Present in runtime, absent in contract"),
        ("missing-in-contract", "get", "/v1/subscription/me", "Present in runtime, absent in contract"),
    }
)


def is_allowed_openapi_drift(category: str, path: str, method: str, detail: str) -> bool:
    return (category, method.lower(), path, detail) in EXACT_OPENAPI_DRIFT_ALLOWLIST
