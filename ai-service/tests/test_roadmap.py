"""
Tests for 14-Day Learning Roadmap generator.
"""

import json
import os
import unittest
from unittest.mock import patch

from langchain_core.language_models.fake_chat_models import GenericFakeChatModel
from langchain_core.messages import AIMessage

from app.roadmap.schemas import (
    DayPlan,
    Milestone,
    RoadmapGenerateRequest,
    RoadmapResponse,
)
from app.roadmap.generator import generate_roadmap, _build_fallback_roadmap


class TestRoadmapGenerator(unittest.TestCase):

    def test_01_schema_validation(self):
        """Test DayPlan and RoadmapResponse schemas."""
        day = DayPlan(
            day=1,
            title="Day 1: Concurrency Primitives",
            phase="Core Foundations",
            focus_area="Concurrency",
            objective="Master thread synchronization",
            tasks=["Read docs", "Write code"],
            resources=["Java Concurrency in Practice"],
            estimated_hours=2,
            completed=False,
        )
        self.assertEqual(day.day, 1)
        self.assertFalse(day.completed)

        milestone = Milestone(
            phase=1,
            title="Core Foundations",
            day_range="Days 1 - 4",
            description="Foundation phase",
        )
        self.assertEqual(milestone.phase, 1)

    def test_02_fallback_roadmap_generation(self):
        """Test deterministic fallback 14-day roadmap generation."""
        req = RoadmapGenerateRequest(
            target_role="Full Stack Engineer",
            job_field="software_engineering",
            weaknesses=["Database deadlock scenarios", "Docker multi-stage builds"],
            strengths=["React component lifecycle"],
            duration_days=14,
            overall_score=68,
        )

        roadmap = _build_fallback_roadmap(req)
        self.assertIsInstance(roadmap, RoadmapResponse)
        self.assertEqual(roadmap.duration_days, 14)
        self.assertEqual(len(roadmap.days), 14)
        self.assertEqual(len(roadmap.milestones), 4)

        # Check day ordering
        for i, day in enumerate(roadmap.days):
            self.assertEqual(day.day, i + 1)
            self.assertTrue(len(day.tasks) >= 2)
            self.assertTrue(len(day.resources) >= 1)
            self.assertTrue(day.estimated_hours >= 1)

        # Verify weaknesses are targeted
        weakness_found = any(
            "deadlock" in day.title.lower() or "deadlock" in day.objective.lower()
            for day in roadmap.days
        )
        self.assertTrue(weakness_found, "Targeted weakness should appear in roadmap plan")

    def test_03_generate_roadmap_end_to_end(self):
        """Test main generate_roadmap function."""
        req = RoadmapGenerateRequest(
            target_role="Backend Systems Architect",
            weaknesses=["Distributed transaction rollbacks", "Kafka partition rebalancing"],
            missing_skills=["Kafka", "Redis"],
            overall_score=72,
            duration_days=14,
        )

        res = generate_roadmap(req)
        self.assertIsInstance(res, RoadmapResponse)
        self.assertEqual(res.duration_days, 14)
        self.assertEqual(len(res.days), 14)
        self.assertTrue("Backend Systems Architect" in res.target_role)

    def test_04_reads_gemini_content_blocks(self):
        """
        A model that answers with a list of content blocks, as newer
        Gemini models can, must still produce the AI roadmap. Reading
        response.content directly broke on the list and fell back to the
        generic plan without saying so.
        """
        plan = {
            "title": "AI-written roadmap",
            "target_role": "Backend Engineer",
            "summary": "Built from the model's answer.",
            "focus_areas": ["Kafka"],
            "milestones": [
                {"phase": 1, "title": "Foundations", "day_range": "Days 1 - 14", "description": ""}
            ],
            "days": [
                {"day": d, "title": f"Day {d}", "phase": "Foundations", "focus_area": "Kafka",
                 "objective": "Learn", "tasks": ["Read", "Build"], "resources": ["Docs"],
                 "estimated_hours": 2}
                for d in range(1, 15)
            ],
        }

        model = GenericFakeChatModel(messages=iter([
            AIMessage(content=[{"type": "text", "text": json.dumps(plan)}])
        ]))

        req = RoadmapGenerateRequest(target_role="Backend Engineer", duration_days=14)

        with patch.dict(os.environ, {"GEMINI_API_KEY": "test"}), \
                patch("app.roadmap.generator._get_llm", return_value=model), \
                patch("app.roadmap.generator._extract_rag_context", return_value=""):
            res = generate_roadmap(req)

        self.assertEqual(res.title, "AI-written roadmap")
        self.assertEqual(len(res.days), 14)


if __name__ == "__main__":
    unittest.main()
