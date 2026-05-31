"""Object Storage adapter — MinIO / AWS S3 via boto3.

B7 standardizes the signed URL surface area: short-lived GET / PUT helpers,
optional `Content-Disposition`/`Content-Type` overrides, and a SHA-256 utility
shared by the prescription, export, and PDF pipelines.
"""
from __future__ import annotations

import hashlib
import logging
from typing import Optional

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


# Default expiry windows (seconds). Short-lived URLs are the safer default for
# anything that touches PHI; long expiries should be opted in explicitly.
DEFAULT_GET_EXPIRY_S = 300       # 5 minutes — prescription assets, report PDFs.
DEFAULT_PUT_EXPIRY_S = 600       # 10 minutes — single-shot upload window.
DEFAULT_EXPORT_EXPIRY_S = 300    # 5 minutes — re-issued each click.
PROTECTED_BUCKET_AUTOCREATE_ENVS = {"production", "staging"}


def _client_error_code(exc: ClientError) -> str:
    return str(exc.response.get("Error", {}).get("Code", ""))


def _is_missing_bucket_error(exc: ClientError) -> bool:
    return _client_error_code(exc) in {"NoSuchBucket", "404", "NotFound"}


def _can_auto_create_bucket() -> bool:
    runtime_env = settings.resolved_runtime_env()
    return runtime_env not in PROTECTED_BUCKET_AUTOCREATE_ENVS


def _create_bucket_for_dev(client, bucket: str) -> None:
    """Create local/dev buckets on demand; production storage must be provisioned."""
    try:
        client.create_bucket(Bucket=bucket)
    except ClientError as exc:
        if _client_error_code(exc) in {"BucketAlreadyOwnedByYou", "BucketAlreadyExists"}:
            return
        raise


def get_storage_client():
    """Return a boto3 S3 client pointed at MinIO (local) or S3 (prod)."""
    return boto3.client(
        "s3",
        endpoint_url=settings.storage_endpoint if not settings.storage_use_ssl else None,
        aws_access_key_id=settings.storage_access_key,
        aws_secret_access_key=settings.storage_secret_key,
        config=Config(signature_version="s3v4"),
        use_ssl=settings.storage_use_ssl,
    )


def upload_file(
    bucket: str,
    key: str,
    file_bytes: bytes,
    content_type: str = "image/jpeg",
) -> str:
    """Upload bytes to object storage. Returns public URL.

    Note: the returned URL is only a stable identifier; consumers requiring
    confidentiality should use `get_presigned_get_url()` instead.
    """
    client = get_storage_client()
    try:
        client.put_object(Bucket=bucket, Key=key, Body=file_bytes, ContentType=content_type)
    except ClientError as exc:
        if _is_missing_bucket_error(exc) and _can_auto_create_bucket():
            logger.warning("Storage bucket %s missing; creating for local/dev runtime", bucket)
            try:
                _create_bucket_for_dev(client, bucket)
                client.put_object(Bucket=bucket, Key=key, Body=file_bytes, ContentType=content_type)
            except Exception as retry_exc:
                logger.exception("Failed to upload file to %s/%s", bucket, key)
                raise RuntimeError(f"File upload failed: {retry_exc}") from retry_exc
        else:
            logger.exception("Failed to upload file to %s/%s", bucket, key)
            raise RuntimeError(f"File upload failed: {exc}") from exc
    except Exception as exc:
        logger.exception("Failed to upload file to %s/%s", bucket, key)
        raise RuntimeError(f"File upload failed: {exc}") from exc
    return f"{settings.storage_endpoint}/{bucket}/{key}"


def storage_url_to_bucket_key(url: str | None) -> tuple[str, str] | None:
    if not url:
        return None
    prefix = settings.storage_endpoint.rstrip("/") + "/"
    if not url.startswith(prefix):
        return None
    remainder = url[len(prefix):]
    bucket, sep, key = remainder.partition("/")
    if not sep or not bucket or not key:
        return None
    return bucket, key


def presign_storage_url(url: str | None, expires_s: int = DEFAULT_GET_EXPIRY_S) -> str | None:
    parsed = storage_url_to_bucket_key(url)
    if parsed is None:
        return url
    bucket, key = parsed
    return get_presigned_get_url(bucket=bucket, key=key, expires_s=expires_s)


def get_presigned_url(bucket: str, key: str, expires: int = 3600) -> str:
    """Backwards-compatible alias of `get_presigned_get_url`.

    Kept for older call sites; new code should use the explicit GET/PUT helpers.
    """
    return get_presigned_get_url(bucket, key, expires_s=expires)


def get_presigned_get_url(
    bucket: str,
    key: str,
    expires_s: int = DEFAULT_GET_EXPIRY_S,
    response_content_disposition: Optional[str] = None,
    response_content_type: Optional[str] = None,
) -> str:
    """Generate a short-lived presigned GET URL.

    `response_content_disposition` lets us force download semantics
    (e.g. ``attachment; filename="health-report.pdf"``) without changing the
    object's stored metadata.
    """
    client = get_storage_client()
    params: dict[str, str] = {"Bucket": bucket, "Key": key}
    if response_content_disposition:
        params["ResponseContentDisposition"] = response_content_disposition
    if response_content_type:
        params["ResponseContentType"] = response_content_type
    return client.generate_presigned_url(
        "get_object",
        Params=params,
        ExpiresIn=expires_s,
    )


def get_presigned_put_url(
    bucket: str,
    key: str,
    content_type: str,
    expires_s: int = DEFAULT_PUT_EXPIRY_S,
) -> str:
    """Generate a short-lived presigned PUT URL for a one-shot direct upload.

    The ``ContentType`` is bound into the signature so the client cannot upload
    a file with a different MIME — this protects the prescription / export
    pipelines from MIME spoofing on direct uploads.
    """
    client = get_storage_client()
    return client.generate_presigned_url(
        "put_object",
        Params={"Bucket": bucket, "Key": key, "ContentType": content_type},
        ExpiresIn=expires_s,
    )


def delete_object(bucket: str, key: str) -> None:
    """Hard-delete a single object. Used by the daily export-blob janitor."""
    client = get_storage_client()
    try:
        client.delete_object(Bucket=bucket, Key=key)
    except Exception:
        logger.exception("Failed to delete %s/%s", bucket, key)
        raise


def sha256_hex(file_bytes: bytes) -> str:
    """Return SHA-256 hex digest of a byte payload (asset dedupe + audit)."""
    return hashlib.sha256(file_bytes).hexdigest()
