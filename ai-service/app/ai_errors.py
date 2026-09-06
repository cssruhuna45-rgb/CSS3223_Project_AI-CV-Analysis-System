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


RATE_LIMIT_DETAIL = (
    "The AI service has hit Gemini's rate limit or daily free-tier "
    "quota. Please wait a minute and try again, or use an API key "
    "with a higher quota."
)
