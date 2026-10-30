from typing import List, Optional

from pydantic import BaseModel, Field


class QuestionGenerationRequest(BaseModel):
    """
    What Spring sends to draft a job's questions.

    There is deliberately no CV field. A job interview asks every
    candidate the same questions, so nothing about one candidate may
    shape them.
    """

    job_title: str = Field(default="", max_length=150)

    job_field: str = Field(default="", max_length=64)

    job_description: str = Field(..., min_length=20)

    required_skills: List[str] = Field(
        ...,
        min_length=1,
        description="The recruiter's required skills for the job.",
    )

    question_count: int = Field(
        ...,
        ge=1,
        le=10,
        description=(
            "How many questions to write: the job's chosen 5-10 for a "
            "full set, or 1 to replace a single question."
        ),
    )

    existing_questions: List[str] = Field(
        default_factory=list,
        description=(
            "Questions already in the set, which a replacement must not "
            "repeat."
        ),
    )


class GeneratedQuestion(BaseModel):
    question: str
    difficulty: str
    topic: str = ""
    key_points: List[str] = Field(default_factory=list)


class QuestionGenerationResponse(BaseModel):
    questions: List[GeneratedQuestion] = Field(default_factory=list)

    issues: List[str] = Field(
        default_factory=list,
        description=(
            "What still stops this set being approved, for the "
            "recruiter to fix. Empty when it passes every check."
        ),
    )

    grounded: bool = Field(
        default=False,
        description="True when knowledge base passages informed the questions.",
    )

    sources: List[str] = Field(default_factory=list)


# ============================================================
# Fixed-question interview contract
#
# Spring builds this from the approved questions in its database and
# adds it to /api/v1/interview/start. The browser never supplies it:
# Spring removes any copy the browser sent.
# ============================================================

class FixedQuestion(BaseModel):
    question_id: Optional[int] = None

    position: int = Field(..., ge=1)

    question: str = Field(..., min_length=1)

    difficulty: str = "medium"

    topic: str = ""

    key_points: List[str] = Field(default_factory=list)
