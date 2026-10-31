# app/skill_gap/normalization.py

"""
Skill text normalization and alias canonicalization.

Shared by the two things that compare skills:

- ``analyzer.py``, which scores a CV against a predefined job field
  from the catalogue;
- ``matcher.py``, which scores a CV against the skills one recruiter
  actually typed on their job.

Both have to agree on what "Java" and "java " and "golang" mean, so
the rules live here once rather than in each of them.

Nothing in here calls a model. Given the same inputs it returns the
same answer every time, which is what makes a stored match percentage
reproducible months after it was computed.
"""

from typing import Dict

from app.skill_gap.skill_catalog import SKILL_ALIASES


def normalize_text(value: str) -> str:
    """
    Normalize text for deterministic comparison.

    Trims, lower-cases, and folds the punctuation that the same skill
    is commonly written with: en/em dashes to a hyphen, underscores to
    spaces.
    """

    if not value:
        return ""

    return (
        value.strip()
        .lower()
        .replace("–", "-")
        .replace("—", "-")
        .replace("_", " ")
    )


def build_alias_lookup() -> Dict[str, str]:
    """
    Build reverse alias lookup.

    Example:

        "golang" -> "Go"
        "go (golang)" -> "Go"
        "k8s" -> "Kubernetes"
        "k8" -> "Kubernetes"
        "amazon web services" -> "AWS"

    The mapping is the controlled, explainable one in
    ``skill_catalog.SKILL_ALIASES``: a recruiter can be told exactly
    why a CV skill counted for a requirement.
    """

    lookup: Dict[str, str] = {}

    for canonical_skill, aliases in SKILL_ALIASES.items():

        canonical_key = normalize_text(canonical_skill)

        lookup[canonical_key] = canonical_skill

        for alias in aliases:

            alias_key = normalize_text(alias)

            if alias_key:
                lookup[alias_key] = canonical_skill

    return lookup


def canonicalize_skill(
    skill: str,
    alias_lookup: Dict[str, str],
) -> str:
    """
    Convert a skill to its canonical catalog name.

    Unknown skills are preserved in normalized form rather than
    dropped: a recruiter may require something the catalogue has never
    heard of, and it still has to be matchable against a CV.
    """

    if not skill:
        return ""

    normalized = normalize_text(skill)

    if not normalized:
        return ""

    return alias_lookup.get(
        normalized,
        skill.strip(),
    )
