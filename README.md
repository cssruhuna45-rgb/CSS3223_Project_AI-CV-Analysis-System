# CSS3223_Project_AI-CV-Analysis-System

AI interview platform: upload a CV, get it analysed, see your skill gaps,
then sit an adaptive technical interview driven by a RAG knowledge base.

| Part | Stack | Port |
|---|---|---|
| `frontend/` | React | 3000 |
| `backend/` | Java 23, Spring Boot, PostgreSQL | 8080 |
| `ai-service/` | Python, FastAPI, LangChain, Gemini | 8000 |
| database | PostgreSQL (Docker) | 5432 |

Under `docker compose`, port 8000 is not published to the host at all -
the AI service is reachable only from the backend, over the compose
network.

The browser talks **only** to the Spring backend. Spring authenticates the
user's JWT and forwards AI calls to the Python service with a shared
internal key:

```
Browser --JWT--> Spring :8080 --X-Internal-Api-Key--> FastAPI :8000
```

The AI service refuses every request without that key and will not start
without it, so it can never be left open to whoever can reach port 8000.

---

## Setup

Two ways to run it. Docker is the short one; running the services by
hand is what you want while actually writing code, because nothing
reloads inside a container.

### 1. Secrets

Three values are needed, and none of them are in git.

```bash
cp .env.example .env
```

Then fill in `.env`:

- `GEMINI_API_KEY` — from https://aistudio.google.com/apikey
- `INTERNAL_API_KEY` — the shared secret the backend uses to prove to
  the AI service that a request came from it and not from the internet.
  Generate it once and give the same value to everyone:
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(32))"
  ```
- `JWT_SECRET` — signs login tokens:
  ```bash
  python -c "import secrets; print(secrets.token_urlsafe(48))"
  ```

---

### Option A — everything in Docker

```bash
docker compose up --build
```

First build takes roughly 5-10 minutes: Maven downloads the Java
dependencies and the AI image bakes the embedding model in so the first
question is not a fifteen second wait.

Open http://localhost:3000.

```bash
docker compose down       # stop
docker compose down -v    # stop and wipe the database, uploads and RAG index
```

Notes:

- Port 8000 is deliberately not published. Only the backend talks to the
  AI service, over the compose network, with the internal key.
- Flyway runs the migrations on backend startup, so the database sets
  itself up.
- The frontend's API address is compiled into the JavaScript bundle. It
  defaults to `localhost:8080`, which is right when you browse from the
  same machine. Opening the app from your phone or another laptop needs
  `REACT_APP_API_URL=http://<this machine's IP>:8080` in `.env` and a
  `docker compose build frontend`.

---

### Option B — services by hand (for development)

The database still comes from Docker:

```bash
docker compose up -d postgres-db
```

Each service in its own terminal.

**AI service** — copy `ai-service/.env.example` to `ai-service/.env`
and put `GEMINI_API_KEY` and `INTERNAL_API_KEY` in it:

```bash
cd ai-service
python -m venv .venv && .venv/Scripts/activate    # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Backend** — copy `backend/.env.example` to `backend/.env` and put the
same `AI_SERVICE_INTERNAL_API_KEY` in it:

```bash
cd backend
./mvnw spring-boot:run          # .\mvnw spring-boot:run on Windows
```

A value set in the environment overrides that file, which is how Docker
supplies it. Without either, the backend refuses to start rather than
calling the AI service unauthenticated.

**Frontend:**

```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000.

> Pulled new commits? The Java backend does not hot reload — stop it and
> `./mvnw spring-boot:run` again, or you will get 404s on endpoints that
> exist in the code.

---

## Checking it works

```bash
./tests/verify-ai-security.sh                          # gate checks only
./tests/verify-ai-security.sh you@example.com yourpass # + the logged-in path
```

Backend unit tests:

```bash
cd backend && ./mvnw test
```

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| AI service: `INTERNAL_API_KEY is not set` | Missing from `ai-service/.env` |
| Backend: `ai-service.internal-api-key is not configured` | `AI_SERVICE_INTERNAL_API_KEY` not exported in that terminal |
| `401 Missing or invalid internal API key` | The two keys do not match |
| `[WinError 10013]` on port 8000 | Something already listening — `netstat -ano \| findstr :8000` |
| `null value in column "is_active"` on register | Old database; run `scripts/001-align-existing-schema.sql` |
| `Transaction silently rolled back` on CV upload | Same — run the script above |
| `502 AI service is unreachable` | The FastAPI service is not running |
| Docker: `set INTERNAL_API_KEY in .env` | `.env` is missing or a required value is blank |
| Docker: backend stuck at `waiting` | The AI service is still loading; it gets up to ~2.5 minutes |
| Docker: the app loads but every call fails | The bundle was built for a different `REACT_APP_API_URL` — `docker compose build frontend` |

---

## Known gaps

- `application.yml` still falls back to a committed JWT secret. Set
  `JWT_SECRET` before deploying anywhere real; the fallback exists only
  so a fresh clone starts.
- A CV upload makes two Gemini calls where one would do.
- There is no fallback when Gemini is down, so a demo depends on it
  being up.
- The frontend defines colour tokens but mostly ignores them, so a
  theme change means editing hex values in every file.
