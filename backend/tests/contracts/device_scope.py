"""Device-scope and public-emergency path constants shared across contract tests."""

# Device endpoints are frozen this pass — excluded from drift assertions.
# Detection by PATH-PREFIX, not tag strings (runtime uses TitleCase 'Devices').
DEVICE_PATH_PREFIXES: tuple[str, ...] = ("/v1/devices", "/v1/wearables", "/v1/sync")

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


def is_device_path(path: str) -> bool:
    return any(path.startswith(p) for p in DEVICE_PATH_PREFIXES)


def is_public_emergency_path(path: str) -> bool:
    return path.startswith(PUBLIC_EMERGENCY_PREFIX)


def is_pending_stub_path(path: str) -> bool:
    return path in PENDING_STUB_BFF_PATHS
