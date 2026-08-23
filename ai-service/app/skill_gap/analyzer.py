import json
import os
from typing import Any

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate

from app.skill_gap.schemas import (
    SkillGapRequest,
    SkillGapResponse,
)


load_dotenv()


SKILL_GAP_PROMPT = """
You are an expert AI Skill Gap Analyzer for an AI Interview
Preparation Platform.

Your task is to compare a target job description with a candidate
resume and identify the candidate's job-specific skill gaps.

Use ONLY the information provided in:

1. Job Description
2. Candidate Resume

Do NOT invent skills or experience.

Return ONLY valid JSON.
Do NOT use markdown.
Do NOT wrap the JSON in ```json.

Required JSON structure:

{{
  "required_skills": [],
  "candidate_skills": [],
  "matched_skills": [],
  "missing_skills": [],
  "additional_skills": [],
  "match_percentage": 0,
  "summary": "",
  "recommendations": []
}}

Rules:

1. required_skills:
   - Extract technical and professional skills explicitly required
     or strongly implied by the job description.
   - Include technologies, frameworks, programming languages,
     databases, cloud platforms, tools, and relevant technical
     competencies.

2. candidate_skills:
   - Include only skills supported by the candidate resume.
   - Do not assume a skill merely because the candidate has a
     related skill.

3. matched_skills:
   - Skills that are required by the job and clearly supported
     by the candidate resume.
   - Treat obvious equivalent naming carefully.
   - For example, "Java programming" and "Java" can be considered
     the same skill.

4. missing_skills:
   - Skills required by the job but not clearly supported by
     the candidate resume.
   - These are the primary skill gaps.

5. additional_skills:
   - Skills clearly present in the candidate resume but not
     required by the target job.

6. match_percentage:
   - Integer from 0 to 100.
   - Calculate approximately:
     matched required skills / total required skills * 100.
   - If there are no identifiable required skills, return 0.

7. summary:
   - Give a concise explanation of how well the candidate matches
     the target job.

8. recommendations:
   - Give practical recommendations focused primarily on the
     missing skills.
   - Do not recommend skills that are already clearly present.

Job Description:
{job_description}

Candidate Resume:
{candidate_resume}
"""


def _get_llm():
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is not configured."
        )

    return ChatGoogleGenerativeAI(
        model="gemini-flash-lite-latest",
        google_api_key=api_key,
        temperature=0.1,
    )


def _clean_json_response(text: str) -> str:
    text = text.strip()

    if text.startswith("```json"):
        text = text[len("```json"):].strip()

    elif text.startswith("```"):
        text = text[len("```"):].strip()

    if text.endswith("```"):
        text = text[:-3].strip()

    start = text.find("{")
    end = text.rfind("}")

    if start != -1 and end != -1 and end > start:
        text = text[start:end + 1]

    return text.strip()


def _safe_string(value: Any) -> str:
    if value is None:
        return ""

    return str(value).strip()


def _safe_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    result = []

    for item in value:
        if item is None:
            continue

        value_str = str(item).strip()

        if value_str:
            result.append(value_str)

    return result


def _safe_percentage(value: Any) -> int:
    try:
        percentage = int(value)
    except (ValueError, TypeError):
        percentage = 0

    return max(0, min(100, percentage))


def analyze_skill_gap(
    request: SkillGapRequest,
) -> SkillGapResponse:

    if not request.job_description.strip():
        raise ValueError("Job description cannot be empty.")

    if not request.candidate_resume.strip():
        raise ValueError("Candidate resume cannot be empty.")

    print("[SkillGapAnalyzer] Starting skill gap analysis.")

    prompt = PromptTemplate(
        template=SKILL_GAP_PROMPT,
        input_variables=[
            "job_description",
            "candidate_resume",
        ],
    )

    llm = _get_llm()

    chain = (
        prompt
        | llm
        | StrOutputParser()
    )

    raw_response = chain.invoke(
        {
            "job_description": request.job_description,
            "candidate_resume": request.candidate_resume,
        }
    )

    print("[SkillGapAnalyzer] Gemini response received.")

    cleaned_response = _clean_json_response(raw_response)

    print("\n========== SKILL GAP JSON ==========")
    print(cleaned_response)
    print("====================================\n")

    try:
        data = json.loads(cleaned_response)

    except json.JSONDecodeError as e:
        raise ValueError(
            f"Gemini returned invalid JSON: {e}. "
            f"Response: {cleaned_response[:1500]}"
        )

    if not isinstance(data, dict):
        raise ValueError(
            "Gemini response JSON must be an object."
        )

    required_skills = _safe_string_list(
        data.get("required_skills", [])
    )

    candidate_skills = _safe_string_list(
        data.get("candidate_skills", [])
    )

    matched_skills = _safe_string_list(
        data.get("matched_skills", [])
    )

    missing_skills = _safe_string_list(
        data.get("missing_skills", [])
    )

    additional_skills = _safe_string_list(
        data.get("additional_skills", [])
    )

    match_percentage = _safe_percentage(
        data.get("match_percentage", 0)
    )

    summary = _safe_string(
        data.get("summary", "")
    )

    recommendations = _safe_string_list(
        data.get("recommendations", [])
    )

    result = SkillGapResponse(
        required_skills=required_skills,
        candidate_skills=candidate_skills,
        matched_skills=matched_skills,
        missing_skills=missing_skills,
        additional_skills=additional_skills,
        match_percentage=match_percentage,
        summary=summary,
        recommendations=recommendations,
    )

    print(
        "[SkillGapAnalyzer] Analysis completed. "
        f"Match={result.match_percentage}%"
    )

    return result