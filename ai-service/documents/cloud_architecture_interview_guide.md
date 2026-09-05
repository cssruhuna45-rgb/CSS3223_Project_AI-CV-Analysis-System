# Cloud Architecture Interview Knowledge Guide

```yaml
job_field: cloud_architecture
job_field_name: Cloud Architecture
canonical_topics:
  - cloud_architecture_principles
  - well_architected
  - compute
  - storage
  - cloud_databases
  - cloud_networking
  - vpc
  - subnets
  - routing
  - load_balancing
  - iam
  - cloud_security
  - availability_zones
  - regions
  - high_availability
  - scalability
  - fault_tolerance
  - disaster_recovery
  - observability
  - cost_optimization
  - serverless
  - containers_in_cloud
  - event_driven_architecture
  - distributed_systems
  - architecture_trade_offs
difficulty:
  - easy
  - medium
  - hard
```

This document is the canonical interview knowledge base for the **cloud_architecture**
job field. It owns cloud *design*: network topology, availability and disaster recovery
patterns, storage and database selection, serverless and event-driven architecture, cost
optimisation, and the trade-offs between them. Operational mechanics of Docker,
Kubernetes, Terraform, CI/CD, and Linux live in the DevOps/Cloud guide.

---

## 1. Job Field Overview

```yaml
job_field: cloud_architecture
topic: job_field_overview
difficulty: easy
keywords: [cloud_architect, design, requirements, non_functional, responsibilities]
```

Cloud architecture is the discipline of designing systems that run on cloud
infrastructure so they meet functional requirements *and* non-functional requirements —
availability, performance, security, operability, and cost — within real constraints.

**Cloud computing is not AWS**, and cloud architecture is not "knowing service names".
Cloud computing is a delivery model (on-demand self-service, broad network access,
resource pooling, rapid elasticity, measured service — the characteristics described in
NIST SP 800-145). AWS, Azure, and GCP are providers implementing it.

Typical responsibilities:

- Translate business requirements into an architecture with explicit availability and
  recovery targets.
- Choose between managed services and self-operated components, with justification.
- Design the network topology, identity model, and data flows.
- Design for failure: what happens when an instance, an availability zone, or a region is
  lost.
- Control cost as a first-class design constraint.
- Document decisions and their trade-offs so future teams understand why.

**The defining skill is trade-off articulation.** An architect who presents a design with
no downsides has not designed; they have listed services.

---

## 2. Core Competencies

```yaml
job_field: cloud_architecture
topic: core_competencies
difficulty: easy
keywords: [competencies, architect_skills, evaluation]
```

1. **Cloud service models and provider landscape** — IaaS, PaaS, SaaS, FaaS, and the
   equivalent services across AWS, Azure, and GCP.
2. **Compute selection** — VMs, containers, serverless functions, and managed platforms.
3. **Storage selection** — object, block, file, and archive, with durability and access
   pattern reasoning.
4. **Database selection** — relational, key-value, document, wide-column, graph,
   in-memory, and analytical.
5. **Cloud networking** — VPC, subnets, routing, NAT, peering, private endpoints, DNS.
6. **Load balancing and traffic management** — L4 versus L7, global versus regional,
   health checks.
7. **Identity and access** — IAM roles, federation, least privilege, workload identity.
8. **Availability design** — AZs, regions, redundancy patterns, failure domains.
9. **Disaster recovery** — RTO and RPO driven strategy selection.
10. **Scalability and elasticity** — horizontal scaling, autoscaling, partitioning.
11. **Security architecture** — defence in depth, encryption, network isolation, shared
    responsibility.
12. **Observability design** — what to measure and how to know the system is healthy.
13. **Cost modelling** — pricing dimensions, and the cost consequence of each design
    choice.
14. **Serverless and event-driven patterns** — and their limits.
15. **Distributed systems reasoning** — consistency, partial failure, idempotency.
16. **Documentation and decision records** — communicating architecture to other people.

---

## 3. Foundational Knowledge

### 3.1 Cloud Service and Deployment Models

```yaml
job_field: cloud_architecture
topic: cloud_architecture_principles
subtopic: service_models
difficulty: easy
keywords: [iaas, paas, saas, faas, public_cloud, hybrid, multi_cloud, shared_responsibility]
```

**Service models**, ordered by how much the provider manages:

- **IaaS** — virtual machines, storage, and networking. Maximum control, maximum
  operational burden (patching, scaling, availability).
- **PaaS** — a managed runtime; you deploy code and configuration. Less control, far less
  operational work.
- **FaaS / serverless functions** — you deploy a function and the platform handles
  scaling to zero and per-invocation billing.
- **SaaS** — a complete application consumed as a service.

**Deployment models.** Public cloud, private cloud, hybrid (an integrated mix, common
when regulation or existing datacentre investment forces it), and multi-cloud.
**Multi-cloud is usually more expensive than it is worth**: it forces
lowest-common-denominator design, duplicates operational expertise, and introduces
cross-cloud egress cost and latency. Legitimate drivers are regulatory requirements,
acquisition history, or a specific service only one provider offers — not a vague
lock-in fear.

**The shared responsibility model** defines the split: the provider secures *of* the
cloud (facilities, hardware, hypervisor, managed service internals); the customer secures
*in* the cloud (data, IAM configuration, network rules, guest OS on VMs, application
code). The line moves with the service model — with a managed database, patching moves to
the provider; IAM and network exposure never do.

### 3.2 Regions, Availability Zones, and Failure Domains

```yaml
job_field: cloud_architecture
topic: regions
difficulty:
  - easy
  - medium
keywords: [region, availability_zone, edge_location, failure_domain, latency, data_residency]
```

- **Region** — a geographic area containing multiple availability zones. Choose based on
  user latency, data residency law, service availability (not every service exists in
  every region), and price, which varies by region.
- **Availability Zone (AZ)** — one or more discrete data centres within a region with
  independent power, cooling, and networking, connected to other AZs by low-latency
  links. An AZ is the primary failure domain you design against.
- **Edge locations / points of presence** — CDN and edge network endpoints, used for
  content delivery and to terminate connections close to users.

**Design implications.**

- Deploying across at least two, preferably three, AZs is the baseline for production. It
  protects against a data-centre-level failure at modest cost.
- Multi-AZ does **not** protect against a regional outage, a global control-plane issue,
  or a bad configuration deployed everywhere.
- **Cross-AZ data transfer is billed** and adds a small amount of latency; chatty
  service-to-service traffic across AZs is a common surprise on the bill.
- **Multi-region** adds protection against regional failure and can reduce latency for a
  global user base, at the cost of data replication complexity, consistency trade-offs,
  and roughly duplicated infrastructure spend.
- **Correlated failure** is the real risk: shared dependencies (a single DNS zone, one
  identity provider, one deployment pipeline, one configuration change) can take down all
  zones at once. Redundant infrastructure with a shared control plane is not as redundant
  as it looks.

### 3.3 Architectural Principles and the Well-Architected Framework

```yaml
job_field: cloud_architecture
topic: well_architected
difficulty:
  - easy
  - medium
keywords: [well_architected, pillars, design_principles, operational_excellence, sustainability]
```

Cloud providers publish architecture frameworks; AWS's Well-Architected Framework is the
most frequently referenced and is organised into pillars: **operational excellence,
security, reliability, performance efficiency, cost optimisation, and sustainability**.
Azure and Google publish comparable frameworks. These are structured review lenses, not
certifications of correctness.

Principles that apply regardless of provider:

- **Design for failure.** Assume every component fails. Ask "what happens when this is
  gone?" for each element of the diagram.
- **Decouple components.** Queues, events, and clear interfaces let parts fail and scale
  independently.
- **Scale horizontally.** Prefer many small, replaceable units over one large one.
- **Automate everything repeatable.** Manual steps do not survive an incident at 3 a.m.
- **Treat servers as cattle, not pets.** Replace rather than repair.
- **Make the secure path the default.** Least privilege, encryption, and private
  networking as the starting point rather than a hardening phase.
- **Measure before optimising**, for both performance and cost.
- **Right-size continuously.** Requirements and traffic change; the initial sizing will be
  wrong within months.

**Architecture Decision Records.** Writing down the decision, the alternatives, and the
reasoning is what stops the same debate recurring every year and is a genuine signal of
architectural maturity.

---

## 4. Core Technical Topics

### 4.1 Compute Selection

```yaml
job_field: cloud_architecture
topic: compute
difficulty:
  - medium
  - hard
keywords: [vm, container, serverless, managed_platform, autoscaling, spot, compute_selection]
```

The compute choice determines operational burden, cost model, and scaling behaviour.

- **Virtual machines.** Full control over the OS, suitable for legacy workloads, licensed
  software, or specialised kernel needs. You own patching, scaling groups, and images.
  Cost is per running instance regardless of utilisation.
- **Containers on a managed orchestrator.** Portable packaging with fine-grained scaling
  and dense packing. Managed Kubernetes gives ecosystem and portability with real
  operational complexity; a simpler managed container service is frequently the better
  fit for a small team.
- **Serverless functions.** Per-invocation billing, scaling to zero, no server management.
  Best for event-driven, spiky, or low-baseline workloads.
- **Managed application platforms** (app services, Cloud Run, App Runner) sit between
  containers and functions: deploy an image or code, get autoscaling and TLS, give up some
  control.
- **Batch and spot capacity.** Interruptible instances cost substantially less and are
  appropriate for fault-tolerant, checkpointable, or reprocessable work — never for a
  stateful single instance holding the only copy of something.

**Selection heuristics.** Steady, predictable, high-utilisation load favours reserved or
committed VM or container capacity. Spiky, event-driven, low-baseline load favours
serverless. Long-running, stateful, or specialised workloads favour VMs or StatefulSets.
Workloads needing sub-10ms consistent latency at high volume rarely suit functions with
cold starts.

### 4.2 Storage Selection

```yaml
job_field: cloud_architecture
topic: storage
difficulty:
  - medium
  - hard
keywords: [object_storage, block_storage, file_storage, archive, durability, lifecycle, consistency]
```

**Object storage** (S3, Blob Storage, Cloud Storage). Flat namespace of immutable objects
addressed by key, accessed over HTTP, effectively unlimited capacity, very high
durability, and the cheapest per gigabyte. Ideal for static assets, backups, data lakes,
logs, and media. Not a filesystem — no in-place partial writes, no POSIX semantics, and
listing large prefixes is a real cost.

**Block storage** (EBS, Managed Disks, Persistent Disk). Raw volumes attached to a single
instance, formatted with a filesystem. Low latency, suitable for databases and boot
volumes. Provisioned capacity and IOPS are billed whether used or not, and a volume is
typically tied to one AZ.

**File storage** (EFS, Azure Files, Filestore). Shared POSIX filesystem mountable by many
instances. Convenient for shared state and lift-and-shift workloads; higher latency and
cost per gigabyte than block, and often a performance bottleneck if used as a database
substitute.

**Storage classes and lifecycle.** Frequent-access, infrequent-access, and archive tiers
trade retrieval latency and per-request cost for lower storage cost. Lifecycle policies
that transition and expire objects automatically are one of the highest-return cost
optimisations available. Note that archive tiers have minimum storage durations and
retrieval fees — moving short-lived data there can increase cost.

**Durability versus availability.** Object stores advertise extremely high durability
(the probability an object is not lost) which is distinct from availability (the
probability you can access it right now). Neither replaces backups: replication faithfully
copies an accidental deletion or a ransomware encryption. **Versioning, retention locks,
and a separate backup account or region are what protect against human and malicious
error.**

**Encryption.** Server-side encryption at rest is standard and often default. The
architectural decision is key management: provider-managed keys (simplest),
customer-managed keys (control over rotation and revocation, auditable use), or
customer-supplied keys (maximum control, maximum operational risk).

### 4.3 Cloud Database Selection

```yaml
job_field: cloud_architecture
topic: cloud_databases
difficulty:
  - medium
  - hard
keywords: [relational, nosql, key_value, document, wide_column, graph, olap, read_replica, sharding]
```

Choose by access pattern, consistency need, and scale — not by familiarity.

- **Managed relational** (RDS, Aurora, Azure SQL, Cloud SQL). Strong consistency,
  transactions, joins, and mature tooling. Scales vertically and via read replicas; write
  scaling eventually requires partitioning or sharding. The right default for
  transactional business data.
- **Key-value** (DynamoDB, Cosmos DB, Bigtable). Predictable single-digit-millisecond
  access at effectively unlimited scale, provided you design around the access pattern.
  Requires up-front key design; ad-hoc queries and joins are not the model. A poorly
  chosen partition key produces hot partitions and throttling.
- **Document stores** offer flexible schemas and are convenient when the shape of records
  genuinely varies. Flexible schema is not the absence of schema; it moves schema
  management into the application.
- **Wide-column** stores suit very high write throughput with time-series or entity-
  timeline access patterns.
- **Graph** databases suit relationship-traversal queries (fraud rings, recommendations,
  permissions graphs) where recursive joins in SQL become impractical.
- **In-memory** (managed Redis or Memcached) for caching, session storage, leaderboards,
  and rate limiting.
- **Analytical / warehouse** (Redshift, Synapse, BigQuery, Snowflake) for columnar,
  scan-heavy analytical queries — a fundamentally different engine from an OLTP database.
  See the data engineering guide for modelling depth.

**Read replicas** scale reads and provide a failover candidate, but replication lag means
a read immediately after a write may return stale data. Read-your-own-writes requires
routing those reads to the primary or using a consistency token.

**Multi-region databases** force an explicit consistency decision: a single writable
region with global reads (simple, higher write latency for distant users), or multi-writer
with conflict resolution (complex, and the application must tolerate it).

### 4.4 Cloud Networking — VPC, Subnets, and Routing

```yaml
job_field: cloud_architecture
topic: vpc
difficulty:
  - medium
  - hard
keywords: [vpc, subnet, cidr, route_table, internet_gateway, nat, peering, private_endpoint, dns]
```

A **VPC (Virtual Private Cloud)** is a logically isolated virtual network in the provider's
infrastructure, with an address range you choose and full control over subnets, routing,
and gateways.

**CIDR planning is a decision you make once.** Choose a range large enough for growth,
non-overlapping with every other environment, on-premises network, and likely acquisition,
because overlapping ranges break peering and VPN. Reserve space per environment and per
region.

**Subnets** are per-AZ address ranges with an associated route table.

- **Public subnet** — has a route to an internet gateway. Load balancers, NAT gateways,
  and bastion hosts live here.
- **Private subnet** — no direct inbound internet route. Application servers and
  databases live here, reaching the internet outbound through a NAT gateway if needed.
- **Isolated subnet** — no internet route at all, for the most sensitive data stores.

**Gateways and connectivity.**

- **Internet gateway** — bidirectional internet access for resources with public IPs.
- **NAT gateway** — outbound-only internet for private subnets. Highly available per AZ,
  and a frequently underestimated cost: it bills per hour *and* per gigabyte processed.
- **VPC peering** — private connectivity between two VPCs; non-transitive, so a mesh grows
  quadratically.
- **Transit gateway / virtual WAN hub** — a hub-and-spoke alternative that scales far
  better than a peering mesh.
- **Private endpoints / PrivateLink / service endpoints** — reach managed services over the
  provider's private network instead of the public internet, improving security posture and
  often reducing NAT cost.
- **VPN and dedicated interconnect** — hybrid connectivity to on-premises networks;
  dedicated circuits give consistent bandwidth and lower egress rates at higher fixed cost.

**Security controls.** Security groups are stateful, attach to resources, and are
allow-only. Network ACLs are stateless, attach to subnets, support explicit deny, and
require rules in both directions. Use security groups as the primary control and NACLs as a
coarse guardrail.

**DNS and service discovery.** Private hosted zones for internal names, public zones for
external. Health-check-based DNS failover is a common multi-region mechanism, and its
effectiveness is bounded by TTL and by client-side DNS caching that frequently ignores TTL.

### 4.5 Load Balancing and Traffic Management

```yaml
job_field: cloud_architecture
topic: load_balancing
difficulty:
  - medium
  - hard
keywords: [load_balancer, layer4, layer7, health_check, cdn, global_routing, tls_termination, waf]
```

- **Layer 4 load balancer** — routes by IP and port, extremely high throughput, preserves
  the protocol, no visibility into HTTP. Right for TCP/UDP services and where ultra-low
  latency matters.
- **Layer 7 load balancer** — understands HTTP, so it can route by host, path, or header,
  terminate TLS, rewrite, retry, and integrate with a WAF. Right for web APIs and mixed
  services behind one entry point.
- **Global load balancing** — routes users to the nearest or healthiest region using
  anycast or DNS. Necessary for multi-region active-active.
- **CDN** — caches static and cacheable dynamic content at edge locations. It is the
  cheapest latency improvement available for a global audience and also absorbs traffic
  spikes and some volumetric attacks.

**Health checks are the control loop.** A health check that is too shallow (TCP connect
only) keeps broken instances in rotation; one that is too deep (checking every downstream
dependency) removes all instances during a dependency blip and turns a partial outage into
a total one. The usual answer: a shallow liveness path plus a readiness path that
reflects the ability to serve, with dependency checks that degrade rather than fail hard.

**Connection draining / deregistration delay** lets in-flight requests finish when an
instance is removed. Without it, every deployment drops requests.

**Sticky sessions** bind a client to one backend. They make scaling and rolling
deployments worse and indicate state that should have been externalised; treat them as a
temporary measure.

**Web Application Firewall** filters common attack patterns and enables rate-based rules.
It is a useful layer, not a substitute for fixing the application.

### 4.6 Identity and Access Architecture

```yaml
job_field: cloud_architecture
topic: iam
difficulty:
  - medium
  - hard
keywords: [iam, least_privilege, role, federation, sso, service_control_policy, account_structure]
```

**Account and subscription structure is an architectural decision.** Separate accounts (or
subscriptions or projects) per environment and per business unit give the strongest blast
radius isolation, clean cost attribution, and independent quota limits. Organisation-level
guardrails (service control policies, Azure Policy, organisation policies) cap what any
principal in an account can do, regardless of IAM within it.

- **Human access** should be federated from a central identity provider with SSO and MFA,
  granting short-lived role sessions rather than long-lived credentials.
- **Workload access** should use instance profiles, workload identity, or service account
  federation — never static keys stored in configuration.
- **Least privilege** in practice means starting from a narrow policy and widening from
  observed denials, plus periodic review of unused permissions.
- **Resource policies versus identity policies.** Access can be granted from the identity
  side or the resource side (a bucket policy, a queue policy); understanding both is
  necessary to answer "why can this principal reach that resource?".
- **Break-glass access** — a rarely used, heavily audited emergency path — is a real
  requirement, because locking yourself out during an incident is a genuine failure mode.
- **Auditability.** API audit logging enabled organisation-wide, delivered to an account
  that operational principals cannot modify.

### 4.7 High Availability and Fault Tolerance Design

```yaml
job_field: cloud_architecture
topic: high_availability
difficulty:
  - medium
  - hard
keywords: [high_availability, fault_tolerance, redundancy, failover, single_point_of_failure, quorum]
```

**These terms are distinct.** *High availability* minimises downtime through redundancy
and fast failover, tolerating brief interruption. *Fault tolerance* means correct
continuous operation through a component failure with no interruption — more expensive and
usually applied selectively. *Disaster recovery* is restoring service after a major
failure.

**A canonical highly available web architecture.**

- DNS with health checks in front of a regional load balancer.
- Load balancer spanning at least two AZs.
- Stateless application tier in an autoscaling group across those AZs, with capacity
  headroom so the survivors can absorb the load of a lost AZ.
- Managed database with a synchronous standby in a second AZ and automated failover.
- Cache and session state externalised to a replicated managed store.
- Static assets on object storage behind a CDN.
- Asynchronous work in a managed queue with retry and a dead-letter queue.

**Finding single points of failure.** Walk the diagram and remove each element mentally.
Watch for the non-obvious ones: a single NAT gateway, one AZ hosting the only writable
database, a single-region identity provider, one configuration pipeline, a certificate
with a manual renewal, or a third-party API with no fallback.

**Quorum and split-brain.** Systems that elect a leader need an odd number of voting
members and a majority to make progress, which is why three AZs is qualitatively better
than two for consensus-based systems. Without quorum, a network partition can produce two
"primaries" writing divergent data.

**Failure isolation patterns.** Bulkheads separate resource pools so one tenant or
dependency cannot exhaust everything. Cell-based architecture partitions the whole stack
into independent cells so a failure affects one cell's users rather than all of them.
Shuffle sharding reduces the probability that any two customers share the same full set of
resources.

**Graceful degradation** is a design property: define which features may be shed under
stress so the core path survives. A system with no degradation plan fails all at once.

### 4.8 Disaster Recovery

```yaml
job_field: cloud_architecture
topic: disaster_recovery
difficulty:
  - medium
  - hard
keywords: [disaster_recovery, rto, rpo, backup_restore, pilot_light, warm_standby, active_active, failover]
```

Disaster recovery strategy is driven by two numbers agreed with the business:

- **RTO (Recovery Time Objective)** — the maximum acceptable time to restore service.
- **RPO (Recovery Point Objective)** — the maximum acceptable data loss, measured in time.

**The four standard patterns**, in increasing cost and decreasing recovery time:

1. **Backup and restore.** Backups replicated to another region; infrastructure recreated
   from IaC on demand. Cheapest; RTO measured in hours, RPO equal to the backup interval.
2. **Pilot light.** Core data continuously replicated and minimal infrastructure kept
   running; the rest is scaled up on failover. RTO in tens of minutes.
3. **Warm standby.** A scaled-down but fully functional copy running in the second region,
   scaled up on failover. RTO in minutes.
4. **Active-active / multi-site.** Full capacity in multiple regions serving traffic
   simultaneously. Near-zero RTO and RPO; the highest cost and the hardest data
   consistency problem.

**Design considerations that separate real plans from paper ones.**

- **Data replication lag defines your true RPO**, not the aspiration.
- **Failover must be automated or at least rehearsed**; a manual runbook nobody has
  executed will not work under pressure.
- **DNS TTL and client caching bound your real failover time.**
- **Failback is a separate problem** — returning to the primary region after divergence
  needs its own plan.
- **Backups must be isolated.** Store them in a separate account or subscription with
  restricted deletion, or a compromise of production also destroys recovery.
- **Test restores on a schedule.** A backup that has never been restored is an untested
  hypothesis. This is the single most common gap in real environments and a strong
  interview signal when a candidate raises it unprompted.

### 4.9 Scalability and Elasticity

```yaml
job_field: cloud_architecture
topic: scalability
difficulty:
  - medium
  - hard
keywords: [horizontal_scaling, vertical_scaling, autoscaling, elasticity, partitioning, statelessness, quota]
```

**Scalability** is the ability to handle growth; **elasticity** is the ability to add and
remove capacity automatically as demand changes. Cloud gives you elasticity only if the
architecture can use it.

- **Statelessness is the prerequisite.** Session state, in-memory caches assumed coherent,
  and local disk writes all prevent horizontal scaling. Externalise state to a managed
  store.
- **Horizontal scaling** adds instances behind a load balancer; **vertical scaling** grows
  one instance and has a hard ceiling plus a restart.
- **Autoscaling signal choice matters more than the policy.** Queue depth or requests per
  instance often predict load better than CPU. Add cooldowns to prevent flapping, set a
  floor that survives the loss of an AZ, and remember that scale-out takes time — an
  autoscaler that needs three minutes cannot absorb a thirty-second spike, so pre-scale for
  known events.
- **The database is usually the scaling wall.** Read replicas, caching, connection pooling
  (a proxy is often necessary because thousands of serverless invocations will exhaust a
  connection limit), then partitioning or sharding.
- **Partitioning and hot keys.** Any partitioned system fails if traffic concentrates on
  one key. Design keys for even distribution and plan for the celebrity or hot-tenant case.
- **Quotas and service limits are real architectural constraints.** Every provider imposes
  them per account and region; discovering one during a traffic spike is a self-inflicted
  outage.
- **Backpressure and load shedding.** A system that accepts more than it can process
  degrades into collapse. Bounded queues, rejection with `429`, and prioritising critical
  traffic keep it survivable.

### 4.10 Serverless Architecture

```yaml
job_field: cloud_architecture
topic: serverless
difficulty:
  - medium
  - hard
keywords: [serverless, faas, cold_start, statelessness, event_source, concurrency, vendor_lock_in]
```

**Serverless** means the provider manages capacity and you pay per use, scaling to zero
when idle. It does not mean there are no servers, and it does not mean no operations.

**Where it fits well.** Event-driven processing, spiky or unpredictable traffic, glue
between managed services, scheduled jobs, low-baseline workloads, and teams that want
minimal infrastructure ownership.

**Where it fits poorly.** Sustained high-throughput workloads (often more expensive than
reserved compute at scale), latency-critical paths sensitive to cold starts, long-running
jobs beyond the execution limit, workloads needing persistent connections or large local
state, and anything requiring fine control over the runtime environment.

**Real constraints to name in an interview.**

- **Cold starts** add latency on the first invocation of a new execution environment, and
  are worse for large deployment packages and heavy runtimes. Provisioned concurrency
  removes it at a cost that partly negates scale-to-zero savings.
- **Execution time and resource limits** are hard ceilings; long jobs need step-function
  style orchestration or a container.
- **Statelessness is enforced.** Anything durable goes to a managed store.
- **Database connections.** Massive invocation concurrency against a relational database
  exhausts connections; a connection proxy or a serverless-native data store is required.
- **Vendor coupling** is real. Function code is portable; the surrounding event sources,
  IAM model, and orchestration are not.
- **Local testing and debugging** are genuinely harder, and distributed tracing becomes
  essential rather than optional.
- **Cost model inversion.** Serverless is cheap when idle and can be expensive when
  saturated; VMs are the reverse. Model the actual traffic curve before deciding.

### 4.11 Event-Driven Architecture

```yaml
job_field: cloud_architecture
topic: event_driven_architecture
difficulty:
  - medium
  - hard
keywords: [event_driven, pub_sub, queue, event_bus, choreography, orchestration, idempotency, ordering]
```

Event-driven architecture has components communicate by producing and consuming events
rather than calling each other synchronously.

**Benefits.** Temporal decoupling (the producer does not wait for the consumer),
independent scaling and deployment, natural buffering of spikes, and easy addition of new
consumers without touching the producer.

**Costs.** Eventual consistency, harder end-to-end debugging, ordering and duplication
concerns, schema evolution across independently deployed consumers, and the operational
burden of the messaging infrastructure itself.

**Primitives.**

- **Queue** — point-to-point work distribution; one consumer processes each message.
- **Topic / pub-sub** — fan-out to many independent subscribers.
- **Event bus** — routing with content-based rules between many producers and consumers.
- **Event stream / log** — an ordered, retained, replayable sequence that many consumer
  groups read at independent offsets.

**Design rules that matter.**

- **Assume at-least-once delivery and make consumers idempotent.** Exactly-once end-to-end
  across systems is a marketing simplification; exactly-once *effects* come from
  idempotency plus deduplication.
- **Ordering is usually per-partition or per-key**, not global. Key by entity id when
  per-entity order matters.
- **Dead-letter queues** are mandatory, plus a defined process for inspecting and
  replaying them.
- **Schema evolution.** Use a versioned event schema with compatibility rules; consumers
  must tolerate unknown fields.
- **Choreography versus orchestration.** Choreography (services react to events) is loosely
  coupled but makes the overall flow implicit and hard to trace. Orchestration (a workflow
  service drives the steps) makes the flow explicit and observable at the cost of a central
  component. Long multi-step business processes usually benefit from orchestration.
- **Event carried state versus notification.** A thin notification requires consumers to
  call back for details (more coupling, less data duplication); a fat event carries state
  (fewer calls, more duplication and staleness risk).

### 4.12 Cost Optimisation

```yaml
job_field: cloud_architecture
topic: cost_optimization
difficulty:
  - medium
  - hard
keywords: [cost, finops, right_sizing, reserved_capacity, spot, egress, tagging, lifecycle]
```

Cost is a design constraint, not a monthly surprise. Architectural decisions determine
most of the bill.

**The main levers, roughly by impact.**

1. **Right-size and eliminate waste.** Idle instances, oversized databases, unattached
   volumes, orphaned snapshots, and forgotten non-production environments are the largest
   and easiest savings. Non-production environments shut down outside working hours are a
   near-free win.
2. **Commit for the stable baseline.** Reserved instances or savings plans substantially
   discount predictable capacity; keep on-demand for the variable portion.
3. **Use spot or preemptible capacity** for fault-tolerant batch and CI workloads.
4. **Storage lifecycle policies.** Transition to cheaper tiers and expire what nothing
   reads. Also delete old snapshots — they accumulate silently.
5. **Data transfer.** Egress to the internet and cross-region transfer are billed and are
   frequently the most surprising line item. Cross-AZ chatter, NAT gateway data processing,
   and cross-region replication all add up. A CDN reduces origin egress; private endpoints
   can reduce NAT processing.
6. **Managed service versus self-hosted.** A managed database costs more per hour and
   usually less in total once engineer time, patching, and failover automation are counted.
   Say this explicitly rather than comparing sticker prices.
7. **Serverless versus provisioned.** Model against the real traffic shape; the crossover
   point is workload-specific.

**Governance.** Consistent tagging for cost attribution, budgets and anomaly alerts,
showback or chargeback per team, and cost visibility in the design review — not only in
the finance report.

**The trade-off to state explicitly.** Cost optimisation and reliability pull in opposite
directions. Removing a second AZ, dropping a standby, or shrinking headroom all save money
and reduce resilience. The architect's job is to make that trade visible and deliberate
rather than accidental.

### 4.13 Observability in Cloud Architecture

```yaml
job_field: cloud_architecture
topic: observability
difficulty: medium
keywords: [monitoring, tracing, logging, slo, dashboards, synthetic, alerting, health]
```

Design-time observability decisions:

- **Define SLIs and SLOs per user journey**, not per component. "Checkout succeeds within
  two seconds for 99.9% of attempts" is actionable; "CPU below 70%" is not.
- **Instrument at boundaries.** Every service, queue, and managed dependency should emit
  request rate, error rate, and latency, with trace context propagated across all of them.
- **Centralise logs and traces** across accounts and regions, with retention tiers so cost
  stays bounded.
- **Synthetic monitoring from outside** the environment catches DNS, certificate, and CDN
  failures that internal health checks report as green.
- **Alert on user-visible symptoms**, route to an owner, and attach a runbook.
- **Dashboards per audience** — a single service health view for on-call, a business view
  for stakeholders.
- **Correlation identifiers** propagated from the edge through every hop are what make an
  incident tractable in a distributed cloud system.

Operational depth on Prometheus, OpenTelemetry, and alerting practice lives in the
DevOps/Cloud guide.

---

## 5. Easy-Level Interview Knowledge

```yaml
job_field: cloud_architecture
topic: easy_level_knowledge
difficulty: easy
keywords: [cloud_basics, definitions, service_models, junior]
```

- **What is cloud computing?** On-demand delivery of compute, storage, and services with
  usage-based pricing and rapid elasticity.
- **What is the difference between IaaS, PaaS, and SaaS?** Increasing amounts of the stack
  managed by the provider.
- **What is a region and what is an availability zone?** A geographic area versus an
  isolated data-centre grouping within it.
- **What is a VPC?** A logically isolated virtual network in the cloud with your own
  address range and routing.
- **What is the difference between a public and a private subnet?** A route to an internet
  gateway or not.
- **What is a load balancer?** A component distributing traffic across healthy backends.
- **What is object storage used for?** Files, backups, static assets, and data lakes,
  accessed by key over HTTP.
- **What is IAM?** The service controlling who can perform which actions on which
  resources.
- **What is the shared responsibility model?** The provider secures the cloud; the customer
  secures what they put in it.
- **What is high availability?** Designing to minimise downtime through redundancy and
  failover.
- **What is horizontal scaling?** Adding more instances rather than making one bigger.
- **What is serverless?** A model where the provider manages capacity and you pay per
  invocation, scaling to zero when idle.
- **What is a CDN?** A network of edge caches serving content closer to users.
- **What is RTO and what is RPO?** Acceptable time to restore service versus acceptable
  data loss.
- **What is a NAT gateway for?** Outbound internet access for resources in private subnets.

---

## 6. Medium-Level Interview Knowledge

```yaml
job_field: cloud_architecture
topic: medium_level_knowledge
difficulty: medium
keywords: [applied_architecture, selection, comparison, sizing, trade_offs]
```

- **How would you design a three-tier web application on the cloud?** Public subnets for
  the load balancer, private subnets for the application tier across at least two AZs,
  isolated subnets for the database with a multi-AZ standby, a CDN for static assets, and
  a managed cache. Then state the failure behaviour of each tier.
- **When would you choose serverless over containers?** Spiky or low-baseline traffic,
  event-driven work, and minimal ops appetite — versus sustained load, latency sensitivity,
  long-running processes, or a need for runtime control.
- **How do you choose between a relational database and a key-value store?** Access
  patterns, need for joins and multi-row transactions, schema stability, and required
  scale. Answering "NoSQL scales better" without qualifying it is a weak answer.
- **What is the difference between a security group and a network ACL?** Stateful,
  resource-level, allow-only versus stateless, subnet-level, with explicit deny and rules
  needed in both directions.
- **How do you give a private subnet outbound internet access?** A NAT gateway in a public
  subnet plus a route; then mention the per-hour and per-gigabyte cost and private
  endpoints as an alternative for provider services.
- **How would you reduce a cloud bill by 30%?** Start with measurement and tagging, then
  eliminate idle and orphaned resources, shut down non-production out of hours, right-size,
  commit to baseline capacity, apply storage lifecycle policies, and examine data transfer
  paths.
- **How do you handle secrets in a cloud architecture?** A managed secret store, workload
  identity instead of static keys, encryption with customer-managed keys where required,
  rotation, and audit logging of access.
- **What is the difference between vertical and horizontal scaling and when does each
  apply?** Ceiling and restart versus statelessness requirement and unbounded growth.
- **How would you design for an availability zone failure?** Resources in at least two AZs,
  capacity headroom for the survivors, a multi-AZ database with automatic failover, and no
  single-AZ dependency such as one NAT gateway or a single-AZ volume.
- **What are read replicas good for and what do they not solve?** Read scaling and failover
  candidacy; they do not solve write scaling and they introduce replication lag.
- **When is multi-region justified?** A regional-outage RTO the business will pay for,
  data residency requirements, or global latency needs. Not as a default.
- **How do you decide between managed and self-hosted services?** Total cost including
  engineer time, required control, compliance constraints, and the team's operational
  capacity.
- **How do you connect a VPC to an on-premises network?** Site-to-site VPN for lower cost
  and variable performance, or a dedicated interconnect for consistent bandwidth; both
  require non-overlapping address ranges.

---

## 7. Hard-Level Interview Knowledge

```yaml
job_field: cloud_architecture
topic: hard_level_knowledge
difficulty: hard
keywords: [system_design, multi_region, consistency, resilience, migration, cell_architecture]
```

- **Design a globally available, low-latency application for users on three continents.**
  Regional deployments with global traffic routing, a strategy for data (single writable
  region versus multi-writer with conflict resolution versus per-region data partitioned by
  user home region), replication lag consequences, consistency guarantees you will and will
  not offer, and how the system behaves during a regional failure and during failback.
- **Design a system with an RTO of 15 minutes and an RPO of 1 minute.** Warm standby or
  active-active, continuous asynchronous or synchronous replication with the latency cost
  stated, automated failover with health-based DNS or global routing, split-brain
  prevention, and a rehearsal schedule. Explain why backup-and-restore cannot meet these
  numbers.
- **How do you prevent one tenant from degrading service for everyone?** Per-tenant rate
  limits and quotas, bulkheads or dedicated capacity for large tenants, cell-based
  partitioning, shuffle sharding, and monitoring per-tenant consumption. Discuss the
  isolation-versus-efficiency trade-off.
- **How do you architect a migration of a large on-premises system to the cloud?** Portfolio
  assessment and the migration strategies (rehost, replatform, refactor, repurchase,
  retire, retain), dependency mapping, a data migration approach with acceptable cutover
  downtime, coexistence and hybrid connectivity during the transition, a rollback plan, and
  the sequencing that limits blast radius. State explicitly that lift-and-shift alone
  usually increases cost until workloads are optimised.
- **How do you design for correlated failure?** Identify shared dependencies — one identity
  provider, one DNS zone, one deployment pipeline, one configuration store — and either
  make them independently redundant or accept and document the exposure. Note that a bad
  configuration deployed everywhere defeats infrastructure redundancy entirely, which
  argues for staged rollout of configuration as well as code.
- **Design a data platform boundary between transactional and analytical workloads.**
  Separate OLTP from OLAP, replicate via change data capture or scheduled extraction,
  define freshness expectations, and prevent analytical queries from degrading the
  transactional database. Depth on modelling is in the data engineering guide.
- **How do you architect encryption and key management for a regulated workload?**
  Encryption in transit and at rest end to end, customer-managed keys with defined rotation,
  key access separated from data access so no single role can both read data and use the
  key, envelope encryption, and audit logging of key usage. Address cross-region key
  availability, since a key in one region can become a single point of failure.
- **Design a system that must survive the loss of your primary cloud provider.** Be honest
  about the cost: abstraction layers, duplicated operational expertise, data replication
  across providers, egress fees, and reduced use of managed services. Then propose the
  usually better alternative: multi-region within one provider plus tested restore into a
  second provider from portable backups.
- **How do you evaluate whether an architecture is over-engineered?** Compare the design's
  complexity against the actual availability requirement, traffic, team size, and budget.
  Every component added is a component to secure, monitor, patch, and debug.
- **How do you use error budgets to govern change?** Define SLOs per journey, measure,
  and tie release velocity to remaining budget — spend it on features when healthy, spend
  it on reliability when exhausted.

---

## 8. Practical Engineering Scenarios

```yaml
job_field: cloud_architecture
topic: practical_scenarios
difficulty:
  - medium
  - hard
keywords: [scenario, cloud_incident, design_review, cost_spike, outage, capacity]
```

### Scenario A — An availability zone becomes unavailable

The application is deployed across two AZs and is now failing for roughly half of
requests.

- **Initial question.** Why would half of requests fail if the design is multi-AZ?
- **Expected reasoning.** The load balancer is still sending traffic to targets it believes
  healthy, or the surviving AZ lacks capacity, or a single-AZ dependency (one NAT gateway,
  a single-AZ database primary, an AZ-bound volume) is in the failed zone.
- **Follow-up.** What would you change so this is a non-event?
- **Deeper.** How much headroom must each AZ carry in a two-AZ versus three-AZ design?
  (Two AZs need 100% headroom in each to survive one loss; three AZs need 50%.)
- **Trade-off.** Cost of standing headroom versus autoscaling latency during the failure.

### Scenario B — The cloud bill doubled in one month

- **Initial question.** How do you find the cause?
- **Expected reasoning.** Cost explorer grouped by service, account, and tag; compare to
  the previous period; look for a new resource type, a changed data transfer pattern, log
  volume growth, an unbounded autoscaler, a retry storm, or a forgotten test environment.
- **Follow-up.** The increase is in data transfer. What are the usual causes? (Cross-AZ
  chatter, NAT gateway processing, cross-region replication, internet egress from an
  uncached origin.)
- **Deeper.** How would you have caught it earlier? (Budgets, anomaly detection, tagging
  enforcement, and cost review in the change process.)
- **Trade-off.** Introducing private endpoints and a CDN costs money and complexity;
  quantify against the egress saved.

### Scenario C — A design review of a proposed architecture

A team proposes microservices on Kubernetes across three regions for a product with 200
daily users.

- **Expected reasoning.** Match complexity to requirements: state what the availability and
  latency requirements actually justify, what each layer of complexity costs in engineer
  time, and propose a simpler starting architecture with a documented path to grow.
- **Follow-up.** How do you make this argument without simply overruling the team?
  (Requirements-first discussion, cost and operational load made explicit, and an
  architecture decision record capturing the reasoning.)
- **Deeper.** What would change your recommendation? (A hard multi-region regulatory
  requirement, a contractual RTO, or a credible near-term scale plan.)

### Scenario D — Database connections exhausted by a serverless workload

- **Expected reasoning.** Each concurrent function invocation opens its own connection;
  concurrency at scale exceeds the database's connection limit. Fix with a connection
  proxy or pooler, reduced per-invocation concurrency limits, or a data store designed for
  high connection counts.
- **Follow-up.** Why does a normal application server not hit this? (A bounded pool shared
  across requests.)
- **Deeper.** What are the trade-offs of the proxy? (Extra hop and cost, but it also
  smooths failover.)

### Scenario E — A regional outage at the provider

One region is degraded and your workload runs only there.

- **Expected reasoning.** Assess whether failover is possible at all with the current
  design, communicate honestly on RTO, execute the documented DR plan if one exists, and
  focus on the data question: what is the actual RPO given replication state.
- **Follow-up.** After recovery, what changes? (A tested DR pattern matched to an agreed
  RTO and RPO, backups isolated in another region, and IaC capable of rebuilding
  elsewhere.)
- **Deeper.** Why is "we will just spin it up elsewhere" usually false? (Data, DNS, secrets,
  quotas in the second region, and untested automation.)

### Scenario F — Autoscaling is not keeping up with a traffic spike

- **Expected reasoning.** Examine the scaling signal and its lag, instance warm-up time,
  image pull and boot time, cooldown settings, and account or quota limits. Consider
  pre-scaling for predictable events and a queue to absorb the burst.
- **Deeper.** Why can autoscaling make an overload worse? (New instances hammer a saturated
  database, and scale-out during a dependency failure amplifies load — the case for load
  shedding and circuit breaking.)

### Scenario G — Sensitive data was found in a publicly readable bucket

- **Expected reasoning.** Treat as an incident: revoke public access, determine exposure
  window and access from audit logs, notify per policy, then fix structurally with
  block-public-access at the account level, policy-as-code checks in CI, and continuous
  configuration scanning.
- **Deeper.** Why is "we will train people not to do that" insufficient? (Guardrails must
  make the mistake impossible, not merely discouraged.)

---

## 9. Troubleshooting Knowledge

```yaml
job_field: cloud_architecture
topic: troubleshooting
difficulty:
  - medium
  - hard
keywords: [cloud_troubleshooting, connectivity, permissions, quota, latency, health_check]
```

**Connectivity failures.** Walk the path in order: DNS resolution, route table, gateway
(internet or NAT), security group egress, security group ingress on the target, network
ACLs in both directions, the destination's own policy, and finally the application. Flow
logs and provider reachability analysers tell you where the packet stopped.

**Permission failures.** Distinguish an identity policy denial from a resource policy
denial from an organisation-level guardrail (SCP or equivalent). An explicit deny anywhere
wins. Read the audit log entry — it usually names the exact action and principal.

**Quota and limit failures.** Symptoms are throttling, `429`s, or resources that will not
launch. Every provider has per-account, per-region limits; check them before assuming a
bug.

**Health check failures.** Confirm the path, port, protocol, expected status code, and
timeout, and test from the load balancer's network position rather than from your laptop.
A health check hitting an endpoint that itself calls a downstream service can fail the
entire fleet during a partial dependency outage.

**Latency investigation.** Separate client, network, load balancer, application, and
database time using distributed tracing. Common cloud-specific causes: cross-AZ or
cross-region hops, cold starts, DNS lookup cost, TLS handshakes on non-reused connections,
noisy neighbours on shared instance types, and burst credit exhaustion on burstable
instance or volume types.

**Intermittent failures after a scaling event.** Check whether new instances passed health
checks before receiving traffic, whether connection draining is configured, and whether
warm-up (JIT, cache priming, connection pools) is complete before the instance is marked
ready.

**Certificate and time issues.** Expired certificates and clock skew produce sudden,
total, and confusing failures with healthy-looking backends.

---

## 10. Architecture and System Design

```yaml
job_field: cloud_architecture
topic: architecture_trade_offs
difficulty:
  - medium
  - hard
keywords: [design_method, requirements, non_functional, adr, patterns, evolution]
```

**A repeatable method for a cloud design question.**

1. **Clarify requirements.** Users and geography, traffic shape and peak, data volume and
   growth, availability target, RTO and RPO, latency target, compliance constraints, team
   size, and budget. Designing before asking is the most common failure.
2. **Estimate.** Requests per second, storage growth, bandwidth, and concurrency. Rough
   numbers change the design.
3. **Sketch the data flow** before choosing services. Where does data enter, where is it
   stored, who reads it, and what is the consistency requirement.
4. **Choose components with justification**, naming the alternative you rejected.
5. **Walk the failure modes.** Remove each component in turn and state the impact.
6. **Address security** — identity, network isolation, encryption, and audit.
7. **Address operations** — deployment, observability, and how someone debugs this at 3
   a.m.
8. **State the cost drivers** and the biggest lever.
9. **Name the trade-offs you accepted** and what would make you change the design.

**Patterns worth naming.** Strangler fig for incremental migration, cell-based
architecture for blast radius containment, CQRS where read and write shapes diverge,
saga for distributed transactions, outbox for reliable event publication, circuit breaker
and bulkhead for resilience, and the ambassador or sidecar pattern for cross-cutting
concerns.

**Anti-patterns.** A "lift and shift" that keeps single-instance assumptions; treating
availability zones as regions; using a message queue as a database; multi-cloud without a
requirement; building a platform before there is a product; and choosing an architecture
because it looks impressive rather than because it fits.

---

## 11. Security

```yaml
job_field: cloud_architecture
topic: cloud_security
difficulty:
  - medium
  - hard
keywords: [defence_in_depth, encryption, network_isolation, least_privilege, compliance, zero_trust]
```

Cloud security architecture is layered, and the customer owns more of it than teams
usually assume. **Cloud security** is not a bolt-on review stage: identity model, network
topology, and encryption decisions are made when the architecture is drawn, and are
expensive to retrofit.

- **Identity is the new perimeter.** Most cloud incidents trace to over-permissive IAM,
  exposed credentials, or public resource policies rather than network intrusion.
  Short-lived credentials, workload identity, MFA, and least privilege are the primary
  controls.
- **Network isolation.** Private subnets for data tiers, private endpoints for managed
  services, no `0.0.0.0/0` administrative access, and segmentation between environments
  and tiers.
- **Encryption.** In transit everywhere including internal hops; at rest with a deliberate
  key management model. Separate the permission to read data from the permission to use
  the key.
- **Defence in depth.** WAF and rate limiting at the edge, authentication and
  authorization in the application, network controls between tiers, and encryption at the
  data layer. No single control is assumed sufficient.
- **Zero trust** as an architectural direction: authenticate and authorise every request
  regardless of network location, rather than trusting anything inside the VPC.
- **Data protection.** Classify data, minimise what you collect, apply residency
  constraints by region choice, and enforce retention and deletion.
- **Detection and response.** Audit logging enabled everywhere and delivered to a
  restricted account, configuration drift and misconfiguration scanning, threat detection
  services, and an incident response plan that includes revoking credentials and isolating
  a compromised account.
- **Compliance frameworks** (SOC 2, ISO/IEC 27001, PCI DSS, HIPAA, GDPR obligations) shape
  architecture through requirements for encryption, logging, access control, residency, and
  retention. **NIST CSF 2.0** organises cybersecurity risk management into six functions —
  Govern, Identify, Protect, Detect, Respond, Recover — and is a legitimate reference for
  structuring a security programme.

Canonical depth on cryptography, threat modelling, detection engineering, and incident
response lives in the cybersecurity guide.

---

## 12. Performance and Scalability

```yaml
job_field: cloud_architecture
topic: performance
difficulty:
  - medium
  - hard
keywords: [latency, throughput, caching, cdn, placement, capacity, benchmarking]
```

**Latency is a geography problem first.** No amount of tuning beats putting compute and
data near the user. A CDN for static and cacheable content, regional deployments for
dynamic content, and edge termination of TLS are the highest-leverage moves for a
distributed user base.

**Caching layers in a cloud architecture**, each with a staleness cost to decide
explicitly:

- Edge/CDN for content and cacheable API responses.
- Application-level in-memory caching for small reference data.
- A managed distributed cache for shared hot data across instances.
- Database-level materialised views and read replicas.

**Throughput and bottleneck reasoning.** Find the resource that saturates first — often
database connections, a downstream rate limit, a NAT gateway, or IOPS on a volume rather
than CPU. Scaling the wrong tier changes the bill and not the latency.

**Instance and storage type selection matters.** Burstable instance families and
burstable volume types accumulate credits and throttle when exhausted, producing
performance that is fine in testing and terrible under sustained load. Provisioned IOPS
and throughput-optimised options exist for a reason.

**Benchmark with realistic data and concurrency.** An empty database, a single hot key, or
a synthetic uniform load produces numbers that do not survive production.

**Design for graceful behaviour at the limit.** Bounded queues, load shedding, rate
limiting per client, and a defined degraded mode. A system that gets slower and slower
under load until it collapses is worse than one that rejects excess work cleanly.

---

## 13. Common Candidate Mistakes

```yaml
job_field: cloud_architecture
topic: common_mistakes
difficulty:
  - easy
  - medium
  - hard
keywords: [mistakes, misconceptions, architecture_pitfalls]
```

- Treating "cloud" and "AWS" as synonyms.
- Claiming multi-AZ deployment provides disaster recovery from a regional failure.
- Confusing high availability, fault tolerance, and disaster recovery.
- Naming services instead of designing: a diagram of logos with no data flow or failure
  analysis.
- Not asking about requirements — availability target, RTO, RPO, budget, traffic — before
  designing.
- Presenting a design with no stated trade-offs or downsides.
- Assuming replication is a backup. It replicates deletions and corruption faithfully.
- Having backups that have never been restored, or backups in the same account as
  production.
- Ignoring data transfer and NAT costs entirely in a cost discussion.
- Recommending multi-cloud reflexively without a requirement.
- Recommending microservices, Kubernetes, and multi-region for a small product.
- Forgetting service quotas as a real architectural constraint.
- Assuming autoscaling solves capacity problems instantaneously.
- Designing a health check that fails the whole fleet when one dependency is degraded.
- Treating serverless as universally cheaper, or as free of operational concerns.
- Overlooking a single point of failure hiding in a shared dependency such as DNS,
  identity, or the deployment pipeline.

---

## 14. Interview Evaluation Points

```yaml
job_field: cloud_architecture
topic: evaluation_points
difficulty:
  - easy
  - medium
  - hard
keywords: [evaluation, rubric, architect_signals, assessment]
```

An interviewer should be able to determine whether the candidate understands:

- **Requirements-first thinking** — whether they ask about availability targets, RTO, RPO,
  scale, compliance, and budget before proposing anything.
- **Failure reasoning** — whether they can remove each component from their own design and
  describe the consequence, including correlated and shared-dependency failures.
- **Precise reliability vocabulary** — HA, fault tolerance, DR, RTO, RPO, and quorum used
  correctly.
- **Service selection with justification** — whether they can name the alternative they
  rejected and why.
- **Cost as a design dimension** — whether cost appears in the design discussion rather
  than only when asked.
- **Security by default** — least privilege, private networking, and encryption raised
  unprompted, plus correct understanding of shared responsibility.
- **Data reasoning** — whether they treat data placement, replication lag, and consistency
  as the hard part rather than an afterthought.
- **Operability** — whether the design can be deployed, observed, and debugged by a real
  team.
- **Restraint** — whether they can recommend the simpler architecture when requirements do
  not justify complexity. This is one of the strongest senior signals.
- **Honesty about limits** — willingness to say which parts of the design they are least
  confident in.

**Adaptive guidance.** A strong HA or DR answer should escalate to multi-region
consistency, cell-based architecture, or correlated failure. A weak answer at the
architecture level should step down to a concrete fundamental — the difference between a
public and private subnet, what object storage is for, or what an availability zone is —
rather than another whole-system design question.

---

## 15. Cross-Topic Relationships

```yaml
job_field: cloud_architecture
topic: cross_topic_relationships
difficulty: medium
keywords: [relationships, topic_map, architecture_dependencies]
```

Distinctions that must not be collapsed:

- **Cloud computing is not AWS.** A delivery model versus one provider.
- **High availability is not fault tolerance is not disaster recovery.**
- **A region is not an availability zone.** Multi-AZ is not multi-region.
- **Replication is not backup.** Replication propagates mistakes; backups with versioning
  and isolation protect against them.
- **Serverless is not "no operations".** Capacity management moves to the provider;
  observability, cost, security, and failure handling do not.
- **Scalability is not elasticity.** Ability to grow versus automatic adjustment to
  demand.
- **Availability is not durability.** Reachable now versus not lost.
- **Infrastructure as Code is not Terraform**, and **containers are not Docker** — see the
  DevOps/Cloud guide.
- **A microservices architecture is not a distributed systems education.** The network
  constraints apply either way.
- **Encryption at rest is not encryption in transit**, and neither is access control.

Topic progression for adaptive interviews (easy to hard):

`cloud_architecture_principles -> compute -> storage -> vpc -> load_balancing -> iam -> high_availability -> scalability -> disaster_recovery -> event_driven_architecture -> multi_region_design`

Breadth track when the candidate stalls (use after repeated weak answers):

- Weak on multi-region design → `regions` and `availability_zones` fundamentals
- Weak on disaster recovery → `storage` and backup basics
- Weak on event-driven architecture → `load_balancing` or `compute` selection
- Weak on networking → `iam` or `storage`
- Weak on cost → `compute` sizing basics

Canonical depth lives elsewhere for:

- Docker, Kubernetes, Terraform mechanics, CI/CD, Linux, monitoring tooling —
  `devops_cloud_interview_guide.md`
- Application caching, transactions, messaging semantics, API design —
  `backend_development_interview_guide.md`
- Warehouses, lakes, pipelines, streaming platforms —
  `data_engineering_interview_guide.md`
- Cryptography, threat modelling, compliance detail, incident response —
  `cybersecurity_interview_guide.md`
- System design fundamentals, CAP, caching theory —
  `software_engineering_interview_guide.md`
