"""
Assessment endpoints, kept out of main.py so the recruiter work does
not grow the shared interview module. main.py only includes the router.

Reached from Spring alone (internal API key), never from a browser:
Spring checks that the job belongs to the signed-in recruiter and sends
the job's stored skills and description.
"""

import os

from fastapi import APIRouter, HTTPException, status

from app.ai_errors import (
    failed_error,
    is_rate_limit_error,
    rate_limit_error,
    unavailable_error,
)
from app.assessment.generator import generate_questions
from app.assessment.schemas import (
    QuestionGenerationRequest,
    QuestionGenerationResponse,
)


router = APIRouter(tags=["Recruiter Assessment"])


@router.post(
    "/api/v1/assessment/questions/generate",
    response_model=QuestionGenerationResponse,
)
def generate_assessment_questions(req: QuestionGenerationRequest):
    """
    Draft interview questions and key points for a job.

    Returns the questions that passed every per-question check, and in
    `issues` whatever still stops the set being approved.
    """

    if not os.getenv("GEMINI_API_KEY"):
        raise unavailable_error()

    try:
        result = generate_questions(
            job_title=req.job_title,
            job_field=req.job_field,
            job_description=req.job_description,
            required_skills=req.required_skills,
            question_count=req.question_count,
            existing_questions=req.existing_questions,
            difficulty=req.difficulty,
            topic=req.topic,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        print(f"[AssessmentAPI] Error: {e}")

        if is_rate_limit_error(e):
            raise rate_limit_error(e)

        raise failed_error("We couldn't write questions for this job right now. Please try again.")

    print(
        "[AssessmentAPI] Drafted "
        f"{len(result['questions'])} of {req.question_count} question(s); "
        f"{len(result['issues'])} issue(s)."
    )

    return QuestionGenerationResponse(**result)
