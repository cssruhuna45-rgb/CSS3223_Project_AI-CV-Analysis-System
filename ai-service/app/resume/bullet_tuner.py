"""
Rewrites one CV bullet in Google's XYZ form without inventing facts.

    "Accomplished [X] as measured by [Y], by doing [Z]"

The obvious version of this feature has the model fill X, Y and Z
itself: "Responsible for REST APIs" comes back as "Designed 12
microservices handling 20,000 requests/day at 99.9% uptime". None of
those numbers came from the candidate. Copied into a CV they are false,
and the first interviewer who asks "how did you measure 20,000?" finds
out. A tool that coaches people for interviews must not hand them claims
they cannot defend.

So the work is split:

    Gemini  restructures the bullet and marks every fact the XYZ form
            needs but the original does not give as a gap, written as
            a question in square brackets: "[how many APIs?]".
    Python  checks the draft. Any number the original did not contain
            is treated as invented and replaced by a gap, so the rule
            holds even when the model ignores it.
    The candidate answers the gaps, and the frontend puts their words
            in verbatim. No model sees the answers, so nothing can be
            embellished on the way into the CV.
"""

import re
from typing import Any, Dict, List

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate

from app.interview.question_generator import get_llm, parse_json_response


# ============================================================
# Configuration
# ============================================================

MAX_BULLET_CHARS = 400

# More gaps than this and the bullet is a form, not a sentence.
MAX_GAPS = 4

# A gap is anything in square brackets.
GAP_PATTERN = re.compile(r"\[[^\[\]]{1,80}\]")

# A number as written in a CV: 12, 1,200, 99.9, 40%, 3x, 20k.
NUMBER_PATTERN = re.compile(r"\d+(?:[.,]\d+)*")

# What an invented number is replaced with.
INVENTED_NUMBER_GAP = "[how many?]"


# ============================================================
# Prompt
# ============================================================

TUNE_PROMPT = PromptTemplate(
    input_variables=["bullet", "job_field", "max_gaps"],
    template="""You are a CV coach for a {job_field} candidate.

Rewrite this CV bullet point in Google's XYZ form:
"Accomplished [X] as measured by [Y], by doing [Z]".

Original bullet:
{bullet}

Rules - follow them exactly:
- Use ONLY facts stated in the original bullet.
- NEVER invent numbers, percentages, user counts, durations, tool names,
  company names or results. Not even plausible ones.
- Every fact the XYZ form needs that the original does not state becomes
  a gap: a short question in square brackets, e.g. [how many APIs?],
  [used by whom?], [what did you do to make it reliable?].
- Use at most {max_gaps} gaps. Ask for the measurable result (Y) first.
- Write a natural CV sentence. Do NOT write the words "as measured by"
  or "by doing" literally; the formula is the structure, not the text.
- Keep each gap short (2-5 words) and place it where the candidate's
  answer will read naturally once pasted in, usually as a number or a
  short noun phrase: "used by [how many users?]",
  "cutting response time by [how much?]", "by adding [what feature?]".
- Start with a strong past-tense action verb (Built, Designed, Reduced,
  Automated). One sentence, under 35 words, no first person.

Return ONLY valid JSON, no markdown fences:

{{
  "draft": "Built [how many?] REST APIs in Spring Boot used by [how many users?], by [what did you add?].",
  "gaps": [
    {{
      "placeholder": "[how many?]",
      "question": "How many APIs did you build?",
      "hint": "A count you can stand behind"
    }}
  ],
  "why": [
    "One short reason the original is weak, e.g. it says what you were responsible for, not what you did"
  ]
}}

The draft above is only an example of the format. Write the draft for
the original bullet given, with its own gaps.
""",
)


# ============================================================
# Guards
# ============================================================

def numbers_in(text: str) -> List[str]:
    """The numbers in a text, normalised so 1,200 and 1200 compare equal."""

    return [n.replace(",", "") for n in NUMBER_PATTERN.findall(text or "")]


def remove_invented_numbers(original: str, draft: str) -> Dict[str, Any]:
    """
    Replaces every number in the draft that the original did not contain.

    Numbers inside a gap are left alone - "[how many, e.g. 3?]" asks,
    it does not claim. Everything outside the gaps is checked.

    Returns the cleaned draft and how many numbers were removed.
    """

    allowed = set(numbers_in(original))
    removed = 0
    pieces: List[str] = []
    last = 0

    for gap in GAP_PATTERN.finditer(draft):
        pieces.append(("text", draft[last:gap.start()]))
        pieces.append(("gap", gap.group(0)))
        last = gap.end()
    pieces.append(("text", draft[last:]))

    out: List[str] = []

    for kind, chunk in pieces:

        if kind == "gap":
            out.append(chunk)
            continue

        def replace(match: "re.Match[str]") -> str:
            nonlocal removed
            digits = NUMBER_PATTERN.match(match.group(0)).group(0)
            if digits.replace(",", "") in allowed:
                return match.group(0)
            removed += 1
            # Distinct gaps, so two invented numbers get two answers.
            return (
                INVENTED_NUMBER_GAP if removed == 1
                else f"[how many ({removed})?]"
            )

        # A unit glued to a removed number goes with it ("20k", "40%",
        # "3x"); the space after a number stays, so "12 APIs" becomes
        # "[how many?] APIs", not "[how many?]APIs".
        out.append(re.sub(r"\d+(?:[.,]\d+)*(?:\s?%|[kKmMx]\b)?", replace, chunk))

    return {"draft": "".join(out), "removed": removed}


def reconcile_gaps(draft: str, gaps: Any) -> List[Dict[str, str]]:
    """
    Makes the gap list match the draft exactly.

    Every bracket in the draft gets one entry, in the order it appears;
    entries for brackets the draft does not contain are dropped. A gap
    the model wrote into the draft but did not explain gets a question
    made from its own text.
    """

    described: Dict[str, Dict[str, str]] = {}

    if isinstance(gaps, list):
        for g in gaps:
            if not isinstance(g, dict):
                continue
            placeholder = str(g.get("placeholder") or "").strip()
            if placeholder:
                described[placeholder] = {
                    "question": str(g.get("question") or "").strip(),
                    "hint": str(g.get("hint") or "").strip(),
                }

    result: List[Dict[str, str]] = []
    seen = set()

    for match in GAP_PATTERN.finditer(draft):

        placeholder = match.group(0)

        if placeholder in seen:
            continue
        seen.add(placeholder)

        info = described.get(placeholder, {})
        inner = placeholder[1:-1].strip()

        result.append({
            "placeholder": placeholder,
            "question": info.get("question") or (inner[0].upper() + inner[1:] if inner else "Fill this in"),
            "hint": info.get("hint", ""),
        })

    return result


# ============================================================
# Entry point
# ============================================================

def tune_bullet(bullet: str, job_field: str = "") -> Dict[str, Any]:
    """
    Returns the XYZ draft with its gaps, or raises ValueError when the
    bullet is unusable or the model's reply cannot be read.
    """

    original = " ".join((bullet or "").split())

    if not original:
        raise ValueError("The bullet point is empty.")

    if len(original) > MAX_BULLET_CHARS:
        raise ValueError(
            f"Paste one bullet point at a time (up to {MAX_BULLET_CHARS} characters)."
        )

    chain = TUNE_PROMPT | get_llm() | StrOutputParser()

    response = chain.invoke({
        "bullet": original,
        "job_field": job_field or "software engineering",
        "max_gaps": MAX_GAPS,
    })

    parsed = parse_json_response(response)

    if not isinstance(parsed, dict) or not str(parsed.get("draft") or "").strip():
        raise ValueError("The AI reply could not be read. Please try again.")

    draft = " ".join(str(parsed["draft"]).split())

    checked = remove_invented_numbers(original, draft)

    if checked["removed"]:
        print(
            f"[BulletTuner] Replaced {checked['removed']} invented number(s) "
            "with a gap"
        )

    gaps = reconcile_gaps(checked["draft"], parsed.get("gaps"))

    why = [
        str(w).strip()
        for w in (parsed.get("why") or [])
        if str(w or "").strip()
    ][:3]

    return {
        "original": original,
        "draft": checked["draft"],
        "gaps": gaps,
        "why": why,
        "invented_numbers_removed": checked["removed"],
    }
