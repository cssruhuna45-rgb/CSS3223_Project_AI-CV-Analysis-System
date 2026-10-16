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


# ============================================================
# CV Review
#
# Separate from ResumeAnalysis*: that extracts what the CV says, this
# judges how well it says it, against
# documents/cv_resume_standards_guide.md
# ============================================================

class CVReviewRequest(BaseModel):
    resume_id: int = Field(
        ...,
        description="Unique resume ID."
    )

    resume_text: str = Field(
        ...,
        min_length=1,
        description="Extracted resume text."
    )


class CVCheck(BaseModel):
    key: str
    label: str

    passed: bool = Field(
        ...,
        description="Decided in Python, not by the model."
    )

    detail: str = ""

    weight: int = Field(
        default=1,
        description="Contribution of this rule to the score."
    )


class CVImprovement(BaseModel):
    issue: str
    fix: str = ""
    example: str = ""


class CVReviewResponse(BaseModel):
    resume_id: int

    score: int = Field(
        ...,
        ge=0,
        le=100,
        description=(
            "Weighted pass rate over the objective checks. Computed in "
            "Python, so the same CV always scores the same."
        ),
    )

    checks: List[CVCheck] = Field(default_factory=list)

    weak_bullets: List[str] = Field(
        default_factory=list,
        description=(
            "Bullets with a weak opener or no number, chosen in Python, "
            "offered to the bullet tuner."
        ),
    )

    summary: str = ""
    strengths: List[str] = Field(default_factory=list)
    improvements: List[CVImprovement] = Field(default_factory=list)

    reviewed: bool = Field(
        default=False,
        description=(
            "False when the written feedback could not be generated. "
            "The checks and score are still valid."
        ),
    )

    review_error: str = ""


# ============================================================
# CV bullet tuner (Google XYZ form)
# ============================================================

class BulletTuneRequest(BaseModel):
    bullet: str = Field(
        ...,
        min_length=1,
        max_length=400,
        description="One CV bullet point to rewrite.",
    )

    job_field: str = Field(
        default="",
        description="Target role, so the wording suits it.",
    )


class BulletGap(BaseModel):
    placeholder: str = Field(
        ...,
        description='The bracketed gap as it appears in the draft, e.g. "[how many APIs?]".',
    )
    question: str
    hint: str = ""


class BulletTuneResponse(BaseModel):
    original: str

    draft: str = Field(
        ...,
        description=(
            "The bullet in XYZ form. Every fact the original did not give "
            "is a bracketed gap for the candidate to fill."
        ),
    )

    gaps: List[BulletGap] = Field(default_factory=list)

    why: List[str] = Field(
        default_factory=list,
        description="Why the original bullet was weak.",
    )

    invented_numbers_removed: int = Field(
        default=0,
        description=(
            "Numbers the model wrote that the original did not contain, "
            "replaced with gaps by the Python check."
        ),
    )
