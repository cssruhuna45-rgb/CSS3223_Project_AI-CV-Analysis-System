# app/rag/retriever.py

from typing import List, Tuple

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
DEFAULT_SCORE_THRESHOLD = 0.60


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
    k: int = DEFAULT_K,
    score_threshold: float = DEFAULT_SCORE_THRESHOLD
) -> List[Document]:
    """
    Retrieve relevant document chunks using similarity search
    with a relevance threshold.

    Args:
        vector_store:
            Chroma vector store.

        query:
            User/interview query.

        k:
            Maximum number of chunks to retrieve.

        score_threshold:
            Minimum relevance score.

    Returns:
        List of relevant Document chunks.
    """

    if not query or not query.strip():
        print("[Retriever] Empty query received.")
        return []

    print("\n========== RETRIEVAL ==========")
    print(f"[Retriever] Query: {query}")
    print(f"[Retriever] Top K: {k}")
    print(f"[Retriever] Score threshold: {score_threshold}")

    try:
        # -------------------------------------------------
        # Similarity search with scores
        # -------------------------------------------------

        results: List[
            Tuple[Document, float]
        ] = vector_store.similarity_search_with_score(
            query,
            k=k
        )

        print(
            f"[Retriever] Retrieved {len(results)} "
            f"candidate chunk(s)."
        )

        relevant_chunks: List[Document] = []

        # -------------------------------------------------
        # Apply relevance threshold
        # -------------------------------------------------

        for document, score in results:

            print(
                f"[Retriever] Similarity score: {score:.4f}"
            )

            # Chroma similarity distance:
            # lower distance = more similar
            if score <= score_threshold:

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