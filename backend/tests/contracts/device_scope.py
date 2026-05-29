"""Public-emergency and exact route-drift constants shared across contract tests."""

# Explicitly unauthenticated endpoints (ER QR-scan flow).
PUBLIC_EMERGENCY_PREFIX = "/v1/public/emergency"

# Standard error codes added to contract for documentation completeness.
# FastAPI auto-gen omits these; their presence only in contract is intentional.
CANONICAL_ERROR_CODES: frozenset[str] = frozenset(
    {"400", "401", "403", "404", "409", "422", "429", "500", "503"}
)

# BFF routes that proxy to Core paths not yet implemented in the backend.
# These are documented stubs — BFF calls them but Core returns 404 until shipped.
# Tracked here so they produce a visible warning rather than a test error.
# Remove an entry once the Core endpoint is implemented and appears in the contract.
PENDING_STUB_BFF_PATHS: frozenset[str] = frozenset()

# Existing non-device route drift from admin/chat/subscription work. Exact paths
# only; new undeclared BFF calls still fail this gate.
# TODO(remove by 2026-06-15): replace with committed Core contract entries.
EXACT_BFF_ROUTE_DRIFT_ALLOWLIST: frozenset[str] = frozenset(
    {
        "/v1/admin/overview",
        "/v1/admin/subscription-plans",
        "/v1/admin/subscription-plans/{param}",
        "/v1/admin/users",
        "/v1/admin/users/{param}",
        "/v1/admin/users/{param}/audit",
        "/v1/admin/users/{param}/ban",
        "/v1/admin/users/{param}/subscription",
        "/v1/admin/users/{param}/subscription/history",
        "/v1/admin/users/{param}/unban",
        "/v1/chat/conversations",
        "/v1/chat/conversations/pending",
        "/v1/chat/conversations/{param}/accept",
        "/v1/chat/conversations/{param}/messages",
        "/v1/chat/conversations/{param}/reject",
        "/v1/chat/conversations/{param}/settings",
        "/v1/chat/users/search",
        "/v1/conversations/{param}/leave",
        "/v1/conversations/{param}/members",
        "/v1/conversations/{param}/members/{param}",
        "/v1/conversations/{param}/members/{param}/role",
        "/v1/conversations/{param}/transfer-owner",
    }
)

def is_public_emergency_path(path: str) -> bool:
    return path.startswith(PUBLIC_EMERGENCY_PREFIX)


def is_pending_stub_path(path: str) -> bool:
    return path in PENDING_STUB_BFF_PATHS


def is_allowed_bff_route_drift(path: str) -> bool:
    return path in EXACT_BFF_ROUTE_DRIFT_ALLOWLIST
