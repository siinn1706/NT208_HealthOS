from pathlib import Path


def test_ai_chat_stream_uses_migrated_worker_stream_endpoint() -> None:
    service_path = Path(__file__).resolve().parents[2] / "app" / "services" / "ai_chat_stream.py"
    source = service_path.read_text(encoding="utf-8")

    assert "/api/ai/chat/stream" in source
    assert "generate-stream" not in source


def test_ai_chat_stream_checks_emergency_before_worker_stream() -> None:
    service_path = Path(__file__).resolve().parents[2] / "app" / "services" / "ai_chat_stream.py"
    source = service_path.read_text(encoding="utf-8")

    safety_index = source.index("classify_by_rules(prompt)")
    worker_index = source.index("_upstream_token_stream(prompt, user_id, locale)")
    assert safety_index < worker_index
    assert "build_emergency_reply" in source
    assert "assistant_sender_id" in source
    assert "broadcast_message(msg_dto)" in source
    assert "build_system_prompt(locale)" in source


def test_ws_router_classifies_emergency_before_ai_rate_limit() -> None:
    router_path = Path(__file__).resolve().parents[2] / "app" / "ws" / "chat_router.py"
    source = router_path.read_text(encoding="utf-8")

    classify_index = source.index("is_emergency_message =")
    rate_limit_index = source.index("get_rate_limiter().allow")
    assert classify_index < rate_limit_index
    assert "not is_emergency_message" in source
