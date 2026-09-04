import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.resume.schemas import (
    ResumeAnalysisResponse,
    ExperienceItem,
    EducationItem,
    ProjectItem,
    RecommendedJobField,
)

from app.skill_gap.skill_catalog import (
    JOB_FIELDS,
    SKILL_ALIASES,
)


load_dotenv()


# ============================================================
# Gemini Extraction Prompt
# ============================================================

RESUME_EXTRACTION_PROMPT = """
You are an expert Resume Information Extraction system.

Your task is to extract factual information from the candidate
resume for an AI Interview Preparation Platform.

IMPORTANT:

Use ONLY information explicitly present in the resume.

DO NOT:
- invent information
- infer information that is not stated
- create fake companies
- create fake job roles
- create fake dates
- create fake skills
- create fake certifications
- create fake projects
- assign a score
- evaluate the candidate
- generate missing skills
- recommend a job field

Return ONLY valid JSON.

Do NOT use markdown.
Do NOT wrap the JSON in ```json.

Required JSON structure:

{{
    "summary": "",
    "skills": [],
    "experience": [],
    "education": [],
    "projects": [],
    "certifications": []
}}

Experience structure:

{{
    "company": "",
    "role": "",
    "duration": "",
    "description": ""
}}

Education structure:

{{
    "institution": "",
    "degree": "",
    "field": "",
    "year": ""
}}

Project structure:

{{
    "name": "",
    "description": "",
    "technologies": []
}}

Rules:

1. skills:
   - Include only skills explicitly mentioned in the resume.
   - Preserve the actual skill or technology name.
   - Do not infer skills from job titles.
   - Do not invent skills.

2. experience:
   - Include actual professional, employment, internship,
     freelance, founder, operator, or entrepreneurial experience
     explicitly stated in the resume.
   - Academic projects must NOT be treated as professional experience.
   - A founder/operator role can be included as professional
     experience when explicitly stated.

3. education:
   - Include only education explicitly stated in the resume.

4. projects:
   - Include academic, personal, or professional projects
     explicitly mentioned in the resume.
   - Extract technologies explicitly associated with each project.
   - Do not infer technologies from the project name.
   - Do not invent technologies.

5. certifications:
   - Include only explicitly stated certifications.
   - If there are none, return [].

6. summary:
   - Summarize only facts explicitly available in the resume.
   - Do not add unsupported claims.

7. If information is unavailable:
   - Return an empty string or empty list.

Resume:

{resume_text}
"""


# ============================================================
# Gemini
# ============================================================

def _get_llm():

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is not configured."
        )

    return ChatGoogleGenerativeAI(
        model="gemini-flash-lite-latest",
        google_api_key=api_key,
        temperature=0.0,
    )


# ============================================================
# JSON Cleaning
# ============================================================

def _clean_json_response(
    text: str,
) -> str:

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


# ============================================================
# Safe Parsers
# ============================================================

def _safe_string(
    value: Any,
) -> str:

    if value is None:
        return ""

    return str(value).strip()


def _safe_string_list(
    value: Any,
) -> list[str]:

    if not isinstance(value, list):
        return []

    result = []

    for item in value:

        if item is None:
            continue

        item_string = str(item).strip()

        if item_string:
            result.append(item_string)

    return result


def _parse_experience(
    value: Any,
) -> list[ExperienceItem]:

    if not isinstance(value, list):
        return []

    result = []

    for item in value:

        if not isinstance(item, dict):
            continue

        result.append(
            ExperienceItem(
                company=_safe_string(
                    item.get("company")
                ),
                role=_safe_string(
                    item.get("role")
                ),
                duration=_safe_string(
                    item.get("duration")
                ),
                description=_safe_string(
                    item.get("description")
                ),
            )
        )

    return result


def _parse_education(
    value: Any,
) -> list[EducationItem]:

    if not isinstance(value, list):
        return []

    result = []

    for item in value:

        if not isinstance(item, dict):
            continue

        result.append(
            EducationItem(
                institution=_safe_string(
                    item.get("institution")
                ),
                degree=_safe_string(
                    item.get("degree")
                ),
                field=_safe_string(
                    item.get("field")
                ),
                year=_safe_string(
                    item.get("year")
                ),
            )
        )

    return result


def _parse_projects(
    value: Any,
) -> list[ProjectItem]:

    if not isinstance(value, list):
        return []

    result = []

    for item in value:

        if not isinstance(item, dict):
            continue

        result.append(
            ProjectItem(
                name=_safe_string(
                    item.get("name")
                ),
                description=_safe_string(
                    item.get("description")
                ),
                technologies=_safe_string_list(
                    item.get(
                        "technologies",
                        [],
                    )
                ),
            )
        )

    return result


# ============================================================
# Skill Normalization
# ============================================================
#
# Purpose:
# Convert different spellings into a consistent format.
#
# Examples:
#
#   "AWS"          -> "aws"
#   "Node.js"      -> "node.js"
#   "NodeJS"       -> "nodejs"
#   "Bash Script"  -> "bash script"
#
# NOTE:
# Normalization alone does NOT mean two skills are equal.
# Alias matching is handled separately.
#
# ============================================================

def _normalize_skill(
    skill: str,
) -> str:

    if not skill:
        return ""

    value = skill.lower().strip()

    # Normalize common punctuation
    value = value.replace(
        "–",
        "-",
    )

    value = value.replace(
        "—",
        "-",
    )

    value = re.sub(
        r"\s+",
        " ",
        value,
    )

    value = re.sub(
        r"[^a-z0-9+#./ -]",
        "",
        value,
    )

    return value.strip()


# ============================================================
# Build Alias Lookup
# ============================================================
#
# Convert:
#
#   {
#       "Kubernetes": ["K8s", "K8"],
#       "Node.js": ["NodeJS"]
#   }
#
# into:
#
#   {
#       "kubernetes": "Kubernetes",
#       "k8s": "Kubernetes",
#       "k8": "Kubernetes",
#       "node.js": "Node.js",
#       "nodejs": "Node.js"
#   }
#
# ============================================================

def _build_alias_lookup() -> dict[str, str]:

    alias_lookup = {}

    for canonical_skill, aliases in SKILL_ALIASES.items():

        # Canonical skill itself
        canonical_normalized = _normalize_skill(
            canonical_skill
        )

        if canonical_normalized:

            alias_lookup[
                canonical_normalized
            ] = canonical_skill

        # Explicit aliases
        for alias in aliases:

            alias_normalized = _normalize_skill(
                alias
            )

            if not alias_normalized:
                continue

            alias_lookup[
                alias_normalized
            ] = canonical_skill

    return alias_lookup


# Build once when module is loaded
SKILL_ALIAS_LOOKUP = _build_alias_lookup()


# ============================================================
# Convert Candidate Skill to Canonical Skill
# ============================================================

def _canonicalize_skill(
    skill: str,
) -> str | None:

    normalized = _normalize_skill(
        skill
    )

    if not normalized:
        return None

    return SKILL_ALIAS_LOOKUP.get(
        normalized
    )


# ============================================================
# Build Candidate Canonical Skill Set
# ============================================================
#
# Example:
#
# Resume:
#
#   K8s
#   Amazon Web Services
#   NodeJS
#
# becomes:
#
#   {
#       "Kubernetes",
#       "AWS",
#       "Node.js"
#   }
#
# ============================================================

def _build_candidate_skill_set(
    skills: list[str],
    projects: list[ProjectItem],
) -> set[str]:

    candidate_skills = set()

    # --------------------------------------------------------
    # Resume skill section
    # --------------------------------------------------------

    for skill in skills:

        canonical_skill = _canonicalize_skill(
            skill
        )

        if canonical_skill:

            candidate_skills.add(
                canonical_skill
            )

    # --------------------------------------------------------
    # Project technologies
    # --------------------------------------------------------

    for project in projects:

        for technology in project.technologies:

            canonical_skill = _canonicalize_skill(
                technology
            )

            if canonical_skill:

                candidate_skills.add(
                    canonical_skill
                )

    return candidate_skills


# ============================================================
# Job Field Match
# ============================================================
#
# ONLY canonical skills are compared.
#
# Related skills are NOT used here.
#
# Example:
#
# Candidate:
#   Docker
#   Kubernetes
#
# Required:
#   Docker
#   Kubernetes
#   Networking
#   Monitoring
#
# Result:
#   2 / 4 = 50%
#
# ============================================================

def _calculate_job_field_match(
    candidate_skills: set[str],
    required_skills: list[str],
) -> tuple[int, list[str]]:

    if not required_skills:

        return 0, []

    matched_skills = []

    for required_skill in required_skills:

        canonical_required = (
            _canonicalize_skill(
                required_skill
            )
        )

        if not canonical_required:
            continue

        if canonical_required in candidate_skills:

            matched_skills.append(
                required_skill
            )

    percentage = round(
        (
            len(matched_skills)
            / len(required_skills)
        ) * 100
    )

    return percentage, matched_skills


# ============================================================
# Recommend Job Fields
# ============================================================

def _recommend_job_fields(
    skills: list[str],
    projects: list[ProjectItem],
) -> list[RecommendedJobField]:

    candidate_skills = (
        _build_candidate_skill_set(
            skills=skills,
            projects=projects,
        )
    )

    print(
        "\n========== CANONICAL CANDIDATE SKILLS =========="
    )

    for skill in sorted(candidate_skills):

        print(
            f"- {skill}"
        )

    print(
        "=================================================\n"
    )

    recommendations = []

    for field_key, field_data in JOB_FIELDS.items():

        required_skills = field_data.get(
            "skills",
            [],
        )

        field_name = field_data.get(
            "name",
            field_key,
        )

        match_percentage, matched_skills = (
            _calculate_job_field_match(
                candidate_skills=candidate_skills,
                required_skills=required_skills,
            )
        )

        print(
            f"[JobField] {field_name}: "
            f"{match_percentage}% "
            f"({len(matched_skills)}/"
            f"{len(required_skills)})"
        )

        recommendations.append(
            RecommendedJobField(
                field=field_key,
                name=field_name,
                match_percentage=match_percentage,
            )
        )

    # --------------------------------------------------------
    # Highest match first
    # --------------------------------------------------------

    recommendations.sort(
        key=lambda item: (
            -item.match_percentage,
            item.name,
        )
    )

    return recommendations


# ============================================================
# Main Resume Analysis
# ============================================================

def analyze_resume(
    resume_id: int,
    resume_text: str,
) -> ResumeAnalysisResponse:

    if not resume_text or not resume_text.strip():

        raise ValueError(
            "Resume text cannot be empty."
        )

    print(
        f"[ResumeAnalyzer] Starting analysis "
        f"for resume ID: {resume_id}"
    )

    # --------------------------------------------------------
    # 1. Build Prompt
    # --------------------------------------------------------

    prompt = PromptTemplate(
        template=RESUME_EXTRACTION_PROMPT,
        input_variables=[
            "resume_text"
        ],
    )

    # --------------------------------------------------------
    # 2. Gemini
    # --------------------------------------------------------

    llm = _get_llm()

    chain = (
        prompt
        | llm
        | StrOutputParser()
    )

    # --------------------------------------------------------
    # 3. Gemini Extraction
    # --------------------------------------------------------

    raw_response = chain.invoke(
        {
            "resume_text": resume_text,
        }
    )

    print(
        "[ResumeAnalyzer] Gemini extraction completed."
    )

    # --------------------------------------------------------
    # 4. Clean JSON
    # --------------------------------------------------------

    cleaned_response = (
        _clean_json_response(
            raw_response
        )
    )

    print(
        "\n========== GEMINI EXTRACTION =========="
    )

    print(
        cleaned_response
    )

    print(
        "=======================================\n"
    )

    # --------------------------------------------------------
    # 5. Parse JSON
    # --------------------------------------------------------

    try:

        data = json.loads(
            cleaned_response
        )

    except json.JSONDecodeError as e:

        raise ValueError(
            f"Gemini returned invalid JSON: {e}. "
            f"Response: "
            f"{cleaned_response[:1500]}"
        )

    if not isinstance(data, dict):

        raise ValueError(
            "Gemini response must be a JSON object."
        )

    # --------------------------------------------------------
    # 6. Structured Resume Data
    # --------------------------------------------------------

    summary = _safe_string(
        data.get(
            "summary",
            "",
        )
    )

    skills = _safe_string_list(
        data.get(
            "skills",
            [],
        )
    )

    experience = _parse_experience(
        data.get(
            "experience",
            [],
        )
    )

    education = _parse_education(
        data.get(
            "education",
            [],
        )
    )

    projects = _parse_projects(
        data.get(
            "projects",
            [],
        )
    )

    certifications = _safe_string_list(
        data.get(
            "certifications",
            [],
        )
    )

    # --------------------------------------------------------
    # 7. Job Field Recommendation
    # --------------------------------------------------------

    recommended_job_fields = (
        _recommend_job_fields(
            skills=skills,
            projects=projects,
        )
    )

    # --------------------------------------------------------
    # 8. Print Top Recommendation
    # --------------------------------------------------------

    if recommended_job_fields:

        top_field = (
            recommended_job_fields[0]
        )

        print(
            "\n[ResumeAnalyzer] "
            f"Recommended Job Field: "
            f"{top_field.name} "
            f"({top_field.match_percentage}%)"
        )

    # --------------------------------------------------------
    # 9. Final Response
    # --------------------------------------------------------

    result = ResumeAnalysisResponse(
        resume_id=resume_id,
        summary=summary,
        skills=skills,
        experience=experience,
        education=education,
        projects=projects,
        certifications=certifications,
        recommended_job_fields=(
            recommended_job_fields
        ),
    )

    print(
        "[ResumeAnalyzer] "
        "Resume analysis completed."
    )

    return result