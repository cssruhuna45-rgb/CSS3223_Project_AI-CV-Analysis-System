# Data Engineering Interview Knowledge Guide

```yaml
job_field: data_engineering
job_field_name: Data Engineering
canonical_topics:
  - data_engineering_overview
  - sql
  - relational_databases
  - data_modeling
  - etl
  - elt
  - data_pipelines
  - batch_processing
  - stream_processing
  - apache_kafka
  - apache_spark
  - apache_airflow
  - data_warehousing
  - data_lakes
  - lakehouse
  - data_quality
  - partitioning
  - indexing
  - file_formats
  - distributed_processing
  - cloud_data_services
  - pipeline_reliability
  - data_monitoring
  - data_security
  - data_governance
difficulty:
  - easy
  - medium
  - hard
```

This document is the canonical interview knowledge base for the **data_engineering** job
field. It owns analytical SQL, dimensional and lakehouse modelling, ETL/ELT pipeline
design, Kafka, Spark, Airflow, warehouse and lake architecture, partitioning and file
formats, and data quality. Transactional database internals live in the backend guide;
cloud infrastructure design lives in the cloud architecture guide.

---

## 1. Job Field Overview

```yaml
job_field: data_engineering
topic: data_engineering_overview
difficulty: easy
keywords: [data_engineering, pipeline, data_platform, responsibilities, analytics]
```

Data engineering builds and operates the systems that move, store, transform, and serve
data so that analysts, data scientists, and applications can rely on it. The output of a
data engineer is not a query — it is a **dependable, documented, monitored dataset that
arrives on time and is correct**.

Typical responsibilities:

- Ingest data from operational databases, APIs, event streams, and files.
- Model data for analytical use.
- Build transformation pipelines that are idempotent, testable, and observable.
- Operate batch and streaming infrastructure.
- Guarantee data quality, freshness, and lineage.
- Manage cost and performance of storage and compute.
- Enforce access control, privacy, and retention rules.

**Data engineering is distinct from adjacent roles.** Analytics engineers focus on
modelling and transformation inside the warehouse. Data scientists build models. Backend
engineers own transactional systems. ML engineers productionise models. The boundaries
blur in small teams, and an interview will probe where the candidate actually operates.

**The recurring theme in this field is correctness under repetition:** a pipeline runs
thousands of times, is re-run after failures, and processes late and duplicate data. A
transformation that is only correct on the first run is not a pipeline.

---

## 2. Core Competencies

```yaml
job_field: data_engineering
topic: core_competencies
difficulty: easy
keywords: [competencies, data_skills, evaluation]
```

1. **SQL at analytical depth** — joins, aggregation, window functions, CTEs, query plans.
2. **Python** — data manipulation, API clients, orchestration code, testing.
3. **Data modelling** — normalised, dimensional, and wide analytical models.
4. **ETL and ELT design** — extraction strategies, incremental loads, idempotency.
5. **Batch processing at scale** — Spark or an equivalent distributed engine.
6. **Stream processing** — Kafka, event semantics, windowing, exactly-once effects.
7. **Orchestration** — Airflow or equivalent: dependencies, scheduling, retries,
   backfills.
8. **Warehousing and lake architecture** — columnar storage, partitioning, file formats.
9. **Data quality** — tests, contracts, anomaly detection, reconciliation.
10. **Performance and cost tuning** — partition pruning, file sizing, shuffle reduction.
11. **Cloud data services** — managed warehouses, object storage, serverless processing.
12. **Reliability engineering for pipelines** — SLAs, alerting, backfill safety.
13. **Security and governance** — PII handling, access control, lineage, retention.

---

## 3. Foundational Knowledge

### 3.1 Analytical SQL

```yaml
job_field: data_engineering
topic: sql
difficulty:
  - easy
  - medium
  - hard
keywords: [sql, join, aggregation, window_function, cte, group_by, deduplication, null]
```

SQL is the primary language of data engineering, and the depth expected here exceeds
application-developer level.

- **Logical evaluation order.** `FROM` → `JOIN` → `WHERE` → `GROUP BY` → `HAVING` →
  `SELECT` → `DISTINCT` → `ORDER BY` → `LIMIT`. This explains why `WHERE` cannot reference
  a `SELECT` alias or an aggregate, and why `HAVING` filters groups while `WHERE` filters
  rows.
- **Join semantics and fan-out.** Joining to a table with duplicate keys multiplies rows
  and silently inflates every downstream `SUM`. Checking join cardinality before
  aggregating is a defining habit of a competent data engineer.
- **NULL logic.** `NULL` is unknown: comparisons yield unknown, aggregates skip NULLs, and
  `COUNT(col)` differs from `COUNT(*)`. `NOT IN` with a NULL in the subquery returns no
  rows at all — a classic silent bug; use `NOT EXISTS`.
- **Window functions** compute across a partition without collapsing rows:
  `ROW_NUMBER`, `RANK`, `DENSE_RANK`, `LAG`, `LEAD`, `SUM(...) OVER (...)`. The canonical
  deduplication pattern is `ROW_NUMBER() OVER (PARTITION BY key ORDER BY updated_at DESC)`
  and keeping row 1.
- **CTEs** name intermediate steps and make long transformations reviewable; recursive
  CTEs walk hierarchies. Materialisation behaviour differs between engines and affects
  performance.
- **Grouping extensions** — `GROUPING SETS`, `ROLLUP`, and `CUBE` compute multiple
  aggregation levels in one pass.
- **Set operations** — `UNION` deduplicates and therefore sorts; `UNION ALL` does not and
  is much cheaper when duplicates are impossible or acceptable.
- **Incremental patterns** — `MERGE` (upsert) for slowly changing data, and
  insert-overwrite by partition for reprocessing a bounded window.

**Query performance thinking.** Read the plan. Look for a full scan where a partition
filter was expected, a broadcast that should have been a shuffle join (or the reverse),
and skew where one partition holds most of the rows.

### 3.2 Relational and Analytical Storage Engines

```yaml
job_field: data_engineering
topic: relational_databases
difficulty:
  - easy
  - medium
keywords: [oltp, olap, row_store, column_store, index, mvcc, postgresql, warehouse_engine]
```

**OLTP versus OLAP is the foundational distinction in this field.**

| Aspect | OLTP | OLAP |
|--------|------|------|
| Workload | Many small reads and writes | Few large scans and aggregations |
| Storage | Row-oriented | Column-oriented |
| Optimised for | Point lookups, transactions | Full-column scans, compression |
| Typical query | Fetch one order | Sum revenue by region by month |
| Indexing | B-tree indexes | Partitioning, clustering, zone maps |
| Examples | PostgreSQL, MySQL | BigQuery, Snowflake, Redshift, ClickHouse |

**Why columnar storage wins for analytics.** A query touching three of eighty columns
reads only those three columns' data. Values within a column are homogeneous, so
compression ratios are far higher, and vectorised execution processes batches of values
efficiently.

**Running analytics on the production OLTP database** is the most common early mistake:
long scans hold resources, compete with transactional traffic, and can degrade or block
the application. Replicate to an analytical store instead.

**PostgreSQL** appears in this field both as a source system and as a small-scale
analytical target. Worth knowing: MVCC and `VACUUM`, `EXPLAIN ANALYZE`, partitioned tables,
`COPY` for bulk load, logical replication as a CDC source, and `JSONB` for semi-structured
columns.

### 3.3 File Formats and Compression

```yaml
job_field: data_engineering
topic: file_formats
difficulty:
  - medium
  - hard
keywords: [parquet, avro, orc, json, csv, columnar, compression, schema_evolution, small_files]
```

File format choice materially changes cost and query speed on a data lake.

- **CSV** — universal, human-readable, no schema, no types, poor compression, expensive to
  parse. Acceptable at the raw landing edge, not for analytical storage.
- **JSON / JSONL** — flexible and self-describing, verbose, slow to parse. Common for
  event ingestion.
- **Avro** — row-oriented binary with an embedded schema and strong schema evolution
  support. Well suited to streaming and record-by-record writes; the usual Kafka
  serialisation choice with a schema registry.
- **Parquet** — columnar binary with per-column compression, encoding, and row-group
  statistics enabling predicate pushdown. The default choice for analytical storage in a
  lake.
- **ORC** — columnar with similar goals, strong in the Hive ecosystem.

**Compression.** Snappy is fast and splittable-friendly, favouring query speed. Gzip
compresses harder but is not splittable, which can serialise reads of a large file. Zstd
offers a good ratio-to-speed balance and is increasingly the default.

**The small files problem.** Thousands of tiny files destroy performance: each file
carries listing, opening, and metadata overhead, and the engine cannot parallelise
usefully. Streaming writers and over-partitioning are the usual causes. The fix is
compaction into files in the low-hundreds-of-megabytes range, and coarser partitioning.

**Schema evolution.** Adding a nullable column is generally safe; renaming, retyping, or
removing a column breaks readers. Avro and the table formats below handle this
explicitly; raw Parquet directories handle it poorly.

---

## 4. Core Technical Topics

### 4.1 Data Modelling

```yaml
job_field: data_engineering
topic: data_modeling
difficulty:
  - medium
  - hard
keywords: [dimensional_modeling, star_schema, fact_table, dimension, scd, normalization, grain, data_vault]
```

**Normalised (3NF) modelling** minimises redundancy and is right for transactional
systems. **Dimensional modelling** deliberately denormalises for query simplicity and
performance and is the standard for analytical warehouses.

**Star schema.** A central **fact table** of measurements surrounded by **dimension
tables** of descriptive attributes.

- **Fact table** — one row per business event at a declared **grain** (for example, one
  row per order line). Contains foreign keys to dimensions and numeric measures. Declaring
  the grain first is the single most important modelling step; a fact table with an unclear
  grain produces double counting forever.
- **Dimension table** — descriptive attributes (customer, product, date, store), wide and
  denormalised, with a surrogate key.
- **Snowflake schema** normalises dimensions into sub-tables. It saves a little storage and
  costs joins and comprehensibility; star is usually preferred.

**Fact table types.** Transaction facts (one row per event), periodic snapshot facts (state
at regular intervals, such as daily balance), and accumulating snapshot facts (one row per
process instance updated as milestones complete).

**Additivity.** A measure can be fully additive (revenue), semi-additive (account balance —
summable across accounts, not across time), or non-additive (a ratio — must be recomputed
from components, never averaged). Averaging a stored ratio is a classic error.

**Slowly Changing Dimensions (SCD).** How to handle a changing attribute such as a
customer's city:

- **Type 0** — never change.
- **Type 1** — overwrite. Simple; destroys history, and historical facts are then reported
  under the new value.
- **Type 2** — add a new row with validity dates and a current flag. Preserves history and
  is the usual choice for anything used in historical reporting; it grows the dimension and
  requires surrogate keys.
- **Type 3** — keep a "previous value" column. Limited history, cheap.

**Other approaches.** Data Vault (hubs, links, satellites) optimises for auditability and
source-system change in large enterprises at the cost of many joins. Wide denormalised
"one big table" models suit columnar engines where joins are relatively expensive and
storage is cheap.

**Surrogate versus natural keys.** Surrogate keys insulate the warehouse from source
system key changes and are required for SCD Type 2; keep the natural key as an attribute
for traceability.

### 4.2 ETL, ELT, and Ingestion

```yaml
job_field: data_engineering
topic: etl
difficulty:
  - medium
  - hard
keywords: [etl, elt, cdc, incremental_load, full_load, watermark, idempotency, extraction]
```

**ETL versus ELT.** ETL transforms data before loading it into the target, which suited an
era of expensive warehouse compute and constrained storage. **ELT** loads raw data first
and transforms inside the warehouse, exploiting cheap object storage and elastic warehouse
compute. ELT dominates modern cloud stacks because raw data is retained for reprocessing
and transformations are version-controlled SQL. ETL remains appropriate when data must be
masked or filtered before it lands, or when the target cannot transform efficiently.

**Extraction strategies.**

- **Full load** — copy everything each run. Simple and self-correcting; impractical beyond
  modest volumes.
- **Incremental by watermark** — select rows where `updated_at > last_watermark`. Requires
  a reliable, monotonically updated timestamp; misses hard deletes and rows updated without
  touching the column. Use an overlap window to catch late or clock-skewed writes.
- **Change Data Capture (CDC)** — read the database's write-ahead log to capture every
  insert, update, and delete in order. Captures deletes, imposes minimal load on the
  source, and gives near-real-time change events. Costs: operational complexity, schema
  change handling, and initial snapshot plus stream reconciliation.
- **Event-based** — the application publishes domain events. Cleanest semantically, but
  requires application change and the events must be treated as a contract.

**Idempotency is the central requirement.** Pipelines re-run: on failure, on backfill, on
a manual retry. Techniques: insert-overwrite of a whole partition, `MERGE` on a natural
key, deduplication by event id with `ROW_NUMBER`, and deterministic derived keys. A
pipeline that appends without a dedup key will duplicate on every retry.

**Late-arriving and out-of-order data.** Distinguish **event time** (when it happened) from
**processing time** (when you saw it). Partition by event time, define an allowed lateness
window, and decide the policy for data arriving after it: reprocess the affected partition,
route to a late-data table, or drop with a metric.

**Backfills** must be safe, bounded, and idempotent. Backfilling by partition with the same
code path as the incremental run avoids two divergent implementations — a common source of
"the backfill produced different numbers".

### 4.3 Data Pipelines and Orchestration with Airflow

```yaml
job_field: data_engineering
topic: apache_airflow
difficulty:
  - medium
  - hard
keywords: [airflow, dag, operator, scheduler, dependencies, retries, sla, backfill, idempotent_task]
```

**Apache Airflow** is a workflow orchestration platform where pipelines are defined as
Python code producing **DAGs** (directed acyclic graphs) of tasks with dependencies,
schedules, retries, and monitoring.

Core concepts:

- **DAG** — the workflow definition, with a schedule and a defined data interval.
- **Task / operator** — a unit of work. The common pattern is that operators *trigger and
  monitor* work in an external system (a warehouse query, a Spark job) rather than doing
  heavy computation inside Airflow itself.
- **Scheduler** — creates runs and queues tasks whose dependencies are satisfied.
- **Executor / workers** — where tasks actually run.
- **Sensors** — wait for an external condition. Long-running sensors occupy worker slots;
  deferrable operators exist precisely to avoid that.
- **XCom** — small message passing between tasks. It is not a data transport; passing
  DataFrames through it is an anti-pattern.
- **Retries, timeouts, and SLAs** — configured per task, with alerting on breach.

**Design principles for orchestration.**

- **Tasks must be idempotent**, because retries and backfills will re-run them.
- **Parameterise by the data interval**, not by "today", so a backfill for last March
  processes March's data.
- **Keep tasks atomic and granular enough** that a failure re-runs a small unit, but not so
  granular that scheduling overhead dominates.
- **Avoid heavy computation in the orchestrator.** Airflow coordinates; Spark or the
  warehouse computes.
- **Separate orchestration logic from transformation logic** so transformations can be
  tested independently.

**Version-dependent behaviour.** Airflow 3 introduced substantial changes including native
DAG versioning, a Task Execution API decoupling task execution from the scheduler (enabling
remote and multi-language execution), scheduler-managed backfills, and a rebuilt UI.
Airflow 2 patterns such as the TaskFlow API remain widely deployed. Confirm the version in
use before assuming behaviour or CLI syntax.

**Alternatives worth naming.** Dagster and Prefect (asset- and Python-centric
orchestrators), dbt for in-warehouse transformation with tests and lineage, and cloud-native
options (Step Functions, Data Factory, Cloud Composer).

### 4.4 Batch Processing with Apache Spark

```yaml
job_field: data_engineering
topic: apache_spark
difficulty:
  - medium
  - hard
keywords: [spark, rdd, dataframe, lazy_evaluation, shuffle, partition, skew, broadcast_join, executor]
```

**Apache Spark** is a distributed data processing engine that executes computation across
a cluster with in-memory caching and a query optimiser.

**Architecture.** A **driver** builds the execution plan and coordinates; **executors** run
tasks on partitions of the data; a cluster manager (YARN, Kubernetes, or the provider's)
allocates resources.

**Core model.**

- **RDD** — the low-level distributed collection. Rarely used directly today.
- **DataFrame / Dataset** — the structured API, optimised by the Catalyst optimiser and
  Tungsten execution engine. Prefer these: they enable predicate pushdown, column pruning,
  and code generation that hand-written RDD code will not get.
- **Lazy evaluation.** Transformations (`select`, `filter`, `join`) build a plan; **actions**
  (`count`, `write`, `collect`) trigger execution. This lets the optimiser fuse operations —
  and it is why an error can surface far from the line that caused it.
- **Narrow versus wide transformations.** Narrow transformations (`map`, `filter`) need no
  data movement. Wide transformations (`groupBy`, `join`, `distinct`, `repartition`) require
  a **shuffle**: data is redistributed across the network, written to disk, and re-read.
  **Shuffles are the dominant cost in most Spark jobs.**

**Performance levers.**

- **Reduce shuffles.** Filter early, project only needed columns, pre-partition data by the
  join key, and avoid unnecessary `repartition`.
- **Broadcast joins.** When one side is small enough to fit in executor memory, broadcasting
  it eliminates the shuffle entirely. Spark does this automatically below a size threshold,
  and it can be hinted.
- **Data skew** — one key with far more rows than others makes one task run for hours while
  the rest finish in minutes. Symptoms: a stage where one task's duration is orders of
  magnitude above the median. Mitigations: salting the skewed key, splitting the skewed
  values out and handling them separately, or adaptive query execution's skew join handling.
- **Partition sizing.** Too few partitions underuses the cluster; too many creates
  scheduling overhead and tiny output files. Target partitions in the low hundreds of
  megabytes.
- **Caching.** `cache`/`persist` helps only when a DataFrame is reused multiple times, and
  it consumes executor memory that would otherwise serve execution.
- **Spilling.** When a shuffle or aggregation exceeds memory, Spark spills to disk. Heavy
  spill in the UI is the signal to increase memory, increase partitions, or reduce data.
- **Out of memory on the driver** is almost always `collect()` on a large DataFrame or
  broadcasting something too big.

**Version-dependent behaviour.** Adaptive Query Execution (dynamic partition coalescing,
skew join handling, join strategy switching at runtime) is enabled by default in recent
Spark versions and changes tuning advice significantly; Spark Connect provides a
decoupled client-server architecture. Check the cluster's version.

### 4.5 Stream Processing and Apache Kafka

```yaml
job_field: data_engineering
topic: apache_kafka
difficulty:
  - medium
  - hard
keywords: [kafka, topic, partition, consumer_group, offset, retention, ordering, exactly_once, lag]
```

**Apache Kafka** is a distributed, partitioned, replicated commit log. Producers append
records to topics; consumers read at their own offsets; records are retained by time or
size regardless of whether they have been consumed.

**Kafka is not a traditional message queue.** A queue typically deletes a message once
consumed by one consumer; Kafka retains records and allows many independent consumer groups
to read the same data at different positions, and to replay history.

Core concepts:

- **Topic and partition.** A topic is split into partitions, which are the unit of
  parallelism and of ordering. **Ordering is guaranteed only within a partition**, so
  records that must be ordered relative to each other must share a key.
- **Key and partitioning.** The record key determines the partition. Keying by entity id
  gives per-entity ordering; a poorly distributed key creates a hot partition.
- **Consumer group.** Partitions are distributed across consumers in a group; **adding more
  consumers than partitions adds no parallelism**. A rebalance occurs when membership
  changes and briefly pauses consumption.
- **Offsets.** The consumer's position, committed either automatically or manually. Commit
  after processing for at-least-once; committing before processing risks silent data loss.
- **Replication.** Each partition has a leader and followers. `replication.factor`,
  `min.insync.replicas`, and producer `acks=all` together determine durability. `acks=1`
  can lose data on leader failure.
- **Retention.** Time- or size-based, with **log compaction** as an alternative that retains
  the latest record per key — useful for changelog and state topics.
- **Consumer lag** is the primary health metric: the gap between the latest offset and the
  consumer's position. Growing lag means consumers cannot keep up.

**Delivery semantics.** At-most-once, at-least-once (the practical default), and
exactly-once. Kafka supports transactional exactly-once processing *within* Kafka
(read-process-write with the transactional producer). End-to-end exactly-once across
external systems still requires idempotent writes on the sink side. **Design consumers to be
idempotent regardless.**

**Stream processing concepts.**

- **Event time versus processing time**, and **watermarks** to bound how long to wait for
  late events.
- **Windowing** — tumbling (fixed, non-overlapping), hopping/sliding (overlapping), and
  session (activity-gap-delimited) windows.
- **Stateful processing** — joins and aggregations over a window require managed,
  checkpointed state and a recovery story.
- **Streaming frameworks** — Kafka Streams, Apache Flink (strong event-time and state
  handling), and Spark Structured Streaming (micro-batch and continuous modes).

**Batch versus streaming trade-off.** Streaming gives low latency at the cost of higher
operational complexity, harder correctness (late data, state, exactly-once), and more
expensive debugging and reprocessing. Many "real-time" requirements are satisfied by
frequent micro-batches. Choose streaming when the latency requirement genuinely justifies
it.

### 4.6 Data Warehouses, Lakes, and Lakehouses

```yaml
job_field: data_engineering
topic: data_warehousing
difficulty:
  - medium
  - hard
keywords: [data_warehouse, data_lake, lakehouse, delta_lake, iceberg, medallion, schema_on_read]
```

- **Data warehouse** — a governed, structured, query-optimised analytical store with
  schema-on-write. Strong performance and governance; less suited to unstructured data and
  historically more expensive per terabyte.
- **Data lake** — raw and semi-structured data in object storage with schema-on-read. Cheap
  and flexible; without governance it degrades into a "data swamp" with no reliable schema,
  no transactions, and no discoverability.
- **Lakehouse** — open table formats (Delta Lake, Apache Iceberg, Apache Hudi) layered over
  object storage to add ACID transactions, schema enforcement and evolution, time travel,
  and efficient upserts and deletes. This is the architecture that made "delete this user's
  rows" tractable on a lake, which matters for privacy compliance.
- **Data mesh** is an organisational approach — domain teams own data as a product with
  defined contracts and quality guarantees — not a technology. It addresses ownership
  bottlenecks and adds coordination overhead; it suits large organisations, rarely small
  ones.

**Layered (medallion) architecture.** Raw/bronze (immutable ingested data as received),
cleaned/silver (typed, deduplicated, conformed), and curated/gold (business-level
aggregates and marts). Keeping raw data immutable is what makes reprocessing possible when
a transformation bug is discovered.

**Cloud warehouse characteristics worth knowing.** Separation of storage and compute
(independent scaling, multiple compute clusters over one dataset), columnar storage,
automatic clustering or micro-partitioning, result caching, and consumption-based pricing
in which an unoptimised query is a direct cost. Examples: BigQuery, Snowflake, Redshift,
Synapse, Databricks SQL.

### 4.7 Partitioning, Clustering, and Query Performance

```yaml
job_field: data_engineering
topic: partitioning
difficulty:
  - medium
  - hard
keywords: [partitioning, partition_pruning, clustering, bucketing, statistics, predicate_pushdown, cost]
```

**Partitioning** physically separates data by a column value (usually a date) so a query
filtering on that column reads only the relevant partitions — **partition pruning**. This
is the single largest performance and cost lever in a data lake or warehouse.

Rules of thumb:

- **Partition on the column most queries filter by**, which is usually event date.
- **Avoid high-cardinality partition keys.** Partitioning by user id creates millions of
  tiny directories and makes everything slower — the small files problem in another form.
- **Partitioning helps only if queries actually filter on the partition column.** A wrapped
  function or a type mismatch in the predicate defeats pruning.
- **Sub-partitioning** (date then region) helps when both columns are commonly filtered,
  and hurts when they are not.

**Clustering / sorting / Z-ordering** physically co-locates rows by the values of one or
more columns within partitions, improving data skipping via min/max statistics per file or
block. It complements partitioning and works for higher-cardinality columns.

**Bucketing** hash-distributes rows into a fixed number of buckets by a key, so joins on
that key can avoid a shuffle when both sides are bucketed identically.

**Statistics and file layout.** Query engines rely on per-file statistics to skip data;
compaction into well-sized files and keeping statistics current are ongoing maintenance
tasks, not one-time setup.

**Cost control in consumption-priced warehouses.** Scanned bytes drive the bill: select only
needed columns, filter on the partition column, materialise frequently repeated
aggregations, use result caching, and set query size limits so a runaway query cannot cost
thousands.

### 4.8 Data Quality and Testing

```yaml
job_field: data_engineering
topic: data_quality
difficulty:
  - medium
  - hard
keywords: [data_quality, tests, freshness, completeness, uniqueness, reconciliation, contract, anomaly]
```

Data quality is a first-class engineering concern. A pipeline that runs successfully while
producing wrong numbers is worse than one that fails loudly, because the error propagates
silently into decisions.

**Dimensions to test.**

- **Completeness** — expected row counts, no missing partitions, required fields populated.
- **Uniqueness** — primary key uniqueness in the target, no duplicate events.
- **Validity** — values in allowed ranges, enumerations, referential integrity to
  dimensions.
- **Consistency** — totals reconcile against the source system.
- **Freshness** — the latest data is within the agreed staleness window.
- **Accuracy** — matches an authoritative reference where one exists.

**Where tests run.** Ingestion-time schema validation, transformation-time assertions
(dbt tests, Great Expectations, or plain SQL checks), and post-load reconciliation. Failing
the pipeline versus warning is a policy decision: blocking a bad load protects consumers,
while blocking on a minor anomaly can create pointless pages.

**Data contracts** formalise the schema, semantics, and quality guarantees between a
producing system and consumers, with breaking changes requiring a versioned negotiation.
They address the root cause of most silent pipeline failures: an upstream team changing a
column without telling anyone.

**Anomaly detection** on volume, distribution, and null rate catches problems that explicit
rules miss — for example, revenue that is technically valid but 40% below the same weekday
last month.

**Testing the code as well as the data.** Unit tests on transformation logic with small
fixture inputs, integration tests running the pipeline end to end on a sample, and
assertions in the pipeline itself. Transformations expressed as SQL in a tool with a testing
framework are easier to test than transformations buried in operator code.

### 4.9 Pipeline Reliability and Operations

```yaml
job_field: data_engineering
topic: pipeline_reliability
difficulty:
  - medium
  - hard
keywords: [reliability, sla, retry, idempotency, backfill, lineage, alerting, dead_letter]
```

- **Idempotency and atomic publication.** Write to a staging location and swap or commit
  atomically, so consumers never observe a half-written dataset. Partition overwrite and
  transactional table formats both provide this.
- **Retries with backoff** for transient failures; a **dead-letter destination** for records
  that cannot be processed, so one malformed record does not halt the pipeline.
- **Freshness SLAs and alerting.** Alert on the data being late or wrong, not merely on a
  task raising an exception. A task that succeeds while producing zero rows is the failure
  mode that hurts most.
- **Lineage** — knowing which datasets feed which, so you can assess impact when an upstream
  source breaks and notify affected consumers.
- **Dependency management.** Downstream jobs should wait for upstream data readiness (a
  data-availability signal), not for a wall-clock time that happens to usually work.
- **Backfill safety.** Bounded, resumable, rate-limited so a backfill does not starve
  production workloads, and using the same code path as the incremental run.
- **Schema change handling.** Detect upstream schema changes automatically, decide whether
  to fail or evolve, and version the output schema for consumers.
- **Cost monitoring** alongside reliability: an accidental full-table scan scheduled hourly
  is a reliability *and* budget incident.

---

## 5. Easy-Level Interview Knowledge

```yaml
job_field: data_engineering
topic: easy_level_knowledge
difficulty: easy
keywords: [data_basics, definitions, sql_basics, etl_basics, junior]
```

- **What is a data pipeline?** An automated sequence that moves and transforms data from
  source to destination.
- **What is ETL and how does ELT differ?** Transform before loading versus load raw and
  transform inside the target.
- **What is the difference between OLTP and OLAP?** Transactional workloads with many small
  operations versus analytical workloads scanning and aggregating large volumes.
- **What is a primary key and a foreign key?** Unique row identity versus a reference to
  another table's key.
- **What is the difference between `INNER JOIN` and `LEFT JOIN`?** Matching rows only versus
  all left rows with NULLs for non-matches.
- **What is the difference between `WHERE` and `HAVING`?** Filtering rows before grouping
  versus filtering groups after aggregation.
- **What is a data warehouse?** A structured, query-optimised store for analytical data.
- **What is a data lake?** Raw and semi-structured data stored cheaply in object storage
  with schema applied on read.
- **What is Parquet and why is it used?** A columnar binary format with compression and
  statistics that makes analytical scans much cheaper.
- **What is Apache Airflow used for?** Orchestrating pipelines as scheduled DAGs of tasks
  with dependencies and retries.
- **What is Apache Kafka?** A distributed, partitioned, replicated log for publishing and
  consuming streams of records.
- **What is Apache Spark?** A distributed processing engine for large-scale data
  transformation.
- **What is a fact table and a dimension table?** Measurements of business events versus
  descriptive attributes that give them context.
- **What is partitioning?** Physically dividing data by a column value so queries read only
  relevant partitions.
- **What does it mean for a pipeline to be idempotent?** Running it twice produces the same
  result as running it once.
- **What is batch processing versus stream processing?** Processing bounded chunks on a
  schedule versus processing records continuously as they arrive.

---

## 6. Medium-Level Interview Knowledge

```yaml
job_field: data_engineering
topic: medium_level_knowledge
difficulty: medium
keywords: [applied_data_engineering, design, debugging, optimization, comparison]
```

- **How would you design an incremental load from a production database?** Watermark on a
  reliable `updated_at` with an overlap window, or CDC if deletes and full fidelity matter.
  Then explain how you make the load idempotent and how you detect missed rows.
- **How do you deduplicate an event stream?** `ROW_NUMBER` partitioned by the event id
  ordered by ingestion time, or a `MERGE` on the event key. Then discuss the deduplication
  window and what happens to duplicates arriving days later.
- **A Spark job is slow. How do you investigate?** Read the Spark UI: find the longest
  stage, check for skew (max task time versus median), check shuffle read and spill volume,
  verify partition count and file sizes, and confirm predicate and column pruning happened.
- **How do you handle late-arriving data?** Partition by event time, define an allowed
  lateness window, reprocess affected partitions idempotently, and track late arrivals as a
  metric rather than silently dropping them.
- **What is data skew and how do you fix it?** A few keys holding most of the rows;
  mitigate with salting, isolating hot keys, broadcast joins where applicable, or adaptive
  execution.
- **When would you choose streaming over batch?** When the business genuinely needs
  sub-minute freshness. Otherwise batch is cheaper, simpler to reprocess, and easier to
  test.
- **How would you model an e-commerce dataset for analytics?** Declare the grain, build an
  order-line fact with date, customer, product, and channel dimensions, choose SCD Type 2
  where historical attribute values matter, and name the additivity of each measure.
- **What is the small files problem and how do you fix it?** Many tiny files create
  metadata and scheduling overhead; fix with compaction and coarser partitioning.
- **How do you test a data pipeline?** Unit tests on transformation logic with fixtures,
  schema and quality assertions in the pipeline, reconciliation against source totals, and
  an end-to-end run on a sample.
- **How do you decide the partition column for a large table?** The column most queries
  filter on, usually event date, with cardinality low enough to avoid tiny partitions.
- **What happens if you add more Kafka consumers than partitions?** The extra consumers sit
  idle; partition count bounds consumer parallelism.
- **How do you safely backfill six months of data?** Partition-by-partition, idempotent,
  using the same transformation code, rate-limited to protect production, with verification
  after each chunk.
- **Why is running analytics against the production OLTP database a problem?** Long scans
  compete for resources with transactional traffic, can hold locks or bloat MVCC versions,
  and the row-oriented layout is wrong for the workload.
- **How would you reduce warehouse cost?** Cut scanned bytes: partition pruning, column
  selection, materialised aggregates, result caching, and killing runaway queries with
  limits.

---

## 7. Hard-Level Interview Knowledge

```yaml
job_field: data_engineering
topic: hard_level_knowledge
difficulty: hard
keywords: [platform_design, exactly_once, distributed_processing, scale, consistency, governance]
```

- **Design a data platform ingesting 10 TB per day from 200 sources.** Ingestion tiering
  (CDC, batch extracts, event streams), a raw immutable landing zone, a lakehouse table
  format for ACID and upserts, partitioning and compaction strategy, orchestration with
  dependency-based scheduling, data quality gates, lineage and cataloguing, cost controls,
  and the multi-tenant isolation model. State what you would build last.
- **How do you achieve exactly-once semantics end to end?** Explain that exactly-once
  *delivery* across systems is not generally achievable; what is achievable is exactly-once
  *effects* through at-least-once delivery plus idempotent, transactional sinks —
  deterministic keys, `MERGE` upserts, transactional table commits, and offset commits tied
  to output commits.
- **How would you design a slowly changing dimension at billions of rows?** SCD Type 2 with
  surrogate keys, `MERGE` into a table-format table with clustering on the natural key,
  partitioning by validity period or a current-row split table, and a compaction and
  statistics maintenance plan. Discuss the query cost of point-in-time joins.
- **A downstream report shows a 5% revenue discrepancy against the source system. How do you
  find it?** Reconcile progressively: source extract counts, landed counts, post-dedup
  counts, post-join counts, and post-aggregation totals. The usual culprits are join
  fan-out, timezone or date-boundary mismatch, currency or unit handling, late data, filters
  that exclude edge cases, and duplicate events.
- **Design a streaming pipeline with a five-second freshness SLA.** Topic partitioning and
  keying, consumer scaling and lag alerting, state store and checkpointing, watermarking and
  allowed lateness, exactly-once sink writes, and — critically — the reprocessing story when
  a bug is found. Contrast with a micro-batch alternative and justify the choice.
- **How do you handle GDPR-style deletion in a data lake?** Explain why append-only Parquet
  directories make this hard, and how table formats with delete support, tokenisation or
  pseudonymisation of identifiers, and a crypto-shredding approach (deleting the key that
  decrypts a subject's data) each address it, with their trade-offs.
- **How do you migrate a warehouse from one platform to another without a big-bang cutover?**
  Dual-write or dual-transform, run both in parallel, reconcile outputs automatically for a
  period, migrate consumers gradually behind a semantic layer or views, and retire the old
  platform only when reconciliation has been clean for an agreed window.
- **How do you manage schema evolution across many independent consumers?** A schema
  registry with compatibility rules (backward, forward, full), versioned events, additive
  changes only within a major version, consumer tolerance for unknown fields, and data
  contracts with owners and deprecation timelines.
- **What are the distributed systems constraints that shape data platforms?** Partial
  failure and the need for idempotency, ordering guarantees limited to a partition, the
  impossibility of distinguishing a slow node from a dead one, clock skew making event time
  unreliable without watermarks, and consistency versus latency in replicated stores.
- **How do you decide between adding compute and fixing the query?** Measure scanned bytes
  and shuffle volume; if the job reads far more data than the answer requires, throwing
  compute at it multiplies cost without addressing the defect.

---

## 8. Practical Engineering Scenarios

```yaml
job_field: data_engineering
topic: practical_scenarios
difficulty:
  - medium
  - hard
keywords: [scenario, pipeline_failure, duplicates, slow_job, data_quality_incident]
```

### Scenario A — A data pipeline is producing duplicate records

Downstream revenue is overstated.

- **Initial question.** What are the likely causes?
- **Expected reasoning.** At-least-once delivery with a non-idempotent consumer, a retried
  task that appends instead of overwriting, a join fan-out against a dimension with
  duplicate keys, or an overlapping incremental window without deduplication.
- **Follow-up.** How do you tell a source-side duplicate from a pipeline-side duplicate?
  (Compare distinct event ids at each stage; if the raw layer already has them, the source
  or the producer is at fault.)
- **Deeper.** How do you fix it permanently? (Deduplication key with `ROW_NUMBER` or a
  `MERGE`, a uniqueness test in the pipeline, and partition-overwrite semantics on retry.)
- **Troubleshooting.** How do you repair the already-published numbers? (Reprocess the
  affected partitions idempotently and communicate the correction to consumers.)
- **Trade-off.** Deduplicating at ingestion (cheap, bounded window) versus at query time
  (always correct, more expensive on every read).

### Scenario B — A nightly Spark job that took 40 minutes now takes 6 hours

- **Initial question.** Where do you start?
- **Expected reasoning.** Compare against a prior successful run: data volume growth, a
  changed join, a lost broadcast (one side crossed the size threshold), skew, cluster
  resource contention, or degraded file layout with many small files.
- **Follow-up.** The Spark UI shows one task in a stage taking 5 hours while the other 199
  finished in minutes. What is happening? (Skew on the join or group key.)
- **Deeper.** How do you fix skew for a key that legitimately has 40% of the rows?
  (Salting with a fan-out on the small side, or splitting that key into a separately
  processed branch.)
- **Trade-off.** Salting complicates the code and adds a reduce step; a bigger cluster is
  simpler and costs more every night.

### Scenario C — The daily table is missing rows

Analysts report that yesterday's data looks 20% short.

- **Expected reasoning.** Check upstream landing counts first to determine whether the data
  arrived. Then check the watermark logic (rows updated without touching the timestamp),
  timezone boundaries, a filter excluding new categories, and late-arriving data outside the
  window.
- **Follow-up.** Landed counts match the source but the curated table is short. What
  narrows it down? (The transformation: an inner join dropping rows whose dimension is
  missing, or a `NOT IN` with NULLs.)
- **Deeper.** How would you have caught this automatically? (A row-count reconciliation
  test between layers and an anomaly alert on volume.)

### Scenario D — Kafka consumer lag is growing

- **Expected reasoning.** Determine whether producers sped up or consumers slowed down.
  Check per-partition lag (uneven lag means a hot key or a stuck consumer), consumer error
  rate, downstream sink latency, and rebalancing churn.
- **Follow-up.** How do you scale consumers? (Up to the partition count; beyond that you
  must increase partitions, which changes key-to-partition mapping and can disturb
  ordering.)
- **Deeper.** One partition's lag is growing while the others are fine. (A hot key, or a
  poison record repeatedly failing and being retried.)
- **Trade-off.** Increasing partitions improves parallelism permanently but cannot be
  reduced later and affects ordering during the transition.

### Scenario E — An upstream team changed a column type without warning

The pipeline failed overnight; some downstream tables are partially updated.

- **Expected reasoning.** Stop dependent jobs, assess which outputs are partially written,
  restore the last known-good partitions, then handle the schema change deliberately —
  either adapt the transformation or reject the change.
- **Follow-up.** How do you prevent recurrence? (Schema validation at ingestion, a schema
  registry with compatibility rules, and a data contract with the producing team.)
- **Deeper.** Why is failing loudly better than silently coercing the type? (Silent
  coercion produces plausible wrong numbers, which are far more expensive than an outage.)

### Scenario F — Warehouse costs tripled after a new dashboard launched

- **Expected reasoning.** Identify the top queries by bytes scanned, check whether the
  dashboard queries filter on the partition column, whether it selects `*`, its refresh
  frequency, and whether results could be cached or pre-aggregated.
- **Follow-up.** What is the fix? (A materialised aggregate table refreshed once per
  interval, partition-aligned filters, and column pruning.)
- **Deeper.** How do you prevent the next one? (Query cost limits, cost attribution by
  team, and a review step for scheduled queries.)

### Scenario G — Two reports disagree on the same metric

- **Expected reasoning.** Compare definitions before comparing data: grain, filters,
  timezone, currency conversion, whether cancelled orders are included, and which snapshot
  of a SCD dimension each uses. Most metric disagreements are definitional, not technical.
- **Deeper.** What structural fix prevents it? (A single governed semantic layer or metric
  definition, documented and reused by both reports.)

---

## 9. Troubleshooting Knowledge

```yaml
job_field: data_engineering
topic: troubleshooting
difficulty:
  - medium
  - hard
keywords: [troubleshooting, oom, skew, stuck_job, reconciliation, memory, checkpoint]
```

**Reconciliation is the core diagnostic technique.** Count rows and sum key measures at
every layer — source, landed, deduplicated, transformed, published — and find the stage
where the number changes unexpectedly. This localises almost any data correctness problem
faster than reading code.

**Spark out-of-memory.** Driver OOM usually means `collect()` on a large result or an
oversized broadcast. Executor OOM usually means too few partitions, extreme skew, a wide
row explosion from a join, or caching too much. Increasing memory is the last resort, not
the first.

**A job that hangs without failing.** Check for a stage waiting on a single skewed task, a
sensor waiting on data that will never arrive, a deadlock on a table lock, or throttling
from the source API or storage layer.

**Wrong results with no errors.** The dangerous class. Look for join fan-out, timezone
handling, NULL semantics in `NOT IN` and in aggregates, implicit type coercion, floating
point accumulation in money calculations, and a filter applied before rather than after a
left join.

**Slow warehouse queries.** Read the plan for a full scan where pruning was expected,
check whether the predicate is on the partition column and not wrapped in a function,
look for a missing clustering key, and check for spill or a broadcast that became a
shuffle as data grew.

**Streaming state and checkpoint problems.** A corrupted or incompatible checkpoint after a
code change can prevent restart. Understand which changes are checkpoint-compatible in your
framework before deploying, and keep a documented reprocessing path from the source topic.

**Storage-level issues.** Object listing throttling on huge prefixes, eventual visibility of
newly written objects in some stores, and permission errors that appear as empty results
rather than failures.

---

## 10. Architecture and System Design

```yaml
job_field: data_engineering
topic: data_architecture
difficulty:
  - medium
  - hard
keywords: [architecture, layered_design, lambda, kappa, semantic_layer, catalog, batch_vs_stream]
```

**Layered architecture** is the standard backbone: raw/bronze (immutable as-received),
cleaned/silver (typed, deduplicated, conformed), curated/gold (business-facing marts and
metrics). The immutable raw layer is what makes every transformation bug recoverable.

**Lambda versus Kappa.** Lambda runs parallel batch and streaming paths and merges results,
giving accuracy plus low latency at the cost of maintaining two implementations of the same
logic. Kappa uses a single streaming path with replay from the log for reprocessing,
avoiding duplication at the cost of requiring the streaming system to handle all
reprocessing. Modern lakehouse table formats have narrowed the gap by making incremental
batch cheap and reprocessing safe.

**Semantic layer / metrics layer.** Defining metrics once, centrally, prevents the "two
reports disagree" problem and makes definitions reviewable.

**Catalog and lineage.** A data catalogue with ownership, descriptions, freshness, and
column-level lineage is what makes a platform usable at scale; without it, consumers cannot
tell which of five similar tables to use.

**Build versus buy.** Managed ingestion connectors, managed warehouses, and managed
orchestration cost money and save substantial engineering time. The reasonable default for
a small team is to buy the undifferentiated parts and build only what is specific to the
business.

**Choosing batch or streaming per dataset**, not for the whole platform. Most platforms are
predominantly batch with a small number of genuinely latency-sensitive streams.

**Multi-tenancy and isolation.** Separate compute for production pipelines and ad-hoc
analysis, so an analyst's runaway query cannot delay the nightly load.

---

## 11. Security and Governance

```yaml
job_field: data_engineering
topic: data_security
difficulty:
  - medium
  - hard
keywords: [pii, encryption, masking, access_control, retention, gdpr, lineage, audit]
```

- **Classify data.** Know which columns are personal, sensitive, or regulated before
  designing storage and access. Handling that is retrofitted is handling that is
  incomplete.
- **Minimise.** Do not ingest personal data you do not need; the cheapest way to protect a
  field is not to have it.
- **Protect at rest and in transit.** Encryption everywhere, with a deliberate key
  management model. Consider column-level encryption or tokenisation for the most sensitive
  fields.
- **Masking and pseudonymisation.** Hash or tokenise identifiers in analytical copies, and
  provide masked views so most analysts never see raw personal data.
- **Access control.** Role-based access at table, column, and row level; least privilege;
  separate production pipeline identities from human analyst identities. Grant to groups,
  not individuals.
- **Retention and deletion.** Automated retention policies, and a workable deletion path for
  subject-access and erasure requests. Append-only lake storage makes deletion hard, which
  is one of the strongest practical arguments for a table format that supports deletes.
- **Audit and lineage.** Who accessed what, and which downstream datasets contain a given
  source column — needed both for compliance and for impact analysis.
- **Non-production data.** Never copy raw production personal data into development
  environments; use masked, synthetic, or sampled datasets.
- **Pipeline security.** Secrets in a managed store rather than in DAG code, least-privilege
  service identities per pipeline, and no credentials in logs.

The cybersecurity guide holds canonical depth on cryptography and compliance frameworks.

---

## 12. Performance and Scalability

```yaml
job_field: data_engineering
topic: performance
difficulty:
  - medium
  - hard
keywords: [performance, scan_reduction, shuffle, file_sizing, parallelism, cost_efficiency]
```

**The governing principle: read less data.** Almost every data performance win reduces
bytes scanned or bytes shuffled.

Levers in rough order of impact:

1. **Partition pruning** — filter on the partition column, and make sure the predicate is
   in a form the engine can use.
2. **Column pruning** — never `SELECT *` in a pipeline; columnar formats only pay off when
   you read a subset.
3. **File sizing and compaction** — target files in the low hundreds of megabytes; fix the
   small files problem at the source.
4. **Shuffle reduction** — filter before joining, pre-aggregate, broadcast small
   dimensions, and pre-partition by join key where reuse justifies it.
5. **Skew handling** — salt, isolate, or use adaptive execution.
6. **Incremental processing** — process only the new or changed partition rather than
   recomputing history every night. This is often a 100x saving that no amount of tuning
   matches.
7. **Materialisation** — pre-compute expensive aggregates consumed by many dashboards.
8. **Right-size compute** — more executors do not help a skewed or I/O-bound job.

**Scalability considerations.** Storage scales trivially in object storage; the constraints
appear in metadata operations (listing millions of files), coordination (orchestrator task
throughput), and downstream serving. Design partitioning and file layout for the volume you
expect in two years, not today.

**Cost efficiency is a performance metric in this field.** In consumption-priced platforms,
an inefficient query is a recurring bill, so cost per query and cost per pipeline run belong
on the dashboard next to runtime.

---

## 13. Common Candidate Mistakes

```yaml
job_field: data_engineering
topic: common_mistakes
difficulty:
  - easy
  - medium
  - hard
keywords: [mistakes, misconceptions, data_pitfalls]
```

- Not making pipelines idempotent, then being surprised by duplicates after a retry.
- Ignoring join cardinality and producing silently inflated aggregates.
- Confusing event time with processing time, and having no late-data policy.
- Believing a message broker gives end-to-end exactly-once without idempotent sinks.
- Adding more Kafka consumers than partitions and expecting more throughput.
- Partitioning on a high-cardinality column and creating millions of tiny files.
- Using `SELECT *` in pipelines and dashboards against a columnar store.
- Treating a data lake as a strategy rather than as storage that needs governance.
- Assuming streaming is strictly better than batch, without pricing the operational cost.
- Averaging a stored ratio, or summing a semi-additive measure across time.
- Overwriting history with SCD Type 1 and then being unable to reproduce last quarter's
  report.
- Running analytics directly against the production transactional database.
- Testing the code but never testing the data.
- Alerting only on task failure, so a job that succeeds with zero rows goes unnoticed.
- Not being able to state the grain of a fact table.
- Backfilling with different code from the incremental path and getting different numbers.

---

## 14. Interview Evaluation Points

```yaml
job_field: data_engineering
topic: evaluation_points
difficulty:
  - easy
  - medium
  - hard
keywords: [evaluation, rubric, data_signals, assessment]
```

An interviewer should be able to determine whether the candidate understands:

- **Correctness under repetition** — whether idempotency, deduplication, and re-runs are
  reflexes rather than afterthoughts.
- **SQL beyond basics** — window functions, join cardinality reasoning, NULL semantics, and
  the ability to read a query plan.
- **Modelling discipline** — whether they declare the grain, reason about additivity, and
  can justify an SCD choice.
- **Distributed execution reality** — shuffles, skew, partitioning, and why a job is slow
  rather than "we scaled the cluster".
- **Batch versus streaming judgement** — whether they can argue for batch when the latency
  requirement does not justify a stream.
- **Data quality ownership** — whether tests, reconciliation, and freshness alerts appear
  without prompting.
- **Cost awareness** — whether scanned bytes and compute cost feature in their design
  reasoning.
- **Operational thinking** — backfills, schema changes, lineage, and how a consumer finds
  out something broke.
- **Debugging method** — whether they reconcile layer by layer or guess.

**Adaptive guidance.** A strong Spark or Kafka answer should escalate to platform design,
exactly-once semantics, or governance at scale. A weak answer on distributed processing
should step down to SQL fundamentals, ETL basics, or the OLTP/OLAP distinction — not to
another Spark internals question.

---

## 15. Cross-Topic Relationships

```yaml
job_field: data_engineering
topic: cross_topic_relationships
difficulty: medium
keywords: [relationships, topic_map, data_dependencies]
```

Distinctions that must not be collapsed:

- **ETL is not ELT.** The transformation happens before or after loading, and the
  architectural consequences differ.
- **A data warehouse is not a data lake, and a lakehouse is neither alone.**
- **Kafka is not a message queue.** A retained, replayable log with independent consumer
  groups versus a queue that removes consumed messages.
- **Spark is not Hadoop.** Spark is a processing engine; Hadoop was an ecosystem with HDFS
  storage and MapReduce processing. Spark commonly runs without any Hadoop component.
- **Airflow is not a processing engine.** It orchestrates; something else computes.
- **Batch is not "slow streaming".** They have different correctness, reprocessing, and
  cost properties.
- **Data mesh is an organisational model, not a technology.**
- **Partitioning is not indexing.** Physical data layout for pruning versus a secondary
  structure for lookups.
- **Data quality is not schema validation.** A correctly typed wrong number passes schema
  validation.
- **OLTP is not OLAP**, and using one for the other is a design error, not a shortcut.

Topic progression for adaptive interviews (easy to hard):

`sql -> relational_databases -> data_modeling -> etl -> data_pipelines -> apache_airflow -> batch_processing -> apache_spark -> stream_processing -> apache_kafka -> data_warehousing -> data_architecture`

Breadth track when the candidate stalls (use after repeated weak answers):

- Weak on Spark → `sql` or `file_formats`
- Weak on Kafka → `etl` and batch ingestion basics
- Weak on modelling → `sql` joins and aggregation
- Weak on platform design → `partitioning` or `data_quality`
- Weak on streaming semantics → `data_pipelines` and idempotency

Canonical depth lives elsewhere for:

- Transactions, isolation levels, OLTP indexing internals, application caching —
  `backend_development_interview_guide.md`
- Object storage classes, VPC, cost governance, DR patterns —
  `cloud_architecture_interview_guide.md`
- Containers, Kubernetes, CI/CD for pipeline deployment, monitoring stack —
  `devops_cloud_interview_guide.md`
- Feature engineering, model training and evaluation, MLOps —
  `ai_machine_learning_interview_guide.md`
- Encryption, compliance frameworks, incident response —
  `cybersecurity_interview_guide.md`
- Algorithms, complexity, general system design —
  `software_engineering_interview_guide.md`
