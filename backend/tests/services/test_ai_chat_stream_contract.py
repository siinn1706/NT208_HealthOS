from pathlib import Path


def test_ai_chat_stream_uses_migrated_worker_stream_endpoint() -> None:
    service_path = Path(__file__).resolve().parents[2] / "app" / "services" / "ai_chat_stream.py"
    source = service_path.read_text(encoding="utf-8")

    assert "/api/ai/chat/stream" in source
    assert "generate-stream" not in source
