# FastAPI AI service: RAG retrieval, question generation, grading.
#
# Single stage. The heavy part is the Python dependency tree, not build
# tooling, so splitting stages would save little and cost the embedding
# model cache.

FROM python:3.11-slim

# No apt-get on purpose. Every dependency here ships a prebuilt wheel
# for Python 3.11, and the healthcheck below runs on the interpreter
# that is already in the image, so there is nothing left to install.
# That drops about 350MB and the most failure-prone step in the build -
# the first attempt at this image died fetching curl from a Debian
# mirror that timed out.

WORKDIR /app

# Dependencies first, so editing application code does not reinstall
# torch and sentence-transformers on every build.
COPY requirements.txt .

# CPU-only torch, installed before the rest so pip already has a torch
# that satisfies sentence-transformers and does not go looking for the
# default one. The default build on PyPI bundles the CUDA runtime -
# roughly 3GB of NVIDIA wheels for a container that only ever runs
# all-MiniLM-L6-v2 on the processor.
RUN pip install --no-cache-dir --retries 10 --timeout 60 torch --index-url https://download.pytorch.org/whl/cpu

# --retries/--timeout because a single dropped request to PyPI
# otherwise fails the whole build with a misleading
# "no matching distribution" - it happened here on pydantic.
RUN pip install --no-cache-dir --retries 10 --timeout 60 -r requirements.txt

# Pull the embedding model into the image.
#
# Without this the first RAG call of a fresh container downloads
# all-MiniLM-L6-v2 and takes about fifteen seconds while somebody waits
# on a question - and fails outright if the machine is offline.
ENV SENTENCE_TRANSFORMERS_HOME=/app/.cache
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2'); print('embedding model cached')"

COPY app/ app/
COPY documents/ documents/

# The Chroma index is built from documents/ at runtime and mounted as a
# volume in compose, so a rebuild does not force a reindex.
RUN mkdir -p /app/chroma_db

RUN useradd --create-home --shell /usr/sbin/nologin app && chown -R app:app /app
USER app

EXPOSE 8000

# /health needs no internal API key by design, which is what makes it
# usable as a probe.
HEALTHCHECK --interval=10s --timeout=5s --start-period=60s --retries=10 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
