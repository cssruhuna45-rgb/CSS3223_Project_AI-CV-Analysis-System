from typing import List

from pydantic import BaseModel, Field


class SkillGapRequest(BaseModel):
    job_description: str = Field(
        ...,
        min_length=20,
        description="Target job description.",
    )

    candidate_resume: str = Field(
        ...,
        min_length=20,
        description="Candidate resume text.",
    )


class SkillGapResponse(BaseModel):
    required_skills: List[str]
    candidate_skills: List[str]
    matched_skills: List[str]
    missing_skills: List[str]
    additional_skills: List[str]
    match_percentage: int
    summary: str
    recommendations: List[str]