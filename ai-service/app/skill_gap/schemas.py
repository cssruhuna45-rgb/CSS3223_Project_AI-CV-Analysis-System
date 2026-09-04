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