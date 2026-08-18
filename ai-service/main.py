# Python FastAPI AI Service — LangChain & RAG Pipeline Entrypoint
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="AI Interview Platform — RAG & AI Service",
    description="Python FastAPI AI Engine utilizing LangChain, Gemini API, RAG Pipeline, and Vector DB (Chroma/FAISS)",
    version="1.0.0"
)

class QuestionRequest(BaseModel):
    sessionId: str
    jobDescription: str
    candidateResume: Optional[str] = ""
    lastCandidateAnswer: Optional[str] = ""

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "FastAPI AI RAG Engine",
        "geminiKeyConfigured": bool(os.getenv("GEMINI_API_KEY"))
    }

@app.post("/api/v1/generate-next-question")
def generate_next_question(req: QuestionRequest):
    # Baseline RAG pipeline placeholder - will connect LangChain + Chroma + Gemini API
    return {
        "sessionId": req.sessionId,
        "question": {
            "speech_text": "How do you manage database connection pooling under high write concurrency?",
            "display_question": "### System Design Question\n\nHow do you manage **database connection pooling** under high write concurrency?",
            "category": "System Design",
            "is_follow_up": False
        }
    }
