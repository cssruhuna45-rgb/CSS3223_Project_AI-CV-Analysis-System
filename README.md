# CSS3223_Project_AI-CV-Analysis-System

AI interview platform: upload a CV, get it analysed, see your skill gaps,
then sit an adaptive technical interview driven by a RAG knowledge base.

| Part | Stack | Port |
|---|---|---|
| `frontend/` | React | 3000 |
| `backend/` | Java 23, Spring Boot, PostgreSQL | 8080 |
| `ai-service/` | Python, FastAPI, LangChain, Gemini | 8000 |
| database | PostgreSQL (Docker) | 5432 |

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

### 1. Secrets

Two values must be shared across the team, and both services need to
agree on them. Neither is in git.

Generate the internal key once, then give the same value to everyone:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**`ai-service/.env`** (copy from `ai-service/.env.example`):

```
GEMINI_API_KEY=<your Gemini key>
INTERNAL_API_KEY=<the generated key>
AI_ALLOWED_ORIGINS=http://localhost:3000
```

**`.env`** in the project root — only used by docker-compose:

```
GEMINI_API_KEY=<your Gemini key>
INTERNAL_API_KEY=<the same generated key>
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

### 2. Database

```bash
docker compose up -d postgres-db
```

**Already have an `ai_interview_db` from an earlier version?** Run this
once, or registration and CV upload will fail:

```powershell
# PowerShell: "<" input redirection is not supported, so pipe instead
Get-Content scripts\001-align-existing-schema.sql -Raw | docker exec -i interview_postgres psql -U postgres -d ai_interview_db
```

```bash
# bash / Git Bash
docker exec -i interview_postgres psql -U postgres -d ai_interview_db < scripts/001-align-existing-schema.sql
```

A brand new database needs nothing — Hibernate builds it correctly.

### 3. Run the three services

Each in its own terminal.

**AI service:**

```bash
cd ai-service
python -m venv .venv && .venv/Scripts/activate    # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Backend** — needs the internal key in its environment, and refuses to
start without it:

```powershell
# PowerShell
$env:AI_SERVICE_INTERNAL_API_KEY = "<the generated key>"
cd backend
.\mvnw spring-boot:run
```

```bash
# bash
export AI_SERVICE_INTERNAL_API_KEY="<the generated key>"
cd backend && ./mvnw spring-boot:run
```

**Frontend:**

```bash
cd frontend
npm install
npm start
```

Open http://localhost:3000.

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

---

## Known gaps

- Interview sessions live in memory in the AI service, so they are lost on
  restart and there is no `Interview` entity yet. The recruiter dashboard
  still shows placeholder data.
- No Dockerfiles for the three services, so `docker compose up` cannot
  build them yet.
- No migration tool. Schema changes are hand-written under `scripts/`;
  Flyway or Liquibase should replace that.
- `application.yml` still falls back to a committed JWT secret. Set
  `JWT_SECRET` before deploying anywhere real.
