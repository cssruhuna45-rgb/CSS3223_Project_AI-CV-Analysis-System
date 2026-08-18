import os

from dotenv import load_dotenv
from langchain_google_genai import GoogleGenerativeAIEmbeddings

load_dotenv()


def get_embeddings_model() -> GoogleGenerativeAIEmbeddings:
    """
    Initialize Gemini embeddings for the RAG pipeline.
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY environment variable is missing. "
            "Please set GEMINI_API_KEY in your .env file."
        )

    print(
        "[Embeddings] Initializing GoogleGenerativeAIEmbeddings "
        "(gemini-embedding-2)..."
    )

    return GoogleGenerativeAIEmbeddings(
        model="gemini-embedding-2",
        google_api_key=api_key,
    )