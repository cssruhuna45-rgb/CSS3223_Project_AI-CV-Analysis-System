from dataclasses import dataclass, field
from typing import List
from uuid import uuid4


# ============================================================
# Interview Session
# ============================================================

@dataclass
class InterviewSession:

    session_id: str

    job_description: str

    candidate_resume: str = ""

    # --------------------------------------------------------
    # Interview history
    # --------------------------------------------------------

    questions: List[str] = field(
        default_factory=list
    )

    answers: List[str] = field(
        default_factory=list
    )

    # --------------------------------------------------------
    # Current interview state
    # --------------------------------------------------------

    current_question_number: int = 1

    status: str = "active"

    # --------------------------------------------------------
    # Adaptive interview state
    # --------------------------------------------------------

    current_difficulty: str = "medium"

    current_topic: str = ""

    current_topic_key: str = ""

    # --------------------------------------------------------
    # All topics already tested
    # --------------------------------------------------------

    topic_history: List[str] = field(
        default_factory=list
    )

    # --------------------------------------------------------
    # Consecutive weak/empty answers
    # --------------------------------------------------------

    weak_answer_streak: int = 0

    # --------------------------------------------------------
    # Last answer quality
    # --------------------------------------------------------

    last_answer_quality: str = "none"


# ============================================================
# In-memory session storage
# ============================================================

_sessions: dict[str, InterviewSession] = {}


# ============================================================
# CREATE SESSION
# ============================================================

def create_session(
    job_description: str,
    candidate_resume: str = "",
) -> InterviewSession:

    session_id = str(uuid4())

    session = InterviewSession(
        session_id=session_id,

        job_description=job_description,

        candidate_resume=candidate_resume,

        current_question_number=1,

        status="active",

        current_difficulty="medium",

        current_topic="",

        current_topic_key="",

        topic_history=[],

        weak_answer_streak=0,

        last_answer_quality="none",
    )

    _sessions[session_id] = session

    print(
        f"[InterviewSession] Created session: "
        f"{session_id}"
    )

    return session


# ============================================================
# GET SESSION
# ============================================================

def get_session(
    session_id: str,
) -> InterviewSession:

    session = _sessions.get(
        session_id
    )

    if session is None:

        raise ValueError(
            f"Interview session "
            f"'{session_id}' was not found."
        )

    return session


# ============================================================
# ADD QUESTION
# ============================================================

def add_question(
    session_id: str,
    question: str,
    difficulty: str | None = None,
    topic: str | None = None,
    topic_key: str | None = None,
) -> InterviewSession:

    session = get_session(
        session_id
    )

    # --------------------------------------------------------
    # Store question
    # --------------------------------------------------------

    session.questions.append(
        question
    )

    # --------------------------------------------------------
    # Update difficulty
    # --------------------------------------------------------

    if difficulty:

        session.current_difficulty = (
            difficulty
        )

    # --------------------------------------------------------
    # Update topic
    # --------------------------------------------------------

    if topic:

        session.current_topic = (
            topic
        )

        # Keep topic history unique
        if topic not in session.topic_history:

            session.topic_history.append(
                topic
            )

    # --------------------------------------------------------
    # Update topic key
    # --------------------------------------------------------

    if topic_key:

        session.current_topic_key = (
            topic_key
        )

    # --------------------------------------------------------
    # Debug
    # --------------------------------------------------------

    print(
        f"[InterviewSession] "
        f"Question #{len(session.questions)} "
        f"stored | "
        f"difficulty="
        f"{session.current_difficulty} | "
        f"topic="
        f"{session.current_topic}"
    )

    print(
        f"[InterviewSession] "
        f"Topic history="
        f"{session.topic_history}"
    )

    return session


# ============================================================
# ADD ANSWER
# ============================================================

def add_answer(
    session_id: str,
    answer: str,
    answer_quality: str | None = None,
) -> InterviewSession:

    session = get_session(
        session_id
    )

    # --------------------------------------------------------
    # Store answer
    # --------------------------------------------------------

    session.answers.append(
        answer
    )

    # --------------------------------------------------------
    # Store answer quality
    #
    # IMPORTANT:
    #
    # Weak streak is NOT modified here.
    #
    # main.py is responsible for adaptive streak
    # calculation.
    #
    # This prevents double increment.
    # --------------------------------------------------------

    if answer_quality:

        session.last_answer_quality = (
            answer_quality
        )

    # --------------------------------------------------------
    # Move to next question
    # --------------------------------------------------------

    session.current_question_number += 1

    # --------------------------------------------------------
    # Debug
    # --------------------------------------------------------

    print(
        f"[InterviewSession] "
        f"Answer saved | "
        f"quality="
        f"{session.last_answer_quality} | "
        f"weak_streak="
        f"{session.weak_answer_streak} | "
        f"next_question="
        f"{session.current_question_number}"
    )

    return session


# ============================================================
# UPDATE INTERVIEW STATE
# ============================================================

def update_interview_state(
    session_id: str,

    difficulty: str | None = None,

    topic: str | None = None,

    topic_key: str | None = None,

    answer_quality: str | None = None,

    weak_answer_streak: int | None = None,
) -> InterviewSession:

    session = get_session(
        session_id
    )

    # --------------------------------------------------------
    # Difficulty
    # --------------------------------------------------------

    if difficulty:

        session.current_difficulty = (
            difficulty
        )

    # --------------------------------------------------------
    # Topic
    # --------------------------------------------------------

    if topic:

        session.current_topic = (
            topic
        )

        if topic not in session.topic_history:

            session.topic_history.append(
                topic
            )

    # --------------------------------------------------------
    # Topic key
    # --------------------------------------------------------

    if topic_key:

        session.current_topic_key = (
            topic_key
        )

    # --------------------------------------------------------
    # Answer quality
    # --------------------------------------------------------

    if answer_quality:

        session.last_answer_quality = (
            answer_quality
        )

    # --------------------------------------------------------
    # Weak streak
    # --------------------------------------------------------

    if weak_answer_streak is not None:

        session.weak_answer_streak = (
            weak_answer_streak
        )

    return session


# ============================================================
# RESET WEAK STREAK
# ============================================================

def reset_weak_streak(
    session_id: str,
) -> InterviewSession:

    session = get_session(
        session_id
    )

    session.weak_answer_streak = 0

    print(
        f"[InterviewSession] "
        f"Weak answer streak reset "
        f"for session {session_id}"
    )

    return session


# ============================================================
# FINISH SESSION
# ============================================================

def finish_session(
    session_id: str,
) -> InterviewSession:

    session = get_session(
        session_id
    )

    session.status = "completed"

    print(
        f"[InterviewSession] "
        f"Finished session: {session_id}"
    )

    return session
