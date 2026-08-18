import json
import os
from typing import Any

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.rag.vector_store import get_or_create_vector_store
from app.rag.retriever import retrieve_relevant_chunks

from app.resume.schemas import (
    ResumeAnalysisResponse,
    ExperienceItem,
    EducationItem,
)

load_dotenv()


RESUME_ANALYSIS_PROMPT = """
You are an expert AI Resume Analyzer for an AI Interview Preparation Platform.

Analyze the candidate resume using ONLY:

1. The provided resume text.
2. The retrieved interview/job knowledge context.

Do NOT invent candidate experience, education, skills, companies, dates, or achievements.

Return ONLY valid JSON.
Do NOT use markdown.
Do NOT wrap the JSON in ```json.

Required JSON structure:

{{
  "score": 0,
  "summary": "",
  "skills": [],
  "experience": [],
  "education": [],
  "strengths": [],
  "weaknesses": [],
  "missing_skills": [],
  "recommendations": []
}}

Experience object structure:

{{
  "company": "",
  "role": "",
  "duration": "",
  "description": ""
}}

Education object structure:

{{
  "institution": "",
  "degree": "",
  "field": "",
  "year": ""
}}

Rules:

- score must be an integer from 0 to 100.
- skills must contain only skills explicitly supported by the resume.
- experience must contain only actual experience found in the resume.
- education must contain only actual education found in the resume.
- strengths must be based on evidence from the resume.
- weaknesses should identify reasonable weaknesses based on the resume.
- missing_skills should be based on the retrieved knowledge context.
- recommendations should be practical and specific.
- Do not fabricate information.
- If information is unavailable, use an empty string or empty list.
- Return valid JSON only.

Retrieved Knowledge Context:
{context}

Resume:
{resume_text}
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
        temperature=0.2,
    )


def _clean_json_response(text: str) -> str:
    """
    Cleans Gemini response if it contains markdown code fences
    or extra whitespace.
    """

    text = text.strip()

    if text.startswith("```json"):
        text = text[len("```json"):].strip()

    elif text.startswith("```"):
        text = text[len("```"):].strip()

    if text.endswith("```"):
        text = text[:-3].strip()

    # Handle accidental text before/after JSON
    start = text.find("{")
    end = text.rfind("}")

    if start != -1 and end != -1 and end > start:
        text = text[start:end + 1]

    return text.strip()


def _safe_string(value: Any) -> str:
    if value is None:
        return ""

    return str(value)


def _safe_string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    return [
        str(item).strip()
        for item in value
        if item is not None and str(item).strip()
    ]


def _parse_experience(value: Any) -> list[ExperienceItem]:
    if not isinstance(value, list):
        return []

    result = []

    for item in value:
        if not isinstance(item, dict):
            continue

        result.append(
            ExperienceItem(
                company=_safe_string(item.get("company")),
                role=_safe_string(item.get("role")),
                duration=_safe_string(item.get("duration")),
                description=_safe_string(item.get("description")),
            )
        )

    return result


def _parse_education(value: Any) -> list[EducationItem]:
    if not isinstance(value, list):
        return []

    result = []

    for item in value:
        if not isinstance(item, dict):
            continue

        result.append(
            EducationItem(
                institution=_safe_string(item.get("institution")),
                degree=_safe_string(item.get("degree")),
                field=_safe_string(item.get("field")),
                year=_safe_string(item.get("year")),
            )
        )

    return result


def analyze_resume(
    resume_id: int,
    resume_text: str,
) -> ResumeAnalysisResponse:

    if not resume_text or not resume_text.strip():
        raise ValueError("Resume text cannot be empty.")

    print(
        f"[ResumeAnalyzer] Starting analysis for resume ID: {resume_id}"
    )

    # ---------------------------------------------------------
    # 1. Load Chroma knowledge base
    # ---------------------------------------------------------

    vector_store = get_or_create_vector_store()

    # ---------------------------------------------------------
    # 2. Retrieve relevant knowledge
    # ---------------------------------------------------------

    retrieval_query = f"""
    Analyze this candidate resume for interview preparation.

    Identify relevant skills, technologies, job requirements,
    interview competencies, and areas where candidates commonly
    need improvement.

    Resume:
    {resume_text[:6000]}
    """

    retrieved_chunks = retrieve_relevant_chunks(
        vector_store,
        retrieval_query,
        k=5,
    )

    if retrieved_chunks:
        context = "\n\n---\n\n".join(
            doc.page_content
            for doc in retrieved_chunks
        )
    else:
        context = (
            "No relevant knowledge was retrieved "
            "from the knowledge base."
        )

    print(
        f"[ResumeAnalyzer] Retrieved "
        f"{len(retrieved_chunks)} knowledge chunk(s)."
    )

    # ---------------------------------------------------------
    # 3. Build prompt
    # ---------------------------------------------------------

    prompt = PromptTemplate(
        template=RESUME_ANALYSIS_PROMPT,
        input_variables=["context", "resume_text"],
    )

    llm = _get_llm()

    chain = (
        prompt
        | llm
        | StrOutputParser()
    )

    # ---------------------------------------------------------
    # 4. Generate Gemini response
    # ---------------------------------------------------------

    raw_response = chain.invoke(
        {
            "context": context,
            "resume_text": resume_text,
        }
    )

    print("[ResumeAnalyzer] Gemini response received.")

    # ---------------------------------------------------------
    # 5. Clean JSON
    # ---------------------------------------------------------

    cleaned_response = _clean_json_response(raw_response)

    print("\n========== GEMINI JSON ==========")
    print(cleaned_response)
    print("=================================\n")

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

    # ---------------------------------------------------------
    # 6. Parse score safely
    # ---------------------------------------------------------

    try:
        score = int(data.get("score", 0))
    except (ValueError, TypeError):
        score = 0

    score = max(0, min(100, score))

    # ---------------------------------------------------------
    # 7. Parse structured fields
    # ---------------------------------------------------------

    experience = _parse_experience(
        data.get("experience", [])
    )

    education = _parse_education(
        data.get("education", [])
    )

    skills = _safe_string_list(
        data.get("skills", [])
    )

    strengths = _safe_string_list(
        data.get("strengths", [])
    )

    weaknesses = _safe_string_list(
        data.get("weaknesses", [])
    )

    missing_skills = _safe_string_list(
        data.get("missing_skills", [])
    )

    recommendations = _safe_string_list(
        data.get("recommendations", [])
    )

    # ---------------------------------------------------------
    # 8. Create validated response
    # ---------------------------------------------------------

    result = ResumeAnalysisResponse(
        resume_id=resume_id,
        score=score,
        summary=_safe_string(
            data.get("summary", "")
        ),
        skills=skills,
        experience=experience,
        education=education,
        strengths=strengths,
        weaknesses=weaknesses,
        missing_skills=missing_skills,
        recommendations=recommendations,
    )

    print(
        f"[ResumeAnalyzer] Analysis completed. "
        f"Score={result.score}"
    )

    return result