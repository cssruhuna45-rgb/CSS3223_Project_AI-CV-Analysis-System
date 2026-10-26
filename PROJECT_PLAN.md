# 📅 AI Interview Platform — Development Project Plan

This document outlines the phased development roadmap for building the **AI Interview Platform**, and where each phase stands.

Legend: `[x]` done, `[~]` done in a different form from the original plan (the note says how), `[ ]` not done.

*Last updated: 2026-10-24.*

---

## 🚀 Development Phases

### Phase 1: Environment & Project Setup — done
- [x] Establish multi-tier repository directory structure (`frontend/`, `backend/`, `ai-service/`, `docs/`, `tests/`).
- [x] Configure system documentation (`README.md`, `ARCHITECTURE.md`, `PROJECT_PLAN.md`, `docs/API_SPECIFICATION.md`).
- [x] Define multi-container `docker-compose.yml` (PostgreSQL, Redis, Spring Boot, FastAPI, React).

### Phase 2: PostgreSQL Database & Spring Boot Core (`/backend`) — done
- [x] Initialize Spring Boot Maven project with dependencies (`spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `postgresql`), plus Spring Security with JWT.
- [~] Implement JPA Entities. Built: `User`, `Resume`, `ResumeAnalysis`, `JobPosting`, `InterviewSession`, `InterviewTurn`, `LearningRoadmap` and their child items. The planned `TranscriptEntry` is `InterviewTurn`; the planned `EvaluationReport` is stored on `InterviewSession`.
- [x] Database schema owned by Flyway migrations (V1–V8), with Hibernate set to validate only.
- [x] Build REST controllers for the candidate session workflow and recruiter management (38 endpoints, listed in `docs/API_SPECIFICATION.md`).
- [x] Recruiter accounts need administrator approval; recruiters see only the candidates who joined their own jobs by invite code.

### Phase 3: Python FastAPI AI Service & RAG Engine (`/ai-service`) — done
- [x] Initialize Python FastAPI service with `requirements.txt` (`fastapi`, `uvicorn`, `langchain`, `langchain-google-genai`, `chromadb`).
- [~] Implement LangChain RAG pipeline. Built over an interview knowledge base (`ai-service/documents/`) with local embeddings (all-MiniLM-L6-v2) rather than over the job description and resume, which are passed to the prompts directly.
- [x] Implement Gemini LLM prompt templates for CV analysis, skill gap, adaptive question generation and evaluation scoring, with a fallback chain across models.
- [x] Scores and verdicts are computed in Python; the model writes the words. Candidate answers are fenced against prompt injection.
- [x] Live interview sessions kept in Redis with an idle expiry, so a restart no longer loses an interview.
- [x] Learning roadmap and CV bullet tuner.

### Phase 4: React Frontend Portal (`/frontend`) — mostly done
- [x] Initialize React application baseline, with light and dark themes.
- [~] Build Candidate Interview View. Built: voice input (browser speech recognition), questions read aloud, timer in exam mode, practice and exam modes, live "AI is writing" indicator. **Not built:** an AI avatar and a code scratchpad; answers are typed or spoken into a text box.
- [x] Build Recruiter Scorecard Dashboard: job postings with invite codes, candidate list per job, category scores, print as PDF.
- [x] Candidate scorecard with category scores, model answers, learning roadmap and printable PDF.
- [x] Administrator panel for approving recruiters.

### Phase 5: End-to-End Integration & Testing (`/tests`) — partly done
- [x] Wire React Frontend -> Spring Boot Backend -> FastAPI AI Service -> Gemini API (the browser talks only to Spring; Spring calls the AI service with a shared internal key).
- [x] Automated tests: 86 backend (JUnit) and 48 AI service tests; `tests/verify-ai-security.sh` checks the gates on a running stack.
- [~] Proctoring. Webcam and face detection were left out on purpose (biometric data under the Personal Data Protection Act, and false flags from lighting or a shared room). Instead the exam records, per answer, how often the candidate left the page and how much they pasted, and the recruiter sees them as signals, never as a score.
- [ ] Browser-level end-to-end tests (no Playwright or Cypress suite yet).
- [ ] Continuous integration (no CI workflow yet).
- [ ] Evaluation of scoring against answers graded by human interviewers.
