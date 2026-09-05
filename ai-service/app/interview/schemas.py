from typing import List, Optional

from pydantic import BaseModel, Field


class InterviewQuestionRequest(BaseModel):
    session_id: str = Field(
        ...,
        description="Unique interview session ID.",
    )

    job_description: str = Field(
        ...,
        min_length=20,
        description="Job description for the interview.",
    )

    candidate_resume: Optional[str] = Field(
        default="",
        description="Candidate resume text.",
    )

    last_candidate_answer: Optional[str] = Field(
        default="",
        description="Candidate's answer to the previous question.",
    )

    previous_questions: List[str] = Field(
        default_factory=list,
        description="Questions already asked during this interview.",
    )

    question_number: int = Field(
        default=1,
        ge=1,
        description="Current question number.",
    )


class InterviewQuestionResponse(BaseModel):
    session_id: str

    question: str

    category: str

    difficulty: str

    is_follow_up: bool

    reason: str

class InterviewStartRequest(BaseModel):
    job_description: str = Field(
        ...,
        min_length=20,
        description="Job description for the interview.",
    )

    candidate_resume: Optional[str] = Field(
        default="",
        description="Candidate resume text.",
    )

    job_field: Optional[str] = Field(
        default="",
        description=(
            "Selected target job field, for example "
            "devops_cloud."
        ),
    )

    matched_skills: List[str] = Field(
        default_factory=list,
        description="Skills exactly matched to the target job field.",
    )

    related_skills: List[str] = Field(
        default_factory=list,
        description="Candidate skills related to required skills.",
    )

    missing_skills: List[str] = Field(
        default_factory=list,
        description="Required skills missing from the candidate resume.",
    )

    additional_skills: List[str] = Field(
        default_factory=list,
        description="Candidate skills outside the target job field requirements.",
    )


class InterviewStartResponse(BaseModel):
    session_id: str
    question: InterviewQuestionResponse


class InterviewAnswerRequest(BaseModel):
    session_id: str = Field(
        ...,
        description="Interview session ID.",
    )

    answer: str = Field(
        ...,
        min_length=1,
        description="Candidate's answer.",
    )


class InterviewAnswerResponse(BaseModel):
    session_id: str
    question: InterviewQuestionResponse


class ModelAnswerRequest(BaseModel):
    session_id: Optional[str] = Field(
        default="",
        description="Interview session ID, used to pick up the job field.",
    )

    question: str = Field(
        ...,
        min_length=5,
        description="The question the candidate just answered.",
    )

    answer: Optional[str] = Field(
        default="",
        description="What the candidate answered, for the gap list.",
    )

    job_field: Optional[str] = Field(
        default="",
        description=(
            "Target job field. Falls back to the session's field when "
            "not given."
        ),
    )


class ModelAnswerResponse(BaseModel):
    """
    The expected answer for one question, shown right after the
    candidate submits their own.
    """

    question: str

    model_answer: str = ""

    key_points: List[str] = Field(default_factory=list)

    missing_from_answer: List[str] = Field(
        default_factory=list,
        description="Concepts the candidate's answer did not cover.",
    )

    sources: List[str] = Field(
        default_factory=list,
        description="Knowledge base files the answer was drawn from.",
    )

    grounded: bool = Field(
        default=False,
        description=(
            "True when knowledge base passages backed the answer. False "
            "means it came from the model's general knowledge."
        ),
    )

    generated: bool = Field(
        default=False,
        description=(
            "False when the answer could not be produced. The UI then "
            "shows nothing rather than an empty panel."
        ),
    )

    error: str = Field(
        default="",
        description="Why generation failed, when it did.",
    )


class InterviewFinishRequest(BaseModel):
    session_id: str = Field(
        ...,
        description="Interview session ID.",
    )


class CategoryScore(BaseModel):
    key: str
    label: str
    score: int = Field(..., ge=0, le=100)


class QuestionEvaluation(BaseModel):
    question_number: int
    question: str
    answer: str
    score: int = Field(..., ge=0, le=100)

    verdict: str = Field(
        ...,
        description="strong, partial, weak or none.",
    )

    what_was_good: str = ""
    what_was_missing: str = ""


class InterviewFinishResponse(BaseModel):
    session_id: str
    status: str
    total_questions: int

    # ------------------------------------------------------------
    # Scorecard
    #
    # Produced by app.interview.evaluator at the end of the session.
    # ------------------------------------------------------------

    overall_score: int = Field(
        default=0,
        ge=0,
        le=100,
        description="Mean of the category scores.",
    )

    category_scores: List[CategoryScore] = Field(
        default_factory=list
    )

    strengths: List[str] = Field(
        default_factory=list
    )

    improvements: List[str] = Field(
        default_factory=list
    )

    per_question: List[QuestionEvaluation] = Field(
        default_factory=list
    )

    evaluated: bool = Field(
        default=False,
        description=(
            "False when grading could not run. The scores are then "
            "zeros and must not be shown as a real result."
        ),
    )

    evaluation_error: str = Field(
        default="",
        description="Why grading failed, when it did.",
    )