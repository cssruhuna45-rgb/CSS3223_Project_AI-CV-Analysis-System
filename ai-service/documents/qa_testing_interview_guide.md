# QA and Software Testing Interview Knowledge Guide

```yaml
job_field: qa_testing
job_field_name: QA / Test Engineering
canonical_topics:
  - testing_fundamentals
  - test_levels
  - test_types
  - test_design
  - manual_testing
  - unit_testing
  - integration_testing
  - system_testing
  - acceptance_testing
  - regression_testing
  - api_testing
  - ui_testing
  - test_automation
  - selenium
  - playwright
  - ci_cd_testing
  - mocking
  - test_data
  - defect_management
  - test_planning
  - risk_based_testing
  - performance_testing
  - security_testing_fundamentals
  - sql_for_testers
difficulty:
  - easy
  - medium
  - hard
```

This document is the canonical interview knowledge base for the **qa_testing** job field.
It owns testing theory, test design techniques, test levels and types, automation strategy
and frameworks (Selenium, Playwright), flaky test triage, defect management, test planning,
and performance and security testing fundamentals. Developer-side unit testing appears here
in depth; the software engineering and backend guides reference it rather than duplicating
it.

---

## 1. Job Field Overview

```yaml
job_field: qa_testing
topic: testing_fundamentals
subtopic: field_overview
difficulty: easy
keywords: [qa, testing, quality_assurance, quality_control, responsibilities, sdlc]
```

Software testing is the activity of evaluating a product to determine whether it satisfies
requirements and to discover where it fails. **Quality assurance is broader**: it covers the
processes that prevent defects, not only the activities that detect them. Testing is quality
*control*; QA includes process, standards, and prevention. Interviews frequently use the
terms interchangeably, and knowing the distinction is a signal.

**Testing cannot prove the absence of defects.** It can demonstrate the presence of defects
and build justified confidence. Exhaustive testing is impossible for any non-trivial system,
which is why test *design* and *risk prioritisation* are the core professional skills rather
than volume of test cases.

Typical responsibilities:

- Analyse requirements for testability, ambiguity, and missing cases.
- Design tests that maximise defect discovery per test executed.
- Execute manual and exploratory testing where human judgement matters.
- Build and maintain automated tests at the appropriate level.
- Integrate tests into CI/CD so feedback is fast and trusted.
- Manage test data and environments.
- Report defects with reproducible, actionable detail.
- Assess and communicate release risk.

**Testing is not test automation.** Automation is a technique for executing predefined
checks repeatedly and cheaply. It cannot exercise judgement, notice the unexpected, or
evaluate whether the requirement was right. Exploratory and manual testing remain essential
for exactly those things. A candidate who equates the two has an incomplete model of the
field.

---

## 2. Core Competencies

```yaml
job_field: qa_testing
topic: core_competencies
difficulty: easy
keywords: [competencies, qa_skills, evaluation]
```

1. **Testing fundamentals** — principles, levels, types, and the limits of testing.
2. **Test design techniques** — equivalence partitioning, boundary values, decision tables,
   state transitions, pairwise.
3. **Manual and exploratory testing** — charters, heuristics, and structured investigation.
4. **Requirements analysis** — finding ambiguity and missing acceptance criteria before code
   is written.
5. **Automation strategy** — what to automate, at which level, and what not to automate.
6. **A UI automation framework** — Selenium or Playwright, with sound locator and waiting
   strategy.
7. **API testing** — request construction, contract and schema validation, negative cases.
8. **Unit and integration testing concepts** — including mocking and test doubles.
9. **SQL** — verifying and preparing data directly.
10. **CI/CD integration** — pipeline stages, parallelisation, reporting, and quality gates.
11. **Test data and environment management** — deterministic, isolated, privacy-safe.
12. **Defect management** — reproduction, severity versus priority, lifecycle.
13. **Test planning and risk-based prioritisation.**
14. **Performance testing fundamentals** — load, stress, soak, and how to read results.
15. **Security testing fundamentals** — common vulnerability classes and where they surface.
16. **Communication** — reporting risk in terms a release decision can be made on.

---

## 3. Foundational Knowledge

### 3.1 Testing Principles

```yaml
job_field: qa_testing
topic: testing_fundamentals
subtopic: principles
difficulty: easy
keywords: [principles, defect_clustering, pesticide_paradox, early_testing, context]
```

Widely taught principles, each with a practical consequence:

- **Testing shows the presence of defects, not their absence.** Passing tests mean nothing
  was found, not that nothing is there.
- **Exhaustive testing is impossible.** Even a form with ten fields has an unmanageable input
  space, so tests must be *selected* using design techniques and risk.
- **Early testing saves time and money.** A requirement defect caught in analysis costs a
  conversation; the same defect found in production costs an incident.
- **Defects cluster.** A small number of modules typically contain most of the defects — often
  the newest, most complex, or most frequently changed. Direct effort there.
- **The pesticide paradox.** The same tests repeated stop finding new defects. Test suites
  need periodic review, new cases, and exploratory work alongside regression.
- **Testing is context dependent.** A medical device, a banking backend, and a marketing site
  need different depth, evidence, and rigour.
- **Absence of errors is a fallacy.** A defect-free system that solves the wrong problem is
  still a failure. Validating the requirement matters as much as verifying the build.

**Verification versus validation.** Verification asks "did we build the product right?"
(against the specification). Validation asks "did we build the right product?" (against the
actual need). Both are required, and they fail in different ways.

**Error, defect, failure.** A human **error** introduces a **defect** (bug) in the artifact,
which under the right conditions causes a **failure** in operation. Precision here helps in
root cause discussion.

### 3.2 Test Levels

```yaml
job_field: qa_testing
topic: test_levels
difficulty:
  - easy
  - medium
keywords: [unit_testing, integration_testing, system_testing, acceptance_testing, test_pyramid]
```

- **Unit testing.** One component in isolation, with collaborators replaced by test doubles.
  Fast, deterministic, and precise at localising a failure. Usually owned by developers.
- **Integration testing.** Two or more components working together — a service and its
  database, or two services over HTTP. Catches wiring, serialisation, contract, and
  configuration defects that unit tests structurally cannot.
- **System testing.** The complete, integrated system tested against requirements, including
  non-functional characteristics. Closest to how the product actually behaves.
- **Acceptance testing.** Whether the system meets business needs and is ready for release.
  Variants include user acceptance testing, operational acceptance (backups, monitoring,
  runbooks), contractual and regulatory acceptance, and alpha/beta testing.

**The test pyramid** recommends many fast unit tests, fewer integration tests, and fewest
end-to-end tests. The rationale is cost and reliability: end-to-end tests are the slowest,
most expensive to maintain, and most prone to flakiness, and they localise failures poorly.

**The inverted pyramid (the "ice cream cone")** — a large end-to-end suite with little
underneath — is a recognised anti-pattern producing slow, flaky, distrusted pipelines.

**The trophy shape** is a legitimate variant argued for in some contexts, weighting
integration tests most heavily on the grounds that they catch the defects users actually
experience while remaining reasonably fast. Being able to argue the shape from context rather
than reciting the pyramid is a stronger answer.

### 3.3 Test Types

```yaml
job_field: qa_testing
topic: test_types
difficulty:
  - easy
  - medium
keywords: [functional, non_functional, regression, smoke, sanity, exploratory, usability, compatibility]
```

**Functional testing** verifies what the system does against requirements.

**Non-functional testing** verifies how well it does it: performance, reliability, security,
usability, accessibility, compatibility, maintainability, and portability. Non-functional
requirements are frequently unstated, and eliciting them ("how fast is fast enough? how many
concurrent users?") is a valuable QA contribution.

**By purpose and timing:**

- **Smoke testing** — a quick check that the build is stable enough to test at all. Runs
  first; a failure stops the pipeline.
- **Sanity testing** — a narrow check that a specific fix or change works, usually after a
  small change.
- **Regression testing** — re-running existing tests to confirm that a change did not break
  previously working behaviour. This is the primary target for automation because it is
  repetitive and grows without bound.
- **Retesting / confirmation testing** — verifying that a specific reported defect is fixed.
  Distinct from regression testing, which checks everything else.
- **Exploratory testing** — simultaneous learning, test design, and execution, guided by a
  charter. It is structured and skilled work, not "clicking around", and it finds classes of
  defects that scripted tests miss.
- **Ad hoc testing** — informal and unstructured, with no charter.
- **Usability and accessibility testing** — whether real people can use it, including people
  using assistive technology.
- **Compatibility testing** — browsers, devices, operating systems, screen sizes, and network
  conditions.
- **Localisation testing** — language, formats, currency, right-to-left layout, and text
  expansion.

**Black box, white box, grey box.** Testing from the outside against specified behaviour;
testing with knowledge of internal structure (including coverage-driven design); and a
combination. Most professional testing is grey box.

---

## 4. Core Technical Topics

### 4.1 Test Design Techniques

```yaml
job_field: qa_testing
topic: test_design
difficulty:
  - medium
  - hard
keywords: [equivalence_partitioning, boundary_value, decision_table, state_transition, pairwise, use_case]
```

Test design techniques are how a tester reduces an infinite input space to a small set of
high-value cases. This is the most testable skill in the field.

**Equivalence partitioning.** Divide inputs into classes where every member should be treated
identically, then test one representative per class. For an age field accepting 18–65:
below 18, 18–65, above 65, non-numeric, and empty.

**Boundary value analysis.** Defects cluster at boundaries because of off-by-one errors and
incorrect comparison operators. For the same field, test 17, 18, 19, 64, 65, 66. Combining
partitioning with boundary analysis is the standard baseline for any input.

**Decision table testing.** For combinations of conditions with distinct outcomes, tabulate
condition combinations and expected results. It systematically exposes unspecified
combinations — often revealing that the requirement never said what happens when two flags are
both true.

**State transition testing.** For systems with modes (order: created → paid → shipped →
delivered → cancelled), test valid transitions, and critically, **invalid transitions** —
can an order be shipped before payment, or cancelled after delivery? Invalid transitions are
where the interesting defects live.

**Pairwise / combinatorial testing.** When many parameters combine, testing all combinations
is infeasible. Pairwise testing covers every pair of parameter values in a small number of
cases, based on the empirical observation that most defects involve at most two factors.

**Use case and scenario testing.** End-to-end flows representing real user goals, including
alternative and exception flows.

**Error guessing and experience-based techniques.** Deliberately targeting likely weak points:
empty input, zero, negative numbers, very large values, special characters and Unicode, SQL
and script metacharacters, duplicate submissions, concurrent edits, timezone boundaries,
leap days, and network interruption mid-operation. Structured as a checklist, this is
legitimate technique rather than guesswork.

**Coverage criteria in white box testing.** Statement coverage (every line executed), branch
coverage (every decision outcome taken), and path coverage (every route through, usually
infeasible). **Coverage is a measure of what was exercised, not of what was verified** — a
test with no assertions can produce high coverage.

### 4.2 Manual and Exploratory Testing

```yaml
job_field: qa_testing
topic: manual_testing
difficulty:
  - easy
  - medium
keywords: [manual_testing, exploratory, charter, session_based, heuristics, test_case, oracle]
```

**Manual testing** remains essential where human judgement, perception, and curiosity are the
instrument: usability, visual correctness, accessibility with a screen reader, complex
exploratory investigation, and any first pass on a new feature where the expected behaviour
is still being clarified.

**Test cases versus charters.** A scripted test case specifies preconditions, steps, and
expected results — repeatable and auditable, and rigid. An exploratory **charter** states a
mission ("explore checkout with expired payment methods to discover error-handling defects")
and leaves the path to the tester.

**Session-based test management** gives exploratory testing structure and accountability:
time-boxed sessions against a charter, with notes on what was covered, what was found, and
what remains. It answers the usual management objection that exploratory testing is
unmeasurable.

**Test oracles.** The mechanism for deciding whether observed behaviour is correct: the
specification, a comparable system, historical behaviour, internal consistency, user
expectation, or a domain expert. **The hardest testing problems are oracle problems** — you
can see the output but cannot easily tell whether it is right.

**Useful heuristics.** Consistency (with history, with comparable products, within the
product, with the claims made), the CRUD lifecycle for each entity, the "goldilocks" pattern
(too small, just right, too big), interruption (close the tab mid-flow, lose the network),
and the back button.

**A good manual tester's distinguishing habit** is noticing and pursuing something that looks
slightly wrong but was not on the plan.

### 4.3 Test Automation Strategy

```yaml
job_field: qa_testing
topic: test_automation
difficulty:
  - medium
  - hard
keywords: [automation_strategy, roi, maintenance, flaky, what_to_automate, framework, page_object]
```

**Automation is an investment with ongoing maintenance cost**, not a one-time saving. The
decision to automate a test should be justified.

**Good candidates for automation:** stable, high-value regression paths; repetitive checks
run every build; data-driven cases across many inputs; API-level verification; smoke tests;
and setup and teardown work.

**Poor candidates:** tests of features still changing daily; one-off verifications; anything
requiring human judgement of look, feel, or usability; exploratory investigation; and
scenarios so complex to automate that the automation is less reliable than the feature.

**Automate at the lowest level that can catch the defect.** A validation rule should be a
unit test, not a browser test that clicks through three pages. Testing business logic through
the UI is slow, fragile, and gives poor failure messages.

**Framework design principles.**

- **Page Object Model** (or a screenplay/component variant) separates page structure and
  locators from test intent, so a UI change updates one class rather than fifty tests.
- **Independent tests.** Each test creates its own data and cleans up. Tests that depend on
  execution order or on state left by another test fail unpredictably and cannot be
  parallelised.
- **Explicit, condition-based waits.** Wait for the element or state you need, never a fixed
  sleep. Fixed sleeps are simultaneously slow and unreliable.
- **Robust locators.** Prefer stable test identifiers (`data-testid`), accessible roles, and
  visible text over deep XPath tied to DOM structure. A locator like
  `//div[3]/span[2]/button` breaks on any layout change.
- **Meaningful assertions and failure messages.** A failure should say what was expected and
  what happened, without requiring a debugging session.
- **Test code is production code.** Reviewed, version controlled, refactored, and held to the
  same standards. An unmaintained automation suite decays into a liability.

**Measuring automation value.** Defects caught before release, feedback time to developers,
and manual effort avoided — not the count of automated tests, which incentivises the wrong
behaviour.

### 4.4 UI Automation — Selenium and Playwright

```yaml
job_field: qa_testing
topic: ui_testing
difficulty:
  - medium
  - hard
keywords: [selenium, playwright, webdriver, locator, wait, headless, cross_browser, auto_wait]
```

**Selenium** is a long-established browser automation project. **Selenium WebDriver**
implements the W3C WebDriver protocol, driving real browsers through their drivers, and has
the widest language and browser support and the largest ecosystem. Selenium Grid distributes
execution across machines and browsers.

- **Waiting is the main source of difficulty.** Implicit waits set a global polling timeout
  and interact confusingly with explicit waits; **explicit waits** (`WebDriverWait` with an
  expected condition) are the correct default. Mixing implicit and explicit waits produces
  unpredictable timeouts.
- **Common exceptions and what they mean.** `NoSuchElementException` — the locator did not
  match (wrong selector, or not rendered yet). `StaleElementReferenceException` — the element
  reference is no longer attached because the DOM re-rendered; re-locate it.
  `ElementNotInteractableException` — present but hidden, disabled, or covered by an overlay.
  `TimeoutException` — the wait condition never became true.
- **Frames and windows** require explicit context switching; elements inside an iframe are
  invisible to the driver until you switch into it.

**Playwright** is a more recent browser automation library from Microsoft, driving Chromium,
Firefox, and WebKit through a single API.

- **Auto-waiting** is built in: actions wait for the element to be attached, visible, stable,
  enabled, and able to receive events before acting, which removes a large class of flakiness
  by default.
- **Web-first assertions** retry until the condition holds or the timeout expires, rather
  than asserting once on a snapshot.
- **Browser contexts** provide isolated sessions in one browser instance — fast, parallel,
  and independent, which suits per-test isolation.
- **Built-in capabilities** that otherwise require extra tooling: network interception and
  request mocking, tracing with a time-travel viewer, screenshots and video, and codegen.

**Choosing between them.** Selenium's strengths are ecosystem maturity, breadth of language
and browser support, and existing organisational investment. Playwright's are reliability by
default, speed, tracing, and a modern API. Neither is universally correct, and "Playwright is
better" without reasoning is a weak answer. Cypress is a third common option with a different
in-browser execution model, strong developer experience, and its own architectural
constraints.

**Cross-browser and device coverage** is a cost decision: run the full suite on the primary
browser and a targeted subset elsewhere, driven by actual user analytics.

**Visual regression testing** compares rendered screenshots against baselines. Powerful for
catching unintended layout changes; prone to false positives from font rendering, animation,
and dynamic content, so it needs masking and tolerance tuning.

### 4.5 API Testing

```yaml
job_field: qa_testing
topic: api_testing
difficulty:
  - medium
  - hard
keywords: [api_testing, rest, status_code, schema_validation, contract_testing, postman, negative_testing]
```

API testing sits at the most valuable level for automation: faster and far more stable than
UI tests, while still exercising real business logic and integration.

**What to verify.**

- **Status codes** appropriate to the outcome — `200`, `201` with a `Location` header, `204`,
  `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`.
- **Response body** — schema conformance (validate against the OpenAPI or JSON Schema
  definition, not just spot-checking fields), data correctness, and absence of fields that
  should not be exposed.
- **Headers** — content type, caching, correlation id, security headers.
- **Error contract** — consistent shape, machine-readable code, no stack traces or internal
  details leaked.
- **Idempotency** — repeating a `PUT` or `DELETE` produces the same state; a retried `POST`
  with an idempotency key does not duplicate.
- **Authorization** — the same request with another user's token must not return this user's
  data. **Testing for broken access control belongs in the standard API test suite**, not only
  in a security review.
- **Boundary and negative cases** — missing required fields, wrong types, oversized payloads,
  extra unexpected fields, malformed JSON, and injection-shaped strings.
- **Pagination, filtering, and sorting** behaviour, including empty results and out-of-range
  pages.
- **Performance sanity** — response time under normal conditions.

**Contract testing** verifies that a provider and its consumers agree on the interface,
running on both sides in CI. It is the practical answer to independently deployed services
drifting apart, and it catches breakage before integration rather than during it.

**Tooling.** Postman/Newman for exploration and collection runs, REST Assured (Java),
requests plus pytest (Python), Supertest (Node), and Pact for consumer-driven contracts. The
tool matters far less than knowing what to assert.

### 4.6 Unit and Integration Testing, Mocking

```yaml
job_field: qa_testing
topic: unit_testing
difficulty:
  - medium
  - hard
keywords: [unit_test, mock, stub, fake, spy, test_double, tdd, integration_test, testcontainers]
```

**Unit test characteristics.** Fast (milliseconds), isolated, deterministic, and focused on
one behaviour with a clear name describing that behaviour. The **arrange–act–assert** structure
keeps them readable.

**Test doubles**, precisely:

- **Dummy** — passed but never used, only to satisfy a signature.
- **Stub** — returns canned responses; no assertions on interaction.
- **Spy** — a stub that also records how it was called.
- **Mock** — pre-programmed with expectations and fails if the interaction differs.
- **Fake** — a working lightweight implementation, such as an in-memory repository.

**What to mock.** Boundaries you do not control or that make tests slow or non-deterministic:
network calls, the clock, randomness, the filesystem, and message brokers. **Over-mocking is a
recognised anti-pattern** — a test that mocks everything verifies only that the code calls the
mocks in the order the test expects, and it passes happily while the real integration is
broken.

**Integration tests** should use the real dependency where practical. Running the actual
database engine in a container (Testcontainers or equivalent) is substantially more
trustworthy than substituting an in-memory database, because SQL dialect and transaction
behaviour differ and those differences hide real defects.

**TDD and BDD.** Test-driven development writes a failing test first, then the minimum code to
pass, then refactors — the value is design pressure and a safety net, not the tests
themselves. Behaviour-driven development expresses behaviour in Given–When–Then language to
align business, development, and testing. **BDD's value is the shared conversation**; using
Gherkin syntax purely as a scripting layer over UI automation, with no business participation,
delivers the cost and none of the benefit — a common and worth-stating criticism.

**Code coverage.** A useful indicator of untested areas and a terrible target. Enforcing 100%
coverage produces assertion-free tests written to satisfy the gate. A reasonable threshold on
new code, plus judgement about which code matters, is the defensible position.

### 4.7 Test Data and Environment Management

```yaml
job_field: qa_testing
topic: test_data
difficulty:
  - medium
  - hard
keywords: [test_data, fixtures, isolation, seeding, masking, environments, determinism, cleanup]
```

Test data problems cause more automation failures than test logic problems.

- **Determinism.** Each test creates the data it needs and does not depend on data left by
  another test or by a manual session. Shared mutable fixtures produce order-dependent,
  intermittent failures.
- **Isolation and cleanup.** Transaction rollback, per-test schema or namespace, unique
  generated identifiers, or explicit teardown. Tests that leak data eventually collide with
  each other.
- **Data builders / factories** produce valid objects with sensible defaults and only the
  fields the test cares about overridden. Far more maintainable than large static fixture
  files.
- **Time and randomness must be controlled.** Inject a clock; never assert against
  `now()`. Tests that fail at midnight, at month end, or in another timezone are a classic
  and avoidable failure.
- **Production data must not be copied raw into test environments.** Use masked,
  pseudonymised, or synthetically generated data. This is a privacy and regulatory
  requirement, not merely good hygiene.
- **Environments.** Ephemeral, containerised environments per branch or pull request remove
  the queueing and contention of a single shared staging environment, and eliminate the "who
  changed the data?" class of failure.
- **Environment parity.** Differences in configuration, data volume, and third-party stubs
  between test and production are where "it passed in staging" comes from.
- **Third-party dependencies.** Use sandbox environments, recorded responses, or service
  virtualisation. Relying on a live external service makes your pipeline fail whenever their
  service does.

### 4.8 Testing in CI/CD

```yaml
job_field: qa_testing
topic: ci_cd_testing
difficulty:
  - medium
  - hard
keywords: [ci_cd, pipeline, quality_gate, parallelization, shift_left, reporting, feedback_time]
```

Tests deliver value in proportion to how fast and how reliably they give feedback.

**Pipeline staging by cost.** Lint and static analysis, then unit tests, then integration
tests, then a deployment to a test environment, then API and end-to-end tests, then
performance and security scans on a schedule or before release. Fail fast on the cheap stages.

**Quality gates.** Defined pass criteria for promotion: all tests green, coverage threshold on
changed code, no new critical static analysis or dependency findings, and no open blocker
defects. Gates must be trustworthy — a gate that is routinely overridden is not a gate.

**Feedback time is the metric that matters.** A suite taking 90 minutes changes developer
behaviour for the worse: people batch changes and stop running it locally. Reduce it with
parallel execution, test sharding, selective execution based on changed code, and moving
checks down the pyramid.

**Test reporting.** Results must be visible with clear failure output, screenshots, video, and
traces for UI failures, plus history so intermittent failures are identifiable rather than
just re-run.

**Shift left and shift right.** Shift left moves testing earlier — requirements review,
developer testing, static analysis. Shift right extends testing into production: canary
releases, feature flags, synthetic monitoring, and observability-driven validation. Modern QA
does both; production monitoring is a testing activity in a continuous delivery model.

### 4.9 Flaky Tests

```yaml
job_field: qa_testing
topic: test_automation
subtopic: flaky_tests
difficulty:
  - medium
  - hard
keywords: [flaky, intermittent, race_condition, timing, quarantine, retry, determinism]
```

**A flaky test passes and fails without any change to the code.** Flakiness is corrosive
because it destroys trust: once a team assumes red means "run it again", real failures get
ignored.

**Root causes, roughly in order of frequency.**

1. **Timing and synchronisation** — fixed sleeps, missing waits for asynchronous work,
   animations, and assertions that run before the UI has settled.
2. **Test interdependence and shared state** — one test's data or session affecting another;
   surfaces when tests are parallelised or reordered.
3. **Environment instability** — a slow or overloaded CI runner, resource exhaustion,
   network variability, container startup timing.
4. **External dependencies** — third-party services, live APIs, and network conditions.
5. **Non-deterministic data** — random values, unseeded generators, and unordered collections
   asserted in order.
6. **Time dependence** — timezone, daylight-saving transitions, month and year boundaries,
   and tests that only fail near midnight.
7. **Genuine race conditions in the product** — the most valuable kind of flakiness, because
   the test is telling the truth about a real defect.

**Handling flakiness.**

- **Detect and measure.** Track pass/fail history per test; a test failing 3% of the time is
  identifiable from data, not memory.
- **Quarantine, do not ignore.** Move the flaky test out of the blocking suite with an owner
  and a deadline, so the pipeline stays trustworthy while the test gets fixed.
- **Automatic retries are a last resort and a hazard.** They hide real intermittent product
  defects. If used, retries must be recorded and reported, never silent.
- **Fix the cause.** Replace sleeps with condition-based waits, make tests independent,
  control the clock and randomness, stub external services, and stabilise the environment.
- **Investigate before dismissing.** "It's just flaky" is sometimes the first symptom of a
  genuine concurrency bug in production code.

### 4.10 Defect Management

```yaml
job_field: qa_testing
topic: defect_management
difficulty:
  - easy
  - medium
keywords: [bug_report, severity, priority, reproduction, triage, lifecycle, root_cause]
```

**A defect report is a persuasive technical document.** Its job is to get the right bug fixed
quickly, which requires enough information to reproduce without a conversation.

**Contents of a good report:**

- A specific, searchable title describing the problem, not the screen.
- Environment: build or commit, browser and version, OS, device, environment name, and user
  or role.
- Preconditions and test data used.
- Numbered, minimal reproduction steps — minimal matters, because it isolates the cause.
- Expected result and actual result, stated separately.
- Evidence: screenshot, video, console output, network trace, server log excerpt, and the
  correlation id if there is one.
- Frequency: always, intermittent, or seen once.
- Severity and business impact.

**Severity versus priority** — the distinction most frequently asked and most frequently
muddled. **Severity** is the technical impact of the defect on the system. **Priority** is how
urgently it should be fixed, which reflects business context.

- High severity, low priority: a crash in a feature used by three internal users once a
  quarter.
- Low severity, high priority: the company name is misspelled on the landing page before a
  launch.

**Defect lifecycle.** New → triaged/assigned → in progress → fixed → retested → closed, with
branches for rejected, duplicate, deferred, and reopened. "Cannot reproduce" usually means the
report lacked environment or data detail; treat it as a report quality problem first.

**Triage** is a cross-functional decision balancing severity, priority, effort, risk of the
fix, and release timing. Testers contribute the risk assessment, not the decision alone.

**Defect metrics** — density by module, escape rate (defects found in production versus before
release), reopen rate, and time to resolve. Useful for spotting weak areas; harmful when used
to evaluate individuals, because the behaviour it produces is defect count gaming rather than
quality.

**Root cause analysis** on escaped defects is where the real learning is: why did the process
let this reach production, and what test, review, or design change prevents the class?

### 4.11 Test Planning and Risk-Based Testing

```yaml
job_field: qa_testing
topic: test_planning
difficulty:
  - medium
  - hard
keywords: [test_plan, strategy, risk_based, entry_exit_criteria, estimation, coverage, release_decision]
```

**Test strategy versus test plan.** A strategy describes the organisation's general approach
to testing; a plan applies it to a specific project or release, covering scope, approach,
resources, environments, schedule, entry and exit criteria, and risks.

**Risk-based testing** is the professional answer to "you cannot test everything". Prioritise
by **likelihood of failure** (complexity, newness, rate of change, past defect density,
developer experience with the area) multiplied by **impact of failure** (users affected,
financial and safety consequences, regulatory exposure, reputational damage).

The output is a deliberate allocation: deep testing on high-risk areas, light checks on
low-risk ones, and explicit statements about what will not be tested. **Saying what was not
tested is a hallmark of professional testing**, because it lets the business make an informed
release decision.

**Entry and exit criteria.** Entry: the build deploys, smoke tests pass, the environment and
data are ready. Exit: planned tests executed, no open blocker or critical defects, coverage of
agreed high-risk areas, and known issues documented with workarounds.

**Estimation.** Historical data beats intuition; account for retesting, regression, environment
problems, and defect investigation, which frequently exceed the initial execution estimate.

**Communicating release readiness.** Not "QA approves" but "here is what we tested, here is
what we found, here is what we did not cover, and here is the residual risk". The release
decision belongs to the business; the tester provides the evidence.

### 4.12 Performance Testing

```yaml
job_field: qa_testing
topic: performance_testing
difficulty:
  - medium
  - hard
keywords: [load_testing, stress_testing, soak, spike, percentile, throughput, bottleneck, jmeter, k6]
```

**Performance test types**, each answering a different question:

- **Load testing** — behaviour at expected load. Does it meet the target at normal peak?
- **Stress testing** — behaviour beyond capacity. Where does it break, and does it fail
  gracefully or catastrophically?
- **Spike testing** — response to a sudden surge. Does autoscaling react in time?
- **Soak / endurance testing** — sustained load over hours. Reveals memory leaks, connection
  leaks, log disk exhaustion, and slow degradation that a 10-minute test never shows.
- **Volume testing** — behaviour with a large data set, which is different from many users.
- **Scalability testing** — does adding capacity produce proportional improvement?

**Metrics to read.**

- **Response time percentiles, not averages.** p50, p95, p99. An average of 200 ms can hide a
  p99 of 8 seconds affecting thousands of users.
- **Throughput** — requests per second successfully handled.
- **Error rate** under load, and *which* errors (timeouts differ from `500`s).
- **Resource utilisation** — CPU, memory, disk I/O, connection pools, and thread pools on
  every tier.
- **Saturation point** — where response time begins climbing sharply while throughput plateaus.

**Test design matters more than the tool.** Realistic workload mix, realistic think time,
production-scale data volume, sufficient warm-up, and enough load-generator capacity that the
generator is not the bottleneck. **Testing against an empty database or a single hot user
produces numbers that do not survive production.**

**Interpreting results.** Correlate the response-time curve with resource metrics to identify
the bottleneck tier. Common findings: connection pool exhaustion, a missing database index
that only matters at volume, garbage collection pauses, lock contention, and an external
dependency's rate limit.

**Tooling.** JMeter, k6, Gatling, Locust. The essential competency is designing a
representative test and interpreting the output, not tool syntax.

### 4.13 Security Testing Fundamentals for QA

```yaml
job_field: qa_testing
topic: security_testing_fundamentals
difficulty:
  - medium
  - hard
keywords: [security_testing, owasp, authorization_testing, input_validation, sast, dast, negative_testing]
```

QA is well positioned to catch a meaningful share of security defects, because many of them
are functional defects in disguise.

**What a tester can and should check as part of normal work:**

- **Authorization.** The highest-value security testing a QA engineer does. Take a valid
  request from user A and replay it with user B's session and with no session. Change
  identifiers in URLs and payloads. Access an admin endpoint as a normal user. **Broken access
  control is the top OWASP Top 10:2025 category and is directly testable functionally.**
- **Authentication and session behaviour.** Logout invalidates the session server-side; the
  session is regenerated on login; password change invalidates other sessions; lockout or rate
  limiting exists on repeated failures; error messages do not reveal whether the username
  exists.
- **Input validation.** Injection-shaped strings, oversized inputs, unexpected types, Unicode
  and control characters — verifying the application rejects them safely rather than erroring
  in a way that leaks internals.
- **Error handling.** No stack traces, SQL fragments, internal hostnames, or version banners in
  responses. This maps to the 2025 "mishandling of exceptional conditions" category.
- **Transport and headers.** HTTPS enforced, secure cookie attributes (`HttpOnly`, `Secure`,
  `SameSite`), and key security headers present.
- **Data exposure.** API responses that include fields the UI never displays — password hashes,
  internal flags, other users' data in an embedded object.
- **File upload.** Type and size restrictions, and that an uploaded file cannot be executed or
  served in a dangerous content type.

**Where QA's remit ends.** Deep penetration testing, exploit development, and cryptographic
review are specialist work requiring authorisation and expertise. QA's contribution is
integrating security-relevant negative tests into the regular suite and escalating findings.

**Automated tooling in the pipeline.** SAST on code, SCA on dependencies, DAST against a
running environment, and secret scanning. Each finds a different class, and all produce false
positives requiring triage.

The cybersecurity guide holds the canonical depth on vulnerability classes and defences.

### 4.14 SQL and Data Verification for Testers

```yaml
job_field: qa_testing
topic: sql_for_testers
difficulty:
  - easy
  - medium
keywords: [sql, verification, data_setup, join, aggregate, backend_validation]
```

SQL lets a tester verify what the UI claims and set up precise preconditions.

Practical uses:

- **Verify the write.** After a UI action, confirm the row exists with the right values,
  including audit columns and status transitions the UI does not display.
- **Set up state directly.** Create a specific edge-case record (an order 400 days old, a user
  with 10,000 items) that would take an hour to produce through the interface.
- **Investigate a defect.** Determine whether the data is wrong or only the display is.
- **Check for silent side effects.** Duplicate rows, orphaned records, missing audit entries.
- **Validate a data migration** by comparing counts and checksums between source and target.

Skills expected: `SELECT` with `WHERE`, `JOIN` across related tables, `GROUP BY` with
`COUNT`/`SUM` for reconciliation, `ORDER BY` and `LIMIT`, `IS NULL` semantics, and enough
caution to run read-only against shared environments and wrap any write in a transaction.

**Backend verification changes what a test can assert.** A UI test that only checks the
success message cannot detect that the record was saved with the wrong status.

---

## 5. Easy-Level Interview Knowledge

```yaml
job_field: qa_testing
topic: easy_level_knowledge
difficulty: easy
keywords: [qa_basics, definitions, junior, fundamentals]
```

- **What is software testing?** Evaluating a product to find defects and assess whether it
  meets requirements.
- **What is the difference between QA and testing?** Process-focused prevention of defects
  versus activity-focused detection.
- **What is verification versus validation?** Building the product right versus building the
  right product.
- **What are the test levels?** Unit, integration, system, acceptance.
- **What is regression testing?** Re-running tests to confirm existing behaviour still works
  after a change.
- **What is smoke testing?** A quick check that the build is stable enough to test.
- **What is the difference between smoke and sanity testing?** Broad shallow build
  verification versus a narrow check of a specific fix.
- **What is a test case?** A defined set of preconditions, steps, and expected results.
- **What is severity versus priority?** Technical impact versus urgency of the fix.
- **What is boundary value analysis?** Testing at and around the edges of valid ranges, where
  defects cluster.
- **What is equivalence partitioning?** Grouping inputs treated identically and testing one
  representative of each group.
- **What is black box versus white box testing?** Testing against behaviour without internal
  knowledge versus using knowledge of the internal structure.
- **What is a good bug report made of?** Title, environment, steps to reproduce, expected and
  actual result, and evidence.
- **What is the test pyramid?** Many unit tests, fewer integration tests, fewest end-to-end
  tests.
- **What is a flaky test?** One that passes and fails without any code change.
- **Why should you not use fixed sleeps in automated tests?** They are slow when unnecessary
  and still unreliable when the wait is too short; use condition-based waits.
- **What HTTP status code would you expect after successfully creating a resource?** `201`,
  with a `Location` header.
- **What is exploratory testing?** Simultaneous learning, design, and execution guided by a
  charter.

---

## 6. Medium-Level Interview Knowledge

```yaml
job_field: qa_testing
topic: medium_level_knowledge
difficulty: medium
keywords: [applied_qa, design, automation, debugging, comparison, strategy]
```

- **How do you decide what to automate?** Value and stability of the path, frequency of
  execution, cost to automate and maintain, and whether a lower-level test could catch the
  same defect.
- **How would you test a login form?** Valid and invalid combinations, boundary lengths, empty
  fields, SQL and script metacharacters, case sensitivity, lockout and rate limiting, session
  behaviour after login, password reset flow, remember-me behaviour, back button after
  logout, and accessibility with keyboard only. Then non-functional: response time and error
  message safety.
- **Automated tests are flaky in CI but pass locally. How do you investigate?** Compare
  timing and resources, look for fixed sleeps and missing waits, check test independence and
  parallel execution, check for shared data collisions, inspect CI-only environment
  differences, and use traces or video from the failing run.
- **How would you test an API endpoint with no documentation?** Explore actual responses,
  infer the contract, test status codes and schema, then focus on negative cases,
  authorization with another user's token, and boundary values. Then push for a written
  contract, because an undocumented API is a defect in itself.
- **What is the difference between a stub and a mock?** Canned responses versus interaction
  expectations that fail the test when unmet.
- **Your regression suite takes two hours. What do you do?** Measure where the time goes, move
  checks down the pyramid, parallelise and shard, run selectively on changed areas for pull
  requests with the full suite nightly, and delete tests that never fail and cover nothing
  unique.
- **How do you test a feature whose requirements are ambiguous?** Ask specific clarifying
  questions with concrete examples, document assumptions, use exploratory testing to discover
  the actual behaviour, and treat ambiguity itself as a defect to be raised early.
- **How do you handle test data for automated tests?** Each test creates its own data via
  factories or API setup, cleans up afterwards, uses unique identifiers, and never depends on
  data left by another test.
- **Selenium or Playwright — which would you pick and why?** Compare auto-waiting and
  reliability, tracing and debugging, browser and language support, ecosystem maturity, and
  existing team investment. State the context that would flip the decision.
- **How do you test that a bug fix did not break anything else?** Retest the specific defect,
  then run regression around the affected area guided by an understanding of what the fix
  touched, then the automated regression suite.
- **What non-functional aspects would you test on a checkout flow?** Response time under load,
  behaviour when the payment provider is slow or down, concurrent purchases of the last item
  in stock, accessibility, and mobile and browser compatibility.
- **How do you test a system that integrates with a third-party service you cannot control?**
  Use their sandbox, stub or virtualise the service for deterministic tests, test failure and
  timeout handling explicitly, and run a small set of real-integration checks on a schedule
  rather than on every build.
- **How would you verify that a bug is fixed if you cannot reproduce it?** Establish the exact
  conditions from logs and the original report, reproduce in a matching environment, and if
  it still cannot be reproduced, add monitoring or logging so the next occurrence is
  diagnosable rather than closing it.

---

## 7. Hard-Level Interview Knowledge

```yaml
job_field: qa_testing
topic: hard_level_knowledge
difficulty: hard
keywords: [test_strategy, quality_at_scale, microservices_testing, risk, culture, shift_right]
```

- **Design a test strategy for a microservices platform with twelve services and four teams.**
  Unit and integration tests owned by each team, consumer-driven contract tests as the primary
  defence against independent-deployment breakage, a deliberately small end-to-end suite for
  a handful of critical journeys, shared test data and environment strategy, ephemeral
  environments per pull request, and production validation through canaries and synthetic
  monitoring. Explain why a large end-to-end suite fails at this scale: combinatorial
  environment coupling, slow feedback, and unattributable failures.
- **How do you test a system where the correct answer is not known in advance?** The oracle
  problem. Approaches: comparison against a reference implementation or the previous version,
  metamorphic testing (properties that must hold between related inputs, such as "adding an
  item must never decrease the total"), property-based testing with generated inputs and
  invariants, statistical validation over many cases, and domain expert review of samples.
- **How would you introduce automation into a team with no tests and a fragile legacy
  system?** Start with characterisation tests around the highest-risk paths, automate at the
  API level first because the UI is likely unstable, add tests alongside each change rather
  than attempting a big-bang suite, secure a genuine CI pipeline, and measure escaped defects
  to demonstrate value. Explain why attempting full coverage first fails.
- **Your team is releasing daily and QA cannot keep up. How do you change the model?** Shift
  quality left into development (developers own unit and integration tests), automate
  regression fully, use feature flags to decouple deploy from release, invest in canary
  releases and production monitoring as a safety net, and redirect QA effort from repetitive
  execution to test design, exploratory testing, and risk assessment.
- **How do you measure the quality of testing itself?** Escaped defect rate and the severity of
  escapes, defect detection percentage by phase, mean time to detect, coverage of high-risk
  areas, feedback time, and flakiness rate — explicitly rejecting test count and raw coverage
  as goals, and explaining why they distort behaviour.
- **How would you test a machine learning feature?** Test the pipeline deterministically (data
  validation, feature computation, serving contract) separately from model quality; evaluate
  the model on a held-out set against agreed metrics with subgroup breakdown; define
  acceptable behaviour ranges rather than exact expected outputs; test edge and adversarial
  inputs; and monitor drift in production. Explain why traditional pass/fail assertions do not
  apply to probabilistic output.
- **How do you decide when to stop testing?** Exit criteria met, risk-based coverage of
  high-priority areas achieved, defect discovery rate flattening, remaining known issues
  documented and accepted, and a business decision informed by the residual risk — never
  "when we ran out of time" presented as completeness.
- **How do you test for concurrency defects?** Deliberately concurrent scenarios (two users
  editing the same record, double submission, the last item in stock), load testing to surface
  races, idempotency verification, database constraint verification under parallel writes, and
  awareness that a passing concurrency test does not prove absence of a race.
- **How do you handle a culture where developers consider testing "QA's job"?** Make quality a
  shared metric rather than a QA metric, pair on test design, require tests in the definition
  of done, make the pipeline the enforcement mechanism rather than a person, and demonstrate
  the cost of escapes with data.
- **What is your position on end-to-end tests?** Necessary but expensive; keep a small,
  ruthlessly maintained set covering journeys whose failure would be unacceptable, and push
  everything else down. Be able to defend both the value and the limit.

---

## 8. Practical Engineering Scenarios

```yaml
job_field: qa_testing
topic: practical_scenarios
difficulty:
  - medium
  - hard
keywords: [scenario, flaky_ci, escaped_defect, release_decision, regression, test_failure]
```

### Scenario A — Automated tests are flaky in CI

The end-to-end suite fails roughly one run in four, always with different tests.

- **Initial question.** What is your first step, and what would you avoid doing?
- **Expected reasoning.** Avoid adding automatic retries as the fix. Start by gathering data:
  which tests fail, how often, and whether failures cluster by time, runner, or when running
  in parallel. Look at traces and screenshots from failures.
- **Follow-up.** Failures cluster when the suite runs with eight parallel workers. What does
  that suggest? (Shared state or test data collisions, or resource contention on the runner.)
- **Deeper.** How do you keep the pipeline trustworthy while you fix them? (Quarantine with a
  named owner and a deadline, and report quarantined tests visibly so the gap is known.)
- **Trade-off.** Retries restore a green pipeline immediately and hide genuine intermittent
  product defects; quarantine is honest and temporarily reduces coverage.

### Scenario B — A critical defect escaped to production

A payment calculation error reached customers and was found by support, not by testing.

- **Initial question.** What do you do first?
- **Expected reasoning.** Support the immediate fix and containment first, then run a
  blameless root cause analysis: was the case never designed, designed but not executed,
  executed but with a bad oracle, or blocked by an environment or data difference?
- **Follow-up.** The case existed but used test data that never hit the affected boundary.
  What changes? (Test data strategy, boundary value coverage, and production-shaped data in
  the environment.)
- **Deeper.** How do you decide whether to add one test or change the process? (If the same
  class of defect could escape again through the same gap, change the process; if it was a
  genuinely unique case, add the test.)
- **Communication.** How do you report this without blame while still driving change?

### Scenario C — The release is tomorrow and testing is incomplete

Two high-severity defects are open and 30% of planned tests are unexecuted.

- **Expected reasoning.** Do not frame this as "QA approves or blocks". Re-prioritise the
  remaining tests by risk, execute the highest-risk ones, and produce a clear statement: what
  was tested, what was found, what was not covered, and what the residual risk is per area.
  Offer options — delay, ship with the feature flagged off, or ship with a documented
  workaround.
- **Follow-up.** Business decides to ship. What do you do? (Document the accepted risk, ensure
  monitoring and alerting cover the untested areas, prepare a rollback plan, and schedule the
  remaining testing immediately post-release.)
- **Deeper.** How do you prevent the same crunch next release? (Earlier involvement, smaller
  batches, and automation of the regression load that consumed the time.)

### Scenario D — A UI test suite breaks after a frontend refactor

Two hundred tests fail; the application works correctly.

- **Expected reasoning.** The tests were coupled to implementation detail — CSS classes,
  DOM structure, or generated ids. Confirm the application is genuinely fine, then fix
  structurally rather than by patching 200 locators: introduce stable test identifiers, adopt
  accessible role and text based locators, and consolidate locators in page objects.
- **Follow-up.** How do you get frontend developers to add and keep `data-testid` attributes?
  (Make it part of the definition of done, and demonstrate the maintenance cost avoided.)
- **Deeper.** Which of these 200 tests should have been UI tests at all? (Most probably should
  have been API or component tests.)

### Scenario E — A performance test shows acceptable averages but users complain

Average response time is 300 ms; support reports slow checkouts.

- **Expected reasoning.** Averages hide the tail. Look at p95 and p99, segment by endpoint and
  by user cohort, and check whether the test workload matched reality — data volume, cache
  state, concurrency, and think time.
- **Follow-up.** p99 is 9 seconds on one endpoint. How do you find the cause? (Correlate with
  resource metrics and traces: connection pool, a query that degrades with data volume,
  garbage collection, or a slow third-party call.)
- **Deeper.** Why can a test pass while production suffers? (Warm caches, small dataset, no
  concurrent background jobs, and a load generator that was itself the bottleneck.)

### Scenario F — Testing an API where responses vary between runs

The same request returns different data each time.

- **Expected reasoning.** Determine the source of variance: timestamps, generated
  identifiers, ordering without an explicit sort, personalisation, caching, or genuine
  non-determinism. Assert on structure and invariants rather than exact payloads, control
  what can be controlled (clock, seed, sort order), and treat unexplained variance as a
  potential defect rather than something to assert around.
- **Deeper.** When is non-determinism a product bug? (Unordered results presented as ordered,
  or results that differ between identical requests without a documented reason.)

### Scenario G — A defect cannot be reproduced by the developer

- **Expected reasoning.** Improve the report rather than argue: exact build, environment,
  account and role, data state, browser and version, timing, and the correlation id from the
  failing request. Reproduce together, and if it is genuinely intermittent, add logging or
  monitoring so the next occurrence is capturable.
- **Deeper.** Why is "cannot reproduce, closing" usually the wrong outcome? (The defect is
  still there; it will be found by a customer, and the information cost of re-finding it is
  higher later.)

---

## 9. Troubleshooting Knowledge

```yaml
job_field: qa_testing
topic: troubleshooting
difficulty:
  - medium
  - hard
keywords: [test_failure_analysis, debugging, environment, locator, timing, evidence]
```

**Triage a failing test in this order.**

1. **Is it a real product defect, a test defect, or an environment problem?** These need
   completely different responses, and mislabelling wastes everyone's time.
2. **Read the actual failure**, not just "test failed": the assertion message, the stack
   trace, and for UI tests the screenshot, video, or trace at the moment of failure.
3. **Check whether it failed before.** History distinguishes a new regression from a known
   flake.
4. **Check what changed.** The commit range, a dependency bump, a configuration change, or a
   test data reset.
5. **Reproduce locally** against the same build and data if possible.

**Common failure signatures.**

- **Element not found** — wrong locator, element not rendered yet, inside an iframe, or the
  page did not navigate as expected.
- **Stale element** — the DOM re-rendered between locating and acting; re-locate rather than
  caching references.
- **Assertion off by a small amount** — timezone, rounding, currency, or locale formatting.
- **Passes alone, fails in the suite** — shared state, ordering dependence, or data
  collision.
- **Passes locally, fails in CI** — timing under different resources, missing environment
  configuration, headless-versus-headed rendering, different browser version, or absent test
  data.
- **Fails only at certain times** — date and timezone boundaries, or a scheduled job altering
  data.
- **API test returns `401` or `403` unexpectedly** — expired token, wrong environment
  credentials, or a genuine authorization defect worth investigating before assuming
  configuration.

**Evidence collection is part of the job.** A failure investigated without artifacts becomes a
"cannot reproduce". Capture traces, network logs, server logs with correlation ids, and the
database state at failure.

---

## 10. Test Architecture and Strategy

```yaml
job_field: qa_testing
topic: test_planning
subtopic: architecture
difficulty:
  - medium
  - hard
keywords: [test_architecture, framework_design, ownership, layering, scalability, maintainability]
```

Designing a test suite that survives three years of change:

- **Layer deliberately.** Decide what is verified at unit, integration, contract, API, and UI
  level, and avoid verifying the same rule at four levels — duplicated coverage multiplies
  maintenance without adding confidence.
- **Structure for change.** Locators and API clients in one place, test data builders shared,
  assertions expressed in domain language, and no copy-pasted setup across files.
- **Ownership.** Tests owned by the team that owns the code, with a shared framework
  maintained centrally. Orphaned test suites rot.
- **Parallel-safe by design.** Independent data and no shared mutable state from the start;
  retrofitting parallelism into an order-dependent suite is far more expensive.
- **Reporting and observability of the suite itself.** Duration trends, flakiness rate per
  test, and coverage of critical journeys should be visible.
- **A deletion policy.** Tests that never fail, duplicate other coverage, or test removed
  behaviour should be removed. A suite only grows unless someone is allowed to prune it.
- **Contract testing between services** rather than an ever-growing integrated end-to-end
  suite, which is the main structural answer to testing at scale.
- **Production as a test environment.** Canary releases, feature flags, synthetic monitoring,
  and real-user monitoring extend validation beyond the pipeline — with the discipline that
  this supplements pre-release testing rather than replacing it.

---

## 11. Security and Compliance in Testing

```yaml
job_field: qa_testing
topic: security_testing_fundamentals
subtopic: practice_and_compliance
difficulty:
  - medium
  - hard
keywords: [test_data_privacy, gdpr, audit_evidence, regulated_testing, traceability]
```

- **Test data privacy.** Using raw production personal data in test environments is a common
  and serious exposure — test environments typically have weaker access controls, broader
  access, and longer retention. Use masked, pseudonymised, or synthetic data.
- **Credentials in test code.** Test accounts and API keys must not be committed. Use the
  pipeline's secret store, and rotate test credentials like any other.
- **Authorization testing as routine QA.** Cross-user and cross-role access attempts belong in
  the regular automated suite, because broken access control is both the most common serious
  vulnerability class and directly functional to test.
- **Regulated environments.** Where the product is regulated (medical, financial, safety),
  testing carries evidence obligations: traceability from requirement to test case to
  execution result, controlled test environments, documented approvals, and retention of
  execution records. Test documentation becomes an audit artifact.
- **Accessibility as a compliance dimension.** WCAG conformance is a legal requirement in many
  jurisdictions. Automated checks catch a minority of issues; keyboard-only navigation and a
  screen reader pass are required for real coverage.
- **Third-party and open-source risk** surfaced in the pipeline through dependency scanning is
  a quality concern as much as a security one.

---

## 12. Performance and Efficiency of the Test Process

```yaml
job_field: qa_testing
topic: ci_cd_testing
subtopic: efficiency
difficulty:
  - medium
  - hard
keywords: [feedback_time, parallelization, selective_testing, cost, maintenance, suite_health]
```

**Feedback time is the primary efficiency metric.** A suite that reports in under ten minutes
gets run; one that takes ninety changes behaviour for the worse.

Levers:

- **Push tests down the pyramid.** The same rule verified as a unit test runs a thousand times
  faster than through a browser.
- **Parallelise and shard**, which requires test independence as a precondition.
- **Selective execution** based on changed code or affected areas for pull requests, with the
  full suite on a schedule.
- **Fail fast** — run cheap checks first and stop early on failure.
- **Optimise setup.** Reuse authenticated sessions via stored state rather than logging in
  through the UI in every test; seed data via API rather than through the interface.
- **Reduce environment cost** with ephemeral containerised environments instead of a
  contended shared staging environment.
- **Prune continuously.** Suite size is a cost; coverage of what matters is the goal.

**Maintenance cost is the hidden number.** Every automated test must be updated when the
feature changes. A suite whose maintenance consumes more time than it saves has negative
value, and being willing to say so about your own suite is a senior signal.

---

## 13. Common Candidate Mistakes

```yaml
job_field: qa_testing
topic: common_mistakes
difficulty:
  - easy
  - medium
  - hard
keywords: [mistakes, misconceptions, qa_pitfalls]
```

- Equating testing with test automation.
- Confusing severity with priority, or being unable to give an example of each combination.
- Aiming to "automate everything" without a cost or value argument.
- Automating business logic through the UI when an API or unit test would do.
- Using fixed sleeps instead of condition-based waits.
- Treating code coverage as a quality target rather than a gap indicator.
- Adding automatic retries as the response to flakiness, hiding real defects.
- Writing tests that depend on execution order or on data left by other tests.
- Asserting on exact payloads including timestamps and generated ids.
- Testing only the happy path, with no negative, boundary, or error cases.
- Filing defect reports without environment, build, or reproduction steps, then being
  surprised by "cannot reproduce".
- Saying "QA signs off on the release" rather than presenting evidence and residual risk.
- Ignoring non-functional requirements because nobody wrote them down.
- Using raw production personal data in test environments.
- Never testing authorization across users, despite it being the most common serious
  vulnerability class.
- Reporting average response time from a performance test instead of percentiles.
- Treating BDD as a UI scripting syntax with no business involvement.
- Believing a passing suite means the software is correct.

---

## 14. Interview Evaluation Points

```yaml
job_field: qa_testing
topic: evaluation_points
difficulty:
  - easy
  - medium
  - hard
keywords: [evaluation, rubric, qa_signals, assessment]
```

An interviewer should be able to determine whether the candidate understands:

- **Test design as a skill** — whether they can systematically derive cases with named
  techniques rather than listing ad hoc ideas.
- **Risk-based prioritisation** — whether they can explain what they would *not* test and why,
  which is the mark of professional judgement.
- **The right level for each check** — whether they instinctively push verification down the
  pyramid.
- **Automation economics** — whether they weigh maintenance cost and can name what should not
  be automated.
- **Flakiness discipline** — whether they treat retries as a hazard and investigate causes.
- **Negative and boundary thinking** — whether error paths, edge values, and invalid state
  transitions come up unprompted.
- **Defect communication** — whether their reports would let a developer reproduce without a
  conversation, and whether severity and priority are used correctly.
- **Collaboration model** — whether they see quality as shared rather than as a gate they
  personally operate.
- **Curiosity** — in exploratory discussion, whether they generate unexpected scenarios and
  pursue anomalies.
- **Honest risk reporting** — whether they can describe residual risk to a business audience
  without either overstating confidence or refusing to give an assessment.

**Adaptive guidance.** A strong test design or automation answer should escalate toward test
strategy at scale, contract testing, or the oracle problem. A weak answer on automation
architecture should step down to test design techniques, severity versus priority, or how to
test a login form — not to another framework question.

---

## 15. Cross-Topic Relationships

```yaml
job_field: qa_testing
topic: cross_topic_relationships
difficulty: medium
keywords: [relationships, topic_map, qa_dependencies]
```

Distinctions that must not be collapsed:

- **Testing is not test automation.** Automation executes predefined checks; testing includes
  judgement, exploration, and evaluating whether the requirement was right.
- **QA is not testing.** Process-level prevention versus product-level detection.
- **Verification is not validation.** Built right versus built the right thing.
- **Severity is not priority.** Technical impact versus business urgency.
- **Smoke is not sanity is not regression is not retesting.** Build stability, targeted change
  check, broad protection against regression, and confirmation of one specific fix.
- **Coverage is not quality.** Lines executed versus behaviour verified.
- **A test failure is not a defect.** It may be a test defect or an environment problem.
- **Selenium is not test automation**, and **Playwright is not a test strategy.** Tools
  implement a strategy; they are not one.
- **Performance testing is not load testing alone.** Load, stress, spike, soak, and volume
  answer different questions.
- **Security testing by QA is not penetration testing.** Functional security checks in the
  regular suite versus authorised specialist assessment.
- **BDD is not Gherkin.** A collaboration practice versus a syntax.

Topic progression for adaptive interviews (easy to hard):

`testing_fundamentals -> test_levels -> test_types -> test_design -> defect_management -> api_testing -> test_automation -> ui_testing -> ci_cd_testing -> test_planning -> test_architecture`

Breadth track when the candidate stalls (use after repeated weak answers):

- Weak on automation frameworks → `test_design` techniques or `defect_management`
- Weak on performance testing → `test_types` and non-functional basics
- Weak on test strategy → `test_levels` and the pyramid
- Weak on API testing → `manual_testing` and exploratory heuristics
- Weak on security testing → `test_design` negative cases

Canonical depth lives elsewhere for:

- Unit testing within development practice, debugging, clean code —
  `software_engineering_interview_guide.md`
- HTTP semantics, REST design, backend integration testing with real databases —
  `backend_development_interview_guide.md`
- Browser behaviour, component testing, accessibility implementation —
  `frontend_development_interview_guide.md`
- CI/CD pipeline construction, containers, environments —
  `devops_cloud_interview_guide.md`
- Vulnerability classes, OWASP detail, penetration testing methodology —
  `cybersecurity_interview_guide.md`
- Testing ML systems, model evaluation metrics —
  `ai_machine_learning_interview_guide.md`
