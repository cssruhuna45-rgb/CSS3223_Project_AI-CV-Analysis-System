"""
Tests for the checks a drafted job question set must pass.

Pure Python: no model, no Chroma. The same rules are enforced again by
Spring at approval, so these also pin down the shared vocabulary.
"""

import unittest

from app.assessment import validation


def q(text, difficulty="medium", points=("Point one", "Point two", "Point three")):
    return {
        "question": text,
        "difficulty": difficulty,
        "topic": "Topic",
        "key_points": list(points),
    }


GOOD_SET = [
    q("How does a database index speed up a SELECT query?", "easy"),
    q("Explain the difference between optimistic and pessimistic locking.", "easy"),
    q("When would you choose a message queue over a direct REST call?", "medium"),
    q("How do you make a REST endpoint idempotent under client retries?", "medium"),
    q("Describe how you would shard a PostgreSQL table that outgrew one node.", "hard"),
]


class TestQuestionChecks(unittest.TestCase):

    def test_a_good_set_has_no_issues(self):
        self.assertEqual(validation.set_issues(GOOD_SET, 5), [])

    def test_count_must_match_the_recruiters_choice(self):
        issues = validation.set_issues(GOOD_SET[:4], 5)
        self.assertIn("Expected 5 questions, found 4.", issues)

    def test_short_question_is_reported(self):
        issues = validation.question_issues(q("What is REST?"), 3)
        self.assertTrue(any("Question 3 is shorter" in i for i in issues))

    def test_overlong_question_is_reported(self):
        issues = validation.question_issues(q("Explain " + "x" * 700), 1)
        self.assertTrue(any("longer than 600" in i for i in issues))

    def test_unknown_difficulty_is_reported_not_guessed(self):
        normalized = validation.normalize_question(
            {"question": "How does garbage collection work in the JVM?",
             "difficulty": "Expert", "key_points": ["a", "b"]}
        )
        self.assertEqual(normalized["difficulty"], "expert")
        issues = validation.question_issues(normalized, 1)
        self.assertTrue(any("easy, medium or hard" in i for i in issues))

    def test_missing_key_points_are_reported(self):
        issues = validation.question_issues(
            q("How does a database index speed up a SELECT query?", points=["Only one"]), 2
        )
        self.assertTrue(any("at least 2 key points" in i for i in issues))

    def test_duplicates_are_reported(self):
        repeated = GOOD_SET[:4] + [q(GOOD_SET[0]["question"], "hard")]
        issues = validation.set_issues(repeated, 5)
        self.assertIn(
            "Question 5 repeats or closely matches another question.", issues
        )

    def test_existing_questions_count_as_duplicates(self):
        issues = validation.set_issues(
            [GOOD_SET[0]], 1, existing_questions=[GOOD_SET[0]["question"]]
        )
        self.assertTrue(any("repeats" in i for i in issues))


class TestDifficultyMix(unittest.TestCase):

    def test_one_difficulty_for_everything_is_refused(self):
        same = [dict(item, difficulty="easy") for item in GOOD_SET]
        issues = validation.set_issues(same, 5)
        self.assertIn("Use at least two difficulty levels.", issues)

    def test_no_difficulty_may_dominate(self):
        # 5 * 0.6 = 3, so four medium questions is one too many.
        skewed = [dict(item, difficulty="medium") for item in GOOD_SET[:4]] + [GOOD_SET[4]]
        issues = validation.set_issues(skewed, 5)
        self.assertTrue(any("Too many medium" in i for i in issues))

    def test_a_single_replacement_has_no_mix_rule(self):
        self.assertEqual(validation.difficulty_mix_issues([GOOD_SET[0]]), [])

    def test_limits_for_every_allowed_count(self):
        self.assertEqual(validation.max_per_difficulty(5), 3)
        self.assertEqual(validation.max_per_difficulty(10), 6)


if __name__ == "__main__":
    unittest.main()
