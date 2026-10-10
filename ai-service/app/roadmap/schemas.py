"""
Pydantic schemas for the 14-Day Learning Roadmap generator.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DayPlan(BaseModel):
    day: int = Field(
        ...,
        description="Day number in the roadmap (1 to 14).",
    )
    title: str = Field(
        ...,
        description="Descriptive title of the day's study topic.",
    )
    phase: str = Field(
        ...,
        description="Milestone or phase name this day belongs to.",
    )
    focus_area: str = Field(
        ...,
        description="Domain or subject area, e.g. Concurrency, Database, System Design.",
    )
    objective: str = Field(
        ...,
        description="Key learning outcome and target competence for this day.",
    )
    tasks: List[str] = Field(
        default_factory=list,
        description="Actionable tasks, practice exercises, or coding problems.",
    )
    resources: List[str] = Field(
        default_factory=list,
        description="Recommended documentation, articles, or tutorials.",
    )
    estimated_hours: int = Field(
        default=2,
        description="Estimated commitment required in hours.",
    )
    completed: bool = Field(
        default=False,
        description="Whether the candidate has marked this day complete.",
    )


class Milestone(BaseModel):
    phase: int = Field(
        ...,
        description="Milestone phase number (1, 2, 3, 4).",
    )
    title: str = Field(
        ...,
        description="Milestone title, e.g. Foundation & Core Gaps.",
    )
    day_range: str = Field(
        ...,
        description="Days covered, e.g. Days 1 - 4.",
    )
    description: str = Field(
        ...,
        description="Summary of the milestone goal.",
    )


class RoadmapGenerateRequest(BaseModel):
    target_role: Optional[str] = Field(
        default="Software Engineer",
        description="Target job title or role.",
    )
    job_field: Optional[str] = Field(
        default="",
        description="Job field identifier, e.g. software_engineering, devops_cloud.",
    )
    candidate_resume: Optional[str] = Field(
        default="",
        description="Candidate resume text if available.",
    )
    weaknesses: List[str] = Field(
        default_factory=list,
        description="Weaknesses or areas needing improvement from the interview or CV.",
    )
    strengths: List[str] = Field(
        default_factory=list,
        description="Demonstrated candidate strengths.",
    )
    missing_skills: List[str] = Field(
        default_factory=list,
        description="Missing skills identified during gap analysis.",
    )
    per_question_feedback: Optional[List[Dict[str, Any]]] = Field(
        default_factory=list,
        description="Per-question scoring breakdown with what_was_missing concepts.",
    )
    overall_score: Optional[int] = Field(
        default=None,
        description="Overall score from 0 to 100.",
    )
    duration_days: int = Field(
        default=14,
        ge=7,
        le=30,
        description="Total duration in days (default 14).",
    )


class RoadmapResponse(BaseModel):
    title: str = Field(
        ...,
        description="Title of the personalized roadmap.",
    )
    target_role: str = Field(
        ...,
        description="Target role or specialization.",
    )
    duration_days: int = Field(
        default=14,
        description="Total roadmap duration in days.",
    )
    summary: str = Field(
        ...,
        description="High-level overview of the personalized 14-day upskilling strategy.",
    )
    focus_areas: List[str] = Field(
        default_factory=list,
        description="Key technical pillars addressed by this roadmap.",
    )
    milestones: List[Milestone] = Field(
        default_factory=list,
        description="Phased progression milestones.",
    )
    days: List[DayPlan] = Field(
        default_factory=list,
        description="Ordered list of day-by-day learning and practice schedules.",
    )
