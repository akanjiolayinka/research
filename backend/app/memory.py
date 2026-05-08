"""In-memory conversation buffer per session id.

Resets when the server restarts. Swap with Redis or a DB when you need
durability across processes.
"""
from __future__ import annotations

from collections import deque
from threading import Lock
from typing import Literal

from .config import get_settings

Role = Literal["user", "assistant"]


class _Store:
    def __init__(self) -> None:
        self._data: dict[str, deque[dict]] = {}
        self._lock = Lock()

    def append(self, session_id: str, role: Role, content: str) -> None:
        if not session_id:
            return
        window = get_settings().conversation_window
        with self._lock:
            dq = self._data.setdefault(session_id, deque(maxlen=window))
            # update maxlen if config changed
            if dq.maxlen != window:
                new = deque(dq, maxlen=window)
                self._data[session_id] = new
                dq = new
            dq.append({"role": role, "content": content})

    def get(self, session_id: str) -> list[dict]:
        if not session_id:
            return []
        with self._lock:
            dq = self._data.get(session_id)
            return list(dq) if dq else []

    def clear(self, session_id: str) -> None:
        with self._lock:
            self._data.pop(session_id, None)

    def reset(self) -> None:
        with self._lock:
            self._data.clear()


_store = _Store()


def append(session_id: str, role: Role, content: str) -> None:
    _store.append(session_id, role, content)


def get(session_id: str) -> list[dict]:
    return _store.get(session_id)


def clear(session_id: str) -> None:
    _store.clear(session_id)


def reset() -> None:
    _store.reset()
