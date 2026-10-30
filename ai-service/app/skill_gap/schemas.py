from typing import List

from pydantic import BaseModel, Field


# ============================================================
# SKILL GAP REQUEST
# ============================================================


class SkillGapRequest(BaseModel):

    resume_id: int = Field(
        ...,
        description="Unique resume ID.",
    )

    job_field: str = Field(
        ...,
        min_length=1,
        description=(
            "Target job field identifier from the "
            "job field catalog, for example devops_cloud."
        ),
    )

    candidate_resume: str = Field(
        ...,
        min_length=20,
        description="Candidate resume text.",
    )


# ============================================================
# SKILL GAP RESPONSE
# ============================================================


class SkillGapResponse(BaseModel):

    resume_id: int

    job_field: str

    job_field_name: str

    required_skills: List[str]

    candidate_skills: List[str]

    matched_skills: List[str]

    related_skills: List[str]

    missing_skills: List[str]

    additional_skills: List[str]

    match_percentage: int

    gap_percentage: int

    summary: str

    recommendations: List[str]


# ============================================================
# SKILL MATCH (recruiter's own required skills)
#
# Deterministic, no model. Used once per application, when it is
# submitted, and never again when a recruiter opens an applicant list.
# ============================================================


class SkillMatchRequest(BaseModel):

    required_skills: List[str] = Field(
        ...,
        min_length=1,
        description=(
            "The skills the recruiter put on the job. Not the "
            "catalogue's skills for a job field: a recruiter's "
            "requirements are their own."
        ),
    )

    candidate_skills: List[str] = Field(
        default_factory=list,
        description=(
            "Skills from the CV analysis already stored against the "
            "application. Empty is valid and scores 0%."
        ),
    )


class SkillMatchResponse(BaseModel):

    match_percentage: int = Field(
        ...,
        ge=0,
        le=100,
        description=(
            "Share of required skills exactly matched, rounded "
            "half-up. Decision support only: it must never shortlist "
            "or reject a candidate on its own."
        ),
    )

    matched_skills: List[str]

    related_skills: List[str] = Field(
        ...,
        description=(
            "Candidate skills adjacent to a missing requirement. "
            "Excluded from match_percentage by design."
        ),
    )

    missing_skills: List[str]

    required_skill_count: int

    candidate_skills: List[str]