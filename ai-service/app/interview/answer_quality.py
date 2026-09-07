# app/interview/answer_quality.py

"""
How well the candidate answered the question they were just asked.

This drives the difficulty ladder - a strong answer moves the interview
up, a weak one moves it down - so getting it wrong sends the whole
interview to the wrong level.

It used to be word count alone: under 8 words was "weak", 35 or more
was "strong". That made the ladder trivially gameable. A confident
paragraph of forty words that answered a different question entirely
counted as strong and pushed the difficulty up; a correct seven-word
answer counted as weak and pushed it down. The one thing the measure
never looked at was whether the answer was right.

The split here follows the same rule as the rest of the project. The
cases that can be settled by rule are settled in Python and cost
nothing. Only the genuinely ambiguous middle - an answer of reasonable
length whose correctness is the actual question - is put to the model,
and the model is asked for a number, not a verdict. The bands that turn
that number into a verdict live here, and they are the same bands the
final scorecard uses, so the ladder and the scorecard can never
disagree about what "strong" means.

Nothing here raises. An interview that cannot be graded still has to
continue, so every failure path falls back to the old word-count
estimate.
"""

import re
from typing import Any, Dict, Optional

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate

from app.interview.question_generator import get_llm, is_non_answer


# ============================================================
# Bands
# ============================================================

# Imported rather than redefined: the difficulty ladder and the final
# scorecard must mean the same thing by "strong".
from app.interview.evaluator import VERDICT_BANDS


# Below this, an answer is too short to contain a technical point
# regardless of what it says. No model call is worth making.
MIN_SUBSTANTIVE_WORDS = 8

# Above this, the answer is long enough to be worth reading properly.
# Between the two, length alone still tells us nothing, so these are
# sent to the model as well.
WORTH_JUDGING_WORDS = 8

# Trimmed before sending. A candidate who writes an essay should not
# cost more per question than one who writes a paragraph.
MAX_ANSWER_CHARS = 2000
MAX_QUESTION_CHARS = 600


# ============================================================
# Prompt
# ============================================================

# Deliberately small. This runs between two questions while somebody is
# waiting, so it asks for one number and nothing else - no explanation,
# no feedback text. The detailed feedback is written once at the end by
# evaluator.py, where the wait is expected.
QUALITY_PROMPT = PromptTemplate(
    input_variables=["job_field", "question", "answer"],
    template="""You are scoring one answer in a {job_field} technical interview.

QUESTION:
{question}

CANDIDATE ANSWER:
{answer}

Score how well the answer addresses that specific question, from 0 to 100.

- 0-14   did not engage with the question at all
- 15-44  addressed it but was mostly wrong or empty of substance
- 45-74  partially correct, missing depth or key points
- 75-100 correct and substantive

Judge correctness and relevance, not length or confidence. A long,
fluent answer to a different question scores low. A short, precise,
correct answer scores high.

Reply with the number only. No words, no punctuation, no explanation.
""",
)


_NUMBER = re.compile(r"-?\d+")


def _parse_score(raw: str) -> Optional[int]:
    """First integer in the reply, clamped. None if there isn't one."""

    if not raw:
        return None

    match = _NUMBER.search(raw)

    if not match:
        return None

    try:
        value = int(match.group())
    except ValueError:
        return None

    return max(0, min(100, value))


def band_for(score: int) -> str:
    """The verdict for a score, using the scorecard's own thresholds."""

    for threshold, verdict in VERDICT_BANDS:
        if score >= threshold:
            return verdict

    return "none"


# ============================================================
# Word-count fallback
# ============================================================

def estimate_from_length(answer: Optional[str]) -> str:
    """
    The original measure, kept as the fallback.

    Used when the model cannot be reached, when it replies with
    something that is not a number, and when no API key is configured -
    an interview without Gemini should still move up and down rather
    than sitting at one difficulty forever.
    """

    if not answer or not answer.strip():
        return "none"

    if is_non_answer(answer):
        return "weak"

    words = len(answer.split())

    if words < MIN_SUBSTANTIVE_WORDS:
        return "weak"

    if words >= 35:
        return "strong"

    return "partial"


# ============================================================
# Public
# ============================================================

def assess_answer(
    answer: Optional[str],
    question: str = "",
    job_field: str = "",
) -> Dict[str, Any]:
    """
    Grade one answer.

    Returns the quality band, the score behind it when there is one, and
    which path produced it - so a surprising difficulty jump can be
    traced without re-running the interview.

    The rule-based cases short-circuit before any network call:

        no answer at all          -> none
        "I don't know" and kin    -> weak
        under 8 words             -> weak

    Everything else goes to the model.
    """

    text = (answer or "").strip()

    if not text:
        return {"quality": "none", "score": None, "source": "rules"}

    if is_non_answer(text):
        return {"quality": "weak", "score": None, "source": "rules"}

    if len(text.split()) < MIN_SUBSTANTIVE_WORDS:
        return {"quality": "weak", "score": None, "source": "rules"}

    # No question to judge against - grading relevance is impossible,
    # so fall back rather than asking the model to guess.
    if not question or not question.strip():
        return {
            "quality": estimate_from_length(text),
            "source": "length (no question given)",
            "score": None,
        }

    try:
        chain = QUALITY_PROMPT | get_llm() | StrOutputParser()

        raw = chain.invoke(
            {
                "job_field": job_field or "software engineering",
                "question": question[:MAX_QUESTION_CHARS],
                "answer": text[:MAX_ANSWER_CHARS],
            }
        )

        score = _parse_score(raw)

        if score is None:
            print(
                "[AnswerQuality] Model reply was not a number "
                f"({raw!r:.80}); falling back to length."
            )
            return {
                "quality": estimate_from_length(text),
                "score": None,
                "source": "length (unparseable reply)",
            }

        return {
            "quality": band_for(score),
            "score": score,
            "source": "model",
        }

    except Exception as exc:
        # Never let grading end an interview.
        print(f"[AnswerQuality] Scoring failed ({exc}); using length.")

        return {
            "quality": estimate_from_length(text),
            "score": None,
            "source": "length (scoring failed)",
        }
