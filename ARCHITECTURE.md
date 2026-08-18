# 🏛️ AI Interview Platform — System Architecture & Design Specification

This document details the multi-tier microservices architecture of the **AI-Powered Candidate Interview Platform**.

---

## 📡 High-Level Architecture Diagram

```
                     ┌──────────────────────────┐
                     │     React Frontend       │
                     │  (Candidate & Recruiter) │
                     └────────────┬─────────────┘
                                  │  REST / WebSocket
                                  ▼
                     ┌──────────────────────────┐
                     │   Spring Boot Backend    │
                     │  (Core Business & Auth)  │
                     └──────┬────────────┬──────┘
                            │            │
             PostgreSQL DDL │            │ REST API
                            ▼            ▼
               ┌──────────────┐   ┌──────────────────────────┐
               │ PostgreSQL   │   │  Python FastAPI AI Svc   │
               │ Relational DB│   │  (LangChain + RAG Engine)│
               └──────────────┘   └───────────┬──────────────┘
                                              │
                                              ├──────────────► Vector DB (Chroma / FAISS)
                                              │
                                              └──────────────► Google Gemini API
```

---

## 🧩 Component Responsibilities

### 1. React Frontend (`/frontend`)
- **Technology**: React, Tailwind CSS / Vanilla CSS3, Web Speech API (STT / TTS).
- **Function**:
  - Provides the candidate live interview interface (Voice input, live speech waveform visualizer, countdown timer, code scratchpad).
  - Provides the recruiter management dashboard (Job posting configuration, candidate scorecards, evaluation reports).

### 2. Spring Boot Backend (`/backend`)
- **Technology**: Java 17+, Spring Boot 3, Spring Data JPA, Spring Security.
- **Function**:
  - Main business domain orchestrator.
  - Manages User authentication, Job Postings, Candidate applications, Interview Sessions, and Proctoring logs.
  - Interfaces with PostgreSQL for relational storage.
  - Delegates AI processing to the Python FastAPI AI Service.

### 3. PostgreSQL Database (`PostgreSQL`)
- **Function**: Main persistent database storing Users, Roles, Job Descriptions, Session Metadata, Transcripts, Proctoring Violations, and Scorecards.

### 4. Python FastAPI AI Service (`/ai-service`)
- **Technology**: Python 3.11, FastAPI, LangChain, Google Gemini API (`langchain-google-genai`), Chroma / FAISS.
- **Function**:
  - **RAG Pipeline**: Ingests job descriptions and candidate resumes; indexes chunks into Chroma / FAISS vector store using Gemini Embeddings.
  - **Dynamic Interviewer Agent**: Retrieves relevant context and generates tailored technical / behavioral questions.
  - **Adaptive Follow-Up Engine**: Analyzes candidate answers and generates follow-up probing questions.
  - **Scoring & Feedback Processor**: Computes structured 4-axis candidate evaluation scores using LangChain output parsers.

---

## 🔄 Sequence Flow: Candidate Interview Turn

1. **Candidate Action**: Candidate submits spoken/written answer via React Frontend.
2. **Spring Boot Handshake**: React sends response payload to Spring Boot (`POST /api/interviews/{sessionId}/respond`).
3. **Persist Response**: Spring Boot saves transcript turn in PostgreSQL.
4. **AI Delegation**: Spring Boot invokes Python FastAPI AI Service (`POST /api/v1/generate-next-question`).
5. **RAG Context Retrieval**: FastAPI AI Service performs similarity search in Chroma / FAISS for job requirements & resume context.
6. **Gemini LLM Generation**: LangChain invokes Gemini API with retrieved context & turn history.
7. **Response Propagation**: Python FastAPI returns next question JSON to Spring Boot -> Spring Boot updates DB -> Spring Boot returns question to React Frontend.
