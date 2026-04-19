"""B7 review — Prometheus counters / histograms for the destructive flows.

Why a dedicated module rather than scattering `Counter(...)` calls into the
service files: the metric definitions need to be created exactly once per
process; importing this module is the side-effect that registers them.
Service code calls the small wrapper functions, which keeps the prometheus
import contained and lets us no-op cleanly when the library is absent
(tests, minimal dev installs).

Naming convention: `b7_<surface>_<thing>_total` for counters,
`b7_<surface>_seconds` for latency histograms — consistent with the B7
review §D recommendations.
"""
from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Iterator

logger = logging.getLogger(__name__)


try:
    from prometheus_client import Counter, Histogram

    _PROMETHEUS_AVAILABLE = True
except ImportError:  # pragma: no cover — exercised only on minimal installs
    _PROMETHEUS_AVAILABLE = False

    class _NoopMetric:
        """Stand-in for Counter/Histogram when prometheus_client is missing.

        Accepts the same `(name, documentation, labelnames=..., buckets=...)`
        constructor signature so module-level definitions don't need a guard.
        Every call (`labels`, `inc`, `observe`, `time`) is a no-op.
        """

        def __init__(self, *_args, **_kwargs) -> None:  # noqa: D401
            return None

        def labels(self, **_kwargs):  # noqa: D401
            return self

        def inc(self, *_args, **_kwargs):  # noqa: D401
            return None

        def observe(self, *_args, **_kwargs):  # noqa: D401
            return None

        def time(self):  # noqa: D401
            from contextlib import nullcontext

            return nullcontext()

    Counter = Histogram = _NoopMetric  # type: ignore[assignment,misc]


# ── Counters ──────────────────────────────────────────────────────────────

# B7 review — POST /v1/meals idempotency outcome distribution. Lets ops
# spot a sudden spike of REPLAY (someone hammering retries) or CONFLICT
# (a peer worker stuck/crashed). Labels stay coarse to keep cardinality low.
B7_IDEMPOTENCY_REPLAYS = Counter(
    "b7_idempotency_replays_total",
    "Idempotency-Key acquire_or_wait outcomes by scope and result.",
    labelnames=("scope", "outcome"),
)

# B7 review — Reminder firing job. `result` ∈ {claimed, fired, skipped, error}.
B7_REMINDER_FIRES = Counter(
    "b7_reminder_fires_total",
    "Reminder occurrence firing outcomes.",
    labelnames=("result",),
)

# B7 review — Account purge counter. `result` ∈ {purged, skipped}.
B7_ACCOUNT_PURGED = Counter(
    "b7_account_purged_total",
    "Hard-purge outcomes from the daily Celery beat.",
    labelnames=("result",),
)

# B7 review — Export blob bytes (sum of cleaned-up storage from janitor +
# user purge). Useful for capacity planning and verifying the lifecycle hygiene.
B7_EXPORT_BLOB_BYTES = Counter(
    "b7_export_blob_bytes_total",
    "Bytes deleted by the export-blob janitor or user purge.",
    labelnames=("source",),  # data_export | report_pdf | account_purge
)

# Health Connect ingest outcome distribution. `outcome` ∈ {ok, partial,
# error, replay}. Lets ops spot a sudden spike in `partial` (a misbehaving
# source app sending bad data) or `error` (Core BE / DB pressure).
B7_HEALTH_SYNC_OUTCOMES = Counter(
    "b7_health_sync_outcomes_total",
    "Health Connect ingest outcomes by record-type and result.",
    labelnames=("provider", "outcome"),
)


# ── Histograms ────────────────────────────────────────────────────────────

# B7 review — PDF render duration. WeasyPrint cold-start can dominate the
# first request; this histogram lets ops verify the warm-worker SLO.
B7_PDF_RENDER_SECONDS = Histogram(
    "b7_pdf_render_seconds",
    "Seconds spent rendering a HealthReport PDF (Jinja + WeasyPrint).",
    buckets=(0.5, 1, 2, 5, 10, 30, 60),
)


# ── Public helpers ────────────────────────────────────────────────────────


def record_idempotency_outcome(scope: str, outcome: str) -> None:
    """`outcome` should be one of: own | replay | conflict."""
    try:
        B7_IDEMPOTENCY_REPLAYS.labels(scope=scope, outcome=outcome).inc()
    except Exception:  # pragma: no cover — metrics must never break the request
        logger.debug("Failed to record idempotency metric", exc_info=True)


def record_reminder_fire(result: str) -> None:
    """`result` should be one of: claimed | fired | skipped | error."""
    try:
        B7_REMINDER_FIRES.labels(result=result).inc()
    except Exception:  # pragma: no cover
        logger.debug("Failed to record reminder fire metric", exc_info=True)


def record_account_purge(result: str) -> None:
    """`result` should be one of: purged | skipped."""
    try:
        B7_ACCOUNT_PURGED.labels(result=result).inc()
    except Exception:  # pragma: no cover
        logger.debug("Failed to record account purge metric", exc_info=True)


def record_export_blob_bytes(source: str, bytes_deleted: int) -> None:
    if bytes_deleted <= 0:
        return
    try:
        B7_EXPORT_BLOB_BYTES.labels(source=source).inc(bytes_deleted)
    except Exception:  # pragma: no cover
        logger.debug("Failed to record export blob bytes", exc_info=True)


def record_health_sync_outcome(provider: str, outcome: str) -> None:
    """`outcome` should be one of: ok | partial | error | replay."""
    try:
        B7_HEALTH_SYNC_OUTCOMES.labels(provider=provider, outcome=outcome).inc()
    except Exception:  # pragma: no cover
        logger.debug("Failed to record health sync outcome", exc_info=True)


@contextmanager
def time_pdf_render() -> Iterator[None]:
    """Context manager used inside the WeasyPrint task to time renders."""
    if not _PROMETHEUS_AVAILABLE:
        yield
        return
    with B7_PDF_RENDER_SECONDS.time():
        yield
