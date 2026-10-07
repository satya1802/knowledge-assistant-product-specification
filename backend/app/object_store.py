"""Original File Store (object_store).

Stores uploaded originals and returns them unchanged on download. Local
filesystem volume by default, matching the architecture's "Local volume or
Amazon S3" note; this is the infrastructure half (where bytes live) that
doc_svc's upload/download handlers call into, not the upload/download
business logic itself.

Only the local backend is implemented here. `STORAGE_BACKEND=s3` is accepted
by config_svc but not wired up yet -- add an S3-backed implementation of this
same interface (and `boto3` to requirements.txt) when that is actually
needed; declaring it now would be an unused dependency.
"""

from __future__ import annotations

import uuid
from pathlib import Path

from app.config import get_settings


class ObjectStoreError(RuntimeError):
    """Raised when a storage backend cannot complete an operation."""


class LocalObjectStore:
    """Stores files under `settings.storage_path`, one file per storage key."""

    def __init__(self, root: str | Path | None = None) -> None:
        self._root = Path(root or get_settings().storage_path)
        self._root.mkdir(parents=True, exist_ok=True)

    def make_key(self, original_filename: str) -> str:
        """A storage key that cannot collide and keeps the original suffix."""
        suffix = Path(original_filename).suffix
        return f"{uuid.uuid4().hex}{suffix}"

    def save(self, storage_key: str, data: bytes) -> None:
        path = self._path_for(storage_key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    def load(self, storage_key: str) -> bytes:
        path = self._path_for(storage_key)
        if not path.is_file():
            raise FileNotFoundError(storage_key)
        return path.read_bytes()

    def delete(self, storage_key: str) -> None:
        path = self._path_for(storage_key)
        path.unlink(missing_ok=True)

    def _path_for(self, storage_key: str) -> Path:
        # Resolve and confirm containment so a crafted key cannot escape the
        # storage root (path traversal via "../").
        candidate = (self._root / storage_key).resolve()
        if self._root.resolve() not in candidate.parents and candidate != self._root.resolve():
            raise ObjectStoreError(f"storage key escapes storage root: {storage_key!r}")
        return candidate


def get_object_store() -> LocalObjectStore:
    """FastAPI dependency: one store per settings, backend selected by config.

    Raises if a deployment asks for the unimplemented S3 backend rather than
    silently falling back to local disk.
    """
    settings = get_settings()
    if settings.storage_backend == "s3":
        raise NotImplementedError(
            "STORAGE_BACKEND=s3 is reserved by config_svc but has no implementation yet; "
            "add one alongside boto3 in requirements.txt before enabling it."
        )
    return LocalObjectStore(settings.storage_path)
