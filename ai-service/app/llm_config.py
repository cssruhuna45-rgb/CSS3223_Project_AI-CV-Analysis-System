"""
One place to name the Gemini model and its call limits.

The model used to be hardcoded in four modules. When Google started
returning 503 "high demand" for that model, the whole app was down and
the name had to be hunted through four files to change it. Now it comes
from GEMINI_MODEL, so swapping to a model that is answering is an .env
edit and a restart.

The timeout matters just as much. Without one, the client retries a
busy model internally and the request simply hangs - a five-minute
stall with nothing in the logs, instead of a clear error.
"""

import os


# Default chosen because it was the flash-lite variant actually
# answering when the previous default started returning 503. If it
# starts failing, list what your key can reach:
#
#   curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
#
# then set GEMINI_MODEL in ai-service/.env. Prefer a pinned name over a
# "-latest" alias: the aliases carry the most traffic and are the first
# to be throttled.
DEFAULT_MODEL = "gemini-3.1-flash-lite"


def get_model_name() -> str:
    return (os.getenv("GEMINI_MODEL") or "").strip() or DEFAULT_MODEL


def get_timeout() -> int:
    """
    Seconds to wait for one Gemini call before giving up.

    Long enough for a slow generation, short enough that a stuck call
    surfaces as an error while someone is still watching.
    """
    try:
        return max(5, int(os.getenv("GEMINI_TIMEOUT_SECONDS", "60")))
    except ValueError:
        return 60


def get_max_retries() -> int:
    """
    Retries inside the client. Kept low because the callers already
    retry, and stacked retries are what turned a 503 into a hang.
    """
    try:
        return max(0, int(os.getenv("GEMINI_MAX_RETRIES", "1")))
    except ValueError:
        return 1
