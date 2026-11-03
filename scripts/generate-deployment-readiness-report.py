"""Generate the reviewed PDF report.

Run from any directory with Python and reportlab installed. The report is a
point-in-time code review, not a live security audit or an implementation.
"""

from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageBreak, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "reports"
PDF = OUT / "PRE_DEPLOYMENT_READINESS_REPORT.pdf"
DATE = "23 October 2026"
COMMIT = "fabe6b6"

# All findings refer to the snapshot reviewed on the date above. Regenerating
# the PDF does not rerun the review or update the verification results.
FINDINGS = [
    dict(id="F01", priority="P0", title="Align the Java build and runtime",
         evidence="backend/pom.xml:32; backend/Dockerfile:9,26; README.md:9",
         observed="Maven sets java.version to 25, while both Docker stages use Java 23. The root README also describes Java 23. This is a confirmed configuration mismatch; a clean Docker build was not executed during this review.",
         impact="The documented container path cannot compile the configured Java 25 target with a Java 23 compiler. A separately built Java 25 artifact also cannot run on a Java 23 runtime.",
         action="Choose one tested Java baseline and align Maven, the build image, runtime image, CI and documentation. Verify the selected Spring Boot/dependency combination on that baseline. Publish the image only after tests and a clean container build pass.",
         accept="On a clean runner, build the backend image, start it against a fresh database, run all migrations and exercise registration, login and health endpoints successfully.", owner="Backend + DevOps", size="S"),
    dict(id="F02", priority="P0", title="Authorize interview access before forwarding",
         evidence="backend/src/main/java/com/aiinterview/controller/AiProxyController.java:158,175,198,288; backend/src/main/java/com/aiinterview/service/impl/InterviewPersistenceServiceImpl.java:247; ai-service/app/main.py:1262,1912",
         observed="Answer and finish requests are forwarded to Python before the persistence recorder checks ownership. The recorder refuses a foreign owner only after the AI operation has happened. Python resolves the session by the submitted session_id and receives no end-user identity. The model-answer route also forwards without an ownership guard.",
         impact="An authenticated user who obtains another session ID can potentially change that live interview or retrieve its finish response. UUID randomness reduces guessing; it does not provide authorization. This finding follows the code path; no attack against live data was performed.",
         action="Load the session using the authenticated user and reject unauthorized access before any AI call. Require a durable owner mapping at session creation; do not allow unrecorded sessions to bypass the check. Restrict candidate actions by server-side role. Apply the same guard to every session-dependent endpoint. [S2]",
         accept="With users A and B, B's answer, finish and session-dependent model-answer requests for A return 403 or 404, make zero downstream AI calls and leave all state unchanged. Test this through the real Spring security filter chain.", owner="Backend", size="M"),
    dict(id="F03", priority="P0", title="Enforce exam rules on the server",
         evidence="backend/src/main/java/com/aiinterview/controller/AiProxyController.java:198; ai-service/app/interview/schemas.py:53,117; ai-service/app/main.py:1789; frontend/src/pages/InterviewRoom.jsx:549,1321; backend/src/main/java/com/aiinterview/service/impl/JobPostingServiceImpl.java (applyInvite)",
         observed="The UI hides model answers in exam mode, but the backend model-answer route has no exam-mode check. Python's start schema and live session model do not carry exam mode or a question deadline. Timing is managed in React. The invite path correctly replaces the job description, field and mode, but browser-supplied skill arrays remain in the forwarded body.",
         impact="Direct API requests can obtain generated help for an active exam question and avoid the browser timer. Multiple active starts can also pass the existing completed-attempt check. Recruiter results are therefore not yet protected as controlled assessments.",
         action="Persist exam policy and question deadlines on the server, enforce turn order and late-answer rules, and deny model answers until the allowed review phase. Use trusted stored assessment context. Reserve an attempt atomically before AI generation and enforce the agreed retake policy.",
         accept="Direct API calls cannot reveal an active exam answer, bypass its deadline, inject trusted skill context or open concurrent attempts beyond policy. Practice mode still supports its intended feedback flow.", owner="Backend + AI", size="L"),
    dict(id="F04", priority="P1", title="Complete account security and recovery",
         evidence="backend/src/main/java/com/aiinterview/dto/RegisterRequest.java:26; backend/src/main/java/com/aiinterview/service/impl/AuthServiceImpl.java:31,66; backend/src/main/java/com/aiinterview/config/AdminAccountInitializer.java:44; frontend/src/App.jsx:93",
         observed="Registration and login exist, with BCrypt and a six-character minimum. No email-verification, password-reset, password-change or MFA workflow was found. Administrator promotion trusts the registered email string; registration does not establish ownership of that mailbox.",
         impact="Users cannot recover accounts through a supported flow. Open registration permits unverified mailbox claims, which is especially risky when bootstrapping an administrator by email.",
         action="Add expiring, single-use email verification and password-reset tokens, a password-change flow with reauthentication, stronger password rules and throttling. Require verified control of the administrator identity or provision it through a controlled operator process; require MFA for privileged accounts. Avoid revealing account existence in recovery responses. [S6]",
         accept="Unverified users cannot claim privileged identities. Reset links expire, cannot be reused and revoke previous sessions according to policy. Privileged login requires the configured second factor.", owner="Backend + Frontend", size="L"),
    dict(id="F05", priority="P1", title="Harden token storage and revocation",
         evidence="frontend/src/services/api.js:12; frontend/src/App.jsx:76; backend/src/main/resources/application.yml:83; backend/src/main/java/com/aiinterview/security/JwtAuthenticationFilter.java; backend/src/main/java/com/aiinterview/security/JwtService.java (isTokenValid); backend/src/main/java/com/aiinterview/security/CustomUserDetailsService.java",
         observed="A bearer token is stored in localStorage and defaults to a 24-hour lifetime. Logout removes browser storage only. No token revocation or refresh-token lifecycle was found. UserDetails marks inactive accounts disabled, but the JWT filter authenticates based on signature, subject and expiry without checking isEnabled().",
         impact="A stolen token remains usable after browser logout. Disabling an account blocks new login but does not, in the inspected JWT path, reject an existing token. localStorage makes bearer tokens accessible to injected JavaScript; no XSS exploit was demonstrated.",
         action="Check account status on every authenticated request. Introduce short-lived access tokens and a revocable session/refresh mechanism. Prefer a same-origin HttpOnly, Secure cookie or BFF design where appropriate; if cookies authenticate requests, implement CSRF protection. Add a restrictive CSP and a clear session-expiry experience. [S7]",
         accept="Previously issued tokens fail immediately after account disable or explicit revocation. Password reset and logout follow a documented revocation policy. Cookie and CSRF behavior is covered by integration tests.", owner="Backend + Frontend", size="M"),
    dict(id="F06", priority="P1", title="Add abuse limits and AI cost controls",
         evidence="backend/src/main/java/com/aiinterview/config/SecurityConfig.java:38; backend/src/main/java/com/aiinterview/controller/AiProxyController.java; ai-service/app/interview/schemas.py:53,99; ai-service/app/llm_config.py:97; ai-service/app/ai_errors.py",
         observed="Authentication gates AI calls, and provider quota errors are translated, but no application-side per-user/IP throttles, daily budgets or concurrency controls were found. Core CV, answer and interview fields have minimum lengths without consistent maximum lengths. The 10 MB multipart limit does not bound JSON request bodies.",
         impact="Automated registrations or repeated authenticated requests can consume provider quota, occupy workers and exhaust storage. Handling a provider 429 occurs after the provider limit is reached.",
         action="Add login/registration throttles, per-user AI quotas, per-operation concurrency caps and an operator budget stop. Bound JSON bytes, text lengths, skill-list counts, output tokens and total operation time. Track usage without logging CV text; propagate useful retry timing.",
         accept="Requests above configured limits return controlled errors before a provider call. Oversized JSON and excessive lists are rejected at both edge and application layers. A budget alarm and stop are demonstrated in staging.", owner="Backend + AI + DevOps", size="M"),
    dict(id="F07", priority="P1", title="Isolate and bound CV file processing",
         evidence="backend/src/main/java/com/aiinterview/service/impl/ResumeServiceImpl.java:38,79; backend/src/main/java/com/aiinterview/service/impl/FileStorageServiceImpl.java:33; backend/src/main/java/com/aiinterview/service/PdfTextExtractionService.java; backend/src/main/java/com/aiinterview/controller/ResumeController.java",
         observed="Uploads check extension/MIME metadata and have a 10 MB cap. PDFBox parses files and OCR renders every scanned page at 300 DPI. There is no explicit page/pixel/time budget, quarantine/scanning step or isolated parser worker in the inspected path. The stored name still includes the original filename.",
         impact="A small but expensive or malformed PDF can use substantial CPU or memory. OCR and parsing run synchronously. Failed extraction is saved as FAILED internally, while the response DTO does not expose processingStatus.",
         action="Use a generated storage key with a fixed PDF suffix and validated display metadata. Validate file structure, reject unsupported/encrypted documents clearly, and apply page, pixel, CPU, memory and wall-clock limits. Process untrusted files in an isolated worker; quarantine and scan as appropriate. Expose status and retry behavior. [S3]",
         accept="Text PDFs and scanned PDFs succeed. Malformed, encrypted, oversized, excessive-page and resource-heavy inputs fail safely without blocking other users. Failed work can be retried and does not leave uncontrolled orphan files.", owner="Backend + DevOps", size="L"),
    dict(id="F08", priority="P1", title="Recover live interviews and serialize updates",
         evidence="ai-service/app/interview/session_manager.py:134; ai-service/app/main.py:1229,1903; frontend/src/services/api.js:515; backend/src/main/java/com/aiinterview/entity/InterviewSession.java",
         observed="Completed history is stored in PostgreSQL, but Python keeps the working session in a process-local dictionary with an idle TTL. No rehydration path was found. The frontend getSession helper explicitly documents an unimplemented endpoint. No durable turn version or cross-worker session lock was found.",
         impact="Restarting Python or routing to another worker loses access to active state. Parallel answer/finish requests can race. A browser-side submit guard cannot serialize direct API requests.",
         action="Persist sufficient working state to restore a session, using PostgreSQL or a shared store with an explicit durability policy. Implement authorized resume/status endpoints and versioned turn transitions. Add per-session locking or optimistic concurrency, graceful draining and an abandoned-session policy.",
         accept="Refresh the browser and restart the AI worker mid-interview, then resume without losing an accepted answer. Duplicate/concurrent requests produce one valid transition. Two workers return consistent state, or deployment is explicitly restricted to one worker until this is implemented.", owner="AI + Backend", size="L"),
    dict(id="F09", priority="P1", title="Make assessment persistence reliable",
         evidence="backend/src/main/java/com/aiinterview/controller/AiProxyController.java:272,288; backend/src/main/java/com/aiinterview/service/impl/InterviewPersistenceServiceImpl.java:74,184; ai-service/app/main.py:1923",
         observed="The gateway returns successful AI responses even if recording fails, logging the error only. Existing record-start and record-finish checks reduce duplicate database writes; Python also caches finished evaluation. These measures do not make the full request durable or idempotent across failures and retries.",
         impact="A candidate can see a result that never reaches recruiter history. A lost start record also prevents reliable ownership checks. Retrying an answer after a lost response can advance the interview twice.",
         action="Create the authorized attempt durably before AI work. Assign idempotency keys and turn IDs, save accepted inputs and results durably, and reconcile incomplete work through an outbox/job mechanism or equivalent. Surface pending persistence instead of silently treating an unrecorded exam as complete.",
         accept="Inject a database failure and a network timeout at start, answer and finish. Recovery records the result once, retries return the same accepted turn, and the candidate and recruiter eventually see the same outcome.", owner="Backend + AI", size="L"),
    dict(id="F10", priority="P1", title="Provide a production HTTPS entry point",
         evidence="docker-compose.yml:22,71,99; frontend/nginx.conf:1; frontend/src/services/api.js:5; backend/src/main/java/com/aiinterview/config/SecurityConfig.java:38",
         observed="Compose publishes database, backend and frontend ports. The bundled Nginx serves static files over HTTP and does not proxy the API or terminate TLS. No production edge configuration, certificate renewal, CSP or separate production profile was found. An external hosting service may provide some controls, but none was inspected.",
         impact="Deploying the current local defaults directly leaves an unsuitable public boundary and HTTP API configuration. Security headers on frontend documents need their own configuration; backend defaults do not cover them.",
         action="Add a production Compose override or equivalent hosting configuration. Expose HTTPS through one reverse proxy/load balancer, route /api to Spring and keep PostgreSQL, FastAPI and internal backend ports private. Configure certificates, renewal, exact origins, CSP, content-type protection and HSTS after HTTPS is validated. Restrict production API docs if unnecessary. [S4]",
         accept="From outside the deployment network only intended public ports are reachable. HTTP redirects to HTTPS, browser API calls use the real domain, certificates renew, deep links work and response headers are verified.", owner="DevOps", size="M"),
    dict(id="F11", priority="P1", title="Remove database defaults and separate privileges",
         evidence="docker-compose.yml:19,20,75,76; backend/src/main/resources/application.yml:29; .gitignore; backend/src/main/java/com/aiinterview/config/AdminAccountInitializer.java",
         observed="JWT and internal AI keys are required, and local environment files are ignored. Database credentials still fall back to a known development password, and the application connects as postgres. No separate migration/application database roles or managed secret rotation procedure was found. Actual .env values and Git history were not inspected.",
         impact="A missing production variable can silently select the development credential. A compromised application using the administrative database role has a wider impact than a restricted runtime role.",
         action="Require production database credentials explicitly. Separate schema-migration and runtime roles with minimum permissions. Use the hosting secret store or protected secret files, define key rotation and restrict administrator bootstrap. Scan the repository and release artifacts for secrets without printing them into logs.",
         accept="Production startup fails when required credentials are missing. The runtime role cannot administer roles or drop schemas. A rotation drill succeeds, and no credentials appear in browser bundles or published artifacts.", owner="DevOps + Backend", size="M"),
    dict(id="F12", priority="P1", title="Prove backup, restore and migration safety",
         evidence="docker-compose.yml:115; backend/src/main/resources/application.yml:44; backend/src/main/resources/db/migration/V3__interview_persistence.sql:34; README.md (Docker teardown instructions)",
         observed="Named volumes preserve PostgreSQL, uploaded PDFs and the Chroma index across container replacement. No scheduled backup, off-host copy, retention schedule or restore runbook was found. V3 deliberately drops legacy interview tables, and baseline-on-migrate is enabled for older databases.",
         impact="Persistent volumes do not protect against host loss, operator deletion or bad migrations. Reusing an older populated database without rehearsal may lose legacy interview rows when V3 is first applied.",
         action="Back up PostgreSQL and uploaded CVs consistently, encrypt copies, store them off-host and rehearse restoration. Version the knowledge-base corpus and record how its index is rebuilt. Test both fresh and supported upgrade paths on sanitized data. Do not edit already applied Flyway migrations; use a reviewed forward migration when needed. [S5]",
         accept="Restore a clean staging deployment from backups and verify files, account ownership and scorecards. Record measured recovery time/data loss. Suggested pilot targets are RPO <=24 hours and RTO <=4 hours; agree stricter targets before broader recruitment use.", owner="DevOps + Backend", size="M"),
    dict(id="F13", priority="P1", title="Add actionable monitoring and incident procedures",
         evidence="backend/src/main/java/com/aiinterview/controller/HealthController.java; ai-service/app/main.py:323; ai-service/app/llm_config.py:173; backend/src/main/resources/application.yml:59; backend/src/main/java/com/aiinterview/exception/GlobalExceptionHandler.java",
         observed="Container health checks exist, but the Spring endpoint returns UP without checking dependencies. Python reports healthy and whether a key is present; that does not prove retrieval readiness. Logs are mainly application prints/standard logs, SQL logging is enabled, and generic error handling includes exception text. No metrics/alerts/runbooks were found.",
         impact="The host can look healthy while core journeys fail. Operators lack request correlation, latency/error/cost trends and alerts. Raw exception details and request logging can expose internals or personal information.",
         action="Separate liveness and readiness, using lightweight dependency checks and cached provider status rather than a billable LLM call on every probe. Add structured logs, correlation IDs, metrics and redaction. Monitor AI latency, persistence failures, DB capacity, OCR failures and cost. Return safe errors with an incident ID and document response procedures.",
         accept="Dependency outages change readiness appropriately, a synthetic critical-journey failure triggers an alert to the responsible operator, and one incident can be traced without exposing CVs, answers or tokens.", owner="DevOps + Backend + AI", size="M"),
    dict(id="F14", priority="P1", title="Complete privacy and data lifecycle controls",
         evidence="frontend/src/components/Footer.jsx:43; frontend/src/App.jsx:93; frontend/src/pages/JoinInterview.jsx:133; backend/src/main/java/com/aiinterview/controller/UserController.java; backend/src/main/java/com/aiinterview/service/impl/ResumeServiceImpl.java:153; frontend/src/services/api.js:713",
         observed="The invite page already explains recruiter sharing and activity signals. However, the footer explicitly notes that Privacy and Terms pages do not exist. No account export/deletion flow, full retention schedule or versioned acceptance record was found. CV deletion exists, but interview history is retained separately. A skill-gap debug log prints its payload, including resume text, to the browser console.",
         impact="Users lack a complete explanation of storage, AI-provider processing and retention, and cannot manage their full data lifecycle. Deleting one CV does not establish deletion of related personal data everywhere.",
         action="Add accurate privacy/terms pages and just-in-time AI-processing notice; document exactly what reaches the provider, retention and recruiter access. Record required acceptance versions. Provide export and verified deletion/anonymization across records, files, active sessions, caches and backup expiry. Remove sensitive debug payloads and define handling of browser speech features. Have the project owner review jurisdiction-specific obligations.",
         accept="A test user's export is complete and tenant-scoped. A deletion request follows the documented retention policy across stores. Notices match observed behavior, and raw CV text is absent from routine logs. This review does not determine legal compliance.", owner="Product + Backend + Frontend", size="L"),
    dict(id="F15", priority="P1", title="Record privileged actions and data access",
         evidence="backend/src/main/java/com/aiinterview/controller/AdminController.java; backend/src/main/java/com/aiinterview/service/impl/AdminServiceImpl.java; backend/src/main/java/com/aiinterview/service/impl/RecruiterDashboardServiceImpl.java:53; backend/src/main/resources/db/migration",
         observed="Administrator approval and recruiter-scoped data access exist. No dedicated audit-event table or structured protected audit trail was found. Operational logs do not provide a complete actor/action/target/outcome record for approvals, access and deletion.",
         impact="The team cannot reliably explain who approved a recruiter or accessed an assessment, or reconstruct a privilege incident using a consistent retained record.",
         action="Add protected audit events for approval/rejection, privilege changes, authentication risk events, assessment access/export and deletion. Include actor, target ID, timestamp, outcome and correlation ID; exclude tokens and raw CV/answer bodies. Apply access controls and a documented retention policy.",
         accept="A complete administrative and recruiter workflow produces searchable audit events. Normal application users cannot edit or delete them, and access to the audit trail is itself restricted.", owner="Backend + DevOps", size="M"),
    dict(id="F16", priority="P1", title="Validate and govern AI assessment quality",
         evidence="ai-service/app/interview/evaluator.py:91,205; ai-service/app/llm_config.py:97; ai-service/tests/test_answer_fencing.py; ai-service/tests/test_evaluator_references.py; backend/src/main/java/com/aiinterview/entity/InterviewSession.java",
         observed="Existing controls fence candidate answers, clamp scores, compute verdicts in code and include retrieved references. Unit tests cover parts of these controls. No human-labelled benchmark, documented scoring agreement threshold, fairness review or persisted model/prompt/corpus version was found. Model fallback can change the model used for a response.",
         impact="A technically valid score can still be inaccurate or inconsistent across candidates or model changes. Prompt fencing tests establish string handling, not that a model resists all malicious CVs, job descriptions or answers.",
         action="Build a representative, consented or synthetic benchmark with expert-labelled answers. Measure extraction accuracy, score agreement, consistency and unsupported claims. Test indirect prompt injection throughout CV/JD/retrieval inputs and preserve output validation. Store actual model, prompt/rubric and corpus versions with results. Add human review and correction/appeal for consequential recruitment decisions. [S8]",
         accept="A versioned evaluation suite meets written release thresholds before a model/prompt/corpus change is promoted. Failed or weakly grounded grading is visible to candidates and recruiters; browser activity signals remain context, not proof of misconduct.", owner="AI + Product + QA", size="L"),
    dict(id="F17", priority="P2", title="Finish user recovery and support journeys",
         evidence="frontend/src/services/api.js:515; backend/src/main/java/com/aiinterview/dto/ResumeResponseDto.java; frontend/src/pages/CVUpload.jsx; frontend/src/pages/InterviewRoom.jsx; frontend/src/App.jsx",
         observed="Core CV, interview, history and roadmap journeys are implemented, but session lookup is a documented stub. Processing status is not exposed in the upload response. No dedicated support/contact, account settings or service-status destination was found among the routes.",
         impact="A failed upload, lost interview or provider outage leaves users without a clear route to recover or get help. Good failure behavior matters as much as the successful demo path.",
         action="Add clear pending/failed/retry states, safe recovery from refresh and session expiry, support/contact details, account settings and useful offline/network messages. Give users a reference ID for support. Treat scorecard PDF export and richer recruiter filters as later improvements after release blockers.",
         accept="A new user can recover from failed extraction, an expired login and a temporary provider outage without losing accepted work or needing developer assistance.", owner="Frontend + Product", size="M"),
    dict(id="F18", priority="P2", title="Verify accessibility and browser compatibility",
         evidence="frontend/src/App.jsx:86; frontend/src/pages/InterviewRoom.jsx; frontend/src/pages/RecruiterDashboard.jsx; frontend/src/index.css",
         observed="A skip link, some accessible labels and speech-support checks are present. No automated accessibility test suite or recorded manual browser/assistive-technology test matrix was found. This is an evidence gap; the UI was not visually audited in this review.",
         impact="Keyboard, screen-reader, mobile or speech-unsupported users may encounter issues not covered by a desktop happy-path demo. Timed assessments need an explicit accommodation policy.",
         action="Test keyboard-only use, focus order/return, screen-reader announcements, errors, contrast, zoom and small screens. Verify typed-answer fallback when speech is unsupported or permission is denied. Provide approved timing accommodations. Use WCAG 2.2 AA as the proposed accessibility target, not a claimed certification.",
         accept="Critical candidate, recruiter and admin journeys pass automated checks plus documented manual keyboard, screen-reader and mobile-browser checks; no unresolved accessibility blocker remains in those journeys.", owner="Frontend + QA", size="M"),
    dict(id="F19", priority="P2", title="Make builds and dependency maintenance reproducible",
         evidence="ai-service/requirements.txt:1; frontend/package.json; frontend/package-lock.json; frontend/Dockerfile:9,31; backend/pom.xml; backend/Dockerfile:21; .github",
         observed="The frontend has a lockfile and uses npm ci. Python dependencies mostly use open-ended minimum versions; no Python lockfile was found. Docker base tags are mutable. The frontend uses react-scripts 5 and suppresses CI build-warning failures. No release CI workflow was found; backend image packaging skips tests.",
         impact="Later builds can resolve different AI-library versions, and a container build alone does not prove tests passed. Maintenance and runtime compatibility need a repeatable release process. React has deprecated Create React App for new applications and recommends migration options for existing projects. [S9]",
         action="Lock tested Python dependencies and establish controlled image/dependency updates. Record an SBOM and run dependency, image and secret scans. Pin the runtime baseline, enforce lint/type checks as appropriate and plan migration from CRA to a maintained build setup. Run tests as an explicit pipeline gate even if image packaging skips them.",
         accept="A clean runner reproduces the release dependencies and image metadata. Scans are reviewed and critical findings resolved. The same commit must pass checks before its tagged image is promoted.", owner="DevOps + all developers", size="M"),
    dict(id="F20", priority="P2", title="Measure capacity and bound database queries",
         evidence="backend/src/main/java/com/aiinterview/service/impl/RecruiterDashboardServiceImpl.java:63,80; backend/src/main/java/com/aiinterview/repository/InterviewSessionRepository.java:23,52; backend/src/main/java/com/aiinterview/service/impl/ResumeServiceImpl.java:110; backend/src/main/java/com/aiinterview/service/AiServiceClient.java (REQUEST_TIMEOUT); docker-compose.yml",
         observed="Several endpoints load complete lists; recruiter overview loads all matching sessions and iterates their turn collections. Candidate and job fetch joins are already present, but turn collection behavior still needs query-count measurement. AI calls are synchronous with a 200-second backend timeout. No load-test results or container resource budgets were found.",
         impact="Larger histories and concurrent OCR/AI work can increase response size, database work and memory use. Deployment proxy timeouts may expire before a permitted AI request completes.",
         action="Paginate list endpoints, use aggregate/projection queries for summaries and measure query counts. Add memory/CPU/worker/connection budgets, queue limits and whole-operation deadlines. Align proxy timeouts or use asynchronous jobs for slow work. Benchmark with provider calls mocked first, then run a small explicitly budgeted provider test.",
         accept="At an agreed pilot workload, record p50/p95 latency, error rate, memory and queue depth. A reasonable starting scenario is 20 active interviews and a 1,000-row history, then adjust to the actual launch scale. Demonstrate bounded resource use and controlled overload behavior.", owner="Backend + AI + DevOps", size="M"),
]

SOURCES = [
    ("S1", "OWASP ASVS 5.0.0", "https://asvs.owasp.org/", "Reference framework for a security verification checklist; no ASVS certification is claimed."),
    ("S2", "OWASP Authorization Cheat Sheet", "https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html", "Supports server-side permission checks on each request and at the correct boundary."),
    ("S3", "OWASP File Upload Cheat Sheet", "https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html", "Supports layered upload validation, controlled filenames and safe processing."),
    ("S4", "Docker: Use Compose in production", "https://docs.docker.com/compose/how-tos/production/", "Supports maintaining production-specific deployment configuration."),
    ("S5", "PostgreSQL: Backup and Restore", "https://www.postgresql.org/docs/15/backup.html", "Describes backup approaches; the project uses PostgreSQL 15 in Compose."),
    ("S6", "OWASP Authentication Cheat Sheet", "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html", "Supports password security, recovery, reauthentication and protection of sensitive accounts."),
    ("S7", "OWASP Session Management Cheat Sheet", "https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html", "Supports secure session transport, storage, expiration and invalidation."),
    ("S8", "OWASP GenAI: LLM risks", "https://genai.owasp.org/llm-top-10/", "Reference for prompt injection, sensitive-data exposure, supply-chain and consumption risks; no edition-specific compliance claim."),
    ("S9", "React: Sunsetting Create React App", "https://react.dev/blog/2025/02/14/sunsetting-create-react-app", "Official notice, published 14 February 2025, covering deprecation and migration options."),
]


def make_report():
    OUT.mkdir(parents=True, exist_ok=True)
    font_dir = Path("C:/Windows/Fonts")
    normal, bold = "Helvetica", "Helvetica-Bold"
    if (font_dir / "arial.ttf").exists():
        pdfmetrics.registerFont(TTFont("ReportArial", str(font_dir / "arial.ttf")))
        pdfmetrics.registerFont(TTFont("ReportArialBold", str(font_dir / "arialbd.ttf")))
        normal, bold = "ReportArial", "ReportArialBold"
    navy = colors.HexColor("#12243A")
    teal = colors.HexColor("#087F8C")
    grey = colors.HexColor("#536273")
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle("ReportTitle", fontName=bold, fontSize=29, leading=34, textColor=navy, spaceAfter=17))
    styles.add(ParagraphStyle("ReportH1", fontName=bold, fontSize=19, leading=23, textColor=navy, spaceAfter=13))
    styles.add(ParagraphStyle("ReportH2", fontName=bold, fontSize=12.3, leading=16, textColor=teal, spaceBefore=9, spaceAfter=7))
    styles.add(ParagraphStyle("ReportBody", fontName=normal, fontSize=9.3, leading=13.5, textColor=navy, spaceAfter=7))
    styles.add(ParagraphStyle("ReportSmall", fontName=normal, fontSize=7.7, leading=10.5, textColor=grey, spaceAfter=5, splitLongWords=True))
    styles.add(ParagraphStyle("ReportCell", fontName=normal, fontSize=8, leading=10.7, textColor=navy))
    styles.add(ParagraphStyle("ReportKicker", fontName=bold, fontSize=9, leading=12, textColor=teal, spaceAfter=12))

    story = []

    def para(text, style="ReportBody", prefix=""):
        markup = escape(text)
        if prefix:
            markup = "<b>" + escape(prefix) + "</b> " + markup
        story.append(Paragraph(markup, styles[style]))

    def heading(text, level=1):
        story.append(Paragraph(escape(text), styles["ReportH1" if level == 1 else "ReportH2"]))

    def page(title, label):
        if story:
            story.append(PageBreak())
        para(label.upper(), "ReportKicker")
        heading(title)

    def table(headers, rows, widths):
        data = [[Paragraph("<b>" + escape(v) + "</b>", styles["ReportCell"]) for v in headers]]
        data += [[Paragraph(escape(str(v)), styles["ReportCell"]) for v in row] for row in rows]
        t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E2EDF2")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LINEBELOW", (0, 0), (-1, 0), 0.7, teal),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F4F7FA")]),
        ]))
        story.append(t)
        story.append(Spacer(1, 8))

    def finding(f):
        heading(f"{f['id']}  |  {f['priority']}  |  {f['title']}", 2)
        para(f["observed"], prefix="Observed:")
        para(f["impact"], prefix="Why it matters:")
        para(f["action"], prefix="Add or change:")
        para(f["accept"], prefix="Acceptance check:")
        para(f"Owner: {f['owner']}  |  Relative size: {f['size']}  |  Evidence: {f['evidence']}", "ReportSmall")

    para("ENGINEERING REVIEW / PRE-DEPLOYMENT", "ReportKicker")
    story.append(Paragraph("AI CV Analysis &amp;<br/>Interview Platform", styles["ReportTitle"]))
    heading("Missing requirements and release plan")
    para(f"Reviewed {DATE}  |  Repository snapshot {COMMIT}", "ReportSmall")
    para("Release recommendation: hold public deployment", "ReportH2")
    para("The core product is implemented, but the inspected repository is not ready for unrestricted public use with real CVs or recruiter assessments. Fix the three P0 blockers first, then complete the P1 controls and validate the deployment in staging.")
    table(["Priority", "Count", "Meaning"], [
        ("P0 - Blocker", "3", "Resolve before any external deployment."),
        ("P1 - Required", "13", "Resolve before a public pilot using real candidate data."),
        ("P2 - Improvement", "4", "Complete before broad rollout, or document a scoped pilot deferral."),
    ], [95, 43, 365])
    heading("Start with these concrete fixes", 2)
    for text in [
        "1. Align Java 25 in Maven with the Docker build and runtime images.",
        "2. Check interview ownership before forwarding answer, finish and other session requests to AI.",
        "3. Enforce exam mode, answer visibility, timing and attempt rules on the server.",
        "4. Add HTTPS/private networking, account recovery, quotas and bounded file processing.",
        "5. Prove recovery, monitoring, privacy controls and the full release test pipeline.",
    ]:
        para(text)
    para("This document adds a review and implementation backlog to the project. It does not implement the fixes or deploy the application. Findings are based on source inspection plus the limited checks listed later; no numeric readiness score or compliance certification is claimed.", "ReportSmall")

    page("Scope, baseline and existing strengths", "01 / How to use this report")
    para("Target baseline: a small public pilot with real CV uploads, candidate accounts and recruiter assessments. For a synthetic-data classroom demo, some operational work can be staged later; the P0 defects still need correction. OWASP ASVS 5.0.0 is used as a reference framework, not as a complete requirement-by-requirement audit. [S1]")
    heading("What was inspected", 2)
    para("React routes/API helpers, Spring security/authentication and recruiter/interview/file services, FastAPI schemas and session/scoring paths, database migrations, Docker/Compose/Nginx configuration, dependency manifests and the available tests. Local .env contents were deliberately not read or included. Git history, running production infrastructure and provider account settings were not inspected.")
    heading("Already present - preserve these controls", 2)
    for text in [
        "Authentication: BCrypt password hashing, JWT signature/expiry checks and explicit browser-origin configuration.",
        "Recruiter boundaries: approval is required, recruiter queries are scoped to the recruiter's jobs, and private practice sessions are excluded.",
        "Internal AI access: the browser calls Spring; Python requires a shared internal key and its Compose port is not published.",
        "Durable records: CV metadata, interview history and scorecards are persisted in PostgreSQL, with Flyway migrations and Hibernate schema validation.",
        "Container basics: multi-stage frontend/backend builds, non-root backend/AI processes, named volumes and container health checks.",
        "AI safeguards: candidate-answer fencing, bounded score normalization, grounded references, model fallback/timeouts and explicit failed-grading state.",
        "Candidate transparency: invite acceptance explains what is shared with the recruiter, including browser activity signals.",
    ]:
        para(text)
    heading("Evidence and sizing conventions", 2)
    para("Observed means directly visible in inspected source. Not found means absent from the reviewed repository paths; a hosting provider may supply the capability externally. A code-path finding is not a demonstrated production exploit. S/M/L are relative engineering sizes, not delivery promises. Each finding includes an owner and a check that should be saved as release evidence.")

    page("Three release blockers", "02 / Fix first")
    for f in FINDINGS[:3]:
        # Blockers use a compact layout so all three remain easy to compare.
        heading(f"{f['id']}  |  {f['title']}", 2)
        para(f["observed"])
        para(f["action"], prefix="Required fix:")
        para(f["accept"], prefix="Prove it:")
        para(f"{f['priority']} | {f['owner']} | Size {f['size']} | {f['evidence']}", "ReportSmall")

    groups = [
        ("Identity and session protection", "03 / P1 required", 3, 5),
        ("Abuse resistance and safe CV uploads", "04 / P1 required", 5, 7),
        ("Live interview reliability", "05 / P1 required", 7, 9),
        ("Production network and secrets", "06 / P1 required", 9, 11),
        ("Recovery and operations", "07 / P1 required", 11, 13),
        ("Privacy and accountability", "08 / P1 required", 13, 15),
    ]
    for title, label, start, end in groups:
        page(title, label)
        for f in FINDINGS[start:end]:
            finding(f)

    page("AI quality and release testing", "09 / P1 required")
    finding(FINDINGS[15])
    heading("Missing release test coverage", 2)
    para("Unit tests are already present; the missing part is a repeatable pipeline that proves cross-service behavior. No browser end-to-end suite or release CI workflow was found. Add the following checks before the public pilot:")
    table(["Layer", "Required checks"], [
        ("Security", "Real filter-chain tests: expired/tampered tokens, disabled accounts, pending recruiters, cross-user interview access and cross-recruiter job/result access."),
        ("Integration", "Spring + disposable PostgreSQL + mocked AI; migrate from empty and supported existing schemas; verify owner links, retries and error translation."),
        ("Browser", "Register/login, upload/analyze, practice, invited exam, scorecard, roadmap/progress, recruiter approval and recruiter results."),
        ("Resilience", "Provider timeout/429, DB outage, AI restart, response loss, concurrent submits and file-processing failure."),
        ("Release", "Build all images, scan dependencies/images/secrets, deploy the same tagged images to staging, run smoke checks and rehearse rollback."),
    ], [78, 425])
    para("Run ordinary tests against mocks/synthetic data. Separate any billable provider integration tests and use an explicit budget. CI should preserve test reports and deployment identity. A successful unit suite is necessary but does not establish reliable scoring or safe production operation.", "ReportSmall")

    page("User experience and inclusion", "10 / P2 improvements")
    finding(FINDINGS[16])
    finding(FINDINGS[17])
    heading("Optional features after the deployment work", 2)
    para("Candidate PDF scorecard export, recruiter CSV export, saved filters, email invitations, richer dashboards and job editing can improve the product. They do not replace ownership checks, durability or operational controls. Do not add payments, Kubernetes, video proctoring or a microservice rewrite solely to make this project look more production-ready.")

    page("Maintainability and capacity", "11 / P2 improvements")
    finding(FINDINGS[18])
    finding(FINDINGS[19])

    page("Suggested implementation sequence", "12 / Delivery plan")
    para("Deliver in four milestones. This is an order of work, not a fixed schedule; choose dates after estimating the tasks with the team. The existing React/Spring/FastAPI separation can remain. A single-host pilot is acceptable if its limits, recovery process and operating owner are explicit.")
    table(["Milestone", "Scope", "Exit evidence"], [
        ("A / Correctness", "F01-F03; session owner mapping; trusted exam policy; role/account-status checks from F05.", "Clean image build; pre-forward ownership tests; direct-API exam tests; atomic attempt reservation."),
        ("B / Safe public boundary", "F04-F07, F10-F11; account verification/recovery; limits; HTTPS/private ports; protected credentials.", "Recovery/token tests; oversized/malicious-file tests; external port/TLS checks; quota/budget demo."),
        ("C / Reliable candidate data", "F08-F09, F12-F15; durable sessions; retries; backups; alerts; notices; lifecycle and audit.", "AI/DB restart and timeout tests; restore drill; alert drill; export/deletion and audit evidence."),
        ("D / Prove and release", "F16 and release test pipeline; F17-F20 according to launch scope; staging UAT and measured capacity.", "Versioned AI benchmark; complete role journeys; signed release checklist; tested rollback and named operator."),
    ], [89, 209, 205])
    heading("Recommended production request path", 2)
    table(["Component", "Proposed responsibility / exposure"], [
        ("Browser -> HTTPS edge", "Public domain on 443; TLS, document headers and request-size limits; serve React and route /api to Spring."),
        ("Spring backend", "Private service; authenticate, authorize, enforce exam policy/quotas, own durable attempt state and persist accepted operations."),
        ("FastAPI / parser worker", "Private service; scoped trusted calls, bounded processing and AI generation; shared/recoverable session state as required."),
        ("PostgreSQL / CV storage", "Private database and controlled file store, separate credentials, backups, retention and restore procedures."),
        ("Provider / operations", "Controlled Gemini egress; secret store, usage budgets, metrics, redacted logs and operator alerts."),
    ], [126, 377])
    heading("Likely schema additions", 2)
    para("Verified-email state and single-use recovery tokens; revocable sessions; durable exam policy/deadlines and versioned turns; attempt reservation/idempotency records; consent/notice versions; audit events; deletion/retention jobs; AI model/prompt/rubric/corpus metadata. Use new forward Flyway migrations and test existing data. Store only the data each feature actually needs.")

    page("Public-pilot release checklist", "13 / Go or no-go")
    para("Keep an evidence link, responsible owner and result for every row. All P0 and P1 items should pass before a public pilot with real CVs. P2 deferrals need a named owner, a due date and a clearly limited pilot scope; passing this checklist is not a security certification.")
    table(["Gate", "Required evidence", "Status"], [
        ("Build", "Aligned Java versions; clean tagged builds of all services; dependency compatibility verified.", "OPEN"),
        ("Access", "Cross-user and cross-recruiter denials occur before any state change; disabled accounts rejected.", "OPEN"),
        ("Exam", "Server-side deadlines, model-answer restrictions, atomic attempts and trusted input policy proven.", "OPEN"),
        ("Accounts", "Verified identity, safe reset/change-password, privileged MFA and session revocation tested.", "OPEN"),
        ("Edge", "Real HTTPS domain; private internal ports; browser origins/headers; protected secrets and DB role.", "OPEN"),
        ("Abuse / files", "Per-user/IP quotas, concurrency/budget caps, bounded JSON and isolated/bounded PDF processing.", "OPEN"),
        ("Durability", "Restart/resume, idempotent retries and fault-injected persistence recovery pass.", "OPEN"),
        ("Data lifecycle", "Accurate notices, recruiter sharing, export/deletion/retention behavior and audit records verified.", "OPEN"),
        ("Recovery", "Off-host database/file backups restored successfully; RPO/RTO and rollback recorded.", "OPEN"),
        ("Operations", "Dependency readiness, alerts, redaction, incident runbook and named operator demonstrated.", "OPEN"),
        ("AI quality", "Approved benchmark, failure transparency, model/prompt/corpus metadata and human-review policy.", "OPEN"),
        ("Journeys", "Automated critical-role journeys and manual UAT; browser/accessibility/capacity checks recorded.", "OPEN"),
    ], [76, 378, 49])
    heading("Release and rollback notes", 2)
    para("Deploy the exact images tested in staging. Back up before schema changes, verify migration compatibility with the previous application version, and keep previous image digests available. Rolling back the application does not automatically roll back database changes; choose a tested forward-fix or restore plan. Check health, login, one synthetic CV journey and one synthetic recruiter workflow after release.")

    page("Checks performed and review limits", "14 / Verification record")
    para(f"Review date: {DATE} (Asia/Colombo). Source snapshot: {COMMIT}. The working tree was clean at the initial inspection. Documentation added by this review is separate from application behavior.")
    table(["Check", "Result / interpretation"], [
        ("Static source review", "Confirmed Java mismatch; pre-forward interview authorization gap; missing server-side exam restrictions; assessed the configuration and feature gaps in F01-F20."),
        ("Python: session TTL", "4 tests passed using ai-service/.venv/Scripts/python.exe -m unittest discover -s tests -p test_session_ttl.py -v."),
        ("Python: LLM config", "6 tests passed with the same command pattern for test_llm_config.py."),
        ("Python: answer fencing", "5 tests passed for test_answer_fencing.py. These validate prompt construction, not model compliance."),
        ("Python: reference mapping", "6 tests passed for test_evaluator_references.py. These validate reference/scorecard transformation, not score correctness."),
        ("Backend tests", "Attempted offline. The Windows Maven wrapper failed with 'Cannot index into a null array'. System Maven then hit a sandbox cache-path restriction; an authorized retry started but the JVM terminated on native-memory allocation failure. No passing backend suite is claimed."),
        ("Runtime note", "The selected local Python environment was 3.10.11 and emitted a provider-library support warning; the AI Dockerfile uses Python 3.11. Align local/CI/container runtimes and verify supported versions."),
        ("Not executed", "Full Docker build/start, frontend production build, browser/UAT/accessibility tests, live Gemini evaluation, penetration/load tests and backup restore. No production host or firewall was inspected."),
        ("Secret handling", "No actual .env values were read. Current .env paths were absent from git ls-files output; this does not prove that secrets have never existed in history."),
    ], [126, 377])
    heading("What the test results establish", 2)
    para("21 selected Python unit tests passed. They are narrow evidence for existing safeguards, not a full application test result. The backend attempt was inconclusive because of the execution environment. Re-run the complete suites on a clean, adequately resourced runner and retain the logs before release.")
    heading("Priority interpretation", 2)
    para("The readiness recommendation is an engineering judgment based on the reviewed repository. Infrastructure controls supplied outside this repository may close individual findings once configuration and test evidence are provided. Legal obligations, hosting costs and delivery dates require the actual deployment scope; none is asserted here.")

    page("References and finding register", "15 / Supporting material")
    para("Primary guidance was checked online during the review. Findings are project-specific engineering recommendations; references support the baseline and do not prove a vulnerability in this application. Accessed 23 October 2026.", "ReportSmall")
    for sid, title, url, note in SOURCES:
        story.append(Paragraph(f'<b>[{sid}] {escape(title)}</b> - {escape(note)}<br/><link href="{escape(url)}" color="#087F8C">{escape(url)}</link>', styles["ReportSmall"]))
    page("Implementation backlog", "16 / Team handoff")
    para("Use this register to create project issues. Start with P0, then complete P1 before a public pilot with real CVs. The detailed finding contains the acceptance check; copy it into the issue so completion is verifiable.")
    table(["ID", "Priority", "Work item", "Owner / size"], [
        (f["id"], f["priority"], f["title"], f["owner"] + " / " + f["size"])
        for f in FINDINGS
    ], [36, 43, 275, 149])
    heading("Suggested ticket completion record", 2)
    para("For each issue record the assignee, due date, implementation PR, test or staging evidence, reviewer and residual limitation. Keep the status OPEN until its acceptance check has passed. Update the report source when the team closes findings; regenerating the PDF alone does not revalidate the code.")

    width, height = A4

    def decoration(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(navy)
        canvas.rect(0, height - 8 * mm, width, 8 * mm, fill=1, stroke=0)
        canvas.setStrokeColor(colors.HexColor("#CDD8E2"))
        canvas.line(19 * mm, 18 * mm, width - 19 * mm, 18 * mm)
        canvas.setFillColor(grey)
        canvas.setFont(normal, 7)
        canvas.drawString(19 * mm, 13 * mm, f"AI CV & Interview Platform  |  {DATE}  |  Review {COMMIT}")
        canvas.drawRightString(width - 19 * mm, 13 * mm, str(doc.page))
        canvas.restoreState()

    class ReportDocument(BaseDocTemplate):
        def afterFlowable(self, flowable):
            if isinstance(flowable, Paragraph) and flowable.style.name == "ReportH1":
                key = "section-" + str(self.page)
                self.canv.bookmarkPage(key)
                self.canv.addOutlineEntry(flowable.getPlainText(), key, level=0, closed=False)

    doc = ReportDocument(str(PDF), pagesize=A4, leftMargin=19 * mm,
                          rightMargin=19 * mm, topMargin=17 * mm,
                          bottomMargin=23 * mm,
                          title="AI CV Analysis System - Pre-deployment Readiness Report",
                          author="Project engineering review", subject="Missing requirements, priorities and release acceptance checks")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, leftPadding=0,
                  rightPadding=0, topPadding=0, bottomPadding=0)
    doc.addPageTemplates(PageTemplate(id="report", frames=[frame], onPage=decoration))
    doc.build(story)
    print(f"PDF: {PDF}")


if __name__ == "__main__":
    make_report()
