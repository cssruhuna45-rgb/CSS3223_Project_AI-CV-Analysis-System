# 📅 AI Interview Platform — Development Project Plan

This document outlines the phased development roadmap for building the **AI Interview Platform**.

---

## 🚀 Development Phases

### Phase 1: Environment & Project Setup (Current)
- [x] Establish multi-tier repository directory structure (`frontend/`, `backend/`, `ai-service/`, `docs/`, `tests/`).
- [x] Configure system documentation (`README.md`, `ARCHITECTURE.md`, `PROJECT_PLAN.md`).
- [x] Define multi-container `docker-compose.yml` (PostgreSQL, Spring Boot, FastAPI).

### Phase 2: PostgreSQL Database & Spring Boot Core (`/backend`)
- [ ] Initialize Spring Boot Maven project with dependencies (`spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `postgresql`).
- [ ] Implement JPA Entities (`User`, `JobPosting`, `InterviewSession`, `TranscriptEntry`, `EvaluationReport`).
- [ ] Build REST controllers for candidate session workflow and recruiter management.

### Phase 3: Python FastAPI AI Service & RAG Engine (`/ai-service`)
- [ ] Initialize Python FastAPI service with `requirements.txt` (`fastapi`, `uvicorn`, `langchain`, `langchain-google-genai`, `chromadb`).
- [ ] Implement LangChain RAG pipeline for job description & resume vector indexing.
- [ ] Implement Gemini LLM prompt templates for interviewing, follow-up generation, and evaluation scoring.

### Phase 4: React Frontend Portal (`/frontend`)
- [ ] Initialize React application baseline.
- [ ] Build Candidate Interview View (Voice input, AI avatar indicator, timer, question prompt, code scratchpad).
- [ ] Build Recruiter Scorecard Dashboard.

### Phase 5: End-to-End Integration & Testing (`/tests`)
- [ ] Wire React Frontend -> Spring Boot Backend -> FastAPI AI Service -> Gemini API.
- [ ] Perform full system integration testing and proctoring guardrail verification.
