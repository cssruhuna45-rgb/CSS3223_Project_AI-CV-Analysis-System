import json
import os
import re
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv

from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from app.rag.vector_store import get_or_create_vector_store
from app.rag.retriever import retrieve_relevant_chunks

from app.llm_config import (
    get_max_retries,
    get_model_name,
    get_timeout,
)


load_dotenv()


# ============================================================
# Configuration
# ============================================================

LLM_MODEL = get_model_name()
LLM_TEMPERATURE = 0.4

RAG_TOP_K = 5

MAX_RESUME_LENGTH = 12000
MAX_JD_LENGTH = 8000
MAX_ANSWER_LENGTH = 6000

MAX_GENERATION_RETRIES = 2

# Number of consecutive weak answers before changing topic
MAX_SAME_TOPIC_WEAK_ATTEMPTS = 2

DIFFICULTY_LEVELS = {
    "easy": 1,
    "medium": 2,
    "hard": 3,
}


# ============================================================
# Question Generator Prompt
# ============================================================

QUESTION_GENERATOR_PROMPT = """
You are an expert technical interviewer conducting an
adaptive technical interview.

Your job is to generate EXACTLY ONE interview question.

============================================================
INTERVIEW CONTEXT
============================================================

TARGET JOB FIELD:
{job_field}

JOB DESCRIPTION:
{job_description}

CANDIDATE RESUME:
{candidate_resume}

MATCHED SKILLS:
{matched_skills}

RELATED SKILLS:
{related_skills}

MISSING SKILLS:
{missing_skills}

ADDITIONAL SKILLS:
{additional_skills}

PREVIOUS CANDIDATE ANSWER:
{last_candidate_answer}

PREVIOUS ANSWER QUALITY:
{answer_quality}

PREVIOUS QUESTIONS:
{previous_questions}

CURRENT TOPIC:
{current_topic}

TOPIC HISTORY:
{topic_history}

WEAK ANSWER STREAK:
{weak_answer_streak}

QUESTION NUMBER:
{question_number}

REQUIRED DIFFICULTY:
{difficulty}

RAG KNOWLEDGE:
{retrieved_context}

============================================================
CORE RULES
============================================================

1. JOB RELEVANCE
------------------------------------------------------------

The question MUST be relevant to the TARGET JOB FIELD.

Use the job description when one is provided.

The target job field and skill-gap information are important
signals for deciding what technical area to test.

For DevOps / Cloud Engineering, relevant areas include:

- Linux
- Docker
- Kubernetes
- CI/CD
- AWS
- Terraform
- Cloud infrastructure
- Networking
- Infrastructure as Code
- Monitoring
- Logging
- Security
- Microservices
- Distributed systems

Do not ask unrelated questions.

------------------------------------------------------------

2. CANDIDATE PERSONALIZATION
------------------------------------------------------------

Use the candidate's actual resume when useful.

You may reference:

- technologies explicitly listed
- projects explicitly listed
- education
- responsibilities explicitly described
- certifications explicitly listed

DO NOT invent experience.

If Docker appears in the resume, you may ask about Docker.

Do NOT claim that the candidate deployed a production
Kubernetes cluster unless the resume explicitly says so.

Do NOT claim professional experience that is not explicitly
supported by the resume.

------------------------------------------------------------

3. SKILL GAP AWARENESS
------------------------------------------------------------

Use the skill-gap information to guide question selection.

MATCHED SKILLS:

These are skills explicitly matched between the candidate
resume and the selected job field.

They may be used for:

- deeper technical questions
- practical questions
- architecture questions
- troubleshooting questions

RELATED SKILLS:

These are related concepts detected in the candidate profile.

Related skills are NOT exact matches.

Do not say that the candidate has a related skill as an
exact skill.

MISSING SKILLS:

These are required job skills that were not found as exact
candidate skills.

Missing skills should be prioritized when appropriate,
especially for foundational or medium-level questions.

ADDITIONAL SKILLS:

These are candidate skills that are outside the required
skill list.

They may be used for personalization when relevant, but they
should not override the selected job field.

Example:

MISSING SKILL:
Terraform

RELATED SKILL:
Infrastructure as Code

Do NOT say:

"The candidate has Terraform experience."

Instead, it is acceptable to ask:

"What is Infrastructure as Code, and how is Terraform commonly
used to implement it?"

------------------------------------------------------------

4. EXACT VS RELATED SKILLS
------------------------------------------------------------

Do NOT treat related skills as exact matches.

Examples:

Terraform != Infrastructure as Code

AWS != Cloud Architecture

Docker != Kubernetes

GitHub != Git

Containerization != Docker

DSA != Data Structures and Algorithms unless explicitly
provided as a canonical candidate skill.

Use the skill catalog semantics rather than inventing
equivalences.

------------------------------------------------------------

5. DIFFICULTY
------------------------------------------------------------

The REQUIRED DIFFICULTY is authoritative.

The generated question MUST use exactly:

easy
medium
or
hard

Do not change the requested difficulty.

Difficulty guidelines:

EASY:

- fundamental concepts
- simple definitions
- basic practical understanding
- suitable for junior candidates

MEDIUM:

- practical application
- architecture
- troubleshooting
- comparisons
- moderate reasoning

HARD:

- advanced architecture
- trade-offs
- failure scenarios
- scalability
- security
- production-level reasoning

------------------------------------------------------------

6. ANSWER ADAPTATION
------------------------------------------------------------

Previous answer quality:

STRONG:
Increase difficulty when appropriate.

PARTIAL:
Maintain the current difficulty and clarify the candidate's
understanding with a related question.

WEAK:
Reduce difficulty and test a foundational concept.

NONE:
If there is no previous candidate answer, treat this as the
beginning of the interview. Do NOT assume the candidate is weak.

The REQUIRED DIFFICULTY remains authoritative.

------------------------------------------------------------

7. REPEATED WEAK ANSWERS
------------------------------------------------------------

If the candidate gives a weak answer:

First weak answer on a topic:

- reduce difficulty
- test a foundational concept
- same topic is allowed

Second consecutive weak answer on the same topic:

- change to a DIFFERENT technical topic
- keep difficulty easy
- do not continue drilling the same topic

Third or later weak answer:

- continue with easy questions
- rotate through different important job-related topics

Example:

Docker networking
    -> weak

Docker fundamentals
    -> weak

NEXT:

CI/CD fundamentals

NOT:

Docker volumes
Docker images
Docker Compose
Docker registry

------------------------------------------------------------

8. SKILL-GAP PRIORITY AFTER REPEATED WEAK ANSWERS
------------------------------------------------------------

When WEAK ANSWER STREAK is 2 or greater:

Do NOT continue asking questions about CURRENT TOPIC.

Prefer another important job-related skill.

If a suitable MISSING SKILL exists, it may be selected.

If no suitable missing skill exists, select another important
job-related area.

The new topic must be meaningfully different from the current
topic.

------------------------------------------------------------

9. TOPIC DIVERSITY
------------------------------------------------------------

Do not repeatedly ask questions from the same category.

Prefer different technical areas over time.

Example progression:

Docker
→ CI/CD
→ Linux
→ Kubernetes
→ AWS
→ Terraform
→ Networking

unless a strong answer justifies a deeper follow-up.

Avoid semantic repetition even when category names differ.

------------------------------------------------------------

10. FOLLOW-UP QUESTIONS
------------------------------------------------------------

Use a follow-up only when the previous answer contains useful
technical information that deserves deeper exploration.

A weak answer should normally NOT produce a deep follow-up.

A strong answer may justify a deeper question about the same
technical concept.

------------------------------------------------------------

11. NO QUESTION REPETITION
------------------------------------------------------------

The new question MUST test a different concept from the
previous questions.

Do not merely rephrase a previous question.

Avoid semantic duplicates.

------------------------------------------------------------

12. RAG USAGE
------------------------------------------------------------

RAG knowledge is supporting technical knowledge.

Use it for:

- technical accuracy
- interview concepts
- troubleshooting knowledge
- architecture knowledge
- practical scenarios
- job-specific technical concepts

Do not blindly copy RAG content.

Do not mention that RAG was used.

Do not answer the question in the RAG context.

The question must still be appropriate for the candidate and
target job field.

------------------------------------------------------------

13. QUESTION QUALITY
------------------------------------------------------------

The question must:

- be clear
- be answerable
- be technically meaningful
- match the required difficulty
- be relevant to the role
- contain one main technical objective
- avoid unnecessary complexity
- avoid yes/no questions
- avoid multiple unrelated questions

------------------------------------------------------------

14. FIRST QUESTION
------------------------------------------------------------

Question 1 should be broad but relevant to the target job field.

It may use the candidate's strongest relevant project or
technology.

If suitable, it may test an important matched skill.

If the candidate has important missing skills, do not assume
knowledge of those skills. A first question about a missing
skill should be foundational unless the context clearly
justifies a higher level.

IMPORTANT:

Question 1 has NO previous candidate answer.

Do NOT describe the candidate as weak.

Do NOT say the candidate struggled.

Do NOT use weak-answer adaptation for Question 1.

------------------------------------------------------------

15. TOPIC CHANGE
------------------------------------------------------------

When WEAK ANSWER STREAK is 2 or greater:

DO NOT ask another question about CURRENT TOPIC.

Select another important technical area from the target job
field.

Prefer an important missing skill when appropriate.

------------------------------------------------------------

16. RESUME FACTUALITY
------------------------------------------------------------

Only use information explicitly present in the candidate
resume.

Do not infer professional experience from a technology merely
because it appears in a list.

For example:

If resume says:
"Skills: Docker"

You may ask:
"What is Docker and how does containerization work?"

But do not ask:
"How did you manage Docker containers in your production
environment?"

unless production experience is explicitly stated.

------------------------------------------------------------

OUTPUT
============================================================

Return ONLY valid JSON.

Do not use Markdown.

Do not use code fences.

Use exactly:

{{
  "question": "",
  "category": "",
  "difficulty": "easy",
  "is_follow_up": false,
  "reason": ""
}}

Allowed difficulty:

easy
medium
hard
"""


# ============================================================
# Validation Prompt
# ============================================================

QUESTION_VALIDATION_PROMPT = """
You are an expert technical interview question validator.

Determine whether the generated question is appropriate.

TARGET JOB FIELD:
{job_field}

JOB DESCRIPTION:
{job_description}

CANDIDATE RESUME:
{candidate_resume}

MATCHED SKILLS:
{matched_skills}

RELATED SKILLS:
{related_skills}

MISSING SKILLS:
{missing_skills}

ADDITIONAL SKILLS:
{additional_skills}

PREVIOUS QUESTIONS:
{previous_questions}

CURRENT TOPIC:
{current_topic}

TOPIC HISTORY:
{topic_history}

WEAK ANSWER STREAK:
{weak_answer_streak}

REQUIRED DIFFICULTY:
{difficulty}

GENERATED QUESTION:
{question}

Check:

1. Is the question relevant to the target job field?
2. Is it relevant to the job description when provided?
3. Does it match the required difficulty?
4. Does it test a concept different from previous questions?
5. Is it technically meaningful?
6. Is it appropriate for a junior/undergraduate candidate?
7. Does it avoid inventing candidate experience?
8. Does it correctly distinguish matched, related, and missing
   skills?
9. If the weak-answer streak is high, does it avoid repeating
   the same topic?
10. Is it a valid technical interview question?
11. Does it contain one main technical objective?
12. Is it free from unnecessary complexity?

Return ONLY valid JSON:

{{
  "valid": true,
  "reason": ""
}}

The "valid" field must be true or false.
"""


# ============================================================
# LLM
# ============================================================

def get_llm() -> ChatGoogleGenerativeAI:

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is missing."
        )

    print(
        "[QuestionGenerator] "
        f"Initializing Gemini model: {LLM_MODEL}"
    )

    return ChatGoogleGenerativeAI(
        model=LLM_MODEL,
        google_api_key=api_key,
        temperature=LLM_TEMPERATURE,
        timeout=get_timeout(),
        max_retries=get_max_retries(),
    )


# ============================================================
# JSON Helpers
# ============================================================

def clean_json_response(
    response: str,
) -> str:

    if not response:
        return ""

    response = response.strip()

    response = re.sub(
        r"^```(?:json)?\s*",
        "",
        response,
        flags=re.IGNORECASE,
    )

    response = re.sub(
        r"\s*```$",
        "",
        response,
        flags=re.IGNORECASE,
    )

    return response.strip()


def parse_json_response(
    response: str,
) -> Dict[str, Any]:

    cleaned = clean_json_response(response)

    try:
        return json.loads(cleaned)

    except json.JSONDecodeError:

        start = cleaned.find("{")
        end = cleaned.rfind("}")

        if start == -1 or end == -1:
            raise ValueError(
                "Gemini did not return valid JSON."
            )

        try:

            return json.loads(
                cleaned[start:end + 1]
            )

        except json.JSONDecodeError as exc:

            raise ValueError(
                "Gemini returned malformed JSON."
            ) from exc


# ============================================================
# Difficulty Helpers
# ============================================================

def normalize_difficulty(
    difficulty: Optional[str],
) -> str:

    if not difficulty:
        return "medium"

    value = difficulty.strip().lower()

    if value not in DIFFICULTY_LEVELS:
        return "medium"

    return value


def increase_difficulty(
    difficulty: str,
) -> str:

    difficulty = normalize_difficulty(
        difficulty
    )

    mapping = {
        "easy": "medium",
        "medium": "hard",
        "hard": "hard",
    }

    return mapping[difficulty]


def decrease_difficulty(
    difficulty: str,
) -> str:

    difficulty = normalize_difficulty(
        difficulty
    )

    mapping = {
        "easy": "easy",
        "medium": "easy",
        "hard": "medium",
    }

    return mapping[difficulty]


# ============================================================
# Non-answer Detection
# ============================================================

NON_ANSWER_PATTERNS = {
    "i don't know",
    "i dont know",
    "i do not know",
    "don't know",
    "dont know",
    "not sure",
    "i am not sure",
    "i'm not sure",
    "no idea",
    "i have no idea",
    "i don't have any idea",
    "i dont have any idea",
    "i am unfamiliar with this",
    "i'm unfamiliar with this",
    "i cannot answer",
    "i can't answer",
    "cannot answer",
    "can't answer",
    "not familiar",
    "i am not familiar",
    "i'm not familiar",
}


def is_non_answer(
    answer: Optional[str],
) -> bool:

    if not answer:
        return False

    normalized = answer.strip().lower()

    normalized = re.sub(
        r"\s+",
        " ",
        normalized,
    )

    if normalized in NON_ANSWER_PATTERNS:
        return True

    if len(normalized) < 80:

        for pattern in NON_ANSWER_PATTERNS:

            if pattern in normalized:
                return True

    return False


# ============================================================
# Answer Quality
# ============================================================

def estimate_answer_quality(
    answer: Optional[str],
) -> str:

    if not answer or not answer.strip():
        return "none"

    if is_non_answer(answer):
        return "weak"

    text = answer.strip()

    word_count = len(text.split())

    if word_count < 8:
        return "weak"

    if word_count >= 35:
        return "strong"

    return "partial"


# ============================================================
# Difficulty Adaptation
# ============================================================

def determine_next_difficulty(
    current_difficulty: str,
    previous_answer: Optional[str],
) -> str:

    current_difficulty = normalize_difficulty(
        current_difficulty
    )

    answer_quality = estimate_answer_quality(
        previous_answer
    )

    print(
        "[QuestionGenerator] "
        f"Current difficulty={current_difficulty}, "
        f"answer_quality={answer_quality}"
    )

    if answer_quality in {"weak", "none"}:

        return decrease_difficulty(
            current_difficulty
        )

    if answer_quality == "strong":

        return increase_difficulty(
            current_difficulty
        )

    return current_difficulty


# ============================================================
# Previous Questions
# ============================================================

def format_previous_questions(
    previous_questions: Optional[List[str]],
) -> str:

    if not previous_questions:
        return "No previous questions."

    lines = []

    for index, question in enumerate(
        previous_questions,
        start=1,
    ):

        if not question:
            continue

        lines.append(
            f"{index}. {question.strip()}"
        )

    if not lines:
        return "No previous questions."

    return "\n".join(lines)


# ============================================================
# Topic History
# ============================================================

def format_topic_history(
    topic_history: Optional[List[str]],
) -> str:

    if not topic_history:
        return "No previous topics."

    lines = []

    for index, topic in enumerate(
        topic_history,
        start=1,
    ):

        if topic:
            lines.append(
                f"{index}. {topic}"
            )

    if not lines:
        return "No previous topics."

    return "\n".join(lines)


def get_current_topic(
    previous_questions: Optional[List[str]],
    topic_history: Optional[List[str]],
) -> str:

    if topic_history:
        return topic_history[-1]

    if previous_questions:
        return "Previous technical topic"

    return "No previous topic"


# ============================================================
# Skill Formatting
# ============================================================

def format_skill_list(
    skills: Optional[List[str]],
) -> str:

    if not skills:
        return "None"

    cleaned = []

    for skill in skills:

        if skill is None:
            continue

        value = str(skill).strip()

        if value:
            cleaned.append(value)

    if not cleaned:
        return "None"

    return ", ".join(cleaned)


# ============================================================
# RAG Retrieval
# ============================================================

def retrieve_interview_context(
    query: str,
) -> List[Document]:

    print(
        "[QuestionGenerator] "
        "Retrieving RAG knowledge..."
    )

    vector_store = get_or_create_vector_store()

    documents = retrieve_relevant_chunks(
        vector_store=vector_store,
        query=query,
        k=RAG_TOP_K,
    )

    print(
        "[QuestionGenerator] "
        f"Retrieved {len(documents)} RAG chunk(s)."
    )

    return documents


def format_rag_context(
    documents: List[Document],
) -> str:

    if not documents:
        return (
            "No RAG knowledge was retrieved."
        )

    context_parts = []

    for index, document in enumerate(
        documents,
        start=1,
    ):

        content = (
            document.page_content
            if document.page_content
            else ""
        )

        if not content.strip():
            continue

        metadata = (
            document.metadata
            if document.metadata
            else {}
        )

        source_file = metadata.get(
            "source_file",
            "unknown",
        )

        job_field = metadata.get(
            "job_field",
            "unknown",
        )

        topic = metadata.get(
            "topic",
            "unknown",
        )

        difficulty = metadata.get(
            "difficulty",
            "unknown",
        )

        context_parts.append(
            f"[Knowledge Chunk {index}]\n"
            f"Source: {source_file}\n"
            f"Job Field: {job_field}\n"
            f"Topic: {topic}\n"
            f"Difficulty: {difficulty}\n"
            f"Content:\n{content.strip()}"
        )

    if not context_parts:
        return (
            "No RAG knowledge was retrieved."
        )

    return "\n\n".join(
        context_parts
    )


# ============================================================
# Focused Retrieval Query
# ============================================================

def build_retrieval_query(
    job_description: str,
    candidate_resume: str,
    previous_answer: str,
    previous_questions: List[str],
    difficulty: str,
    current_topic: str,
    topic_history: Optional[List[str]] = None,
    weak_answer_streak: int = 0,
    job_field: str = "",
    matched_skills: Optional[List[str]] = None,
    related_skills: Optional[List[str]] = None,
    missing_skills: Optional[List[str]] = None,
    additional_skills: Optional[List[str]] = None,
) -> str:

    matched_skills = matched_skills or []
    related_skills = related_skills or []
    missing_skills = missing_skills or []
    additional_skills = additional_skills or []

    answer_quality = estimate_answer_quality(
        previous_answer
    )

    previous_question_text = (
        format_previous_questions(
            previous_questions
        )
    )

    topic_history_text = (
        format_topic_history(
            topic_history
        )
    )

    # ========================================================
    # IMPORTANT:
    # Question 1 has no previous answer.
    # "none" must NOT be interpreted as a weak answer.
    # ========================================================

    has_previous_answer = bool(
        previous_answer
        and previous_answer.strip()
    )

    # --------------------------------------------------------
    # Repeated weak answers
    # --------------------------------------------------------

    if (
        has_previous_answer
        and weak_answer_streak
        >= MAX_SAME_TOPIC_WEAK_ATTEMPTS
    ):

        topic_instruction = f"""
The candidate has repeatedly struggled with:

CURRENT TOPIC:
{current_topic}

Do NOT retrieve knowledge focused on this topic.

Instead retrieve foundational interview knowledge from
OTHER job-relevant technical areas.

Prefer an important missing skill when appropriate.

MISSING SKILLS:
{format_skill_list(missing_skills)}

Avoid:
{current_topic}
"""

    # --------------------------------------------------------
    # Weak answer
    # --------------------------------------------------------

    elif has_previous_answer and answer_quality == "weak":

        topic_instruction = f"""
The candidate struggled with the current topic:

{current_topic}

Retrieve foundational technical knowledge suitable for an
easy interview question.

If appropriate, use a relevant missing skill.

MISSING SKILLS:
{format_skill_list(missing_skills)}
"""

    # --------------------------------------------------------
    # No previous answer / First question
    # --------------------------------------------------------

    elif not has_previous_answer:

        topic_instruction = f"""
This is the beginning of the interview or there is no previous
candidate answer to evaluate.

Do NOT assume that the candidate struggled.

Do NOT retrieve knowledge using weak-answer or recovery logic.

Retrieve technical interview knowledge relevant to:

TARGET JOB FIELD:
{job_field}

CURRENT DIFFICULTY:
{difficulty}

CURRENT TOPIC:
{current_topic}

The first question should be broad but relevant to the target
job field.

It may use an important matched skill or a relevant candidate
project.

If a missing skill is selected, prefer foundational knowledge
unless the resume clearly supports a higher-level question.

MISSING SKILLS:
{format_skill_list(missing_skills)}

MATCHED SKILLS:
{format_skill_list(matched_skills)}

RELATED SKILLS:
{format_skill_list(related_skills)}
"""

    # --------------------------------------------------------
    # Normal / strong answer
    # --------------------------------------------------------

    else:

        topic_instruction = f"""
Retrieve knowledge relevant to:

CURRENT TOPIC:
{current_topic}

Also consider important missing skills when appropriate.

MISSING SKILLS:
{format_skill_list(missing_skills)}

MATCHED SKILLS:
{format_skill_list(matched_skills)}
"""

    query = f"""
Technical interview knowledge retrieval.

TARGET JOB FIELD:
{job_field}

JOB DESCRIPTION:
{job_description[:MAX_JD_LENGTH]}

CURRENT DIFFICULTY:
{difficulty}

CURRENT TOPIC:
{current_topic}

ANSWER QUALITY:
{answer_quality}

WEAK ANSWER STREAK:
{weak_answer_streak}

MATCHED SKILLS:
{format_skill_list(matched_skills)}

RELATED SKILLS:
{format_skill_list(related_skills)}

MISSING SKILLS:
{format_skill_list(missing_skills)}

ADDITIONAL SKILLS:
{format_skill_list(additional_skills)}

PREVIOUS ANSWER:
{previous_answer[:MAX_ANSWER_LENGTH]}

PREVIOUS QUESTIONS:
{previous_question_text}

TOPIC HISTORY:
{topic_history_text}

CANDIDATE BACKGROUND:
{candidate_resume[:MAX_RESUME_LENGTH]}

{topic_instruction}

Retrieve technical interview knowledge for the next question.

Priorities:

1. Target job field relevance.
2. Job-relevant technical concepts.
3. Concepts appropriate for the current difficulty.
4. Missing skills when appropriate.
5. Matched skills for deeper questions when justified.
6. Foundational knowledge if the candidate is weak.
7. A topic different from recently tested concepts when
   appropriate.
8. Practical interview knowledge.
9. Avoid semantic repetition.

Do not retrieve unrelated content.
"""

    return query.strip()


# ============================================================
# Question Normalization
# ============================================================

def normalize_question_result(
    result: Dict[str, Any],
) -> Dict[str, Any]:

    question = str(
        result.get(
            "question",
            "",
        )
    ).strip()

    category = str(
        result.get(
            "category",
            "",
        )
    ).strip()

    difficulty = normalize_difficulty(
        result.get("difficulty")
    )

    is_follow_up = result.get(
        "is_follow_up",
        False,
    )

    reason = str(
        result.get(
            "reason",
            "",
        )
    ).strip()

    if isinstance(
        is_follow_up,
        str,
    ):

        is_follow_up = (
            is_follow_up.lower()
            in {
                "true",
                "yes",
                "1",
            }
        )

    return {
        "question": question,
        "category": category,
        "difficulty": difficulty,
        "is_follow_up": bool(
            is_follow_up
        ),
        "reason": reason,
    }


# ============================================================
# Question Similarity / Duplicate Detection
# ============================================================

def normalize_text(
    text: str,
) -> str:

    text = text.lower()

    text = re.sub(
        r"[^a-z0-9\s]",
        " ",
        text,
    )

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


def calculate_word_overlap(
    question_a: str,
    question_b: str,
) -> float:

    words_a = set(
        normalize_text(
            question_a
        ).split()
    )

    words_b = set(
        normalize_text(
            question_b
        ).split()
    )

    if not words_a or not words_b:
        return 0.0

    intersection = words_a.intersection(
        words_b
    )

    union = words_a.union(
        words_b
    )

    return len(intersection) / len(
        union
    )


def is_duplicate_or_similar_question(
    question: str,
    previous_questions: List[str],
) -> bool:

    normalized_question = (
        normalize_text(
            question
        )
    )

    for previous in previous_questions:

        if not previous:
            continue

        normalized_previous = (
            normalize_text(
                previous
            )
        )

        # Exact match
        if (
            normalized_question
            == normalized_previous
        ):

            return True

        # High word similarity
        overlap = (
            calculate_word_overlap(
                question,
                previous,
            )
        )

        if overlap >= 0.65:

            print(
                "[QuestionGenerator] "
                f"Similar question detected "
                f"(overlap={overlap:.2f})"
            )

            return True

    return False


# ============================================================
# Basic Question Validation
# ============================================================

def basic_question_validation(
    result: Dict[str, Any],
    previous_questions: List[str],
    required_difficulty: str,
) -> bool:

    question = str(
        result.get(
            "question",
            "",
        )
    ).strip()

    category = str(
        result.get(
            "category",
            "",
        )
    ).strip()

    difficulty = str(
        result.get(
            "difficulty",
            "",
        )
    ).strip().lower()

    if not question:

        print(
            "[QuestionGenerator] "
            "Validation failed: empty question."
        )

        return False

    if len(question) < 15:

        print(
            "[QuestionGenerator] "
            "Validation failed: question too short."
        )

        return False

    if not category:

        print(
            "[QuestionGenerator] "
            "Validation failed: category missing."
        )

        return False

    if difficulty not in DIFFICULTY_LEVELS:

        print(
            "[QuestionGenerator] "
            "Validation failed: invalid difficulty."
        )

        return False

    # --------------------------------------------------------
    # Enforce calculated difficulty
    # --------------------------------------------------------

    if difficulty != required_difficulty:

        print(
            "[QuestionGenerator] "
            f"Validation failed: generated difficulty "
            f"{difficulty} != required "
            f"{required_difficulty}"
        )

        return False

    # --------------------------------------------------------
    # Duplicate / semantic similarity detection
    # --------------------------------------------------------

    if is_duplicate_or_similar_question(
        question,
        previous_questions,
    ):

        print(
            "[QuestionGenerator] "
            "Validation failed: "
            "duplicate/similar question."
        )

        return False

    return True


# ============================================================
# LLM Validation
# ============================================================

def validate_question_with_llm(
    llm: ChatGoogleGenerativeAI,
    question: str,
    job_field: str,
    job_description: str,
    candidate_resume: str,
    previous_questions: List[str],
    current_topic: str,
    topic_history: Optional[List[str]],
    weak_answer_streak: int,
    difficulty: str,
    matched_skills: Optional[List[str]] = None,
    related_skills: Optional[List[str]] = None,
    missing_skills: Optional[List[str]] = None,
    additional_skills: Optional[List[str]] = None,
) -> bool:

    matched_skills = matched_skills or []
    related_skills = related_skills or []
    missing_skills = missing_skills or []
    additional_skills = additional_skills or []

    prompt = PromptTemplate(
        input_variables=[
            "job_field",
            "job_description",
            "candidate_resume",
            "matched_skills",
            "related_skills",
            "missing_skills",
            "additional_skills",
            "previous_questions",
            "current_topic",
            "topic_history",
            "weak_answer_streak",
            "difficulty",
            "question",
        ],
        template=QUESTION_VALIDATION_PROMPT,
    )

    chain = (
        prompt
        | llm
        | StrOutputParser()
    )

    response = chain.invoke(
        {
            "job_field": job_field,

            "job_description":
                job_description[
                    :MAX_JD_LENGTH
                ],

            "candidate_resume":
                candidate_resume[
                    :MAX_RESUME_LENGTH
                ],

            "matched_skills":
                format_skill_list(
                    matched_skills
                ),

            "related_skills":
                format_skill_list(
                    related_skills
                ),

            "missing_skills":
                format_skill_list(
                    missing_skills
                ),

            "additional_skills":
                format_skill_list(
                    additional_skills
                ),

            "previous_questions":
                format_previous_questions(
                    previous_questions
                ),

            "current_topic":
                current_topic,

            "topic_history":
                format_topic_history(
                    topic_history
                ),

            "weak_answer_streak":
                weak_answer_streak,

            "difficulty":
                difficulty,

            "question":
                question,
        }
    )

    try:

        result = parse_json_response(
            response
        )

        valid = result.get(
            "valid",
            False,
        )

        reason = result.get(
            "reason",
            "",
        )

        print(
            "[QuestionGenerator] "
            f"LLM validation={valid}; "
            f"reason={reason}"
        )

        return bool(valid)

    except Exception as exc:

        print(
            "[QuestionGenerator] "
            f"Question validation parsing failed: "
            f"{exc}"
        )

        return False


# ============================================================
# Generate Question
# ============================================================

def generate_question(
    session_id: str,
    job_description: str,
    candidate_resume: Optional[str] = "",
    last_candidate_answer: Optional[str] = "",
    previous_questions: Optional[List[str]] = None,
    question_number: int = 1,
    difficulty: Optional[str] = None,
    current_topic: Optional[str] = "",
    topic_history: Optional[List[str]] = None,
    weak_answer_streak: int = 0,

    # Skill-gap context
    job_field: str = "",
    matched_skills: Optional[List[str]] = None,
    related_skills: Optional[List[str]] = None,
    missing_skills: Optional[List[str]] = None,
    additional_skills: Optional[List[str]] = None,
) -> Dict[str, Any]:

    # ========================================================
    # Normalize inputs
    # ========================================================

    job_description = (
        job_description or ""
    ).strip()

    candidate_resume = (
        candidate_resume or ""
    ).strip()

    last_candidate_answer = (
        last_candidate_answer or ""
    ).strip()

    job_field = (
        job_field or ""
    ).strip()

    previous_questions = (
        previous_questions or []
    )

    topic_history = (
        topic_history or []
    )

    matched_skills = (
        matched_skills or []
    )

    related_skills = (
        related_skills or []
    )

    missing_skills = (
        missing_skills or []
    )

    additional_skills = (
        additional_skills or []
    )

    current_topic = (
        current_topic or ""
    ).strip()

    weak_answer_streak = max(
        0,
        int(weak_answer_streak),
    )

    # ========================================================
    # Validation
    # ========================================================

    if not job_description:

        raise ValueError(
            "Job description is required."
        )

    if len(job_description) < 20:

        raise ValueError(
            "Job description must contain "
            "at least 20 characters."
        )

    if question_number < 1:

        raise ValueError(
            "Question number must be at least 1."
        )

    # ========================================================
    # Determine answer quality
    # ========================================================

    answer_quality = (
        estimate_answer_quality(
            last_candidate_answer
        )
    )

    # ========================================================
    # Determine difficulty
    # ========================================================

    if question_number == 1:

        current_difficulty = (
            normalize_difficulty(
                difficulty or "medium"
            )
        )

        print(
            "[QuestionGenerator] "
            "Generating first interview question."
        )

    else:

        current_difficulty = (
            determine_next_difficulty(
                difficulty or "medium",
                last_candidate_answer,
            )
        )

        # Repeated weak answers force easy.
        if (
            weak_answer_streak
            >= MAX_SAME_TOPIC_WEAK_ATTEMPTS
        ):

            current_difficulty = "easy"

        print(
            "[QuestionGenerator] "
            f"Generating question "
            f"#{question_number}."
        )

    # ========================================================
    # Determine current topic
    # ========================================================

    if not current_topic and topic_history:

        current_topic = (
            topic_history[-1]
        )

    if (
        not current_topic
        and previous_questions
    ):

        current_topic = (
            "Previous technical topic"
        )

    if not current_topic:

        current_topic = (
            "General technical fundamentals"
        )

    # ========================================================
    # Determine topic-change requirement
    # ========================================================

    force_topic_change = (
        question_number > 1
        and weak_answer_streak
        >= MAX_SAME_TOPIC_WEAK_ATTEMPTS
    )

    if force_topic_change:

        print(
            "[QuestionGenerator] "
            "Repeated weak answers detected. "
            "Forcing topic change."
        )

    # ========================================================
    # Build focused RAG query
    # ========================================================

    retrieval_query = (
        build_retrieval_query(
            job_description=job_description,
            candidate_resume=candidate_resume,
            previous_answer=last_candidate_answer,
            previous_questions=previous_questions,
            difficulty=current_difficulty,
            current_topic=current_topic,
            topic_history=topic_history,
            weak_answer_streak=weak_answer_streak,
            job_field=job_field,
            matched_skills=matched_skills,
            related_skills=related_skills,
            missing_skills=missing_skills,
            additional_skills=additional_skills,
        )
    )

    print(
        "\n[QuestionGenerator] "
        "RAG Retrieval Query:"
    )

    print(
        retrieval_query
    )

    # ========================================================
    # Retrieve RAG
    # ========================================================

    try:

        retrieved_documents = (
            retrieve_interview_context(
                retrieval_query
            )
        )

        retrieved_context = (
            format_rag_context(
                retrieved_documents
            )
        )

    except Exception as exc:

        print(
            "[QuestionGenerator] "
            f"RAG retrieval failed: {exc}"
        )

        retrieved_context = (
            "RAG knowledge is temporarily "
            "unavailable. Generate the question "
            "using the job description, target "
            "job field, candidate context, and "
            "skill-gap information."
        )

    # ========================================================
    # Create LLM
    # ========================================================

    llm = get_llm()

    # ========================================================
    # Prompt
    # ========================================================

    prompt = PromptTemplate(
        input_variables=[
            "job_field",
            "job_description",
            "candidate_resume",
            "matched_skills",
            "related_skills",
            "missing_skills",
            "additional_skills",
            "last_candidate_answer",
            "answer_quality",
            "previous_questions",
            "current_topic",
            "topic_history",
            "weak_answer_streak",
            "question_number",
            "difficulty",
            "retrieved_context",
        ],
        template=QUESTION_GENERATOR_PROMPT,
    )

    chain = (
        prompt
        | llm
        | StrOutputParser()
    )

    # ========================================================
    # Generation loop
    # ========================================================

    last_error = None

    for attempt in range(
        MAX_GENERATION_RETRIES + 1
    ):

        try:

            print(
                "[QuestionGenerator] "
                f"Generation attempt "
                f"{attempt + 1}/"
                f"{MAX_GENERATION_RETRIES + 1}"
            )

            response = chain.invoke(
                {
                    "job_field":
                        job_field,

                    "job_description":
                        job_description[
                            :MAX_JD_LENGTH
                        ],

                    "candidate_resume":
                        candidate_resume[
                            :MAX_RESUME_LENGTH
                        ],

                    "matched_skills":
                        format_skill_list(
                            matched_skills
                        ),

                    "related_skills":
                        format_skill_list(
                            related_skills
                        ),

                    "missing_skills":
                        format_skill_list(
                            missing_skills
                        ),

                    "additional_skills":
                        format_skill_list(
                            additional_skills
                        ),

                    "last_candidate_answer":
                        last_candidate_answer[
                            :MAX_ANSWER_LENGTH
                        ],

                    "answer_quality":
                        answer_quality,

                    "previous_questions":
                        format_previous_questions(
                            previous_questions
                        ),

                    "current_topic":
                        current_topic,

                    "topic_history":
                        format_topic_history(
                            topic_history
                        ),

                    "weak_answer_streak":
                        weak_answer_streak,

                    "question_number":
                        question_number,

                    "difficulty":
                        current_difficulty,

                    "retrieved_context":
                        retrieved_context,
                }
            )

            # =================================================
            # Parse
            # =================================================

            result = parse_json_response(
                response
            )

            result = (
                normalize_question_result(
                    result
                )
            )

            # =================================================
            # Force required difficulty
            # =================================================

            result["difficulty"] = (
                current_difficulty
            )

            # =================================================
            # Basic validation
            # =================================================

            if not basic_question_validation(
                result=result,
                previous_questions=previous_questions,
                required_difficulty=current_difficulty,
            ):

                last_error = (
                    "Basic question "
                    "validation failed."
                )

                continue

            # =================================================
            # Topic diversity check
            # =================================================

            generated_category = (
                result["category"]
                .strip()
                .lower()
            )

            current_topic_normalized = (
                current_topic
                .strip()
                .lower()
            )

            if force_topic_change:

                if (
                    generated_category
                    == current_topic_normalized
                ):

                    print(
                        "[QuestionGenerator] "
                        "Validation failed: "
                        "topic was not changed."
                    )

                    last_error = (
                        "Generated question "
                        "remained on the "
                        "same topic."
                    )

                    continue

            # =================================================
            # LLM validation
            # =================================================

            is_valid = (
                validate_question_with_llm(
                    llm=llm,
                    question=result["question"],
                    job_field=job_field,
                    job_description=job_description,
                    candidate_resume=candidate_resume,
                    previous_questions=previous_questions,
                    current_topic=current_topic,
                    topic_history=topic_history,
                    weak_answer_streak=weak_answer_streak,
                    difficulty=current_difficulty,
                    matched_skills=matched_skills,
                    related_skills=related_skills,
                    missing_skills=missing_skills,
                    additional_skills=additional_skills,
                )
            )

            if not is_valid:

                last_error = (
                    "LLM question "
                    "validation failed."
                )

                print(
                    "[QuestionGenerator] "
                    "Generated question rejected."
                )

                continue

            # =================================================
            # Final result
            # =================================================

            result["session_id"] = (
                session_id
            )

            print(
                "[QuestionGenerator] "
                "Question generated successfully."
            )

            print(
                json.dumps(
                    result,
                    indent=2,
                    ensure_ascii=False,
                )
            )

            return result

        except Exception as exc:

            last_error = str(exc)

            print(
                "[QuestionGenerator] "
                f"Generation attempt failed: "
                f"{exc}"
            )

    # ========================================================
    # Failure
    # ========================================================

    raise RuntimeError(
        "Failed to generate a valid "
        "interview question after "
        f"{MAX_GENERATION_RETRIES + 1} attempts. "
        f"Last error: {last_error}"
    )


# ============================================================
# First Question
# ============================================================

def generate_first_question(
    session_id: str,
    job_description: str,
    candidate_resume: Optional[str] = "",
    job_field: str = "",
    matched_skills: Optional[List[str]] = None,
    related_skills: Optional[List[str]] = None,
    missing_skills: Optional[List[str]] = None,
    additional_skills: Optional[List[str]] = None,
) -> Dict[str, Any]:

    return generate_question(
        session_id=session_id,
        job_description=job_description,
        candidate_resume=candidate_resume,
        last_candidate_answer="",
        previous_questions=[],
        question_number=1,
        difficulty="medium",
        current_topic="",
        topic_history=[],
        weak_answer_streak=0,
        job_field=job_field,
        matched_skills=matched_skills,
        related_skills=related_skills,
        missing_skills=missing_skills,
        additional_skills=additional_skills,
    )


# ============================================================
# Next Question
# ============================================================

def generate_next_question(
    session_id: str,
    job_description: str,
    candidate_resume: Optional[str],
    last_candidate_answer: str,
    previous_questions: List[str],
    question_number: int,
    difficulty: str = "medium",
    current_topic: str = "",
    topic_history: Optional[List[str]] = None,
    weak_answer_streak: int = 0,

    # Skill-gap context
    job_field: str = "",
    matched_skills: Optional[List[str]] = None,
    related_skills: Optional[List[str]] = None,
    missing_skills: Optional[List[str]] = None,
    additional_skills: Optional[List[str]] = None,
) -> Dict[str, Any]:

    return generate_question(
        session_id=session_id,
        job_description=job_description,
        candidate_resume=candidate_resume,
        last_candidate_answer=last_candidate_answer,
        previous_questions=previous_questions,
        question_number=question_number,
        difficulty=difficulty,
        current_topic=current_topic,
        topic_history=topic_history,
        weak_answer_streak=weak_answer_streak,
        job_field=job_field,
        matched_skills=matched_skills,
        related_skills=related_skills,
        missing_skills=missing_skills,
        additional_skills=additional_skills,
    )