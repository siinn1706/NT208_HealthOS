"""Standardized error handling for API responses."""

from typing import Optional
from fastapi import HTTPException, status
from app.schemas.common import ErrorDetail, ErrorResponse
from app.constants.error_codes import ErrorCode


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
        message: str = "Validation failed.",
        field_errors: Optional[dict[str, str]] = None,
    ):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code=ErrorCode.VALIDATION_FAILED,
            message=message,
            field_errors=field_errors,
        )


class NotFoundException(ApiException):
    """Resource not found (404)."""

    def __init__(
        self,
        resource: str = "Resource",
        message: Optional[str] = None,
        code: str = ErrorCode.NOT_FOUND,
    ):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            code=code,
            message=message or f"{resource} not found.",
        )


class UnauthorizedException(ApiException):
    """Unauthorized (401)."""

    def __init__(
        self,
        message: str = "Authentication required.",
        code: str = ErrorCode.UNAUTHORIZED,
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
        message: str = "Access denied.",
    ):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            code=ErrorCode.FORBIDDEN,
            message=message,
        )


class ConflictException(ApiException):
    """Conflict (409) - resource already exists."""

    def __init__(
        self,
        message: str = "Resource already exists.",
        code: str = ErrorCode.CONFLICT,
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
        message: str = "Rate limit exceeded. Please try again later.",
    ):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            code=ErrorCode.RATE_LIMIT_EXCEEDED,
            message=message,
        )


class ServerException(ApiException):
    """Internal server error (500)."""

    def __init__(
        self,
        message: str = "An internal server error occurred.",
    ):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code=ErrorCode.INTERNAL_SERVER_ERROR,
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
