"""Shared Pydantic schemas — response envelope, error, pagination."""
from typing import Generic, TypeVar
from pydantic import BaseModel

DataT = TypeVar("DataT")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict = {}


class ErrorResponse(BaseModel):
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
