# 🧠 AI Service — Minimal RAG Prototype Specification & Guide

This directory contains the standalone **Python FastAPI RAG Service** for the **AI Interview Platform**. It implements a complete Retrieval-Augmented Generation (RAG) pipeline using **LangChain**, **PyPDF**, **Chroma Vector DB**, and **Google Gemini API**.

---

## 🛠️ 1. File & Directory Breakdown

```
ai-service/
│
├── app/
│   ├── __init__.py            # Package marker for Python app module
│   ├── main.py                # FastAPI web server entrypoint & REST endpoints (/health, /api/v1/rag/query, /api/v1/rag/index)
│   │
│   └── rag/
│       ├── __init__.py        # Package marker for RAG module
│       ├── document_loader.py # Loads PDFs from documents/ via PyPDFLoader and chunks text with RecursiveCharacterTextSplitter
│       ├── embeddings.py      # Instantiates GoogleGenerativeAIEmbeddings using GEMINI_API_KEY
│       ├── vector_store.py    # Manages local persistent Chroma DB vector store and rebuild logic
│       ├── retriever.py       # Configures top-3 similarity search retriever
│       └── pipeline.py        # Assembles LangChain RAG pipeline with grounded prompt template & CLI test runner
│
├── documents/
│   └── README.md              # Folder where PDF documents (job descriptions, candidate resumes) are placed
│
├── tests/
│   └── test_rag.py            # Unit test suite verifying RAG pipeline components
│
├── requirements.txt           # Python package dependencies
├── .env.example               # Template for environment variables (GEMINI_API_KEY)
└── README.md                  # Detailed execution guide (this file)
```

---

## 💡 2. RAG Flow in Simple Terms

1. **PDF Ingestion & Text Extraction (`document_loader.py`)**: PyPDF reads PDF files from `ai-service/documents/` page by page.
2. **Text Chunking (`document_loader.py`)**: Large pages are split into manageable chunks of 1,000 characters with 200 character overlap so context isn't lost across boundaries.
3. **Embedding Generation (`embeddings.py`)**: Each chunk is passed to Gemini Embeddings (`models/embedding-001`) which converts text into numerical vector arrays representing semantic meaning.
4. **Vector Store Persistence (`vector_store.py`)**: The vectors and text chunks are saved into a local **Chroma DB** database on disk.
5. **Similarity Retrieval (`retriever.py`)**: When a question is asked, Chroma compares the question vector to all chunk vectors and retrieves the **top 3 most relevant text chunks**.
6. **Grounded LLM Answer (`pipeline.py`)**: LangChain passes the 3 retrieved chunks as context alongside the question to **Gemini API**. Gemini generates a grounded response **ONLY** using that context. If the answer isn't in the context, it responds: *"The requested information is not available in the knowledge base."*

---

## 💻 3. Step-by-Step Environment Setup & Execution

### Step 3.1: Create & Activate Virtual Environment

Open your terminal in the `ai-service` directory:

```bash
# Navigate to ai-service directory
cd ai-service

# Create virtual environment (Windows)
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Or Windows Command Prompt (cmd)
.\venv\Scripts\activate.bat

# Linux / macOS
source venv/bin/activate
```

---

### Step 3.2: Install Dependencies

With the virtual environment activated, install all required dependencies:

```bash
pip install -r requirements.txt
```

---

### Step 3.3: Configure `GEMINI_API_KEY`

1. Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```
2. Open `.env` and add your real Google Gemini API Key:
```env
GEMINI_API_KEY=AIzaSyYourActualGeminiApiKeyHere
```
*(Get a free API key at: https://aistudio.google.com/)*

---

### Step 3.4: Place Your PDF Documents

Place one or more PDF files (e.g. sample job description or resume) inside the `documents/` folder:

```
ai-service/documents/sample_job_description.pdf
```

---

### Step 3.5: Run the Interactive RAG CLI Test

Run the RAG pipeline CLI runner directly from `ai-service/`:

```bash
python -m app.rag.pipeline
```

#### What Successful Output Looks Like:

```text
============================================================
🤖 AI Interview Platform — RAG Pipeline CLI Test
============================================================

Enter your question: What are the primary technical requirements for this role?

Processing RAG pipeline...
[DocumentLoader] Loading 1 PDF file(s) from '...\ai-service\documents'...
[DocumentLoader] Successfully extracted 3 document page(s).
[DocumentLoader] Split 3 page(s) into 8 text chunk(s) (size=1000, overlap=200).
[Embeddings] Initializing GoogleGenerativeAIEmbeddings (models/embedding-001)...
[VectorStore] Creating new Chroma vector store with 8 document chunk(s)...
[VectorStore] Successfully persisted Chroma vector store at '...\ai-service\chroma_db'.
[Retriever] Performing similarity search for query: 'What are the primary technical requirements for this role?'...
[Retriever] Retrieved 3 relevant chunk(s).

============================================================
📌 Retrieved Context (Top 3 Chunks):
============================================================

--- Chunk #1 [Source: sample_job_description.pdf, Page: 1] ---
Key Technical Requirements: - 5+ years experience with Java, Spring Boot, and PostgreSQL...

--- Chunk #2 [Source: sample_job_description.pdf, Page: 1] ---
System Architecture: Microservices, REST APIs, Docker, and Kubernetes deployment experience...

--- Chunk #3 [Source: sample_job_description.pdf, Page: 2] ---
Preferred Skills: Python, FastAPI, LangChain, and AI LLM integrations...

============================================================
💡 AI Answer:
============================================================
Based on the provided context, the primary technical requirements for this role are:
1. 5+ years of experience with Java, Spring Boot, and PostgreSQL.
2. Experience with microservices architecture, REST APIs, Docker, and Kubernetes.
3. Preferred experience in Python, FastAPI, LangChain, and AI LLM integrations.
============================================================
```

---

### Step 3.6: Run FastAPI Server (Optional API Endpoint Verification)

To start the HTTP REST API server:

```bash
uvicorn app.main:app --reload --port 8000
```

Access Swagger Interactive API Docs at: `http://localhost:8000/docs`
