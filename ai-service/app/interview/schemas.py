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