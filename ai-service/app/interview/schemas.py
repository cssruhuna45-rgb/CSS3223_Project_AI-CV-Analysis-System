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


class InterviewFinishRequest(BaseModel):
    session_id: str = Field(
        ...,
        description="Interview session ID.",
    )


class InterviewFinishResponse(BaseModel):
    session_id: str
    status: str
    total_questions: int