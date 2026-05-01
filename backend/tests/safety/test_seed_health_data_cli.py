from __future__ import annotations

import ast
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "seed_health_data.py"
TREE = ast.parse(SOURCE.read_text(encoding="utf-8"))


def _function_names() -> set[str]:
    return {node.name for node in TREE.body if isinstance(node, ast.FunctionDef)}


def _assignment_value(name: str):
    for node in TREE.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == name:
                    return ast.literal_eval(node.value)
        if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
            if node.target.id == name:
                return ast.literal_eval(node.value)
    raise AssertionError(f"{name} not assigned")


def test_seed_script_exposes_cli_and_safety_helpers():
    expected = {
        "parse_args",
        "seed_key",
        "is_reset_database_allowed",
        "guard_writes_allowed",
    }
    assert expected.issubset(_function_names())


def test_seed_script_declares_tag_domains_and_scenarios():
    assert _assignment_value("SEED_TAG") == "healthos.seed_health_data.v2"
    assert _assignment_value("SCENARIOS") == (
        "baseline",
        "active",
        "risk",
        "med-heavy",
    )
    domains = _assignment_value("ALL_DOMAINS")

    assert "vitals" in domains
    assert "meals" in domains
    assert "medications" in domains
    assert "devices" in domains
    assert "chat" not in domains
    assert "profile" not in domains
    assert "labs" not in domains


def test_seed_script_has_no_chat_or_profile_model_imports():
    source = SOURCE.read_text(encoding="utf-8")
    forbidden = [
        "Conversation",
        "Message",
        "MessageReceipt",
        "UserProfile",
        "UserPreference",
        "EmergencyProfile",
    ]
    for token in forbidden:
        assert token not in source


def test_seed_script_guards_both_production_envs():
    source = SOURCE.read_text(encoding="utf-8")

    assert 'os.environ.get("APP_ENV")' in source
    assert 'os.environ.get("NODE_ENV")' in source
    assert '"production" in envs' in source
