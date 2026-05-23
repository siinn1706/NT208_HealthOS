"""Wearable sync services — Google Health (Luồng B) + normalizer.

Luồng A (Health Connect, mobile-driven) does not live here; it goes
through the existing ``services/health_sync.py`` and the
``/v1/devices/{id}/ingest`` endpoint. This package is dedicated to the
server-side OAuth pipeline:

  * ``token_crypto`` — Fernet wrapper for OAuth access/refresh tokens.
  * ``google_health`` — pure-function client over the Google Health
    REST API (build OAuth URL, exchange code, refresh, fetch data,
    revoke).
  * ``normalizer`` — converts a Google Health (or HC) payload into the
    ``HealthIngestBatch`` shape consumed by ``health_sync.upsert_batch``.
"""
