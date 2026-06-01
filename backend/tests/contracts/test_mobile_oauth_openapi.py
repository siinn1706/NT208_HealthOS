"""Mobile OAuth OpenAPI contract checks."""
from __future__ import annotations


def test_mobile_oauth_handoff_contract_requires_state_and_challenge(committed_contract: dict) -> None:
    schema = committed_contract["components"]["schemas"]["MobileOAuthHandoffBody"]

    assert {"mobile_state", "mobile_code_challenge"}.issubset(set(schema["required"]))
    assert schema["properties"]["mobile_state"]["pattern"] == "^[a-f0-9]+$"
    assert schema["properties"]["mobile_code_challenge"]["pattern"] == "^[a-f0-9]+$"

    request_schema = (
        committed_contract["paths"]["/v1/auth/mobile-oauth/handoff"]["post"]["requestBody"]["content"]["application/json"]["schema"]
    )
    assert request_schema == {"$ref": "#/components/schemas/MobileOAuthHandoffBody"}


def test_mobile_oauth_redeem_contract_requires_state_and_verifier(committed_contract: dict) -> None:
    schema = committed_contract["components"]["schemas"]["MobileOAuthRedeemBody"]

    assert {"code", "state", "code_verifier"}.issubset(set(schema["required"]))
    assert schema["properties"]["state"]["pattern"] == "^[a-f0-9]+$"
    assert schema["properties"]["code_verifier"]["pattern"] == "^[a-f0-9]+$"

    responses = committed_contract["paths"]["/v1/auth/mobile-oauth/redeem"]["post"]["responses"]
    assert responses["403"]["content"]["application/json"]["schema"] == {"$ref": "#/components/schemas/ErrorResponse"}
