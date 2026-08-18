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

PERSIST_DIRECTORY = os.path.join(os.path.dirname(__file__), "..", "..", "chroma_db")

def get_or_create_vector_store(
    documents: Optional[List[Document]] = None,
    persist_directory: str = PERSIST_DIRECTORY,
    force_rebuild: bool = False
) -> Chroma:
    """
    Manages local Chroma vector store instance.
    - If force_rebuild=True or directory is empty, creates a new vector store from provided documents.
    - Otherwise, loads existing vector store from local disk.
    """
    embeddings = get_embeddings_model()

    persist_directory = os.path.abspath(persist_directory)

    if force_rebuild and os.path.exists(persist_directory):
        print(f"[VectorStore] Rebuilding requested. Clearing existing Chroma directory at '{persist_directory}'...")
        shutil.rmtree(persist_directory)

    if documents and (force_rebuild or not os.path.exists(persist_directory) or len(os.listdir(persist_directory)) == 0):
        print(f"[VectorStore] Creating new Chroma vector store with {len(documents)} document chunk(s)...")
        vector_store = Chroma.from_documents(
            documents=documents,
            embedding=embeddings,
            persist_directory=persist_directory
        )
        if hasattr(vector_store, "persist"):
            vector_store.persist()
        print(f"[VectorStore] Successfully persisted Chroma vector store at '{persist_directory}'.")
        return vector_store

    print(f"[VectorStore] Loading existing Chroma vector store from '{persist_directory}'...")
    return Chroma(
        persist_directory=persist_directory,
        embedding_function=embeddings
    )
