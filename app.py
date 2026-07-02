"""
AI CV Builder — standalone FastAPI app.

Run:
  python app.py

API: http://127.0.0.1:8001
Frontend: cd frontend && npm run dev  →  http://localhost:5174
"""

import os

import uvicorn

if __name__ == "__main__":
    host = os.getenv("CVBUILDER_HOST", "0.0.0.0")
    port = int(os.getenv("CVBUILDER_PORT", "8001"))
    uvicorn.run(
        "backend.main:app",
        host=host,
        port=port,
        reload=os.getenv("CVBUILDER_RELOAD", "false").lower() == "true",
    )
