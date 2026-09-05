# Backend Development Interview Knowledge Guide

```yaml
job_field: backend_development
job_field_name: Backend Development
canonical_topics:
  - backend_architecture
  - java
  - spring_boot
  - nodejs
  - python_backend
  - http
  - rest_apis
  - api_design
  - authentication
  - authorization
  - sql
  - postgresql
  - mysql
  - transactions
  - indexing
  - orm
  - caching
  - redis
  - microservices
  - messaging
  - asynchronous_processing
  - concurrency
  - backend_testing
  - backend_security
  - backend_performance
  - scalability
  - observability
  - docker_for_backend
difficulty:
  - easy
  - medium
  - hard
```

This document is the canonical interview knowledge base for the **backend_development**
job field. It owns HTTP and REST semantics, relational database behaviour
(transactions, indexing, query planning), caching and Redis, microservices
communication, and messaging. General engineering fundamentals live in the software
engineering guide; container and cluster operations live in the DevOps/Cloud guide.

---

## 1. Job Field Overview

```yaml
job_field: backend_development
topic: job_field_overview
difficulty: easy
keywords: [backend, server_side, api, services, responsibilities]
```

Backend development builds the server-side of an application: the APIs, business logic,
data persistence, integrations, and background processing that a frontend or another
service consumes. The backend owns correctness of data and enforcement of rules; the
frontend cannot be trusted to do either.

Typical responsibilities:

- Design and implement HTTP APIs with clear, versioned contracts.
- Model and query relational data safely and efficiently.
- Enforce authentication and authorization on every request.
- Integrate with third-party services and handle their failures.
- Move slow work off the request path into queues and workers.
- Instrument the service with logs, metrics, and traces.
- Keep the service fast and available as traffic grows.

Common stacks in this field include Java with Spring Boot, Node.js with Express or
NestJS, Python with FastAPI or Django, and Go. The concepts transfer; the syntax does
not.

---

## 2. Core Competencies

```yaml
job_field: backend_development
topic: core_competencies
difficulty: easy
keywords: [competencies, backend_skills, evaluation]
```

1. **A backend language used well** — Java, Python, Node.js, or Go, including its
   concurrency model and error handling.
2. **A backend framework** — Spring Boot, Express/NestJS, FastAPI/Django, or equivalent:
   dependency injection, routing, middleware, configuration, validation.
3. **HTTP and REST** — methods, status codes, headers, caching, content negotiation.
4. **API design** — resource modelling, pagination, filtering, error format, versioning,
   idempotency.
5. **SQL and relational modelling** — joins, aggregates, constraints, normalisation.
6. **Transactions and isolation** — ACID, isolation levels, locking, deadlocks.
7. **Indexing and query performance** — reading a query plan, composite index ordering.
8. **ORM literacy** — and knowing when to drop to raw SQL.
9. **Caching** — cache-aside patterns, TTLs, invalidation, Redis data structures.
10. **Authentication and authorization** — sessions, JWT, OAuth 2.0 / OIDC, RBAC.
11. **Microservices and messaging** — service boundaries, synchronous versus
    asynchronous communication, queues and event streams.
12. **Testing** — unit tests, integration tests against a real database, contract tests.
13. **Observability** — structured logs, metrics, distributed tracing.
14. **Security** — injection prevention, secrets, rate limiting, input validation.

---

## 3. Foundational Knowledge

### 3.1 Backend Architecture Layers

```yaml
job_field: backend_development
topic: backend_architecture
difficulty: easy
keywords: [layered_architecture, controller, service, repository, dto, dependency_injection]
```

A conventional backend service is layered:

- **Controller / route handler** — parses and validates the HTTP request, maps it to a
  command, and serialises the response. It should contain no business rules.
- **Service / application layer** — orchestrates business logic and transaction
  boundaries.
- **Repository / data access layer** — encapsulates queries and persistence.
- **Domain model** — entities and value objects carrying the rules of the business.

**DTO versus entity.** A DTO is the shape exposed over the wire; an entity is the
persistence model. Returning entities directly leaks database structure into the public
API and makes schema changes breaking changes.

**Dependency injection** supplies collaborators from outside rather than constructing
them inline, which is what makes the service layer unit-testable with fakes. Spring
Boot, NestJS, and FastAPI all provide this as a first-class mechanism.

**Common mistake.** Business logic in the controller, SQL in the service, and validation
nowhere. Each layer should have one job.

### 3.2 HTTP Protocol Essentials

```yaml
job_field: backend_development
topic: http
difficulty:
  - easy
  - medium
keywords: [http, methods, status_codes, headers, content_type, keep_alive, http2]
```

HTTP is a stateless request/response protocol. Every request carries a method, a path,
headers, and optionally a body; every response carries a status code, headers, and
optionally a body.

**Method semantics.**

| Method | Safe | Idempotent | Typical use |
|--------|------|------------|-------------|
| GET | yes | yes | Read a resource |
| HEAD | yes | yes | Read headers only |
| POST | no | no | Create or invoke a process |
| PUT | no | yes | Full replace at a known URI |
| PATCH | no | not necessarily | Partial update |
| DELETE | no | yes | Remove a resource |

**Status codes that matter in backend interviews.**

- `200 OK`, `201 Created` (with a `Location` header), `202 Accepted` (async work
  started), `204 No Content`.
- `304 Not Modified` — conditional GET satisfied by `ETag` or `If-Modified-Since`.
- `400 Bad Request` (malformed), `401 Unauthorized` (not authenticated),
  `403 Forbidden` (authenticated but not permitted), `404 Not Found`,
  `409 Conflict` (version or uniqueness conflict), `422 Unprocessable Content`
  (syntactically valid but semantically invalid), `429 Too Many Requests` (rate limited,
  should include `Retry-After`).
- `500 Internal Server Error` (unhandled fault), `502 Bad Gateway` (bad upstream
  response), `503 Service Unavailable` (overloaded or shutting down), `504 Gateway
  Timeout` (upstream did not respond in time).

**Important headers.** `Content-Type`, `Accept`, `Authorization`, `Cache-Control`,
`ETag`, `Location`, `Retry-After`, `X-Request-ID` or `traceparent` for correlation.

**Version-dependent behaviour.** HTTP/1.1 uses persistent connections and suffers
head-of-line blocking; HTTP/2 multiplexes streams over one TCP connection; HTTP/3 runs
over QUIC/UDP and removes TCP-level head-of-line blocking. Application semantics
(methods, status codes) are unchanged across versions.

### 3.3 REST and API Design

```yaml
job_field: backend_development
topic: rest_apis
difficulty:
  - easy
  - medium
  - hard
keywords: [rest, api_design, resources, versioning, pagination, error_format, idempotency]
```

REST is an architectural style: resources identified by URIs, manipulated through a
uniform interface, with stateless interactions and self-descriptive messages.

Design guidance that consistently separates strong candidates:

- **Model nouns, not verbs.** `POST /orders` beats `POST /createOrder`. Actions that do
  not fit CRUD can be modelled as sub-resources (`POST /orders/42/cancellation`).
- **Consistent error format.** One envelope for every error with a machine-readable
  code, a human message, and a correlation id. RFC 9457 "Problem Details for HTTP APIs"
  is a published standard format worth naming.
- **Pagination.** Offset/limit is simple but degrades on deep pages and can skip or
  duplicate rows when data shifts. Keyset (cursor) pagination is stable and scales,
  at the cost of losing random page access.
- **Versioning.** URI versioning (`/v1/...`) is explicit and cache-friendly; header or
  media-type versioning keeps URIs stable but is harder to debug. The important part is
  having an explicit deprecation policy, not which mechanism you pick.
- **Idempotency.** Make `PUT` and `DELETE` naturally idempotent, and give `POST` an
  `Idempotency-Key` header when clients may retry. Store the key with the response so a
  duplicate returns the original result.
- **Do not leak internals.** Never expose stack traces, SQL, or internal ids that reveal
  row counts in an error response.

**REST is not the only option.** GraphQL gives clients precise field selection and
avoids over-fetching, at the cost of harder caching, query-cost control, and N+1 risk
in resolvers. gRPC gives compact binary framing, streaming, and generated clients, at
the cost of browser friction and less human-readable debugging. Choose by client needs.

---

## 4. Core Technical Topics

### 4.1 Java and Spring Boot Concepts

```yaml
job_field: backend_development
topic: spring_boot
difficulty:
  - easy
  - medium
  - hard
keywords: [java, spring_boot, dependency_injection, bean, transactional, jpa, actuator]
```

**Spring Boot** is an opinionated layer over the Spring Framework that provides
auto-configuration, starter dependencies, and an embedded server so a service runs as a
plain executable JAR.

Concepts interviewers probe:

- **Inversion of Control container.** Spring creates and wires beans; `@Component`,
  `@Service`, `@Repository`, and `@Configuration` register them, and constructor
  injection is preferred over field injection because it makes dependencies explicit and
  the object testable without a container.
- **Bean scopes.** `singleton` is the default and is shared across the application, so a
  singleton bean holding mutable request state is a concurrency bug.
- **`@Transactional`.** Marks a transaction boundary. Two classic traps: it works via
  proxies, so a self-invocation inside the same class bypasses it entirely; and by
  default Spring rolls back on unchecked exceptions only, not on checked ones.
- **Spring Data JPA.** Repository interfaces generate queries from method names. This is
  convenient and hides cost — lazy-loaded collections in a loop produce N+1 queries.
- **Profiles and externalised configuration.** `application.yml` plus environment
  variables; secrets must not live in the repository.
- **Actuator.** Exposes health, metrics, and info endpoints used by load balancers and
  Kubernetes probes. Liveness and readiness must be distinct: readiness should fail when
  a dependency is unavailable, liveness only when the process is unrecoverable.

**Java runtime concepts.** JVM memory areas (heap, stack, metaspace), garbage collection
generations, `equals`/`hashCode` contract, checked versus unchecked exceptions, and the
collections framework are all fair game.

### 4.2 Node.js Concepts

```yaml
job_field: backend_development
topic: nodejs
difficulty:
  - easy
  - medium
  - hard
keywords: [nodejs, event_loop, non_blocking, promises, async_await, cluster, streams]
```

**Node.js** is a JavaScript runtime built on V8 with a single-threaded event loop and
non-blocking I/O.

- **The event loop** processes phases (timers, pending callbacks, poll, check, close).
  `process.nextTick` and promise microtasks run between phases, before the next macro
  task.
- **Non-blocking does not mean parallel.** A CPU-bound loop blocks the event loop and
  stalls every other request. CPU-heavy work belongs in `worker_threads`, a child
  process, or a separate service.
- **Scaling.** The `cluster` module or a process manager runs one process per core;
  state must therefore live outside the process (Redis, database), not in module-level
  variables.
- **Error handling.** An unhandled promise rejection terminates the process in modern
  Node versions. Every async route handler needs error propagation to the framework's
  error middleware.
- **Streams and backpressure.** Piping a large file through streams keeps memory flat;
  buffering it entirely does not. Ignoring backpressure is a common source of memory
  growth.

**Version-dependent behaviour.** Availability of the built-in test runner, native fetch,
and stable `worker_threads` APIs varies by Node major version; confirm against the
runtime in use.

### 4.3 Python Backend Concepts

```yaml
job_field: backend_development
topic: python_backend
difficulty:
  - easy
  - medium
keywords: [python, fastapi, django, asgi, wsgi, pydantic, asyncio, gunicorn]
```

- **WSGI versus ASGI.** WSGI (Flask, classic Django) is synchronous, one request per
  worker thread or process. ASGI (FastAPI, Starlette, modern Django) supports async
  handlers and long-lived connections such as WebSockets.
- **FastAPI** derives request validation and OpenAPI documentation from type hints via
  Pydantic models, which makes the request contract explicit and machine-checkable.
- **Blocking calls in async handlers.** Calling a synchronous database driver inside an
  `async def` handler blocks the event loop for every concurrent request. Use an async
  driver or run the blocking call in a thread pool.
- **Deployment.** A production Python service runs multiple worker processes (Gunicorn
  with Uvicorn workers, or Uvicorn directly) behind a reverse proxy, because a single
  process cannot use multiple cores for CPU-bound work.
- **Dependency isolation.** Virtual environments and a pinned lock file; unpinned
  dependencies make builds non-reproducible.

### 4.4 SQL and Relational Modelling

```yaml
job_field: backend_development
topic: sql
difficulty:
  - easy
  - medium
  - hard
keywords: [sql, join, group_by, subquery, cte, window_function, null, constraint]
```

SQL is a declarative language: you state the result you want and the planner decides how
to produce it.

- **Logical evaluation order** is `FROM` -> `JOIN` -> `WHERE` -> `GROUP BY` -> `HAVING`
  -> `SELECT` -> `ORDER BY` -> `LIMIT`. This explains why a `SELECT` alias is unusable in
  `WHERE` but usable in `ORDER BY`, and why `WHERE` filters rows while `HAVING` filters
  groups.
- **JOINs.** `INNER` keeps matches; `LEFT` keeps all left rows; `FULL OUTER` keeps both
  sides; `CROSS` is the Cartesian product. A `LEFT JOIN` whose right-side column is
  filtered in `WHERE` silently becomes an inner join — put that predicate in the `ON`
  clause instead.
- **NULL semantics.** `NULL` means unknown. `NULL = NULL` is not true; use `IS NULL`.
  Aggregates skip NULLs, and `COUNT(column)` differs from `COUNT(*)` for that reason.
- **CTEs and window functions.** Common table expressions name intermediate results and
  support recursion. Window functions (`ROW_NUMBER`, `RANK`, `LAG`, `SUM OVER`) compute
  across a set of rows without collapsing them, which is how you write "latest row per
  group" or running totals cleanly.
- **Constraints are part of the design.** `NOT NULL`, `UNIQUE`, `CHECK`, and foreign
  keys push invariants into the database, where every writer must obey them. Application
  validation alone cannot guarantee this under concurrency.

**PostgreSQL versus MySQL.** Both are mature relational databases. PostgreSQL is
generally stronger on advanced SQL (rich types, `JSONB`, extensions, expression and
partial indexes) and uses MVCC with `VACUUM` to reclaim dead tuples. MySQL with InnoDB
is also MVCC-based, clusters table data by primary key (so secondary index lookups
require a primary key lookup), and defaults to `REPEATABLE READ` isolation while
PostgreSQL defaults to `READ COMMITTED`. Neither is universally "better".

### 4.5 Transactions and Isolation Levels

```yaml
job_field: backend_development
topic: transactions
difficulty:
  - medium
  - hard
keywords: [acid, isolation_level, dirty_read, phantom_read, mvcc, locking, deadlock]
```

**ACID.**

- **Atomicity** — all statements in the transaction commit or none do.
- **Consistency** — the transaction moves the database from one valid state to another,
  respecting constraints.
- **Isolation** — concurrent transactions do not observe each other's partial work, to
  the degree the isolation level promises.
- **Durability** — a committed transaction survives a crash (write-ahead log plus
  `fsync`).

**Read phenomena and the SQL standard isolation levels.**

| Level | Dirty read | Non-repeatable read | Phantom read |
|-------|-----------|---------------------|--------------|
| READ UNCOMMITTED | possible | possible | possible |
| READ COMMITTED | prevented | possible | possible |
| REPEATABLE READ | prevented | prevented | possible (standard) |
| SERIALIZABLE | prevented | prevented | prevented |

- **Dirty read** — reading another transaction's uncommitted data.
- **Non-repeatable read** — re-reading the same row returns different values.
- **Phantom read** — re-running the same range query returns new rows.

**Implementation reality.** PostgreSQL's `REPEATABLE READ` is snapshot isolation and
does not exhibit the classic phantom read, and its `SERIALIZABLE` uses serializable
snapshot isolation, which aborts conflicting transactions rather than blocking them —
so applications must be prepared to retry. InnoDB's `REPEATABLE READ` uses next-key
locking to avoid phantoms for locking reads. Isolation level names are standard;
behaviour is engine-specific.

**Locking.** Pessimistic locking (`SELECT ... FOR UPDATE`) blocks competing writers and
is right for short, high-contention critical sections. Optimistic locking (a `version`
column checked on update) avoids holding locks and is right when conflicts are rare;
the loser retries.

**Deadlocks** occur when two transactions acquire the same rows in different orders. The
database detects the cycle and aborts one. Prevention: acquire rows in a consistent
order, keep transactions short, and never wait on user input inside a transaction.

### 4.6 Indexing and Query Performance

```yaml
job_field: backend_development
topic: indexing
difficulty:
  - medium
  - hard
keywords: [index, b_tree, composite_index, covering_index, query_plan, explain, cardinality]
```

An **index** is a secondary data structure — usually a B+ tree — that lets the engine
find rows without scanning the whole table.

- **Reads versus writes.** Every index must be maintained on `INSERT`, `UPDATE`, and
  `DELETE`. Indexes are a read optimisation paid for with write cost and storage.
- **Composite index column order matters.** An index on `(tenant_id, created_at)`
  supports filtering by `tenant_id` alone and by both columns, but not by `created_at`
  alone. This is the leftmost-prefix rule.
- **Selectivity.** An index on a low-cardinality column such as a boolean flag is rarely
  useful on its own; the planner may correctly prefer a sequential scan.
- **Covering index.** When the index contains every column the query needs, the engine
  answers from the index alone (index-only scan) and skips the table entirely.
- **Predicates that defeat an index.** Wrapping the column in a function
  (`WHERE lower(email) = ...`), a leading wildcard `LIKE '%foo'`, or an implicit type
  cast. PostgreSQL can index the expression itself if you create an expression index.
- **Reading a plan.** `EXPLAIN ANALYZE` shows the chosen operators and actual rows. Look
  for a sequential scan on a large table, a nested loop with a large outer input, and a
  large gap between estimated and actual rows, which usually means stale statistics.

**N+1 query problem.** Loading a list of N parents and then issuing one query per parent
for its children produces N+1 round trips. Fix with a join fetch, a batched
`WHERE id IN (...)`, or an explicit eager-loading directive. This is the single most
common ORM performance defect.

### 4.7 ORMs

```yaml
job_field: backend_development
topic: orm
difficulty: medium
keywords: [orm, jpa, hibernate, sqlalchemy, prisma, lazy_loading, migrations]
```

An **object-relational mapper** maps rows to objects and generates SQL. It removes
boilerplate and centralises mapping, at the cost of hiding query cost.

- **Lazy versus eager loading.** Lazy defers loading an association until accessed,
  which risks N+1 queries and, in JPA, `LazyInitializationException` when the session is
  already closed. Eager loading avoids that but can pull far more data than needed.
- **Identity map / persistence context.** JPA and SQLAlchemy track loaded entities and
  flush changes at commit, so an in-place field assignment can issue an `UPDATE` you did
  not explicitly write.
- **Migrations.** Schema changes belong in versioned migration files (Flyway, Liquibase,
  Alembic, Prisma Migrate) that run in CI and production identically. Auto-generating
  schema from entities at startup is acceptable in development and dangerous in
  production.
- **When to drop to SQL.** Reporting queries, bulk updates, window functions, and
  anything where you need to control the plan. A good backend engineer is comfortable
  doing so.

### 4.8 Caching and Redis

```yaml
job_field: backend_development
topic: caching
difficulty:
  - medium
  - hard
keywords: [cache, cache_aside, ttl, eviction, invalidation, redis, stampede, hit_rate]
```

Caching trades freshness for latency and load reduction. Introducing a cache converts a
performance problem into a correctness problem, so the invalidation strategy must be
decided up front.

**Patterns.**

- **Cache-aside (lazy loading).** The application checks the cache, and on a miss loads
  from the database and populates the cache. Simple and the most common; the first
  request after eviction is slow.
- **Read-through / write-through.** The cache sits inline. Write-through keeps the cache
  consistent on write at the cost of write latency.
- **Write-behind.** Writes go to the cache and are flushed asynchronously. Fastest
  writes, real risk of data loss.

**Invalidation.** TTL-based expiry is the simplest and gives bounded staleness.
Event-based invalidation is fresher but must handle missed events. Naming things is
easy; keeping two copies of truth consistent is the hard part.

**Cache stampede (thundering herd).** When a hot key expires, many concurrent requests
miss simultaneously and all hit the database. Mitigate with a short lock or single-flight
per key, probabilistic early recomputation, or staggered TTLs with jitter.

**Redis** is an in-memory data structure store, not merely a key-value cache.

- **Data types.** Strings, hashes, lists, sets, sorted sets, streams, bitmaps,
  HyperLogLog. Sorted sets back leaderboards and time-ordered indexes; streams back
  lightweight event pipelines with consumer groups.
- **Eviction policies.** `noeviction` (writes fail when memory is full), `allkeys-lru`,
  `volatile-lru`, `allkeys-lfu`, and others. Choosing `noeviction` for a pure cache turns
  a memory ceiling into an outage.
- **Persistence.** RDB snapshots and AOF logs. Redis persistence exists, but treating
  Redis as the durable system of record is a design decision that needs justification.
- **Single-threaded command execution** means one slow command (`KEYS *` on a large
  keyspace) blocks every client. Use `SCAN` instead.
- **Distributed locks.** Redis can implement a lock, but a correct one needs a unique
  token, an expiry, and safe release. Locks over an unreliable network have real
  correctness caveats; know that they exist.

**Trade-offs of caching.** Advantages: dramatic latency and load reduction. Costs: an
extra failure domain, stale reads, cost of memory, harder debugging ("is this bug in the
data or in the cache?"), and cold-start behaviour after a restart.

### 4.9 Authentication

```yaml
job_field: backend_development
topic: authentication
difficulty:
  - medium
  - hard
keywords: [authentication, session, cookie, jwt, oauth2, oidc, refresh_token, mfa]
```

**Authentication establishes identity.** It is distinct from authorization, which
determines permission.

**Session-cookie authentication.** The server creates a session, stores it (memory,
Redis, database), and returns an opaque session id in a cookie. Revocation is trivial
(delete the session). Requires shared session storage when running multiple instances.
Cookies must be `HttpOnly`, `Secure`, and `SameSite` to reduce XSS and CSRF exposure.

**JWT (JSON Web Token).** A signed, self-contained token carrying claims. The server can
verify it without a lookup, which is why it suits stateless and multi-service
architectures.

- **The central trade-off:** a JWT is valid until it expires. There is no built-in
  revocation, so a stolen token works until expiry. Practical mitigation is short-lived
  access tokens (minutes) plus a longer-lived refresh token that *is* stored and
  revocable.
- **Signed is not encrypted.** A standard JWS payload is base64url-encoded and readable
  by anyone holding the token. Never put secrets in claims.
- **Validate properly.** Verify the signature with the expected algorithm and key,
  reject `alg: none`, and check `exp`, `iss`, and `aud`.

**OAuth 2.0 and OpenID Connect.** OAuth 2.0 is an *authorization delegation* framework —
it lets an application obtain limited access to a resource on a user's behalf. OpenID
Connect is an identity layer on top of OAuth 2.0 that adds an ID token and defines
authentication. Using bare OAuth 2.0 as an authentication protocol is a well-known
mistake; OIDC exists precisely because of it. For browser and mobile clients the
Authorization Code flow with PKCE is the current recommended flow; the implicit flow is
deprecated.

**Password storage.** Salted Argon2, bcrypt, or scrypt with a deliberately high work
factor. Never SHA-256 alone, never unsalted, never reversible encryption.

### 4.10 Authorization

```yaml
job_field: backend_development
topic: authorization
difficulty:
  - medium
  - hard
keywords: [authorization, rbac, abac, permissions, least_privilege, idor, access_control]
```

**Authorization determines what an authenticated identity may do.**

- **RBAC (role-based).** Permissions attach to roles, roles attach to users. Simple,
  auditable, and coarse; it struggles with per-record rules.
- **ABAC (attribute-based).** Decisions evaluate attributes of the subject, resource,
  action, and environment. Expressive, harder to reason about and test.
- **Ownership / relationship checks.** Most real bugs are here: the endpoint verifies the
  user is logged in but never verifies the requested record belongs to them. That is
  insecure direct object reference (IDOR), a form of broken access control — the number
  one category in the OWASP Top 10:2025.

Rules that hold in every stack:

- Enforce authorization **server-side, on every request**, including internal service
  calls. A hidden button is not a control.
- Deny by default. New endpoints should be inaccessible until explicitly permitted.
- Centralise the decision (a policy layer or middleware) so it cannot be forgotten in
  one handler.
- Log authorization denials; a spike is a strong signal of enumeration.

### 4.11 Microservices and Service Communication

```yaml
job_field: backend_development
topic: microservices
difficulty:
  - medium
  - hard
keywords: [microservices, service_boundary, saga, api_gateway, service_discovery, resilience]
```

**Microservices** are independently deployable services, each owning its data and
exposing a network interface. They are an organisational and deployment strategy, not
an automatic improvement.

**When they help.** Multiple teams needing independent release cadence, components with
genuinely different scaling profiles, and isolation of risky or regulated workloads.

**When they hurt.** A small team, an unclear domain model, or no investment in CI/CD,
observability, and automated infrastructure. Splitting an unclear domain produces a
distributed monolith: all the network costs, none of the independence.

**Data ownership.** Each service owns its schema; other services must go through its
API. A shared database between services recreates the coupling microservices were meant
to remove.

**Distributed transactions.** Two-phase commit across services is rarely practical.
The common alternative is the **saga pattern**: a sequence of local transactions with
compensating actions on failure, orchestrated centrally or choreographed via events. The
consequence is eventual consistency, which the business rules must tolerate.

**Resilience patterns.**

- **Timeouts** on every remote call — the default of "wait forever" is what turns one
  slow service into a full outage.
- **Retries with exponential backoff and jitter**, only for idempotent operations, with
  a bounded attempt count.
- **Circuit breaker** — after a failure threshold, fail fast instead of queueing work
  against a dead dependency, then probe for recovery.
- **Bulkhead** — separate connection or thread pools per dependency so one slow
  downstream cannot consume all capacity.
- **Graceful degradation** — serve a cached or reduced response instead of an error.

**API gateway** centralises cross-cutting concerns (TLS termination, auth, rate limiting,
routing). It also becomes a single point of failure and a deployment bottleneck if it
accumulates business logic.

### 4.12 Messaging and Asynchronous Processing

```yaml
job_field: backend_development
topic: messaging
difficulty:
  - medium
  - hard
keywords: [message_queue, kafka, rabbitmq, pub_sub, at_least_once, idempotent_consumer, dlq]
```

Moving work off the request path improves perceived latency and absorbs traffic spikes.
Typical asynchronous workloads: sending email, generating reports, image processing,
webhooks, and syncing to other systems.

**Queue versus event stream.** A traditional message queue (RabbitMQ, SQS) delivers a
message to one consumer and removes it. A log-based event stream (Kafka) retains an
ordered, replayable log that many independent consumer groups read at their own offsets.
Choose a queue for work distribution and a stream when multiple consumers or replay
matter.

**Delivery guarantees.**

- **At-most-once** — may lose messages, never duplicates.
- **At-least-once** — never loses, may duplicate. This is the practical default.
- **Exactly-once** — achievable only within specific system boundaries and
  configurations; across arbitrary systems it is effectively at-least-once delivery plus
  an idempotent consumer.

**Therefore: make consumers idempotent.** Use a deduplication key, an upsert, or a
processed-message table. A consumer that is not idempotent will eventually double-charge
or double-send.

**Other essentials.**

- **Dead-letter queue** for messages that repeatedly fail, so poison messages do not
  block the queue forever.
- **Ordering** is per-partition in Kafka and only guaranteed within a partition. Keying
  by entity id preserves per-entity order.
- **Backpressure and consumer lag** must be monitored; growing lag means consumers cannot
  keep up and is the leading indicator of a queue incident.
- **The transactional outbox pattern** solves the dual-write problem: writing to the
  database and publishing an event are not atomic, so write the event to an outbox table
  in the same transaction and publish from there.

Kafka internals, Spark, and pipeline orchestration are covered in the data engineering
guide.

### 4.13 Backend Testing

```yaml
job_field: backend_development
topic: backend_testing
difficulty:
  - easy
  - medium
keywords: [unit_test, integration_test, testcontainers, contract_test, test_data, mocking]
```

- **Unit tests** cover business logic in the service and domain layers with
  repositories and clients faked. They should not touch a network or a database.
- **Integration tests** exercise the real persistence layer. Running the actual database
  engine in a container (for example with Testcontainers) is far more trustworthy than
  substituting an in-memory database, because SQL dialect differences hide real bugs.
- **API tests** drive the service through HTTP and verify status codes, payload shape,
  and error contracts.
- **Contract tests** verify that a provider and consumer agree on the interface, which
  matters most in microservices where they deploy independently.
- **Test data.** Build fixtures per test and clean up with transactional rollback or
  truncation; shared mutable fixtures cause order-dependent failures.
- **What to mock.** Boundaries you do not own — third-party HTTP APIs, the clock,
  randomness, message brokers. Mocking your own repository in an integration test defeats
  the purpose.

### 4.14 Observability for Backend Services

```yaml
job_field: backend_development
topic: observability
difficulty:
  - medium
  - hard
keywords: [logging, metrics, tracing, correlation_id, structured_logs, slo, opentelemetry]
```

**Monitoring versus observability.** Monitoring watches known failure signals you
predicted; observability is the property of being able to answer *new* questions about
the system from its outputs. You need both.

- **Structured logs.** Emit JSON with a consistent schema: timestamp, level, service,
  correlation/trace id, and event-specific fields. Never log secrets, tokens, or full
  payloads containing personal data.
- **Correlation ids.** Generate one at the edge and propagate it through every
  downstream call and log line; without it you cannot reconstruct a single request.
- **Metrics.** The RED method for request-driven services: Rate, Errors, Duration. The
  USE method for resources: Utilisation, Saturation, Errors. Record durations as
  histograms so you can compute p95 and p99.
- **Distributed tracing.** Spans linked by trace context show where a request spent its
  time across services. OpenTelemetry is the vendor-neutral CNCF standard for emitting
  traces, metrics, and logs.
- **SLI, SLO, error budget.** An SLI is a measured indicator (for example, the fraction
  of requests served under 300 ms); an SLO is the target for it; the error budget is the
  allowed shortfall and is what makes "should we ship or stabilise?" a data question.

---

## 5. Easy-Level Interview Knowledge

```yaml
job_field: backend_development
topic: easy_level_knowledge
difficulty: easy
keywords: [backend_basics, definitions, http_basics, sql_basics, junior]
```

Foundational backend questions and what a correct answer contains:

- **What is a REST API?** An HTTP interface exposing resources with a uniform set of
  methods and stateless requests.
- **Difference between `PUT` and `PATCH`.** Full replacement versus partial update.
- **What does status code `201` mean, and what header should accompany it?** Created,
  with a `Location` header pointing at the new resource.
- **What is the difference between `401` and `403`?** Not authenticated versus
  authenticated but not permitted.
- **What is a primary key and what is a foreign key?** Unique row identity versus a
  reference enforcing integrity across tables.
- **What is the difference between `INNER JOIN` and `LEFT JOIN`?** Only matching rows
  versus all left rows with NULLs for non-matches.
- **What is an index and why does it make queries faster?** A B+ tree that avoids a full
  table scan; it costs write time and storage.
- **What is a transaction?** A unit of work that commits entirely or not at all.
- **What does ACID stand for?** Atomicity, Consistency, Isolation, Durability.
- **What is caching and why use Redis?** Keeping frequently read data in fast in-memory
  storage to cut latency and database load.
- **What is the difference between authentication and authorization?** Who you are
  versus what you may do.
- **What is an environment variable used for in a backend service?** Externalising
  configuration and secrets so the same artifact runs in every environment.
- **What is `NULL` in SQL and how do you test for it?** Unknown; use `IS NULL`, because
  `= NULL` never matches.

### Easy Backend Troubleshooting

- **The service will not start.** Read the first error in the log, then check port
  already in use, missing environment variable, and unreachable database.
- **A request returns `404` unexpectedly.** Check the route path, HTTP method, and any
  context path or base path prefix.
- **The database connection fails.** Verify host, port, credentials, TLS requirement,
  and network reachability from the service.

---

## 6. Medium-Level Interview Knowledge

```yaml
job_field: backend_development
topic: medium_level_knowledge
difficulty: medium
keywords: [applied_backend, debugging, configuration, integration, comparison, trade_offs]
```

- **Why would you use Redis in a backend application?** Cutting read latency for hot
  data, session storage across instances, rate-limit counters, transient job state, and
  pub/sub. Then state the cost: another failure domain plus a staleness window.
- **How do you troubleshoot a container that cannot connect to a database?** Resolve the
  hostname from inside the container, check the port is reachable, confirm the container
  is on the right network, verify credentials and TLS mode, and check the database's
  connection limit and allowed hosts.
- **How do you design pagination for a large table?** Keyset pagination on an indexed,
  stable sort key; explain why offset pagination degrades and can skip rows on concurrent
  inserts.
- **Your API is slow only under load. Where do you look?** Connection pool size versus
  concurrency, lock contention, N+1 queries, missing indexes, garbage collection pauses,
  and downstream service latency.
- **How would you implement rate limiting?** Token bucket in a shared store keyed by API
  key or IP, with `429` and `Retry-After` on rejection, plus a decision about behaviour
  when the store is down (fail open or fail closed).
- **How do you prevent duplicate order creation when clients retry?** An idempotency key
  with a uniqueness constraint, storing and replaying the original response.
- **When would you choose a message queue over a synchronous call?** When the work is
  slow, retryable, or non-critical to the response; when you need to absorb spikes; when
  multiple consumers care about the event.
- **Explain database connection pooling and how you size a pool.** Reusing established
  connections; size relative to database capacity and worker concurrency, not
  arbitrarily large — an oversized pool moves the queue into the database.
- **How do you handle schema migrations in CI/CD?** Versioned migration files run
  automatically, backward-compatible changes only, expand-then-contract for renames, and
  never a destructive migration in the same release as the code that stops using the
  column.
- **JWT or server-side sessions for a new API — which and why?** Discuss revocation,
  horizontal scaling, token size, and whether multiple services must validate
  independently.
- **How do you debug an N+1 query problem?** Enable SQL logging or APM, count queries per
  request, and confirm the fix reduces the count rather than just the wall time.
- **What does `@Transactional` not do?** It does not apply to self-invocation through
  `this`, and by default does not roll back on checked exceptions.

---

## 7. Hard-Level Interview Knowledge

```yaml
job_field: backend_development
topic: hard_level_knowledge
difficulty: hard
keywords: [distributed_backend, consistency, scaling, sharding, resilience, architecture]
```

- **Design a system that must never double-charge a customer.** Idempotency keys, a
  uniqueness constraint as the final arbiter, the outbox pattern for publishing payment
  events, a saga with compensating refunds, and reconciliation against the payment
  provider as a backstop.
- **How do you scale writes when a single primary database is saturated?** In order of
  increasing cost: reduce write amplification and indexes, batch writes, move
  non-essential writes to async, partition the table, then shard by a key with good
  distribution. Discuss what breaks: cross-shard joins, global uniqueness, and
  transactions spanning shards.
- **Design an event-driven order processing system.** Topic and partition design, keying
  for per-customer ordering, consumer group scaling, idempotent consumers, DLQ policy,
  replay strategy, and how you evolve the event schema without breaking old consumers
  (schema registry and compatibility rules).
- **How do you achieve read scalability without stale-data bugs?** Read replicas with
  explicit acknowledgement of replication lag; route read-your-own-writes traffic to the
  primary or use a session-consistency token.
- **Explain the dual-write problem and how you solve it.** Writing to the database and
  publishing a message are two separate systems and cannot be made atomic; the outbox
  pattern with change data capture is the standard resolution.
- **How would you make an existing synchronous request path resilient to a flaky
  third-party API?** Timeout, bounded retry with jitter, circuit breaker, cached
  fallback, and pushing the call off the request path entirely if the business allows
  eventual completion.
- **How do you migrate a monolith to services without a big-bang rewrite?** The strangler
  pattern: put a facade in front, extract one bounded context at a time with its own
  data, dual-run and compare, then cut over and delete the old path.
- **Design a multi-tenant backend.** Compare shared schema with a tenant column
  (cheapest, needs airtight row-level enforcement), schema per tenant, and database per
  tenant (strongest isolation, most operational overhead). Include noisy-neighbour
  control and per-tenant rate limits.
- **How do you guarantee ordering and exactly-once effects in a distributed consumer?**
  Partition by entity key for ordering, and achieve exactly-once *effects* through
  idempotent writes and a deduplication store rather than claiming exactly-once delivery.
- **What is your strategy for zero-downtime deployment of a stateful service?** Backward-
  compatible schema and API changes, rolling or blue-green deploys, readiness gating,
  connection draining, and feature flags to decouple deploy from release.

---

## 8. Practical Engineering Scenarios

```yaml
job_field: backend_development
topic: practical_scenarios
difficulty:
  - medium
  - hard
keywords: [scenario, incident, api_failure, slow_query, production_backend]
```

### Scenario A — The API is returning HTTP 500 errors after a deploy

- **Initial question.** What do you check first?
- **Expected reasoning.** Look at the exception in the logs and correlate to the deploy.
  Distinguish a code fault from a dependency fault: a `500` caused by a database timeout
  is a different problem from a `NullPointerException`.
- **Follow-up.** Would you roll back immediately? Under what condition would you fix
  forward instead?
- **Deeper.** The error only affects requests with a particular payload shape. What does
  that tell you? (A new code path, missing validation, or a null-handling gap.)
- **Troubleshooting.** How do you find the failing requests without a correlation id?
- **Trade-off.** Returning `500` versus `503` versus a degraded `200` with partial data.

### Scenario B — A database query has become slow

The endpoint was fine for a year and is now timing out.

- **Initial question.** How do you diagnose it?
- **Expected reasoning.** `EXPLAIN ANALYZE` the query, check for a sequential scan, check
  row growth, verify the index still matches the predicate, and check whether statistics
  are current. Also check whether the query changed or only the data volume did.
- **Follow-up.** The plan shows a sequential scan on 20 million rows filtered by
  `status` and `created_at`. What index would you create and in what column order?
- **Deeper.** The index exists but is not used. Why might the planner ignore it?
  (Low selectivity, type mismatch, function on the column, stale statistics, or the
  planner correctly estimating that a scan is cheaper.)
- **Trade-off.** Adding another index versus rewriting the query versus archiving old
  rows versus partitioning the table.

### Scenario C — An API is receiving unauthorized requests

Logs show requests with valid-looking tokens accessing other users' records.

- **Initial question.** What is the most likely defect?
- **Expected reasoning.** Missing object-level authorization: the handler validates the
  token but not that the record belongs to the caller (IDOR).
- **Follow-up.** How do you stop it right now, and how do you prevent the whole class of
  bug? (Centralised policy enforcement, deny-by-default, automated tests that attempt
  cross-tenant access.)
- **Deeper.** How do you determine what was accessed? (Audit logs correlating subject,
  resource, and outcome.)
- **Trade-off.** Enforcement in a gateway versus in each service.

### Scenario D — Background jobs are piling up

Consumer lag on the queue is growing and users report delayed emails.

- **Expected reasoning.** Establish whether producers sped up or consumers slowed down.
  Check consumer error rate, per-message processing time, downstream dependency latency,
  and whether one poison message is blocking a partition.
- **Follow-up.** How do you scale consumers safely? (More consumers than partitions adds
  nothing in Kafka; ordering guarantees constrain parallelism.)
- **Deeper.** How do you drain the backlog without overwhelming the downstream API?
  (Rate-limited workers, prioritised queues, temporarily shedding low-value messages.)

### Scenario E — Duplicate records appearing after a network blip

- **Expected reasoning.** At-least-once delivery plus a non-idempotent consumer, or a
  client retry against a non-idempotent `POST`.
- **Follow-up.** How do you repair the existing duplicates and prevent recurrence?
  (Deduplicate by a natural key, then add a unique constraint and an idempotency key.)
- **Deeper.** Why is a unique constraint in the database more reliable than an
  application-level check? (The application check is a race under concurrency.)

### Scenario F — Memory grows steadily until the service is OOM-killed

- **Expected reasoning.** Unbounded in-process cache, an ever-growing static collection,
  large response buffering, or a connection or thread leak. Take a heap dump and compare
  retained sizes over time.
- **Deeper.** How would you distinguish a genuine leak from an under-provisioned heap?
  (Does usage plateau after garbage collection or trend upward monotonically?)

---

## 9. Troubleshooting Knowledge

```yaml
job_field: backend_development
topic: troubleshooting
difficulty:
  - medium
  - hard
keywords: [troubleshooting, timeout, connection_pool, deadlock, latency, 502, 504]
```

**`502` versus `504` from a proxy.** `502 Bad Gateway` means the upstream returned an
invalid or aborted response, often a crashed worker. `504 Gateway Timeout` means the
upstream did not respond within the proxy's timeout, which usually points at a slow
query or a blocked thread pool, or at a proxy timeout shorter than the application's.

**Connection pool exhaustion.** Requests block waiting for a connection while the
database is idle. Look for connections leaked on exception paths, transactions held open
across remote calls, and a pool smaller than the concurrency the server accepts.

**Database deadlocks in the log.** Identify the two statements involved and the row
order each transaction took. Fix by ordering updates consistently, shortening
transactions, or reducing the isolation level where the guarantee is not needed.

**Latency spikes at regular intervals.** Suspect garbage collection pauses, a cron job,
cache expiry synchronisation (add TTL jitter), or a scheduled backup on the database.

**Thread pool starvation.** All request threads blocked on a slow downstream call.
Timeouts and bulkheads are the structural fix; adding threads only postpones it.

**A request works with curl but not from the frontend.** Suspect CORS preflight, a
missing header, cookie `SameSite` policy, or an intermediate proxy stripping headers.
CORS is enforced by the browser, not by the server, so the server log looks healthy.

**Intermittent timeouts to one dependency.** Check DNS caching and TTL, connection reuse
and keep-alive settings, upstream instance health, and whether retries are amplifying
load on an already-struggling service.

---

## 10. Architecture and System Design

```yaml
job_field: backend_development
topic: backend_system_design
difficulty:
  - medium
  - hard
keywords: [system_design, api_gateway, cqrs, event_driven, bff, monolith, service_boundary]
```

Design decisions a backend engineer is expected to argue:

- **Monolith, modular monolith, or microservices.** Judge by team topology, deployment
  independence needs, and operational maturity — not by fashion.
- **Synchronous versus asynchronous integration.** Synchronous calls are simple and
  give immediate consistency but couple availability: if a dependency is down, you are
  down. Asynchronous messaging decouples availability at the cost of eventual
  consistency and more complex debugging.
- **CQRS.** Separate the write model from one or more read models optimised for queries.
  Useful when read and write shapes diverge sharply; it adds synchronisation lag and
  operational surface, so it is not a default.
- **Event sourcing.** Persist the sequence of state-changing events as the source of
  truth and derive current state. Gives a perfect audit trail and time travel; costs
  schema evolution complexity, snapshotting, and a steep learning curve. It is
  independent of CQRS despite frequently appearing together.
- **Backend for Frontend (BFF).** A per-client backend that aggregates and reshapes data
  for a specific UI, avoiding a lowest-common-denominator API.
- **Service boundaries** should follow business capabilities and data ownership. If two
  services must always be deployed together, the boundary is wrong.
- **Idempotency and retries** must be designed in at the API contract level, not bolted
  on after the first duplicate-charge incident.

---

## 11. Security

```yaml
job_field: backend_development
topic: backend_security
difficulty:
  - medium
  - hard
keywords: [api_security, sql_injection, ssrf, rate_limiting, secrets, cors, validation]
```

Backend-specific controls, aligned with the OWASP Top 10:2025 categories:

- **Broken access control (A01).** Server-side authorization on every endpoint,
  object-level ownership checks, deny by default. SSRF is now grouped within this
  category: validate and allowlist any URL the server fetches on a user's behalf, and
  block requests to internal address ranges and cloud metadata endpoints.
- **Security misconfiguration (A02).** No debug endpoints in production, no default
  credentials, restrictive CORS, correct security headers, and error responses that do
  not leak stack traces.
- **Software supply chain failures (A03).** Pin dependencies, use a lock file, scan for
  known vulnerabilities, and verify build provenance.
- **Cryptographic failures (A04).** TLS for all traffic including service-to-service,
  strong password hashing, encryption at rest for sensitive columns, and no secrets in
  source control or logs.
- **Injection (A05).** Parameterised queries and prepared statements always. Also applies
  to NoSQL query construction, OS command execution, and template rendering.
- **Authentication failures (A07).** Rate-limit and lock out credential stuffing, support
  MFA, use short-lived tokens with revocable refresh tokens, and never reveal in an error
  whether the username or the password was wrong.
- **Logging and alerting failures (A09).** Log authentication and authorization events
  with enough context to investigate, without logging credentials or personal data, and
  alert on anomalies.

Additional backend concerns: input validation at the boundary with an allowlist, request
size limits to prevent resource exhaustion, and per-identity rate limiting.

The cybersecurity guide holds the canonical depth on cryptography, threat modelling, and
incident response.

---

## 12. Performance and Scalability

```yaml
job_field: backend_development
topic: backend_performance
difficulty:
  - medium
  - hard
keywords: [performance, latency, throughput, connection_pool, load_testing, horizontal_scaling]
```

**Where backend latency actually goes.** In most services the dominant costs are
database round trips, downstream HTTP calls, serialisation of large payloads, and lock
or pool contention — rarely the business logic itself.

Practical levers, cheapest first:

1. **Remove N+1 queries** and add the missing index.
2. **Reduce payload size** — select only needed columns, compress responses, paginate.
3. **Batch or parallelise** independent downstream calls instead of issuing them
   sequentially.
4. **Cache** hot, read-mostly data with an explicit TTL.
5. **Move non-critical work async** so the request returns as soon as the durable write
   is done.
6. **Tune pools** — connection pool, thread pool, and HTTP client pool sized to actual
   concurrency and downstream capacity.
7. **Scale horizontally** once the service is stateless; sticky sessions are a smell.

**Statelessness is the prerequisite for horizontal scaling.** In-process session state,
in-process caches assumed to be coherent, and local file storage all break when a second
instance appears.

**Load testing** must model realistic concurrency and data distribution. Testing with an
empty database or a single hot key produces numbers that do not survive production.

**Know your percentiles.** Report p50, p95, and p99 separately, and measure at the client
side where possible — server-side timers exclude queueing delay.

---

## 13. Common Candidate Mistakes

```yaml
job_field: backend_development
topic: common_mistakes
difficulty:
  - easy
  - medium
  - hard
keywords: [mistakes, misconceptions, backend_pitfalls]
```

- Describing JWT as "more secure" than sessions instead of describing the revocation and
  scaling trade-off.
- Believing a JWT payload is encrypted.
- Saying "we use microservices" without being able to name the service boundaries or the
  data ownership rule.
- Claiming exactly-once delivery from a message broker without mentioning idempotent
  consumers.
- Adding an index for every column mentioned in a `WHERE` clause, with no regard for
  write cost or column order.
- Confusing `403` with `401`, or returning `200` with an error body.
- Treating an ORM as a substitute for understanding SQL.
- Forgetting that `@Transactional` self-invocation does not open a transaction.
- Introducing a cache with no invalidation story and no answer for stale reads.
- Retrying non-idempotent operations automatically.
- Putting business logic in the controller and calling it "layered architecture".
- Ignoring connection pool sizing and assuming more threads means more throughput.
- Validating input only in the frontend.

---

## 14. Interview Evaluation Points

```yaml
job_field: backend_development
topic: evaluation_points
difficulty:
  - easy
  - medium
  - hard
keywords: [evaluation, rubric, backend_signals, assessment]
```

An interviewer should be able to determine whether the candidate understands:

- **HTTP semantics deeply enough** to pick the right method and status code and to
  explain idempotency without prompting.
- **What the database is actually doing** — whether they can read a query plan, reason
  about index usage, and describe transaction isolation in terms of observable
  phenomena rather than level names alone.
- **Where correctness is enforced** — that constraints and authorization belong on the
  server and in the schema, not in the client.
- **Failure thinking** — whether every remote call in their design has a timeout, a
  retry policy, and a defined behaviour when the dependency is down.
- **Consistency trade-offs** — whether they recognise when eventual consistency is
  acceptable and when it is not.
- **Caching judgement** — whether they volunteer the invalidation and staleness cost.
- **Observability instinct** — whether they would be able to debug their own design in
  production at 3 a.m.
- **Scope discipline** — whether they can identify the simplest design that meets the
  stated requirements instead of reaching for microservices and Kafka by default.

**Adaptive guidance.** A strong SQL answer should escalate toward isolation levels,
locking, and sharding. A weak answer on distributed messaging should step down to HTTP
status codes, REST resource modelling, or basic SQL joins rather than another
distributed-systems question.

---

## 15. Cross-Topic Relationships

```yaml
job_field: backend_development
topic: cross_topic_relationships
difficulty: medium
keywords: [relationships, topic_map, backend_dependencies]
```

Distinctions that must not be collapsed:

- **REST is not HTTP.** HTTP is the protocol; REST is an architectural style that uses
  it. A JSON-over-HTTP RPC endpoint is not automatically RESTful.
- **Authentication is not authorization.** Identity versus permission.
- **OAuth 2.0 is not authentication.** It is authorization delegation; OpenID Connect
  adds authentication on top of it.
- **A message queue is not an event stream.** Work distribution with consumption versus
  a retained, replayable, multi-consumer log.
- **Microservices are not distributed systems.** A deployment style versus the broader
  class of systems it belongs to.
- **An ORM is not a database.** It generates SQL; the database still decides the plan.
- **Redis is not only a cache.** It is an in-memory data structure store that is commonly
  used as a cache.
- **Concurrency is not throughput.** Accepting more concurrent requests without capacity
  behind them just moves the queue.
- **Docker is not containerization.** Containerization is the OS-level isolation
  technique; Docker is one widely used implementation and toolchain.

Topic progression for adaptive interviews (easy to hard):

`http -> rest_apis -> sql -> transactions -> indexing -> caching -> authentication -> authorization -> microservices -> messaging -> backend_system_design`

Breadth track when the candidate stalls:

`backend_architecture -> backend_testing -> observability -> docker_for_backend`

Canonical depth lives elsewhere for:

- Data structures, algorithms, OOP, SOLID, Git — `software_engineering_interview_guide.md`
- Browser behaviour, CORS from the client side, React — `frontend_development_interview_guide.md`
- Docker, Kubernetes, CI/CD, Terraform, cluster operations — `devops_cloud_interview_guide.md`
- Kafka internals, Spark, Airflow, warehouse modelling — `data_engineering_interview_guide.md`
- OWASP detail, cryptography, incident response — `cybersecurity_interview_guide.md`
- Test strategy, automation frameworks, flaky tests — `qa_testing_interview_guide.md`
