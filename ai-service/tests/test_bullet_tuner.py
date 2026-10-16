"""
Tests for the CV bullet tuner's guards.

No Gemini here: these check the Python that stops the model's draft
from carrying facts the candidate never gave.
"""

import unittest

from app.resume.bullet_tuner import (
    GAP_PATTERN,
    INVENTED_NUMBER_GAP,
    reconcile_gaps,
    remove_invented_numbers,
)
from app.resume.cv_review import find_weak_bullets


class TestInventedNumbers(unittest.TestCase):

    def test_invented_numbers_become_gaps(self):
        # The exact failure the feature was designed against.
        result = remove_invented_numbers(
            "Responsible for creating REST APIs in Spring Boot.",
            "Designed 12 REST APIs handling 20,000 requests/day at 99.9% uptime.",
        )
        self.assertEqual(result["removed"], 3)
        # No digit left outside the gaps, and words keep their spacing.
        outside = GAP_PATTERN.sub("", result["draft"])
        self.assertNotRegex(outside, r"\d")
        self.assertIn("[how many?] REST APIs", result["draft"])
        self.assertIn(INVENTED_NUMBER_GAP, result["draft"])

    def test_each_invented_number_gets_its_own_gap(self):
        result = remove_invented_numbers("Built APIs.", "Built 12 APIs for 300 users.")
        self.assertIn("[how many?]", result["draft"])
        self.assertIn("[how many (2)?]", result["draft"])

    def test_numbers_from_the_original_are_kept(self):
        result = remove_invented_numbers(
            "Cut page load by 40% for 1,200 users.",
            "Reduced page load time by 40% for 1200 users, by [what did you change?].",
        )
        self.assertEqual(result["removed"], 0)
        self.assertIn("40%", result["draft"])
        self.assertIn("1200", result["draft"])

    def test_numbers_inside_a_gap_are_questions_not_claims(self):
        result = remove_invented_numbers(
            "Built APIs.",
            "Built [how many, e.g. 3?] APIs.",
        )
        self.assertEqual(result["removed"], 0)


class TestGaps(unittest.TestCase):

    def test_gap_list_matches_the_draft(self):
        draft = "Built [how many?] APIs used by [who?]."
        gaps = reconcile_gaps(draft, [
            {"placeholder": "[who?]", "question": "Who used them?", "hint": "e.g. students"},
            {"placeholder": "[not in draft]", "question": "Ignore me"},
        ])
        self.assertEqual([g["placeholder"] for g in gaps], ["[how many?]", "[who?]"])
        self.assertEqual(gaps[1]["question"], "Who used them?")
        # A gap the model left unexplained still gets a question.
        self.assertTrue(gaps[0]["question"])


class TestWeakBullets(unittest.TestCase):

    def test_finds_weak_openers_and_unmeasured_lines(self):
        cv = "\n".join([
            "EXPERIENCE",
            "- Responsible for creating REST APIs in Spring Boot",
            "- Reduced query time by 40% by adding indexes",
            "- Worked on the mobile app login screen and settings",
            "- Java",
        ])
        weak = find_weak_bullets(cv)
        self.assertTrue(any("Responsible for" in w for w in weak))
        self.assertTrue(any("Worked on" in w for w in weak))
        self.assertFalse(any("40%" in w for w in weak))
        # Too short to be an achievement.
        self.assertFalse(any(w.strip("- ") == "Java" for w in weak))

    def test_a_quantity_is_not_mistaken_for_a_year(self):
        # Found on a real CV: "2000+" was skipped as the year 2000, so a
        # measured bullet was offered for rewriting as if it had no number.
        weak = find_weak_bullets("- Built a card API that serves 2000+ clients daily")
        self.assertEqual(weak, [])
        # The same bullet without the figure is offered.
        weak = find_weak_bullets("- Built a card API that serves clients daily")
        self.assertEqual(len(weak), 1)

    def test_a_bullet_cut_off_by_a_line_wrap_is_not_offered(self):
        weak = find_weak_bullets(
            "- Created an automated test framework for web service endpoints, which accounts for"
        )
        self.assertEqual(weak, [])

    def test_a_wrapped_bullet_is_joined_before_judging(self):
        # From the sample CV: the figure was on the second line, so the
        # bullet looked unmeasured until the lines were joined.
        cv = (
            "\x7f Initiated new support techniques that enhanced customer satisfaction ratings and reduced call\n"
            "volume, saving $110K in overhead costs.\n"
            "\x7f Worked on the internal ticketing dashboard for the support team\n"
        )
        weak = find_weak_bullets(cv)
        self.assertEqual(weak, ["Worked on the internal ticketing dashboard for the support team"])

    def test_a_certification_line_is_not_offered(self):
        self.assertEqual(find_weak_bullets("- AWS Certified Solutions Architect"), [])


if __name__ == "__main__":
    unittest.main()
