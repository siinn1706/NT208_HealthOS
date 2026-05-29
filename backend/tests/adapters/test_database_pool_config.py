from __future__ import annotations

from types import SimpleNamespace

from sqlalchemy.pool import NullPool

from app.adapters.database import _build_async_engine_options


def test_debug_true_keeps_async_pooling_enabled_by_default():
    options = _build_async_engine_options(
        SimpleNamespace(debug=True, db_disable_pool=False),
    )

    assert options["echo"] is True
    assert options["pool_pre_ping"] is True
    assert options["pool_recycle"] == 300
    assert options["pool_size"] == 20
    assert options["max_overflow"] == 10
    assert "poolclass" not in options


def test_db_disable_pool_uses_null_pool_without_pool_size_options():
    options = _build_async_engine_options(
        SimpleNamespace(debug=False, db_disable_pool=True),
    )

    assert options["echo"] is False
    assert options["pool_pre_ping"] is True
    assert options["pool_recycle"] == 300
    assert options["poolclass"] is NullPool
    assert "pool_size" not in options
    assert "max_overflow" not in options
