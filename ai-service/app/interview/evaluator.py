"""
Scores a finished interview against the project's knowledge base.

The adaptive loop uses a cheap word-count heuristic while the interview
is running, because it must not add a second LLM call to every turn.
That heuristic cannot tell a correct answer from a confident wrong one,
so it is only good enough for pacing.

The scorecard is graded properly, and deliberately not left to the
model's own memory. For every question the same Chroma knowledge base
that produced the questions is queried again, and the retrieved passages
go into the prompt as the reference a complete answer should contain.
Gemini judges the answer against that material rather than against
whatever it happens to recall, which keeps "you did not mention X"
traceable to documents/ instead of being unattributable.

The numbers stay in Python. The overall score is computed here from the
category scores, and each verdict is derived from its own score, so the
model cannot return 85 and label it "weak".
"""

import json
import os
from typing import Any, Dict, List, Optional

from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate

from app.interview.question_generator import (
    MAX_ANSWER_LENGTH,
    get_llm,
    parse_json_response,
)
from app.rag.retriever import retrieve_relevant_chunks
from app.rag.vector_store import get_or_create_vector_store


# ============================================================
# Configuration
# ============================================================

# The four things a technical interview can honestly judge from a
# transcript. "Cultural fit" is deliberately absent - it cannot be read
# off a set of technical answers, and claiming a number for it would be
# inventing data.
CATEGORIES: List[Dict[str, str]] = [
    {
        "key": "technical_knowledge",
        "label": "Technical Knowledge",
        "hint": "Is what they said actually correct?",
    },
    {
        "key": "depth",
        "label": "Depth of Detail",
        "hint": "Specifics and trade-offs, or surface level?",
    },
    {
        "key": "problem_solving",
        "label": "Problem Solving",
        "hint": "Do they reason through the problem?",
    },
    {
        "key": "communication",
        "label": "Communication",
        "hint": "Clear and well structured?",
    },
]

# Guards the prompt size: a long interview with long answers should not
# blow past the model's context window.
MAX_QUESTIONS_EVALUATED = 20

# Reference passages pulled per question. Fewer than question generation
# uses, because this prompt already carries the whole transcript.
REFERENCE_CHUNKS_PER_QUESTION = 3

# Each passage is trimmed so one long chunk cannot crowd out the rest.
MAX_REFERENCE_CHARS = 700

# Verdict bands, applied to the score in Python so the label can never
# disagree with the number printed next to it.
VERDICT_BANDS = [
    (75, "strong"),
    (45, "partial"),
    (15, "weak"),
]


# ============================================================
# Prompt
# ============================================================

EVALUATION_PROMPT = PromptTemplate(
    input_variables=["job_field", "transcript", "category_block"],
    template="""You are a senior technical interviewer scoring a candidate for a {job_field} role.

Below is the interview. Each question is followed by REFERENCE MATERIAL
drawn from the course knowledge base, and then by the candidate's answer.

{transcript}

Score the candidate on each category from 0 to 100:

{category_block}

Scoring rules - follow these strictly:
- Judge each answer AGAINST THE REFERENCE MATERIAL shown with its
  question. That material is what a complete answer should cover.
- Judge CORRECTNESS first. A long, confident, wrong answer scores LOW.
- A short but correct and precise answer scores WELL.
- An empty answer, "I don't know", or off-topic text scores 0-15.
- Do not reward verbosity. Do not penalise brevity that is still correct.
- If an answer is correct but the reference material does not mention it,
  still credit it. The reference is a guide, not an exhaustive list.
- In "what_was_missing", name the concept FROM THE REFERENCE MATERIAL
  that the answer failed to cover, so the candidate knows what to study.
- Be honest. Do not inflate scores to be encouraging. A candidate who
  did not demonstrate knowledge must see that.

Return ONLY valid JSON in exactly this shape, with no markdown fences:

{{
  "category_scores": {{
    "technical_knowledge": 0,
    "depth": 0,
    "problem_solving": 0,
    "communication": 0
  }},
  "strengths": [
    "Specific thing the candidate genuinely did well, referring to what they said"
  ],
  "improvements": [
    "Specific thing to work on, naming the concept they missed"
  ],
  "per_question": [
    {{
      "question_number": 1,
      "score": 0,
      "what_was_good": "One sentence. Empty string if nothing was good.",
      "what_was_missing": "One sentence naming what a complete answer needed."
    }}
  ]
}}

Rules for the lists:
- "strengths": 2 to 4 items. If the candidate genuinely showed no
  strengths, return an empty list rather than inventing one.
- "improvements": 2 to 4 items, most important first.
- "per_question": one entry for EVERY question in the transcript.
- Refer to what the candidate actually said. Do not write generic
  feedback that would fit any candidate.
"""
)


# ============================================================
# Retrieval
# ============================================================

def retrieve_reference(question: str) -> str:
    """
    Pulls what the knowledge base holds about this question.

    Grading is judged against these passages, so that "you did not
    mention X" traces back to documents/ rather than to the model's
    memory.

    Returns an empty string on failure. A missing reference degrades
    grading to the model's own judgement, which still beats losing the
    scorecard.
    """

    try:
        documents = retrieve_relevant_chunks(
            vector_store=get_or_create_vector_store(),
            query=question,
            k=REFERENCE_CHUNKS_PER_QUESTION,
        )
    except Exception as exc:
        print(f"[Evaluator] Reference retrieval failed: {exc}")
        return ""

    passages: List[str] = []

    for doc in documents:

        text = (doc.page_content or "").strip()

        if not text:
            continue

        if len(text) > MAX_REFERENCE_CHARS:
            text = text[:MAX_REFERENCE_CHARS] + " ..."

        source = doc.metadata.get(
            "source_file",
            doc.metadata.get("source", "knowledge base"),
        )

        passages.append(
            f"[{os.path.basename(str(source))}] {text}"
        )

    return "\n".join(passages)


# ============================================================
# Transcript building
# ============================================================

def build_transcript(
    questions: List[str],
    answers: List[str],
) -> str:
    """
    Lays out question, reference material and answer for the prompt.

    Answers are truncated so one rambling response cannot crowd out the
    rest of the interview.
    """

    lines: List[str] = []

    total = min(len(questions), len(answers), MAX_QUESTIONS_EVALUATED)

    for i in range(total):

        answer = (answers[i] or "").strip()

        if len(answer) > MAX_ANSWER_LENGTH:
            answer = answer[:MAX_ANSWER_LENGTH] + " ... [truncated]"

        if not answer:
            answer = "[no answer given]"

        reference = retrieve_reference(questions[i])

        lines.append(f"Question {i + 1}: {questions[i]}")

        if reference:
            lines.append(f"Reference material for question {i + 1}:")
            lines.append(reference)
        else:
            lines.append(
                f"Reference material for question {i + 1}: "
                "[none found - judge on your own knowledge]"
            )

        lines.append(f"Answer {i + 1}: {answer}")
        lines.append("")

    return "\n".join(lines).strip()


def build_category_block() -> str:
    return "\n".join(
        f'- {c["key"]} ({c["label"]}): {c["hint"]}'
        for c in CATEGORIES
    )


# ============================================================
# Normalisation
#
# The model is instructed to return a fixed shape, but a scorecard must
# never crash or show "undefined" because one field came back odd.
# ============================================================

def clamp_score(value: Any) -> int:

    try:
        score = int(round(float(value)))
    except (TypeError, ValueError):
        return 0

    return max(0, min(100, score))


def verdict_for_score(score: int, answered: bool) -> str:
    """
    Derives the label from the number.

    The model used to return both, and could contradict itself - a score
    of 85 labelled "weak". Computing it here makes that impossible.
    """

    if not answered:
        return "none"

    for threshold, verdict in VERDICT_BANDS:
        if score >= threshold:
            return verdict

    return "none"


def clean_list(value: Any, limit: int = 4) -> List[str]:

    if not isinstance(value, list):
        return []

    items = [
        str(item).strip()
        for item in value
        if str(item or "").strip()
    ]

    return items[:limit]


def normalize_evaluation(
    raw: Dict[str, Any],
    questions: List[str],
    answers: List[str],
) -> Dict[str, Any]:
    """
    Turns whatever the model returned into the exact shape the API
    promises, filling gaps rather than failing.
    """

    raw_categories = raw.get("category_scores") or {}

    category_scores = [
        {
            "key": c["key"],
            "label": c["label"],
            "score": clamp_score(raw_categories.get(c["key"])),
        }
        for c in CATEGORIES
    ]

    # Computed here, not asked of the model: the headline number is
    # arithmetic over the category scores and should be reproducible.
    overall = (
        round(sum(c["score"] for c in category_scores) / len(category_scores))
        if category_scores
        else 0
    )

    # Index the per-question feedback so a missing or reordered entry
    # still lands against the right question.
    raw_per_question = raw.get("per_question")
    by_number: Dict[int, Dict[str, Any]] = {}

    if isinstance(raw_per_question, list):
        for entry in raw_per_question:
            if not isinstance(entry, dict):
                continue
            try:
                number = int(entry.get("question_number"))
            except (TypeError, ValueError):
                continue
            by_number[number] = entry

    per_question: List[Dict[str, Any]] = []
    total = min(len(questions), len(answers), MAX_QUESTIONS_EVALUATED)

    for i in range(total):

        entry = by_number.get(i + 1) or {}

        score = clamp_score(entry.get("score"))
        answered = bool((answers[i] or "").strip())

        per_question.append({
            "question_number": i + 1,
            "question": questions[i],
            "answer": answers[i] or "",
            "score": score,
            "verdict": verdict_for_score(score, answered),
            "what_was_good": str(entry.get("what_was_good") or "").strip(),
            "what_was_missing": str(entry.get("what_was_missing") or "").strip(),
        })

    return {
        "overall_score": overall,
        "category_scores": category_scores,
        "strengths": clean_list(raw.get("strengths")),
        "improvements": clean_list(raw.get("improvements")),
        "per_question": per_question,
    }


def empty_evaluation(
    questions: List[str],
    answers: List[str],
    reason: str,
) -> Dict[str, Any]:
    """
    Used when grading could not run at all.

    Returns zeros and says so, rather than inventing plausible numbers -
    a made-up score is worse than an honest blank.
    """

    return {
        "overall_score": 0,
        "category_scores": [
            {"key": c["key"], "label": c["label"], "score": 0}
            for c in CATEGORIES
        ],
        "strengths": [],
        "improvements": [],
        "per_question": [
            {
                "question_number": i + 1,
                "question": questions[i],
                "answer": answers[i] if i < len(answers) else "",
                "score": 0,
                "verdict": "none",
                "what_was_good": "",
                "what_was_missing": "",
            }
            for i in range(min(len(questions), len(answers)))
        ],
        "evaluated": False,
        "evaluation_error": reason,
    }


# ============================================================
# Entry point
# ============================================================

def evaluate_interview(
    questions: List[str],
    answers: List[str],
    job_field: str = "",
) -> Dict[str, Any]:
    """
    Grades a completed interview in a single LLM call, against reference
    material retrieved from the knowledge base.

    Never raises: a failure here must not stop the candidate from
    reaching their scorecard, so problems are reported in the payload.
    """

    if not questions or not answers:
        return empty_evaluation(
            questions,
            answers,
            "No questions were answered.",
        )

    transcript = build_transcript(questions, answers)

    if not transcript:
        return empty_evaluation(
            questions,
            answers,
            "The transcript was empty.",
        )

    try:
        chain = EVALUATION_PROMPT | get_llm() | StrOutputParser()

        response = chain.invoke({
            "job_field": job_field or "software engineering",
            "transcript": transcript,
            "category_block": build_category_block(),
        })

        parsed = parse_json_response(response)

        if not isinstance(parsed, dict):
            raise ValueError("Model did not return a JSON object.")

        result = normalize_evaluation(parsed, questions, answers)
        result["evaluated"] = True
        result["evaluation_error"] = ""

        print(
            "[Evaluator] Scored "
            f"{len(result['per_question'])} answers, "
            f"overall {result['overall_score']}"
        )

        return result

    except Exception as exc:

        print(f"[Evaluator] Evaluation failed: {exc}")

        return empty_evaluation(
            questions,
            answers,
            f"Scoring failed: {exc}",
        )
