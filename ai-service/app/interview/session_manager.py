import json
import os
import time
from dataclasses import asdict, dataclass, field, fields
from typing import List, Optional
from uuid import uuid4


from app.interview.experience_level import detect_level


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

    # Worked out from the CV when the session is created, not asked of
    # the model. Kept on the session so every question and the final
    # scorecard can be told who this interview was pitched at.
    experience_level: str = "mid"

    experience_years: float = 0.0

    experience_signals: List[str] = field(
        default_factory=list
    )

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
    # Job interview (fixed questions)
    #
    # MODE_FIXED sessions ask the approved questions held here, in
    # order, instead of generating new ones. They stay on the server:
    # a response carries only the question being asked, never the key
    # points or the questions still to come.
    # --------------------------------------------------------

    mode: str = "adaptive"

    fixed_questions: List[dict] = field(
        default_factory=list
    )

    # --------------------------------------------------------
    # Scorecard
    #
    # Filled once, when the interview finishes. Cached so that a
    # repeated finish call returns the same scores instead of paying
    # for another LLM call and producing different numbers.
    # --------------------------------------------------------

    evaluation: Optional[dict] = None


# ============================================================
# SESSION STORAGE
#
# The working state of interviews in progress. Spring keeps the durable
# record (questions, answers, scorecard) in PostgreSQL; a finished
# interview is read back from there, not from here.
#
# Sessions used to live in a dict inside this process, so a restart of
# the AI service lost every interview in progress, and a second
# container or worker could not see the first one's interviews. With
# REDIS_URL set they are kept in Redis instead, outside the process.
# Without it (unit tests, running the service by hand) they stay in
# memory, with the old limits.
#
# Both stores hold the session as JSON, never the object. get_session
# therefore returns a copy, and a change reaches the store only through
# save_session - in memory as in Redis, so a forgotten save shows up in
# a unit test instead of only in production.
#
# Idle sessions expire. The TTL counts from the last call that touched
# the session, not from its start: every read renews it, so a slow
# candidate is never cut off mid-interview, and only an interview
# nobody has used for hours goes - with the candidate's CV text in it.
#
# Two requests for the same session at the same moment would each save
# their own copy, and the later save wins. One candidate answers one
# question at a time, and the interview page sends no second answer
# while the first is in flight, so the store takes no lock.
# ============================================================

MODE_ADAPTIVE = "adaptive"

MODE_FIXED = "fixed"


def is_fixed(session: InterviewSession) -> bool:
    return session.mode == MODE_FIXED


_KEY_PREFIX = "interview:session:"

_FIELD_NAMES = {f.name for f in fields(InterviewSession)}


def session_idle_ttl_seconds() -> int:
    # Read when used, not at import: main.py loads ai-service/.env
    # only after this module has been imported.
    return max(
        60,
        int(os.getenv("SESSION_IDLE_TTL_SECONDS", str(6 * 60 * 60))),
    )


class _MemoryStore:
    """This process only. Expiry is checked on the monotonic clock."""

    def __init__(self):
        self._items: dict[str, tuple[float, str]] = {}

    def get_and_touch(self, key: str, ttl: int) -> str | None:
        now = time.monotonic()
        item = self._items.get(key)

        if item is None:
            return None

        expires_at, value = item

        if now >= expires_at:
            self._items.pop(key, None)
            return None

        self._items[key] = (now + ttl, value)
        return value

    def set(self, key: str, value: str, ttl: int) -> None:
        now = time.monotonic()

        # Every write sweeps out the expired ones, so memory stays
        # bounded without a background thread.
        for k in [k for k, (exp, _) in self._items.items() if now >= exp]:
            self._items.pop(k, None)

        self._items[key] = (now + ttl, value)

    def delete(self, key: str) -> bool:
        return self._items.pop(key, None) is not None


class _RedisStore:
    """Shared by every worker and container that uses the same Redis."""

    def __init__(self, url: str):
        import redis

        self._redis = redis.Redis.from_url(
            url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )

    def get_and_touch(self, key: str, ttl: int) -> str | None:
        # GETEX reads the value and resets its expiry in one step.
        return self._redis.getex(key, ex=ttl)

    def set(self, key: str, value: str, ttl: int) -> None:
        # Redis drops the key itself when the TTL runs out.
        self._redis.set(key, value, ex=ttl)

    def delete(self, key: str) -> bool:
        return self._redis.delete(key) > 0


_store = None


def _get_store():
    # Chosen on first use, for the same reason as the TTL. If Redis is
    # configured but down, calls fail loudly rather than falling back to
    # memory: a second container would then hold sessions the first
    # cannot see, the very problem Redis is here to fix.
    global _store

    if _store is None:
        url = os.getenv("REDIS_URL", "").strip()

        if url:
            _store = _RedisStore(url)
            print("[InterviewSession] Sessions are kept in Redis")
        else:
            _store = _MemoryStore()
            print(
                "[InterviewSession] REDIS_URL is not set; sessions are "
                "kept in this process and lost on restart"
            )

    return _store


def _key(session_id: str) -> str:
    return _KEY_PREFIX + session_id


def _to_json(session: InterviewSession) -> str:
    return json.dumps(asdict(session))


def _from_json(raw: str) -> InterviewSession:
    # Fields this version does not know are skipped and missing ones
    # take their defaults, so a session written by the previous release
    # still loads during a deploy.
    data = json.loads(raw)

    return InterviewSession(
        **{k: v for k, v in data.items() if k in _FIELD_NAMES}
    )


# ============================================================
# SAVE SESSION
# ============================================================

def save_session(
    session: InterviewSession,
) -> InterviewSession:

    _get_store().set(
        _key(session.session_id),
        _to_json(session),
        session_idle_ttl_seconds(),
    )

    return session


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
    fixed_questions: List[dict] | None = None,
) -> InterviewSession:

    session_id = str(uuid4())

    if fixed_questions:
        return _create_fixed_session(
            session_id,
            job_description,
            job_field,
            fixed_questions,
        )

    # Where this interview opens. Computed from the CV in Python - see
    # experience_level.py. Previously every session started at "medium"
    # regardless of the candidate, so a fresher and a principal engineer
    # got the same first question difficulty.
    experience = detect_level(candidate_resume)

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

        current_difficulty=experience["starting_difficulty"],

        experience_level=experience["level"],

        experience_years=experience["years"],

        experience_signals=experience["signals"],

        current_topic="",

        current_topic_key="",

        topic_history=[],

        weak_answer_streak=0,

        last_answer_quality="none",
    )

    save_session(session)

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


def _create_fixed_session(
    session_id: str,
    job_description: str,
    job_field: str,
    fixed_questions: List[dict],
) -> InterviewSession:
    """
    A job interview session.

    No CV and no skill gap are kept, and the experience level is not
    detected: every candidate for the job gets the same questions at
    the same difficulty, so nothing about one candidate is needed.
    """

    ordered = sorted(
        fixed_questions,
        key=lambda q: q.get("position", 0),
    )

    session = InterviewSession(
        session_id=session_id,
        job_description=job_description,
        job_field=job_field,
        mode=MODE_FIXED,
        fixed_questions=ordered,
        current_question_number=1,
        status="active",
        current_difficulty=ordered[0].get("difficulty") or "medium",
    )

    save_session(session)

    print(
        f"[InterviewSession] Created job interview session "
        f"{session_id} with {len(ordered)} fixed question(s)"
    )

    return session


def next_fixed_question(
    session: InterviewSession,
) -> dict | None:
    """
    The approved question to ask after the answers given so far, or
    None once every one has been answered.
    """

    index = len(session.answers)

    if index >= len(session.fixed_questions):
        return None

    return session.fixed_questions[index]


# ============================================================
# GET SESSION
# ============================================================

def get_session(
    session_id: str,
) -> InterviewSession:

    # Every read renews the TTL: it counts idle time only.
    raw = _get_store().get_and_touch(
        _key(session_id),
        session_idle_ttl_seconds(),
    )

    if raw is None:

        raise ValueError(
            f"Interview session "
            f"'{session_id}' was not found."
        )

    return _from_json(raw)


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

    return save_session(session)


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

    return save_session(session)

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

    return save_session(session)


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

    return save_session(session)


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

    return save_session(session)


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

    return save_session(session)


# ============================================================
# DELETE SESSION
# ============================================================

def delete_session(
    session_id: str,
) -> bool:

    return _get_store().delete(
        _key(session_id)
    )
