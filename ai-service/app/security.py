"""
Internal API key authentication for the AI service.

This service is NOT meant to be reachable from a browser. Every AI
endpoint is called server-to-server by the Spring Boot backend, which
authenticates the end user with a JWT first and only then forwards the
request here together with the shared internal key.

The check is implemented as middleware rather than a per-route
dependency so that it is fail-closed: a newly added endpoint is
protected automatically unless it is explicitly listed in PUBLIC_PATHS.
"""

import os
import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse


# ============================================================
# Configuration
# ============================================================

INTERNAL_API_KEY_HEADER = "X-Internal-Api-Key"

MIN_KEY_LENGTH = 32


# Paths that stay reachable without the internal key.
#
# Health/root are needed by container health checks and the OpenAPI
# paths keep Swagger UI usable during development. None of them touch
# Gemini or the vector store, so they cannot be abused for cost.

PUBLIC_PATHS = frozenset(
    {
        "/",
        "/health",
        "/api/v1/health",
        "/docs",
        "/docs/oauth2-redirect",
        "/redoc",
        "/openapi.json",
    }
)


# ============================================================
# Key loading
# ============================================================


def get_internal_api_key() -> str:
    """
    Read INTERNAL_API_KEY from the environment.

    Raises at import/startup time when it is missing or too weak, so the
    service refuses to boot unprotected instead of silently allowing
    anonymous access.
    """

    key = (os.getenv("INTERNAL_API_KEY") or "").strip()

    if not key:
        raise RuntimeError(
            "INTERNAL_API_KEY is not set. The AI service refuses to "
            "start without it, because every endpoint would otherwise "
            "be open to anyone who can reach this port.\n"
            "Generate one with:\n"
            "  python -c \"import secrets; print(secrets.token_urlsafe(32))\"\n"
            "then add it to ai-service/.env and set the same value as "
            "AI_SERVICE_INTERNAL_API_KEY for the Spring backend."
        )

    if len(key) < MIN_KEY_LENGTH:
        raise RuntimeError(
            f"INTERNAL_API_KEY must be at least {MIN_KEY_LENGTH} "
            f"characters long (got {len(key)})."
        )

    return key


def get_allowed_origins() -> list[str]:
    """
    CORS origins, as a comma separated AI_ALLOWED_ORIGINS list.

    Defaults to the local React dev server only. A wildcard is never
    returned: browsers are expected to talk to the Spring backend, not
    to this service.
    """

    raw = (os.getenv("AI_ALLOWED_ORIGINS") or "").strip()

    if not raw:
        return ["http://localhost:3000"]

    return [
        origin.strip()
        for origin in raw.split(",")
        if origin.strip() and origin.strip() != "*"
    ]


# ============================================================
# Middleware
# ============================================================


class InternalApiKeyMiddleware(BaseHTTPMiddleware):
    """
    Rejects any request that does not carry the shared internal key.
    """

    def __init__(
        self,
        app,
        api_key: str,
        public_paths: frozenset = PUBLIC_PATHS,
    ):
        super().__init__(app)

        self._api_key = api_key.encode("utf-8")

        self._public_paths = public_paths

    async def dispatch(self, request: Request, call_next):

        # CORS preflight carries no custom headers by design.
        if request.method == "OPTIONS":
            return await call_next(request)

        if request.url.path in self._public_paths:
            return await call_next(request)

        provided = request.headers.get(
            INTERNAL_API_KEY_HEADER,
            "",
        )

        if not self._is_valid(provided):
            return JSONResponse(
                status_code=401,
                content={
                    "detail": (
                        "Missing or invalid internal API key. This "
                        "service is only callable by the backend."
                    )
                },
            )

        return await call_next(request)

    def _is_valid(self, provided: str) -> bool:

        if not provided:
            return False

        # compare_digest needs bytes to stay constant time and to
        # tolerate non-ASCII header values.
        return secrets.compare_digest(
            provided.encode("utf-8"),
            self._api_key,
        )
