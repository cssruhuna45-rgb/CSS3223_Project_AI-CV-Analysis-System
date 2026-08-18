from fastapi import APIRouter, HTTPException

from app.interview.schemas import (
    InterviewQuestionRequest,
    InterviewQuestionResponse,
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewAnswerRequest,
    InterviewAnswerResponse,
    InterviewFinishRequest,
    InterviewFinishResponse,
)

from app.interview.session_manager import (
    create_session,
    get_session,
    add_question,
    add_answer,
    finish_session,
)

from app.interview.question_generator import generate_next_question


router = APIRouter(
    prefix="/api/v1/interview",
    tags=["Interview"],
)


# =========================================================
# START INTERVIEW
# =========================================================

@router.post(
    "/start",
    response_model=InterviewStartResponse,
)
def start_interview(
    request: InterviewStartRequest,
):

    session = create_session(
        request.job_description,
        request.candidate_resume or "",
    )

    question_request = InterviewQuestionRequest(
        session_id=session.session_id,
        job_description=request.job_description,
        candidate_resume=request.candidate_resume or "",
        last_candidate_answer="",
        previous_questions=[],
        question_number=1,
    )

    question = generate_next_question(
        question_request
    )

    add_question(
        session.session_id,
        question.question,
    )

    return InterviewStartResponse(
        session_id=session.session_id,
        question=question,
    )


# =========================================================
# GET INTERVIEW SESSION
# =========================================================

@router.get(
    "/{session_id}",
)
def get_interview(
    session_id: str,
):

    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found.",
        )

    return session


# =========================================================
# SUBMIT ANSWER + GENERATE NEXT QUESTION
# =========================================================

@router.post(
    "/{session_id}/answer",
    response_model=InterviewAnswerResponse,
)
def submit_answer(
    session_id: str,
    request: InterviewAnswerRequest,
):

    if request.session_id != session_id:
        raise HTTPException(
            status_code=400,
            detail="Session ID mismatch.",
        )

    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found.",
        )

    if session.status != "active":
        raise HTTPException(
            status_code=400,
            detail="Interview session is not active.",
        )

    # Save candidate answer
    add_answer(
        session_id,
        request.answer,
    )

    # Get updated session
    session = get_session(session_id)

    # Generate next question
    question_request = InterviewQuestionRequest(
        session_id=session.session_id,
        job_description=session.job_description,
        candidate_resume=session.candidate_resume or "",
        last_candidate_answer=request.answer,
        previous_questions=session.questions,
        question_number=session.current_question_number,
    )

    next_question = generate_next_question(
        question_request
    )

    # Save generated question
    add_question(
        session_id,
        next_question.question,
    )

    return InterviewAnswerResponse(
        session_id=session_id,
        question=next_question,
    )


# =========================================================
# FINISH INTERVIEW
# =========================================================

@router.post(
    "/{session_id}/finish",
    response_model=InterviewFinishResponse,
)
def finish_interview(
    session_id: str,
    request: InterviewFinishRequest,
):

    if request.session_id != session_id:
        raise HTTPException(
            status_code=400,
            detail="Session ID mismatch.",
        )

    session = get_session(session_id)

    if session is None:
        raise HTTPException(
            status_code=404,
            detail="Interview session not found.",
        )

    finished_session = finish_session(
        session_id
    )

    return InterviewFinishResponse(
        session_id=session_id,
        status=finished_session.status,
        total_questions=len(
            finished_session.questions
        ),
    )