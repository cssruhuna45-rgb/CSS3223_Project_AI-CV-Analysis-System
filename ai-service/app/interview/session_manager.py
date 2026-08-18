from dataclasses import dataclass, field
from typing import List
from uuid import uuid4


@dataclass
class InterviewSession:
    session_id: str
    job_description: str
    candidate_resume: str = ""

    questions: List[str] = field(default_factory=list)
    answers: List[str] = field(default_factory=list)

    current_question_number: int = 1
    status: str = "active"


_sessions: dict[str, InterviewSession] = {}


def create_session(
    job_description: str,
    candidate_resume: str = "",
) -> InterviewSession:

    session_id = str(uuid4())

    session = InterviewSession(
        session_id=session_id,
        job_description=job_description,
        candidate_resume=candidate_resume,
    )

    _sessions[session_id] = session

    print(
        f"[InterviewSession] Created session: {session_id}"
    )

    return session


def get_session(session_id: str) -> InterviewSession:

    session = _sessions.get(session_id)

    if session is None:
        raise ValueError(
            f"Interview session '{session_id}' was not found."
        )

    return session


def add_question(
    session_id: str,
    question: str,
) -> InterviewSession:

    session = get_session(session_id)

    session.questions.append(question)

    return session


def add_answer(
    session_id: str,
    answer: str,
) -> InterviewSession:

    session = get_session(session_id)

    session.answers.append(answer)

    session.current_question_number += 1

    return session


def finish_session(
    session_id: str,
) -> InterviewSession:

    session = get_session(session_id)

    session.status = "completed"

    print(
        f"[InterviewSession] Finished session: {session_id}"
    )

    return session