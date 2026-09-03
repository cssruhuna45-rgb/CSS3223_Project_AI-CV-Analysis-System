# app/rag/pipeline.py

import os
import sys

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

try:
    from langchain_core.prompts import PromptTemplate
    from langchain_core.runnables import RunnablePassthrough
    from langchain_core.output_parsers import StrOutputParser
except ImportError:
    from langchain.prompts import PromptTemplate
    from langchain.schema.runnable import RunnablePassthrough
    from langchain.schema.output_parser import StrOutputParser

from app.rag.document_loader import (
    load_pdf_documents,
    split_documents
)

from app.rag.vector_store import (
    get_or_create_vector_store
)

from app.rag.retriever import (
    get_similarity_retriever,
    retrieve_relevant_chunks
)


# =========================================================
# Environment
# =========================================================

load_dotenv()


# =========================================================
# Configuration
# =========================================================

DEFAULT_LLM_MODEL = "gemini-flash-lite-latest"

DEFAULT_TEMPERATURE = 0.4

DEFAULT_TOP_K = 5

DEFAULT_CHUNK_SIZE = 1000

DEFAULT_CHUNK_OVERLAP = 200


# =========================================================
# RAG Prompt
# =========================================================

PROMPT_TEMPLATE = """
You are an objective AI Interview and Knowledge Assistant.

Your task is to answer the user's question using ONLY the
information provided in the context.

IMPORTANT RULES:

1. Use only the provided context.
2. Do not use outside knowledge.
3. Do not invent or assume information.
4. If the context does not contain enough information to
   answer the question, clearly state:

"The requested information is not available in the knowledge base."

5. Keep the answer concise but technically accurate.
6. When explaining technical concepts, organize the answer
   clearly using short paragraphs or bullet points.

Context:
{context}

Question:
{question}

Answer:
"""


# =========================================================
# Build RAG Chain
# =========================================================

def build_rag_chain(
    vector_store,
    model_name: str = DEFAULT_LLM_MODEL,
    temperature: float = DEFAULT_TEMPERATURE,
    k: int = DEFAULT_TOP_K
):
    """
    Builds the complete RAG chain.

    Architecture:

        User Question
              ↓
          Retriever
              ↓
           ChromaDB
              ↓
       Relevant Chunks
              ↓
          Prompt
              ↓
         Gemini LLM
              ↓
            Answer
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is not set."
        )

    print("\n========== RAG CHAIN ==========")

    print(
        f"[RAG] LLM model: {model_name}"
    )

    print(
        f"[RAG] Temperature: {temperature}"
    )

    print(
        f"[RAG] Top K: {k}"
    )

    # -----------------------------------------------------
    # Gemini LLM
    # -----------------------------------------------------

    llm = ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=temperature
    )

    # -----------------------------------------------------
    # Prompt
    # -----------------------------------------------------

    prompt = PromptTemplate(
        template=PROMPT_TEMPLATE,
        input_variables=[
            "context",
            "question"
        ]
    )

    # -----------------------------------------------------
    # Retriever
    # -----------------------------------------------------

    retriever = get_similarity_retriever(
        vector_store,
        k=k
    )

    # -----------------------------------------------------
    # Format retrieved documents
    # -----------------------------------------------------

    def format_docs(docs):

        if not docs:
            return (
                "No relevant information was retrieved "
                "from the knowledge base."
            )

        return "\n\n---\n\n".join(
            doc.page_content
            for doc in docs
        )

    # -----------------------------------------------------
    # RAG Chain
    # -----------------------------------------------------

    rag_chain = (
        {
            "context": retriever | format_docs,
            "question": RunnablePassthrough()
        }
        | prompt
        | llm
        | StrOutputParser()
    )

    print("[RAG] RAG chain created successfully.")
    print("================================\n")

    return rag_chain


# =========================================================
# Run RAG Query
# =========================================================

def run_rag_query(
    query: str,
    documents_dir: str = "documents",
    force_rebuild: bool = False
):
    """
    Executes the complete RAG pipeline.

    Steps:

    1. Load PDF documents
    2. Split documents into chunks
    3. Create/load ChromaDB
    4. Retrieve relevant chunks
    5. Send context + question to Gemini
    6. Return retrieved chunks and AI answer
    """

    if not query or not query.strip():
        raise ValueError(
            "Query cannot be empty."
        )

    print("\n" + "=" * 60)
    print("[RAG PIPELINE] Starting RAG query")
    print("=" * 60)

    # -----------------------------------------------------
    # Project root
    # -----------------------------------------------------

    base_dir = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "..",
            ".."
        )
    )

    docs_path = os.path.join(
        base_dir,
        documents_dir
    )

    print(
        f"[RAG] Documents directory: {docs_path}"
    )

    # -----------------------------------------------------
    # Load PDFs
    # -----------------------------------------------------

    raw_docs = load_pdf_documents(
        docs_path
    )

    if not raw_docs:

        raise ValueError(
            "No PDF documents were found in the "
            f"documents directory: {docs_path}"
        )

    # -----------------------------------------------------
    # Split documents
    # -----------------------------------------------------

    chunks = split_documents(
        raw_docs,
        chunk_size=DEFAULT_CHUNK_SIZE,
        chunk_overlap=DEFAULT_CHUNK_OVERLAP
    )

    if not chunks:

        raise ValueError(
            "PDF documents were loaded, but no chunks "
            "were generated."
        )

    # -----------------------------------------------------
    # Create / Load ChromaDB
    # -----------------------------------------------------

    vector_store = get_or_create_vector_store(
        documents=chunks,
        force_rebuild=force_rebuild
    )

    # -----------------------------------------------------
    # Explicit retrieval
    #
    # This is useful for debugging and displaying
    # retrieved knowledge in logs/API responses.
    # -----------------------------------------------------

    retrieved_chunks = retrieve_relevant_chunks(
        vector_store,
        query,
        k=DEFAULT_TOP_K
    )

    print(
        f"[RAG] Explicit retrieval returned "
        f"{len(retrieved_chunks)} chunk(s)."
    )

    # -----------------------------------------------------
    # Build chain
    # -----------------------------------------------------

    chain = build_rag_chain(
        vector_store,
        model_name=DEFAULT_LLM_MODEL,
        temperature=DEFAULT_TEMPERATURE,
        k=DEFAULT_TOP_K
    )

    # -----------------------------------------------------
    # Generate answer
    # -----------------------------------------------------

    print(
        "[RAG] Sending question and retrieved context "
        "to Gemini..."
    )

    ai_answer = chain.invoke(
        query
    )

    print(
        "[RAG] Gemini response received."
    )

    print("=" * 60)

    return retrieved_chunks, ai_answer


# =========================================================
# CLI Test
# =========================================================

def main_cli():

    print("=" * 60)
    print("🤖 AI Interview Platform — RAG Pipeline CLI Test")
    print("=" * 60)

    if not os.getenv("GEMINI_API_KEY"):

        print(
            "❌ ERROR: GEMINI_API_KEY environment variable "
            "is missing."
        )

        print(
            "Please add GEMINI_API_KEY to your .env file."
        )

        sys.exit(1)

    query = input(
        "\nEnter your question: "
    ).strip()

    if not query:

        print(
            "No question entered. Exiting."
        )

        return

    print(
        "\nProcessing RAG pipeline..."
    )

    try:

        chunks, ai_answer = run_rag_query(
            query
        )

    except Exception as e:

        print(
            f"\n❌ RAG pipeline failed: {e}"
        )

        sys.exit(1)

    # -----------------------------------------------------
    # Retrieved Context
    # -----------------------------------------------------

    print("\n" + "=" * 60)

    print(
        f"📌 Retrieved Context "
        f"(Top {len(chunks)} Chunks):"
    )

    print("=" * 60)

    if not chunks:

        print(
            "(No relevant context chunks retrieved.)"
        )

    else:

        for idx, doc in enumerate(
            chunks,
            1
        ):

            source = doc.metadata.get(
                "source",
                "Unknown"
            )

            page = doc.metadata.get(
                "page",
                "N/A"
            )

            print(
                f"\n--- Chunk #{idx} "
                f"[Source: {os.path.basename(source)}, "
                f"Page: {page}] ---"
            )

            preview = doc.page_content[:500]

            if len(doc.page_content) > 500:
                preview += "..."

            print(preview)

    # -----------------------------------------------------
    # AI Answer
    # -----------------------------------------------------

    print("\n" + "=" * 60)

    print("💡 AI Answer:")

    print("=" * 60)

    print(ai_answer)

    print("=" * 60)


# =========================================================
# Entry Point
# =========================================================

if __name__ == "__main__":
    main_cli()