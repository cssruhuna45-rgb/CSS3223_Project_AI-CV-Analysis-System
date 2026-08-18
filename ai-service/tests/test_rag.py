# tests/test_rag.py
import os
import unittest
from dotenv import load_dotenv

load_dotenv()

from app.rag.document_loader import load_pdf_documents, split_documents
from app.rag.embeddings import get_embeddings_model
from app.rag.vector_store import get_or_create_vector_store
from app.rag.retriever import retrieve_relevant_chunks
from app.rag.pipeline import build_rag_chain

class TestRAGPipeline(unittest.TestCase):

    def setUp(self):
        self.api_key = os.getenv("GEMINI_API_KEY")

    def test_01_environment_key(self):
        """Test that GEMINI_API_KEY environment variable is set."""
        self.assertIsNotNone(self.api_key, "GEMINI_API_KEY environment variable should be set.")
        self.assertNotEqual(self.api_key, "", "GEMINI_API_KEY should not be empty.")

    def test_02_embeddings_initialization(self):
        """Test that GoogleGenerativeAIEmbeddings initializes properly."""
        if not self.api_key:
            self.skipTest("GEMINI_API_KEY not configured.")
        embeddings = get_embeddings_model()
        self.assertIsNotNone(embeddings)

    def test_03_document_loader_and_splitter(self):
        """Test loading and splitting document pages."""
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        docs_dir = os.path.join(base_dir, "documents")
        
        docs = load_pdf_documents(docs_dir)
        self.assertIsInstance(docs, list)
        
        chunks = split_documents(docs, chunk_size=1000, chunk_overlap=200)
        self.assertIsInstance(chunks, list)

if __name__ == "__main__":
    unittest.main()
