# app/rag/pipeline.py
import os
import sys
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

try:
    from langchain_core.prompts import PromptTemplate
    from langchain_core.runnables import RunnablePassthrough
    from langchain_core.output_parsers import StrOutputParser
except ImportError:
    from langchain.prompts import PromptTemplate
    from langchain.schema.runnable import RunnablePassthrough
    from langchain.schema.output_parser import StrOutputParser

from app.rag.document_loader import load_pdf_documents, split_documents
from app.rag.vector_store import get_or_create_vector_store
from app.rag.retriever import get_similarity_retriever, retrieve_relevant_chunks

# Load environment variables (.env)
load_dotenv()

PROMPT_TEMPLATE = """You are an objective AI Interview & Knowledge Assistant.
Answer the user's question ONLY using the provided context below.
If the answer cannot be found or inferred from the provided context, state clearly:
"The requested information is not available in the knowledge base."

Do NOT use any outside knowledge or make up information.

Context:
{context}

Question:
{question}

Answer:"""

def build_rag_chain(vector_store, model_name: str = "gemini-1.5-flash"):
    """
    Builds a LangChain RAG pipeline combining Retriever, Prompt Template, and Gemini Chat Model.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set.")

    llm = ChatGoogleGenerativeAI(
        model="gemini-flash-lite-latest",
        google_api_key=api_key,
        temperature=0.2
    )

    prompt = PromptTemplate(
        template=PROMPT_TEMPLATE,
        input_variables=["context", "question"]
    )

    retriever = get_similarity_retriever(vector_store, k=3)

    def format_docs(docs):
        return "\n\n---\n\n".join(doc.page_content for doc in docs)

    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )

    return rag_chain

def run_rag_query(query: str, documents_dir: str = "documents", force_rebuild: bool = False):
    """
    Executes a RAG query:
    1. Loads PDFs & builds/loads Chroma vector store.
    2. Retrieves top 3 relevant chunks.
    3. Generates grounded answer via Gemini API.
    """
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    docs_path = os.path.join(base_dir, documents_dir)

    raw_docs = load_pdf_documents(docs_path)
    chunks = split_documents(raw_docs, chunk_size=1000, chunk_overlap=200)

    vector_store = get_or_create_vector_store(documents=chunks, force_rebuild=force_rebuild)
    
    # 1. Retrieve chunks for explicit display
    retrieved_chunks = retrieve_relevant_chunks(vector_store, query, k=3)
    
    # 2. Execute RAG Chain
    chain = build_rag_chain(vector_store)
    ai_answer = chain.invoke(query)

    return retrieved_chunks, ai_answer

def main_cli():
    print("=" * 60)
    print("🤖 AI Interview Platform — RAG Pipeline CLI Test")
    print("=" * 60)

    if not os.getenv("GEMINI_API_KEY"):
        print("❌ ERROR: GEMINI_API_KEY environment variable is missing.")
        print("Please set it in your environment or local .env file before running.")
        sys.exit(1)

    query = input("\nEnter your question: ").strip()
    if not query:
        print("No question entered. Exiting.")
        return

    print("\nProcessing RAG pipeline...")
    chunks, ai_answer = run_rag_query(query)

    print("\n" + "=" * 60)
    print("📌 Retrieved Context (Top 3 Chunks):")
    print("=" * 60)
    if not chunks:
        print("(No context chunks retrieved — vector store is empty or no PDFs ingested)")
    else:
        for idx, doc in enumerate(chunks, 1):
            source = doc.metadata.get('source', 'Unknown')
            page = doc.metadata.get('page', 'N/A')
            print(f"\n--- Chunk #{idx} [Source: {os.path.basename(source)}, Page: {page}] ---")
            print(doc.page_content[:300] + ("..." if len(doc.page_content) > 300 else ""))

    print("\n" + "=" * 60)
    print("💡 AI Answer:")
    print("=" * 60)
    print(ai_answer)
    print("=" * 60)

if __name__ == "__main__":
    main_cli()
