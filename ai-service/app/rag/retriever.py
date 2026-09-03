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


# ---------------------------------------------------------
# Default retrieval configuration
# ---------------------------------------------------------

DEFAULT_K = 5


# ---------------------------------------------------------
# Create LangChain retriever
# ---------------------------------------------------------

def get_similarity_retriever(
    vector_store: Chroma,
    k: int = DEFAULT_K
):
    """
    Creates a similarity-based retriever.

    The retriever returns the top-k most relevant
    document chunks from ChromaDB.
    """

    print(
        f"[Retriever] Configuring similarity retriever "
        f"(top k={k})..."
    )

    return vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={
            "k": k
        }
    )


# ---------------------------------------------------------
# Retrieve relevant chunks
# ---------------------------------------------------------

def retrieve_relevant_chunks(
    vector_store: Chroma,
    query: str,
    k: int = DEFAULT_K
) -> List[Document]:
    """
    Retrieve the top-k most similar document chunks.

    Chroma's similarity_search_with_score() returns a
    distance score where lower values indicate greater
    similarity.

    We intentionally do not apply a hard threshold here.
    The top-k results are passed to the RAG pipeline, where
    the LLM can use the retrieved context.
    """

    if not query or not query.strip():
        print("[Retriever] Empty query received.")
        return []

    print("\n========== RETRIEVAL ==========")
    print(f"[Retriever] Query: {query}")
    print(f"[Retriever] Top K: {k}")

    try:
        # -------------------------------------------------
        # Similarity search with scores
        # -------------------------------------------------

        results = vector_store.similarity_search_with_score(
            query,
            k=k
        )

        print(
            f"[Retriever] Retrieved {len(results)} "
            f"candidate chunk(s)."
        )

        relevant_chunks: List[Document] = []

        # -------------------------------------------------
        # Keep top-k results
        # -------------------------------------------------

        for document, score in results:

            print(
                f"[Retriever] Distance score: {score:.4f}"
            )

            relevant_chunks.append(document)

        print(
            f"[Retriever] Retrieved "
            f"{len(relevant_chunks)} relevant chunk(s)."
        )

        print("================================\n")

        return relevant_chunks

    except Exception as e:

        print(
            f"[Retriever] Retrieval failed: {str(e)}"
        )

        raise