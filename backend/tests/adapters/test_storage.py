from botocore.exceptions import ClientError
import pytest

from app.adapters import storage


def _missing_bucket_error() -> ClientError:
    return ClientError(
        {"Error": {"Code": "NoSuchBucket", "Message": "bucket missing"}},
        "PutObject",
    )


class _MissingBucketThenSuccessClient:
    def __init__(self) -> None:
        self.created_buckets: list[str] = []
        self.put_calls = 0

    def put_object(self, **kwargs):
        self.put_calls += 1
        if not self.created_buckets:
            raise _missing_bucket_error()
        return {"ETag": "ok"}

    def create_bucket(self, *, Bucket: str):
        self.created_buckets.append(Bucket)
        return {}


class _AlwaysMissingBucketClient:
    def __init__(self) -> None:
        self.created_buckets: list[str] = []

    def put_object(self, **kwargs):
        raise _missing_bucket_error()

    def create_bucket(self, *, Bucket: str):
        self.created_buckets.append(Bucket)
        return {}


def test_upload_file_creates_missing_bucket_in_dev_and_retries(monkeypatch: pytest.MonkeyPatch):
    client = _MissingBucketThenSuccessClient()
    monkeypatch.setattr(storage, "get_storage_client", lambda: client)
    monkeypatch.setattr(storage, "_can_auto_create_bucket", lambda: True)
    monkeypatch.setattr(storage.settings, "storage_endpoint", "http://localhost:9000")

    url = storage.upload_file(
        bucket="meals",
        key="user/photo.png",
        file_bytes=b"png",
        content_type="image/png",
    )

    assert url == "http://localhost:9000/meals/user/photo.png"
    assert client.created_buckets == ["meals"]
    assert client.put_calls == 2


def test_upload_file_does_not_create_missing_bucket_in_protected_runtime(
    monkeypatch: pytest.MonkeyPatch,
):
    client = _AlwaysMissingBucketClient()
    monkeypatch.setattr(storage, "get_storage_client", lambda: client)
    monkeypatch.setattr(storage, "_can_auto_create_bucket", lambda: False)

    with pytest.raises(RuntimeError, match="NoSuchBucket"):
        storage.upload_file(
            bucket="meals",
            key="user/photo.png",
            file_bytes=b"png",
            content_type="image/png",
        )

    assert client.created_buckets == []
