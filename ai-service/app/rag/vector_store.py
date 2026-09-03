# app/rag/vector_store.py

import os
import shutil
from typing import List, Optional

try:
    from langchain_chroma import Chroma
except ImportError:
    from langchain_community.vectorstores import Chroma

try:
    from langchain_core.documents import Document
except ImportError:
    from langchain.schema import Document

from app.rag.embeddings import get_embeddings_model


# ---------------------------------------------------------
# ChromaDB persistence directory
# ---------------------------------------------------------

PERSIST_DIRECTORY = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "chroma_db"
    )
)


def get_or_create_vector_store(
    documents: Optional[List[Document]] = None,
    persist_directory: str = PERSIST_DIRECTORY,
    force_rebuild: bool = False
) -> Chroma:
    """
    Get or create the local Chroma vector store.

    Behaviour:
    1. force_rebuild=True:
       - Delete existing ChromaDB
       - Re-create embeddings from supplied documents

    2. Existing ChromaDB:
       - Load the existing vector store

    3. No existing ChromaDB + documents provided:
       - Create a new vector store
    """

    persist_directory = os.path.abspath(persist_directory)

    # -----------------------------------------------------
    # Initialize embedding model
    # -----------------------------------------------------

    embeddings = get_embeddings_model()

    # -----------------------------------------------------
    # Check existing ChromaDB
    # -----------------------------------------------------

    chroma_exists = (
        os.path.exists(persist_directory)
        and len(os.listdir(persist_directory)) > 0
    )

    # -----------------------------------------------------
    # Force rebuild
    # -----------------------------------------------------

    if force_rebuild:

        if os.path.exists(persist_directory):
            print(
                f"[VectorStore] Force rebuild requested. "
                f"Removing existing ChromaDB: "
                f"'{persist_directory}'"
            )

            shutil.rmtree(persist_directory)

        chroma_exists = False

    # -----------------------------------------------------
    # Create new vector store
    # -----------------------------------------------------

    if documents and not chroma_exists:

        print(
            f"[VectorStore] Creating new Chroma vector store "
            f"with {len(documents)} document chunk(s)..."
        )

        vector_store = Chroma.from_documents(
            documents=documents,
            embedding=embeddings,
            persist_directory=persist_directory
        )

        print(
            f"[VectorStore] Chroma vector store created successfully."
        )

        print(
            f"[VectorStore] Persisted at: "
            f"'{persist_directory}'"
        )

        return vector_store

    # -----------------------------------------------------
    # Existing vector store
    # -----------------------------------------------------

    if chroma_exists:

        print(
            f"[VectorStore] Loading existing Chroma vector store "
            f"from '{persist_directory}'..."
        )

        vector_store = Chroma(
            persist_directory=persist_directory,
            embedding_function=embeddings
        )

        print(
            "[VectorStore] Existing Chroma vector store loaded successfully."
        )

        return vector_store

    # -----------------------------------------------------
    # No database and no documents
    # -----------------------------------------------------

    raise ValueError(
        "ChromaDB does not exist and no documents were provided "
        "to create a new vector store."
    )