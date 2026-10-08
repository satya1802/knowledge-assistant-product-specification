"""Shared fixtures for documents/ingestion integration tests.

Gives each test its own SQLite file and its own local object store
directory, with `get_db`, `get_object_store` and `require_session`
overridden on the real `app` so tests never touch the developer's own
`./app.db` or `./data/uploads`, and never need a real session cookie.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import User
from app.object_store import LocalObjectStore, get_object_store
from app.services.auth import require_session


@pytest.fixture()
def db_engine(tmp_path):
    db_path = tmp_path / "test.db"
    engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}, future=True
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    engine.dispose()


@pytest.fixture()
def db_session_factory(db_engine):
    return sessionmaker(bind=db_engine, autoflush=False, expire_on_commit=False)


@pytest.fixture()
def fake_user() -> User:
    return User(
        id=uuid.uuid4(),
        name="Test User",
        email="test-user@example.com",
        password_hash="unused",
        is_admin=False,
        is_enabled=True,
    )


@pytest.fixture()
def client(db_session_factory, tmp_path, fake_user) -> Iterator[TestClient]:
    store = LocalObjectStore(root=tmp_path / "uploads")

    def _get_db() -> Iterator:
        session = db_session_factory()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_object_store] = lambda: store
    app.dependency_overrides[require_session] = lambda: fake_user

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
