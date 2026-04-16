"""
Contract tests — validate Core BE responses against OpenAPI spec.
Uses schemathesis for fuzz/property-based testing against the spec.

Run:
  schemathesis run contracts/openapi/core-api.yaml --base-url=http://localhost:8000

Or with pytest:
  pytest tests/contract/ -v
"""
import pytest
import schemathesis

if hasattr(schemathesis.openapi, "from_path"):
    schema = schemathesis.openapi.from_path("contracts/openapi/core-api.yaml")
elif hasattr(schemathesis, "from_file"):
    with open("contracts/openapi/core-api.yaml", encoding="utf-8") as f:
        schema = schemathesis.from_file(
            f,
            base_url="http://localhost:8000",
        )
else:
    with open("contracts/openapi/core-api.yaml", encoding="utf-8") as f:
        schema = schemathesis.openapi.from_file(f)


@schema.parametrize()
def test_api_matches_spec(case):
    """Each operation in OpenAPI spec must return a valid response."""
    # Skip endpoints requiring auth for now
    security_params = getattr(case.operation.security, "_parameters", [])
    if security_params:
        pytest.skip("Auth-protected endpoint is skipped in anonymous contract run")

    # These public auth endpoints are non-deterministic for fuzzed anonymous runs:
    # - login/check-email can be throttled or accept duplicate query keys differently.
    # - OTP endpoints have side effects (mail/redis) and can trigger infra-dependent 5xx.
    # Keep them covered via dedicated integration tests instead.
    volatile_anonymous_ops = {
        ("POST", "/v1/auth/login"),
        ("GET", "/v1/auth/check-email"),
        ("POST", "/v1/auth/request-otp"),
        ("POST", "/v1/auth/verify-otp"),
        ("POST", "/v1/auth/reset-password"),
    }
    op_key = (case.method.upper(), case.operation.path)
    if op_key in volatile_anonymous_ops:
        pytest.skip(f"Volatile anonymous contract endpoint skipped: {op_key[0]} {op_key[1]}")

    response = case.call(base_url="http://localhost:8000")
    case.validate_response(response)
