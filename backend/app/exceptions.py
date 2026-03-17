"""Standardized error handling for API responses."""

from typing import Optional
from fastapi import HTTPException, status
from app.schemas.common import ErrorDetail, ErrorResponse


class ApiException(HTTPException):
    """Base API exception with standardized error format."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Optional[str] = None,
        field_errors: Optional[dict[str, str]] = None,
    ):
        super().__init__(
            status_code=status_code,
            detail={
                "code": code,
                "message": message,
                "details": details,
                "field_errors": field_errors,
            },
        )


class ValidationException(ApiException):
    """Validation error (422)."""

    def __init__(
        self,
        message: str = "Dữ liệu không hợp lệ",
        field_errors: Optional[dict[str, str]] = None,
    ):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_FAILED",
            message=message,
            field_errors=field_errors,
        )


class NotFoundException(ApiException):
    """Resource not found (404)."""

    def __init__(
        self,
        resource: str = "Resource",
        message: Optional[str] = None,
    ):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message=message or f"{resource} không tìm thấy",
        )


class UnauthorizedException(ApiException):
    """Unauthorized (401)."""

    def __init__(
        self,
        message: str = "Vui lòng đăng nhập để tiếp tục",
        code: str = "UNAUTHORIZED",
    ):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code=code,
            message=message,
        )


class ForbiddenException(ApiException):
    """Forbidden (403)."""

    def __init__(
        self,
        message: str = "Bạn không có quyền truy cập",
    ):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            code="FORBIDDEN",
            message=message,
        )


class ConflictException(ApiException):
    """Conflict (409) - resource already exists."""

    def __init__(
        self,
        message: str = "Tài nguyên đã tồn tại",
        code: str = "CONFLICT",
        field_errors: Optional[dict[str, str]] = None,
    ):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            code=code,
            message=message,
            field_errors=field_errors,
        )


class RateLimitException(ApiException):
    """Rate limit exceeded (429)."""

    def __init__(
        self,
        message: str = "Thao tác quá nhanh, vui lòng thử lại sau",
    ):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            code="RATE_LIMIT_EXCEEDED",
            message=message,
        )


class ServerException(ApiException):
    """Internal server error (500)."""

    def __init__(
        self,
        message: str = "Đã xảy ra lỗi máy chủ",
    ):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INTERNAL_SERVER_ERROR",
            message=message,
        )


def create_error_response(
    code: str,
    message: str,
    details: Optional[str] = None,
    field_errors: Optional[dict[str, str]] = None,
) -> ErrorResponse:
    """Create a standardized error response."""
    return ErrorResponse(
        error=ErrorDetail(
            code=code,
            message=message,
            details=details,
            field_errors=field_errors,
        )
    )
