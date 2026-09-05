"""
Helpers for recognizing Gemini rate-limit / quota errors.

langchain_google_genai wraps a 429 from the API as
`langchain_core.exceptions.ModelRateLimitError` (via its
`GoogleRateLimitError` subclass). Endpoints use `is_rate_limit_error`
to turn that into a clean 429 for the caller instead of a raw 500
stack trace, and the interview generation loop uses it to stop
retrying immediately instead of burning more of the daily quota on
requests that are guaranteed to fail the same way.
"""

from langchain_core.exceptions import ModelRateLimitError


def is_rate_limit_error(exc: Exception) -> bool:
    return isinstance(exc, ModelRateLimitError)


RATE_LIMIT_DETAIL = (
    "The AI service has hit Gemini's rate limit or daily free-tier "
    "quota. Please wait a minute and try again, or use an API key "
    "with a higher quota."
)
