"""
Tests for the "why this score" references on the scorecard.

These run without Gemini or Chroma: they exercise the Python that turns
the model's answer and the retrieved passages into the scorecard shape.
"""

import unittest

from app.interview.evaluator import (
    cited_references,
    format_reference,
    normalize_evaluation,
)
from app.interview.schemas import QuestionEvaluation


PASSAGES = [
    {"source": "backend_development_interview_guide.md",
     "section": "REST", "excerpt": "REST uses stateless requests."},
    {"source": "backend_development_interview_guide.md",
     "section": "Caching", "excerpt": "Cache invalidation is hard."},
]


class TestEvaluatorReferences(unittest.TestCase):

    def test_prompt_numbers_passages(self):
        text = format_reference(PASSAGES)
        self.assertIn("[R1] (backend_development_interview_guide.md)", text)
        self.assertIn("[R2]", text)

    def test_marks_only_cited_passages(self):
        result = cited_references(PASSAGES, [2])
        self.assertFalse(result[0]["used"])
        self.assertTrue(result[1]["used"])

    def test_accepts_r_prefixed_numbers(self):
        result = cited_references(PASSAGES, ["R1"])
        self.assertTrue(result[0]["used"])

    def test_ignores_out_of_range_and_junk(self):
        # The model cannot invent a source: a number with no passage
        # behind it is dropped, and the list keeps only real passages.
        result = cited_references(PASSAGES, [7, "x", None])
        self.assertEqual(len(result), 2)
        self.assertFalse(any(p["used"] for p in result))

    def test_missing_references_used_is_not_an_error(self):
        result = cited_references(PASSAGES, None)
        self.assertEqual(len(result), 2)

    def test_normalize_attaches_references_per_question(self):
        raw = {
            "category_scores": {},
            "per_question": [
                {"question_number": 1, "score": 80, "references_used": [1]},
            ],
        }
        result = normalize_evaluation(
            raw,
            questions=["What is REST?", "What is caching?"],
            answers=["Stateless HTTP.", ""],
            references=[PASSAGES, []],
        )
        first, second = result["per_question"]
        self.assertTrue(first["references"][0]["used"])
        self.assertEqual(second["references"], [])

        # The API schema must keep the field, not drop it.
        parsed = QuestionEvaluation(**first)
        self.assertEqual(parsed.references[0].section, "REST")


if __name__ == "__main__":
    unittest.main()
