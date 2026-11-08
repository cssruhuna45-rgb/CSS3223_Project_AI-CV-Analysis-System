"""
Tests that a failed grading is never presented as a score of zero.

`clamp_score` is deliberately forgiving: one unreadable field among
many becomes 0 and the rest of the scorecard survives. Applied to a
reply that carried no scores at all, that same forgiveness produced a
complete scorecard of zeros with `evaluated` set to true and no error
beside it - a candidate told they scored 0 out of 100 when in truth the
grading step never ran.

No network: the model is a fake that answers from a fixed list, and
retrieval is patched out.
"""

import json
import unittest
from unittest.mock import patch

from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage

from app.interview import evaluator
from app.interview.evaluator import carries_any_score, clamp_score, is_number


QUESTIONS = [
    "How does a database index speed up a SELECT query?",
    "Explain the difference between optimistic and pessimistic locking.",
]

ANSWERS = [
    "It avoids a full table scan by walking a B-tree to the matching rows.",
    "Optimistic locking checks a version column on write; pessimistic locks the row up front.",
]


def fake_model(reply):
    return GenericFakeChatModel(messages=iter([AIMessage(content=reply)]))


def grade(reply):
    """Runs a full grading against a model that returns `reply`."""

    with patch.object(evaluator, "retrieve_reference", return_value=[]), \
            patch.object(evaluator, "get_llm", return_value=fake_model(reply)):
        return evaluator.evaluate_interview(
            questions=QUESTIONS,
            answers=ANSWERS,
            job_field="backend_development",
        )


class TestIsNumber(unittest.TestCase):

    def test_accepts_ints_floats_and_numeric_strings(self):
        for value in (0, 72, 72.5, "72", "72.5"):
            self.assertTrue(is_number(value), value)

    def test_rejects_none_and_junk(self):
        for value in (None, "", "high", [], {}):
            self.assertFalse(is_number(value), value)

    def test_rejects_booleans(self):
        # float(True) is 1.0, but a model answering "score": true has
        # not graded anything.
        self.assertFalse(is_number(True))
        self.assertFalse(is_number(False))

    def test_rejects_non_finite_values(self):
        # float("NaN") and float("inf") both succeed, so these would
        # otherwise count as grades and then be flattened to 0.
        for value in ("NaN", "nan", "inf", "-inf", "Infinity", "5e400",
                      float("nan"), float("inf"), float("-inf")):
            self.assertFalse(is_number(value), value)


class TestCarriesAnyScore(unittest.TestCase):

    def test_an_empty_object_carries_nothing(self):
        self.assertFalse(carries_any_score({}))

    def test_prose_without_scores_carries_nothing(self):
        self.assertFalse(carries_any_score({
            "strengths": ["Clear communication"],
            "improvements": ["Mention indexes"],
        }))

    def test_empty_containers_carry_nothing(self):
        self.assertFalse(carries_any_score({
            "category_scores": {},
            "per_question": [],
        }))

    def test_one_category_score_is_enough(self):
        self.assertTrue(carries_any_score({
            "category_scores": {"technical_knowledge": 70},
        }))

    def test_one_per_question_score_is_enough(self):
        # Categories missing entirely is a partial reply, not a failed
        # one: the existing normalize fills the gaps.
        self.assertTrue(carries_any_score({
            "per_question": [{"question_number": 1, "score": 55}],
        }))

    def test_a_genuine_zero_still_counts_as_a_score(self):
        # The point of the guard is to tell "not graded" apart from
        # "graded badly". A model that explicitly says 0 has graded.
        self.assertTrue(carries_any_score({
            "category_scores": {"technical_knowledge": 0},
        }))

    def test_unreadable_scores_do_not_count(self):
        self.assertFalse(carries_any_score({
            "category_scores": {"technical_knowledge": "excellent"},
            "per_question": [{"question_number": 1, "score": None}],
        }))

    def test_non_finite_scores_do_not_count(self):
        # The case that slipped through the first version of this
        # guard: "NaN" is not a grade, it is a broken reply.
        self.assertFalse(carries_any_score({
            "category_scores": {"technical_knowledge": "NaN"},
            "per_question": [{"question_number": 1, "score": "inf"}],
        }))


class TestClampScore(unittest.TestCase):

    def test_clamps_into_range(self):
        self.assertEqual(clamp_score(72), 72)
        self.assertEqual(clamp_score(-5), 0)
        self.assertEqual(clamp_score(140), 100)

    def test_unreadable_values_become_zero(self):
        for value in (None, "", "high", [], True):
            self.assertEqual(clamp_score(value), 0, value)

    def test_infinity_does_not_raise(self):
        # round(inf) is still a float infinity and int() of that is an
        # OverflowError - which is not a ValueError, so the original
        # except clause would not have caught it.
        for value in (float("inf"), float("-inf"), "inf", "5e400", float("nan")):
            self.assertEqual(clamp_score(value), 0, value)


class TestGradingReportsItsOwnFailure(unittest.TestCase):

    def test_an_empty_object_is_a_failure_not_a_zero(self):
        result = grade("{}")

        self.assertFalse(result["evaluated"])
        self.assertTrue(result["evaluation_error"])
        self.assertEqual(result["overall_score"], 0)

    def test_the_candidate_is_told_the_scoring_did_not_finish(self):
        result = grade("{}")

        # The wording has to say the step failed, not that the answers
        # were poor.
        self.assertIn("score", result["evaluation_error"].lower())
        self.assertEqual(result["evaluation_error"], evaluator.NOT_SCORED_FAILED)

    def test_the_answers_are_still_returned(self):
        # A failed grading must not lose the candidate's work.
        result = grade("{}")

        self.assertEqual(len(result["per_question"]), 2)
        self.assertEqual(result["per_question"][0]["answer"], ANSWERS[0])
        self.assertEqual(result["per_question"][1]["answer"], ANSWERS[1])

    def test_prose_with_no_scores_is_a_failure(self):
        result = grade(json.dumps({
            "strengths": ["Good structure"],
            "improvements": ["Add detail"],
        }))

        self.assertFalse(result["evaluated"])

    def test_a_real_grade_is_unaffected(self):
        result = grade(json.dumps({
            "category_scores": {
                "technical_knowledge": 70,
                "communication": 60,
            },
            "per_question": [
                {"question_number": 1, "score": 80, "what_was_good": "Named the B-tree."},
                {"question_number": 2, "score": 60, "what_was_missing": "No version column."},
            ],
            "strengths": ["Explains mechanisms"],
            "improvements": ["Be concrete about locking"],
        }))

        self.assertTrue(result["evaluated"])
        self.assertEqual(result["evaluation_error"], "")
        self.assertEqual(result["per_question"][0]["score"], 80)
        self.assertGreater(result["overall_score"], 0)

    def test_a_non_finite_grade_is_a_failure_not_a_zero(self):
        # Reproduced from the follow-up review: "NaN" passed the first
        # version of the guard and was presented as a scored 0.
        result = grade(json.dumps({
            "category_scores": {"technical_knowledge": "NaN", "communication": "NaN"},
        }))

        self.assertFalse(result["evaluated"])
        self.assertEqual(result["evaluation_error"], evaluator.NOT_SCORED_FAILED)

    def test_per_question_scores_alone_are_not_an_overall_score(self):
        # The overall is the mean of the category scores. With none of
        # them scored that mean is empty, and the 0 falling out of it
        # is a number the model never arrived at - which would be
        # stored as the candidate's score and compared with real ones.
        result = grade(json.dumps({
            "per_question": [{"question_number": 1, "score": 55}],
        }))

        self.assertFalse(result["evaluated"])
        self.assertEqual(result["evaluation_error"], evaluator.NOT_SCORED_FAILED)

    def test_one_scored_category_is_still_a_grade(self):
        # The line is "no category at all", not "fewer than four".
        result = grade(json.dumps({
            "category_scores": {"communication": 60},
        }))

        self.assertTrue(result["evaluated"])
        self.assertTrue(result["partial"])
        self.assertEqual(result["overall_score"], 60)

    def test_a_partial_grade_averages_only_what_was_assessed(self):
        # Reproduced from the follow-up review: one category at 80 used
        # to become an overall of 20, because the three the model
        # skipped were averaged in as zeros.
        result = grade(json.dumps({
            "category_scores": {"technical_knowledge": 80},
            "per_question": [{"question_number": 1, "score": 80}],
        }))

        self.assertTrue(result["evaluated"])
        self.assertTrue(result["partial"])
        self.assertEqual(result["overall_score"], 80)

    def test_a_partial_grade_names_what_was_not_assessed(self):
        result = grade(json.dumps({
            "category_scores": {"technical_knowledge": 80, "communication": 60},
        }))

        self.assertEqual(
            sorted(result["unscored_categories"]),
            ["Depth of Detail", "Problem Solving"],
        )

    def test_an_unassessed_category_is_marked_rather_than_zeroed(self):
        result = grade(json.dumps({
            "category_scores": {"technical_knowledge": 80},
        }))

        by_key = {c["key"]: c for c in result["category_scores"]}

        self.assertTrue(by_key["technical_knowledge"]["scored"])
        self.assertEqual(by_key["technical_knowledge"]["score"], 80)

        # Still 0, because something has to be sent - but said to be
        # unscored, so the page can show it as "not assessed".
        self.assertFalse(by_key["depth"]["scored"])
        self.assertEqual(by_key["depth"]["score"], 0)

    def test_a_complete_grade_is_not_partial_and_keeps_its_old_mean(self):
        # The guarantee that makes this safe to change late: a reply
        # covering every category scores exactly as it did before.
        result = grade(json.dumps({
            "category_scores": {
                "technical_knowledge": 80,
                "depth": 60,
                "problem_solving": 70,
                "communication": 50,
            },
        }))

        self.assertTrue(result["evaluated"])
        self.assertFalse(result["partial"])
        self.assertEqual(result["unscored_categories"], [])
        self.assertEqual(result["overall_score"], 65)
        self.assertTrue(all(c["scored"] for c in result["category_scores"]))

    def test_a_non_finite_category_counts_as_unassessed(self):
        result = grade(json.dumps({
            "category_scores": {"technical_knowledge": 80, "depth": "NaN"},
        }))

        by_key = {c["key"]: c for c in result["category_scores"]}

        self.assertFalse(by_key["depth"]["scored"])
        self.assertIn("Depth of Detail", result["unscored_categories"])

        # "NaN" is not a zero the candidate earned, so it stays out of
        # the mean rather than halving their score.
        self.assertEqual(result["overall_score"], 80)

    def test_a_failed_grade_is_not_called_partial(self):
        # Nothing was graded at all; `evaluated` already says so, and
        # calling it partial would imply part of it is usable.
        result = grade("{}")

        self.assertFalse(result["evaluated"])
        self.assertFalse(result["partial"])
        self.assertEqual(result["unscored_categories"], [])

    def test_a_genuine_all_zero_grade_is_still_reported_as_graded(self):
        # Someone who answered everything wrongly has been graded, and
        # the guard must not turn their 0 into "we could not score it".
        result = grade(json.dumps({
            "category_scores": {"technical_knowledge": 0, "communication": 0},
            "per_question": [
                {"question_number": 1, "score": 0},
                {"question_number": 2, "score": 0},
            ],
        }))

        self.assertTrue(result["evaluated"])
        self.assertEqual(result["evaluation_error"], "")
        self.assertEqual(result["overall_score"], 0)


if __name__ == "__main__":
    unittest.main()
