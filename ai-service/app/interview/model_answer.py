"""
Builds the answer a candidate should have given, right after they answer.

The scorecard already grades the whole transcript at the end, but by then
the question is twenty minutes old and the candidate has stopped caring.
Showing the expected answer while the question is still fresh is where
the learning actually happens.

The answer is not left to the model's memory. The same Chroma knowledge
base that produced the question is queried again, and the retrieved
passages are the material the model must answer from. When retrieval
comes back empty the model still answers, but the response is marked
grounded=False so the UI can say where the content came from.

Nothing here raises. A failed model answer must never cost the candidate
their interview turn, so every failure path returns a filled-in dict with
`error` set and the interview continues.
"""

import os
from typing import Any, Dict, List

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

# More passages than grading uses: this prompt carries one question
# instead of a whole transcript, so there is room for context.
REFERENCE_CHUNKS = 4

# Each passage is trimmed so one long chunk cannot crowd out the rest.
MAX_REFERENCE_CHARS = 900

# Keeps the prompt bounded when somebody pastes an essay.
MAX_CANDIDATE_ANSWER_CHARS = MAX_ANSWER_LENGTH

MAX_KEY_POINTS = 5


# ============================================================
# Prompt
# ============================================================

MODEL_ANSWER_PROMPT = PromptTemplate(
    input_variables=[
        "job_field",
        "question",
        "candidate_answer",
        "reference",
    ],
    template="""You are a senior technical interviewer for a {job_field} role.

The candidate has just answered the question below. Write the answer a
strong candidate would have given, so they can compare it with their own.

Question:
{question}

Candidate's answer:
{candidate_answer}

Reference material from the course knowledge base:
{reference}

Rules:
- Base the model answer on the REFERENCE MATERIAL above. Where the
  reference is thin, you may fill gaps with standard, widely accepted
  knowledge - but never contradict the reference.
- Write the model answer as a spoken interview answer, not an essay:
  3 to 6 short sentences, concrete, with the specifics and trade-offs an
  interviewer listens for.
- "key_points" are the things an answer MUST contain to be complete.
- "missing_from_answer" names only concepts the candidate genuinely did
  not cover. Return an empty list when their answer was complete.
- Judge the candidate's answer honestly. Do not praise an answer that was
  wrong, empty or off-topic.
- Do not write "you should have". Just state the answer.

Return ONLY valid JSON in exactly this shape, with no markdown fences:

{{
  "model_answer": "The full answer, 3 to 6 sentences.",
  "key_points": [
    "A concept a complete answer must cover"
  ],
  "missing_from_answer": [
    "A concept the candidate did not cover"
  ]
}}
"""
)


# ============================================================
# Retrieval
# ============================================================

def retrieve_reference(question: str) -> Dict[str, Any]:
    """
    Pulls what the knowledge base holds about this question.

    Returns the joined passages and the files they came from, so the UI
    can show the candidate what the answer was built on. An empty result
    is not an error: the caller falls back to the model's own knowledge
    and marks the answer ungrounded.
    """

    try:
        documents = retrieve_relevant_chunks(
            vector_store=get_or_create_vector_store(),
            query=question,
            k=REFERENCE_CHUNKS,
        )
    except Exception as exc:
        print(f"[ModelAnswer] Reference retrieval failed: {exc}")
        return {"text": "", "sources": []}

    passages: List[str] = []
    sources: List[str] = []

    for doc in documents:

        text = (doc.page_content or "").strip()

        if not text:
            continue

        if len(text) > MAX_REFERENCE_CHARS:
            text = text[:MAX_REFERENCE_CHARS] + " ..."

        source = os.path.basename(
            str(
                doc.metadata.get(
                    "source_file",
                    doc.metadata.get("source", "knowledge base"),
                )
            )
        )

        passages.append(f"[{source}] {text}")

        if source not in sources:
            sources.append(source)

    return {
        "text": "\n\n".join(passages),
        "sources": sources,
    }


# ============================================================
# Normalisation
# ============================================================

def clean_list(value: Any, limit: int = MAX_KEY_POINTS) -> List[str]:

    if not isinstance(value, list):
        return []

    items: List[str] = []

    for entry in value:

        text = str(entry or "").strip()

        if text:
            items.append(text)

    return items[:limit]


def empty_result(error: str = "") -> Dict[str, Any]:

    return {
        "model_answer": "",
        "key_points": [],
        "missing_from_answer": [],
        "sources": [],
        "grounded": False,
        "generated": False,
        "error": error,
    }


# ============================================================
# Entry point
# ============================================================

def generate_model_answer(
    question: str,
    candidate_answer: str = "",
    job_field: str = "",
) -> Dict[str, Any]:
    """
    Returns the expected answer for one interview question.

    Never raises. On any failure the returned dict has generated=False
    and `error` set, and the interview turn continues without it.
    """

    question = (question or "").strip()

    if not question:
        return empty_result("No question was provided.")

    candidate_answer = (candidate_answer or "").strip()

    if len(candidate_answer) > MAX_CANDIDATE_ANSWER_CHARS:
        candidate_answer = (
            candidate_answer[:MAX_CANDIDATE_ANSWER_CHARS]
            + " ... [truncated]"
        )

    reference = retrieve_reference(question)

    grounded = bool(reference["text"])

    print(
        "[ModelAnswer] Reference passages: "
        f"{len(reference['sources'])} source file(s), "
        f"grounded={grounded}"
    )

    try:
        chain = MODEL_ANSWER_PROMPT | get_llm() | StrOutputParser()

        raw = chain.invoke(
            {
                "job_field": job_field or "software engineering",
                "question": question,
                "candidate_answer": (
                    candidate_answer or "[no answer given]"
                ),
                "reference": (
                    reference["text"]
                    or "[none found - answer from standard knowledge]"
                ),
            }
        )

        parsed = parse_json_response(raw)

    except Exception as exc:
        print(f"[ModelAnswer] Generation failed: {exc}")
        return empty_result(str(exc))

    model_answer = str(parsed.get("model_answer") or "").strip()

    if not model_answer:
        return empty_result(
            "The model did not return an answer for this question."
        )

    return {
        "model_answer": model_answer,
        "key_points": clean_list(parsed.get("key_points")),
        "missing_from_answer": clean_list(
            parsed.get("missing_from_answer")
        ),
        "sources": reference["sources"],
        "grounded": grounded,
        "generated": True,
        "error": "",
    }
