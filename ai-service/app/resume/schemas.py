from typing import List
from pydantic import BaseModel, Field


# ============================================================
# Resume Analysis Request
# ============================================================

class ResumeAnalysisRequest(BaseModel):
    resume_id: int = Field(
        ...,
        description="Unique resume ID."
    )

    resume_text: str = Field(
        ...,
        min_length=1,
        description="Extracted resume text."
    )


# ============================================================
# Experience
# ============================================================

class ExperienceItem(BaseModel):
    company: str = ""
    role: str = ""
    duration: str = ""
    description: str = ""


# ============================================================
# Education
# ============================================================

class EducationItem(BaseModel):
    institution: str = ""
    degree: str = ""
    field: str = ""
    year: str = ""


# ============================================================
# Projects
# ============================================================

class ProjectItem(BaseModel):
    name: str = ""
    description: str = ""
    technologies: List[str] = Field(
        default_factory=list
    )


# ============================================================
# Recommended Job Field
# ============================================================

class RecommendedJobField(BaseModel):
    field: str = Field(
        ...,
        description="Internal job field identifier."
    )

    name: str = Field(
        ...,
        description="Human-readable job field name."
    )

    match_percentage: int = Field(
        ...,
        ge=0,
        le=100,
        description="Percentage match between resume skills and this job field."
    )


# ============================================================
# Resume Analysis Response
# ============================================================

class ResumeAnalysisResponse(BaseModel):
    resume_id: int

    summary: str

    skills: List[str]

    experience: List[ExperienceItem]

    education: List[EducationItem]

    projects: List[ProjectItem]

    certifications: List[str]

    recommended_job_fields: List[RecommendedJobField]