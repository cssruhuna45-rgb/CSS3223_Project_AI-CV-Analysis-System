# app/interview/experience_level.py

"""
Works out how senior a candidate is, from the CV text alone.

Every interview used to open at "medium" regardless of who was sitting
it. An undergraduate with coursework projects and a principal engineer
with twelve years both got the same opening difficulty, and the only
thing that separated them was that the resume text happened to be in
the prompt - so the model drifted towards the right level by itself,
without anything in our code deciding it.

This module makes that decision ours: a level is computed here, in
plain Python, and the opening difficulty follows from it. The model
still writes the question; it does not choose who it is for.

Nothing here calls an LLM. The same CV always produces the same level,
and every part of the result can be traced to a rule below.
"""

import re
from datetime import date
from typing import Any, Dict, List


# ============================================================
# Levels
# ============================================================

ENTRY = "entry"
MID = "mid"
SENIOR = "senior"

# Where an interview starts for each level. A senior candidate asked
# three fundamentals in a row learns nothing about themselves, and a
# fresher opened on distributed-systems trade-offs simply fails.
STARTING_DIFFICULTY = {
    ENTRY: "easy",
    MID: "medium",
    SENIOR: "hard",
}

# Years of professional experience that separate the bands. Deliberately
# conservative: it is better to open one step low and let the ladder
# climb after a strong answer than to open too high and lose someone on
# the first question.
MID_MIN_YEARS = 2.0
SENIOR_MIN_YEARS = 6.0


# ============================================================
# Title signals
# ============================================================

# Matched against role lines. A title is weaker evidence than a date
# range - anyone can call themselves anything - so titles adjust the
# level rather than setting it outright.
SENIOR_TITLE_PATTERNS = [
    r"\bprincipal\b",
    r"\bstaff\s+engineer\b",
    r"\bsenior\b",
    r"\bsr\.?\s+(engineer|developer|dev)\b",
    r"\blead\b",
    r"\btech(nical)?\s+lead\b",
    r"\barchitect\b",
    r"\bhead\s+of\b",
    r"\bengineering\s+manager\b",
    r"\bcto\b",
    r"\bvp\s+of\s+engineering\b",
]

ENTRY_TITLE_PATTERNS = [
    r"\bintern\b",
    r"\binternship\b",
    r"\btrainee\b",
    r"\bapprentice\b",
    r"\bundergraduate\b",
    r"\bfresher\b",
    r"\bfresh\s+graduate\b",
    r"\bjunior\b",
    r"\bjr\.?\s+(engineer|developer|dev)\b",
    r"\bassociate\s+(engineer|developer)\b",
]

# Phrases that say outright there is no professional history. These are
# strong enough to force ENTRY on their own - someone who writes this is
# telling us directly.
NO_EXPERIENCE_PATTERNS = [
    r"\bno\s+(professional|work|industry)\s+experience\b",
    r"\bseeking\s+(my\s+)?first\s+(role|job|position)\b",
    r"\bcoursework\s+projects?\s+only\b",
    r"\blooking\s+for\s+(an\s+)?intern(ship)?\b",
]

# Leadership scope. Present in a CV, these suggest seniority that a
# year count alone can miss - someone can reach a lead role in five
# years at a fast-growing company.
SCOPE_PATTERNS = [
    r"\bled\s+a\s+team\b",
    r"\bmanaged\s+a\s+team\b",
    r"\bteam\s+of\s+\d+\b",
    r"\bmentored\b",
    r"\bowned\s+the\b",
    r"\bset\s+the\s+technical\s+direction\b",
]


# ============================================================
# Years of experience
# ============================================================

# "8 years of experience", "5+ yrs experience"
_EXPLICIT_YEARS = re.compile(
    r"(\d{1,2})\s*\+?\s*(?:years?|yrs?)\s*(?:of\s+)?"
    r"(?:professional\s+|work\s+|industry\s+|relevant\s+)?experience",
    re.IGNORECASE,
)

# "January 2023 - Present", "2019 – 2022", "03/2020 to 08/2023"
_DATE_RANGE = re.compile(
    r"(?:[A-Za-z]{3,9}\.?\s+)?(\d{4})\s*(?:-|–|—|to|until)\s*"
    r"(?:([A-Za-z]{3,9}\.?\s+)?(\d{4})|present|current|now)",
    re.IGNORECASE,
)

# Education date ranges must not be counted as work. "2021-2025" under
# a degree heading is study, not employment.
_EDUCATION_CONTEXT = re.compile(
    r"\b(bsc|b\.sc|msc|m\.sc|beng|b\.eng|bachelor|master|degree|"
    r"university|faculty|college|school|gpa|diploma|phd)\b",
    re.IGNORECASE,
)


def _line_is_education(line: str) -> bool:
    return bool(_EDUCATION_CONTEXT.search(line))


def _years_from_explicit_claim(text: str) -> float:
    """The largest "N years of experience" the CV states outright."""

    values = [
        float(m.group(1))
        for m in _EXPLICIT_YEARS.finditer(text)
    ]

    # Ignore absurd values rather than trusting a typo.
    values = [v for v in values if 0 < v <= 50]

    return max(values) if values else 0.0


def _years_from_date_ranges(text: str) -> float:
    """
    Total span of employment date ranges, skipping education lines.

    Overlapping roles are merged rather than added, so two concurrent
    jobs do not read as double the experience.
    """

    this_year = date.today().year
    spans: List[tuple[int, int]] = []

    for line in text.splitlines():

        if _line_is_education(line):
            continue

        for match in _DATE_RANGE.finditer(line):

            start = int(match.group(1))
            end_text = match.group(3)

            end = int(end_text) if end_text else this_year

            if not (1970 <= start <= this_year):
                continue

            if end < start or end > this_year + 1:
                continue

            spans.append((start, min(end, this_year)))

    if not spans:
        return 0.0

    # Merge overlaps.
    spans.sort()
    merged = [spans[0]]

    for start, end in spans[1:]:

        last_start, last_end = merged[-1]

        if start <= last_end:
            merged[-1] = (last_start, max(last_end, end))
        else:
            merged.append((start, end))

    return float(sum(end - start for start, end in merged))


def estimate_years(text: str) -> float:
    """
    Years of professional experience.

    Takes the larger of what the CV claims outright and what its
    employment date ranges add up to. A CV usually carries one or the
    other, rarely both, and the larger of the two is the safer read.
    """

    return max(
        _years_from_explicit_claim(text),
        _years_from_date_ranges(text),
    )


# ============================================================
# Level
# ============================================================

def _count(patterns: List[str], text: str) -> int:
    return sum(
        1
        for p in patterns
        if re.search(p, text, re.IGNORECASE)
    )


def detect_level(resume_text: str) -> Dict[str, Any]:
    """
    Classify a CV as entry, mid or senior.

    Returns the level, the opening difficulty that follows from it, the
    year estimate, and the signals that produced the answer - so a
    candidate can be shown why they were placed where they were, and so
    a wrong placement can be debugged without re-running anything.
    """

    text = (resume_text or "").strip()

    if not text:
        # Nothing to go on. Open in the middle rather than guessing at
        # either end.
        return {
            "level": MID,
            "starting_difficulty": STARTING_DIFFICULTY[MID],
            "years": 0.0,
            "signals": ["no resume text; defaulted to mid"],
        }

    signals: List[str] = []

    years = estimate_years(text)

    if years:
        signals.append(f"{years:g} year(s) of experience detected")

    senior_titles = _count(SENIOR_TITLE_PATTERNS, text)
    entry_titles = _count(ENTRY_TITLE_PATTERNS, text)
    scope = _count(SCOPE_PATTERNS, text)
    declared_none = _count(NO_EXPERIENCE_PATTERNS, text)

    if senior_titles:
        signals.append(f"{senior_titles} senior title signal(s)")
    if entry_titles:
        signals.append(f"{entry_titles} entry-level title signal(s)")
    if scope:
        signals.append(f"{scope} leadership scope signal(s)")
    if declared_none:
        signals.append("states no professional experience")

    # ----------------------------------------------------------
    # Decide
    # ----------------------------------------------------------

    # An explicit statement of no experience overrides everything. A
    # student CV can still mention "senior project" or "led a team" in
    # a university society.
    if declared_none:
        level = ENTRY
        signals.append("-> entry (declared no professional experience)")

    elif years >= SENIOR_MIN_YEARS:
        level = SENIOR
        signals.append(f"-> senior ({years:g} >= {SENIOR_MIN_YEARS:g} years)")

    elif years >= MID_MIN_YEARS:
        # Enough time to be mid, but a lead or principal title plus real
        # scope is the case where the year count understates the person.
        if senior_titles and scope:
            level = SENIOR
            signals.append("-> senior (senior title with leadership scope)")
        else:
            level = MID
            signals.append(f"-> mid ({years:g} >= {MID_MIN_YEARS:g} years)")

    else:
        # Under two years, or no dates at all.
        if senior_titles and scope and not entry_titles:
            # A CV with no usable dates but a principal title and a team
            # behind it is not an entry-level CV.
            level = SENIOR
            signals.append("-> senior (senior title and scope, no usable dates)")
        elif entry_titles:
            level = ENTRY
            signals.append("-> entry (entry-level titles, under 2 years)")
        elif years > 0:
            level = ENTRY
            signals.append(f"-> entry ({years:g} < {MID_MIN_YEARS:g} years)")
        else:
            level = ENTRY
            signals.append("-> entry (no professional experience found)")

    return {
        "level": level,
        "starting_difficulty": STARTING_DIFFICULTY[level],
        "years": years,
        "signals": signals,
    }


def audience_for(level: str) -> str:
    """
    How to describe the candidate to the model.

    The question prompt and its validator both used to say "junior /
    undergraduate" no matter who was interviewing. That actively worked
    against senior candidates: the generator would produce a question
    about distributed data consistency and the validator would then be
    asked whether it suited an undergraduate.
    """

    return {
        ENTRY: (
            "an entry-level candidate - a recent graduate or "
            "undergraduate with coursework and internship experience "
            "rather than years in industry"
        ),
        MID: (
            "a mid-level engineer with a few years of professional "
            "experience, comfortable with day-to-day delivery but not "
            "yet setting technical direction"
        ),
        SENIOR: (
            "a senior engineer with substantial industry experience, "
            "who is expected to reason about trade-offs, scale, "
            "failure modes and the consequences of a design choice"
        ),
    }.get(level, "a mid-level engineer with a few years of experience")
