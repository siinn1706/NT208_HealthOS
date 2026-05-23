import pytest

from app.services.upload_security import (
    UploadTooLargeError,
    detect_image_mime,
    read_upload_bounded,
    sanitize_response_filename,
)


class _FakeUpload:
    def __init__(self, payload: bytes):
        self.payload = payload
        self.read_sizes: list[int] = []

    async def read(self, size: int = -1) -> bytes:
        self.read_sizes.append(size)
        if size == -1:
            return self.payload
        return self.payload[:size]


@pytest.mark.asyncio
async def test_read_upload_bounded_reads_limit_plus_one_and_rejects():
    upload = _FakeUpload(b"x" * 6)

    with pytest.raises(UploadTooLargeError):
        await read_upload_bounded(upload, 5)

    assert upload.read_sizes == [6]


@pytest.mark.asyncio
async def test_read_upload_bounded_accepts_within_limit():
    upload = _FakeUpload(b"x" * 5)

    assert await read_upload_bounded(upload, 5) == b"x" * 5
    assert upload.read_sizes == [6]


def test_detect_image_mime_rejects_text_disguised_as_image():
    assert detect_image_mime(b"not really a png") is None


def test_sanitize_response_filename_blocks_header_and_path_injection():
    assert sanitize_response_filename('../bad\r\n"file".pdf') == "bad_file_.pdf"
