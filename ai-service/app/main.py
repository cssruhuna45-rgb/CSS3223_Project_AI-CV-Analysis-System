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

from app.resume.schemas import (
    ResumeAnalysisRequest,
    ResumeAnalysisResponse,
)

from app.resume.analyzer import analyze_resume

from app.interview.schemas import (
    InterviewQuestionRequest,
    InterviewQuestionResponse,
)

from app.interview.question_generator import generate_next_question

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





if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )