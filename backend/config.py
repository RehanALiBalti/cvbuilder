"""Application configuration."""

from __future__ import annotations

import os
from pathlib import Path

APP_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("CVBUILDER_DATA_DIR", str(APP_ROOT / "data")))

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:1.5b")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")


def ollama_base_url() -> str:
    url = OLLAMA_URL.rstrip("/")
    if url.endswith("/api/generate"):
        return url[: -len("/api/generate")]
    return url.replace("/api/chat", "")
