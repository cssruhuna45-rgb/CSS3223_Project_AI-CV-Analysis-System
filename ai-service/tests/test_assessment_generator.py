"""
Tests for drafting a job's questions.

No network: the model is a fake that answers from a fixed list, and
retrieval is patched out. A fake asked for more replies than it holds
raises, so these also prove how many model calls were made.
"""

import json
import unittest
from unittest.mock import patch

from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage

from app.assessment import generator


def item(text, difficulty, topic="Databases"):
    return {
        "question": text,
        "difficulty": difficulty,
        "topic": topic,
        "key_points": ["First idea", "Second idea", "Third idea"],
    }


Q = [
    item("How does a database index speed up a SELECT query?", "easy"),
    item("Explain the difference between optimistic and pessimistic locking.", "medium"),
    item("When would you choose a message queue over a direct REST call?", "medium"),
    item("How do you make a REST endpoint idempotent under client retries?", "hard"),
    item("Describe how you would shard a PostgreSQL table that outgrew one node.", "easy"),
]


def reply(questions):
    return json.dumps({"questions": questions})


def fake_model(*replies):
    return GenericFakeChatModel(messages=iter([AIMessage(content=r) for r in replies]))


def generate(count=5, existing=None):
    return generator.generate_questions(
        job_title="Backend Intern",
        job_field="backend_development",
        job_description="Build REST APIs in Spring Boot with PostgreSQL and Kafka.",
        required_skills=["Spring Boot", "PostgreSQL", " postgresql ", "Kafka"],
        question_count=count,
        existing_questions=existing,
    )


@patch.object(generator, "retrieve_reference", return_value=("", []))
class TestGenerateQuestions(unittest.TestCase):

    def test_returns_exactly_the_chosen_count_in_easy_to_hard_order(self, _r):
        with patch.object(generator, "get_llm", return_value=fake_model(reply(Q))):
            result = generate()

        self.assertEqual(len(result["questions"]), 5)
        self.assertEqual(result["issues"], [])
        self.assertEqual(
            [q["difficulty"] for q in result["questions"]],
            ["easy", "easy", "medium", "medium", "hard"],
        )

    def test_asks_again_only_for_the_shortfall(self, _r):
        # First reply has three usable questions (one too short, one a
        # repeat); the second fills the remaining two.
        first = [Q[0], Q[1], item("What is SQL?", "easy"), Q[0], Q[2]]
        with patch.object(
            generator, "get_llm",
            return_value=fake_model(reply(first), reply([Q[3], Q[4]])),
        ):
            result = generate()

        self.assertEqual(len(result["questions"]), 5)
        texts = [q["question"] for q in result["questions"]]
        self.assertEqual(len(set(texts)), 5)

    def test_a_short_draft_lists_what_is_missing(self, _r):
        with patch.object(
            generator, "get_llm",
            return_value=fake_model(reply(Q[:2]), reply([]), reply([])),
        ):
            result = generate()

        self.assertEqual(len(result["questions"]), 2)
        self.assertIn("Expected 5 questions, found 2.", result["issues"])

    def test_extra_questions_are_trimmed(self, _r):
        extra = Q + [item("How would you tune a slow PostgreSQL query plan?", "hard")]
        with patch.object(generator, "get_llm", return_value=fake_model(reply(extra))):
            result = generate()

        self.assertEqual(len(result["questions"]), 5)

    def test_a_replacement_avoids_existing_questions(self, _r):
        with patch.object(
            generator, "get_llm",
            return_value=fake_model(reply([Q[0], Q[3]])),
        ):
            result = generate(count=1, existing=[Q[0]["question"]])

        self.assertEqual([q["question"] for q in result["questions"]], [Q[3]["question"]])
        self.assertEqual(result["issues"], [])

    def test_skills_are_cleaned_before_use(self, _r):
        self.assertEqual(
            generator.clean_skills(["Spring Boot", "PostgreSQL", " postgresql ", "", "Kafka"]),
            ["Spring Boot", "PostgreSQL", "Kafka"],
        )

    def test_no_skills_is_refused(self, _r):
        with self.assertRaises(ValueError):
            generator.generate_questions(
                job_title="", job_field="", job_description="x" * 30,
                required_skills=["  "], question_count=5,
            )

    def test_prompt_has_no_place_for_a_cv(self, _r):
        # The generator signature and prompt take no candidate input.
        self.assertNotIn("resume", generator.GENERATION_PROMPT.input_variables)
        self.assertNotIn("candidate", " ".join(generator.GENERATION_PROMPT.input_variables))


if __name__ == "__main__":
    unittest.main()
