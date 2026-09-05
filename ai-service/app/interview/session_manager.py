from dataclasses import dataclass, field
from typing import List, Optional
from uuid import uuid4


# ============================================================
# INTERVIEW SESSION MODEL
# ============================================================

@dataclass
class InterviewSession:

    # --------------------------------------------------------
    # Session information
    # --------------------------------------------------------

    session_id: str

    job_description: str

    candidate_resume: str = ""

    # --------------------------------------------------------
    # Skill Gap context
    # --------------------------------------------------------

    job_field: str = ""

    matched_skills: List[str] = field(
        default_factory=list
    )

    related_skills: List[str] = field(
        default_factory=list
    )

    missing_skills: List[str] = field(
        default_factory=list
    )

    additional_skills: List[str] = field(
        default_factory=list
    )

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

    # --------------------------------------------------------
    # Scorecard
    #
    # Filled once, when the interview finishes. Cached so that a
    # repeated finish call returns the same scores instead of paying
    # for another LLM call and producing different numbers.
    # --------------------------------------------------------

    evaluation: Optional[dict] = None


# ============================================================
# IN-MEMORY SESSION STORAGE
# ============================================================

_sessions: dict[str, InterviewSession] = {}


# ============================================================
# CREATE SESSION
# ============================================================

def create_session(
    job_description: str,
    candidate_resume: str = "",
    job_field: str = "",
    matched_skills: List[str] | None = None,
    related_skills: List[str] | None = None,
    missing_skills: List[str] | None = None,
    additional_skills: List[str] | None = None,
) -> InterviewSession:

    session_id = str(uuid4())

    session = InterviewSession(
        session_id=session_id,

        job_description=job_description,

        candidate_resume=candidate_resume,

        # ----------------------------------------------------
        # Skill Gap context
        # ----------------------------------------------------

        job_field=job_field,

        matched_skills=matched_skills or [],

        related_skills=related_skills or [],

        missing_skills=missing_skills or [],

        additional_skills=additional_skills or [],

        # ----------------------------------------------------
        # Interview state
        # ----------------------------------------------------

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

    print(
        f"[InterviewSession] Job Field: "
        f"{job_field}"
    )

    print(
        f"[InterviewSession] Matched Skills: "
        f"{matched_skills or []}"
    )

    print(
        f"[InterviewSession] Related Skills: "
        f"{related_skills or []}"
    )

    print(
        f"[InterviewSession] Missing Skills: "
        f"{missing_skills or []}"
    )

    print(
        f"[InterviewSession] Additional Skills: "
        f"{additional_skills or []}"
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
    # Update question number
    # --------------------------------------------------------

    session.current_question_number = (
        len(session.questions) + 1
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

    # --------------------------------------------------------
    # Update topic key
    # --------------------------------------------------------

    if topic_key:

        session.current_topic_key = (
            topic_key
        )

    # --------------------------------------------------------
    # Track topic history
    # --------------------------------------------------------

    if topic_key:

        if topic_key not in session.topic_history:

            session.topic_history.append(
                topic_key
            )

    elif topic:

        if topic not in session.topic_history:

            session.topic_history.append(
                topic
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
    # --------------------------------------------------------

    if answer_quality:

        session.last_answer_quality = (
            answer_quality
        )

    return session

# ============================================================
# UPDATE ANSWER QUALITY
# ============================================================

def update_answer_quality(
    session_id: str,
    quality: str,
) -> InterviewSession:

    session = get_session(
        session_id
    )

    session.last_answer_quality = (
        quality
    )

    return session


# ============================================================
# UPDATE WEAK ANSWER STREAK
# ============================================================

def update_weak_answer_streak(
    session_id: str,
    streak: int,
) -> InterviewSession:

    session = get_session(
        session_id
    )

    session.weak_answer_streak = max(
        0,
        streak
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
    weak_answer_streak: int | None = None,
    answer_quality: str | None = None,
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

    # --------------------------------------------------------
    # Topic key
    # --------------------------------------------------------

    if topic_key:

        session.current_topic_key = (
            topic_key
        )

        if (
            topic_key
            not in session.topic_history
        ):

            session.topic_history.append(
                topic_key
            )

    # --------------------------------------------------------
    # Weak answer streak
    # --------------------------------------------------------

    if weak_answer_streak is not None:

        session.weak_answer_streak = max(
            0,
            weak_answer_streak
        )

    # --------------------------------------------------------
    # Answer quality
    # --------------------------------------------------------

    if answer_quality:

        session.last_answer_quality = (
            answer_quality
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

    return session


# ============================================================
# DELETE SESSION
# ============================================================

def delete_session(
    session_id: str,
) -> bool:

    if session_id in _sessions:

        del _sessions[
            session_id
        ]

        return True

    return False


# ============================================================
# GET ALL SESSIONS
# ============================================================

def get_all_sessions() -> List[InterviewSession]:

    return list(
        _sessions.values()
    )