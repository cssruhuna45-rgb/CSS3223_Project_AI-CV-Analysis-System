# app/rag/document_loader.py
import os
from typing import List
from langchain_community.document_loaders import PyPDFLoader, PyPDFDirectoryLoader

try:
    from langchain_text_splitters import RecursiveCharacterTextSplitter
except ImportError:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
    except ImportError:
        from langchain_community.text_splitter import RecursiveCharacterTextSplitter

try:
    from langchain_core.documents import Document
except ImportError:
    from langchain.schema import Document

def load_pdf_documents(directory_path: str) -> List[Document]:
    """
    Loads all PDF documents from the specified directory path using PyPDF.
    Returns a list of raw LangChain Document objects.
    """
    if not os.path.exists(directory_path):
        os.makedirs(directory_path, exist_ok=True)
        return []

    pdf_files = [f for f in os.listdir(directory_path) if f.lower().endswith('.pdf')]
    if not pdf_files:
        print(f"[DocumentLoader] Warning: No PDF files found in '{directory_path}'.")
        return []

    print(f"[DocumentLoader] Loading {len(pdf_files)} PDF file(s) from '{directory_path}'...")
    loader = PyPDFDirectoryLoader(directory_path)
    documents = loader.load()
    print(f"[DocumentLoader] Successfully extracted {len(documents)} document page(s).")
    return documents

def split_documents(documents: List[Document], chunk_size: int = 1000, chunk_overlap: int = 200) -> List[Document]:
    """
    Splits loaded Document objects into smaller text chunks using RecursiveCharacterTextSplitter.
    """
    if not documents:
        return []

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", " ", ""]
    )

    chunks = text_splitter.split_documents(documents)
    print(f"[DocumentLoader] Split {len(documents)} page(s) into {len(chunks)} text chunk(s) (size={chunk_size}, overlap={chunk_overlap}).")
    return chunks
