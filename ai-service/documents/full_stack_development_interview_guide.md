# Full Stack Development Interview Knowledge Guide

```yaml
job_field: full_stack_development
job_field_name: Full Stack Development
canonical_topics:
  - full_stack_overview
  - frontend_backend_integration
  - api_contracts
  - end_to_end_authentication
  - end_to_end_authorization
  - cors_and_cookies
  - application_architecture
  - data_flow
  - database_for_full_stack
  - rendering_strategy
  - environment_configuration
  - full_stack_deployment
  - full_stack_testing
  - full_stack_security
  - full_stack_performance
  - devops_fundamentals_for_developers
difficulty:
  - easy
  - medium
  - hard
```

This document is the canonical interview knowledge base for the
**full_stack_development** job field. It deliberately does **not** re-teach React
internals or SQL indexing — those live in the frontend and backend guides. What it owns
is the **seam**: contracts between layers, authentication that spans browser and server,
CORS and cookies in practice, end-to-end data flow, environment configuration, and
shipping one application composed of several parts.

---

## 1. Job Field Overview

```yaml
job_field: full_stack_development
topic: full_stack_overview
difficulty: easy
keywords: [full_stack, generalist, end_to_end, ownership, responsibilities]
```

A full stack developer builds and operates a feature across every layer: the user
interface, the API, the persistence layer, and the deployment that ties them together.
The distinguishing skill is not encyclopedic depth in each layer but the ability to
reason about a feature end to end and to place each responsibility where it belongs.

Typical responsibilities:

- Design a feature from database schema through API contract to UI.
- Decide what belongs on the client and what must stay on the server.
- Implement authentication and authorization consistently across both.
- Debug problems that cross layers, where each layer's logs look innocent.
- Deploy and configure the application in multiple environments.
- Own the feature's tests at unit, integration, and end-to-end level.

**The defining judgement in this field:** knowing which layer owns a given concern.
Validation belongs in both places for different reasons (UX in the client, correctness on
the server). Authorization belongs only on the server. Formatting for display belongs
only on the client. Candidates who cannot make these calls are frontend or backend
developers who have used the other side, not full stack developers.

Typical stacks: React with Spring Boot and PostgreSQL; React with Node.js/Express and
PostgreSQL; React with FastAPI or Django. The stack varies; the seam does not.

---

## 2. Core Competencies

```yaml
job_field: full_stack_development
topic: core_competencies
difficulty: easy
keywords: [competencies, full_stack_skills, evaluation]
```

1. **Frontend fundamentals** — HTML, CSS, JavaScript/TypeScript, a component framework
   such as React.
2. **Backend fundamentals** — a server language and framework, HTTP, REST API design.
3. **Relational databases** — schema design, SQL, migrations, basic indexing.
4. **API contract design** — request and response shapes, error format, versioning.
5. **Authentication and authorization across the boundary** — sessions or tokens,
   cookies, refresh flows, server-side enforcement.
6. **Cross-origin behaviour** — CORS, cookie attributes, proxying.
7. **Application architecture** — where logic lives, how data flows, module boundaries.
8. **Environment configuration** — build-time versus runtime config, secrets handling.
9. **Deployment** — building and shipping frontend and backend artifacts, health checks,
   rollback.
10. **Testing across layers** — unit, integration, contract, end-to-end.
11. **Debugging across layers** — correlating a browser symptom to a server cause.
12. **DevOps fundamentals** — containers, CI/CD, logs, basic observability.
13. **Security across layers** — input validation, XSS, CSRF, injection, secrets.

---

## 3. Foundational Knowledge

### 3.1 The Request Lifecycle End to End

```yaml
job_field: full_stack_development
topic: data_flow
difficulty:
  - easy
  - medium
keywords: [request_lifecycle, end_to_end, dns, tls, api_call, rendering, data_flow]
```

Being able to narrate a single request from keystroke to pixel is the canonical full
stack question. The path:

1. The browser resolves the domain via DNS and opens a TCP connection, then a TLS
   handshake for HTTPS.
2. The browser requests the HTML document; the CDN or origin server responds.
3. The browser parses HTML, builds the DOM, fetches CSS and JavaScript, and renders the
   first paint.
4. The application JavaScript boots and issues an API request (`fetch`) with credentials
   — a cookie or an `Authorization` header.
5. A load balancer or reverse proxy routes the request to a backend instance.
6. Middleware authenticates the caller, then the handler authorizes the specific action.
7. The handler validates input, executes business logic, and queries the database within
   a transaction if it writes.
8. The response is serialised to JSON with a status code and cache headers.
9. The client updates its cache and state, and React re-renders the affected components.
10. Logs, metrics, and a trace are emitted at each hop, correlated by a request id.

**Every one of these steps is a place a bug can live.** A full stack interview often
picks one step and drills.

### 3.2 Where Logic Belongs

```yaml
job_field: full_stack_development
topic: application_architecture
subtopic: responsibility_placement
difficulty: medium
keywords: [separation_of_concerns, validation, business_logic, client_vs_server, trust_boundary]
```

The trust boundary is the single most important line in a full stack application:
**everything on the client is untrusted input to the server.**

| Concern | Client | Server | Notes |
|---------|--------|--------|-------|
| Input validation | yes (UX) | yes (authoritative) | Duplicate deliberately |
| Authorization | no | yes | Client checks are cosmetic |
| Business rules | rarely | yes | Client may mirror simple rules for feedback |
| Data formatting for display | yes | no | Locale and timezone belong to the user |
| Pagination and filtering of large sets | no | yes | Never ship all rows and filter locally |
| Sorting a small in-memory list | yes | no | Avoid a round trip |
| Rate limiting | no | yes | Client throttling is a courtesy |
| Secrets and API keys | never | yes | Build-time env vars are visible in the bundle |

**Common mistake.** Computing a price, a discount, or a permission in the browser and
sending the result to the server, which then trusts it. The server must recompute.

### 3.3 API Contracts Between Frontend and Backend

```yaml
job_field: full_stack_development
topic: api_contracts
difficulty:
  - medium
  - hard
keywords: [api_contract, openapi, schema, versioning, breaking_change, dto, type_generation]
```

The API contract is the interface between two independently changing codebases. Treating
it casually is the main source of full stack friction.

- **Define it explicitly.** An OpenAPI specification (or a GraphQL schema) gives both
  sides a single source of truth and enables generated clients and mock servers.
- **Generate types.** Deriving TypeScript types from the OpenAPI schema removes an entire
  class of drift bugs, where the frontend believes a field is a string and the backend
  changed it to a number.
- **Additive changes are safe; removals and renames are breaking.** Adding an optional
  field is backward compatible. Removing a field, renaming it, changing its type, or
  making an optional field required is not.
- **Deploy order matters.** With independent deploys, the backend must support both the
  old and new contract during the transition window. Expand, migrate clients, then
  contract.
- **Error contract.** Agree on one error envelope, with a stable machine-readable code
  the client switches on, a human-readable message, and a correlation id. RFC 9457
  Problem Details is a published standard shape.
- **Nullability and empty states.** Decide explicitly whether "no results" is `[]` or
  `null`, and whether an absent field is `null` or omitted. Inconsistency here produces
  endless client-side defensive code.
- **Contract tests** run in CI on both sides and catch drift before deployment.

---

## 4. Core Technical Topics

### 4.1 Frontend/Backend Integration and CORS

```yaml
job_field: full_stack_development
topic: cors_and_cookies
difficulty:
  - medium
  - hard
keywords: [cors, preflight, same_origin, cookies, samesite, proxy, credentials]
```

Most full stack integration pain is a cross-origin problem.

**Same-origin means identical scheme, host, and port.** `http://localhost:3000` and
`http://localhost:8080` are different origins. In production, `app.example.com` and
`api.example.com` are also different origins.

**CORS** is how a server opts in to being read cross-origin by browser scripts:

- A "simple" request goes straight out; the browser blocks the *response* from the script
  if `Access-Control-Allow-Origin` does not match.
- A non-simple request (custom headers, `PUT`/`DELETE`, JSON content type in some cases)
  triggers a **preflight** `OPTIONS`, which must be answered with the allowed origin,
  methods, and headers.
- **Credentials.** To send cookies cross-origin, the client must set
  `credentials: 'include'` and the server must return
  `Access-Control-Allow-Credentials: true` with an explicit origin — the wildcard `*` is
  rejected in that combination.
- **CORS is enforced by the browser only.** The request often reaches your server and is
  processed; only the response is withheld from the script. This is why the server log
  looks fine while the browser shows an error, and why CORS is not a server-side security
  control.

**Two practical architectures.**

- **Same-origin via proxy.** Serve the frontend and reverse-proxy `/api` to the backend.
  No CORS, cookies are first-party, simplest overall. This is the usual production
  choice.
- **Separate origins.** Frontend on a CDN, API on its own domain. Requires correct CORS
  configuration and, for cookie auth, `SameSite=None; Secure` cookies — which come with
  their own third-party-cookie caveats in modern browsers.

**Cookie attributes that matter across the seam:** `HttpOnly` (not readable by
JavaScript), `Secure` (HTTPS only), `SameSite` (`Lax`, `Strict`, or `None`), `Domain`,
`Path`, and `Max-Age`. `SameSite=Lax` is the common browser default and blocks the cookie
on most cross-site subrequests, which is a frequent cause of "auth works locally, breaks
in staging".

### 4.2 End-to-End Authentication

```yaml
job_field: full_stack_development
topic: end_to_end_authentication
difficulty:
  - medium
  - hard
keywords: [authentication, session, jwt, cookie, refresh_token, oauth, pkce, login_flow]
```

The full stack view of authentication is the *flow*, not the token format.

**Session-cookie flow.** Login posts credentials, the server creates a session and sets
an `HttpOnly; Secure; SameSite` cookie, and the browser attaches it automatically to
subsequent same-site requests. Logout deletes the server-side session, so revocation is
immediate. Requires shared session storage across instances, and CSRF protection because
the cookie is sent automatically.

**Token flow.** Login returns an access token that the client attaches as
`Authorization: Bearer ...`. Nothing is sent automatically, so CSRF is largely moot, but
the token must be stored somewhere — and `localStorage` is readable by any script, so an
XSS becomes account takeover. A common middle ground is storing the refresh token in an
`HttpOnly` cookie and keeping the short-lived access token in memory only.

**Refresh flow.** Short-lived access token (minutes) plus a longer-lived refresh token
that is stored server-side and revocable. The client refreshes on `401` and retries the
original request once. Two details candidates usually miss: concurrent requests must not
each trigger a separate refresh (single-flight the refresh), and a failed refresh must
clear client state and route to login.

**Third-party sign-in.** Authorization Code flow with PKCE is the current recommendation
for browser and mobile clients; the implicit flow is deprecated. OpenID Connect adds the
identity layer (an ID token) on top of OAuth 2.0 — OAuth 2.0 alone is authorization
delegation, not authentication.

**What must never happen.** Deciding "is this user logged in" from a value the client
sent and the server did not verify; storing a password anywhere other than as a salted
Argon2/bcrypt/scrypt hash; or returning a different error for "unknown user" versus
"wrong password".

### 4.3 End-to-End Authorization

```yaml
job_field: full_stack_development
topic: end_to_end_authorization
difficulty:
  - medium
  - hard
keywords: [authorization, rbac, route_guard, ownership, idor, ui_permissions]
```

**Authentication asks who you are; authorization asks what you may do.** In a full stack
app both layers participate, but only one of them enforces.

- **Client-side.** Hide or disable actions the user cannot perform, and guard routes so
  they do not land on a broken screen. This is user experience, not security. Anyone can
  open devtools or call the API directly.
- **Server-side.** Every endpoint checks the permission *and the ownership of the
  specific record*. The most common real vulnerability in full stack applications is an
  endpoint that verifies the session but not that record 4711 belongs to the caller —
  insecure direct object reference, part of broken access control, the top OWASP Top
  10:2025 category.
- **Keep permissions in one place.** Send the user's effective permissions to the client
  so the UI can reflect them, but derive both the UI state and the server check from the
  same policy definition to avoid divergence.
- **Deny by default.** A newly added route with no explicit policy should be inaccessible,
  not open.

### 4.4 Database Work in a Full Stack Context

```yaml
job_field: full_stack_development
topic: database_for_full_stack
difficulty:
  - medium
  - hard
keywords: [schema_design, migrations, orm, n_plus_one, pagination, transactions, seed_data]
```

Full stack interviews probe database *judgement* more than internals.

- **Schema design for a feature.** Identify entities, relationships and cardinality,
  required constraints, and the queries the UI will actually run. Design for the read
  patterns the screens need.
- **Migrations.** Versioned migration files applied identically in every environment,
  run automatically in the deploy pipeline. Backward-compatible first: add nullable
  column, deploy code that writes both, backfill, then remove the old column in a later
  release.
- **The N+1 problem** is the most common full stack performance bug: a list endpoint
  loading each row's relations separately. It usually shows up as "the page got slow when
  we had more than 50 items".
- **Pagination must be server-side** for anything unbounded. Keyset pagination on an
  indexed sort column is stable under concurrent inserts; offset pagination is simpler
  but degrades and can skip rows.
- **Transactions** wrap multi-step writes so a partial failure does not leave the data
  inconsistent. Never hold a transaction open across an external HTTP call.
- **Seed and fixture data** should be reproducible so every developer and CI run starts
  from the same state.

### 4.5 Rendering Strategy and Where the UI Is Built

```yaml
job_field: full_stack_development
topic: rendering_strategy
difficulty:
  - medium
  - hard
keywords: [csr, ssr, ssg, hydration, seo, first_paint, meta_framework]
```

Choosing where HTML is produced is a full stack decision because it changes the
deployment topology.

- **Client-side rendering (CSR).** Ship a static shell and render in the browser.
  Simplest deployment (static hosting plus an API), weakest first paint and SEO.
- **Server-side rendering (SSR).** Render HTML per request. Better first paint and
  crawlability; you now operate a rendering server, must handle its caching, and pay a
  hydration cost on the client.
- **Static site generation (SSG).** Pre-render at build time. Fastest and cheapest to
  serve; only viable for content known before the request, with revalidation strategies
  for semi-dynamic content.
- **Hybrid.** Most meta-frameworks let you choose per route: static marketing pages,
  server-rendered product pages, client-rendered dashboards.

**Decision inputs:** SEO requirements, time-to-first-paint targets, personalisation,
data freshness, team capacity to operate a server, and cost.

**Common mistake.** Adopting SSR for an authenticated internal dashboard, where SEO is
irrelevant and the added operational complexity buys nothing.

### 4.6 Environment Configuration and Secrets

```yaml
job_field: full_stack_development
topic: environment_configuration
difficulty:
  - easy
  - medium
keywords: [env_vars, configuration, secrets, build_time, runtime, twelve_factor, dotenv]
```

- **Configuration belongs in the environment, not in the code.** The same build artifact
  should run in development, staging, and production with different configuration. This
  is a core twelve-factor principle.
- **Frontend environment variables are compiled into the bundle at build time and are
  publicly visible.** They are appropriate for an API base URL or a public analytics key;
  they can never hold a secret. If a value must stay secret, the call must go through
  your backend.
- **Backend secrets** come from a secret manager or the platform's secret mechanism, are
  never committed, and are rotated. A secret committed once is compromised until rotated,
  even after the commit is removed, because it remains in Git history.
- **Runtime configuration for a static frontend.** If you need one build across
  environments, fetch a small `config.json` at startup or inject values at container
  start rather than rebuilding per environment.
- **Configuration validation at boot.** Fail fast with a clear message when a required
  variable is missing, rather than throwing a confusing null error on the first request.

### 4.7 Full Stack Testing Strategy

```yaml
job_field: full_stack_development
topic: full_stack_testing
difficulty:
  - medium
  - hard
keywords: [testing_strategy, unit, integration, contract, e2e, test_data, ci]
```

Each layer needs a different kind of test, and the boundary between them needs its own.

- **Unit tests** — pure logic on both sides: a pricing rule on the server, a formatting
  helper or reducer on the client.
- **Component tests** — a React component rendered with mocked network responses,
  asserting on user-visible behaviour.
- **Backend integration tests** — the API exercised against a real database in a
  container, verifying status codes, payloads, and persistence.
- **Contract tests** — the frontend's expectations and the backend's responses verified
  against a shared schema, so drift fails in CI rather than in production.
- **End-to-end tests** — a real browser against a running stack, covering the few flows
  that would be catastrophic to break: sign in, the core create/read/update path, and
  payment if applicable.
- **Test data management** — deterministic seeds, isolation between tests (transaction
  rollback or per-test schema), and no dependence on execution order.

**Ratio.** Many unit and component tests, a solid layer of backend integration tests, a
handful of end-to-end tests. Inverting this yields a suite that is slow, flaky, and
distrusted.

### 4.8 DevOps Fundamentals for Full Stack Developers

```yaml
job_field: full_stack_development
topic: devops_fundamentals_for_developers
difficulty:
  - medium
  - hard
keywords: [docker, docker_compose, ci_cd, health_check, logs, twelve_factor, rollback]
```

A full stack developer is expected to be able to run, ship, and observe the application —
not to design the platform.

- **Containers.** Write a working Dockerfile: a small base image, dependency install as a
  separate cached layer, multi-stage build so the runtime image excludes build tooling, a
  non-root user, and an explicit `EXPOSE` and start command.
- **Local orchestration.** Docker Compose to run the frontend, backend, database, and
  cache together with a single command, using the service name as the hostname — a
  frequent source of "connection refused to localhost" confusion, because inside a
  container `localhost` is the container itself.
- **CI/CD.** A pipeline that installs dependencies, runs lint and tests, builds both
  artifacts, and deploys on merge to the main branch. Fast feedback matters more than
  pipeline sophistication.
- **Health checks.** Distinct liveness (is the process alive) and readiness (can it serve
  traffic) endpoints. Readiness should fail while a dependency is unavailable so the load
  balancer stops sending traffic.
- **Logs and correlation.** Structured JSON logs to stdout, one correlation id generated
  at the edge and propagated, so a browser error can be traced to a server log line.
- **Rollback.** Know how to revert quickly, and keep database migrations
  backward-compatible so a code rollback does not require a schema rollback.

Deep coverage of Kubernetes, Terraform, cloud networking, and pipeline design lives in
the DevOps/Cloud guide.

---

## 5. Easy-Level Interview Knowledge

```yaml
job_field: full_stack_development
topic: easy_level_knowledge
difficulty: easy
keywords: [full_stack_basics, definitions, junior, fundamentals]
```

- **What does "full stack" mean?** Working across the client, the server, and the data
  layer of an application.
- **What is an API and why does the frontend need one?** A contract exposing server
  capabilities over the network; the browser cannot access the database directly.
- **What is the difference between frontend and backend responsibilities?** Presentation
  and interaction versus business rules, persistence, and enforcement.
- **What is JSON and why is it used between the layers?** A language-neutral text format
  for structured data that both sides can parse.
- **What is the difference between `GET` and `POST` from an application perspective?**
  Reading data safely and repeatably versus submitting a change.
- **What is a database migration?** A versioned, repeatable schema change applied the
  same way in every environment.
- **What is an environment variable and why not hardcode a URL?** Externalised
  configuration so one build runs in every environment.
- **What is CORS in one sentence?** A browser mechanism that lets a server permit
  cross-origin reads by scripts.
- **What is a cookie and how does it differ from `localStorage`?** Sent automatically
  with requests and can be `HttpOnly`; `localStorage` is script-only and never sent
  automatically.
- **What is authentication versus authorization?** Establishing identity versus deciding
  what that identity may do.
- **What is an ORM?** A layer mapping database rows to objects and generating SQL.
- **What is the purpose of a `.env` file, and what must never go in a frontend one?**
  Local configuration; never a secret, because frontend values are compiled into the
  public bundle.
- **What is a 500 error and whose problem is it?** An unhandled server-side fault — a
  backend problem, even if the symptom appears in the UI.

---

## 6. Medium-Level Interview Knowledge

```yaml
job_field: full_stack_development
topic: medium_level_knowledge
difficulty: medium
keywords: [applied_full_stack, integration, debugging, design, trade_offs]
```

- **Walk me through what happens when a user submits a login form.** Full path: client
  validation, request, server validation, credential verification against a password
  hash, session or token issuance, cookie attributes or token storage decision, client
  state update, redirect, and how the next request proves identity.
- **Where do you validate user input and why in more than one place?** Client for
  immediate feedback; server because the client is untrusted and can be bypassed.
- **You added a required field to an API response and the deployed frontend broke. What
  went wrong and how do you prevent it?** Contract change without a compatible transition;
  fix with additive-only changes, versioning, contract tests, and generated types.
- **How would you implement "only the owner can edit this record"?** Server-side ownership
  check on every mutating endpoint, plus a client-side affordance driven by permissions
  returned from the server. Explain why the client check is not the control.
- **The login works locally but not in staging. Where do you look?** Cookie `Secure` and
  `SameSite` attributes over HTTP versus HTTPS, origin mismatch and CORS credentials,
  cookie domain scope, and clock skew for token expiry.
- **How do you design a paginated, filterable list end to end?** Server-side filtering and
  pagination with indexed columns, filter state in the URL query string, loading and empty
  states, and a stable sort so pages do not shuffle.
- **How do you handle file uploads?** Size limits and content-type validation on the
  server, streaming rather than buffering large files, storing in object storage rather
  than the database, and pre-signed URLs so the file bypasses the application server.
- **How do you keep frontend and backend types in sync?** Generate client types from the
  OpenAPI schema, or share a schema package in a monorepo, and validate at the boundary at
  runtime.
- **How would you add caching to a slow dashboard?** Identify whether the cost is in the
  query, the API, or the render; then choose HTTP caching, a server-side cache with a
  defined TTL, or client-side query caching — and state the staleness the business
  tolerates.
- **What is the N+1 problem and how would you notice it in a full stack app?** One query
  per list item; noticed as a page that slows linearly with list size, confirmed by
  counting queries per request.
- **How do you debug an issue that only appears in production?** Correlation ids across
  layers, structured logs, error tracking with source maps, feature flags to isolate, and
  reproducing with production-shaped data in a safe environment.
- **How do you deploy frontend and backend changes that depend on each other?** Ship the
  backward-compatible backend first, then the frontend; never require simultaneous
  deployment.

---

## 7. Hard-Level Interview Knowledge

```yaml
job_field: full_stack_development
topic: hard_level_knowledge
difficulty: hard
keywords: [architecture, scaling, consistency, multi_tenant, real_time, offline, migration]
```

- **Design a collaborative application where two users edit the same record.** Detect
  conflicts with optimistic concurrency (a version column returning `409`), decide between
  last-write-wins, merge, or explicit conflict UI, and discuss real-time propagation via
  WebSockets or server-sent events. Note that true collaborative editing needs CRDTs or
  operational transformation, which is a much larger commitment.
- **Design a multi-tenant SaaS application end to end.** Tenant isolation strategy
  (shared schema with a tenant column, schema per tenant, database per tenant), how tenant
  context flows from the request through every query, preventing cross-tenant leakage in
  both API and UI, per-tenant rate limiting and noisy-neighbour control, and per-tenant
  customisation.
- **How do you introduce a breaking API change across independently deployed clients,
  including mobile apps you cannot force to update?** Versioned endpoints, dual support
  with a measured deprecation window, telemetry on old-version usage, and a forced-upgrade
  path as the last resort.
- **Design real-time updates for a dashboard.** Compare polling (simple, wasteful),
  long polling, server-sent events (one-way, HTTP-friendly, auto-reconnect), and
  WebSockets (bidirectional, needs its own scaling, auth, and reconnection story). Cover
  fan-out across multiple backend instances via a pub/sub layer, and what the client does
  on reconnect to avoid missing events.
- **How would you migrate a monolithic application to a separate frontend and API without
  downtime?** Introduce the API alongside the existing rendering, move one route at a time
  behind a router or proxy, run both in parallel, compare behaviour, then remove the old
  path — the strangler pattern.
- **How do you guarantee that a user-visible action either fully happens or does not?**
  Transaction boundaries on the server, idempotency keys so client retries do not
  duplicate, the outbox pattern when the action also emits an event, and a UI that
  communicates in-progress state honestly rather than optimistically claiming success.
- **How do you scale a full stack application from 100 to 100,000 users?** In order:
  measure, add indexes and fix N+1 queries, cache read-heavy endpoints, put the frontend
  on a CDN, make the backend stateless and scale horizontally, add read replicas, move
  slow work to a queue, and only then consider decomposition. State what breaks at each
  step.
- **Design offline-capable behaviour for a field-use application.** Local persistence,
  an outbound mutation queue with idempotent server handling, conflict resolution on
  sync, and clear UI about what is not yet saved. Then explain when the complexity is not
  justified.
- **How do you handle a long-running server operation from the UI?** Return `202
  Accepted` with a job id, poll or subscribe for status, make the job idempotent and
  resumable, and design the UI for progress, failure, and page-refresh mid-job.

---

## 8. Practical Engineering Scenarios

```yaml
job_field: full_stack_development
topic: practical_scenarios
difficulty:
  - medium
  - hard
keywords: [scenario, cross_layer_debugging, integration_failure, production_issue]
```

### Scenario A — The UI shows an error but the backend logs look clean

- **Initial question.** What does that combination tell you?
- **Expected reasoning.** The request may never have reached the application: a CORS
  preflight failure, a proxy or gateway rejection, a TLS or mixed-content block, or a
  network error. Check the browser network tab for whether the request was sent and what
  responded.
- **Follow-up.** The `OPTIONS` request returns `403`. What is misconfigured?
- **Deeper.** Why does the same call succeed from curl? (CORS is browser-enforced only.)
- **Trade-off.** Fixing with a permissive `Access-Control-Allow-Origin: *` versus an
  explicit allowlist — and why the wildcard is incompatible with credentialed requests.

### Scenario B — Login works, then the user is logged out on refresh

- **Expected reasoning.** Token held only in memory with no refresh on boot, a cookie
  rejected because of `Secure` over plain HTTP or a `SameSite` mismatch, a cookie domain
  scoped to the wrong host, or client and server clock skew invalidating the token.
- **Follow-up.** How do you distinguish "cookie never set" from "cookie not sent"?
  (Inspect the `Set-Cookie` response header versus the outgoing request headers.)
- **Deeper.** How should the refresh flow behave when three API calls receive `401`
  simultaneously? (Single-flight the refresh and queue the retries.)

### Scenario C — A page became slow after the dataset grew

- **Expected reasoning.** Determine the layer: server response time in the network tab
  versus client render time in the profiler. If server-side, look for N+1 queries, a
  missing index, or returning the entire table. If client-side, look for rendering
  thousands of rows without virtualisation.
- **Follow-up.** The API takes 4 seconds and returns 20,000 rows. What is the fix?
  (Server-side pagination and filtering, plus an index on the sort and filter columns.)
- **Deeper.** Why is client-side filtering of a large dataset a design error rather than
  an optimisation problem?

### Scenario D — Duplicate records appear when users double-click submit

- **Expected reasoning.** The client should disable the button and the server must be the
  real defence: an idempotency key or a natural uniqueness constraint. Explain why the
  disabled button alone is insufficient (retries, flaky networks, direct API calls).
- **Deeper.** How do you clean up the duplicates safely and add the constraint without
  downtime?

### Scenario E — A deploy broke the frontend but the backend is healthy

- **Expected reasoning.** Contract drift: a field renamed or removed, a type change, or a
  changed error shape. Check what the API now returns versus what the client expects, and
  whether the frontend was built against a stale schema.
- **Follow-up.** How do you make this fail in CI instead of production? (Contract tests
  and generated types.)
- **Trade-off.** Roll back the backend versus hotfix the frontend, considering which has
  the faster and safer path.

### Scenario F — Users report seeing another tenant's data

- **Expected reasoning.** Treat as a security incident. Likely a query missing the tenant
  predicate, a cache keyed without the tenant id, or a shared singleton holding
  request-scoped state. Contain first, then determine scope from audit logs.
- **Deeper.** How do you make this structurally impossible? (Tenant context enforced at
  the data access layer or with row-level security, cache keys always including the tenant
  id, and automated cross-tenant access tests.)

---

## 9. Troubleshooting Knowledge

```yaml
job_field: full_stack_development
topic: troubleshooting
difficulty:
  - medium
  - hard
keywords: [cross_layer_debugging, correlation_id, network_tab, logs, environment_drift]
```

**Localise the layer first.** Before forming any hypothesis, establish whether the
request left the browser, reached the server, reached the database, and what each
returned. The network tab plus a correlation id in the logs answers this in under a
minute; guessing does not.

**Symptom-to-cause shortcuts.**

- Browser error with no server log entry — request blocked before the application: CORS,
  proxy, DNS, TLS, or content security policy.
- `502`/`504` from the proxy — backend crashed, is not listening, or exceeded the proxy
  timeout.
- Works in curl, fails in the browser — a browser-only mechanism: CORS, cookies, CSP, or
  mixed content.
- Works locally, fails in staging — environment drift: configuration, HTTPS, origins,
  database version, or a missing migration.
- Works for one user, fails for another — data-dependent bug, permissions, or a
  tenant-scoping error.
- Fails only after some time — token expiry, connection pool exhaustion, memory growth,
  or a cache filling up.

**Correlation is the tool that makes cross-layer debugging tractable.** Generate a request
id at the edge, return it in the error response, show it in the UI error message, and log
it at every hop.

**Environment parity.** Most "only in production" bugs are configuration or data
differences. Containerising the local stack and using realistic data volumes removes most
of them.

---

## 10. Architecture and System Design

```yaml
job_field: full_stack_development
topic: application_architecture
difficulty:
  - medium
  - hard
keywords: [architecture, monorepo, layering, bff, modularity, data_flow, boundaries]
```

Architectural decisions specific to owning the whole application:

- **Repository layout.** A monorepo keeps the frontend, backend, and shared schema in one
  place with atomic cross-cutting changes and shared tooling, at the cost of build
  complexity. Separate repositories give independence and simpler pipelines, at the cost
  of contract drift and coordinated releases.
- **Shared code across the seam.** Types, validation schemas, and constants can be shared
  safely. Business logic usually cannot: the server must own it, and duplicating it in the
  client creates two sources of truth.
- **Backend for Frontend.** A thin API tailored to one client's screens, aggregating
  several services. It reduces client round trips and over-fetching; it adds a component
  to deploy and can become a dumping ground for logic.
- **Where to aggregate.** Server-side aggregation reduces round trips and payload; client
  side aggregation is more flexible. On mobile networks, favour the server.
- **Feature flags** decouple deploy from release, enable gradual rollout, and give a
  rollback that does not require redeploying. They also accumulate: flags need an expiry
  policy.
- **Domain boundaries.** A feature should own its schema, its endpoints, and its UI
  module. If a change to one feature routinely requires editing three unrelated modules,
  the boundaries are wrong.

---

## 11. Security

```yaml
job_field: full_stack_development
topic: full_stack_security
difficulty:
  - medium
  - hard
keywords: [security, xss, csrf, injection, secrets, https, access_control, headers]
```

Security responsibilities distributed across the stack, mapped to the OWASP Top 10:2025:

- **Broken access control (A01).** Server-side authorization on every endpoint including
  object-level ownership; hide-in-UI is never the control. Validate server-side any URL
  the backend fetches on the user's behalf to prevent SSRF, which the 2025 list groups
  here.
- **Security misconfiguration (A02).** No debug modes or verbose errors in production,
  restrictive CORS, security headers (`Content-Security-Policy`, `X-Content-Type-Options`,
  `Strict-Transport-Security`, `frame-ancestors`), and no default credentials.
- **Software supply chain failures (A03).** Lock files, dependency scanning in CI, and
  Subresource Integrity for externally hosted scripts. This applies to both `node_modules`
  and server dependencies.
- **Cryptographic failures (A04).** HTTPS everywhere including internal hops, correct
  password hashing, and no sensitive data in URLs, logs, or `localStorage`.
- **Injection (A05).** Parameterised queries on the server; on the client, avoid
  `dangerouslySetInnerHTML` with untrusted content and never build a DOM string from user
  input.
- **Authentication failures (A07).** Rate limiting on login, MFA support, generic error
  messages, secure session invalidation on logout and password change.
- **XSS versus CSRF.** XSS executes attacker script in your origin, stealing anything the
  page can read — mitigated by output encoding, framework escaping, and CSP. CSRF makes
  the browser send an authenticated request the user did not intend — mitigated by
  `SameSite` cookies and anti-CSRF tokens. Token-in-header auth is largely immune to CSRF
  but more exposed to XSS; cookie auth is the reverse. Knowing which threat your auth
  choice amplifies is the sign of real understanding.

The cybersecurity guide holds canonical depth on threat modelling, cryptography, and
incident response.

---

## 12. Performance and Scalability

```yaml
job_field: full_stack_development
topic: full_stack_performance
difficulty:
  - medium
  - hard
keywords: [performance, end_to_end_latency, caching_layers, payload, cdn, scaling]
```

**Find the layer before optimising.** End-to-end latency decomposes into network time,
server processing, database time, and client render time. Optimising the wrong one wastes
effort; the network tab and a server trace tell you which dominates.

**Caching layers, from cheapest to most complex.**

1. **Browser cache** — hashed immutable assets, `Cache-Control` on API responses that
   tolerate it.
2. **CDN** — static assets always; cacheable API responses where appropriate.
3. **Application cache** — memoized computations, in-process caches for small
   reference data.
4. **Distributed cache (Redis)** — shared across instances, required once you scale
   horizontally.
5. **Database-level** — materialised views, denormalised read tables.

Each layer adds a place where data can be stale. Decide the acceptable staleness per data
type before adding any of them.

**Payload discipline.** Return only the fields the screen needs, paginate, compress, and
avoid sending large nested object graphs "just in case". Over-fetching is the most common
cause of a slow list page.

**Scaling order for a typical full stack app.** Fix queries and indexes, add caching, put
static assets on a CDN, make the backend stateless and scale horizontally, add read
replicas, move slow work to background jobs. Decomposition into services comes much later
than most candidates suggest.

**Perceived performance.** Optimistic UI, skeleton loaders that match final layout, and
prefetching the likely next route change the user's experience even when the numbers move
little.

---

## 13. Common Candidate Mistakes

```yaml
job_field: full_stack_development
topic: common_mistakes
difficulty:
  - easy
  - medium
  - hard
keywords: [mistakes, misconceptions, full_stack_pitfalls]
```

- Treating client-side validation or a route guard as security.
- Putting an API key or secret in a frontend environment variable.
- Fixing CORS by making the API permissive rather than understanding what the browser is
  blocking and why.
- Believing CORS protects the API — it does not; it protects users of other origins.
- Filtering, sorting, or paginating a large dataset in the browser.
- Changing an API response shape without a compatibility window, then blaming the
  frontend.
- Deploying frontend and backend in a way that requires them to go live simultaneously.
- Storing tokens in `localStorage` without being able to articulate the XSS trade-off.
- Confusing where a bug lives because no correlation id links the browser to the server.
- Computing an authoritative value (price, permission, total) on the client and trusting
  it on the server.
- Running migrations manually in production, or writing destructive migrations that make
  rollback impossible.
- Claiming "full stack" but being unable to explain either an index or a re-render.
- Reaching for microservices, SSR, or real-time infrastructure before the simple version
  has been measured.

---

## 14. Interview Evaluation Points

```yaml
job_field: full_stack_development
topic: evaluation_points
difficulty:
  - easy
  - medium
  - hard
keywords: [evaluation, rubric, full_stack_signals, assessment]
```

An interviewer should be able to determine whether the candidate understands:

- **The trust boundary** — that the client is untrusted input and the server is the
  authority, applied consistently rather than recited.
- **End-to-end tracing** — whether they can narrate a request through every layer and name
  what could fail at each.
- **Contract thinking** — whether they treat the API as a versioned interface between two
  independently deployed codebases.
- **Layer localisation when debugging** — whether they gather evidence about which layer
  failed before hypothesising.
- **Placement judgement** — whether each responsibility (validation, authorization,
  pagination, formatting) is put in the layer that should own it.
- **Deployment awareness** — whether they consider deploy order, backward compatibility,
  and rollback.
- **Breadth with honest depth** — genuine competence in both directions, and candour about
  which side is stronger. Claiming equal expert depth everywhere is usually a negative
  signal.
- **Pragmatism** — whether they can identify the simplest architecture that satisfies the
  requirements.

**Adaptive guidance.** A strong integration answer should escalate toward multi-tenant
design, real-time updates, or zero-downtime migration. A weak answer at the architecture
level should step down to a concrete single-layer fundamental — an HTTP status code, a
React re-render, a SQL join — rather than another cross-cutting design question.

---

## 15. Cross-Topic Relationships

```yaml
job_field: full_stack_development
topic: cross_topic_relationships
difficulty: medium
keywords: [relationships, topic_map, layer_boundaries]
```

Distinctions that must not be collapsed:

- **Full stack is not "frontend plus backend knowledge".** The distinctive skill is
  reasoning about the seam and placing responsibility correctly.
- **Client-side validation is not server-side validation.** Different purposes: feedback
  versus correctness.
- **CORS is not authentication, authorization, or an API security control.**
- **A cookie is not a session, and a JWT is not authentication.** They are transport and
  token formats; the flow is what matters.
- **XSS is not CSRF**, and the auth storage choice trades one exposure for the other.
- **SSR is not SEO**, though it helps; and SSR is not required for good performance.
- **A monorepo is not a monolith.** One is a repository layout, the other a deployment
  architecture; the two are independent.
- **Deployment is not release.** Feature flags separate shipping code from exposing
  behaviour.
- **An ORM is not a database**, and knowing an ORM is not knowing SQL.

Topic progression for adaptive interviews (easy to hard):

`data_flow -> api_contracts -> cors_and_cookies -> end_to_end_authentication -> end_to_end_authorization -> application_architecture -> full_stack_performance -> multi_tenant_and_realtime_design`

Breadth track when the candidate stalls:

`database_for_full_stack -> environment_configuration -> full_stack_testing -> devops_fundamentals_for_developers -> rendering_strategy`

Canonical depth lives elsewhere for:

- React internals, CSS, accessibility, browser APIs —
  `frontend_development_interview_guide.md`
- SQL indexing, transactions, caching internals, messaging —
  `backend_development_interview_guide.md`
- Docker, Kubernetes, CI/CD pipelines, Terraform, observability —
  `devops_cloud_interview_guide.md`
- OWASP detail, cryptography, incident response —
  `cybersecurity_interview_guide.md`
- Test design, automation frameworks, flaky tests —
  `qa_testing_interview_guide.md`
- Data structures, algorithms, design patterns —
  `software_engineering_interview_guide.md`
