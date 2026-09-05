# app/rag/embeddings.py

from functools import lru_cache

from langchain_huggingface import HuggingFaceEmbeddings


# ============================================================
# Configuration
# ============================================================

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"


# ============================================================
# Get Embedding Model
# ============================================================

@lru_cache(maxsize=1)
def get_embeddings_model() -> HuggingFaceEmbeddings:
    """
    Initialize the local HuggingFace embedding model.

    The embedding model runs locally and does not consume
    Gemini API embedding quota.
    """

    print(
        "\n[Embeddings] Initializing local HuggingFace "
        f"embedding model: {EMBEDDING_MODEL}"
    )

    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,

        model_kwargs={
            "device": "cpu",
        },

        encode_kwargs={
            "normalize_embeddings": True,
        },
    )

    print(
        "[Embeddings] Local embedding model initialized "
        "successfully."
    )

    return embeddings