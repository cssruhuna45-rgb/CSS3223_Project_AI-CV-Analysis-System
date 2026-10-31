"""
Checks a draft question set before a recruiter sees it.

The same rules are applied again by Spring when the recruiter approves
the set (JobQuestionValidator.java), because the recruiter can edit
everything in between. Keep the two in step: a set this module passes
should not then be refused at approval for a reason nobody was told
about.

Everything here is plain Python. No model call decides whether a
question set is acceptable.
"""

import math
from typing import Any, Dict, List

from app.interview.question_generator import (
    DIFFICULTY_LEVELS,
    is_duplicate_or_similar_question,
)


# ============================================================
# Rules
# ============================================================

# What a recruiter may choose for one job.
MIN_QUESTION_COUNT = 5
MAX_QUESTION_COUNT = 10

# A question shorter than this is a topic, not a question; longer than
# this does not fit the interview screen or a two-minute answer.
MIN_QUESTION_LENGTH = 20
MAX_QUESTION_LENGTH = 600

# Key points are what the grader compares an answer against. One is
# not a rubric; more than six turns grading into a checklist.
MIN_KEY_POINTS = 2
MAX_KEY_POINTS = 6
MAX_KEY_POINT_LENGTH = 300

MAX_TOPIC_LENGTH = 120

DIFFICULTIES = tuple(DIFFICULTY_LEVELS)

# No single difficulty may make up more than this share of a set, so a
# set of five is never five easy questions.
MAX_DIFFICULTY_SHARE = 0.6


# ============================================================
# Normalisation
# ============================================================

def normalize_question(raw: Any) -> Dict[str, Any]:
    """
    The shape every later step relies on, whatever the model returned.

    Unknown difficulty values are kept as given (lower-cased) so the
    validator can report them, rather than quietly turned into "medium".
    """

    if not isinstance(raw, dict):
        raw = {}

    key_points = raw.get("key_points")

    if not isinstance(key_points, list):
        key_points = []

    return {
        "question": " ".join(str(raw.get("question") or "").split()),
        "difficulty": str(raw.get("difficulty") or "").strip().lower(),
        "topic": " ".join(str(raw.get("topic") or "").split())[:MAX_TOPIC_LENGTH],
        "key_points": [
            " ".join(str(point).split())
            for point in key_points
            if str(point or "").strip()
        ],
    }


# ============================================================
# One question
# ============================================================

def question_issues(question: Dict[str, Any], number: int) -> List[str]:
    """Problems with one question, worded for the recruiter."""

    issues: List[str] = []
    label = f"Question {number}"
    text = question.get("question") or ""

    if len(text) < MIN_QUESTION_LENGTH:
        issues.append(
            f"{label} is shorter than {MIN_QUESTION_LENGTH} characters."
        )

    if len(text) > MAX_QUESTION_LENGTH:
        issues.append(
            f"{label} is longer than {MAX_QUESTION_LENGTH} characters."
        )

    if question.get("difficulty") not in DIFFICULTIES:
        issues.append(
            f"{label} needs a difficulty of easy, medium or hard."
        )

    points = question.get("key_points") or []

    if len(points) < MIN_KEY_POINTS:
        issues.append(
            f"{label} needs at least {MIN_KEY_POINTS} key points to grade against."
        )

    if len(points) > MAX_KEY_POINTS:
        issues.append(
            f"{label} has more than {MAX_KEY_POINTS} key points."
        )

    if any(len(p) > MAX_KEY_POINT_LENGTH for p in points):
        issues.append(
            f"{label} has a key point longer than {MAX_KEY_POINT_LENGTH} characters."
        )

    return issues


def is_acceptable(question: Dict[str, Any]) -> bool:
    return not question_issues(question, 0)


# ============================================================
# Whole set
# ============================================================

def difficulty_mix_issues(questions: List[Dict[str, Any]]) -> List[str]:
    """
    A set must use at least two difficulty levels, and no level may
    take more than MAX_DIFFICULTY_SHARE of it.

    Only applied to full sets: a single regenerated question has no mix.
    """

    if len(questions) < MIN_QUESTION_COUNT:
        return []

    counts: Dict[str, int] = {}

    for q in questions:
        counts[q.get("difficulty")] = counts.get(q.get("difficulty"), 0) + 1

    issues: List[str] = []

    if len([d for d in counts if d in DIFFICULTIES]) < 2:
        issues.append("Use at least two difficulty levels.")

    limit = max_per_difficulty(len(questions))

    for difficulty, count in counts.items():
        if difficulty in DIFFICULTIES and count > limit:
            issues.append(
                f"Too many {difficulty} questions: at most {limit} of "
                f"{len(questions)} may share one difficulty."
            )

    return issues


def max_per_difficulty(total: int) -> int:
    return max(1, math.floor(total * MAX_DIFFICULTY_SHARE))


def set_issues(
    questions: List[Dict[str, Any]],
    expected_count: int,
    existing_questions: List[str] | None = None,
) -> List[str]:
    """
    Everything wrong with a set, in the order a recruiter would fix it.
    An empty list means the set could be approved as it stands.
    """

    issues: List[str] = []

    if len(questions) != expected_count:
        issues.append(
            f"Expected {expected_count} questions, found {len(questions)}."
        )

    for number, question in enumerate(questions, start=1):
        issues.extend(question_issues(question, number))

    seen: List[str] = list(existing_questions or [])

    for number, question in enumerate(questions, start=1):
        text = question.get("question") or ""

        if text and is_duplicate_or_similar_question(text, seen):
            issues.append(
                f"Question {number} repeats or closely matches another question."
            )

        seen.append(text)

    issues.extend(difficulty_mix_issues(questions))

    return issues
