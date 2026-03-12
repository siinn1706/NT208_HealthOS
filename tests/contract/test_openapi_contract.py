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

if hasattr(schemathesis, "from_file"):
    schema = schemathesis.from_file(
        "contracts/openapi/core-api.yaml",
        base_url="http://localhost:8000",
    )
else:
    schema = schemathesis.openapi.from_file("contracts/openapi/core-api.yaml")


@schema.parametrize()
def test_api_matches_spec(case):
    """Each operation in OpenAPI spec must return a valid response."""
    # Skip endpoints requiring auth for now
    response = case.call(base_url="http://localhost:8000")
    case.validate_response(response)
