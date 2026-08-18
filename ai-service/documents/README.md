# 📄 PDF Knowledge Base Directory

Place your sample PDF documents (e.g., job descriptions, candidate resumes, technical specs) inside this folder:

`ai-service/documents/`

Examples:
- `sample_job_description.pdf`
- `candidate_resume.pdf`

The RAG Document Loader (`app/rag/document_loader.py`) automatically scans this directory and extracts PDF text for chunking and embedding in the Chroma Vector DB.
