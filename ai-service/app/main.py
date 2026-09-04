# app/main.py - FastAPI RAG REST Service

import os
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# ============================================================
# Security
# ============================================================

from app.security import (
    INTERNAL_API_KEY_HEADER,
    InternalApiKeyMiddleware,
    get_allowed_origins,
    get_internal_api_key,
)


# ============================================================
# RAG
# ============================================================

from app.rag.pipeline import run_rag_query

from app.rag.document_loader import (
    load_all_documents,
    split_documents,
)

from app.rag.vector_store import (
    get_or_create_vector_store,
)


# ============================================================
# Interview Schemas
# ============================================================

from app.interview.schemas import (
    InterviewQuestionRequest,
    InterviewQuestionResponse,
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewAnswerRequest,
    InterviewAnswerResponse,
    InterviewFinishRequest,
    InterviewFinishResponse,
)


# ============================================================
# Interview Session Manager
# ============================================================

from app.interview.session_manager import (
    create_session,
    get_session,
    add_question,
    add_answer,
    finish_session,
)


# ============================================================
# Interview Question Generator
# ============================================================

from app.interview.question_generator import (
    generate_first_question,
    generate_next_question,
    estimate_answer_quality,
)


# ============================================================
# Interview Evaluator
# ============================================================

from app.interview.evaluator import evaluate_interview


# ============================================================
# Resume
# ============================================================

from app.resume.analyzer import analyze_resume

from app.resume.schemas import (
    ResumeAnalysisRequest,
    ResumeAnalysisResponse,
    CVReviewRequest,
    CVReviewResponse,
)

from app.resume.cv_review import review_cv


# ============================================================
# Skill Gap
# ============================================================

from app.skill_gap.schemas import (
    SkillGapRequest,
    SkillGapResponse,
)

from app.skill_gap.analyzer import analyze_skill_gap


# ============================================================
# Load Environment Variables
# ============================================================

load_dotenv()


# ============================================================
# FastAPI Application
# ============================================================

app = FastAPI(
    title="AI Interview Platform — RAG Service API",
    description=(
        "Production-ready FastAPI service exposing "
        "Retrieval-Augmented Generation (RAG), "
        "Gemini AI, Resume Analysis, Skill Gap Analysis, "
        "and Adaptive Interview capabilities."
    ),
    version="1.0.0",
)


# ============================================================
# SECURITY
#
# Added before CORS so that CORSMiddleware ends up as the outermost
# layer: preflight requests are answered and 401 responses still carry
# CORS headers.
# ============================================================

app.add_middleware(
    InternalApiKeyMiddleware,
    api_key=get_internal_api_key(),
)


# ============================================================
# CORS
#
# Browsers are expected to call the Spring backend, which proxies to
# this service. Origins stay explicit so a stolen key cannot be replayed
# from an arbitrary page.
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Accept",
        INTERNAL_API_KEY_HEADER,
    ],
)


# ============================================================
# Pydantic Schemas
# ============================================================


class RAGQueryRequest(BaseModel):

    question: str = Field(
        ...,
        description=(
            "User question or technical interview prompt."
        ),
        example=(
            "Explain the JVM Memory Model and "
            "Heap vs Stack."
        ),
    )

    top_k: Optional[int] = Field(
        default=3,
        ge=1,
        le=10,
        description=(
            "Number of top relevant chunks to "
            "retrieve from Chroma DB."
        ),
    )

    force_rebuild: Optional[bool] = Field(
        default=False,
        description=(
            "Whether to re-parse all supported documents "
            "(Markdown/PDF) and rebuild the vector store."
        ),
    )


class RetrievedChunkResponse(BaseModel):

    content: str

    source: str

    page: Optional[int] = None


class RAGQueryResponse(BaseModel):

    question: str

    answer: str

    retrieved_chunks: List[
        RetrievedChunkResponse
    ]

    chunk_count: int


class IndexStatusResponse(BaseModel):

    status: str

    message: str

    documents_found: int

    chunks_indexed: int


class HealthCheckResponse(BaseModel):

    status: str

    service: str

    gemini_api_configured: bool


# ============================================================
# GENERAL ENDPOINTS
# ============================================================


@app.get(
    "/",
    tags=["General"],
)
def root():
    """
    Root endpoint.
    """

    return {
        "service": (
            "AI Interview Platform — "
            "FastAPI RAG Engine"
        ),
        "status": "online",
        "docs_url": "/docs",
        "health_url": "/health",
    }


@app.get(
    "/health",
    response_model=HealthCheckResponse,
    tags=["General"],
)
@app.get(
    "/api/v1/health",
    response_model=HealthCheckResponse,
    tags=["General"],
)
def health_check():
    """
    Health check endpoint.
    """

    api_key_set = bool(
        os.getenv("GEMINI_API_KEY")
    )

    return HealthCheckResponse(
        status="healthy",
        service="FastAPI RAG Engine",
        gemini_api_configured=api_key_set,
    )


# ============================================================
# RAG QUERY
# ============================================================


@app.post(
    "/api/v1/rag/query",
    response_model=RAGQueryResponse,
    tags=["RAG Engine"],
)
def query_rag_pipeline(
    req: RAGQueryRequest,
):
    """
    Query the RAG Pipeline.
    """

    if not req.question.strip():

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question string cannot be empty.",
        )

    if not os.getenv("GEMINI_API_KEY"):

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "GEMINI_API_KEY environment variable "
                "is not configured on the server."
            ),
        )

    try:

        chunks, ai_answer = run_rag_query(
            query=req.question,
            force_rebuild=req.force_rebuild,
        )

        formatted_chunks = [

            RetrievedChunkResponse(
                content=doc.page_content,

                source=os.path.basename(
                    doc.metadata.get(
                        "source_file",
                        doc.metadata.get(
                            "source",
                            "unknown",
                        ),
                    )
                ),

                page=doc.metadata.get(
                    "page_number",
                    doc.metadata.get(
                        "page",
                        None,
                    ),
                ),
            )

            for doc in chunks
        ]

        return RAGQueryResponse(
            question=req.question,
            answer=ai_answer,
            retrieved_chunks=formatted_chunks,
            chunk_count=len(formatted_chunks),
        )

    except Exception as e:

        print(
            f"[RAG] Execution Error: {e}"
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                f"RAG Execution Error: {str(e)}"
            ),
        )


# ============================================================
# RAG INDEX
# ============================================================


@app.post(
    "/api/v1/rag/index",
    response_model=IndexStatusResponse,
    tags=["RAG Engine"],
)
def reindex_knowledge_base():
    """
    Re-scan all supported documents inside documents/.
    """

    try:

        base_dir = os.path.abspath(
            os.path.join(
                os.path.dirname(__file__),
                "..",
            )
        )

        docs_path = os.path.join(
            base_dir,
            "documents",
        )

        print(
            "\n" + "=" * 70
        )

        print(
            "[RAG Index] Starting knowledge base indexing"
        )

        print(
            "=" * 70
        )

        print(
            f"[RAG Index] Documents path: {docs_path}"
        )

        if not os.path.exists(docs_path):

            os.makedirs(
                docs_path,
                exist_ok=True,
            )

            raise HTTPException(
                status_code=(
                    status.HTTP_404_NOT_FOUND
                ),
                detail=(
                    f"Documents directory does not exist. "
                    f"Created directory at: {docs_path}. "
                    "Please add Markdown or PDF documents."
                ),
            )

        raw_docs = load_all_documents(
            docs_path
        )

        print(
            f"[RAG Index] Loaded "
            f"{len(raw_docs)} document(s)."
        )

        if not raw_docs:

            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    "No supported documents found. "
                    "Please add .md, .markdown, or .pdf "
                    "files to the documents directory."
                ),
            )

        chunks = split_documents(
            raw_docs,
            chunk_size=1000,
            chunk_overlap=200,
        )

        print(
            f"[RAG Index] Created "
            f"{len(chunks)} chunks."
        )

        if not chunks:

            raise HTTPException(
                status_code=(
                    status.HTTP_400_BAD_REQUEST
                ),
                detail=(
                    "Documents were loaded but no "
                    "usable chunks were created."
                ),
            )

        print(
            "[RAG Index] Rebuilding Chroma Vector Store..."
        )

        get_or_create_vector_store(
            documents=chunks,
            force_rebuild=True,
        )

        print(
            "[RAG Index] Chroma Vector Store rebuilt successfully."
        )

        print(
            "=" * 70
        )

        print(
            "[RAG Index] Indexing completed successfully."
        )

        print(
            "=" * 70 + "\n"
        )

        return IndexStatusResponse(
            status="success",

            message=(
                "Successfully re-indexed Markdown/PDF "
                "knowledge base into Chroma Vector Store."
            ),

            documents_found=len(raw_docs),

            chunks_indexed=len(chunks),
        )

    except HTTPException:

        raise

    except Exception as e:

        print(
            f"[RAG Index] Error: {e}"
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                f"Indexing Error: {str(e)}"
            ),
        )


# ============================================================
# RESUME ANALYSIS
# ============================================================


@app.post(
    "/api/v1/resume/analyze",
    response_model=ResumeAnalysisResponse,
    tags=["Resume Analysis"],
)
def analyze_resume_endpoint(
    req: ResumeAnalysisRequest,
):
    """
    Analyze a candidate resume.
    """

    if not req.resume_text.strip():

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text cannot be empty.",
        )

    if not os.getenv("GEMINI_API_KEY"):

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "GEMINI_API_KEY environment variable "
                "is not configured."
            ),
        )

    try:

        result = analyze_resume(
            resume_id=req.resume_id,
            resume_text=req.resume_text,
        )

        print(
            "[ResumeAnalyzer] "
            "Analysis completed successfully."
        )

        return result

    except ValueError as e:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:

        print(
            f"[ResumeAnalyzer] Error: {e}"
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                f"Resume analysis failed: {str(e)}"
            ),
        )


# ============================================================
# GENERATE INTERVIEW QUESTION
# ============================================================


@app.post(
    "/api/v1/interview/question",
    response_model=InterviewQuestionResponse,
    tags=["Interview"],
)
def generate_interview_question_endpoint(
    req: InterviewQuestionRequest,
):
    """
    Generate an adaptive interview question.
    """

    if not req.job_description.strip():

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty.",
        )

    if len(req.job_description.strip()) < 20:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Job description must contain "
                "at least 20 characters."
            ),
        )

    if not os.getenv("GEMINI_API_KEY"):

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "GEMINI_API_KEY environment variable "
                "is not configured."
            ),
        )

    try:

        session = None

        try:

            session = get_session(
                req.session_id
            )

        except ValueError:

            session = None

        # ----------------------------------------------------
        # Existing session
        # ----------------------------------------------------

        if session is not None:

            print(
                "[InterviewGenerator] "
                "Using adaptive session state."
            )

            print(
                f"[InterviewGenerator] "
                f"Difficulty: "
                f"{session.current_difficulty}"
            )

            print(
                f"[InterviewGenerator] "
                f"Topic: "
                f"{session.current_topic}"
            )

            print(
                f"[InterviewGenerator] "
                f"Weak streak: "
                f"{session.weak_answer_streak}"
            )

            question = generate_next_question(

                session_id=session.session_id,

                job_description=session.job_description,

                candidate_resume=(
                    session.candidate_resume or ""
                ),

                last_candidate_answer=(
                    req.last_candidate_answer or ""
                ),

                previous_questions=(
                    list(session.questions)
                ),

                question_number=(
                    session.current_question_number
                ),

                difficulty=(
                    session.current_difficulty
                ),

                current_topic=(
                    session.current_topic
                ),

                topic_history=(
                    list(session.topic_history)
                ),

                weak_answer_streak=(
                    session.weak_answer_streak
                ),

                # Skill Gap context
                job_field=(
                    session.job_field
                ),

                matched_skills=(
                    list(session.matched_skills)
                ),

                related_skills=(
                    list(session.related_skills)
                ),

                missing_skills=(
                    list(session.missing_skills)
                ),

                additional_skills=(
                    list(session.additional_skills)
                ),
            )

        # ----------------------------------------------------
        # Legacy standalone request
        # ----------------------------------------------------

        else:

            print(
                "[InterviewGenerator] "
                "No existing session found. "
                "Using standalone generation."
            )

            question = generate_next_question(

                session_id=req.session_id,

                job_description=req.job_description,

                candidate_resume=(
                    req.candidate_resume or ""
                ),

                last_candidate_answer=(
                    req.last_candidate_answer or ""
                ),

                previous_questions=(
                    req.previous_questions
                ),

                question_number=(
                    req.question_number
                ),

                difficulty="medium",

                current_topic="",

                topic_history=[],

                weak_answer_streak=0,

                # Standalone request does not currently
                # contain Skill Gap fields.
                job_field="",

                matched_skills=[],

                related_skills=[],

                missing_skills=[],

                additional_skills=[],
            )

        return InterviewQuestionResponse(

            session_id=question["session_id"],

            question=question["question"],

            category=question["category"],

            difficulty=question["difficulty"],

            is_follow_up=(
                question["is_follow_up"]
            ),

            reason=question["reason"],
        )

    except ValueError as e:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:

        print(
            f"[InterviewGenerator] Error: {e}"
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Interview question generation failed: "
                f"{str(e)}"
            ),
        )


# ============================================================
# START INTERVIEW
# ============================================================


@app.post(
    "/api/v1/interview/start",
    response_model=InterviewStartResponse,
    tags=["Interview Session"],
)
def start_interview_endpoint(
    req: InterviewStartRequest,
):
    """
    Start a new adaptive interview session.
    """

    if not req.job_description.strip():

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty.",
        )

    if len(req.job_description.strip()) < 20:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Job description must contain "
                "at least 20 characters."
            ),
        )

    if not os.getenv("GEMINI_API_KEY"):

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "GEMINI_API_KEY environment variable "
                "is not configured."
            ),
        )

    try:

        # ====================================================
        # CREATE SESSION WITH SKILL GAP CONTEXT
        # ====================================================

        session = create_session(

            job_description=req.job_description,

            candidate_resume=(
                req.candidate_resume or ""
            ),

            job_field=(
                req.job_field or ""
            ),

            matched_skills=(
                req.matched_skills
            ),

            related_skills=(
                req.related_skills
            ),

            missing_skills=(
                req.missing_skills
            ),

            additional_skills=(
                req.additional_skills
            ),
        )

        print(
            "\n" + "=" * 70
        )

        print(
            "[InterviewStart] NEW INTERVIEW SESSION"
        )

        print(
            "=" * 70
        )

        print(
            f"Session ID: {session.session_id}"
        )

        print(
            f"Job Field: {session.job_field}"
        )

        print(
            f"Matched Skills: "
            f"{session.matched_skills}"
        )

        print(
            f"Related Skills: "
            f"{session.related_skills}"
        )

        print(
            f"Missing Skills: "
            f"{session.missing_skills}"
        )

        print(
            f"Additional Skills: "
            f"{session.additional_skills}"
        )

        print(
            f"Initial difficulty: "
            f"{session.current_difficulty}"
        )

        print(
            f"Initial topic: "
            f"{session.current_topic}"
        )

        # ====================================================
        # GENERATE FIRST QUESTION
        # ====================================================

        question = generate_first_question(

            session_id=session.session_id,

            job_description=req.job_description,

            candidate_resume=(
                req.candidate_resume or ""
            ),

            job_field=(
                req.job_field or ""
            ),

            matched_skills=(
                req.matched_skills
            ),

            related_skills=(
                req.related_skills
            ),

            missing_skills=(
                req.missing_skills
            ),

            additional_skills=(
                req.additional_skills
            ),
        )

        print(
            "[InterviewStart] First question:"
        )

        print(
            f"  Difficulty: "
            f"{question.get('difficulty')}"
        )

        print(
            f"  Topic: "
            f"{question.get('category')}"
        )

        # ====================================================
        # SAVE FIRST QUESTION
        # ====================================================

        add_question(

            session.session_id,

            question["question"],

            difficulty=question.get(
                "difficulty",
                "medium",
            ),

            topic=question.get(
                "category",
                "",
            ),

            topic_key=question.get(
                "topic_key",
                "",
            ),
        )

        # ====================================================
        # RELOAD SESSION
        # ====================================================

        session = get_session(
            session.session_id
        )

        # ====================================================
        # RESPONSE
        # ====================================================

        question_response = (
            InterviewQuestionResponse(

                session_id=session.session_id,

                question=question["question"],

                category=question["category"],

                difficulty=question["difficulty"],

                is_follow_up=(
                    question["is_follow_up"]
                ),

                reason=question["reason"],
            )
        )

        print(
            "=" * 70
        )

        print(
            "[InterviewStart] Session ready."
        )

        print(
            "=" * 70 + "\n"
        )

        return InterviewStartResponse(

            session_id=session.session_id,

            question=question_response,
        )

    except HTTPException:

        raise

    except Exception as e:

        print(
            f"[InterviewStart] Error: {e}"
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                f"Interview start failed: {str(e)}"
            ),
        )


# ============================================================
# SUBMIT INTERVIEW ANSWER
# ============================================================


@app.post(
    "/api/v1/interview/answer",
    response_model=InterviewAnswerResponse,
    tags=["Interview Session"],
)
def answer_interview_endpoint(
    req: InterviewAnswerRequest,
):
    """
    Submit candidate answer and generate the next
    adaptive interview question.
    """

    if not req.answer.strip():

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answer cannot be empty.",
        )

    if not os.getenv("GEMINI_API_KEY"):

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "GEMINI_API_KEY environment variable "
                "is not configured."
            ),
        )

    try:

        # ====================================================
        # GET SESSION
        # ====================================================

        session = get_session(
            req.session_id
        )

        if session.status != "active":

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "Interview session is not active."
                ),
            )

        # ====================================================
        # CAPTURE CURRENT STATE
        # ====================================================

        previous_difficulty = (
            session.current_difficulty
        )

        previous_topic = (
            session.current_topic
        )

        previous_topic_key = getattr(
            session,
            "current_topic_key",
            "",
        )

        previous_topic_history = list(
            getattr(
                session,
                "topic_history",
                [],
            )
        )

        current_question_number = (
            session.current_question_number
        )

        print(
            "\n" + "=" * 70
        )

        print(
            "[InterviewAnswer] ANSWER SUBMISSION"
        )

        print(
            "=" * 70
        )

        print(
            f"Session ID: {session.session_id}"
        )

        print(
            f"Current question number: "
            f"{current_question_number}"
        )

        print(
            f"Current difficulty: "
            f"{previous_difficulty}"
        )

        print(
            f"Current topic: "
            f"{previous_topic}"
        )

        print(
            f"Topic history: "
            f"{previous_topic_history}"
        )

        print(
            f"Job Field: "
            f"{session.job_field}"
        )

        print(
            f"Matched Skills: "
            f"{session.matched_skills}"
        )

        print(
            f"Related Skills: "
            f"{session.related_skills}"
        )

        print(
            f"Missing Skills: "
            f"{session.missing_skills}"
        )

        print(
            f"Additional Skills: "
            f"{session.additional_skills}"
        )

        print(
            f"Weak streak BEFORE: "
            f"{session.weak_answer_streak}"
        )

        # ====================================================
        # ESTIMATE ANSWER QUALITY
        # ====================================================

        answer_quality = (
            estimate_answer_quality(
                req.answer
            )
        )

        print(
            f"Answer quality: "
            f"{answer_quality}"
        )

        # ====================================================
        # UPDATE WEAK ANSWER STREAK
        # ====================================================

        if answer_quality in {
            "weak",
            "none",
        }:

            session.weak_answer_streak += 1

        else:

            session.weak_answer_streak = 0

        session.last_answer_quality = (
            answer_quality
        )

        print(
            f"Weak streak AFTER: "
            f"{session.weak_answer_streak}"
        )

        # ====================================================
        # SAVE ANSWER
        # ====================================================

        add_answer(

            req.session_id,

            req.answer,

            answer_quality=answer_quality,
        )

        print(
            "[InterviewAnswer] "
            "Candidate answer saved."
        )

        # ====================================================
        # PREVIOUS QUESTIONS
        # ====================================================

        previous_questions = list(
            session.questions
        )

        # ====================================================
        # GENERATE NEXT QUESTION
        # ====================================================

        print(
            "\n" + "-" * 70
        )

        print(
            "[InterviewAnswer] GENERATING NEXT QUESTION"
        )

        print(
            "-" * 70
        )

        print(
            f"Difficulty passed to generator: "
            f"{previous_difficulty}"
        )

        print(
            f"Current topic passed to generator: "
            f"{previous_topic}"
        )

        print(
            f"Topic history passed to generator: "
            f"{previous_topic_history}"
        )

        print(
            f"Weak streak passed to generator: "
            f"{session.weak_answer_streak}"
        )

        # ----------------------------------------------------
        # Skill Gap context passed to generator
        # ----------------------------------------------------

        print(
            f"Job field passed to generator: "
            f"{session.job_field}"
        )

        print(
            f"Matched skills passed to generator: "
            f"{session.matched_skills}"
        )

        print(
            f"Related skills passed to generator: "
            f"{session.related_skills}"
        )

        print(
            f"Missing skills passed to generator: "
            f"{session.missing_skills}"
        )

        print(
            f"Additional skills passed to generator: "
            f"{session.additional_skills}"
        )

        question = generate_next_question(

            session_id=session.session_id,

            job_description=session.job_description,

            candidate_resume=(
                session.candidate_resume or ""
            ),

            last_candidate_answer=req.answer,

            previous_questions=(
                previous_questions
            ),

            question_number=(
                session.current_question_number
            ),

            difficulty=previous_difficulty,

            current_topic=previous_topic,

            topic_history=(
                previous_topic_history
            ),

            weak_answer_streak=(
                session.weak_answer_streak
            ),

            # =================================================
            # SKILL GAP CONTEXT
            # =================================================

            job_field=(
                session.job_field
            ),

            matched_skills=(
                list(session.matched_skills)
            ),

            related_skills=(
                list(session.related_skills)
            ),

            missing_skills=(
                list(session.missing_skills)
            ),

            additional_skills=(
                list(session.additional_skills)
            ),
        )

        # ====================================================
        # GET GENERATED STATE
        # ====================================================

        new_difficulty = question.get(
            "difficulty",
            previous_difficulty,
        )

        new_topic = question.get(
            "category",
            previous_topic,
        )

        new_topic_key = question.get(
            "topic_key",
            "",
        )

        print(
            "[InterviewAnswer] "
            "Next question generated."
        )

        print(
            f"Next difficulty: "
            f"{new_difficulty}"
        )

        print(
            f"Next topic: "
            f"{new_topic}"
        )

        print(
            f"Next topic key: "
            f"{new_topic_key}"
        )

        # ====================================================
        # SAVE NEXT QUESTION
        # ====================================================

        add_question(

            session.session_id,

            question["question"],

            difficulty=new_difficulty,

            topic=new_topic,

            topic_key=new_topic_key,
        )

        # ====================================================
        # DETECT TOPIC CHANGE
        # ====================================================

        topic_changed = False

        old_topic_key = (
            previous_topic_key
            or previous_topic.strip().lower()
        )

        generated_topic_key = (
            new_topic_key
            or new_topic.strip().lower()
        )

        if (
            old_topic_key
            and generated_topic_key
            and old_topic_key
            != generated_topic_key
        ):

            topic_changed = True

        # ====================================================
        # RESET WEAK STREAK AFTER TOPIC CHANGE
        # ====================================================

        if topic_changed:

            session.weak_answer_streak = 0

            print(
                "[InterviewAnswer] "
                "Topic changed."
            )

            print(
                "[InterviewAnswer] "
                "Weak answer streak reset to 0."
            )

        # ====================================================
        # RELOAD SESSION
        # ====================================================

        session = get_session(
            req.session_id
        )

        # ====================================================
        # RESPONSE
        # ====================================================

        question_response = (
            InterviewQuestionResponse(

                session_id=session.session_id,

                question=question["question"],

                category=question["category"],

                difficulty=question["difficulty"],

                is_follow_up=(
                    question["is_follow_up"]
                ),

                reason=question["reason"],
            )
        )

        # ====================================================
        # FINAL LOG
        # ====================================================

        print(
            "\n" + "=" * 70
        )

        print(
            "[InterviewAnswer] NEXT QUESTION READY"
        )

        print(
            "=" * 70
        )

        print(
            f"Question number: "
            f"{session.current_question_number}"
        )

        print(
            f"Difficulty: "
            f"{session.current_difficulty}"
        )

        print(
            f"Topic: "
            f"{session.current_topic}"
        )

        print(
            f"Answer quality: "
            f"{answer_quality}"
        )

        print(
            f"Weak streak: "
            f"{session.weak_answer_streak}"
        )

        print(
            f"Topic changed: "
            f"{topic_changed}"
        )

        print(
            "=" * 70 + "\n"
        )

        return InterviewAnswerResponse(

            session_id=session.session_id,

            question=question_response,
        )

    except HTTPException:

        raise

    except ValueError as e:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    except Exception as e:

        print(
            f"[InterviewAnswer] Error: {e}"
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Interview answer processing failed: "
                f"{str(e)}"
            ),
        )


# ============================================================
# FINISH INTERVIEW
# ============================================================


@app.post(
    "/api/v1/interview/finish",
    response_model=InterviewFinishResponse,
    tags=["Interview Session"],
)
def finish_interview_endpoint(
    req: InterviewFinishRequest,
):
    """
    Finish an active interview session.
    """

    try:

        session = get_session(
            req.session_id
        )

        # ----------------------------------------------------
        # Already finished: return the cached scorecard.
        #
        # Grading again would cost another LLM call and could
        # hand back different numbers for the same interview.
        # ----------------------------------------------------

        if session.status == "completed" and session.evaluation:

            return InterviewFinishResponse(
                session_id=session.session_id,
                status=session.status,
                total_questions=len(session.questions),
                **session.evaluation,
            )

        finished_session = finish_session(
            req.session_id
        )

        # ----------------------------------------------------
        # Grade the transcript.
        #
        # evaluate_interview never raises - a grading failure
        # comes back as zeros with evaluated=False, so the
        # candidate still reaches their scorecard.
        # ----------------------------------------------------

        evaluation = evaluate_interview(
            questions=finished_session.questions,
            answers=finished_session.answers,
            job_field=finished_session.job_field,
        )

        finished_session.evaluation = evaluation

        print(
            "[InterviewFinish] "
            f"Session completed: {req.session_id} | "
            f"overall {evaluation.get('overall_score')} | "
            f"evaluated={evaluation.get('evaluated')}"
        )

        return InterviewFinishResponse(
            session_id=finished_session.session_id,
            status=finished_session.status,
            total_questions=len(finished_session.questions),
            **evaluation,
        )

    except HTTPException:

        raise

    except ValueError as e:

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )

    except Exception as e:

        print(
            f"[InterviewFinish] Error: {e}"
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Interview finish failed: "
                f"{str(e)}"
            ),
        )


# ============================================================
# CV REVIEW
# ============================================================


@app.post(
    "/api/v1/resume/feedback",
    response_model=CVReviewResponse,
    tags=["Resume"],
)
def review_cv_endpoint(
    req: CVReviewRequest,
):
    """
    Review a CV against the written standards in
    documents/cv_resume_standards_guide.md.

    Distinct from /api/v1/resume/analyze, which extracts what the CV
    says. This judges how well it is written.
    """

    if not req.resume_text.strip():

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text cannot be empty.",
        )

    try:

        result = review_cv(req.resume_text)

        return CVReviewResponse(
            resume_id=req.resume_id,
            **result,
        )

    except HTTPException:

        raise

    except Exception as e:

        print(f"[CVReview] Error: {e}")

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=f"CV review failed: {str(e)}",
        )


# ============================================================
# SKILL GAP ANALYSIS
# ============================================================


@app.post(
    "/api/v1/skill-gap/analyze",
    response_model=SkillGapResponse,
    tags=["Skill Gap Analysis"],
)
def analyze_skill_gap_endpoint(
    req: SkillGapRequest,
):
    """
    Analyze candidate skill gap for a predefined
    job field.
    """

    if not req.job_field.strip():

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job field cannot be empty.",
        )

    if not req.candidate_resume.strip():

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Candidate resume cannot be empty."
            ),
        )

    if len(req.candidate_resume.strip()) < 20:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Candidate resume must contain "
                "at least 20 characters."
            ),
        )

    if not os.getenv("GEMINI_API_KEY"):

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "GEMINI_API_KEY environment variable "
                "is not configured."
            ),
        )

    try:

        result = analyze_skill_gap(
            req
        )

        print(
            "[SkillGapAPI] "
            "Skill gap analysis completed for "
            f"job field: {req.job_field}"
        )

        return result

    except ValueError as e:

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:

        print(
            f"[SkillGapAPI] Error: {e}"
        )

        raise HTTPException(
            status_code=(
                status.HTTP_500_INTERNAL_SERVER_ERROR
            ),
            detail=(
                "Skill gap analysis failed: "
                f"{str(e)}"
            ),
        )


# ============================================================
# RUN DIRECTLY
# ============================================================


if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )