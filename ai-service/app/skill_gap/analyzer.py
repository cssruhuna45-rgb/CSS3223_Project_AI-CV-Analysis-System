# app/skill_gap/analyzer.py

from typing import List, Set

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from app.skill_gap.schemas import (
    SkillGapRequest,
    SkillGapResponse,
)

from app.skill_gap.skill_catalog import (
    get_job_field,
    get_required_skills,
    get_skill_aliases,
    get_related_skills,
    SKILL_ALIASES,
    RELATED_SKILLS,
)


# ============================================================
# Gemini Configuration
# ============================================================

MODEL_NAME = "gemini-flash-lite-latest"


# ============================================================
# Gemini Extraction Schema
# ============================================================

class CandidateSkillExtraction(BaseModel):
    """
    Structured output used only for extracting factual
    skills from the candidate resume.

    Gemini does NOT calculate:
    - match percentage
    - gap percentage
    - missing skills
    - recommendations
    """

    skills: List[str] = Field(
        default_factory=list,
        description=(
            "Technical skills explicitly present in "
            "the candidate resume."
        ),
    )


# ============================================================
# Gemini Model
# ============================================================

def _get_llm():
    """
    Create Gemini model for factual skill extraction only.
    """

    return ChatGoogleGenerativeAI(
        model=MODEL_NAME,
        temperature=0,
    )


# ============================================================
# Candidate Skill Extraction
# ============================================================

def _extract_candidate_skills(
    resume_text: str,
) -> List[str]:
    """
    Extract technical skills from the candidate resume.

    Gemini is used only as an extraction engine.

    It must NOT:
    - calculate scores
    - decide whether a skill is missing
    - calculate percentages
    - make recommendations
    """

    if not resume_text or not resume_text.strip():
        return []

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                """
You are a resume information extraction system.

Your ONLY task is to extract technical skills that are
explicitly mentioned in the candidate resume.

Return only skills that are actually present in the resume.

Examples of valid skills:
- Java
- Python
- Go
- C++
- Linux
- Docker
- Kubernetes
- AWS
- Terraform
- Git
- GitHub Actions
- PostgreSQL
- React
- Spring Boot
- CI/CD

Do NOT:
- infer skills that are not explicitly supported
- calculate a match percentage
- calculate a skill gap
- identify missing skills
- create recommendations
- evaluate the candidate
- assign scores

If a technology appears in the projects section,
it may also be extracted as a skill.

Return a clean list of technical skills.
""",
            ),
            (
                "human",
                """
Candidate Resume:

{resume_text}
""",
            ),
        ]
    )

    llm = _get_llm()

    structured_llm = llm.with_structured_output(
        CandidateSkillExtraction
    )

    chain = prompt | structured_llm

    result = chain.invoke(
        {
            "resume_text": resume_text,
        }
    )

    if not result:
        return []

    return result.skills or []


# ============================================================
# Text Normalization
# ============================================================

def _normalize_text(value: str) -> str:
    """
    Normalize text for deterministic comparison.
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


# ============================================================
# Alias Lookup
# ============================================================

def _build_alias_lookup():
    """
    Build reverse alias lookup.

    Example:

        "golang" -> "Go"
        "go (golang)" -> "Go"
        "k8s" -> "Kubernetes"
        "k8" -> "Kubernetes"
        "amazon web services" -> "AWS"
    """

    lookup = {}

    for canonical_skill, aliases in SKILL_ALIASES.items():

        canonical_key = _normalize_text(
            canonical_skill
        )

        lookup[canonical_key] = canonical_skill

        for alias in aliases:

            alias_key = _normalize_text(
                alias
            )

            if alias_key:
                lookup[alias_key] = canonical_skill

    return lookup


# ============================================================
# Canonicalize Skill
# ============================================================

def _canonicalize_skill(
    skill: str,
    alias_lookup: dict,
) -> str:
    """
    Convert a skill to its canonical catalog name.

    Unknown skills are preserved in normalized form.
    """

    if not skill:
        return ""

    normalized = _normalize_text(skill)

    if not normalized:
        return ""

    return alias_lookup.get(
        normalized,
        skill.strip(),
    )


# ============================================================
# Build Candidate Skill Set
# ============================================================

def _build_candidate_skill_set(
    extracted_skills: List[str],
) -> Set[str]:
    """
    Convert extracted candidate skills into canonical skills.
    """

    alias_lookup = _build_alias_lookup()

    candidate_skills = set()

    for skill in extracted_skills:

        canonical = _canonicalize_skill(
            skill,
            alias_lookup,
        )

        if canonical:
            candidate_skills.add(
                canonical
            )

    return candidate_skills


# ============================================================
# Canonicalize Required Skills
# ============================================================

def _build_required_skill_set(
    required_skills: List[str],
) -> Set[str]:
    """
    Convert required job-field skills into canonical names.
    """

    alias_lookup = _build_alias_lookup()

    result = set()

    for skill in required_skills:

        canonical = _canonicalize_skill(
            skill,
            alias_lookup,
        )

        if canonical:
            result.add(canonical)

    return result


# ============================================================
# Calculate Exact Matches
# ============================================================

def _calculate_exact_matches(
    required_skills: Set[str],
    candidate_skills: Set[str],
) -> Set[str]:
    """
    Calculate exact canonical skill matches.

    IMPORTANT:
    Related skills are NOT counted here.

    Example:

        Required:
            Infrastructure as Code

        Candidate:
            Terraform

    Terraform does NOT become an exact match.
    """

    return (
        required_skills
        .intersection(candidate_skills)
    )


# ============================================================
# Calculate Missing Skills
# ============================================================

def _calculate_missing_skills(
    required_skills: Set[str],
    matched_skills: Set[str],
) -> Set[str]:
    """
    Calculate required skills not exactly matched.
    """

    return (
        required_skills
        - matched_skills
    )


# ============================================================
# Calculate Related Skills
# ============================================================

def _calculate_related_skills(
    missing_skills: Set[str],
    candidate_skills: Set[str],
) -> Set[str]:
    """
    Identify missing required skills that have related
    candidate skills.

    Related skills are reported separately and DO NOT
    increase the exact match percentage.

    Example:

        Required:
            Infrastructure as Code

        Candidate:
            Terraform

    Result:

        missing_skills:
            Infrastructure as Code

        related_skills:
            Terraform
    """

    related = set()

    for missing_skill in missing_skills:

        related_candidates = (
            get_related_skills(
                missing_skill
            )
        )

        for candidate_skill in candidate_skills:

            candidate_normalized = (
                _normalize_text(
                    candidate_skill
                )
            )

            for related_skill in related_candidates:

                related_normalized = (
                    _normalize_text(
                        related_skill
                    )
                )

                if (
                    candidate_normalized
                    == related_normalized
                ):
                    related.add(
                        candidate_skill
                    )

    return related


# ============================================================
# Calculate Additional Skills
# ============================================================

def _calculate_additional_skills(
    candidate_skills: Set[str],
    required_skills: Set[str],
) -> Set[str]:
    """
    Candidate skills that are not required for the
    selected job field.
    """

    return (
        candidate_skills
        - required_skills
    )


# ============================================================
# Calculate Match Percentage
# ============================================================

def _calculate_match_percentage(
    required_skills: Set[str],
    matched_skills: Set[str],
) -> int:
    """
    Calculate deterministic exact-match percentage.

    Formula:

        matched / required * 100

    The result is rounded to the nearest integer.
    """

    if not required_skills:
        return 0

    percentage = (
        len(matched_skills)
        / len(required_skills)
    ) * 100

    return round(percentage)


# ============================================================
# Generate Summary
# ============================================================

def _generate_summary(
    job_field_name: str,
    required_count: int,
    matched_count: int,
    related_count: int,
    missing_count: int,
    match_percentage: int,
) -> str:
    """
    Generate deterministic summary.
    """

    if required_count == 0:

        return (
            f"No required skills are currently defined "
            f"for the {job_field_name} job field."
        )

    if match_percentage >= 80:

        level = "strong"

    elif match_percentage >= 60:

        level = "moderate"

    elif match_percentage >= 40:

        level = "developing"

    else:

        level = "limited"

    summary = (
        f"The candidate has a {level} skill match for "
        f"{job_field_name}. "
        f"{matched_count} of {required_count} required "
        f"skills are exact matches "
        f"({match_percentage}%)."
    )

    if related_count > 0:

        summary += (
            f" {related_count} related skill"
            f"{'s' if related_count != 1 else ''} "
            f"may provide partial background."
        )

    if missing_count > 0:

        summary += (
            f" {missing_count} required skill"
            f"{'s' if missing_count != 1 else ''} "
            f"are not directly demonstrated."
        )

    return summary


# ============================================================
# Generate Recommendations
# ============================================================

def _generate_recommendations(
    missing_skills: Set[str],
    related_skills: Set[str],
) -> List[str]:
    """
    Generate deterministic skill-development recommendations.
    """

    recommendations = []

    if missing_skills:

        sorted_missing = sorted(
            missing_skills
        )

        for skill in sorted_missing[:5]:

            recommendations.append(
                f"Develop practical experience in {skill}."
            )

    if related_skills:

        recommendations.append(
            "Build on related skills through "
            "hands-on projects and real-world scenarios."
        )

    if not recommendations:

        recommendations.append(
            "Continue strengthening the existing "
            "skills through practical projects."
        )

    return recommendations


# ============================================================
# Validate Job Field
# ============================================================

def _validate_job_field(
    job_field: str,
):
    """
    Validate that the requested job field exists
    in the predefined catalog.
    """

    if not job_field:
        raise ValueError(
            "Job field cannot be empty."
        )

    try:

        job = get_job_field(
            job_field
        )

    except Exception:

        job = None

    if not job:

        raise ValueError(
            f"Unknown job field: {job_field}"
        )

    return job


# ============================================================
# Main Skill Gap Analyzer
# ============================================================

def analyze_skill_gap(
    request: SkillGapRequest,
) -> SkillGapResponse:
    """
    Analyze candidate skill gap against a predefined
    job field.

    IMPORTANT ARCHITECTURE:

        Gemini
            ↓
        Extract factual candidate skills
            ↓
        Python
            ↓
        Canonicalize skills
            ↓
        skill_catalog.py
            ↓
        Exact matching
            ↓
        Match percentage
            ↓
        Gap percentage

    Gemini does NOT calculate the score.
    """

    # --------------------------------------------------------
    # Validate Job Field
    # --------------------------------------------------------

    job = _validate_job_field(
        request.job_field
    )

    # --------------------------------------------------------
    # Get Job Field Name
    # --------------------------------------------------------

    job_field_name = job.get(
        "name",
        request.job_field,
    )

    # --------------------------------------------------------
    # Get Required Skills
    # --------------------------------------------------------

    required_skill_list = (
        get_required_skills(
            request.job_field
        )
    )

    required_skills = (
        _build_required_skill_set(
            required_skill_list
        )
    )

    # --------------------------------------------------------
    # Extract Candidate Skills
    # --------------------------------------------------------

    extracted_skills = (
        _extract_candidate_skills(
            request.candidate_resume
        )
    )

    # --------------------------------------------------------
    # Canonical Candidate Skills
    # --------------------------------------------------------

    candidate_skills = (
        _build_candidate_skill_set(
            extracted_skills
        )
    )

    # --------------------------------------------------------
    # Exact Matches
    # --------------------------------------------------------

    matched_skills = (
        _calculate_exact_matches(
            required_skills,
            candidate_skills,
        )
    )

    # --------------------------------------------------------
    # Missing Skills
    # --------------------------------------------------------

    missing_skills = (
        _calculate_missing_skills(
            required_skills,
            matched_skills,
        )
    )

    # --------------------------------------------------------
    # Related Skills
    # --------------------------------------------------------

    related_skills = (
        _calculate_related_skills(
            missing_skills,
            candidate_skills,
        )
    )

    # --------------------------------------------------------
    # Additional Skills
    # --------------------------------------------------------

    additional_skills = (
        _calculate_additional_skills(
            candidate_skills,
            required_skills,
        )
    )

    # --------------------------------------------------------
    # Match Percentage
    # --------------------------------------------------------

    match_percentage = (
        _calculate_match_percentage(
            required_skills,
            matched_skills,
        )
    )

    # --------------------------------------------------------
    # Gap Percentage
    # --------------------------------------------------------

    gap_percentage = (
        100 - match_percentage
    )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    summary = _generate_summary(
        job_field_name=job_field_name,
        required_count=len(
            required_skills
        ),
        matched_count=len(
            matched_skills
        ),
        related_count=len(
            related_skills
        ),
        missing_count=len(
            missing_skills
        ),
        match_percentage=match_percentage,
    )

    # --------------------------------------------------------
    # Recommendations
    # --------------------------------------------------------

    recommendations = (
        _generate_recommendations(
            missing_skills=missing_skills,
            related_skills=related_skills,
        )
    )

    # --------------------------------------------------------
    # Logging
    # --------------------------------------------------------

    print(
        f"[SkillGapAnalyzer] "
        f"Job Field: {job_field_name}"
    )

    print(
        f"[SkillGapAnalyzer] "
        f"Required Skills: {len(required_skills)}"
    )

    print(
        f"[SkillGapAnalyzer] "
        f"Candidate Skills: {len(candidate_skills)}"
    )

    print(
        f"[SkillGapAnalyzer] "
        f"Matched Skills: {len(matched_skills)}"
    )

    print(
        f"[SkillGapAnalyzer] "
        f"Related Skills: {len(related_skills)}"
    )

    print(
        f"[SkillGapAnalyzer] "
        f"Missing Skills: {len(missing_skills)}"
    )

    print(
        f"[SkillGapAnalyzer] "
        f"Match Percentage: {match_percentage}%"
    )

    print(
        f"[SkillGapAnalyzer] "
        f"Gap Percentage: {gap_percentage}%"
    )

    # --------------------------------------------------------
    # Return Response
    # --------------------------------------------------------

    return SkillGapResponse(
        resume_id=request.resume_id,

        job_field=request.job_field,

        job_field_name=job_field_name,

        required_skills=sorted(
            required_skills
        ),

        candidate_skills=sorted(
            candidate_skills
        ),

        matched_skills=sorted(
            matched_skills
        ),

        related_skills=sorted(
            related_skills
        ),

        missing_skills=sorted(
            missing_skills
        ),

        additional_skills=sorted(
            additional_skills
        ),

        match_percentage=match_percentage,

        gap_percentage=gap_percentage,

        summary=summary,

        recommendations=recommendations,
    )