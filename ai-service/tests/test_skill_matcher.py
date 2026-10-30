"""
Tests for deterministic matching of a CV against one recruiter's
required skills.

Pure Python: no model, no Chroma, no Gemini key. That is the point of
the module under test - a match percentage stored against an
application has to mean the same thing when it is read back, so these
tests pin the arithmetic and the normalization rules down.
"""

import unittest

from app.skill_gap.matcher import (
    calculate_match_percentage,
    match_candidate_to_job,
)


class TestExactMatching(unittest.TestCase):

    def test_the_worked_example_from_the_plan(self):
        """Required Java/Spring Boot/PostgreSQL/Docker against a CV
        with Java/Spring Boot/Git/Docker is 3 of 4, so 75%."""

        result = match_candidate_to_job(
            required_skills=["Java", "Spring Boot", "PostgreSQL", "Docker"],
            candidate_skills=["Java", "Spring Boot", "Git", "Docker"],
        )

        self.assertEqual(result["match_percentage"], 75)
        self.assertEqual(result["required_skill_count"], 4)
        self.assertEqual(
            sorted(result["matched_skills"]),
            ["Docker", "Java", "Spring Boot"],
        )
        self.assertEqual(result["missing_skills"], ["PostgreSQL"])

    def test_everything_matched_is_a_hundred(self):
        result = match_candidate_to_job(
            required_skills=["Java", "Docker"],
            candidate_skills=["Docker", "Java"],
        )

        self.assertEqual(result["match_percentage"], 100)
        self.assertEqual(result["missing_skills"], [])

    def test_nothing_matched_is_zero(self):
        result = match_candidate_to_job(
            required_skills=["Java", "Docker"],
            candidate_skills=["COBOL"],
        )

        self.assertEqual(result["match_percentage"], 0)
        self.assertEqual(result["matched_skills"], [])
        self.assertEqual(len(result["missing_skills"]), 2)

    def test_a_cv_with_no_skills_is_a_real_zero(self):
        """Not an error: the job does state requirements, and this CV
        demonstrates none of them."""

        result = match_candidate_to_job(
            required_skills=["Java", "Docker"],
            candidate_skills=[],
        )

        self.assertEqual(result["match_percentage"], 0)
        self.assertEqual(result["required_skill_count"], 2)

    def test_extra_candidate_skills_do_not_raise_the_percentage(self):
        """The denominator is the job's requirements, so padding a CV
        with unrelated skills cannot help."""

        result = match_candidate_to_job(
            required_skills=["Java", "Docker"],
            candidate_skills=["Java", "Docker", "Excel", "Photoshop", "Fishing"],
        )

        self.assertEqual(result["match_percentage"], 100)
        self.assertEqual(result["required_skill_count"], 2)


class TestNormalization(unittest.TestCase):

    def test_matching_ignores_case(self):
        result = match_candidate_to_job(
            required_skills=["java", "docker"],
            candidate_skills=["JAVA", "Docker"],
        )

        self.assertEqual(result["match_percentage"], 100)

    def test_matching_ignores_surrounding_whitespace(self):
        result = match_candidate_to_job(
            required_skills=["  Java  ", "Docker"],
            candidate_skills=["Java", " docker"],
        )

        self.assertEqual(result["match_percentage"], 100)

    def test_a_repeated_required_skill_is_counted_once(self):
        """Otherwise a recruiter who typed Java twice would make the
        job look twice as demanding and halve everyone's score."""

        result = match_candidate_to_job(
            required_skills=["Java", "java", "JAVA ", "Docker"],
            candidate_skills=["Java"],
        )

        self.assertEqual(result["required_skill_count"], 2)
        self.assertEqual(result["match_percentage"], 50)

    def test_a_repeated_candidate_skill_is_counted_once(self):
        result = match_candidate_to_job(
            required_skills=["Java", "Docker"],
            candidate_skills=["Java", "java", "JAVA"],
        )

        self.assertEqual(result["matched_skills"], ["Java"])
        self.assertEqual(result["match_percentage"], 50)

    def test_blank_entries_are_dropped(self):
        result = match_candidate_to_job(
            required_skills=["Java", "", "   ", "Docker"],
            candidate_skills=["Java", None, "Docker"],
        )

        self.assertEqual(result["required_skill_count"], 2)
        self.assertEqual(result["match_percentage"], 100)

    def test_an_alias_counts_as_the_skill_it_names(self):
        """A CV saying "golang" answers a requirement for "Go", and
        "k8s" answers one for "Kubernetes"."""

        result = match_candidate_to_job(
            required_skills=["Go", "Kubernetes"],
            candidate_skills=["golang", "k8s"],
        )

        self.assertEqual(result["match_percentage"], 100)
        self.assertEqual(result["missing_skills"], [])

    def test_an_alias_in_the_requirement_matches_the_canonical_cv_skill(self):
        result = match_candidate_to_job(
            required_skills=["amazon web services"],
            candidate_skills=["AWS"],
        )

        self.assertEqual(result["match_percentage"], 100)

    def test_the_recruiters_order_is_kept(self):
        result = match_candidate_to_job(
            required_skills=["Docker", "Java", "PostgreSQL"],
            candidate_skills=["Java", "Docker", "PostgreSQL"],
        )

        self.assertEqual(
            result["matched_skills"],
            ["Docker", "Java", "PostgreSQL"],
        )

    def test_an_uncatalogued_requirement_still_matches(self):
        """A recruiter may require something the catalogue has never
        heard of; it must not be silently dropped."""

        result = match_candidate_to_job(
            required_skills=["Internal Billing Platform"],
            candidate_skills=["internal billing platform"],
        )

        self.assertEqual(result["match_percentage"], 100)
        self.assertEqual(result["required_skill_count"], 1)


class TestRelatedSkillsStaySeparate(unittest.TestCase):

    def test_a_related_skill_does_not_count_as_a_match(self):
        """Terraform is useful background for Infrastructure as Code
        but is not the same claim, so it is reported separately and the
        requirement stays missing."""

        result = match_candidate_to_job(
            required_skills=["Infrastructure as Code"],
            candidate_skills=["Terraform"],
        )

        self.assertEqual(result["match_percentage"], 0)
        self.assertEqual(result["matched_skills"], [])
        self.assertEqual(result["missing_skills"], ["Infrastructure as Code"])
        self.assertIn("Terraform", result["related_skills"])

    def test_related_skills_are_not_double_reported(self):
        result = match_candidate_to_job(
            required_skills=["Infrastructure as Code"],
            candidate_skills=["Terraform", "terraform"],
        )

        self.assertEqual(result["related_skills"].count("Terraform"), 1)

    def test_a_matched_requirement_contributes_no_related_skills(self):
        result = match_candidate_to_job(
            required_skills=["Terraform"],
            candidate_skills=["Terraform"],
        )

        self.assertEqual(result["match_percentage"], 100)
        self.assertEqual(result["related_skills"], [])


class TestEmptyRequirements(unittest.TestCase):

    def test_no_required_skills_is_refused(self):
        """A job with nothing stated is not ready for this workflow.
        Returning 0% would read as a uniformly terrible field of
        candidates."""

        with self.assertRaises(ValueError):
            match_candidate_to_job(
                required_skills=[],
                candidate_skills=["Java"],
            )

    def test_only_blank_required_skills_is_refused(self):
        with self.assertRaises(ValueError):
            match_candidate_to_job(
                required_skills=["", "   "],
                candidate_skills=["Java"],
            )


class TestRounding(unittest.TestCase):
    """Half-up, to match Java's Math.round on the same numbers. The
    builtin round() is half-to-even and would disagree on .5."""

    def test_half_rounds_up(self):
        # 5 of 8 is 62.5
        self.assertEqual(calculate_match_percentage(5, 8), 63)

    def test_the_other_half_case_rounds_up_too(self):
        # 1 of 8 is 12.5
        self.assertEqual(calculate_match_percentage(1, 8), 13)

    def test_a_third_rounds_down(self):
        # 1 of 3 is 33.33
        self.assertEqual(calculate_match_percentage(1, 3), 33)

    def test_two_thirds_rounds_up(self):
        # 2 of 3 is 66.67
        self.assertEqual(calculate_match_percentage(2, 3), 67)

    def test_one_of_seven(self):
        # 14.28
        self.assertEqual(calculate_match_percentage(1, 7), 14)

    def test_no_requirements_is_zero_not_a_division_error(self):
        self.assertEqual(calculate_match_percentage(0, 0), 0)

    def test_the_end_points_are_exact(self):
        self.assertEqual(calculate_match_percentage(0, 9), 0)
        self.assertEqual(calculate_match_percentage(9, 9), 100)

    def test_rounding_through_the_public_entry_point(self):
        result = match_candidate_to_job(
            required_skills=["a", "b", "c", "d", "e", "f", "g", "h"],
            candidate_skills=["a", "b", "c", "d", "e"],
        )

        self.assertEqual(result["match_percentage"], 63)


if __name__ == "__main__":
    unittest.main()
