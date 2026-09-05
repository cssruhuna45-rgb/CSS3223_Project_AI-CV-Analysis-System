# Software Engineering Interview Knowledge Guide

```yaml
job_field: software_engineering
job_field_name: Software Engineering
canonical_topics:
  - programming_fundamentals
  - data_structures
  - algorithms
  - object_oriented_programming
  - solid_principles
  - design_patterns
  - software_architecture
  - clean_code
  - testing
  - debugging
  - git
  - databases
  - apis
  - concurrency
  - networking_fundamentals
  - security_fundamentals
  - performance
  - system_design
difficulty:
  - easy
  - medium
  - hard
```

This document is the canonical interview knowledge base for the **software_engineering**
job field. It owns the general engineering fundamentals (data structures, algorithms,
OOP, SOLID, design patterns, clean code, Git, debugging). Field-specific depth lives in
sibling guides; see section 15 for the cross-reference map.

---

## 1. Job Field Overview

```yaml
job_field: software_engineering
topic: job_field_overview
difficulty: easy
keywords: [software_engineering, sdlc, engineering_role, responsibilities]
```

Software engineering is the disciplined application of engineering practice to the
design, construction, operation, and maintenance of software systems. It is broader
than programming: programming produces code, software engineering produces a
maintainable system that a team can evolve safely over years.

A generalist software engineer is typically expected to:

- Translate ambiguous requirements into a concrete technical design.
- Implement correct, readable, testable code in at least one language well.
- Reason about complexity, correctness, and failure modes.
- Use version control and code review as a normal part of daily work.
- Write and maintain automated tests.
- Debug problems in code they did not write.
- Understand how their code interacts with databases, networks, and other services.

Software engineering is **not** a synonym for any one language, framework, or cloud
provider. Interviewers in this field probe transferable reasoning rather than
tool-specific trivia.

---

## 2. Core Competencies

```yaml
job_field: software_engineering
topic: core_competencies
difficulty: easy
keywords: [competencies, skills, evaluation, junior_engineer]
```

The competencies most consistently assessed for a software engineering role:

1. **Programming fluency** — control flow, functions, types, memory/reference
   semantics, error handling, standard library use.
2. **Data structures** — choosing the right container and knowing its cost.
3. **Algorithms** — searching, sorting, recursion, graph/tree traversal, and complexity
   analysis.
4. **Object-oriented and modular design** — encapsulation, abstraction, composition,
   and the SOLID principles.
5. **Software design and architecture** — layering, module boundaries, coupling and
   cohesion.
6. **Clean code** — naming, function size, comments that explain *why*, dead-code
   removal.
7. **Testing** — unit, integration, and the discipline of writing tests that fail for
   the right reason.
8. **Debugging** — hypothesis-driven fault isolation rather than guess-and-edit.
9. **Version control with Git** — branching, merging, rebasing, resolving conflicts,
   writing useful history.
10. **Database fundamentals** — schema design, SQL, transactions, indexes.
11. **API fundamentals** — HTTP, REST, request/response contracts, versioning.
12. **Concurrency awareness** — threads, async, shared state, race conditions.
13. **Problem solving** — decomposing a problem, stating assumptions, iterating.

---

## 3. Foundational Knowledge

### 3.1 Programming Fundamentals

```yaml
job_field: software_engineering
topic: programming_fundamentals
difficulty: easy
keywords: [programming, variables, types, control_flow, functions, scope]
```

**Definition.** Programming fundamentals are the language-independent mechanics of
expressing computation: variables, types, expressions, control flow, functions,
scope, and error handling.

Core concepts an interviewer expects:

- **Value vs reference semantics.** Assigning an integer copies it; assigning an object
  in Java, Python, or JavaScript copies a reference to the same object. Mutating
  through one reference is visible through the other.
- **Mutability.** Python lists and Java `ArrayList` are mutable; Python tuples and Java
  `String` are immutable. Immutability removes a whole class of aliasing bugs and makes
  objects safe to share across threads.
- **Static vs dynamic typing.** Java and TypeScript check types at compile time; Python
  and JavaScript check at runtime. Static typing catches a class of errors earlier;
  dynamic typing trades that for flexibility and less ceremony.
- **Stack vs heap.** Call frames and local primitives live on the stack; objects
  generally live on the heap. Deep recursion exhausts the stack (`StackOverflowError`,
  `RecursionError`); unbounded object retention exhausts the heap.
- **Error handling.** Exceptions for exceptional conditions, return values or result
  types for expected failures. Never swallow an exception silently.

**Common mistake.** Catching a broad `Exception` and logging nothing, which converts a
loud failure into a silent data corruption bug.

### 3.2 Complexity Analysis (Big-O)

```yaml
job_field: software_engineering
topic: algorithms
subtopic: complexity_analysis
difficulty: easy
keywords: [big_o, time_complexity, space_complexity, asymptotic_analysis]
```

**Definition.** Big-O notation describes an asymptotic upper bound on how an
algorithm's running time or memory grows as input size `n` grows. It deliberately
discards constant factors and lower-order terms.

Common classes, from cheapest to most expensive:

`O(1)` → `O(log n)` → `O(n)` → `O(n log n)` → `O(n^2)` → `O(2^n)` → `O(n!)`

- `O(1)` — hash table lookup, array index access.
- `O(log n)` — binary search, balanced tree operations.
- `O(n)` — a single scan of a list.
- `O(n log n)` — comparison-based sorting lower bound (merge sort, heap sort, Timsort).
- `O(n^2)` — nested loop over the same collection, naive duplicate detection.

**Trade-off.** Big-O is about growth, not speed. For small `n`, an `O(n^2)` insertion
sort routinely beats an `O(n log n)` merge sort because of constants and cache
locality. Real sort implementations (Timsort in Python and Java, pdqsort in Rust and
Go) are hybrids for exactly this reason.

**Common mistake.** Reporting only time complexity. Interviewers expect space
complexity too, including recursion stack depth.

### 3.3 Recursion

```yaml
job_field: software_engineering
topic: algorithms
subtopic: recursion
difficulty: easy
keywords: [recursion, base_case, call_stack, memoization, tail_call]
```

**Definition.** Recursion solves a problem by expressing it in terms of smaller
instances of the same problem, terminating at a base case.

Every correct recursive function needs three things: a base case, progress toward the
base case, and correct combination of sub-results.

- **Call stack cost.** Depth `d` recursion uses `O(d)` stack space. CPython's default
  recursion limit is around 1000 frames, and CPython does not perform tail-call
  optimisation; neither does the JVM.
- **Memoization.** Caching sub-results turns exponential recursion into polynomial —
  naive Fibonacci is `O(2^n)`, memoized is `O(n)`.
- **Recursion vs iteration.** Any recursion can be rewritten iteratively with an
  explicit stack. Prefer recursion when it mirrors the data structure (trees, nested
  documents); prefer iteration when depth is large or unbounded.

---

## 4. Core Technical Topics

### 4.1 Data Structures — Arrays, Lists, and Hash Tables

```yaml
job_field: software_engineering
topic: data_structures
subtopic: arrays_lists_hash_tables
difficulty:
  - easy
  - medium
keywords: [array, dynamic_array, linked_list, hash_table, hash_map, collision]
```

**Array / dynamic array.** Contiguous memory, `O(1)` index access, `O(n)` insert or
delete in the middle. Dynamic arrays (`ArrayList`, Python `list`, `std::vector`) grow
by reallocating to a larger buffer, giving **amortised** `O(1)` append.

**Linked list.** Nodes with pointers. `O(1)` insert/delete given a node reference,
`O(n)` to find that node, and poor cache locality. In practice a dynamic array
outperforms a linked list for most workloads despite the theoretically worse insert.

**Hash table.** Maps keys to values via a hash function. Average `O(1)` lookup,
insert, and delete; worst case `O(n)` when many keys collide.

- **Collision handling** is by chaining (a bucket holds a list or tree) or open
  addressing (probe for the next free slot).
- **Load factor** is entries divided by buckets. Exceeding a threshold triggers a
  resize and rehash, which is `O(n)` for that one operation.
- **Key requirements.** Keys must be immutable in the fields used for hashing, and
  `hashCode`/`__hash__` must be consistent with `equals`/`__eq__`. Violating this makes
  entries unfindable.

**Interview evaluation points.** The candidate should be able to state why hash table
lookup is *average* `O(1)` and not guaranteed `O(1)`, and give one workload where an
array beats a linked list.

### 4.2 Data Structures — Stacks, Queues, Heaps

```yaml
job_field: software_engineering
topic: data_structures
subtopic: stacks_queues_heaps
difficulty:
  - easy
  - medium
keywords: [stack, queue, deque, priority_queue, heap, lifo, fifo]
```

- **Stack (LIFO)** — push and pop in `O(1)`. Used for call frames, expression parsing,
  undo history, and iterative depth-first traversal.
- **Queue (FIFO)** — enqueue and dequeue in `O(1)`. Used for breadth-first traversal,
  producer/consumer buffering, and job scheduling.
- **Deque** — insertion and removal at both ends in `O(1)`. Used for sliding-window
  algorithms and work-stealing schedulers.
- **Binary heap / priority queue** — `O(log n)` insert and extract-min, `O(1)` peek.
  Backs Dijkstra's algorithm, top-K selection, and timer wheels.

**Practical note.** A "top K of N" problem is usually solved with a size-K heap in
`O(n log k)` rather than by sorting everything in `O(n log n)`.

### 4.3 Data Structures — Trees and Graphs

```yaml
job_field: software_engineering
topic: data_structures
subtopic: trees_graphs
difficulty:
  - medium
  - hard
keywords: [binary_search_tree, balanced_tree, b_tree, trie, graph, bfs, dfs]
```

**Binary search tree (BST).** Left subtree < node < right subtree. Operations are
`O(h)` where `h` is height — `O(log n)` when balanced, `O(n)` when degenerate
(inserting already-sorted data into an unbalanced BST produces a linked list).

**Self-balancing trees.** AVL and red-black trees rebalance on mutation to keep
`h = O(log n)`. Java's `TreeMap` is a red-black tree.

**B-tree / B+ tree.** High-fanout balanced trees designed for block storage. This is
the standard index structure in relational databases because a shallow, wide tree
minimises page reads. See the backend guide for index behaviour in query planning.

**Trie (prefix tree).** Keys decomposed by character. Gives prefix search and
autocomplete in time proportional to key length rather than collection size.

**Graphs.** Vertices plus edges; directed or undirected, weighted or unweighted.

- **Adjacency list** — `O(V + E)` space, good for sparse graphs.
- **Adjacency matrix** — `O(V^2)` space, `O(1)` edge lookup, good for dense graphs.
- **BFS** explores level by level using a queue; finds the shortest path in an
  *unweighted* graph.
- **DFS** explores as deep as possible using a stack or recursion; used for cycle
  detection, topological sort, and connected components.
- **Dijkstra** finds shortest paths with non-negative weights; **Bellman-Ford**
  tolerates negative weights and detects negative cycles.

**Common misconception.** "BFS always finds the shortest path." It finds the shortest
path only when every edge has equal weight. With weights, BFS is wrong and Dijkstra is
required.

### 4.4 Object-Oriented Programming

```yaml
job_field: software_engineering
topic: object_oriented_programming
difficulty:
  - easy
  - medium
keywords: [oop, encapsulation, abstraction, inheritance, polymorphism, composition]
```

**Definition.** Object-oriented programming organises software as objects that bundle
state with the behaviour that operates on that state.

The four commonly cited pillars:

- **Encapsulation** — hide internal state behind an interface so invariants can be
  enforced in one place.
- **Abstraction** — expose what an object does, not how it does it.
- **Inheritance** — an "is-a" relationship that reuses and specialises a base type.
- **Polymorphism** — one interface, many implementations; the concrete method is
  selected at runtime (dynamic dispatch).

**Composition over inheritance.** Inheritance couples a subclass to its parent's
implementation, and deep hierarchies become fragile — a change in the base class
breaks distant subclasses. Composition (holding a collaborator and delegating) is
usually the more flexible default. Inheritance is appropriate when the subtype is
genuinely substitutable for the supertype.

**Overloading vs overriding.** Overloading is multiple methods with the same name and
different parameter lists, resolved at compile time. Overriding is a subclass replacing
a superclass method, resolved at runtime. These two are frequently confused.

**Interview evaluation points.** Whether the candidate can give a concrete case where
inheritance was the wrong tool, and can explain dynamic dispatch without reciting a
textbook definition.

### 4.5 SOLID Principles

```yaml
job_field: software_engineering
topic: solid_principles
difficulty: medium
keywords: [solid, srp, ocp, lsp, isp, dip, design_principles, coupling, cohesion]
```

SOLID is a set of five object-oriented design principles popularised by Robert C.
Martin. They are heuristics for reducing coupling and improving cohesion, not laws.

- **S — Single Responsibility.** A module should have one reason to change. A class
  that formats a report *and* persists it changes for two unrelated reasons.
- **O — Open/Closed.** Software entities should be open for extension and closed for
  modification: add behaviour by adding code, not by editing a growing `switch`.
- **L — Liskov Substitution.** A subtype must be usable anywhere its supertype is
  expected without breaking correctness. A `Square` subclassing `Rectangle` and
  overriding `setWidth` to also change height violates this.
- **I — Interface Segregation.** Many small, client-specific interfaces beat one fat
  interface that forces implementers to stub out methods.
- **D — Dependency Inversion.** High-level policy should depend on abstractions, not on
  concrete low-level details. This is what makes a service testable with a fake
  repository.

**Trade-off.** Applied dogmatically, SOLID produces interface explosion: dozens of
one-method interfaces with a single implementation each. Apply the principles where
change is actually likely.

### 4.6 Design Patterns

```yaml
job_field: software_engineering
topic: design_patterns
difficulty:
  - medium
  - hard
keywords: [design_patterns, singleton, factory, strategy, observer, adapter, repository]
```

**Definition.** Design patterns are named, reusable solutions to recurring design
problems, catalogued most famously by the "Gang of Four".

Patterns most likely to appear in interviews:

- **Strategy** — encapsulate interchangeable algorithms behind a common interface; the
  canonical alternative to a growing conditional.
- **Factory / Factory Method** — move object construction behind a function or type so
  callers do not depend on concrete classes.
- **Builder** — construct complex objects step by step; avoids telescoping constructors.
- **Singleton** — one instance globally. Frequently an anti-pattern: it is hidden global
  state, complicates testing, and needs care to be thread-safe.
- **Observer** — publishers notify subscribers of state changes; the basis of event
  systems and reactive UIs.
- **Adapter** — translate one interface into another so incompatible code can
  collaborate.
- **Decorator** — wrap an object to add behaviour without modifying it.
- **Repository** — abstract data access behind a collection-like interface, keeping
  persistence details out of domain logic.

**Common mistake.** Naming patterns without explaining the *problem* each one solves.
Pattern vocabulary is only valuable if it communicates intent.

### 4.7 Clean Code and Maintainability

```yaml
job_field: software_engineering
topic: clean_code
difficulty:
  - easy
  - medium
keywords: [clean_code, readability, naming, refactoring, technical_debt, code_review]
```

Maintainable code is optimised for reading, because code is read far more often than it
is written.

Practices with real payoff:

- **Intention-revealing names.** `elapsedDays` beats `d`. Names should not require a
  comment to decode.
- **Small, single-purpose functions.** A function that needs an "and then" in its
  description usually needs splitting.
- **Comments explain why, not what.** A comment restating the code rots; a comment
  explaining a non-obvious business rule or workaround is valuable.
- **Avoid deep nesting.** Guard clauses and early returns flatten control flow.
- **Delete dead code.** Version control is the archive; commented-out code is noise.
- **Refactoring** is behaviour-preserving restructuring, and it is only safe with tests
  in place.

**Technical debt** is the accumulated cost of expedient decisions. Some debt is a
deliberate, reasonable trade to hit a deadline; the failure mode is taking on debt
unknowingly and never repaying it.

### 4.8 Version Control with Git

```yaml
job_field: software_engineering
topic: git
difficulty:
  - easy
  - medium
keywords: [git, version_control, branching, merge, rebase, conflict, pull_request]
```

**Git is not GitHub.** Git is a distributed version control system created by Linus
Torvalds; it runs entirely on your machine and needs no server. GitHub, GitLab, and
Bitbucket are hosting platforms built *around* Git that add pull requests, issues,
permissions, and CI integration. A candidate who says "we used Git" but only means "we
clicked buttons on GitHub" is signalling a real gap.

Core model: a commit is an immutable snapshot with a parent pointer; a branch is a
movable pointer to a commit; `HEAD` points at the current branch.

Essential operations:

- `git status`, `git add`, `git commit` — the staging area lets you compose a commit
  from a subset of your changes.
- `git merge` — creates a merge commit joining two histories and preserves what actually
  happened.
- `git rebase` — replays your commits on top of another branch, producing linear history
  but **rewriting commit hashes**.
- **The golden rule of rebase:** do not rebase commits that others have already pulled,
  because rewriting shared history forces everyone else to recover manually.
- `git revert` creates a new commit undoing a previous one and is safe on shared
  branches; `git reset --hard` moves the branch pointer and discards work, so it is for
  local branches only.
- **Merge conflicts** occur when two branches change the same region of a file. Git
  cannot decide semantics; a human must.

**Version-dependent behaviour.** The default initial branch name (`master` versus
`main`) depends on the Git version and on the `init.defaultBranch` configuration.

### 4.9 Testing

```yaml
job_field: software_engineering
topic: testing
difficulty:
  - easy
  - medium
keywords: [unit_testing, integration_testing, test_pyramid, mocking, tdd, coverage]
```

**Testing is not the same as test automation.** Testing is the activity of evaluating
whether software behaves as intended, including exploratory and manual work. Test
automation is the practice of encoding *some* of those checks as executable code.
Automation is a subset and an amplifier, not a replacement.

**Unit test** — exercises one unit (function, class) in isolation, with collaborators
replaced by test doubles. Fast, deterministic, and precise at localising failures.

**Integration test** — exercises several components together, often including a real
database or HTTP layer. Slower, but catches wiring, serialisation, and SQL errors that
unit tests cannot.

**Test pyramid.** Many fast unit tests, fewer integration tests, fewest end-to-end
tests. The inverted shape (mostly end-to-end) produces slow, flaky suites.

**Test doubles.** A *stub* returns canned data; a *mock* additionally asserts on the
interaction; a *fake* is a working lightweight implementation such as an in-memory
repository.

**Coverage.** Line coverage measures which lines executed, not whether behaviour was
verified. A test with no assertions can still produce high coverage. Treat coverage as a
smoke detector for untested areas, never as a quality target.

Deeper treatment of test design, defect management, and automation frameworks lives in
the QA / Test Engineering guide.

### 4.10 Debugging

```yaml
job_field: software_engineering
topic: debugging
difficulty:
  - easy
  - medium
  - hard
keywords: [debugging, root_cause, stack_trace, breakpoint, bisect, logging]
```

Debugging is hypothesis-driven fault isolation, not random editing.

A reliable method:

1. **Reproduce** the failure deterministically, and shrink the reproduction.
2. **Read the actual error.** A stack trace names the failing frame and the call chain;
   the *first* exception in a chain of "caused by" entries is usually the real one.
3. **Form a hypothesis** about which invariant is violated.
4. **Bisect the search space** — by code (`git bisect` to find the introducing commit),
   by data, or by layer (is the bad value already wrong before this function?).
5. **Verify the fix** by confirming the failure returns when the fix is reverted.
6. **Add a regression test** so the bug cannot silently return.

Tools: debuggers with conditional breakpoints and watch expressions, structured logging
with correlation IDs, assertions, and for concurrency bugs, thread dumps.

**Common mistake.** "Fixing" a `NullPointerException` by adding a null check at the
crash site instead of asking why the value was ever null.

### 4.11 Database Fundamentals

```yaml
job_field: software_engineering
topic: databases
difficulty:
  - easy
  - medium
keywords: [database, sql, normalization, primary_key, foreign_key, acid, index, join]
```

A relational database stores data in tables of typed columns, with keys and constraints
enforcing integrity.

- **Primary key** uniquely identifies a row. **Foreign key** references a primary key in
  another table and enforces referential integrity.
- **Normalisation** removes redundancy: 1NF (atomic values), 2NF (no partial dependency
  on part of a composite key), 3NF (no transitive dependency on non-key columns).
  **Denormalisation** deliberately reintroduces redundancy to reduce joins on read-heavy
  workloads, accepting update anomalies as the cost.
- **JOIN types.** `INNER` returns matching rows only; `LEFT` keeps all left rows with
  NULLs for missing matches; `FULL OUTER` keeps both sides.
- **Index.** A secondary structure (usually a B+ tree) that turns a full table scan into
  a targeted lookup. Indexes speed reads, slow writes, and consume storage.
- **ACID.** Atomicity, Consistency, Isolation, Durability — the guarantees a transaction
  provides.
- **SQL vs NoSQL.** Relational databases give strong schemas, joins, and transactional
  guarantees. Document, key-value, wide-column, and graph stores relax some of these in
  exchange for flexible schemas or horizontal scale. The choice is a trade-off driven by
  access patterns, not a ranking.

Transaction isolation levels, query planning, and index internals are covered in depth
in the backend development guide.

### 4.12 APIs and HTTP

```yaml
job_field: software_engineering
topic: apis
difficulty:
  - easy
  - medium
keywords: [api, http, rest, status_code, idempotency, json, contract]
```

An API is a contract that lets one piece of software use another without knowing its
internals.

HTTP essentials:

- **Methods.** `GET` (read, safe, idempotent), `POST` (create or process, not
  idempotent), `PUT` (full replace, idempotent), `PATCH` (partial update), `DELETE`
  (idempotent).
- **Idempotency** means repeating the same request produces the same resulting state. It
  is what makes client retries safe.
- **Status code families.** `2xx` success, `3xx` redirection, `4xx` client error, `5xx`
  server error. Know `200`, `201`, `204`, `301`, `304`, `400`, `401`, `403`, `404`,
  `409`, `422`, `429`, `500`, `502`, `503`, and `504`.
- **401 vs 403.** `401 Unauthorized` means "not authenticated — who are you?";
  `403 Forbidden` means "authenticated, but not permitted".
- **Statelessness.** Each HTTP request carries everything needed to process it; the
  server keeps no client session state between requests in a strict REST design.

REST maturity, versioning strategy, pagination, and API security are expanded in the
backend development guide.

### 4.13 Concurrency Fundamentals

```yaml
job_field: software_engineering
topic: concurrency
difficulty:
  - medium
  - hard
keywords: [concurrency, parallelism, thread, race_condition, deadlock, async, lock]
```

**Concurrency is not parallelism.** Concurrency is structuring a program so multiple
tasks are *in progress* and can interleave; parallelism is literally executing them at
the same instant on multiple cores. A single-core machine can be concurrent but not
parallel.

Key hazards:

- **Race condition** — behaviour depends on unsynchronised timing between threads. The
  classic case is read-modify-write on shared state (`counter++` is three operations,
  not one).
- **Deadlock** — two or more threads each hold a lock the other needs. It requires four
  simultaneous conditions (mutual exclusion, hold-and-wait, no preemption, circular
  wait); breaking any one prevents it. A consistent global lock ordering is the usual
  practical fix.
- **Livelock** — threads keep changing state in response to each other and make no
  progress.
- **Starvation** — a thread never gets scheduled or never acquires a contended lock.

Coordination tools: mutexes, read-write locks, semaphores, condition variables, atomic
operations, and immutable or thread-confined data (the cheapest solution — no shared
mutable state means no race).

**Blocking vs async I/O.** A blocking thread waiting on I/O consumes a thread's worth of
memory and a scheduler slot. Async and event-loop models (Node.js, Python `asyncio`,
Java virtual threads) let one OS thread service many in-flight I/O operations, which is
why they scale better for I/O-bound workloads. They do not help CPU-bound work.

**Version-dependent behaviour.** CPython's Global Interpreter Lock prevents two threads
from executing Python bytecode simultaneously, so CPU-bound Python parallelism
traditionally requires processes. A free-threaded build that removes the GIL has been
introduced as an optional mode in recent CPython versions, so verify behaviour against
the interpreter actually in use.

### 4.14 Networking Fundamentals for Application Developers

```yaml
job_field: software_engineering
topic: networking_fundamentals
difficulty:
  - easy
  - medium
keywords: [tcp, udp, dns, tls, http, latency, port, socket]
```

- **TCP** is connection-oriented, ordered, and reliable, with retransmission and
  congestion control. **UDP** is connectionless and unreliable but has lower overhead,
  which suits DNS, real-time media, and telemetry.
- **DNS** resolves names to addresses. Records are cached according to TTL, which is why
  DNS changes do not take effect instantly.
- **TLS** provides confidentiality, integrity, and server authentication for a
  connection. HTTPS is HTTP carried over TLS.
- **Ports** identify a service on a host: `80` HTTP, `443` HTTPS, `22` SSH, `5432`
  PostgreSQL, `3306` MySQL, `6379` Redis.
- **Latency vs bandwidth.** Latency is delay per round trip; bandwidth is throughput.
  Adding bandwidth does not fix a chatty protocol making 50 sequential round trips.

Cloud networking, VPCs, and load balancing are covered in the DevOps/Cloud and Cloud
Architecture guides.

### 4.15 Security Fundamentals for Engineers

```yaml
job_field: software_engineering
topic: security_fundamentals
difficulty:
  - easy
  - medium
keywords: [security, injection, input_validation, secrets, least_privilege, hashing]
```

Every engineer is expected to know a baseline, regardless of specialisation:

- **Never trust input.** Validate and constrain input at the boundary; encode output for
  the context it lands in.
- **Use parameterised queries.** String-concatenating user input into SQL is the root
  cause of SQL injection. Prepared statements separate code from data.
- **Hash passwords, never encrypt them.** Use a slow, salted, purpose-built key
  derivation function such as bcrypt, scrypt, or Argon2 — not a fast general-purpose
  hash like SHA-256.
- **Do not commit secrets.** Keys in Git history remain in Git history; use a secret
  manager and rotate anything exposed.
- **Least privilege.** Give each component only the permissions it needs.
- **Do not roll your own cryptography.** Use vetted libraries and standard protocols.

The cybersecurity guide is the canonical source for OWASP categories, cryptography, and
threat modelling.

---

## 5. Easy-Level Interview Knowledge

```yaml
job_field: software_engineering
topic: easy_level_knowledge
difficulty: easy
keywords: [fundamentals, definitions, junior, basic_concepts]
```

Easy questions test whether the candidate can define and correctly use fundamental
concepts. Suitable areas and the knowledge they require:

- **Difference between an array and a linked list.** Contiguous memory and `O(1)`
  indexing versus pointer chasing with `O(1)` local insertion.
- **What Big-O notation is.** Asymptotic growth of cost with input size.
- **What a hash table is and when to use one.** Average `O(1)` keyed lookup, used for
  de-duplication, counting, caching, and indexing by ID.
- **Difference between a stack and a queue.** LIFO versus FIFO, with a concrete use for
  each.
- **What encapsulation is.** Hiding internal state behind an interface to protect
  invariants.
- **Difference between `==` and `equals()` in Java, or `==` and `is` in Python.**
  Reference identity versus value equality.
- **What a primary key is.** A column or set of columns uniquely identifying a row.
- **Difference between `GET` and `POST`.** A safe, idempotent read versus a request that
  changes state.
- **What a `404` means and how it differs from a `500`.** The client asked for something
  that does not exist versus the server failing while handling a valid request.
- **What a unit test is.** An automated check of one unit in isolation.
- **What a merge conflict in Git is.** Two branches changed overlapping lines and Git
  cannot decide which is correct.
- **Difference between compile-time and runtime errors.** Detected by the compiler
  before execution versus surfacing while the program runs.

A strong easy answer is a correct definition **plus** one concrete example. A weak
answer is a memorised definition with no example.

---

## 6. Medium-Level Interview Knowledge

```yaml
job_field: software_engineering
topic: medium_level_knowledge
difficulty: medium
keywords: [applied_knowledge, trade_offs, debugging, design, comparison]
```

Medium questions test applied reasoning: choosing between options and justifying it.

- **When to choose a hash map over a sorted tree map.** Hash map for pure keyed lookup;
  tree map when you need ordered iteration, range queries, or a predictable worst case.
- **How to detect a cycle in a linked list.** Floyd's tortoise-and-hare in `O(n)` time
  and `O(1)` space, versus a visited set costing `O(n)` space.
- **Why composition is often preferred over inheritance.** Inheritance couples to
  implementation and is fragile across deep hierarchies; composition allows swapping
  collaborators and is friendlier to testing.
- **How to decide what to mock in a unit test.** Mock external boundaries you do not
  control (network, clock, third-party API); do not mock the thing under test or simple
  value objects.
- **Difference between `git merge` and `git rebase`, and when to use each.** Merge
  preserves true history and is safe on shared branches; rebase produces linear history
  and must not be used on already-published commits.
- **A query became slow after the table grew — how to investigate.** Read the query
  plan, look for sequential scans on large tables, check whether filter columns are
  indexed, compare estimated versus actual rows, and confirm statistics are current.
- **How to make a retryable API call safe.** Design the endpoint to be idempotent, or
  accept an idempotency key so duplicates are collapsed server-side.
- **How to refactor a 600-line function.** Characterise it with tests first, extract
  cohesive blocks into named functions, then reduce parameters and nesting.
- **What causes a race condition and how to fix one.** Unsynchronised concurrent access
  to shared mutable state; fix by removing sharing, making data immutable, using
  atomics, or introducing a lock with a defined ordering.
- **How to choose between SQL and a document store.** Access patterns, need for joins
  and transactions, schema volatility, and consistency requirements.

---

## 7. Hard-Level Interview Knowledge

```yaml
job_field: software_engineering
topic: hard_level_knowledge
difficulty: hard
keywords: [system_design, scalability, distributed_systems, reliability, trade_offs]
```

Hard questions test engineering judgement under conflicting constraints. There is rarely
one right answer; the reasoning is the answer.

- **Design a URL shortener serving 100k reads per second.** Key generation strategy,
  read-heavy caching, hot-key handling, storage sizing, redirect status code choice
  (`301` is cacheable, `302` preserves analytics), and how deletion or expiry works.
- **Design a rate limiter for a public API.** Compare fixed window (cheap, boundary
  bursts), sliding window log (accurate, memory heavy), sliding window counter, and
  token bucket (allows controlled bursts). Then handle the distributed case: where the
  counter lives, and what happens when that store is unavailable.
- **How to handle cascading failures.** Timeouts on every remote call, bounded retries
  with exponential backoff **and jitter**, circuit breakers, bulkheads to isolate
  resource pools, load shedding, and graceful degradation of non-critical features.
- **Explain the CAP theorem and what it actually constrains.** During a network
  partition a distributed system must choose between consistency and availability; when
  there is no partition the real choice is latency versus consistency (the PACELC
  refinement). CAP does not say "pick two of three" in normal operation.
- **Evolve a database schema with zero downtime.** Expand-and-contract: add the new
  nullable column, dual-write, backfill in batches, migrate readers, then drop the old
  column in a later release. Never rename in place while old code is still running.
- **Design idempotency in a payment flow.** Client-supplied idempotency key, a
  uniqueness constraint at the storage layer, and storing the response so a retry
  returns the original outcome instead of charging twice.
- **What breaks first when scaling a monolith, and what to do about it.** Typically the
  shared database, then background job throughput, then deployment coupling. Vertical
  scaling, read replicas, caching, and asynchronous processing are usually cheaper first
  moves than decomposing into microservices.
- **Reason about consistency in a caching layer.** Cache-aside versus write-through
  versus write-behind, TTL selection, stampede protection, and accepting a bounded
  staleness window explicitly rather than pretending the cache is coherent.

---

## 8. Practical Engineering Scenarios

```yaml
job_field: software_engineering
topic: practical_scenarios
difficulty:
  - medium
  - hard
keywords: [scenario, incident, troubleshooting, production, real_world]
```

### Scenario A — A service returns intermittent HTTP 500 errors

Only about 2% of requests fail, with no obvious pattern.

- **Initial question.** What is the first thing you look at?
- **Expected reasoning.** Correlate the error rate with a deploy, a config change, or a
  traffic shift. Read the actual stack traces — intermittency plus a single exception
  type usually means one bad code path or one bad dependency instance.
- **Follow-up.** What if only one of five instances is failing? (Bad node, partial
  rollout, stale config, exhausted connection pool on that instance, clock skew.)
- **Deeper.** How would you prove the hypothesis without redeploying?
- **Trade-off.** Roll back immediately versus keep the failing instance for diagnosis.
  Mitigation comes first and diagnosis second, but evidence must be preserved.

### Scenario B — A previously fast endpoint became slow after a release

- **Initial question.** How do you locate the regression?
- **Expected reasoning.** Compare latency percentiles: a p99-only regression suggests
  contention or a slow path, while a uniform shift suggests added work on every request.
  Check for an N+1 query introduced by a new ORM relation, a lost index, a new
  synchronous remote call, or lock contention.
- **Follow-up.** How would you confirm an N+1 query specifically? (Count queries per
  request in logs or an APM trace.)
- **Deeper.** Why can average latency look fine while users complain?
- **Trade-off.** Cache the result versus fix the query. Caching hides the defect and
  adds an invalidation problem.

### Scenario C — Data corruption discovered in production

A nightly job wrote incorrect values to thousands of rows.

- **Initial question.** What are your first three actions?
- **Expected reasoning.** Stop the job, quantify the blast radius with a query, and
  establish whether a clean source of truth exists (backup, event log, audit table).
- **Follow-up.** How do you repair the data safely? (Idempotent batched repair script,
  dry run first, verify counts.)
- **Deeper.** How could the design have prevented this? (Constraints in the database,
  tighter transactional boundaries, validation before write, canary on one partition.)

### Scenario D — A bug cannot be reproduced locally

- **Expected reasoning.** Enumerate the differences: data volume and shape, timezone,
  locale, environment variables, concurrency level, dependency versions, and network
  conditions. Add temporary structured logging with correlation IDs and replay captured
  production inputs in a safe environment.
- **Deeper.** What if it only appears under load? That points to concurrency, resource
  exhaustion, or timeouts rather than logic.

### Scenario E — Inherited codebase with no tests and a required change

- **Expected reasoning.** Add characterisation tests that lock in current behaviour
  before changing anything, make the change behind a small seam, and keep the refactor
  separate from the behaviour change so review and rollback stay simple.
- **Trade-off.** Rewrite versus incremental refactor. Rewrites lose accumulated bug
  fixes and undocumented behaviour.

---

## 9. Troubleshooting Knowledge

```yaml
job_field: software_engineering
topic: troubleshooting
difficulty:
  - medium
  - hard
keywords: [troubleshooting, memory_leak, cpu, deadlock, stack_trace, profiling]
```

**High CPU in an application process.** Take a CPU profile or repeated thread dumps.
Look for a hot loop, catastrophic regular-expression backtracking, excessive
serialisation, or a garbage collector thrashing because the heap is nearly full.

**Rising memory or a suspected leak.** In managed runtimes a "leak" is usually
unintended retention: a static collection that only grows, an unbounded cache with no
eviction, a listener never unregistered, or thread-locals on a pooled thread. Take a
heap dump and find the dominant retaining path.

**Application hangs.** Capture a thread dump. Threads blocked on the same monitor
suggest lock contention or deadlock; threads all sitting in socket read suggest a
missing timeout on a downstream call.

**Connection pool exhaustion.** Symptoms are timeouts acquiring a connection while the
database itself is idle. Usual causes are connections not returned on an error path, a
pool sized smaller than concurrency, or long transactions holding connections open.

**Intermittent test failures.** Look for shared mutable state between tests, ordering
dependence, real-time and timezone dependence, and unawaited async work.

**Reading a stack trace.** Read from the top for *where* it broke, from the bottom for
*how* it got there, and follow "caused by" to the root exception.

---

## 10. Architecture and System Design

```yaml
job_field: software_engineering
topic: software_architecture
difficulty:
  - medium
  - hard
keywords: [architecture, layering, monolith, microservices, coupling, cohesion, system_design]
```

**Architecture** is the set of decisions that are expensive to change later: module
boundaries, data ownership, synchronous versus asynchronous communication, and
technology constraints.

Fundamental levers:

- **Coupling and cohesion.** Aim for high cohesion inside a module and low coupling
  between modules. Most architectural styles are different ways of enforcing this.
- **Layered architecture.** Presentation, then application/service, then domain, then
  persistence. Simple and well understood; risks an anaemic domain and persistence
  concerns leaking upward.
- **Hexagonal / ports-and-adapters.** Domain logic at the centre with I/O behind
  interfaces. Excellent testability at the cost of extra indirection.
- **Monolith.** One deployable unit. Simplest to develop, test, and operate, and strong
  consistency is easy. Limits are deployment coupling and blast radius as the team
  grows.
- **Modular monolith.** Enforced internal module boundaries in one deployable. Often the
  right answer for a small team that expects to split later.
- **Microservices.** Independently deployable services owning their own data. Buys team
  autonomy and independent scaling; costs distributed transactions, network failure
  modes, operational tooling, and debugging complexity.

**Microservices are not the same as distributed systems.** Microservices are an
organisational and deployment style; distributed systems are the broader class of
systems whose components run on separate machines and communicate over an unreliable
network. Every microservices system is a distributed system and inherits all its
problems — partial failure, ordering, consistency — but plenty of distributed systems (a
sharded database, a compute cluster) are not microservices.

**A system design answer should cover:** requirements and scale estimates, the data
model, the API, the component diagram, the storage choice with justification, the
scaling strategy, the failure modes, and the explicit trade-offs accepted.

---

## 11. Security

```yaml
job_field: software_engineering
topic: security
difficulty:
  - medium
  - hard
keywords: [application_security, authentication, authorization, injection, secrets, owasp]
```

**Authentication is not authorization.** Authentication establishes *who* the caller is
(password, token, certificate, MFA). Authorization determines *what* that identity may
do (roles, permissions, ownership checks). A system can authenticate perfectly and still
be catastrophically broken if it never checks authorization — broken access control is
the top category in the OWASP Top 10:2025.

Engineering-level defences:

- **Injection** (SQL, command, LDAP, template) — parameterise queries, avoid shelling
  out with user input, and use safe template engines.
- **Broken access control** — enforce authorization server-side on every request,
  including object-level ownership checks; never rely on a hidden UI element.
- **Cryptographic failures** — TLS everywhere, no home-grown cryptography, correct
  password hashing, sensitive data encrypted at rest.
- **Insecure design** — threat model before building; a perfectly implemented insecure
  design is still insecure.
- **Secrets management** — externalise secrets, rotate them, and scope them narrowly.
- **Dependency and supply chain risk** — pin and audit dependencies; software supply
  chain failures are a distinct top-ten category in the 2025 list.

Depth on cryptography, the OWASP categories, threat modelling, and incident response
lives in the cybersecurity guide.

---

## 12. Performance and Scalability

```yaml
job_field: software_engineering
topic: performance
difficulty:
  - medium
  - hard
keywords: [performance, profiling, latency, throughput, caching, scaling, percentiles]
```

**Measure before optimising.** Profiling tells you where time actually goes; intuition
about hot spots is unreliable.

- **Latency vs throughput.** Latency is time per operation; throughput is operations per
  unit time. Batching typically improves throughput and worsens per-item latency.
- **Percentiles, not averages.** p50 describes the typical user; p95 and p99 describe
  the users who complain. An average hides a bimodal distribution completely.
- **Amdahl's law.** Speedup from parallelising is bounded by the fraction of work that
  remains serial. Parallelising 80% of a job caps total speedup at 5x.
- **Vertical scaling** (a bigger machine) is simple and has a ceiling. **Horizontal
  scaling** (more machines) is effectively unbounded but requires statelessness or
  partitioning, plus a load-balancing and coordination story.
- **Caching** is the highest-leverage and most dangerous optimisation: it converts a
  performance problem into a correctness and invalidation problem. Always define TTL,
  eviction policy, and what stale data costs.
- **Common application-level wins.** Eliminate N+1 queries, add the missing index, batch
  remote calls, move non-critical work to a background queue, and avoid serialising
  large objects on the hot path.

---

## 13. Common Candidate Mistakes

```yaml
job_field: software_engineering
topic: common_mistakes
difficulty:
  - easy
  - medium
  - hard
keywords: [mistakes, misconceptions, interview_pitfalls]
```

- Reciting definitions without a concrete example or use case.
- Giving time complexity but never space complexity.
- Claiming hash table lookup is "always `O(1)`" with no mention of collisions or
  resizing.
- Using "Git" and "GitHub" interchangeably.
- Saying microservices are "better" than a monolith with no reference to team size,
  operational maturity, or consistency requirements.
- Treating 100% test coverage as proof of quality.
- Jumping straight to code in a system design question without clarifying requirements
  or estimating scale.
- Optimising without measuring, then being unable to say what got faster.
- Confusing authentication with authorization.
- Confusing concurrency with parallelism.
- Presenting a design with no downsides. Every real design has costs; not naming them
  suggests the candidate has not operated the system.
- Silently assuming inputs are valid, unique, non-null, or sorted.

---

## 14. Interview Evaluation Points

```yaml
job_field: software_engineering
topic: evaluation_points
difficulty:
  - easy
  - medium
  - hard
keywords: [evaluation, rubric, signals, assessment]
```

An interviewer should be able to determine whether the candidate understands:

- **Correctness first.** Whether they consider edge cases — empty input, single element,
  duplicates, nulls, overflow, boundary indices — without prompting.
- **Cost.** Whether they can state and justify time and space complexity, and whether
  they notice when a chosen data structure makes the solution worse.
- **Design reasoning.** Whether module boundaries are justified by change patterns
  rather than by habit.
- **Trade-off literacy.** Whether they can argue the *other* side of their own choice.
- **Testing instinct.** Whether they describe how they would verify the solution,
  including a failing case.
- **Debugging method.** Whether they isolate systematically or guess.
- **Communication.** Whether they state assumptions explicitly and adjust when given new
  constraints.
- **Honesty.** Whether they say "I don't know, here is how I would find out" instead of
  fabricating. This is a positive signal, not a negative one.

**Adaptive guidance.** A strong answer on data structures should escalate to algorithmic
trade-offs and then to system design. A weak answer on system design should step back to
a concrete, foundational area — data structures, HTTP basics, or Git — rather than
repeating a system design question in different words.

---

## 15. Cross-Topic Relationships

```yaml
job_field: software_engineering
topic: cross_topic_relationships
difficulty: medium
keywords: [relationships, topic_map, prerequisites, adjacent_fields]
```

Concept relationships that must not be collapsed:

- **Programming is part of software engineering.** Writing code is one activity within
  the discipline.
- **Git is not GitHub.** A distributed VCS versus a hosting platform built around it.
- **Testing includes test automation.** Automation is one technique within testing.
- **Concurrency is not parallelism.** Interleaving versus simultaneous execution.
- **Authentication is not authorization.** Identity versus permission.
- **Microservices are a subset of distributed systems.** A style within a broader class.
- **Data structures are not algorithms.** Structures organise data; algorithms operate
  on them. The pairing matters: BFS needs a queue, Dijkstra needs a heap.
- **Design patterns are not architecture.** Patterns are local design solutions;
  architecture is system-wide structural decisions.
- **Inheritance is not polymorphism.** Inheritance is one mechanism for achieving
  polymorphism; interfaces and duck typing are others.

Topic progression for adaptive interviews (easy to hard):

`programming_fundamentals -> data_structures -> algorithms -> object_oriented_programming -> solid_principles -> design_patterns -> software_architecture -> system_design`

Parallel track for breadth when the candidate stalls on one line:

`git -> testing -> debugging -> databases -> apis -> networking_fundamentals -> security_fundamentals`

Canonical depth lives elsewhere for these adjacent areas:

- HTTP semantics, REST design, transactions, indexing, caching, messaging —
  `backend_development_interview_guide.md`
- Browser, DOM, React, accessibility, frontend performance —
  `frontend_development_interview_guide.md`
- Linux, Docker, Kubernetes, CI/CD, Terraform, observability —
  `devops_cloud_interview_guide.md`
- High availability, disaster recovery, VPC design, serverless, cost —
  `cloud_architecture_interview_guide.md`
- OWASP, cryptography, threat modelling, incident response —
  `cybersecurity_interview_guide.md`
- Test design, automation frameworks, flaky tests, defect management —
  `qa_testing_interview_guide.md`
