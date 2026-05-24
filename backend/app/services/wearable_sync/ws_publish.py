"""Push a ``vitals.updated`` event to every live socket for a user.

Both wearable ingest paths converge here:

  * Luồng A — mobile-driven Health Connect batch via
    ``POST /v1/devices/{id}/ingest`` (call site:
    ``app.services.health_sync.upsert_batch``).
  * Luồng B — server-side Google Health poll via
    ``app.tasks.sync_wearables.sync_google_health_user``.

The web dashboard subscribes to the existing chat WebSocket and
re-uses ``vitals.updated`` to refresh its time-series charts without a
page reload. Keeping the payload tiny — ``source`` + ``count`` — means
the FE always re-fetches the canonical data from ``/v1/vitals/...``;
we never ship the actual measurement values over the WS so PHI never
goes through the broadcast channel.

Send failures are swallowed: if the user happens to have no live
socket (or the only socket is mid-shutdown), the dashboard will pick
up the new rows on the next refresh anyway. We do NOT want a WS hiccup
to roll back a successful DB transaction.
"""
from __future__ import annotations

import logging
import uuid

from app.services.events import event_emitter

logger = logging.getLogger(__name__)


_EVENT_NAME = "vitals.updated"


async def publish_vitals_updated(
    user_id: uuid.UUID,
    *,
    source: str,
    count: int,
) -> None:
    """Fire-and-forget WS push so the dashboard refreshes in real time.

    ``source`` is one of ``"health_connect"`` or ``"google_health"`` so
    the client can distinguish a mobile-foreground sync (which it
    triggered) from a background poll (which it didn't). ``count`` is
    the number of rows written (inserts + updates), used purely for
    debugging / "synced 12 new records" toasts.
    """
    # Skip work entirely when there's nothing to broadcast — saves a
    # JSON encode + a sweep over the user's connection set for the
    # common "Beat task ran, nothing new" case.
    if count <= 0:
        return

    # Lazy import — `app.ws.handlers` pulls in the FastAPI WebSocket
    # stack, which we don't want loaded by Celery workers that never
    # touch live sockets. Keeps the cold-start of the sync task fast
    # and avoids an import cycle through `app.services.events`.
    from app.ws.handlers import manager

    envelope = event_emitter.emit_to_ws(
        _EVENT_NAME,
        {"source": source, "count": count},
        user_id=user_id,
    )
    try:
        await manager.send_to_user(str(user_id), envelope)
    except Exception:
        # Swallow — WS delivery is best-effort. The DB write that
        # triggered this call already committed, and the dashboard's
        # periodic refresh will eventually catch up.
        logger.exception(
            "vitals.updated push failed for user %s (source=%s)",
            user_id, source,
        )
