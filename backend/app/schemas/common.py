"""Shared Pydantic schemas — response envelope, error, pagination."""
from typing import Generic, Optional, TypeVar
from pydantic import BaseModel

DataT = TypeVar("DataT")


class ErrorDetail(BaseModel):
    """Standard error response structure."""

    code: str
    message: str
    details: Optional[str] = None
    field_errors: Optional[dict[str, str]] = None


class ErrorResponse(BaseModel):
    """Standard error response envelope."""

    error: ErrorDetail


class PaginationMeta(BaseModel):
    page: int = 1
    per_page: int = 20
    total: int = 0


class DataResponse(BaseModel, Generic[DataT]):
    data: DataT


class PaginatedResponse(BaseModel, Generic[DataT]):
    data: list[DataT]
    meta: PaginationMeta
