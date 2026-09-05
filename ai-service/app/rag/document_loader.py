# app/rag/document_loader.py

import os
import re
from functools import lru_cache
from typing import List, Dict, Any

from langchain_community.document_loaders import (
    PyPDFDirectoryLoader,
    DirectoryLoader,
    TextLoader,
)

try:
    from langchain_text_splitters import (
        RecursiveCharacterTextSplitter,
        MarkdownHeaderTextSplitter,
    )
except ImportError:
    from langchain.text_splitter import (
        RecursiveCharacterTextSplitter,
        MarkdownHeaderTextSplitter,
    )

try:
    from langchain_core.documents import Document
except ImportError:
    from langchain.schema import Document


# ============================================================
# Configuration
# ============================================================

# TOKEN counts, not character counts, measured with the tokenizer of the
# embedding model itself - see _build_token_splitter for why that matters.
#
# all-MiniLM-L6-v2 truncates its input at 256 tokens and silently drops
# the rest, so anything past that is embedded as if it were not there.
# 220 leaves headroom for the header text that MarkdownHeaderTextSplitter
# keeps at the top of each section.
EMBEDDING_TOKENIZER_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_MAX_TOKENS = 256

DEFAULT_CHUNK_SIZE_TOKENS = 220
DEFAULT_CHUNK_OVERLAP_TOKENS = 40

# Headers to split markdown files on. Add more levels (####, #####)
# if your interview guides use deeper nesting.
MARKDOWN_HEADERS_TO_SPLIT_ON = [
    ("#", "header_1"),
    ("##", "header_2"),
    ("###", "header_3"),
]


# ============================================================
# METADATA HELPERS
# ============================================================

def parse_frontmatter(text: str) -> Dict[str, Any]:
    """
    Extract simple YAML frontmatter from Markdown files.

    Example:

    ---
    job_field: devops_cloud
    job_field_name: DevOps / Cloud Engineering
    topic: kubernetes
    difficulty:
      - easy
      - medium
      - hard
    ---
    """

    metadata = {}

    if not text.startswith("---"):
        return metadata

    parts = text.split("---", 2)

    if len(parts) < 3:
        return metadata

    frontmatter = parts[1].strip()

    current_list_key = None

    for line in frontmatter.splitlines():

        line = line.rstrip()

        if not line.strip():
            continue

        # List item
        if line.strip().startswith("- ") and current_list_key:
            value = line.strip()[2:].strip()

            if current_list_key not in metadata:
                metadata[current_list_key] = []

            metadata[current_list_key].append(value)
            continue

        current_list_key = None

        if ":" not in line:
            continue

        key, value = line.split(":", 1)

        key = key.strip()
        value = value.strip()

        if not value:
            metadata[key] = []
            current_list_key = key
            continue

        # Remove surrounding quotes
        value = value.strip("\"'")

        # Inline list:
        # keywords: [docker, kubernetes, aws]
        if value.startswith("[") and value.endswith("]"):
            value = value[1:-1]

            metadata[key] = [
                item.strip().strip("\"'")
                for item in value.split(",")
                if item.strip()
            ]
        else:
            metadata[key] = value

    return metadata


def detect_job_field_from_filename(filename: str) -> str:
    """
    Try to detect job field from Markdown filename.

    Example:
        devops_cloud_interview_guide.md
        -> devops_cloud
    """

    name = os.path.splitext(filename)[0].lower()

    name = re.sub(
        r"_interview_guide$",
        "",
        name
    )

    return name


# ============================================================
# MARKDOWN LOADING
# ============================================================

def load_markdown_documents(directory_path: str) -> List[Document]:
    """
    Load all Markdown documents recursively.

    Markdown files are loaded as LangChain Documents.

    YAML frontmatter metadata is extracted and attached
    to each Document.
    """

    if not os.path.exists(directory_path):
        return []

    markdown_files = []

    for root, _, files in os.walk(directory_path):

        for file_name in files:

            if file_name.lower().endswith((".md", ".markdown")):

                markdown_files.append(
                    os.path.join(root, file_name)
                )

    if not markdown_files:
        print(
            f"[DocumentLoader] No Markdown files found "
            f"in '{directory_path}'."
        )

        return []

    print(
        f"[DocumentLoader] Loading "
        f"{len(markdown_files)} Markdown file(s)..."
    )

    documents = []

    for file_path in markdown_files:

        try:

            loader = TextLoader(
                file_path,
                encoding="utf-8",
            )

            loaded_documents = loader.load()

            for document in loaded_documents:

                source_file = os.path.basename(file_path)

                document.metadata["source_file"] = source_file

                document.metadata["file_type"] = "markdown"

                # --------------------------------------------
                # Extract frontmatter
                # --------------------------------------------

                frontmatter = parse_frontmatter(
                    document.page_content
                )

                for key, value in frontmatter.items():

                    # Chroma metadata should preferably contain
                    # primitive values rather than Python lists.

                    if isinstance(value, list):

                        document.metadata[key] = ", ".join(
                            str(item)
                            for item in value
                        )

                    else:

                        document.metadata[key] = value

                # --------------------------------------------
                # Detect job field if not present
                # --------------------------------------------

                if not document.metadata.get("job_field"):

                    document.metadata["job_field"] = (
                        detect_job_field_from_filename(
                            source_file
                        )
                    )

                documents.append(document)

                print(
                    f"[DocumentLoader] Loaded Markdown: "
                    f"{source_file}"
                )

        except Exception as error:

            print(
                f"[DocumentLoader] Failed to load "
                f"'{file_path}': {error}"
            )

    print(
        f"[DocumentLoader] Successfully loaded "
        f"{len(documents)} Markdown document(s)."
    )

    return documents


# ============================================================
# PDF LOADING
# ============================================================

def load_pdf_documents(directory_path: str) -> List[Document]:
    """
    Load all PDF documents from a directory recursively.

    Each PDF page is returned as a LangChain Document.
    Page/source metadata is preserved.
    """

    if not os.path.exists(directory_path):
        os.makedirs(
            directory_path,
            exist_ok=True
        )

        print(
            f"[DocumentLoader] Directory created: "
            f"'{directory_path}'"
        )

        return []

    pdf_files = []

    for root, _, files in os.walk(directory_path):

        for file_name in files:

            if file_name.lower().endswith(".pdf"):

                pdf_files.append(
                    os.path.join(root, file_name)
                )

    if not pdf_files:

        print(
            f"[DocumentLoader] No PDF files found "
            f"in '{directory_path}'."
        )

        return []

    print(
        f"[DocumentLoader] Loading "
        f"{len(pdf_files)} PDF file(s)..."
    )

    loader = PyPDFDirectoryLoader(
        directory_path
    )

    documents = loader.load()

    print(
        f"[DocumentLoader] Successfully extracted "
        f"{len(documents)} PDF page(s)."
    )

    # --------------------------------------------------------
    # Clean and normalize metadata
    # --------------------------------------------------------

    for document in documents:

        source = document.metadata.get(
            "source",
            "unknown"
        )

        document.metadata["source_file"] = (
            os.path.basename(source)
        )

        document.metadata["file_type"] = "pdf"

        # PyPDF normally stores page as zero-based

        if "page" in document.metadata:

            try:

                document.metadata["page_number"] = (
                    int(document.metadata["page"]) + 1
                )

            except (ValueError, TypeError):

                document.metadata["page_number"] = 0

        else:

            document.metadata["page_number"] = 0

        document.metadata.pop(
            "total_pages",
            None
        )

    return documents


# ============================================================
# LOAD ALL DOCUMENT TYPES
# ============================================================

def load_all_documents(directory_path: str) -> List[Document]:
    """
    Load both PDF and Markdown documents.

    Supported:
        .pdf
        .md
        .markdown
    """

    print(
        "\n[DocumentLoader] Scanning document directory:"
    )

    print(
        f"    {directory_path}"
    )

    pdf_documents = load_pdf_documents(
        directory_path
    )

    markdown_documents = load_markdown_documents(
        directory_path
    )

    documents = (
        pdf_documents +
        markdown_documents
    )

    print(
        "\n[DocumentLoader] Total documents loaded: "
        f"{len(documents)}"
    )

    print(
        f"    PDF pages     : {len(pdf_documents)}"
    )

    print(
        f"    Markdown docs : {len(markdown_documents)}"
    )

    return documents


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(text: str) -> str:
    """
    Clean document text before chunking.
    """

    if not text:
        return ""

    # Normalize newline styles

    text = text.replace(
        "\r\n",
        "\n"
    )

    text = text.replace(
        "\r",
        "\n"
    )

    # Remove YAML frontmatter from actual content.
    # Metadata has already been extracted.

    if text.startswith("---"):

        parts = text.split(
            "---",
            2
        )

        if len(parts) == 3:

            text = parts[2]

    # Normalize spaces/tabs

    text = re.sub(
        r"[ \t]+",
        " ",
        text
    )

    # Reduce excessive blank lines

    text = re.sub(
        r"\n{3,}",
        "\n\n",
        text
    )

    # Remove spaces around newlines

    text = re.sub(
        r" *\n *",
        "\n",
        text
    )

    return text.strip()


# ============================================================
# DOCUMENT CLEANING
# ============================================================

def clean_documents(
    documents: List[Document]
) -> List[Document]:
    """
    Clean the text content of all documents.
    """

    cleaned_documents = []

    for document in documents:

        cleaned_text = clean_text(
            document.page_content
        )

        if not cleaned_text:
            continue

        document.page_content = cleaned_text

        cleaned_documents.append(
            document
        )

    print(
        f"[DocumentLoader] Cleaned "
        f"{len(cleaned_documents)} document(s)."
    )

    return cleaned_documents


# ============================================================
# CHUNKING (token-based + markdown header-aware)
# ============================================================
#
# Strategy:
#   1. Token-aware sizing (tiktoken) — matches what your embedding
#      model / LLM actually "sees", instead of raw character counts.
#   2. Markdown files: split by header (#, ##, ###) FIRST, so a
#      chunk never mixes content from two different sections, THEN
#      token-split any section that's still too long.
#   3. PDFs: token-based RecursiveCharacterTextSplitter directly
#      (no headers to split on, so this is the correct fallback).

# Preferred break points, in order: paragraph, line, sentence, clause,
# word. The empty string is the last resort - split mid-word rather than
# run over the size limit.
_SEPARATORS = [
    "\n\n",
    "\n",
    ". ",
    "? ",
    "! ",
    "; ",
    ", ",
    " ",
    "",
]


@lru_cache(maxsize=1)
def _get_embedding_tokenizer():
    """
    The tokenizer all-MiniLM-L6-v2 actually uses.

    Loaded once: it is only vocabulary files, not the model weights.
    """

    from transformers import AutoTokenizer

    return AutoTokenizer.from_pretrained(EMBEDDING_TOKENIZER_MODEL)


def _build_token_splitter(
    chunk_size: int,
    chunk_overlap: int,
) -> RecursiveCharacterTextSplitter:
    """
    Splits by TOKEN count rather than character count, using the
    embedding model's own tokenizer.

    This previously counted with tiktoken's cl100k_base, which is
    OpenAI's tokenizer - not the one used anywhere in this project. Its
    counts run about 8% lower than MiniLM's wordpiece tokenizer, so
    chunks sized to 220 "tokens" reached up to 261 real ones and had
    their tails cut off before being embedded. Measuring with the
    tokenizer that does the truncating removes the discrepancy.

    Falls back to tiktoken if transformers is unavailable, so chunking
    still works rather than failing outright.
    """

    try:
        return RecursiveCharacterTextSplitter.from_huggingface_tokenizer(
            tokenizer=_get_embedding_tokenizer(),
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=_SEPARATORS,
        )

    except Exception as exc:

        print(
            "[DocumentLoader] Could not load the embedding tokenizer "
            f"({exc}); falling back to tiktoken, whose counts run "
            "slightly low for this model."
        )

        return RecursiveCharacterTextSplitter.from_tiktoken_encoder(
            encoding_name="cl100k_base",
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=_SEPARATORS,
        )


def split_markdown_documents(
    documents: List[Document],
    chunk_size: int = DEFAULT_CHUNK_SIZE_TOKENS,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP_TOKENS,
) -> List[Document]:
    """
    Two-stage split for markdown documents:

        Stage 1: split by header (#, ##, ###)
                 -> keeps each section's own header(s) as metadata
                 -> guarantees a chunk never spans two sections

        Stage 2: token-based RecursiveCharacterTextSplitter
                 -> further splits any section that's still too
                    long, without breaking mid-sentence if avoidable
    """

    header_splitter = MarkdownHeaderTextSplitter(
        headers_to_split_on=MARKDOWN_HEADERS_TO_SPLIT_ON,
        strip_headers=False,  # keep header text inside the chunk content
    )

    token_splitter = _build_token_splitter(chunk_size, chunk_overlap)

    all_chunks: List[Document] = []

    for document in documents:

        # Stage 1: split on headers. Returns Documents whose metadata
        # includes header_1/header_2/header_3 (whichever headers
        # actually preceded that section).
        header_sections = header_splitter.split_text(
            document.page_content
        )

        for section in header_sections:

            # carry over the ORIGINAL document's metadata
            # (source_file, job_field, topic, difficulty, ...)
            merged_metadata = dict(document.metadata)
            merged_metadata.update(section.metadata)
            section.metadata = merged_metadata

        # Stage 2: token-size any sections that are still too big
        sized_chunks = token_splitter.split_documents(header_sections)

        all_chunks.extend(sized_chunks)

    return all_chunks


def split_pdf_documents(
    documents: List[Document],
    chunk_size: int = DEFAULT_CHUNK_SIZE_TOKENS,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP_TOKENS,
) -> List[Document]:
    """
    Token-based splitting for PDF documents (no headers to rely on).
    """

    token_splitter = _build_token_splitter(chunk_size, chunk_overlap)

    return token_splitter.split_documents(documents)


def split_documents(
    documents: List[Document],
    chunk_size: int = DEFAULT_CHUNK_SIZE_TOKENS,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP_TOKENS,
) -> List[Document]:
    """
    Split documents into meaningful, overlapping, token-sized chunks.

    Routes documents by file_type:
        - "markdown" -> header-aware + token-based splitting
        - "pdf" / anything else -> token-based splitting only

    Metadata is preserved and enhanced with:
        chunk_id
        chunk_index
        source_file
        job_field
        topic
        difficulty
        header_1 / header_2 / header_3 (markdown only, when present)
    """

    if not documents:

        print(
            "[DocumentLoader] No documents to split."
        )

        return []

    if chunk_size <= 0:

        raise ValueError(
            "chunk_size must be greater than 0"
        )

    if chunk_overlap < 0:

        raise ValueError(
            "chunk_overlap cannot be negative"
        )

    if chunk_overlap >= chunk_size:

        raise ValueError(
            "chunk_overlap must be smaller than chunk_size"
        )

    print(
        f"[DocumentLoader] Chunking documents "
        f"(token_size={chunk_size}, "
        f"token_overlap={chunk_overlap})..."
    )

    markdown_docs = [
        d for d in documents if d.metadata.get("file_type") == "markdown"
    ]

    pdf_docs = [
        d for d in documents if d.metadata.get("file_type") != "markdown"
    ]

    chunks: List[Document] = []

    if markdown_docs:

        chunks.extend(
            split_markdown_documents(
                markdown_docs,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
            )
        )

    if pdf_docs:

        chunks.extend(
            split_pdf_documents(
                pdf_docs,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
            )
        )

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

        job_field = chunk.metadata.get(
            "job_field",
            "unknown"
        )

        topic = chunk.metadata.get(
            "topic",
            "general"
        )

        difficulty = chunk.metadata.get(
            "difficulty",
            "unknown"
        )

        chunk.metadata["chunk_id"] = (
            f"chunk_{index + 1}"
        )

        chunk.metadata["chunk_index"] = index

        chunk.metadata["source_file"] = (
            source_file
        )

        chunk.metadata["page_number"] = (
            page_number
        )

        chunk.metadata["job_field"] = (
            str(job_field)
        )

        chunk.metadata["topic"] = (
            str(topic)
        )

        chunk.metadata["difficulty"] = (
            str(difficulty)
        )

        chunk.metadata["chunk_size"] = (
            len(chunk.page_content)
        )

    print(
        f"[DocumentLoader] Created "
        f"{len(chunks)} chunks from "
        f"{len(documents)} document(s)."
    )

    return chunks


# ============================================================
# COMPLETE PIPELINE
# ============================================================

def load_and_split_documents(
    directory_path: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE_TOKENS,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP_TOKENS,
) -> List[Document]:
    """
    Complete document ingestion pipeline.

    PDF / Markdown
          ↓
    Load documents
          ↓
    Extract metadata
          ↓
    Clean text
          ↓
    Split into chunks (token-based, markdown header-aware)
          ↓
    Add chunk metadata
          ↓
    Return chunks
    """

    print(
        "\n" + "=" * 60
    )

    print(
        "[DocumentLoader] Starting document ingestion"
    )

    print(
        "=" * 60
    )

    # --------------------------------------------------------
    # Step 1: Load PDFs + Markdown
    # --------------------------------------------------------

    documents = load_all_documents(
        directory_path
    )

    if not documents:

        print(
            "[DocumentLoader] No supported documents found."
        )

        return []

    # --------------------------------------------------------
    # Step 2: Clean
    # --------------------------------------------------------

    documents = clean_documents(
        documents
    )

    if not documents:

        print(
            "[DocumentLoader] No documents "
            "remaining after cleaning."
        )

        return []

    # --------------------------------------------------------
    # Step 3: Split
    # --------------------------------------------------------

    chunks = split_documents(
        documents,
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
    )

    print(
        "=" * 60
    )

    print(
        f"[DocumentLoader] Ingestion completed: "
        f"{len(chunks)} chunks"
    )

    print(
        "=" * 60 + "\n"
    )

    return chunks