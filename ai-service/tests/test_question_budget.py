"""
Tests for the per-question time budget in generate_question.

No network: the model is a fake that answers from a fixed list, and
retrieval is patched out. A fake asked for more answers than it holds
raises, so these also prove which model calls were made.
"""

import json
import unittest
from unittest.mock import patch

from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage

from app.interview import question_generator as qg


QUESTION = json.dumps({
    "question": "How does a database index speed up a SELECT query?",
    "category": "Databases",
    "difficulty": "medium",
    "is_follow_up": False,
    "reason": "Core backend knowledge.",
})

VALID = json.dumps({"valid": True, "reason": "Relevant."})


def fake_model(*replies):
    return GenericFakeChatModel(messages=iter([AIMessage(content=r) for r in replies]))


def generate():
    return qg.generate_question(
        session_id="s1",
        job_description="Backend developer working with Spring Boot and PostgreSQL.",
        question_number=1,
        difficulty="medium",
    )


@patch.object(qg, "retrieve_interview_context", return_value=[])
class TestQuestionBudget(unittest.TestCase):

    def test_within_budget_the_question_is_reviewed(self, _retrieve):
        # Two replies: the question, then the review. Both are used.
        with patch.object(qg, "get_interactive_llm", return_value=fake_model(QUESTION, VALID)):
            result = generate()
        self.assertEqual(result["question"], json.loads(QUESTION)["question"])

    def test_over_budget_a_checked_question_is_used_without_review(self, _retrieve):
        # Only one reply: if the review were still requested the fake
        # would run dry and no question would come back.
        with patch.object(qg, "QUESTION_TIME_BUDGET_SECONDS", 0), \
                patch.object(qg, "get_interactive_llm", return_value=fake_model(QUESTION)):
            result = generate()
        self.assertEqual(result["question"], json.loads(QUESTION)["question"])
        self.assertEqual(result["session_id"], "s1")


if __name__ == "__main__":
    unittest.main()
