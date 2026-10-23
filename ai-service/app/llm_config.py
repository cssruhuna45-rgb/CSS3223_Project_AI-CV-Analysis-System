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

Swapping by hand was still not enough. Which model is busy changes from
hour to hour: on 2026-10-16 gemini-3.1-flash-lite returned 503 three
times running while gemini-3.5-flash answered every call, the reverse
of the day before. So every LLM is now built by build_llm(), which
tries the configured model first and, if that call fails, the models in
GEMINI_FALLBACK_MODELS in order - the user sees an answer instead of
"503 UNAVAILABLE".
"""

import os
from typing import Any, List, Optional

from langchain_google_genai import ChatGoogleGenerativeAI


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

# Tried in this order when the main model fails. Different families on
# purpose: a spike usually hits one model, not all of them at once.
# Override with GEMINI_FALLBACK_MODELS (comma separated) in .env.
DEFAULT_FALLBACK_MODELS = [
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
]


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


def get_interactive_timeout() -> int:
    """
    Seconds per Gemini call made while a candidate waits between two
    questions (grading the answer, writing and checking the next
    question).

    Shorter than get_timeout() because these prompts are short and a
    whole turn has to finish inside Spring's request timeout: a model
    that has not answered in this time is more usefully swapped for the
    next one in the fallback chain than waited on.
    """
    try:
        return max(5, int(os.getenv("GEMINI_INTERACTIVE_TIMEOUT_SECONDS", "30")))
    except ValueError:
        return 30


def get_max_retries() -> int:
    """
    Retries inside the client for one model. Zero by default: the
    fallback chain already moves a failed call to the next model, and a
    retry here repeated each model's full timeout before that happened -
    with three models, one stuck call could hold a request for minutes.
    """
    try:
        return max(0, int(os.getenv("GEMINI_MAX_RETRIES", "0")))
    except ValueError:
        return 0


def get_model_chain(primary: Optional[str] = None) -> List[str]:
    """
    The models to try, in order: the main one, then the fallbacks.

    A model never appears twice, so a fallback that is also the main
    model is not tried a second time.
    """

    configured = os.getenv("GEMINI_FALLBACK_MODELS")

    fallbacks = (
        [m.strip() for m in configured.split(",")]
        if configured is not None
        else DEFAULT_FALLBACK_MODELS
    )

    chain: List[str] = []

    for model in [primary or get_model_name(), *fallbacks]:
        if model and model not in chain:
            chain.append(model)

    return chain


def build_llm(
    temperature: float = 0.0,
    structured_output: Any = None,
    primary: Optional[str] = None,
    timeout: Optional[int] = None,
):
    """
    A Gemini chat model that falls back to the next model when a call
    fails.

    The result is used exactly like a single model - in a chain
    (prompt | llm | parser) or with .invoke().

    structured_output
        A Pydantic class. Each model is wrapped with
        with_structured_output() BEFORE the fallbacks are attached,
        because the combined runnable does not offer that method.

    primary
        Use this model first instead of GEMINI_MODEL.

    timeout
        Seconds per call to each model; defaults to get_timeout().
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is missing."
        )

    models = []

    for name in get_model_chain(primary):

        llm = ChatGoogleGenerativeAI(
            model=name,
            google_api_key=api_key,
            temperature=temperature,
            timeout=timeout or get_timeout(),
            max_retries=get_max_retries(),
        )

        if structured_output is not None:
            llm = llm.with_structured_output(structured_output)

        models.append(llm)

    first, *rest = models

    print(
        "[LLM] Model order: "
        + " -> ".join(get_model_chain(primary))
    )

    return first.with_fallbacks(rest) if rest else first