# app/skill_gap/matcher.py

"""
Deterministic skill matching against one recruiter's required skills.

This is not ``analyzer.py``. The analyzer scores a CV against a
predefined catalogue job field and asks Gemini to read the CV text
first. This module scores a CV against the skills a recruiter actually
typed on their own job, from skills that have already been extracted
and stored, and it calls no model at all:

- the required skills are the recruiter's, taken from the job;
- the candidate skills come from the CV analysis already stored
  against the application;
- everything else is set arithmetic over those two lists.

Three properties the applicant list depends on:

**Deterministic.** No model, no clock, no randomness. The same two
lists always give the same percentage, so a number stored at
application time still means the same thing when a recruiter opens it
weeks later - and a test can assert on it.

**Computed once.** Spring calls this when an application is submitted
and stores the result on the application. Opening an applicant list
reads stored rows; it does not come back here, and it never spends
Gemini quota per applicant.

**Decision support only.** A percentage is returned. Nothing here
shortlists or rejects anybody, and no caller is allowed to: a human
recruiter makes every hiring decision.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Set, Tuple

from app.skill_gap.normalization import (
    build_alias_lookup,
    canonicalize_skill,
    normalize_text,
)

from app.skill_gap.skill_catalog import RELATED_SKILLS


# ============================================================
# Related-skill lookup
# ============================================================

def _build_related_lookup() -> Dict[str, List[str]]:
    """
    ``RELATED_SKILLS`` keyed by normalized skill name.

    The catalogue keys it by display name ("Infrastructure as Code"),
    but a recruiter's required skills arrive already normalized to
    lower case by the backend, so a direct dict lookup would miss
    every one of them.
    """

    lookup: Dict[str, List[str]] = {}

    for skill, related in RELATED_SKILLS.items():

        key = normalize_text(skill)

        if key:
            lookup[key] = related

    return lookup


# ============================================================
# Skill set building
# ============================================================

def _canonical_unique(
    skills: List[str],
    alias_lookup: Dict[str, str],
) -> List[str]:
    """
    Canonicalize a list of skills, dropping blanks and duplicates and
    keeping the order they were given in.

    Order is kept so that what a recruiter reads back matches the order
    they typed their requirements in. De-duplication is by normalized
    form, so "Java", "java " and "JAVA" collapse to one skill - which
    also stops a CV padded with the same skill three times from
    inflating anything.
    """

    seen: Set[str] = set()
    result: List[str] = []

    for skill in skills or []:

        if not isinstance(skill, str):
            continue

        canonical = canonicalize_skill(skill, alias_lookup)

        if not canonical:
            continue

        key = normalize_text(canonical)

        if key in seen:
            continue

        seen.add(key)
        result.append(canonical)

    return result


# ============================================================
# Match percentage
# ============================================================

def calculate_match_percentage(
    matched_count: int,
    required_count: int,
) -> int:
    """
    Share of required skills exactly matched, 0-100.

    Formula:

        matched / required * 100

    **Rounding is half-up**, to the nearest whole percent: 62.5 becomes
    63, not 62. Spelled out with ``Decimal`` rather than left to the
    builtin ``round``, which is half-to-even and would make 62.5 into
    62 while Java's ``Math.round`` on the same number gives 63. The two
    services have to agree on the number, so the rule is explicit here
    and nothing re-derives it.
    """

    if required_count <= 0:
        return 0

    percentage = Decimal(matched_count * 100) / Decimal(required_count)

    return int(
        percentage.quantize(
            Decimal("1"),
            rounding=ROUND_HALF_UP,
        )
    )


# ============================================================
# Matching
# ============================================================

def _split_skills(
    required: List[str],
    candidate: List[str],
) -> Tuple[List[str], List[str]]:
    """
    Required skills the candidate demonstrates, and those they do not.

    Exact canonical equality only. A related skill never lands in the
    matched list; see ``_find_related``.
    """

    candidate_keys = {normalize_text(skill) for skill in candidate}

    matched = [
        skill for skill in required
        if normalize_text(skill) in candidate_keys
    ]

    missing = [
        skill for skill in required
        if normalize_text(skill) not in candidate_keys
    ]

    return matched, missing


def _find_related(
    missing: List[str],
    candidate: List[str],
) -> List[str]:
    """
    Candidate skills that are adjacent to something the job wants but
    the CV does not demonstrate.

    Reported separately and deliberately excluded from the percentage.
    A candidate who knows Terraform has useful background for a job
    asking for Infrastructure as Code, but it is not the same claim,
    and quietly counting it as one would overstate the CV to the
    recruiter.
    """

    related_lookup = _build_related_lookup()

    candidate_by_key = {
        normalize_text(skill): skill for skill in candidate
    }

    found: List[str] = []
    seen: Set[str] = set()

    for missing_skill in missing:

        for related_skill in related_lookup.get(
            normalize_text(missing_skill),
            [],
        ):

            key = normalize_text(related_skill)

            if key in candidate_by_key and key not in seen:
                seen.add(key)
                found.append(candidate_by_key[key])

    return found


# ============================================================
# Public entry point
# ============================================================

def match_candidate_to_job(
    required_skills: List[str],
    candidate_skills: List[str],
) -> dict:
    """
    Score one CV's skills against one job's required skills.

    :param required_skills: what the recruiter put on the job. Must not
        be empty - a job with no stated requirements has nothing to
        match against, and returning 0% for it would read as a uniformly
        terrible field of candidates. ``ValueError`` instead, which the
        API turns into a 400 and the backend reports as "this job is not
        ready for applications".
    :param candidate_skills: skills from the CV analysis stored against
        the application. May be empty: a CV with no extractable skills
        is a real 0% against a job that does state requirements.

    :returns: ``match_percentage``, ``matched_skills``,
        ``related_skills``, ``missing_skills``, ``required_skill_count``
        and the canonicalized ``candidate_skills``.
    """

    alias_lookup = build_alias_lookup()

    required = _canonical_unique(required_skills, alias_lookup)

    if not required:
        raise ValueError(
            "This job has no required skills, so applications "
            "cannot be matched against it."
        )

    candidate = _canonical_unique(candidate_skills, alias_lookup)

    matched, missing = _split_skills(required, candidate)

    related = _find_related(missing, candidate)

    return {
        "match_percentage": calculate_match_percentage(
            len(matched),
            len(required),
        ),
        "matched_skills": matched,
        "related_skills": related,
        "missing_skills": missing,
        "required_skill_count": len(required),
        "candidate_skills": candidate,
    }
