"""
Tests for job interviews: the approved questions Spring sends with the
start request, asked in order and graded against their key points.

Runs the real FastAPI routes with sessions in memory. No network: the
grading model is a fake, retrieval is patched to fail loudly if a job
interview ever reaches it, and practice question generation is patched.
"""

import json
import os
import unittest
from unittest.mock import patch

from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage

API_KEY = "k" * 40

os.environ.setdefault("INTERNAL_API_KEY", API_KEY)
os.environ["GEMINI_API_KEY"] = os.environ.get("GEMINI_API_KEY") or "test-key"

from fastapi.testclient import TestClient  # noqa: E402

from app import main  # noqa: E402
from app.interview import evaluator, session_manager  # noqa: E402
from app.security import INTERNAL_API_KEY_HEADER  # noqa: E402


JOB_DESCRIPTION = "Build REST APIs in Spring Boot with PostgreSQL for a payments team."

FIXED = [
    {
        "question_id": 11,
        "position": 1,
        "question": "How does a database index speed up a SELECT query?",
        "difficulty": "easy",
        "topic": "Indexes",
        "key_points": ["B-tree lookup avoids a full scan", "Cost on writes"],
    },
    {
        "question_id": 12,
        "position": 2,
        "question": "How do you make a REST endpoint idempotent under retries?",
        "difficulty": "medium",
        "topic": "API design",
        "key_points": ["Idempotency key stored server side", "Same response on replay"],
    },
    {
        "question_id": 13,
        "position": 3,
        "question": "How would you shard a PostgreSQL table that outgrew one node?",
        "difficulty": "hard",
        "topic": "Scaling",
        "key_points": ["Choose a shard key", "Cross-shard queries are costly"],
    },
]

GRADE = json.dumps({
    "category_scores": {
        "technical_knowledge": 70, "depth": 60,
        "problem_solving": 50, "communication": 80,
    },
    "strengths": ["Named the B-tree."],
    "improvements": ["Discuss write cost."],
    "per_question": [
        {"question_number": n, "score": 60, "what_was_good": "", "what_was_missing": "",
         "references_used": [1]}
        for n in (1, 2, 3)
    ],
})


def fail_retrieval(*_args, **_kwargs):
    raise AssertionError("A job interview must not be graded from retrieval.")


class FixedInterviewTest(unittest.TestCase):

    def setUp(self):
        # Sessions in this process only, fresh for each test.
        self.env = patch.dict(os.environ, {"REDIS_URL": ""})
        self.env.start()
        session_manager._store = None

        self.client = TestClient(main.app)
        self.client.headers[INTERNAL_API_KEY_HEADER] = os.environ["INTERNAL_API_KEY"]

    def tearDown(self):
        session_manager._store = None
        self.env.stop()

    # ---- helpers ----------------------------------------------------

    def start(self, resume="", **extra):
        body = {
            "job_description": JOB_DESCRIPTION,
            "job_field": "backend_development",
            "candidate_resume": resume,
            "fixed_questions": FIXED,
            **extra,
        }
        res = self.client.post("/api/v1/interview/start", json=body)
        self.assertEqual(res.status_code, 200, res.text)
        return res.json()

    def answer(self, session_id, text="An answer."):
        return self.client.post(
            "/api/v1/interview/answer",
            json={"session_id": session_id, "answer": text},
        )

    def sequence(self, resume):
        started = self.start(resume=resume)
        asked = [started["question"]["question"]]
        while True:
            body = self.answer(started["session_id"]).json()
            if body["complete"]:
                return asked
            asked.append(body["question"]["question"])

    # ---- order and sameness -----------------------------------------

    def test_two_candidates_with_different_cvs_get_the_same_sequence(self):
        senior = "Principal engineer, 15 years of distributed systems, Kafka, Go."
        fresher = "Final-year student. Built a to-do app in React for coursework."

        first = self.sequence(senior)
        second = self.sequence(fresher)

        self.assertEqual(first, [q["question"] for q in FIXED])
        self.assertEqual(first, second)

    def test_questions_come_in_position_order_whatever_order_they_were_sent(self):
        res = self.client.post("/api/v1/interview/start", json={
            "job_description": JOB_DESCRIPTION,
            "fixed_questions": list(reversed(FIXED)),
        })
        self.assertEqual(res.json()["question"]["question"], FIXED[0]["question"])

    def test_start_reports_the_server_question_count(self):
        self.assertEqual(self.start()["total_questions"], 3)

    def test_cv_is_not_kept_on_a_job_session(self):
        started = self.start(resume="Senior engineer with a long CV text here.")
        session = session_manager.get_session(started["session_id"])
        self.assertEqual(session.candidate_resume, "")
        self.assertEqual(session.mode, "fixed")

    # ---- what the candidate is shown --------------------------------

    def test_responses_never_carry_key_points_or_future_questions(self):
        started = self.start()
        raw = json.dumps(started)

        for q in FIXED:
            for point in q["key_points"]:
                self.assertNotIn(point, raw)
        self.assertNotIn(FIXED[1]["question"], raw)
        self.assertNotIn(FIXED[2]["question"], raw)
        self.assertEqual(started["question"]["reason"], "")

        nxt = self.answer(started["session_id"]).text
        self.assertNotIn(FIXED[2]["question"], nxt)
        for point in FIXED[1]["key_points"]:
            self.assertNotIn(point, nxt)

    def test_model_answer_is_refused_while_the_job_interview_runs(self):
        started = self.start()
        res = self.client.post("/api/v1/interview/model-answer", json={
            "session_id": started["session_id"],
            "question": FIXED[0]["question"],
            "answer": "x",
        })
        self.assertEqual(res.status_code, 403)

    def test_no_extra_question_can_be_generated_for_a_job_session(self):
        started = self.start()
        res = self.client.post("/api/v1/interview/question", json={
            "session_id": started["session_id"],
            "job_description": JOB_DESCRIPTION,
        })
        self.assertEqual(res.status_code, 400)

    # ---- count handling ---------------------------------------------

    def test_the_last_answer_ends_the_question_list(self):
        sid = self.start()["session_id"]
        self.answer(sid)
        self.answer(sid)
        last = self.answer(sid).json()
        self.assertTrue(last["complete"])
        self.assertIsNone(last["question"])

        extra = self.answer(sid)
        self.assertEqual(extra.status_code, 400)

    def test_duplicate_positions_are_refused(self):
        clash = [dict(FIXED[0]), dict(FIXED[1], position=1)]
        res = self.client.post("/api/v1/interview/start", json={
            "job_description": JOB_DESCRIPTION, "fixed_questions": clash,
        })
        self.assertEqual(res.status_code, 400)

    # ---- resuming after a reload --------------------------------------

    def resume(self, session_id, answers=(), fixed=FIXED):
        return self.client.post("/api/v1/interview/resume", json={
            "session_id": session_id,
            "job_description": JOB_DESCRIPTION,
            "job_field": "backend_development",
            "fixed_questions": fixed,
            "answers": list(answers),
        })

    def test_resume_returns_the_question_still_on_screen(self):
        sid = self.start()["session_id"]
        self.answer(sid, "First answer.")

        res = self.resume(sid, ["First answer."])

        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertEqual(body["question"]["question"], FIXED[1]["question"])
        self.assertEqual(body["answered"], 1)
        self.assertEqual(body["total_questions"], 3)
        self.assertFalse(body["complete"])
        self.assertFalse(body["restored"])

    def test_resume_does_not_add_or_skip_a_question(self):
        sid = self.start()["session_id"]
        self.resume(sid)
        self.resume(sid)

        session = session_manager.get_session(sid)
        self.assertEqual(session.questions, [FIXED[0]["question"]])
        self.assertEqual(session.answers, [])

    def test_an_expired_session_is_rebuilt_and_can_be_finished(self):
        sid = self.start()["session_id"]
        self.answer(sid, "First answer.")
        session_manager.delete_session(sid)

        body = self.resume(sid, ["First answer."]).json()

        self.assertTrue(body["restored"])
        self.assertEqual(body["question"]["question"], FIXED[1]["question"])

        self.answer(sid, "Second answer.")
        last = self.answer(sid, "Third answer.").json()
        self.assertTrue(last["complete"])

        session = session_manager.get_session(sid)
        self.assertEqual(session.questions, [q["question"] for q in FIXED])
        self.assertEqual(
            session.answers,
            ["First answer.", "Second answer.", "Third answer."],
        )

    def test_a_rebuilt_session_keeps_the_key_points_and_the_order(self):
        sid = "rebuilt-session"
        self.resume(sid, ["One."], fixed=list(reversed(FIXED)))

        session = session_manager.get_session(sid)
        self.assertEqual(session.fixed_questions[0]["key_points"], FIXED[0]["key_points"])
        self.assertEqual(session.mode, "fixed")

    def test_resume_never_shows_key_points_or_later_questions(self):
        sid = self.start()["session_id"]
        session_manager.delete_session(sid)

        raw = self.resume(sid).text

        self.assertNotIn(FIXED[1]["question"], raw)
        for q in FIXED:
            for point in q["key_points"]:
                self.assertNotIn(point, raw)

    def test_resume_after_the_last_answer_says_to_finish(self):
        sid = self.start()["session_id"]
        for _ in FIXED:
            self.answer(sid)

        body = self.resume(sid, ["An answer."] * 3).json()

        self.assertTrue(body["complete"])
        self.assertIsNone(body["question"])

    def test_more_answers_than_questions_are_refused(self):
        res = self.resume("rebuilt-session", ["a", "b", "c", "d"])
        self.assertEqual(res.status_code, 400)

    def test_a_practice_session_cannot_be_resumed(self):
        session = session_manager.create_session(job_description=JOB_DESCRIPTION)
        res = self.resume(session.session_id)
        self.assertEqual(res.status_code, 400)

    # ---- grading ------------------------------------------------------

    def test_grading_uses_the_saved_key_points_and_hides_them(self):
        sid = self.start()["session_id"]
        for _ in FIXED:
            self.answer(sid, "Indexes use a B-tree.")

        captured = {}
        real_build = evaluator.build_transcript

        def spy(questions, answers, key_points=None):
            captured["key_points"] = key_points
            transcript, refs = real_build(questions, answers, key_points)
            captured["transcript"] = transcript
            return transcript, refs

        with patch.object(evaluator, "retrieve_reference", side_effect=fail_retrieval), \
                patch.object(evaluator, "build_transcript", side_effect=spy), \
                patch.object(evaluator, "get_llm",
                             return_value=GenericFakeChatModel(messages=iter([AIMessage(content=GRADE)]))):
            res = self.client.post("/api/v1/interview/finish", json={"session_id": sid})

        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()

        self.assertEqual(captured["key_points"], [q["key_points"] for q in FIXED])
        self.assertIn("B-tree lookup avoids a full scan", captured["transcript"])

        # Overall is the Python mean of the categories, not the model's.
        self.assertEqual(body["overall_score"], 65)
        self.assertTrue(body["evaluated"])
        self.assertEqual([p["question_id"] for p in body["per_question"]], [11, 12, 13])
        self.assertTrue(all(p["references"] == [] for p in body["per_question"]))
        self.assertNotIn("B-tree lookup avoids a full scan", res.text)


class PracticeRegressionTest(unittest.TestCase):
    """Personal practice must stay adaptive and CV-based."""

    def setUp(self):
        self.env = patch.dict(os.environ, {"REDIS_URL": ""})
        self.env.start()
        session_manager._store = None
        self.client = TestClient(main.app)
        self.client.headers[INTERNAL_API_KEY_HEADER] = os.environ["INTERNAL_API_KEY"]

    def tearDown(self):
        session_manager._store = None
        self.env.stop()

    def test_practice_start_still_generates_from_the_cv(self):
        generated = {
            "session_id": "ignored",
            "question": "Tell me about the Kafka pipeline on your CV.",
            "category": "Messaging",
            "difficulty": "medium",
            "is_follow_up": False,
            "reason": "From the CV.",
        }

        with patch.object(main, "generate_first_question", return_value=generated) as gen:
            res = self.client.post("/api/v1/interview/start", json={
                "job_description": JOB_DESCRIPTION,
                "candidate_resume": "Built a Kafka pipeline.",
            })

        self.assertEqual(res.status_code, 200, res.text)
        body = res.json()
        self.assertIsNone(body["total_questions"])
        self.assertEqual(body["question"]["reason"], "From the CV.")
        self.assertEqual(gen.call_args.kwargs["candidate_resume"], "Built a Kafka pipeline.")

        session = session_manager.get_session(body["session_id"])
        self.assertEqual(session.mode, "adaptive")


class PartialFixedExamTest(unittest.TestCase):
    """
    Finishing a job interview early must not look like finishing it.

    The finish route marks a session completed without requiring every
    approved question to be answered, and it used to report the number
    of questions that happened to have been asked. Answering one of
    three and finishing therefore came back as a tidy two-question
    assessment, which a recruiter then read beside candidates who had
    answered all three. Comparability is the only reason a job
    interview uses a fixed set, so the count has to be that set.
    """

    def setUp(self):
        # Sessions in this process only, fresh for each test.
        self.env = patch.dict(os.environ, {"REDIS_URL": ""})
        self.env.start()
        session_manager._store = None

        self.client = TestClient(main.app)
        self.client.headers[INTERNAL_API_KEY_HEADER] = os.environ["INTERNAL_API_KEY"]

    def tearDown(self):
        session_manager._store = None
        self.env.stop()

    def start(self):
        res = self.client.post("/api/v1/interview/start", json={
            "job_description": JOB_DESCRIPTION,
            "job_field": "backend_development",
            "candidate_resume": "",
            "fixed_questions": FIXED,
        })
        self.assertEqual(res.status_code, 200, res.text)
        return res.json()["session_id"]

    def answer(self, sid, text="An answer about B-tree lookups."):
        return self.client.post(
            "/api/v1/interview/answer",
            json={"session_id": sid, "answer": text},
        )

    def finish(self, sid):
        with patch.object(evaluator, "retrieve_reference", side_effect=fail_retrieval),                 patch.object(evaluator, "get_llm",
                             return_value=GenericFakeChatModel(messages=iter([AIMessage(content=GRADE)]))):
            res = self.client.post("/api/v1/interview/finish", json={"session_id": sid})

        self.assertEqual(res.status_code, 200, res.text)
        return res.json()

    def test_finishing_early_counts_against_the_approved_set(self):
        sid = self.start()
        self.answer(sid)

        body = self.finish(sid)

        # Three questions were approved, so three is the denominator -
        # not the two that had been asked by then.
        self.assertEqual(body["total_questions"], len(FIXED))
        self.assertEqual(body["answered_count"], 1)
        self.assertFalse(body["fully_answered"])

    def test_answering_everything_is_a_full_sitting(self):
        sid = self.start()

        for _ in FIXED:
            self.answer(sid)

        body = self.finish(sid)

        self.assertEqual(body["total_questions"], len(FIXED))
        self.assertEqual(body["answered_count"], len(FIXED))
        self.assertTrue(body["fully_answered"])

    def test_the_cached_scorecard_reports_the_same_counts(self):
        # A repeated finish returns the stored evaluation without
        # grading again, and used to recompute the count from the
        # asked questions on that path too.
        sid = self.start()
        self.answer(sid)

        first = self.finish(sid)
        again = self.client.post("/api/v1/interview/finish", json={"session_id": sid})

        self.assertEqual(again.status_code, 200, again.text)
        body = again.json()

        self.assertEqual(body["total_questions"], first["total_questions"])
        self.assertEqual(body["answered_count"], first["answered_count"])
        self.assertEqual(body["fully_answered"], first["fully_answered"])


if __name__ == "__main__":
    unittest.main()
