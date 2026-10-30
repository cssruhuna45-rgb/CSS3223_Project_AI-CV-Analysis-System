# API Specification

The browser talks **only** to the Spring backend. Spring checks the
user's token and forwards AI work to the Python service with a shared
internal key:

```
Browser --JWT--> Spring :8080 --X-Internal-Api-Key--> FastAPI :8000
```

This page lists every endpoint the code serves today. For request and
response schemas, the running backend publishes them at
`http://localhost:8080/swagger-ui.html` and the AI service at
`http://localhost:8000/docs`; those are generated from the code and
cannot drift from it.

---

## 1. Conventions

### Authentication

Every endpoint except those marked **public** needs
`Authorization: Bearer <token>`. The token comes from register or login
and is valid for 24 hours (`JWT_EXPIRATION_MS`).

### Roles

| Role | How an account gets it | What it adds |
|---|---|---|
| candidate | Registers as a candidate (the default) | CV, skill gap, interviews, progress, roadmap |
| recruiter | Registers as a recruiter **and** an administrator approves the account | Jobs, invite codes, the recruiter dashboard |
| admin | `ADMIN_EMAIL` names an already registered account; promoted at backend startup | Approving and revoking recruiter accounts |

A recruiter account that is not approved yet (or was rejected) can sign
in but is refused every recruiter endpoint.

### Status codes

| Code | Meaning | What the frontend does |
|---|---|---|
| 400 | The request cannot be carried out as asked; `message` says why | Shows the message |
| 401 | No valid session: token missing, expired or tampered | Clears the login, sends the user to sign in |
| 403 | Signed in, but this account may not do this - a candidate on a recruiter endpoint, or someone else's scorecard | Shows the message; the user stays signed in |
| 404 | Not found - including an invite code that is unknown or closed | Shows the message |
| 409 | Clashes with stored data: duplicate email, second attempt at a job interview | Shows the message |
| 502 | The AI service failed or refused the internal key | Shows the message |

Errors from Spring share one shape:

```json
{ "timestamp": "...", "status": 403, "error": "Forbidden",
  "message": "You do not have permission to access this resource.",
  "path": "/api/v1/admin/recruiters" }
```

---

## 2. Spring backend (`http://localhost:8080`)

### Account

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/v1/auth/register` | public | `{ name, email, password, role }`. `role` is `candidate` or `recruiter`; asking for `admin` gives a candidate. A recruiter starts pending. Returns `{ token, user }` |
| POST | `/api/v1/auth/login` | public | `{ email, password }`. Returns `{ token, user }` |
| GET | `/api/v1/users/me` | signed in | The account as stored now, including `approvalStatus` (`pending` / `approved` / `rejected`) |
| GET | `/api/v1/health` | public | Backend liveness |

### CV

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/v1/resumes` | signed in | Upload a PDF (multipart `file`, 10 MB max). Text is extracted (PDFBox, OCR for scans) and the AI analysis is run and stored |
| GET | `/api/v1/resumes` | signed in | The caller's CVs |
| GET | `/api/v1/resumes/{id}` | owner | One CV with its extracted text |
| DELETE | `/api/v1/resumes/{id}` | owner | Delete a CV |
| GET | `/api/v1/resumes/{id}/analysis` | owner | The analysis stored at upload; 404 if it did not complete |

### Interview history and progress

These read only the database, and only the caller's own interviews.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/v1/interviews/history` | signed in | Finished interviews, newest first |
| GET | `/api/v1/interviews/progress` | signed in | Latest, previous, best and average score and the trend. Exam scores only; practice scores are listed but not compared |
| GET | `/api/v1/interviews/{sessionId}/scorecard` | owner | The stored scorecard of one interview |

### Learning roadmap

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/v1/roadmaps/generate` | signed in | Build and store a 14-day plan from an interview's weaknesses |
| GET | `/api/v1/roadmaps/latest` | signed in | The caller's most recent roadmap |
| GET | `/api/v1/roadmaps/session/{sessionId}` | owner | The roadmap made for one interview |
| GET | `/api/v1/roadmaps/{id}` | owner | One roadmap |
| PUT | `/api/v1/roadmaps/{id}/progress` | owner | `{ day_number, completed }` - tick a day off |

### AI gateway

Forwarded to the AI service with the internal key. Bodies pass through
unchanged except where noted.

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/v1/ai/resume/analyze` | Extract skills, experience and projects; recommend job fields |
| POST | `/api/v1/ai/resume/feedback` | Review how the CV is written: rule-based score plus advice |
| POST | `/api/v1/ai/resume/bullet/tune` | Rewrite one CV bullet in XYZ form, with gaps for facts the candidate must supply |
| POST | `/api/v1/ai/skill-gap/analyze` | Matched, missing, related and additional skills for a job field |
| POST | `/api/v1/ai/interview/start` | Start an interview. Stored by Spring. With `invite_code`, Spring checks the code and replaces `job_description`, `job_field` and `mode` with the job's own before forwarding (see section 3) |
| POST | `/api/v1/ai/interview/answer` | `{ session_id, answer }` - the next question. Stored by Spring |
| POST | `/api/v1/ai/interview/model-answer` | The expected answer for the question just answered. Not stored |
| POST | `/api/v1/ai/interview/finish` | Grade the interview; returns the scorecard. Stored by Spring |
| POST | `/api/v1/ai/interview/question` | Generate a single question outside a session |
| POST | `/api/v1/ai/roadmap/generate` | Generate a roadmap without storing it |
| POST | `/api/v1/ai/rag/query` | Ask the knowledge base a question |
| GET | `/api/v1/ai/health` | AI service health |

`/api/v1/rag/index` (rebuilding the knowledge base) is deliberately not
exposed here; it is an operator action, run against the AI service
directly.

### Job invites (candidate side)

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/v1/jobs/invite/{code}` | signed in | The job behind an invite code: title, company, field, description, recruiter name, whether the caller already completed it, `interviewReady` (questions approved) and `questionCount`. Unknown and closed codes both answer 404 |

### Recruiter (approved recruiters only)

Everything here is scoped to the recruiter in the token.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/recruiter/jobs` | The recruiter's jobs with interview counts |
| POST | `/api/v1/recruiter/jobs` | `{ title, company?, jobField, jobDescription, requiredSkills[], questionCount (5-10) }` - create a job; returns it with its invite code. Skills are stored normalised (trimmed, lower case, no repeats) and must not be empty |
| POST | `/api/v1/recruiter/jobs/{id}/close` | Stop accepting candidates; results are kept |
| POST | `/api/v1/recruiter/jobs/{id}/reopen` | Accept candidates again |
| GET | `/api/v1/recruiter/overview?jobId=` | Interviews taken through this recruiter's invite codes (exam mode only), with totals. `jobId` narrows to one job |

### Job questions (approved recruiters only)

A job's fixed interview. Every call returns the whole assessment:
`{ jobId, title, requiredSkills, questionCount, approved, approvedAt, approvedBy, questions: [{ id, position, question, difficulty, topic, keyPoints, source }], issues: [] }`.
`issues` lists what still stops approval. Once approved, every call that
would change the set answers 409; a different assessment needs a new job.
Another recruiter's job id answers 404.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/recruiter/jobs/{id}/questions` | The assessment |
| PUT | `/api/v1/recruiter/jobs/{id}/question-settings` | `{ requiredSkills[], questionCount }` |
| POST | `/api/v1/recruiter/jobs/{id}/questions/generate` | AI draft from the job's skills and description (never a CV); replaces the draft |
| POST | `/api/v1/recruiter/jobs/{id}/questions/{questionId}/regenerate` | Replace one draft question |
| PUT | `/api/v1/recruiter/jobs/{id}/questions` | `{ questions: [{ id?, question, difficulty, topic?, keyPoints[] }] }` - the whole draft in order; omitted questions are removed, changed ones become `source: RECRUITER` |
| POST | `/api/v1/recruiter/jobs/{id}/questions/approve` | Lock the set. 400 with the issues unless: exactly `questionCount` questions, each 20-600 characters with 2-6 key points and a difficulty of easy/medium/hard, no repeats, at least two difficulties and none above 60% of the set |

### Administrator

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/admin/recruiters` | Every recruiter account with its approval status |
| POST | `/api/v1/admin/recruiters/{id}/approve` | Give recruiter access; takes effect on the recruiter's next request |
| POST | `/api/v1/admin/recruiters/{id}/reject` | Refuse or revoke recruiter access |

---

## 3. Job interviews through an invite code

1. A recruiter creates a job and gets a code such as `VP8C-B2A7`
   (8 characters, no 0/O or 1/I/L; case, spaces and the dash are
   ignored when typed).
2. The candidate opens `/join/<code>`; the page calls
   `GET /api/v1/jobs/invite/{code}` and shows who will see the result.
3. Starting sends `invite_code` with `POST /api/v1/ai/interview/start`.
   Spring refuses it unless the caller is a candidate, the job is open,
   they have not already completed it (409) and the job's questions are
   approved (409, not ready). It then forwards the job's description and
   field, forces exam mode, adds the approved questions as
   `fixed_questions` and empties the CV and skill gap fields, so every
   candidate is asked the same questions in the same order.
   `fixed_questions` sent by the browser are always removed.
   `POST /api/v1/ai/interview/model-answer` answers 403 while the caller
   has a job interview in progress.
4. The stored interview is linked to the job by the code - never by a
   job id from the browser - and appears on that recruiter's dashboard
   only. Interviews started without a code are never shown to any
   recruiter.

---

## 4. AI service (`http://localhost:8000`, internal)

Called only by Spring. Every path except the public ones needs
`X-Internal-Api-Key`; the service refuses to start without
`INTERNAL_API_KEY`, and under docker compose port 8000 is not published.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/`, `/health`, `/api/v1/health` | public | Liveness |
| GET | `/docs`, `/redoc`, `/openapi.json` | public | Generated API documentation |
| POST | `/api/v1/resume/analyze` | key | CV extraction and job field recommendation |
| POST | `/api/v1/resume/feedback` | key | CV review against `documents/cv_resume_standards_guide.md` |
| POST | `/api/v1/resume/bullet/tune` | key | XYZ bullet rewrite |
| POST | `/api/v1/skill-gap/analyze` | key | Skill gap for a job field |
| POST | `/api/v1/interview/start` | key | New session and first question |
| POST | `/api/v1/interview/answer` | key | Grade the answer for pacing, next question |
| POST | `/api/v1/interview/model-answer` | key | Expected answer, grounded in the knowledge base |
| POST | `/api/v1/interview/finish` | key | Scorecard with per-question references |
| POST | `/api/v1/interview/question` | key | One question outside a session |
| POST | `/api/v1/roadmap/generate` | key | 14-day roadmap |
| POST | `/api/v1/rag/query` | key | Question over the knowledge base |
| POST | `/api/v1/rag/index` | key | Rebuild the Chroma index from `documents/` |
| POST | `/api/v1/assessment/questions/generate` | key | Draft job questions with key points from `{ job_title, job_field, job_description, required_skills[], question_count (1-10), existing_questions[] }`; returns `{ questions, issues, grounded, sources }` |

### Fixed-question interviews

Spring adds `fixed_questions` to `/api/v1/interview/start`, built from
the database (`JobQuestionService.fixedQuestionsPayload`):

```json
"fixed_questions": [
  { "question_id": 11, "position": 1, "question": "...",
    "difficulty": "easy", "topic": "Indexes", "key_points": ["...", "..."] }
]
```

- The session asks them in `position` order; the CV is not stored and
  does not change the questions or their difficulty.
- Start and answer responses carry only the current question (with an
  empty `reason`) and `total_questions`. Key points and later questions
  stay in the session.
- After the last answer, `/answer` returns `question: null,
  complete: true`; a further answer is 400.
- `/model-answer` is 403 and `/question` is 400 for an active job session.
- `/finish` grades each answer against its approved key points (no
  knowledge base retrieval) with the same rubric; the overall score is
  computed in Python. `per_question[].question_id` is set and
  `references` is empty, so the key points are not returned.
- Without `fixed_questions` the interview is the adaptive, CV-based
  practice interview, unchanged.
