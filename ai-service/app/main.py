# app/main.py - FastAPI RAG REST Service
import os
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from app.rag.pipeline import run_rag_query
from app.rag.document_loader import load_pdf_documents, split_documents
from app.rag.vector_store import get_or_create_vector_store

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

from app.interview.session_manager import (
    create_session,
    get_session,
    add_question,
    add_answer,
    finish_session,
)

from app.resume.analyzer import analyze_resume

from app.resume.schemas import (
    ResumeAnalysisRequest,
    ResumeAnalysisResponse,
)



from app.interview.question_generator import generate_next_question

from app.skill_gap.schemas import (
    SkillGapRequest,
    SkillGapResponse,
)

from app.skill_gap.analyzer import analyze_skill_gap

load_dotenv()

app = FastAPI(
    title="AI Interview Platform — RAG Service API",
    description="Production-ready FastAPI service exposing Retrieval-Augmented Generation (RAG) and Gemini AI capabilities.",
    version="1.0.0"
)

# Enable CORS for Spring Boot Backend & React Frontend interactions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---

class RAGQueryRequest(BaseModel):
    question: str = Field(..., description="User question or technical interview prompt.", example="Explain the JVM Memory Model and Heap vs Stack.")
    top_k: Optional[int] = Field(default=3, ge=1, le=10, description="Number of top relevant chunks to retrieve from Chroma DB.")
    force_rebuild: Optional[bool] = Field(default=False, description="Whether to re-parse PDFs and rebuild the vector store.")

class RetrievedChunkResponse(BaseModel):
    content: str
    source: str
    page: Optional[int] = None

class RAGQueryResponse(BaseModel):
    question: str
    answer: str
    retrieved_chunks: List[RetrievedChunkResponse]
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

# --- Endpoints ---

@app.get("/", tags=["General"])
def root():
    return {
        "service": "AI Interview Platform — FastAPI RAG Engine",
        "status": "online",
        "docs_url": "/docs",
        "health_url": "/health"
    }

@app.get("/health", response_model=HealthCheckResponse, tags=["General"])
@app.get("/api/v1/health", response_model=HealthCheckResponse, tags=["General"])
def health_check():
    api_key_set = bool(os.getenv("GEMINI_API_KEY"))
    return HealthCheckResponse(
        status="healthy",
        service="FastAPI RAG Engine",
        gemini_api_configured=api_key_set
    )

@app.post("/api/v1/rag/query", response_model=RAGQueryResponse, tags=["RAG Engine"])
def query_rag_pipeline(req: RAGQueryRequest):
    """
    Query the RAG Pipeline:
    1. Performs similarity search in Chroma Vector DB.
    2. Passes retrieved chunks + question to Gemini API via LangChain.
    3. Returns grounded answer and source text chunks.
    """
    if not req.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Question string cannot be empty."
        )

    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY environment variable is not configured on the server."
        )

    try:
        chunks, ai_answer = run_rag_query(query=req.question, force_rebuild=req.force_rebuild)

        formatted_chunks = [
            RetrievedChunkResponse(
                content=doc.page_content,
                source=os.path.basename(doc.metadata.get("source", "unknown")),
                page=doc.metadata.get("page", None)
            )
            for doc in chunks
        ]

        return RAGQueryResponse(
            question=req.question,
            answer=ai_answer,
            retrieved_chunks=formatted_chunks,
            chunk_count=len(formatted_chunks)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG Execution Error: {str(e)}"
        )

@app.post("/api/v1/rag/index", response_model=IndexStatusResponse, tags=["RAG Engine"])
def reindex_knowledge_base():
    """
    Re-scans all PDF files inside `ai-service/documents/`, extracts text,
    splits into chunks, and rebuilds the persistent Chroma Vector Store.
    """
    try:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        docs_path = os.path.join(base_dir, "documents")

        raw_docs = load_pdf_documents(docs_path)
        chunks = split_documents(raw_docs, chunk_size=1000, chunk_overlap=200)

        get_or_create_vector_store(documents=chunks, force_rebuild=True)

        return IndexStatusResponse(
            status="success",
            message="Successfully re-indexed PDF knowledge base into Chroma Vector Store.",
            documents_found=len(raw_docs),
            chunks_indexed=len(chunks)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Indexing Error: {str(e)}"
        )

@app.post(
    "/api/v1/resume/analyze",
    response_model=ResumeAnalysisResponse,
    tags=["Resume Analysis"],
)
def analyze_resume_endpoint(req: ResumeAnalysisRequest):

    if not req.text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resume text cannot be empty.",
        )

    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY environment variable is not configured.",
        )

    try:
        return analyze_resume(
            resume_id=req.resume_id,
            resume_text=req.text,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        print(f"[ResumeAnalyzer] Error: {e}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resume analysis failed: {str(e)}",
        )

@app.post(
    "/api/v1/interview/question",
    response_model=InterviewQuestionResponse,
    tags=["Interview"],
)
def generate_interview_question_endpoint(
    req: InterviewQuestionRequest,
):
    """
    Generate the next adaptive technical interview question.

    Flow:
    1. Receives job description and candidate information.
    2. Retrieves relevant knowledge from Chroma.
    3. Sends context to Gemini.
    4. Generates and validates the next interview question.
    """

    if not req.job_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty.",
        )

    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY environment variable is not configured.",
        )

    try:
        return generate_next_question(req)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        print(f"[InterviewGenerator] Error: {e}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Interview question generation failed: {str(e)}",
        )

@app.post(
    "/api/v1/interview/start",
    response_model=InterviewStartResponse,
    tags=["Interview Session"],
)
def start_interview_endpoint(req: InterviewStartRequest):
    """
    Start a new interview session and generate the first question.
    """

    if not req.job_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty.",
        )

    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GEMINI_API_KEY environment variable is not configured.",
        )

    try:
        session = create_session(
            job_description=req.job_description,
            candidate_resume=req.candidate_resume or "",
        )

        question_request = InterviewQuestionRequest(
            session_id=session.session_id,
            job_description=req.job_description,
            candidate_resume=req.candidate_resume or "",
            previous_questions=[],
            last_candidate_answer="",
            question_number=1,
        )

        question = generate_next_question(question_request)

        add_question(
            session.session_id,
            question.question,
        )

        return InterviewStartResponse(
            session_id=session.session_id,
            question=question,
        )

    except Exception as e:
        print(f"[InterviewStart] Error: {e}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Interview start failed: {str(e)}",
        )


@app.post(
    "/api/v1/interview/answer",
    response_model=InterviewAnswerResponse,
    tags=["Interview Session"],
)
def answer_interview_endpoint(req: InterviewAnswerRequest):
    """
    Submit candidate answer and generate the next adaptive question.
    """

    if not req.answer.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Answer cannot be empty.",
        )

    try:
        session = get_session(req.session_id)

        if session is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview session not found.",
            )

        if session.status != "active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Interview session is not active.",
            )

        # Save candidate answer
        add_answer(
            req.session_id,
            req.answer,
        )

        # Generate next question
        previous_questions = session.questions

        last_answer = req.answer

        question_request = InterviewQuestionRequest(
            session_id=session.session_id,
            job_description=session.job_description,
            candidate_resume=session.candidate_resume,
            last_candidate_answer=last_answer,
            previous_questions=previous_questions,
            question_number=session.current_question_number,
        )

        question = generate_next_question(question_request)

        # Save generated question
        add_question(
            session.session_id,
            question.question,
        )

        return InterviewAnswerResponse(
            session_id=session.session_id,
            question=question,
        )

    except HTTPException:
        raise

    except Exception as e:
        print(f"[InterviewAnswer] Error: {e}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Interview answer processing failed: {str(e)}",
        )


@app.post(
    "/api/v1/interview/finish",
    response_model=InterviewFinishResponse,
    tags=["Interview Session"],
)
def finish_interview_endpoint(req: InterviewFinishRequest):
    """
    Finish an active interview session.
    """

    try:
        session = get_session(req.session_id)

        if session is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview session not found.",
            )

        if session.status == "completed":
            return InterviewFinishResponse(
                session_id=session.session_id,
                status=session.status,
                total_questions=len(session.questions),
            )

        finished_session = finish_session(req.session_id)

        return InterviewFinishResponse(
            session_id=finished_session.session_id,
            status=finished_session.status,
            total_questions=len(finished_session.questions),
        )

    except HTTPException:
        raise

    except Exception as e:
        print(f"[InterviewFinish] Error: {e}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Interview finish failed: {str(e)}",
        )

@app.post(
    "/api/v1/skill-gap/analyze",
    response_model=SkillGapResponse,
    tags=["Skill Gap Analysis"],
)
def analyze_skill_gap_endpoint(
    req: SkillGapRequest,
):
    """
    Compare a candidate resume with a target job description
    and identify job-specific skill gaps.
    """

    if not req.job_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job description cannot be empty.",
        )

    if not req.candidate_resume.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate resume cannot be empty.",
        )

    if not os.getenv("GEMINI_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "GEMINI_API_KEY environment variable "
                "is not configured."
            ),
        )

    try:
        return analyze_skill_gap(req)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    except Exception as e:
        print(f"[SkillGapAPI] Error: {e}")

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Skill gap analysis failed: {str(e)}",
        )

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )