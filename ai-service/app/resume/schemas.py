from typing import List
from pydantic import BaseModel, Field


class ResumeAnalysisRequest(BaseModel):
    resume_id: int = Field(..., description="Resume ID from Spring Boot/PostgreSQL")
    text: str = Field(..., min_length=20, description="Extracted resume text")


class ExperienceItem(BaseModel):
    company: str = ""
    role: str = ""
    duration: str = ""
    description: str = ""


class EducationItem(BaseModel):
    institution: str = ""
    degree: str = ""
    field: str = ""
    year: str = ""


class ResumeAnalysisResponse(BaseModel):
    resume_id: int
    score: int
    summary: str
    skills: List[str]
    experience: List[ExperienceItem]
    education: List[EducationItem]
    strengths: List[str]
    weaknesses: List[str]
    missing_skills: List[str]
    recommendations: List[str]