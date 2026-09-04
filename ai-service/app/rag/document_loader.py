# app/rag/document_loader.py

import os
import re
from typing import List

from langchain_community.document_loaders import PyPDFDirectoryLoader

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    from langchain.text_splitter import RecursiveCharacterTextSplitter

try:
    from langchain_core.documents import Document
except ImportError:
    from langchain.schema import Document


# ============================================================
# Configuration
# ============================================================

DEFAULT_CHUNK_SIZE = 900
DEFAULT_CHUNK_OVERLAP = 150


# ============================================================
# PDF LOADING
# ============================================================

def load_pdf_documents(directory_path: str) -> List[Document]:
    """
    Load all PDF documents from a directory.

    Each PDF page is returned as a LangChain Document.
    Page/source metadata is preserved for RAG traceability.
    """

    if not os.path.exists(directory_path):
        os.makedirs(directory_path, exist_ok=True)

        print(
            f"[DocumentLoader] Directory created: "
            f"'{directory_path}'"
        )

        return []

    pdf_files = [
        file_name
        for file_name in os.listdir(directory_path)
        if file_name.lower().endswith(".pdf")
    ]

    if not pdf_files:
        print(
            f"[DocumentLoader] Warning: "
            f"No PDF files found in '{directory_path}'."
        )
        return []

    print(
        f"[DocumentLoader] Loading "
        f"{len(pdf_files)} PDF file(s)..."
    )

    loader = PyPDFDirectoryLoader(directory_path)

    documents = loader.load()

    print(
        f"[DocumentLoader] Successfully extracted "
        f"{len(documents)} page(s)."
    )

    # --------------------------------------------------------
    # Clean and normalize metadata
    # --------------------------------------------------------

    for document in documents:

        source = document.metadata.get("source", "unknown")

        # Get filename only
        document.metadata["source_file"] = os.path.basename(source)

        # PyPDF usually stores page as zero-based
        if "page" in document.metadata:
            document.metadata["page_number"] = (
                int(document.metadata["page"]) + 1
            )

        # Remove unnecessary metadata
        document.metadata.pop("total_pages", None)

    return documents


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(text: str) -> str:
    """
    Clean extracted PDF text before chunking.

    Removes unnecessary whitespace while preserving
    paragraph and line boundaries.
    """

    if not text:
        return ""

    # Normalize different newline styles
    text = text.replace("\r\n", "\n")
    text = text.replace("\r", "\n")

    # Remove excessive spaces/tabs
    text = re.sub(r"[ \t]+", " ", text)

    # Reduce excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Remove spaces around newlines
    text = re.sub(r" *\n *", "\n", text)

    return text.strip()


# ============================================================
# DOCUMENT CLEANING
# ============================================================

def clean_documents(documents: List[Document]) -> List[Document]:
    """
    Clean the text content of all loaded documents.
    """

    cleaned_documents = []

    for document in documents:

        cleaned_text = clean_text(document.page_content)

        if not cleaned_text:
            continue

        document.page_content = cleaned_text

        cleaned_documents.append(document)

    print(
        f"[DocumentLoader] Cleaned "
        f"{len(cleaned_documents)} document page(s)."
    )

    return cleaned_documents


# ============================================================
# CHUNKING
# ============================================================

def split_documents(
    documents: List[Document],
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[Document]:
    """
    Split documents into meaningful overlapping chunks.

    Strategy:
        1. Paragraph boundary
        2. Line boundary
        3. Sentence boundary
        4. Word boundary
        5. Character boundary

    Metadata is preserved and enhanced with a unique chunk ID.
    """

    if not documents:
        print("[DocumentLoader] No documents to split.")
        return []

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than 0")

    if chunk_overlap < 0:
        raise ValueError("chunk_overlap cannot be negative")

    if chunk_overlap >= chunk_size:
        raise ValueError(
            "chunk_overlap must be smaller than chunk_size"
        )

    print(
        f"[DocumentLoader] Chunking documents "
        f"(size={chunk_size}, overlap={chunk_overlap})..."
    )

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,

        # Prefer meaningful boundaries first
        separators=[
            "\n\n",      # Paragraph
            "\n",        # Line
            ". ",        # Sentence
            "? ",        # Question
            "! ",        # Exclamation
            "; ",        # Semicolon
            ", ",        # Comma
            " ",         # Word
            "",          # Character fallback
        ],

        length_function=len,
        is_separator_regex=False,
    )

    chunks = text_splitter.split_documents(documents)

    # --------------------------------------------------------
    # Add chunk metadata
    # --------------------------------------------------------

    for index, chunk in enumerate(chunks):

        source_file = chunk.metadata.get(
            "source_file",
            "unknown"
        )

        page_number = chunk.metadata.get(
            "page_number",
            0
        )

        chunk.metadata["chunk_id"] = (
            f"chunk_{index + 1}"
        )

        chunk.metadata["chunk_index"] = index

        chunk.metadata["source_file"] = source_file

        chunk.metadata["page_number"] = page_number

        chunk.metadata["chunk_size"] = len(
            chunk.page_content
        )

    print(
        f"[DocumentLoader] Created "
        f"{len(chunks)} chunks from "
        f"{len(documents)} pages."
    )

    return chunks


# ============================================================
# COMPLETE PIPELINE
# ============================================================

def load_and_split_documents(
    directory_path: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[Document]:
    """
    Complete document ingestion pipeline.

    PDF
      ↓
    Load pages
      ↓
    Clean text
      ↓
    Split into chunks
      ↓
    Add metadata
      ↓
    Return chunks
    """

    print("\n" + "=" * 60)
    print("[DocumentLoader] Starting document ingestion")
    print("=" * 60)

    # Step 1: Load PDFs
    documents = load_pdf_documents(directory_path)

    if not documents:
        return []

    # Step 2: Clean text
    documents = clean_documents(documents)

    if not documents:
        return []

    # Step 3: Split into chunks
    chunks = split_documents(
        documents,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    print("=" * 60)
    print(
        f"[DocumentLoader] Ingestion completed: "
        f"{len(chunks)} chunks"
    )
    print("=" * 60 + "\n")

    return chunks