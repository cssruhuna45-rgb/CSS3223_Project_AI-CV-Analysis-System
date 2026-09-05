"""
Reviews a CV against documents/cv_resume_standards_guide.md.

This is separate from resume/analyzer.py on purpose. That module
extracts what the CV says; this one judges how well it says it, which is
a different job needing a different reference.

The split of work follows the same rule as skill_gap:

    Python  decides what is objectively true (is there an email? do the
            bullets carry numbers? does it open with "Responsible for"?)
    RAG     supplies the written standard each finding refers to
    Gemini  writes the qualitative advice, grounded in that standard
    Python  computes the score from the checks

So the score is arithmetic over rules that can be pointed at, not a
number the model felt like producing. Two runs over the same CV give the
same score.
"""

import os
import re
from typing import Any, Dict, List

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate

from app.interview.question_generator import get_llm, parse_json_response
from app.rag.retriever import retrieve_relevant_chunks
from app.rag.vector_store import get_or_create_vector_store


# ============================================================
# Configuration
# ============================================================

REFERENCE_CHUNKS = 4
MAX_REFERENCE_CHARS = 700
MAX_RESUME_CHARS = 12000

# Length guidance from section 7.1 of the standards guide. A one-page CV
# is roughly 400-600 words once formatting is stripped.
# A little below what a real one-page CV runs to, because PDF text
# extraction routinely drops some content.
MIN_REASONABLE_WORDS = 150
MAX_ONE_PAGE_WORDS = 900


# Openings that describe presence rather than contribution (section 5).
WEAK_OPENERS = [
    "responsible for",
    "worked on",
    "helped with",
    "involved in",
    "assisted with",
    "tasked with",
    "duties included",
]

# Section 5 action verbs.
ACTION_VERBS = {
    "built", "developed", "implemented", "designed", "architected",
    "engineered", "created", "programmed", "optimised", "optimized",
    "refactored", "reduced", "improved", "accelerated", "streamlined",
    "automated", "migrated", "led", "coordinated", "mentored",
    "supervised", "delivered", "drove", "analysed", "analyzed",
    "diagnosed", "investigated", "debugged", "resolved", "identified",
    "launched", "deployed", "integrated", "maintained", "tested",
}

# Phrases the guide calls out as red flags (sections 4.2 and 8).
RED_FLAG_PATTERNS = [
    (
        r"references?\s+available\s+(up)?on\s+request",
        "\"References available on request\" is assumed and wastes a line.",
    ),
    (
        r"seeking\s+a?\s*challenging\s+(role|position|opportunity)",
        "This is an objective statement, not a summary. Say what you have "
        "done and what role you want.",
    ),
    (
        r"\b(date\s+of\s+birth|d\.?o\.?b\.?)\b",
        "Date of birth should not appear on a CV.",
    ),
    (
        r"\bmarital\s+status\b",
        "Marital status should not appear on a CV.",
    ),
    (
        r"\b(reputed|reputable)\s+organi[sz]ation\b",
        "\"Reputed organisation\" is filler that says nothing about you.",
    ),
]

SECTION_PATTERNS = {
    "summary": r"\b(summary|profile|about\s+me|objective)\b",
    "skills": r"\b(skills|technical\s+skills|technologies)\b",
    "experience": r"\b(experience|employment|work\s+history|internship)\b",
    "education": r"\b(education|academic|qualifications)\b",
    "projects": r"\b(projects?|portfolio)\b",
}


# ============================================================
# Objective checks
#
# Each returns a dict the API can render directly. "passed" is decided
# here in Python; nothing below asks the model whether an email exists.
# ============================================================

BULLET_MARKERS = "-*•·▪◦"


def _looks_like_heading_or_label(line: str) -> bool:
    """
    Section headings, "Languages: Java, Python" style labels, contact
    lines and date ranges are not achievement bullets and must not be
    judged as if they were.
    """

    # "Skills:", "Languages: Java, Python" - a label, not a sentence.
    colon = line.find(":")
    if 0 < colon <= 25:
        return True

    if re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", line):
        return True

    if re.search(r"(https?://|linkedin\.com|github\.com|gitlab\.com)", line, re.I):
        return True

    # "Backend Intern, Tech Solutions Ltd, Jun 2024 - Dec 2024"
    if re.search(r"\b(19|20)\d{2}\b", line) and len(line.split()) <= 12:
        return True

    return False


def _bullet_lines(text: str) -> List[str]:
    """
    The lines that actually make a claim about the candidate.

    Where the CV still has bullet glyphs, those lines are the bullets and
    nothing else is. PDF extraction often strips them, so the fallback
    keeps prose lines and drops headings, labels and contact details -
    counting those as bullets made a well-written CV look as though only
    a fifth of its lines opened with an action verb.
    """

    marked: List[str] = []
    unmarked: List[str] = []

    for raw in text.splitlines():

        stripped = raw.strip()

        if not stripped:
            continue

        is_marked = stripped[0] in BULLET_MARKERS

        line = stripped.lstrip(BULLET_MARKERS + " ").strip()

        if not (15 <= len(line) <= 400):
            continue

        if is_marked:
            marked.append(line)
        elif not _looks_like_heading_or_label(line):
            unmarked.append(line)

    return marked or unmarked


def check_contact(text: str) -> List[Dict[str, Any]]:

    has_email = bool(re.search(r"[\w.+-]+@[\w-]+\.[\w.]+", text))
    has_phone = bool(re.search(r"(\+\d[\d\s\-()]{7,})|(\b0\d{8,}\b)", text))
    has_link = bool(
        re.search(r"(linkedin\.com|github\.com|gitlab\.com)", text, re.I)
    )

    return [
        {
            "key": "contact_email",
            "label": "Email address",
            "passed": has_email,
            "detail": (
                "An email address was found."
                if has_email else
                "No email address found. Recruiters cannot reply to you."
            ),
            "weight": 3,
        },
        {
            "key": "contact_phone",
            "label": "Phone number",
            "passed": has_phone,
            "detail": (
                "A phone number was found."
                if has_phone else
                "No phone number found. Include one with a country code."
            ),
            "weight": 2,
        },
        {
            "key": "contact_links",
            "label": "GitHub or LinkedIn link",
            "passed": has_link,
            "detail": (
                "A professional profile link was found."
                if has_link else
                "No GitHub, GitLab or LinkedIn link. For a technical CV "
                "this is the strongest evidence you can offer."
            ),
            "weight": 3,
        },
    ]


def check_sections(text: str) -> List[Dict[str, Any]]:

    lowered = text.lower()
    found = {
        name: bool(re.search(pattern, lowered))
        for name, pattern in SECTION_PATTERNS.items()
    }

    missing = [name for name, present in found.items() if not present]

    return [{
        "key": "sections",
        "label": "Standard sections",
        "passed": len(missing) == 0,
        "detail": (
            "All the sections an ATS looks for are present."
            if not missing else
            "Missing or non-standard section headings: "
            + ", ".join(sorted(missing))
            + ". Applicant tracking systems look for these exact names."
        ),
        "weight": 3,
    }]


def check_quantified(text: str) -> List[Dict[str, Any]]:

    bullets = _bullet_lines(text)

    # A number that is not a year - years are dates, not achievements.
    metric = re.compile(r"(?<!\d)(?!(?:19|20)\d{2}(?!\d))\d+(?:[.,]\d+)?\s*[%kKmM+]?")

    with_numbers = [b for b in bullets if metric.search(b)]

    ratio = len(with_numbers) / len(bullets) if bullets else 0.0
    passed = ratio >= 0.25 and len(with_numbers) >= 2

    return [{
        "key": "quantified_achievements",
        "label": "Measurable achievements",
        "passed": passed,
        "detail": (
            f"{len(with_numbers)} of {len(bullets)} bullet points carry a "
            "number, which turns a claim into evidence."
            if passed else
            f"Only {len(with_numbers)} of {len(bullets)} bullet points "
            "contain a number. Without figures these read as a job "
            "description rather than achievements."
        ),
        "weight": 4,
    }]


def check_action_verbs(text: str) -> List[Dict[str, Any]]:

    bullets = _bullet_lines(text)
    lowered = text.lower()

    strong = 0
    for b in bullets:
        first = re.split(r"[\s,:]+", b.strip().lower(), maxsplit=1)[0]
        if first in ACTION_VERBS:
            strong += 1

    weak_hits = [w for w in WEAK_OPENERS if w in lowered]

    ratio = strong / len(bullets) if bullets else 0.0
    passed = ratio >= 0.3 and not weak_hits

    if weak_hits:
        detail = (
            "Found weak openings: "
            + ", ".join(f'"{w}"' for w in weak_hits)
            + ". These describe presence, not contribution. Start with "
            "what you did: built, designed, reduced, automated."
        )
    elif passed:
        detail = (
            f"{strong} of {len(bullets)} lines open with a strong action "
            "verb."
        )
    else:
        detail = (
            f"Only {strong} of {len(bullets)} lines open with an action "
            "verb such as built, designed or reduced."
        )

    return [{
        "key": "action_verbs",
        "label": "Action verbs",
        "passed": passed,
        "detail": detail,
        "weight": 3,
    }]


def check_length(text: str) -> List[Dict[str, Any]]:

    words = len(text.split())

    if words < MIN_REASONABLE_WORDS:
        passed = False
        detail = (
            f"About {words} words. That is thin - a recruiter will not "
            "find enough to act on."
        )
    elif words > MAX_ONE_PAGE_WORDS:
        passed = False
        detail = (
            f"About {words} words, which runs well past one page. Long "
            "does not read as experienced; it reads as unable to "
            "prioritise."
        )
    else:
        passed = True
        detail = f"About {words} words, which fits comfortably on a page."

    return [{
        "key": "length",
        "label": "Length",
        "passed": passed,
        "detail": detail,
        "weight": 2,
    }]


def check_red_flags(text: str) -> List[Dict[str, Any]]:

    lowered = text.lower()

    found = [
        message
        for pattern, message in RED_FLAG_PATTERNS
        if re.search(pattern, lowered)
    ]

    return [{
        "key": "red_flags",
        "label": "Red flags",
        "passed": not found,
        "detail": (
            "No common red flags found."
            if not found else
            " ".join(found)
        ),
        "weight": 3,
    }]


def run_objective_checks(resume_text: str) -> List[Dict[str, Any]]:
    """
    Every rule that can be settled without asking a model.
    """

    checks: List[Dict[str, Any]] = []
    checks += check_contact(resume_text)
    checks += check_sections(resume_text)
    checks += check_quantified(resume_text)
    checks += check_action_verbs(resume_text)
    checks += check_length(resume_text)
    checks += check_red_flags(resume_text)
    return checks


def score_from_checks(checks: List[Dict[str, Any]]) -> int:
    """
    Weighted pass rate. Computed here so the number is reproducible and
    every point of it can be traced to a named rule.
    """

    total = sum(c["weight"] for c in checks)

    if not total:
        return 0

    earned = sum(c["weight"] for c in checks if c["passed"])

    return round(100 * earned / total)


# ============================================================
# Reference material
# ============================================================

def retrieve_standards(checks: List[Dict[str, Any]]) -> str:
    """
    Pulls the written standard behind the checks that failed.

    Retrieval is targeted at the failures rather than the whole CV, so
    the advice cites the rule the candidate actually broke.
    """

    failed = [c for c in checks if not c["passed"]]

    queries = [f'CV standard: {c["label"]}' for c in failed] or [
        "What makes a strong technical CV?"
    ]

    try:
        store = get_or_create_vector_store()
    except Exception as exc:
        print(f"[CVReview] Vector store unavailable: {exc}")
        return ""

    seen = set()
    passages: List[str] = []

    for query in queries[:5]:
        try:
            documents = retrieve_relevant_chunks(
                vector_store=store,
                query=query,
                k=REFERENCE_CHUNKS,
            )
        except Exception as exc:
            print(f"[CVReview] Retrieval failed for {query!r}: {exc}")
            continue

        for doc in documents:
            text = (doc.page_content or "").strip()

            if not text or text[:120] in seen:
                continue

            seen.add(text[:120])

            if len(text) > MAX_REFERENCE_CHARS:
                text = text[:MAX_REFERENCE_CHARS] + " ..."

            source = doc.metadata.get(
                "source_file",
                doc.metadata.get("source", "knowledge base"),
            )

            passages.append(f"[{os.path.basename(str(source))}] {text}")

    return "\n\n".join(passages)


# ============================================================
# Prompt
# ============================================================

REVIEW_PROMPT = PromptTemplate(
    input_variables=["standards", "findings", "resume_text"],
    template="""You are reviewing a candidate's CV against a written standard.

WRITTEN STANDARD (the only authority you may cite):
{standards}

AUTOMATED CHECKS already run over this CV. These are settled facts -
do not contradict them and do not re-check them:
{findings}

CV TEXT:
{resume_text}

Write advice the candidate can act on today. Ground every point in the
WRITTEN STANDARD above; do not invent rules that are not in it.

Return ONLY valid JSON, no markdown fences:

{{
  "summary": "Two or three sentences on the state of this CV overall.",
  "strengths": [
    "Something genuinely done well, quoting or naming what is in the CV"
  ],
  "improvements": [
    {{
      "issue": "What is wrong, in one line",
      "fix": "Exactly what to change, concrete enough to apply now",
      "example": "A rewritten line from THIS CV showing the fix, or \\"\\" if not applicable"
    }}
  ]
}}

Rules:
- "strengths": 2 to 4 items. Empty list if there is genuinely nothing.
- "improvements": 3 to 6 items, most damaging first.
- Quote the candidate's own wording when showing a fix. Generic advice
  that would suit any CV is not useful.
- Do not repeat the automated checks verbatim; add what they cannot see,
  such as weak phrasing, vague project descriptions or missing context.
- Be direct. This candidate is competing for a job.
"""
)


def format_findings(checks: List[Dict[str, Any]]) -> str:
    return "\n".join(
        f'- {c["label"]}: {"PASS" if c["passed"] else "FAIL"} - {c["detail"]}'
        for c in checks
    )


# ============================================================
# Entry point
# ============================================================

def review_cv(resume_text: str) -> Dict[str, Any]:
    """
    Reviews a CV and returns a scorecard plus actionable advice.

    Never raises. If the model call fails the objective checks and score
    are still returned, because those do not need it.
    """

    text = (resume_text or "").strip()

    if not text:
        return {
            "score": 0,
            "checks": [],
            "summary": "",
            "strengths": [],
            "improvements": [],
            "reviewed": False,
            "review_error": "The CV text was empty.",
        }

    text = text[:MAX_RESUME_CHARS]

    # Settled in Python, and returned whatever happens next.
    checks = run_objective_checks(text)
    score = score_from_checks(checks)

    result: Dict[str, Any] = {
        "score": score,
        "checks": checks,
        "summary": "",
        "strengths": [],
        "improvements": [],
        "reviewed": False,
        "review_error": "",
    }

    try:
        standards = retrieve_standards(checks)

        chain = REVIEW_PROMPT | get_llm() | StrOutputParser()

        response = chain.invoke({
            "standards": standards or "[no reference material retrieved]",
            "findings": format_findings(checks),
            "resume_text": text,
        })

        parsed = parse_json_response(response)

        if not isinstance(parsed, dict):
            raise ValueError("Model did not return a JSON object.")

        result["summary"] = str(parsed.get("summary") or "").strip()

        result["strengths"] = [
            str(s).strip()
            for s in (parsed.get("strengths") or [])
            if str(s or "").strip()
        ][:4]

        improvements = []
        for item in (parsed.get("improvements") or []):
            if not isinstance(item, dict):
                continue
            issue = str(item.get("issue") or "").strip()
            if not issue:
                continue
            improvements.append({
                "issue": issue,
                "fix": str(item.get("fix") or "").strip(),
                "example": str(item.get("example") or "").strip(),
            })

        result["improvements"] = improvements[:6]
        result["reviewed"] = True

        print(
            f"[CVReview] Scored {score}/100 from "
            f"{sum(1 for c in checks if c['passed'])}/{len(checks)} checks"
        )

    except Exception as exc:
        print(f"[CVReview] Qualitative review failed: {exc}")
        result["review_error"] = f"Written feedback unavailable: {exc}"

    return result
