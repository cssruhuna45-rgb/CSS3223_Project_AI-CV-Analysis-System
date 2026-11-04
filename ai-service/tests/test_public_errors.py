"""
What the AI service tells a user when something fails.

Spring forwards only {"detail": {"code", "message"}} errors with codes it
knows; these tests check the service's side of that contract: exception
text, settings and internal names never leave as a message, and errors
carried inside successful responses (evaluation_error, a model answer's
error) are plain English too.

No network: models are fakes or patched to raise.
"""

import os
import unittest
from unittest.mock import patch

API_KEY = "k" * 40

os.environ.setdefault("INTERNAL_API_KEY", API_KEY)
os.environ["GEMINI_API_KEY"] = os.environ.get("GEMINI_API_KEY") or "test-key"

from fastapi.testclient import TestClient  # noqa: E402

from app import ai_errors, main  # noqa: E402
from app.interview import evaluator, model_answer, session_manager  # noqa: E402
from app.security import INTERNAL_API_KEY_HEADER  # noqa: E402

TECHNICAL = ("Traceback", "Exception", "GEMINI_API_KEY", "API key", "http://", "redis://", "str(", "KeyError")


def assert_plain(test, text):
    for leak in TECHNICAL:
        test.assertNotIn(leak, text, f"leaked {leak!r} in {text!r}")


class RateLimitWording(unittest.TestCase):

    def test_a_daily_quota_is_told_apart_from_throttling(self):
        daily = ai_errors.rate_limit_error(Exception(
            "429 Quota exceeded for metric GenerateRequestsPerDayPerProjectPerModel-FreeTier"))
        minute = ai_errors.rate_limit_error(Exception(
            "429 Quota exceeded for metric GenerateRequestsPerMinutePerProjectPerModel"))

        self.assertEqual(daily.status_code, 429)
        self.assertEqual(daily.detail["code"], "AI_DAILY_LIMIT")
        self.assertEqual(minute.detail["code"], "AI_RATE_LIMITED")

    def test_no_wording_mentions_keys_or_a_one_minute_promise(self):
        for message in (
            ai_errors.RATE_LIMIT_MESSAGE,
            ai_errors.DAILY_LIMIT_MESSAGE,
            ai_errors.UNAVAILABLE_MESSAGE,
            ai_errors.FAILED_MESSAGE,
        ):
            self.assertNotIn("API key", message)
            self.assertNotIn("a minute", message)


class HttpErrorResponses(unittest.TestCase):

    def setUp(self):
        self.env = patch.dict(os.environ, {"REDIS_URL": ""})
        self.env.start()
        session_manager._store = None
        self.client = TestClient(main.app)
        self.client.headers[INTERNAL_API_KEY_HEADER] = os.environ["INTERNAL_API_KEY"]

    def tearDown(self):
        session_manager._store = None
        self.env.stop()

    def test_an_exception_detail_is_replaced_and_keeps_its_status(self):
        # An unknown session ends in HTTPException(404, detail=str(e)).
        response = self.client.post(
            "/api/v1/interview/answer",
            json={"session_id": "no-such-session-7f3a", "answer": "An answer."},
        )

        self.assertEqual(response.status_code, 404)
        detail = response.json()["detail"]
        self.assertIsInstance(detail, dict)
        self.assertEqual(detail["code"], "AI_INVALID_REQUEST")
        self.assertNotIn("7f3a", detail["message"])
        assert_plain(self, detail["message"])

    def test_a_missing_model_key_reads_as_temporarily_unavailable(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            response = self.client.post(
                "/api/v1/resume/analyze",
                json={"resume_id": 1, "resume_text": "Java developer with five years of Spring Boot."},
            )

        self.assertEqual(response.status_code, 500)  # status unchanged
        detail = response.json()["detail"]
        self.assertEqual(detail["code"], "AI_UNAVAILABLE")
        assert_plain(self, detail["message"])

    def test_a_failed_model_call_does_not_return_its_exception_text(self):
        with patch.object(main, "analyze_resume", side_effect=RuntimeError(
                "Traceback: KeyError('skills') at http://internal:8000")):
            response = self.client.post(
                "/api/v1/resume/analyze",
                json={"resume_id": 1, "resume_text": "Java developer with five years of Spring Boot."},
            )

        self.assertEqual(response.status_code, 500)
        detail = response.json()["detail"]
        self.assertEqual(detail["code"], "AI_FAILED")
        self.assertIn("CV", detail["message"])
        assert_plain(self, detail["message"])


class ErrorsInsideSuccessfulResponses(unittest.TestCase):

    def test_a_failed_example_answer_says_so_in_plain_words(self):
        with patch.object(model_answer, "retrieve_reference", return_value={"text": "", "sources": []}), \
                patch.object(model_answer, "get_llm", side_effect=RuntimeError(
                    "google.api_core.exceptions.InternalServerError: 500 at /v1beta/models")):
            result = model_answer.generate_model_answer("What is an index?", "It speeds up reads.")

        self.assertFalse(result["generated"])
        self.assertEqual(result["error"], model_answer.NOT_GENERATED)
        assert_plain(self, result["error"])

    def test_failed_grading_is_flagged_and_explained_without_exception_text(self):
        with patch.object(evaluator, "retrieve_reference", return_value=[]), \
                patch.object(evaluator, "get_llm", side_effect=RuntimeError(
                    "ResourceExhausted: 429 Quota exceeded; Traceback (most recent call last)")):
            result = evaluator.evaluate_interview(
                ["How does an index work?"], ["It avoids a full scan."])

        # Not a score of zero: flagged as not evaluated.
        self.assertFalse(result["evaluated"])
        self.assertEqual(result["evaluation_error"], evaluator.NOT_SCORED_FAILED)
        assert_plain(self, result["evaluation_error"])


if __name__ == "__main__":
    unittest.main()
