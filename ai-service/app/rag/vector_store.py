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


from app.rag.embeddings import (
    get_embeddings_model
)


# ============================================================
# ChromaDB Location
# ============================================================

PERSIST_DIRECTORY = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "chroma_db",
    )
)


# ============================================================
# Get / Create Vector Store
# ============================================================

def get_or_create_vector_store(
    documents: Optional[List[Document]] = None,

    persist_directory: str = PERSIST_DIRECTORY,

    force_rebuild: bool = False,
) -> Chroma:
    """
    Create or load the persistent Chroma vector store.

    Embeddings are generated locally using HuggingFace.
    """

    # --------------------------------------------------------
    # Embeddings
    # --------------------------------------------------------

    embeddings = get_embeddings_model()

    # --------------------------------------------------------
    # Check existing ChromaDB
    # --------------------------------------------------------

    chroma_exists = (

        os.path.exists(
            persist_directory
        )

        and bool(
            os.listdir(
                persist_directory
            )
        )
    )

    # --------------------------------------------------------
    # Force rebuild
    # --------------------------------------------------------

    if force_rebuild:

        if os.path.exists(
            persist_directory
        ):

            print(
                "[VectorStore] Force rebuild requested."
            )

            print(
                "[VectorStore] Removing existing "
                f"ChromaDB: '{persist_directory}'"
            )

            shutil.rmtree(
                persist_directory
            )

        chroma_exists = False

    # --------------------------------------------------------
    # Create new vector store
    # --------------------------------------------------------

    if documents and not chroma_exists:

        print(
            "[VectorStore] Creating new Chroma "
            f"vector store with {len(documents)} "
            "document chunk(s)..."
        )

        vector_store = Chroma.from_documents(

            documents=documents,

            embedding=embeddings,

            persist_directory=persist_directory,
        )

        print(
            "[VectorStore] Chroma vector store "
            "created successfully."
        )

        print(
            "[VectorStore] Persisted at: "
            f"'{persist_directory}'"
        )

        return vector_store

    # --------------------------------------------------------
    # Load existing vector store
    # --------------------------------------------------------

    if chroma_exists:

        print(
            "[VectorStore] Loading existing Chroma "
            f"vector store from '{persist_directory}'..."
        )

        vector_store = Chroma(

            persist_directory=persist_directory,

            embedding_function=embeddings,
        )

        print(
            "[VectorStore] Existing Chroma vector "
            "store loaded successfully."
        )

        return vector_store

    # --------------------------------------------------------
    # Nothing available
    # --------------------------------------------------------

    raise ValueError(
        "ChromaDB does not exist and no documents "
        "were provided to create a new vector store."
    )