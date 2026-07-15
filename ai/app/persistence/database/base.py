

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime
from sqlalchemy.orm import declarative_base
from sqlalchemy.types import TypeDecorator, CHAR
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

Base = declarative_base()


class GUID(TypeDecorator):
    """
    PostgreSQL native UUID type.
    """
    impl = PG_UUID
    cache_ok = True

    def load_dialect_impl(self, dialect):
        return dialect.type_descriptor(PG_UUID(as_uuid=True))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)


class TimestampMixin:
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )
