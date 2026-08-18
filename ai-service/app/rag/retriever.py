# app/rag/retriever.py
from typing import List

try:
    from langchain_chroma import Chroma
except ImportError:
    from langchain_community.vectorstores import Chroma

try:
    from langchain_core.documents import Document
except ImportError:
    from langchain.schema import Document

def get_similarity_retriever(vector_store: Chroma, k: int = 3):
    """
    Configures and returns a vector store retriever configured for top-k similarity search.
    """
    print(f"[Retriever] Configuring similarity search retriever (top k={k})...")
    return vector_store.as_retriever(search_kwargs={"k": k})

def retrieve_relevant_chunks(vector_store: Chroma, query: str, k: int = 3) -> List[Document]:
    """
    Directly queries vector store and returns top-k relevant document chunks.
    """
    print(f"[Retriever] Performing similarity search for query: '{query}'...")
    results = vector_store.similarity_search(query, k=k)
    print(f"[Retriever] Retrieved {len(results)} relevant chunk(s).")
    return results
