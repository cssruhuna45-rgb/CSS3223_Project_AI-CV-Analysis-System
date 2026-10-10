# AI Interview Platform — Bug & Improvement Report

**Investigation date:** 2025  
**Scope:** Full-stack — React frontend, Spring Boot backend, FastAPI AI service  
**Files reviewed:** 40+ source files across all three services  

---

## Executive Summary

The codebase is well-structured and shows clear defensive intent (no hardcoded JWT secret, internal API key required at startup, JWT filter is silent-fail rather than crashing). The most serious bugs are:
1. **In-memory interview sessions** — the AI service stores them in a Python dict; any restart or scale-out silently loses all in-flight interviews.
2. **Double Gemini call on upload** — confirmed as a known gap; analysis is called both server-side (on upload) and client-side (from `CVUpload.jsx`), charging Gemini twice per resume.
3. **No session expiry / cleanup** in the in-memory store — the dict grows forever in production.
4. **Register page has no password-strength validation** on the frontend — the backend also has no `@Size` constraint on the password field.
5. **Recruiter "Full Report" button is a stub** — wired to nothing.

---

## 1. Critical Bugs

### BUG-001 · In-memory interview sessions — data loss on restart
**Severity:** Critical  
**File:** `ai-service/app/interview/session_manager.py`, line 74  
```python
_sessions: dict[str, InterviewSession] = {}
```
**Description:** All interview sessions are stored in a plain Python dictionary in process memory. If the FastAPI service restarts (crash, deploy, OOM kill, Docker container restart), every active interview is silently destroyed. The candidate pressing "Submit" after a restart gets "Interview session '...' was not found" because `get_session()` raises `ValueError`. The Spring Boot side persists turns, but the AI side has lost the question context, so `interviewAPI.submitAnswer()` would return a 400 or 500 error.

**Impact:** Users lose in-progress interviews on any service restart. The `docker-compose.yml` has `restart: unless-stopped`, which means a crash-loop would repeatedly drop sessions.

**Suggested fix:** Persist sessions to Redis (or even PostgreSQL) with a TTL of several hours. FastAPI has well-supported Redis async clients. At minimum, add a startup check that warns loudly if session count is non-zero (impossible to detect, but at least document the known limitation prominently).

---

### BUG-002 · Double Gemini call on every CV upload (confirmed known gap)
**Severity:** Critical (cost / correctness)  
**Files:** `backend/src/main/java/com/aiinterview/controller/ResumeController.java` lines 49–57; `frontend/src/pages/CVUpload.jsx` lines 128–132  

**Description:**  
1. `ResumeController.uploadResume()` calls `resumeAnalysisService.analyzeAndStore(response.getId())` synchronously after the upload transaction commits. This hits `POST /api/v1/resume/analyze` on the AI service — **Gemini call #1**.
2. `CVUpload.jsx` `handleAnalyze()` then calls `aiResumeAPI.analyze(resumeId, resumeText)` via `POST /api/v1/ai/resume/analyze` — **Gemini call #2**.

The backend call stores the result in `resume_analysis`; the frontend call re-runs Gemini and uses the fresh result (overriding the stored one in session state). The stored result is returned by `GET /api/v1/resumes/{id}/analysis` on a return visit, but the live result shown immediately after upload is from the second call.

**Impact:** Every upload costs two Gemini API calls. On a free-tier key this drains quota twice as fast. Results can differ between the stored analysis and the live one (Gemini is non-deterministic at temperature > 0).

**Suggested fix:** Remove the `resumeAnalysisService.analyzeAndStore()` call from `ResumeController.uploadResume()`. The frontend already calls `aiResumeAPI.analyze()` and caches the result in sessionStorage; the backend call is redundant. Alternatively, remove the frontend call and use the stored analysis exclusively — but then `GET /api/v1/resumes/{id}/analysis` must return the full payload the frontend currently builds from the AI response, and the analysis must be awaited before the 201 is returned.

---

### BUG-003 · JWT filter swallows all exceptions silently
**Severity:** High  
**File:** `backend/src/main/java/com/aiinterview/security/JwtAuthenticationFilter.java`, lines 37–47  
```java
} catch (Exception e) {
    // Invalid JWT token - allow filter chain to continue
}
```
**Description:** Any exception from `jwtService.extractUsername(jwt)`, `userDetailsService.loadUserByUsername(userEmail)`, or `jwtService.isTokenValid(jwt, userDetails)` is silently swallowed. This means:
- A database connectivity error during `loadUserByUsername` (user table down) is treated the same as an invalid token — the request reaches the handler unauthenticated and then gets a 403 from the auth check there, with no log entry explaining the real cause.
- A malformed (but not obviously invalid) token causes the same silent pass-through.

**Suggested fix:** Log the exception at WARN level (not ERROR — invalid tokens are expected) with the exception message before continuing the filter chain. Distinguish `JwtException` / `IllegalArgumentException` (normal — invalid token) from unexpected exceptions like `DataAccessException` (log at ERROR, potentially return 503).

---

### BUG-004 · File path traversal not fully prevented
**Severity:** High  
**File:** `backend/src/main/java/com/aiinterview/service/impl/FileStorageServiceImpl.java`, lines 30–36  
```java
if (storedFileName.contains("..")) {
    throw new InvalidFileException("Filename contains invalid path sequence " + storedFileName);
}
```
**Description:** The stored filename is a `UUID + "_" + originalFilename`. The `originalFilename` is already processed through `StringUtils.cleanPath()` in `ResumeServiceImpl` before reaching here, which strips `../` sequences. However, the check in `FileStorageServiceImpl` is an additional safeguard that only looks for `..` as a substring. A filename like `...` or `..%2F` (URL-encoded slash, unlikely at this layer but possible if the content-disposition header is crafted) would not trigger it. More critically, the resolved path is not checked to still reside under `fileStorageLocation`, which is the standard defense.

**Suggested fix:** After resolving, confirm the path starts with `fileStorageLocation.toString()`:
```java
Path targetLocation = this.fileStorageLocation.resolve(storedFileName).normalize();
if (!targetLocation.startsWith(this.fileStorageLocation)) {
    throw new InvalidFileException("Stored filename resolves outside upload directory.");
}
```

---

### BUG-005 · No file size validation on the client before upload
**Severity:** Medium-High  
**File:** `frontend/src/pages/CVUpload.jsx`, lines 91–97  
```jsx
const handleFile = (f) => {
  if (!f) return;
  if (f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')) {
    setFile(f);
  ...
```
**Description:** The client validates file type (PDF only) but does **not** validate file size. The backend enforces 10 MB via `spring.servlet.multipart.max-file-size`, but that only triggers after the full upload completes and is returned as a 400/500 with a `MaxUploadSizeExceededException`. The UI shows no message mentioning a size limit until that server error arrives (if at all — `handleResponse` maps it generically).

The UI does display "Max size: 10MB" as static text in the upload zone, but it doesn't enforce it.

**Suggested fix:**
```jsx
if (f.size > 10 * 1024 * 1024) {
  setError('File is too large. Maximum size is 10 MB.');
  return;
}
```

---

### BUG-006 · CORS: comma-separated string injected as a single origin
**Severity:** Medium-High  
**File:** `backend/src/main/java/com/aiinterview/config/CorsConfig.java`, lines 13–19  
```java
public CorsConfig(
    @Value("${cors.allowed-origins:http://localhost:3000}")
    String[] allowedOrigins
) {
```
**Description:** Spring's `@Value` with `String[]` will split on commas when the value is injected from a properties file, but `CORS_ALLOWED_ORIGINS` is set in `docker-compose.yml` as an environment variable. Spring Boot treats environment variables as a single string unless explicitly configured otherwise for the target type. A value of `http://localhost:3000,https://myprod.com` would be treated as **one origin** `"http://localhost:3000,https://myprod.com"` (with a literal comma), not two, causing CORS failures in production.

**Suggested fix:** Use `@Value("${cors.allowed-origins:http://localhost:3000}") String allowedOriginsRaw` and split manually:
```java
this.allowedOrigins = Arrays.stream(allowedOriginsRaw.split(","))
    .map(String::trim)
    .filter(s -> !s.isEmpty())
    .toArray(String[]::new);
```
Or use `@ConfigurationProperties` with a `List<String>` binding and `cors.allowed-origins[0]=...` syntax.

---

### BUG-007 · In-memory session dictionary grows without bound (memory leak)
**Severity:** Medium-High  
**File:** `ai-service/app/interview/session_manager.py`, line 74  

**Description:** `_sessions` is never pruned. Completed sessions remain in the dict forever. In production (or a long-running dev session), this accumulates indefinitely. A `delete_session()` function exists but is never called — not after `finish_session()`, not anywhere in `main.py`.

**Suggested fix:** Call `delete_session(session_id)` in the finish endpoint after the evaluation is done and the result returned, or add a background task (e.g., `asyncio.create_task` or APScheduler) that evicts sessions older than N hours.

---

## 2. Non-Critical Bugs

### BUG-008 · `InterviewRoom` — missing `useEffect` dependencies
**Severity:** Medium  
**File:** `frontend/src/pages/InterviewRoom.jsx`, lines 175–193 (debug log effect) and lines 196–266 (start interview effect)  

**Description:**
- The debug log `useEffect` lists `[selectedJobField, selectedJobFieldName]` but the effect body also references `matchedSkills`, `relatedSkills`, `missingSkills`, and `additionalSkills`. This is a missing-deps lint warning that React's exhaustive-deps rule would flag.
- The start interview `useEffect` has an empty dependency array `[]` and relies on `interviewStartedRef` to prevent duplicate calls. This is the correct pattern here and is intentional. However, `jobDescription`, `resumeText`, `selectedJobField`, `matchedSkills`, `relatedSkills`, `missingSkills`, and `additionalSkills` are derived at render time from `sessionStorage` — if those values change between renders (e.g., because the user navigates away and back), the effect does not re-fire. This is acceptable given the ref guard, but worth documenting.

**Suggested fix:** Add the missing deps to the debug log effect (it is logging only, so stale deps just produce stale log lines), or remove the effect entirely since debug logs in production are noise.

---

### BUG-009 · `SkillGap` — `runSkillGapAnalysis` not in `useEffect` deps
**Severity:** Medium  
**File:** `frontend/src/pages/SkillGap.jsx`, lines 43–46  
```jsx
useEffect(() => {
  if (!resumeText || resumeText.trim().length < 20) return;
  runSkillGapAnalysis(currentField);
}, [currentField]);
```
**Description:** `runSkillGapAnalysis` is defined in the component body and re-created on every render, but is not listed in the `useEffect` dependency array. React's rules of hooks require either listing it or wrapping it in `useCallback`. As written, the effect always calls the version of `runSkillGapAnalysis` captured on the first render. This works correctly today because `runSkillGapAnalysis` itself only uses `resumeId`, `resumeText`, `currentField` (passed as argument), and `sessionStorage`, none of which are closed-over state that could go stale — but it will silently break if the function is ever updated to use component state.

**Suggested fix:** Wrap `runSkillGapAnalysis` in `useCallback([resumeId, resumeText])` and add it to the effect deps.

---

### BUG-010 · `Scorecard` — `result` missing from `useEffect` deps
**Severity:** Low-Medium  
**File:** `frontend/src/pages/Scorecard.jsx`, lines 99–122  
```jsx
useEffect(() => {
  ...
}, [sessionId]); // ONLY depend on sessionId
```
**Description:** The comment acknowledges the omission intentionally, but `result` is read inside the effect body (`if (!result) { ... setHistoryLoading(true) }`). If `result` is set by the initial state function and `sessionId` is null, the history-load branch will never run (correct). But if the component is kept mounted and `result` is cleared by some future code path, the effect would not re-run. Minor for now but fragile.

---

### BUG-011 · `RecruiterDashboard` — "Full Report" button is a stub
**Severity:** Medium (UX)  
**File:** `frontend/src/pages/RecruiterDashboard.jsx`, line 265  
```jsx
<button className="btn btn-primary" ...>
  <BarChart2 size={15} /> Full Report
</button>
```
**Description:** The "Full Report" button in the candidate detail panel has no `onClick` handler and no navigation. Clicking it does nothing. There is no `navigate()` call and no linked route. The recruiter scorecard view is not implemented.

**Suggested fix:** Either navigate to `/scorecard?session=${candidate.latestSessionId}` (if the API returns that) or disable the button with a tooltip "Coming soon" until the feature is built.

---

### BUG-012 · `ResumeServiceImpl` — PDF extraction failure is silently suppressed, not reflected in response
**Severity:** Medium  
**File:** `backend/src/main/java/com/aiinterview/service/impl/ResumeServiceImpl.java`, lines 77–87  
```java
} catch (Exception e) {
    resume.setProcessingStatus("FAILED");
    System.err.println("PDF text extraction failed: " + e.getMessage());
}
```
**Description:** When PDF text extraction fails, the resume is saved with `processingStatus = "FAILED"` and `extractedText = null`. The 201 response still goes back to the client as if everything succeeded. `CVUpload.jsx` then calls `aiResumeAPI.analyze()` with `resumeData?.extractedText || ''` — empty string — and the AI service returns HTTP 400 "Resume text cannot be empty." The user sees a generic error. The FAILED status is invisible.

Additionally, `System.err.println` should be `log.warn(...)` — Spring Boot's logging infrastructure is already configured and `System.err` bypasses it.

**Suggested fix:** When `processingStatus` is "FAILED", return 422 Unprocessable Entity with a meaningful message, or at least include `processingStatus` in `ResumeResponseDto` so the frontend can display "Could not extract text from your PDF".

---

### BUG-013 · `api.js` — `handleResponse` redirects to `/login` mid-flight for all 401/403
**Severity:** Medium (UX)  
**File:** `frontend/src/services/api.js`, lines 16–24  
```js
if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (window.location.pathname !== '/login') {
        window.location.assign('/login');
    }
    throw new Error('Your session has expired...');
}
```
**Description:** A 403 from the recruiter endpoint (a candidate accidentally hitting `/api/v1/recruiter/overview`) will clear the token and redirect to login, even though the token is perfectly valid — the user just doesn't have the required role. This is unexpected: the user is logged in but gets kicked to the login page.

**Suggested fix:** Only clear the token and redirect on 401. For 403, throw a different error message ("You do not have permission to view this page.") without logging the user out.

---

### BUG-014 · `Register.jsx` — no password strength validation on the frontend
**Severity:** Medium  
**File:** `frontend/src/pages/Register.jsx`, line 64  
```jsx
<input ... placeholder="Min. 8 characters" ... required />
```
**Description:** The placeholder says "Min. 8 characters" but there is no `minLength={8}` attribute on the input, no custom validation, and no backend `@Size` constraint found in the `RegisterRequest` DTO. A 1-character password is accepted silently.

**Suggested fix:** Add `minLength={8}` to the input and add `@Size(min = 8, message = "Password must be at least 8 characters")` to `RegisterRequest.password`.

---

### BUG-015 · `InterviewRoom` — timer does not auto-submit when it reaches zero
**Severity:** Medium (UX/completeness)  
**File:** `frontend/src/pages/InterviewRoom.jsx`, lines ~250–265 (timer effect)  
**Description:** The timer counts down to 0 and stops, but nothing happens. The candidate could ignore it and take unlimited time. There is no auto-submit or even a visual "time's up" warning that prompts them to submit. This makes the timer purely cosmetic.

**Suggested fix:** When `timeLeft` reaches 0, either auto-call `handleNext()` if there is an answer, or display a prominent "Time is up! Please submit your answer." prompt with the submit button highlighted.

---

### BUG-016 · Scorecard `handleCopyLink` fails silently if `navigator.clipboard` is unavailable
**Severity:** Low  
**File:** `frontend/src/pages/Scorecard.jsx`, lines 144–152  
```js
navigator.clipboard.writeText(url).then(() => { ... });
```
**Description:** `navigator.clipboard` is `undefined` on non-HTTPS pages and in some browsers without the Permissions API. The `.then()` is never called and the `.catch()` is missing, so the copy button appears to click but does nothing and there is no error feedback.

**Suggested fix:** Add `.catch(() => setError('Could not copy link — try copying the URL bar instead.'))` or fall back to `document.execCommand('copy')` for older browsers.

---

### BUG-017 · `AiServiceClient` — no retry logic; single transient failure fails the request
**Severity:** Low-Medium  
**File:** `backend/src/main/java/com/aiinterview/service/AiServiceClient.java`  
**Description:** The `HttpClient` makes one attempt and throws on any non-2xx response or connection failure. The AI service itself uses `max_retries` (from `get_max_retries()`) internally for Gemini calls, but the Spring→FastAPI HTTP call has no retry. A single transient TCP reset (e.g., during a container restart) causes the end-user request to fail immediately.

**Suggested fix:** Wrap `httpClient.send()` with a simple retry loop (2–3 attempts with exponential backoff) for `IOException` and 5xx responses.

---

## 3. Improvement Suggestions

### IMPROVE-001 · Replace in-memory session store with Redis
**Files:** `ai-service/app/interview/session_manager.py`  
Addresses BUG-001 and BUG-007. Redis also gives TTL-based eviction for free. FastAPI with `aioredis` or `redis-py` is straightforward to integrate.

---

### IMPROVE-002 · Eliminate the double Gemini call (see BUG-002) and use the stored analysis as the source of truth
When the user uploads a CV and then returns to the page, the app correctly loads the stored analysis from `GET /api/v1/resumes/{id}/analysis`. The live upload path should do the same: call Gemini once (server-side, post-commit), store the result, and return the stored analysis in the 201 response body. This avoids a second Gemini round-trip and makes the codebase consistent.

---

### IMPROVE-003 · Add a loading skeleton or progress bar for the AI analysis step
**File:** `frontend/src/pages/CVUpload.jsx`  
The "Analyzing your resume with AI..." spinner gives no indication of how long the call will take. Gemini calls can take 3–10 seconds. A step-by-step progress indicator ("Uploading... Extracting text... Analyzing with AI... Done") would reduce perceived wait time and prevent users from clicking Analyze again.

---

### IMPROVE-004 · `InterviewRoom` debug console.log statements should be removed from production
**File:** `frontend/src/pages/InterviewRoom.jsx`  
There are ~30 `console.log()` calls in `InterviewRoom.jsx` alone, including logging full resume text and skill arrays. This leaks candidate data to anyone with browser dev tools open. Strip debug logs before production builds, or guard them behind `process.env.NODE_ENV === 'development'`.

---

### IMPROVE-005 · Add N+1 query safeguard on `InterviewSession` turns
**File:** `backend/src/main/java/com/aiinterview/entity/InterviewSession.java`, line 135  
`@ElementCollection(fetch = FetchType.EAGER)` loads all turns on every `InterviewSession` load. For the recruiter overview (`RecruiterDashboardService`), which loads many sessions at once, this is an N+1 query (one SELECT per session to load its turns). Add `@BatchSize(size = 50)` to batch the element collection queries, or switch to a JOIN FETCH in the repository query.

---

### IMPROVE-006 · `ResumeAnalysis` entity — no cascade delete from `Resume`
**File:** `backend/src/main/java/com/aiinterview/entity/Resume.java`  
There is no `@OneToOne(cascade = CascadeType.REMOVE)` or `@OnDelete(action = OnDeleteAction.CASCADE)` between `Resume` and `ResumeAnalysis`. Deleting a resume via `ResumeServiceImpl.deleteResume()` calls `resumeRepository.delete(resume)`, which deletes the `resumes` row. If the `resume_analysis.resume_id` FK has no `ON DELETE CASCADE` in the migration SQL, this will throw a FK constraint violation at the database level. The physical file is deleted first, so the file is gone but the DB row remains intact and the request fails.

**Suggested fix:** Add `ON DELETE CASCADE` to the `resume_analysis.resume_id` FK in the Flyway migration, or map the relationship in Java and add `CascadeType.REMOVE`.

---

### IMPROVE-007 · RAG pipeline re-loads and re-splits all documents on every query
**File:** `ai-service/app/rag/pipeline.py`, `run_rag_query()`, lines 188–220  
Every call to `run_rag_query()` calls `load_all_documents()` and `split_documents()` before checking the vector store. `get_or_create_vector_store()` is expected to short-circuit when the store already exists, but the document loading and splitting always runs. On a large documents directory this adds latency to every RAG-backed endpoint.

**Suggested fix:** Move document loading/splitting inside the `force_rebuild=True` branch only, and pass `None` (or the existing store) to `get_or_create_vector_store` otherwise.

---

### IMPROVE-008 · `CVUpload` — `handleReset` does not clear `resumeId` or `resumeText` from sessionStorage
**File:** `frontend/src/pages/CVUpload.jsx`, lines 181–192  
```jsx
const handleReset = () => {
  setFile(null);
  setAnalysis(null);
  setError('');
  setShowManualSelection(false);
  setActiveTab('career');
  sessionStorage.removeItem('resumeAnalysis');
  sessionStorage.removeItem('selectedJobField');
  sessionStorage.removeItem('selectedJobFieldName');
  sessionStorage.removeItem('skillGapResult');
};
```
`resumeId` and `resumeText` are NOT cleared. If the user clicks "Re-upload" and then uploads a new CV, the old `resumeId` persists in sessionStorage until the new upload overwrites it. There is a brief window where `SkillGap.jsx` would run an analysis using the old `resumeId` (from its `const resumeId = sessionStorage.getItem('resumeId') || '1'` fallback) paired with a new `resumeText`.

**Suggested fix:** Add `sessionStorage.removeItem('resumeId')` and `sessionStorage.removeItem('resumeText')` to `handleReset()`.

---

### IMPROVE-009 · No rate-limiting or brute-force protection on `/api/v1/auth/login`
**File:** `backend/src/main/java/com/aiinterview/controller/AuthController.java`  
The login endpoint has no attempt throttling, account lockout, or CAPTCHA. A credential-stuffing attack can make unlimited login attempts. Spring Security's built-in account locking (`UserDetails.isAccountNonLocked()`) exists but is not enabled — `CustomUserDetailsService` presumably returns a `User` with all flags set to `true`.

**Suggested fix:** Add Spring Security's failed-login event listener and lock accounts after N failures (5–10), or add a rate-limit filter using Bucket4j.

---

### IMPROVE-010 · `ai-service.internal-api-key` allowed to be empty at startup in application.yml
**File:** `backend/src/main/resources/application.yml`, line 79  
```yaml
internal-api-key: ${AI_SERVICE_INTERNAL_API_KEY:}
```
The empty-string default means the property resolves to `""` instead of causing a startup failure when `AI_SERVICE_INTERNAL_API_KEY` is unset. `AiServiceClient`'s constructor does throw `IllegalStateException` when the key is empty — so startup fails correctly — but the `application.yml` comment says "Startup fails without it" which is achieved by `AiServiceClient`, not by removing the `:` default here. This is fine as-is but confusing: the YAML suggests a default exists when none is intended.

**Suggested fix:** Change to `${AI_SERVICE_INTERNAL_API_KEY}` (no colon fallback) to make the intent explicit, and add a comment that `AiServiceClient` enforces non-empty regardless.

---

### IMPROVE-011 · `InterviewRoom` — speech synthesis can continue talking after the component unmounts
**File:** `frontend/src/pages/InterviewRoom.jsx`, cleanup `useEffect`  
There are two separate cleanup `useEffect` hooks that both cancel speech synthesis — one for unmount (dependency `[]`) and one for question changes (dependency `[qIndex, speechSupported]`). Both are needed and correct, but `speechSupported` in the second effect is a derived constant (evaluated once per render), not stable state, so putting it in the dep array causes the cleanup to run on every render where `speechSupported` changes — which only happens on the first render (from `undefined` to `true`/`false`). This is harmless but noisy. The effect should either have `[]` deps or compute `speechSupported` inside the effect body.

---

### IMPROVE-012 · No OpenAPI/Swagger docs for the AI service's internal endpoints
**File:** `ai-service/app/main.py`  
The FastAPI app has Swagger UI at `/docs`, but none of the endpoints have `summary`, `description`, or `response_model` documentation beyond the basic Pydantic schemas. Adding `@app.post(..., summary="...", response_description="...")` for the key interview/resume endpoints would make the internal API self-documenting for future developers.

---

### IMPROVE-013 · `Progress.jsx` delegates all logic to `InterviewProgress` — no standalone empty state
**File:** `frontend/src/pages/Progress.jsx`  
The entire Progress page is a thin wrapper around `<InterviewProgress compact />`. If the `InterviewProgress` component has its own empty state ("No interviews yet"), the Progress page's heading and the `Start another interview` button are shown regardless, creating a redundant/confusing layout when there are no interviews. Consider passing a slot or prop to hide the outer shell when `InterviewProgress` is empty.

---

## Summary Table

| ID | Severity | Category | One-line description |
|----|----------|----------|---------------------|
| BUG-001 | Critical | Data loss | In-memory AI sessions lost on restart |
| BUG-002 | Critical | Cost/correctness | Double Gemini call on every CV upload |
| BUG-003 | High | Observability | JWT filter swallows all exceptions silently |
| BUG-004 | High | Security | File storage path not validated against base dir |
| BUG-005 | Med-High | UX | No client-side file size check before upload |
| BUG-006 | Med-High | Security | CORS multi-origin env var parsed as one origin |
| BUG-007 | Med-High | Memory | In-memory session dict never pruned |
| BUG-008 | Medium | React | Missing useEffect deps in InterviewRoom |
| BUG-009 | Medium | React | runSkillGapAnalysis missing from useEffect deps |
| BUG-010 | Low | React | result missing from Scorecard useEffect deps |
| BUG-011 | Medium | UX | "Full Report" button in recruiter view is a stub |
| BUG-012 | Medium | UX | PDF extraction failure hidden from user |
| BUG-013 | Medium | UX | 403 incorrectly clears token and redirects to login |
| BUG-014 | Medium | Security | No frontend or backend password length validation |
| BUG-015 | Medium | UX | Interview timer reaches 0 but takes no action |
| BUG-016 | Low | UX | clipboard.writeText has no catch/fallback |
| BUG-017 | Low-Med | Reliability | AiServiceClient has no retry on transient failures |
| IMPROVE-001 | — | Architecture | Replace in-memory sessions with Redis |
| IMPROVE-002 | — | Cost | Remove redundant server-side Gemini call on upload |
| IMPROVE-003 | — | UX | Add step-by-step upload progress indicator |
| IMPROVE-004 | — | Privacy | Strip/guard debug console.log in production build |
| IMPROVE-005 | — | Performance | N+1 query risk on session turns in recruiter view |
| IMPROVE-006 | — | Data integrity | No cascade delete Resume→ResumeAnalysis |
| IMPROVE-007 | — | Performance | RAG re-loads all docs on every query |
| IMPROVE-008 | — | State | handleReset leaves resumeId/resumeText in session |
| IMPROVE-009 | — | Security | No brute-force protection on login endpoint |
| IMPROVE-010 | — | Clarity | internal-api-key empty default is misleading |
| IMPROVE-011 | — | React | speechSupported in useEffect dep array is unstable |
| IMPROVE-012 | — | DX | AI service endpoints lack OpenAPI documentation |
| IMPROVE-013 | — | UX | Progress page shell shown even when empty |
