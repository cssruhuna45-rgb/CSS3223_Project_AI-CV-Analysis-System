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

### 0. Toolchain

Only needed for Option B. Docker brings its own copies.

| Tool | Version | Notes |
|---|---|---|
| JDK | **23** | The baseline everywhere: `backend/pom.xml`, both `backend/Dockerfile` stages and CI. Spring Boot 3.4 supports 17-23. |
| Maven | 3.9+ | Or just use `./mvnw`, which pins the version for you. |
| Node | 18+ | Frontend only. |
| Python | 3.10+ | AI service only. |

Check what you have:

```bash
java -version      # expect 23.x
./mvnw -version    # "Java version:" must also say 23
```

`mvnw` uses `JAVA_HOME` first and only then whatever `java` is on the
PATH, so those two can disagree. If the second command reports anything
but 23, point `JAVA_HOME` at a 23 JDK rather than relying on the PATH:

```bash
export JAVA_HOME=/path/to/jdk-23            # Windows: setx JAVA_HOME "C:\Program Files\Java\jdk-23"
```

Building on a newer JDK is not a shortcut. The compiler is pinned to
`release 23`, so a 24- or 25-only API fails the build here instead of
inside the Java 23 runtime container - but a Lombok older than 1.18.40
cannot even start under a JDK 25 compiler, which is why
`lombok.version` has a floor. Both are commented in `backend/pom.xml`.

### Backend build and test

```bash
cd backend
./mvnw clean verify     # compile, run the unit tests, build the jar
./mvnw spring-boot:run  # run it
```

`verify` is what CI runs. The tests are plain unit tests and need no
database.

To confirm the output really targets 23 - major version 67:

```bash
javap -v -p target/classes/com/aiinterview/AiInterviewApplication.class | grep major
```

The backend image on its own, without the rest of the stack. It
compiles inside the container, so this needs no local JDK and is the
closest thing to what CI does:

```bash
cd backend
docker build --no-cache -t springboot-java23 .
docker run --rm --entrypoint java springboot-java23 -version   # expect 23.x
```

Running that image by hand needs the database and the environment the
compose file otherwise supplies, so for anything beyond checking it
builds, use `docker compose up` from the project root instead.

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

Optional, but needed before anyone can use the recruiter dashboard:

- `ADMIN_EMAIL` — the account that becomes administrator when the
  backend starts. A new recruiter account waits for an administrator to
  approve it at `/admin`, because the dashboard shows other people's
  results. Register this email through the normal sign-up page first,
  then set it and restart the backend. No password goes in `.env`.

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
