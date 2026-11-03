"""
Recognises Gemini rate-limit and quota errors.

Endpoints use `is_rate_limit_error` to turn a 429 into a clean response
for the caller instead of a raw 500 stack trace, and the interview
generation loop uses it to stop retrying immediately rather than burning
more of the daily quota on requests guaranteed to fail the same way.

Detection deliberately does not hang on one exception class. This module
originally imported `langchain_core.exceptions.ModelRateLimitError`,
which does not exist in the installed langchain-core - that import alone
stopped the whole AI service from starting. The class a 429 arrives as
varies by version and by which layer wraps it, so we check, in order:

    1. google-api-core's ResourceExhausted / TooManyRequests, the types
       the Gemini SDK actually raises, when they can be imported
    2. any `code` or `status_code` attribute equal to 429
    3. the message text, as a last resort

Over-matching here is harmless: the worst case is telling the user to
wait a moment when something else went wrong.
"""

import re
from typing import Tuple, Type


def _rate_limit_types() -> Tuple[Type[BaseException], ...]:
    """
    Exception classes that mean "rate limited", where available.

    Import failures are expected on some installs and must not break the
    module - that is the bug this file is fixing.
    """

    found = []

    try:
        from google.api_core.exceptions import (
            ResourceExhausted,
            TooManyRequests,
        )
        found.extend([ResourceExhausted, TooManyRequests])
    except Exception:
        pass

    return tuple(found)


RATE_LIMIT_TYPES = _rate_limit_types()

# "429", "rate limit", "quota exceeded", "RESOURCE_EXHAUSTED"
_MESSAGE_PATTERN = re.compile(
    r"\b429\b|rate[ _-]?limit|quota|resource[ _-]?exhausted|too many requests",
    re.IGNORECASE,
)


def is_rate_limit_error(exc: Exception) -> bool:

    if RATE_LIMIT_TYPES and isinstance(exc, RATE_LIMIT_TYPES):
        return True

    for attr in ("code", "status_code", "http_status"):
        value = getattr(exc, attr, None)
        try:
            if value is not None and int(value) == 429:
                return True
        except (TypeError, ValueError):
            pass

    return bool(_MESSAGE_PATTERN.search(str(exc)))


# ============================================================
# Errors for the user
#
# Spring forwards an error to the browser only when its detail is
# {"code": ..., "message": ...} with a code it knows. A plain-string
# detail - which may be exception text - is logged by Spring and
# replaced, and main.py's handler also replaces it here. So anything
# meant for the user is raised with public_error(), and nothing else
# ever reaches a page.
# ============================================================

RATE_LIMIT_MESSAGE = (
    "The AI service is busy right now. Please wait a moment and try again."
)

DAILY_LIMIT_MESSAGE = (
    "The AI service has reached today's usage limit. Please try again later."
)

UNAVAILABLE_MESSAGE = (
    "The AI service is temporarily unavailable. Please try again in a few minutes."
)

FAILED_MESSAGE = (
    "The AI service couldn't complete this request. Please try again."
)

# Kept for callers that still import it; the wording no longer talks
# about API keys or promises a recovery time.
RATE_LIMIT_DETAIL = RATE_LIMIT_MESSAGE

# Gemini names the exhausted quota in the error, e.g.
# "GenerateRequestsPerDayPerProjectPerModel-FreeTier". A per-minute
# quota is throttling and clears quickly; a per-day one does not.
_DAILY_PATTERN = re.compile(r"per[ _-]?day|daily", re.IGNORECASE)


def is_daily_limit(exc: Exception) -> bool:
    return bool(_DAILY_PATTERN.search(str(exc)))


def public_error(status_code: int, code: str, message: str):
    """
    An HTTPException whose message is shown to the user as it stands.
    Only for plain-English text written here, never for str(exc).
    """

    from fastapi import HTTPException

    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message},
    )


def rate_limit_error(exc: Exception):
    """429 for a Gemini rate limit, telling a daily quota apart."""

    if is_daily_limit(exc):
        return public_error(429, "AI_DAILY_LIMIT", DAILY_LIMIT_MESSAGE)

    return public_error(429, "AI_RATE_LIMITED", RATE_LIMIT_MESSAGE)


def unavailable_error(status_code: int = 500):
    """The service cannot work at all - no model key, say. Nothing the
    user did, and nothing they can fix; the cause is in the log."""

    return public_error(status_code, "AI_UNAVAILABLE", UNAVAILABLE_MESSAGE)


def failed_error(message: str = FAILED_MESSAGE, status_code: int = 500):
    """An AI step that failed this time and may work on a retry."""

    return public_error(status_code, "AI_FAILED", message)


def bad_request(message: str, status_code: int = 400):
    """A request the user can correct, explained in plain English."""

    return public_error(status_code, "AI_BAD_REQUEST", message)
