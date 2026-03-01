"""Object Storage adapter — MinIO / AWS S3 via boto3."""
import boto3
from botocore.client import Config

from app.core.config import settings


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


def upload_file(bucket: str, key: str, file_bytes: bytes, content_type: str = "image/jpeg") -> str:
    """Upload bytes to object storage. Returns public URL."""
    client = get_storage_client()
    client.put_object(Bucket=bucket, Key=key, Body=file_bytes, ContentType=content_type)
    return f"{settings.storage_endpoint}/{bucket}/{key}"


def get_presigned_url(bucket: str, key: str, expires: int = 3600) -> str:
    """Generate a pre-signed URL for private object download."""
    client = get_storage_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires,
    )
