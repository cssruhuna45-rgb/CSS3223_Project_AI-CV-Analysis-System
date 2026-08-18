import json
import os

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

from app.rag.vector_store import get_or_create_vector_store
from app.rag.retriever import retrieve_relevant_chunks

from app.interview.schemas import (
    InterviewQuestionRequest,
    InterviewQuestionResponse,
)

load_dotenv()


INTERVIEW_QUESTION_PROMPT = """
You are an expert AI Technical Interviewer for an AI Interview Preparation Platform.

Your task is to generate the NEXT interview question for a candidate.

Use ONLY the following information:

1. Candidate resume
2. Job description
3. Retrieved interview knowledge
4. Previous candidate answer
5. Previously asked questions

Do NOT invent facts about the candidate.

The question must be relevant to the candidate and the target job.

Interview behavior:

- If there is no previous candidate answer, generate an appropriate first interview question.
- If a previous candidate answer exists, evaluate its apparent quality before selecting the next question.
- If the previous answer is strong, gradually increase the difficulty.
- If the previous answer is weak or incomplete, ask a clarification question or a simpler follow-up question.
- If the previous answer contains a useful technical detail, you may ask a deeper question about that same detail.
- Avoid repeating previously asked questions.

Follow-up rules:

- A question is a FOLLOW-UP only when it directly investigates, clarifies, challenges, or deepens the previous candidate answer.
- A question about a merely related topic is NOT necessarily a follow-up.
- Set is_follow_up=true only when the question directly depends on the previous candidate answer.
- Set is_follow_up=false when intentionally moving to a new topic.

Difficulty rules:

- First question: normally easy or medium.
- Strong previous answer: prefer increasing difficulty.
- Weak previous answer: keep the same difficulty or decrease it.
- Do not increase difficulty arbitrarily.
- difficulty must be exactly one of: easy, medium, hard.

Return ONLY valid JSON.

Required JSON structure:

{{
  "question": "",
  "category": "",
  "difficulty": "easy",
  "is_follow_up": false,
  "reason": ""
}}

Allowed difficulty values:

- easy
- medium
- hard

Rules:

- question must contain only the interview question.
- category should describe the main technical topic.
- difficulty must be easy, medium, or hard.
- is_follow_up must be true if this question directly follows up on the previous answer.
- reason should briefly explain why this question was selected.
- Do not include markdown.
- Do not include additional JSON fields.

Retrieved Knowledge:
{context}

Job Description:
{job_description}

Candidate Resume:
{candidate_resume}

Previous Candidate Answer:
{last_candidate_answer}

Previously Asked Questions:
{previous_questions}

Current Question Number:
{question_number}
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
        temperature=0.4,
    )


def _clean_json_response(text: str) -> str:
    """
    Removes markdown code fences if Gemini returns JSON inside
    ```json ... ``` or ``` ... ```.
    """

    text = text.strip()

    if text.startswith("```json"):
        text = text[7:]

    elif text.startswith("```"):
        text = text[3:]

    if text.endswith("```"):
        text = text[:-3]

    return text.strip()


def generate_next_question(
    request: InterviewQuestionRequest,
) -> InterviewQuestionResponse:

    print(
        f"[InterviewGenerator] Generating question "
        f"for session: {request.session_id}"
    )

    # ---------------------------------------------------------
    # 1. Load Chroma knowledge base
    # ---------------------------------------------------------

    vector_store = get_or_create_vector_store()

    # ---------------------------------------------------------
    # 2. Build retrieval query
    # ---------------------------------------------------------

    retrieval_query = f"""
    Generate a technical interview question based on:

    Job Description:
    {request.job_description}

    Candidate Resume:
    {request.candidate_resume[:6000]}

    Previous Candidate Answer:
    {request.last_candidate_answer[:4000]}

    Focus on relevant interview skills, technologies,
    concepts, and job requirements.
    """

    # ---------------------------------------------------------
    # 3. Retrieve relevant knowledge
    # ---------------------------------------------------------

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
        f"[InterviewGenerator] Retrieved "
        f"{len(retrieved_chunks)} knowledge chunk(s)."
    )

    # ---------------------------------------------------------
    # 4. Prepare previous questions
    # ---------------------------------------------------------

    if request.previous_questions:
        previous_questions = "\n".join(
            f"- {question}"
            for question in request.previous_questions
        )
    else:
        previous_questions = "None"

    # ---------------------------------------------------------
    # 5. Build prompt
    # ---------------------------------------------------------

    prompt = PromptTemplate(
        template=INTERVIEW_QUESTION_PROMPT,
        input_variables=[
            "context",
            "job_description",
            "candidate_resume",
            "last_candidate_answer",
            "previous_questions",
            "question_number",
        ],
    )

    llm = _get_llm()

    chain = (
        prompt
        | llm
        | StrOutputParser()
    )

    # ---------------------------------------------------------
    # 6. Generate question
    # ---------------------------------------------------------

    raw_response = chain.invoke(
        {
            "context": context,
            "job_description": request.job_description,
            "candidate_resume": request.candidate_resume,
            "last_candidate_answer": request.last_candidate_answer,
            "previous_questions": previous_questions,
            "question_number": request.question_number,
        }
    )

    print("[InterviewGenerator] Gemini response received.")

    # ---------------------------------------------------------
    # 7. Parse JSON
    # ---------------------------------------------------------

    cleaned_response = _clean_json_response(raw_response)

    print("\n========== GEMINI QUESTION JSON ==========")
    print(cleaned_response)
    print("==========================================\n")

    try:
        data = json.loads(cleaned_response)

    except json.JSONDecodeError as e:
        raise ValueError(
            f"Gemini returned invalid JSON: {e}. "
            f"Raw response: {raw_response[:1000]}"
        )

    # ---------------------------------------------------------
    # 8. Validate response
    # ---------------------------------------------------------

    question = str(data.get("question", "")).strip()

    if not question:
        raise ValueError(
            "Gemini returned an empty interview question."
        )

    difficulty = str(
        data.get("difficulty", "medium")
    ).lower()

    if difficulty not in {"easy", "medium", "hard"}:
        difficulty = "medium"

    result = InterviewQuestionResponse(
        session_id=request.session_id,
        question=question,
        category=str(
            data.get("category", "Technical")
        ),
        difficulty=difficulty,
        is_follow_up=bool(
            data.get("is_follow_up", False)
        ),
        reason=str(
            data.get("reason", "")
        ),
    )

    print(
        f"[InterviewGenerator] Question generated successfully. "
        f"Difficulty={result.difficulty}"
    )

    return result