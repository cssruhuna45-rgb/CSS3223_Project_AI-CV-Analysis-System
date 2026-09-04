import os

from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings

load_dotenv()


EMBEDDING_MODEL = "gemini-embedding-2"


def get_embeddings_model() -> GoogleGenerativeAIEmbeddings:
    """
    Initialize the Gemini embedding model used by the RAG pipeline.
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is missing. "
            "Please set GEMINI_API_KEY in your .env file."
        )

    print(
        f"[Embeddings] Initializing "
        f"GoogleGenerativeAIEmbeddings ({EMBEDDING_MODEL})..."
    )

    return GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        google_api_key=api_key,
    )