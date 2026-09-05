# DevOps and Cloud Engineering Interview Knowledge Guide

```yaml
job_field: devops_cloud
job_field_name: DevOps / Cloud Engineering
canonical_topics:
  - devops_culture
  - linux
  - bash
  - networking
  - git
  - ci_cd
  - github_actions
  - containerization
  - docker
  - kubernetes
  - aws
  - azure
  - gcp
  - terraform
  - infrastructure_as_code
  - configuration_management
  - monitoring
  - logging
  - observability
  - cloud_security
  - iam
  - reliability
  - high_availability
  - scalability
  - fault_tolerance
  - disaster_recovery
  - distributed_systems
  - troubleshooting
difficulty:
  - easy
  - medium
  - hard
```

This document is the canonical interview knowledge base for the **devops_cloud** job
field. It owns Linux, shell scripting, CI/CD, containerization and Docker, Kubernetes,
Terraform and Infrastructure as Code, monitoring and observability, and operational
troubleshooting. Cloud *design* decisions (VPC topology, DR strategy, cost, serverless
architecture) are covered in the cloud architecture guide; this guide covers the
operational side of the same technologies.

---

## 1. Job Field Overview

```yaml
job_field: devops_cloud
topic: devops_culture
difficulty: easy
keywords: [devops, sre, culture, automation, delivery, responsibilities, platform]
```

DevOps is a set of practices and a working culture that shortens the path from code
change to reliable production operation, by removing the handoff wall between
development and operations. It is not a tool, a job title guarantee, or a synonym for
"we use Jenkins".

Core practices: version control for everything including infrastructure, continuous
integration, automated testing, continuous delivery, infrastructure as code, monitoring
and observability, and blameless incident review.

**DevOps and SRE are related but distinct.** Site Reliability Engineering is a specific
implementation approach originating at Google that applies software engineering to
operations problems, with explicit constructs — service level objectives, error budgets,
and a bounded amount of toil. DevOps is the broader cultural movement.

Typical responsibilities of a DevOps or cloud engineer:

- Build and maintain CI/CD pipelines.
- Containerise applications and run them on an orchestrator.
- Provision and manage cloud infrastructure declaratively.
- Operate monitoring, logging, and alerting.
- Manage access, secrets, and network boundaries.
- Respond to incidents and drive reliability improvements.
- Reduce manual operational work through automation.

**The core measurement framing (DORA metrics).** Deployment frequency, lead time for
changes, change failure rate, and time to restore service. These four are the widely
cited research-backed indicators of software delivery performance, and are a legitimate
thing to reference in an interview.

---

## 2. Core Competencies

```yaml
job_field: devops_cloud
topic: core_competencies
difficulty: easy
keywords: [competencies, devops_skills, evaluation]
```

1. **Linux** — filesystem, processes, permissions, systemd, logs, package management.
2. **Shell scripting (Bash)** — automation, exit codes, pipelines, safe scripting.
3. **Networking** — IP, subnets, routing, DNS, TCP, TLS, firewalls, load balancing.
4. **Git** — branching strategy, merge versus rebase, tags, hooks in CI context.
5. **CI/CD** — pipeline design, artifacts, environments, deployment strategies.
6. **Containerization and Docker** — images, layers, registries, networking, volumes.
7. **Kubernetes** — workloads, services, configuration, scheduling, scaling, debugging.
8. **A cloud provider** — compute, storage, networking, IAM, managed databases.
9. **Terraform and Infrastructure as Code** — state, modules, plan/apply, drift.
10. **Configuration management** — Ansible or equivalent, and where it fits versus
    immutable infrastructure.
11. **Monitoring, logging, and observability** — metrics, logs, traces, alerting.
12. **Security operations** — IAM least privilege, secrets, image scanning, network
    policy.
13. **Reliability engineering** — HA, fault tolerance, capacity, DR, incident response.
14. **Troubleshooting under pressure** — the competency that separates levels most
    sharply.

---

## 3. Foundational Knowledge

### 3.1 Linux Fundamentals

```yaml
job_field: devops_cloud
topic: linux
difficulty: easy
keywords: [linux, filesystem, permissions, processes, systemd, package_manager, shell]
```

**Definition.** Linux is a Unix-like operating system kernel; a distribution bundles it
with userland tools, a package manager, and an init system. It is the default operating
system for servers, containers, and cloud instances.

**Filesystem hierarchy** — the directories interviewers actually ask about:

- `/etc` — system and service configuration files.
- `/var/log` — log files written by the system and services.
- `/var/lib` — variable state data for services (databases, container storage).
- `/usr/bin`, `/usr/local/bin` — executables.
- `/home` — user home directories.
- `/tmp` — temporary files, often cleared on reboot.
- `/proc` and `/sys` — virtual filesystems exposing kernel and process state.
- `/dev` — device files.

**Permissions.** Every file has an owner, a group, and read/write/execute bits for
owner, group, and others. `chmod 755` means owner `rwx`, group and others `r-x`.
`chown` changes ownership. A directory's execute bit means "may traverse into", not
"may run".

**Processes.** Every process has a PID and a parent. `ps`, `top`, and `htop` list them;
signals control them — `SIGTERM` (15) requests graceful shutdown, `SIGKILL` (9) is
unconditional and cannot be trapped, `SIGHUP` often triggers config reload. A zombie
process has exited but its parent has not reaped it.

**systemd** is the init system on most modern distributions: `systemctl start|stop|
status|enable <unit>` manages services, and `journalctl -u <unit>` reads their logs.

**Package management.** `apt` on Debian/Ubuntu, `dnf`/`yum` on RHEL-family, `apk` on
Alpine.

**Essential commands by purpose:**

- Inspect: `ls`, `cat`, `less`, `tail -f`, `head`, `stat`, `file`
- Search: `grep`, `find`, `awk`, `sed`, `sort`, `uniq`, `wc`
- Processes: `ps aux`, `top`, `kill`, `pkill`, `nohup`, `jobs`
- Disk: `df -h`, `du -sh`, `lsblk`, `mount`
- Memory and CPU: `free -h`, `vmstat`, `uptime`, `iostat`
- Network: `ip addr`, `ss -tulpn`, `ping`, `traceroute`, `dig`, `curl`
- Permissions: `chmod`, `chown`, `umask`, `sudo`

### 3.2 Bash and Shell Scripting

```yaml
job_field: devops_cloud
topic: bash
difficulty:
  - easy
  - medium
keywords: [bash, shell_script, exit_code, pipeline, variables, set_euo_pipefail, cron]
```

Shell scripting is the glue of operations work: automating deployments, log processing,
health checks, and cleanup jobs.

- **Exit codes.** `0` means success, non-zero means failure. `$?` holds the last exit
  code. CI systems and `&&` chaining depend entirely on correct exit codes, so a script
  that swallows errors and exits `0` breaks the pipeline's ability to detect failure.
- **Safe script preamble.** `set -euo pipefail` makes the script exit on an error, treat
  unset variables as errors, and propagate failures through a pipeline instead of only
  reporting the last command's status. Without `pipefail`, `false | true` succeeds.
- **Quoting.** Unquoted `$var` undergoes word splitting and globbing, which breaks on
  paths with spaces. Quote variables by default: `"$var"`.
- **Pipelines and redirection.** `|` pipes stdout to stdin; `>` truncates, `>>` appends,
  `2>&1` merges stderr into stdout. Order matters: `> file 2>&1` is not the same as
  `2>&1 > file`.
- **Idempotency.** Automation scripts should be safe to run twice. Check before creating,
  use `mkdir -p`, and prefer declarative tools when the logic grows.
- **Scheduling.** `cron` for time-based jobs, systemd timers as the modern alternative.
  Cron runs with a minimal environment, which is why "works in my shell, fails in cron"
  is a classic.

**When to stop scripting.** Once a script manages state, handles many hosts, or needs
retry and rollback, move to a configuration management or IaC tool.

### 3.3 Networking for Operations

```yaml
job_field: devops_cloud
topic: networking
difficulty:
  - easy
  - medium
  - hard
keywords: [tcp_ip, subnet, cidr, dns, tls, firewall, port, nat, load_balancer, osi]
```

- **IP addressing and CIDR.** `10.0.0.0/16` provides 65,536 addresses; each `/24` inside
  it provides 256 (minus reserved addresses). Subnet sizing is a design decision made
  once and painful to change later.
- **Private ranges** (RFC 1918): `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`. Cloud
  VPCs use these; overlapping ranges between environments break VPN and peering.
- **TCP versus UDP.** Connection-oriented, ordered, reliable versus connectionless and
  lightweight. The TCP three-way handshake (SYN, SYN-ACK, ACK) matters when diagnosing
  connection failures: a connection refused is an immediate RST, a timeout usually means
  a firewall silently dropped the packet.
- **DNS.** Record types: `A` (IPv4), `AAAA` (IPv6), `CNAME` (alias), `MX` (mail), `TXT`,
  `NS`, `SOA`. TTL controls caching, which is why DNS changes propagate gradually and why
  lowering TTL before a migration is standard practice.
- **TLS.** Certificate chain, expiry, SNI for multiple hosts on one IP, and mutual TLS
  where both sides present certificates. Expired certificates are a top cause of
  self-inflicted outages.
- **NAT** lets instances with private addresses reach the internet outbound without being
  reachable inbound. A NAT gateway is the usual cloud implementation and is a common
  source of surprise cost.
- **Firewalls and security groups.** Stateful rules allow return traffic automatically;
  stateless network ACLs require explicit rules in both directions.
- **Load balancing.** Layer 4 balances by IP and port; Layer 7 understands HTTP and can
  route by path, host, or header, terminate TLS, and retry. Health checks determine which
  targets receive traffic — a misconfigured health check path is a frequent cause of "all
  targets unhealthy".

**Diagnostic ladder for a connectivity problem:** does the name resolve (`dig`), is the
host reachable (`ping`, though ICMP is often blocked), is the port open (`nc -zv`,
`ss -tulpn` locally), does the application respond (`curl -v`), and is a firewall,
security group, or route table blocking it.

### 3.4 Git in a Delivery Pipeline

```yaml
job_field: devops_cloud
topic: git
difficulty:
  - easy
  - medium
keywords: [git, branching_strategy, trunk_based, tags, gitops, pull_request, hooks]
```

Git fundamentals are covered in the software engineering guide. What matters in a DevOps
context is how Git drives delivery.

- **Branching strategy.** Trunk-based development with short-lived branches and feature
  flags optimises for continuous delivery. GitFlow's long-lived branches suit versioned,
  infrequently released products but slow integration and increase merge pain.
- **Tags and releases.** An annotated tag marks an immutable release point; build
  artifacts should be traceable to a commit SHA, and images should be tagged with that
  SHA rather than only `latest`.
- **Protected branches and required checks** enforce review and green CI before merge.
- **GitOps.** Declared desired state lives in Git, and a controller continuously
  reconciles the cluster to match. Benefits: an auditable change history, easy rollback by
  reverting a commit, and no direct cluster credentials for engineers. Costs: everything
  must be expressible declaratively, and drift or manual changes get silently reverted.
- **Secrets never belong in Git**, including in IaC files. A committed secret is
  compromised until rotated, because history retains it.

---

## 4. Core Technical Topics

### 4.1 Containerization Concepts

```yaml
job_field: devops_cloud
topic: containerization
difficulty:
  - easy
  - medium
keywords: [containerization, namespaces, cgroups, isolation, vm_vs_container, oci, runtime]
```

**Containerization is an operating-system-level virtualisation technique** in which
processes run in isolated userspaces on a shared host kernel. **Docker is one
implementation and toolchain, not the concept itself** — this distinction is a reliable
interview discriminator.

The Linux kernel primitives that make it work:

- **Namespaces** isolate what a process can *see*: PID, network, mount, UTS, IPC, user,
  and cgroup namespaces.
- **cgroups (control groups)** limit what a process can *use*: CPU, memory, block I/O,
  and process count.
- **Union filesystems** (overlayfs) provide layered, copy-on-write images.

**Containers versus virtual machines.** A VM virtualises hardware and runs a full guest
kernel, giving strong isolation with a heavier footprint and slower start. A container
shares the host kernel, starts in milliseconds, and packs far more densely — with weaker
isolation, because a kernel vulnerability crosses the boundary. Use VMs where isolation is
a hard security requirement, containers where density and speed matter.

**Standards.** The Open Container Initiative (OCI) defines image and runtime
specifications, which is why images built with Docker run on containerd, CRI-O, or
Podman. `runc` is the common low-level runtime.

**What containers do not solve.** They do not make an application stateless, do not fix
configuration management, and do not provide orchestration, scheduling, or service
discovery on their own.

### 4.2 Docker — Images and Builds

```yaml
job_field: devops_cloud
topic: docker
subtopic: images
difficulty:
  - easy
  - medium
  - hard
keywords: [docker, dockerfile, image, layer, cache, multi_stage, registry, tag]
```

**Image versus container.** An image is an immutable, layered filesystem template plus
metadata. A container is a running (or stopped) instance of an image with a thin writable
layer on top. Many containers can run from one image.

**Layers and caching.** Each instruction in a Dockerfile creates a layer. Docker reuses a
cached layer if the instruction and its inputs are unchanged, so **instruction order
determines build speed**: copy the dependency manifest and install dependencies before
copying the application source, otherwise every source edit invalidates the dependency
install.

**Multi-stage builds** use one stage to compile or bundle and a second minimal stage that
copies only the artifact. This removes compilers, build caches, and source from the
shipped image, cutting both size and attack surface.

**Dockerfile practices that matter:**

- Pin a specific base image tag or digest; `latest` makes builds non-reproducible.
- Use a slim or distroless base where practical.
- Run as a non-root user (`USER`), because root in a container is root on the host kernel
  if a container escape occurs.
- Combine `RUN` commands that create and clean up temporary files in one layer — deleting
  a file in a later layer does not shrink the image.
- Use `.dockerignore` to keep `node_modules`, `.git`, and secrets out of the build
  context.
- Prefer `COPY` over `ADD` unless you need remote URL or archive extraction behaviour.
- `CMD` provides default arguments; `ENTRYPOINT` defines the executable. Use exec form
  (`["app"]`) so the process receives signals as PID 1 and shuts down gracefully.
- **Never bake secrets into an image.** They persist in the layer history even if a later
  layer deletes them.

**Registries.** Images are pushed to a registry (Docker Hub, ECR, GCR, ACR, Harbor) and
pulled by the runtime. Tag with an immutable identifier such as the Git SHA; a mutable
`latest` tag makes it impossible to know what is actually running.

### 4.3 Docker — Runtime, Networking, and Storage

```yaml
job_field: devops_cloud
topic: docker
subtopic: runtime_networking_storage
difficulty:
  - medium
  - hard
keywords: [docker_network, bridge, host, volume, bind_mount, compose, port_mapping, logs]
```

**Networking modes.**

- **bridge** (default) — a private network on the host; containers reach each other by
  container or service name via the embedded DNS resolver, and the host exposes ports with
  `-p host:container`.
- **host** — the container shares the host network namespace, so no port mapping and no
  isolation.
- **none** — no networking.
- **overlay** — multi-host networking for Swarm or similar.

**The single most common Docker networking mistake:** an application inside a container
connecting to `localhost` to reach another service. Inside a container, `localhost` is
that container. Use the service or container name on a shared user-defined network.

**Storage.**

- **Volumes** are managed by Docker, survive container removal, and are the right choice
  for persistent data such as a database.
- **Bind mounts** map a host path into the container; useful for local development, and
  a security consideration in production since the container can write to the host.
- **tmpfs** keeps data in memory only.
- **The writable container layer is ephemeral.** Anything written there disappears when
  the container is removed, which is why logs and state must go to volumes or stdout.

**Logging.** Containerised applications should log to stdout and stderr; the runtime
collects the stream and a log driver ships it. Writing application logs to a file inside
the container hides them from the platform and fills the writable layer.

**Docker Compose** declares a multi-container local environment — application, database,
cache — in one file, with a shared network where service names resolve as hostnames. It
is a development and small-deployment tool, not an orchestrator for production scale.

**Resource limits.** Without `--memory` and `--cpus`, a container can consume the whole
host. In production these should always be set.

### 4.4 Kubernetes — Architecture and Objects

```yaml
job_field: devops_cloud
topic: kubernetes
subtopic: architecture
difficulty:
  - easy
  - medium
  - hard
keywords: [kubernetes, control_plane, kubelet, pod, deployment, service, namespace, etcd]
```

**Kubernetes is a container orchestration platform**, not a container runtime. It
schedules containerised workloads across a cluster, keeps the actual state converging
toward the declared desired state, and provides service discovery, scaling, and rollout
control.

**Common misconception:** "Kubernetes is a container runtime" or "Kubernetes replaced
Docker". Kubernetes talks to a runtime through the **Container Runtime Interface (CRI)**;
containerd and CRI-O are the usual implementations. The `dockershim` component was removed
from the kubelet in Kubernetes v1.24, meaning Kubernetes no longer speaks to Docker Engine
directly — but images built with Docker are OCI images and continue to run unchanged.

**Control plane components.**

- **kube-apiserver** — the only component that talks to etcd; every change goes through
  it.
- **etcd** — the consistent key-value store holding all cluster state. Backing it up is
  the difference between a bad day and a lost cluster.
- **kube-scheduler** — assigns pods to nodes based on resource requests, affinity, taints,
  and constraints.
- **kube-controller-manager** — runs reconciliation loops (deployment, replicaset, node,
  and others).
- **cloud-controller-manager** — integrates with the cloud provider for load balancers,
  routes, and nodes.

**Node components.** **kubelet** (ensures containers described in pod specs are running),
**kube-proxy** (service networking rules), and the **container runtime**.

**Core objects.**

- **Pod** — the smallest deployable unit: one or more containers sharing a network
  namespace and storage. Pods are ephemeral and are not repaired in place; they are
  replaced.
- **ReplicaSet** — maintains a desired number of pod replicas.
- **Deployment** — declarative management of ReplicaSets, providing rolling updates and
  rollback. This is what you actually create for a stateless service.
- **StatefulSet** — stable network identity and stable per-pod storage, for databases and
  other stateful workloads.
- **DaemonSet** — one pod per node, for log collectors and node agents.
- **Job / CronJob** — run-to-completion and scheduled workloads.
- **Service** — a stable virtual IP and DNS name in front of a changing set of pods.
  `ClusterIP` (internal), `NodePort` (a port on every node), `LoadBalancer` (provisions a
  cloud load balancer).
- **Ingress** — HTTP routing by host and path into services, implemented by an ingress
  controller. (The Gateway API is the newer, more expressive successor; availability
  depends on cluster version and installed controllers.)
- **ConfigMap and Secret** — externalised configuration. Note that a Kubernetes Secret is
  base64-encoded, not encrypted by default; encryption at rest for etcd and restrictive
  RBAC are required to make it meaningfully secret.
- **Namespace** — a scope for names and a boundary for quotas and policy, not a security
  boundary on its own.

### 4.5 Kubernetes — Scheduling, Health, and Scaling

```yaml
job_field: devops_cloud
topic: kubernetes
subtopic: scheduling_and_scaling
difficulty:
  - medium
  - hard
keywords: [requests_limits, qos, probes, hpa, affinity, taint, pdb, autoscaling, oomkilled]
```

**Requests and limits.** A *request* is what the scheduler reserves when placing the pod;
a *limit* is the hard ceiling enforced at runtime. Exceeding a memory limit gets the
container **OOMKilled**; exceeding a CPU limit causes throttling, not termination. Setting
requests too high wastes capacity; setting none makes scheduling and eviction behaviour
unpredictable.

**Quality of Service classes.** `Guaranteed` (requests equal limits for all containers),
`Burstable` (requests set, limits higher or absent), `BestEffort` (nothing set). Under node
memory pressure, `BestEffort` pods are evicted first — which is why a critical workload
should never be `BestEffort`.

**Probes.**

- **Liveness** — if it fails, the kubelet restarts the container. Use it only for
  unrecoverable states; pointing liveness at a dependency causes restart storms during a
  dependency outage.
- **Readiness** — if it fails, the pod is removed from Service endpoints but not
  restarted. This is the correct probe for "my database is unreachable right now".
- **Startup** — gives slow-starting applications time before liveness begins, instead of
  inflating the liveness delay.

**Placement controls.** Node selectors and node affinity express where a pod may run; pod
affinity and anti-affinity express co-location or spreading (spreading replicas across
zones is standard for HA); taints on nodes repel pods unless the pod has a matching
toleration; topology spread constraints give finer control over distribution.

**Autoscaling.**

- **Horizontal Pod Autoscaler** adds or removes pod replicas based on CPU, memory, or
  custom metrics.
- **Vertical Pod Autoscaler** adjusts requests and limits, typically requiring a pod
  restart.
- **Cluster Autoscaler** adds or removes nodes when pods cannot be scheduled or nodes are
  underused.
- These interact: HPA has no effect if there is no node capacity, and the cluster
  autoscaler cannot help if requests are unset.

**Disruption control.** A PodDisruptionBudget limits how many pods of an application may
be voluntarily unavailable at once, protecting availability during node drains and
upgrades. `terminationGracePeriodSeconds` plus a `preStop` hook and correct `SIGTERM`
handling are what make rolling updates actually graceful.

### 4.6 Kubernetes — Troubleshooting

```yaml
job_field: devops_cloud
topic: kubernetes
subtopic: troubleshooting
difficulty:
  - medium
  - hard
keywords: [crashloopbackoff, imagepullbackoff, pending, oomkilled, kubectl_describe, events, dns]
```

The diagnostic sequence: `kubectl get pods` for state, `kubectl describe pod` for events
and conditions, `kubectl logs` (and `--previous` for the crashed instance), then
`kubectl exec` or an ephemeral debug container for live inspection.

**Pod status meanings and causes.**

- **Pending** — the scheduler cannot place the pod. Causes: insufficient CPU or memory on
  any node, an unsatisfiable node selector or affinity, an untolerated taint, or a
  PersistentVolumeClaim that cannot bind. `kubectl describe` states which.
- **ImagePullBackOff / ErrImagePull** — wrong image name or tag, missing or expired
  registry credentials (`imagePullSecrets`), or no network route to the registry.
- **CrashLoopBackOff** — the container starts and exits repeatedly, and the kubelet backs
  off between restarts. This is a *symptom*, not a cause. Real causes: the application
  fails at startup (missing config or environment variable, unreachable dependency), the
  command or entrypoint is wrong, a misconfigured liveness probe kills a healthy but
  slow-starting process, or the container exits immediately because it has no long-running
  foreground process. Read the previous container's logs.
- **OOMKilled** (exit code 137) — the container exceeded its memory limit. Determine
  whether the limit is too low for legitimate usage or the application is leaking. For JVM
  and Node workloads, check that the runtime's own heap setting is aligned with the
  container limit; a JVM unaware of its cgroup limit will happily exceed it.
- **Evicted** — node pressure (memory, disk, PID). Check node conditions and the QoS class
  of the evicted pod.
- **Running but not Ready** — the readiness probe is failing. Check the probe path, port,
  timeout, and whether a dependency is down.

**Service and networking problems.** If a Service has no endpoints, the label selector
does not match any ready pod — this is the single most common Service bug. Verify with
`kubectl get endpoints`. For DNS failures, check CoreDNS pods and test resolution from
inside a pod. For "works from inside the pod but not through the Service", check
`targetPort` versus `containerPort` and any NetworkPolicy in effect.

**Node problems.** `NotReady` nodes: kubelet down, network plugin failure, disk pressure,
or an unresponsive container runtime. `kubectl describe node` reports conditions.

### 4.7 CI/CD

```yaml
job_field: devops_cloud
topic: ci_cd
difficulty:
  - easy
  - medium
  - hard
keywords: [continuous_integration, continuous_delivery, pipeline, artifact, deployment_strategy, rollback]
```

**Continuous Integration** is merging work to a shared trunk frequently, with an automated
build and test on every change. **Continuous Delivery** is keeping every build in a
releasable state with an automated path to production, gated by a human decision.
**Continuous Deployment** removes that gate and releases every passing build
automatically. These three are distinct and are frequently conflated.

**Pipeline stages** in a typical service:

1. Checkout and dependency restore (with a cache).
2. Lint and static analysis.
3. Unit tests.
4. Build the artifact — a container image tagged with the commit SHA.
5. Security scanning: dependencies, image layers, IaC misconfiguration, secret detection.
6. Publish the artifact to a registry.
7. Deploy to a pre-production environment and run integration and smoke tests.
8. Promote the **same artifact** to production. Rebuilding per environment breaks the
   guarantee that what you tested is what you shipped.

**Deployment strategies and their trade-offs.**

- **Rolling update** — replace instances gradually. No extra infrastructure cost; both
  versions run simultaneously, so the API and schema must be backward compatible.
- **Blue-green** — run two full environments and switch traffic. Instant cutover and
  instant rollback; doubles infrastructure during the switch and needs a plan for
  in-flight sessions and shared database state.
- **Canary** — route a small percentage to the new version, watch metrics, and increase
  gradually. Lowest blast radius; requires traffic splitting and automated metric
  analysis.
- **Recreate** — stop the old, start the new. Simple, with downtime. Sometimes the only
  option for a workload that cannot run two versions at once.
- **Feature flags** decouple deployment from release, allowing dark launches and instant
  disable without a redeploy — at the cost of flag debt and combinatorial testing.

**Pipeline hygiene.** Fast feedback (fail on lint before running a 20-minute test suite),
reproducible builds, no manual steps between build and deploy, no long-lived credentials
in the runner (prefer short-lived OIDC federation to the cloud provider), and an artifact
that carries provenance back to the commit.

**GitHub Actions specifics** worth knowing: workflows triggered by events, jobs running on
runners, steps using reusable actions, secrets scoped to repository or environment, matrix
builds for multiple versions, caching for dependencies, and pinning third-party actions to
a commit SHA rather than a mutable tag — a real supply chain control.

### 4.8 Infrastructure as Code

```yaml
job_field: devops_cloud
topic: infrastructure_as_code
difficulty:
  - medium
  - hard
keywords: [iac, declarative, idempotent, drift, immutable_infrastructure, provisioning]
```

**Infrastructure as Code is the practice of defining infrastructure in machine-readable
files that are version-controlled and applied automatically. Terraform is one tool that
implements it** — along with CloudFormation, Pulumi, Bicep, Crossplane, and OpenTofu.
Conflating the practice with the tool is a common interview error.

**Declarative versus imperative.** Declarative IaC describes the desired end state and
lets the tool compute the changes; imperative scripting describes the steps. Declarative
tooling gives idempotency and drift detection; imperative gives fine control over ordering
at the cost of reinventing convergence.

**Benefits.** Reproducible environments, peer-reviewed infrastructure changes, an audit
trail, disaster recovery by re-applying code, and the ability to spin up an identical
staging environment.

**Costs and risks.** A learning curve, state management complexity, blast radius (one
wrong apply can destroy production), provider abstraction leaks, and the discipline
required to stop making manual console changes.

**Drift** is divergence between the declared state and reality, caused by manual changes.
Detect it by running a plan on a schedule; resolve it by either importing the change into
code or reverting it. Persistent drift means the team does not actually trust the tooling.

**Immutable infrastructure** replaces servers rather than modifying them: build a new
image, deploy new instances, terminate the old. It eliminates configuration drift and
makes rollback a redeploy of the previous image. **Configuration management** (Ansible,
Chef, Puppet) instead converges existing machines toward a desired configuration; it
remains relevant for long-lived hosts, base image building, and environments where
replacement is impractical. The two approaches are complementary, not competing.

### 4.9 Terraform

```yaml
job_field: devops_cloud
topic: terraform
difficulty:
  - medium
  - hard
keywords: [terraform, state, plan, apply, module, provider, backend, workspace, import]
```

**Terraform** is a declarative provisioning tool that builds a dependency graph from
configuration and reconciles real infrastructure to it through provider plugins.

**Core workflow.** `init` (download providers and configure the backend), `validate`,
`plan` (compute the diff without changing anything), `apply` (execute), `destroy`.
Reviewing the plan output is the safety mechanism; auto-applying without review is how
production gets deleted.

**State is the central concept.** The state file maps configuration resources to real
resource identifiers and caches attributes. Consequences:

- **State must be remote and shared** for team use (S3 with DynamoDB locking, Azure Blob,
  GCS, or a managed backend). A local state file means two engineers can apply
  conflicting changes.
- **State locking** prevents concurrent applies. A stale lock after a crashed run is a
  common operational problem; force-unlock only after confirming no apply is running.
- **State contains secrets in plaintext** — database passwords, generated keys. Encrypt
  the backend and restrict access accordingly.
- **State drift and manual changes.** `terraform import` brings an existing resource under
  management; `terraform state rm` stops managing without destroying; moving resources
  between modules requires `moved` blocks or state moves to avoid destroy-and-recreate.
- **Never hand-edit the state file** unless every alternative has failed, and back it up
  first.

**Structure.**

- **Modules** package reusable infrastructure with inputs and outputs. Compose small,
  focused modules; a module that takes forty variables has failed at abstraction.
- **Separate state per environment** (directories or workspaces plus separate backends) so
  a staging apply cannot touch production. Workspaces alone share a backend and are a
  weaker isolation boundary than separate state files.
- **Split state by blast radius** — networking, data stores, and applications in separate
  states, connected by data sources or remote state outputs. One giant state makes every
  plan slow and every apply risky.
- **`count` versus `for_each`.** `for_each` keys resources by a stable identifier, so
  removing one item does not renumber and recreate the others. `count` indexes
  positionally and is a frequent cause of accidental destruction.
- **Lifecycle controls.** `prevent_destroy` on critical resources, `create_before_destroy`
  for zero-downtime replacement, and `ignore_changes` for attributes managed elsewhere.
- **Version pinning.** Pin the Terraform version and provider versions; a provider major
  upgrade can change resource behaviour.

**Version-dependent behaviour.** Terraform's license changed from MPL to the Business
Source License in 2023, which led to the OpenTofu fork under the Linux Foundation.
Confirm which the organisation uses; the core workflow and HCL syntax are compatible for
common use, but this is a real licensing and tooling decision.

### 4.10 Cloud Provider Fundamentals

```yaml
job_field: devops_cloud
topic: aws
difficulty:
  - easy
  - medium
  - hard
keywords: [aws, ec2, s3, vpc, iam, rds, lambda, ecs, eks, cloudwatch, azure, gcp]
```

**Cloud computing** is on-demand delivery of compute, storage, and services over the
internet with usage-based pricing. **AWS is one provider**, not a synonym for cloud
computing — a distinction interviewers test.

**Core AWS services by category** (with the rough Azure and GCP equivalents, since
multi-cloud vocabulary is often probed):

- **Compute** — EC2 (VMs) / Azure Virtual Machines / Compute Engine; Lambda (functions) /
  Azure Functions / Cloud Run Functions; ECS and EKS (containers) / AKS / GKE.
- **Storage** — S3 (object) / Blob Storage / Cloud Storage; EBS (block) / Managed Disks /
  Persistent Disk; EFS (file) / Azure Files / Filestore.
- **Database** — RDS and Aurora (relational) / Azure SQL / Cloud SQL; DynamoDB (key-value)
  / Cosmos DB / Firestore or Bigtable; ElastiCache (Redis) / Azure Cache for Redis /
  Memorystore.
- **Networking** — VPC / Virtual Network / VPC; ELB (ALB, NLB) / Azure Load Balancer and
  Application Gateway / Cloud Load Balancing; Route 53 / Azure DNS / Cloud DNS;
  CloudFront / Azure CDN and Front Door / Cloud CDN.
- **Identity** — IAM / Microsoft Entra ID and Azure RBAC / Cloud IAM.
- **Messaging** — SQS, SNS, EventBridge / Service Bus, Event Grid / Pub/Sub.
- **Observability** — CloudWatch / Azure Monitor / Cloud Monitoring and Logging.
- **IaC** — CloudFormation / ARM and Bicep / Deployment Manager, with Terraform working
  across all three.

**The shared responsibility model.** The provider secures the cloud (physical facilities,
hardware, the hypervisor, managed service internals); the customer secures what they put
in the cloud (data, IAM configuration, network rules, OS patching on VMs, application
code). Most cloud breaches are customer-side misconfiguration, typically overly permissive
IAM or publicly exposed storage.

**Regions and availability zones.** A region is a geographic area; an AZ is one or more
discrete data centres within it with independent power and networking. Deploying across
multiple AZs protects against a data-centre failure; only multi-region protects against a
regional failure, at substantially higher cost and complexity. Data transfer between AZs
and regions is billed.

**S3 essentials.** Object storage with virtually unlimited capacity, storage classes for
different access patterns and costs, versioning and lifecycle policies, server-side
encryption, and access controlled by bucket policies and IAM. Public buckets are a
recurring cause of data exposure; block-public-access settings exist precisely for this.

### 4.11 IAM and Cloud Access Control

```yaml
job_field: devops_cloud
topic: iam
difficulty:
  - medium
  - hard
keywords: [iam, role, policy, least_privilege, assume_role, service_account, oidc, mfa]
```

**IAM (Identity and Access Management)** controls who can do what to which resources under
which conditions.

- **Users, groups, roles.** A user is a long-lived identity; a group bundles permissions;
  a **role** is a set of permissions that an identity or service assumes temporarily,
  obtaining short-lived credentials. Roles are strongly preferred: no long-lived keys to
  leak.
- **Policies** are documents granting or denying actions on resources, optionally with
  conditions. An explicit deny always wins over an allow.
- **Least privilege.** Grant only the actions and resources needed. Start restrictive and
  widen based on observed denials rather than starting with a wildcard "to unblock the
  team" and never narrowing it.
- **Instance and workload identity.** An EC2 instance profile, an EKS service account
  bound to an IAM role (IRSA), or a GKE workload identity gives a workload credentials
  automatically, removing the need for stored keys.
- **CI/CD access.** Federate the pipeline to the cloud provider with OIDC so jobs receive
  short-lived credentials, instead of storing static access keys as CI secrets.
- **Guardrails.** MFA on human accounts, permission boundaries and service control
  policies to cap what any role can do, credential rotation, and access analysis to find
  unused permissions.
- **Audit.** CloudTrail (or the equivalent) records API calls; without it you cannot
  answer "who deleted the bucket".

### 4.12 Monitoring, Logging, and Observability

```yaml
job_field: devops_cloud
topic: observability
difficulty:
  - medium
  - hard
keywords: [monitoring, logging, tracing, metrics, prometheus, grafana, alerting, slo, opentelemetry]
```

**These three terms are not interchangeable.** *Monitoring* is collecting and alerting on
predefined signals. *Logging* is recording discrete events. *Observability* is the property
of a system that lets you answer questions you did not anticipate, using its external
outputs. Monitoring tells you something is wrong; observability helps you find out why.

**The three pillars.**

- **Metrics** — numeric time series, cheap to store and query, ideal for alerting and
  trends. Counters, gauges, and histograms. Prometheus is the CNCF-graduated de facto
  standard for metrics collection, with a pull model, a multi-dimensional label data model,
  and PromQL. Grafana is the common visualisation layer.
- **Logs** — high-cardinality, high-detail event records. Structured JSON with consistent
  fields is what makes them searchable. Centralise them; logs on a terminated node are
  gone.
- **Traces** — the path of a single request across services, with timing per span.
  Essential in distributed systems. **OpenTelemetry** is the vendor-neutral CNCF standard
  for instrumenting and exporting all three signal types.

**What to alert on.** Alert on symptoms users experience (error rate, latency,
unavailability), not on every cause. Every alert should be actionable and have a runbook.
Alerting on high CPU alone produces noise; alerting on "checkout error rate above 2% for
five minutes" produces action. Alert fatigue is a reliability risk in itself.

**Frameworks.** The **RED method** for request-driven services: Rate, Errors, Duration.
The **USE method** for resources: Utilisation, Saturation, Errors. The four **golden
signals** from Google SRE: latency, traffic, errors, saturation.

**SLI, SLO, and error budget.** An SLI is a measured indicator of service behaviour; an
SLO is the target; the error budget is the permitted shortfall. The error budget converts
"should we ship this risky change?" from an argument into a calculation, and it is the
mechanism that makes reliability a shared engineering concern rather than an ops
complaint.

**Cardinality warning.** Adding a high-cardinality label such as user id or request id to
a metric can multiply time series into the millions and take down the metrics backend. High
cardinality belongs in logs and traces, not in metric labels.

---

## 5. Easy-Level Interview Knowledge

```yaml
job_field: devops_cloud
topic: easy_level_knowledge
difficulty: easy
keywords: [devops_basics, linux_basics, docker_basics, definitions, junior]
```

- **What is Docker?** A platform and toolchain for building, distributing, and running
  containers.
- **What is a container?** An isolated process running on a shared host kernel with its
  own filesystem view and resource limits.
- **What is the difference between an image and a container?** An immutable template
  versus a running instance of it.
- **What is the purpose of `/var/log` in Linux?** It holds system and service log files.
- **What does `chmod 755` mean?** Owner can read, write, and execute; group and others can
  read and execute.
- **What is the difference between `SIGTERM` and `SIGKILL`?** A graceful shutdown request
  that a process can handle versus an immediate, untrappable termination.
- **What is a Kubernetes pod?** The smallest deployable unit — one or more containers
  sharing a network namespace and storage.
- **What is CI/CD?** Automated integration and testing of every change, plus an automated
  path to release.
- **What is Infrastructure as Code?** Defining infrastructure in version-controlled files
  applied by tooling instead of clicking in a console.
- **What does `terraform plan` do?** Shows the changes that would be made, without making
  them.
- **What is an AWS region and an availability zone?** A geographic area versus an isolated
  data-centre grouping within it.
- **What is S3 used for?** Durable object storage for files, backups, static assets, and
  data lakes.
- **What is an HTTP status code you would see from a load balancer when the backend is
  down?** `502` or `503`, depending on whether the backend responded badly or was
  unavailable.
- **What is DNS?** The system that resolves names to IP addresses, with TTL-based caching.
- **What is the difference between `git merge` and `git rebase`?** A merge commit joining
  histories versus replaying commits for a linear history, which rewrites hashes.
- **What is a volume in Docker?** Managed persistent storage that outlives the container.
- **What does `kubectl get pods` show, and what does `Pending` mean?** Pod status; Pending
  means the scheduler has not been able to place it on a node.

---

## 6. Medium-Level Interview Knowledge

```yaml
job_field: devops_cloud
topic: medium_level_knowledge
difficulty: medium
keywords: [applied_devops, troubleshooting, configuration, pipeline, comparison, trade_offs]
```

- **How would you configure a CI/CD pipeline for a containerised service?** Trigger,
  caching, test stages, image build tagged with the commit SHA, scanning, registry push,
  deploy to staging, smoke tests, and promotion of the same artifact to production with a
  rollback path.
- **How do you troubleshoot a container that cannot connect to a database?** Confirm the
  hostname resolves inside the container, that the port is reachable, that both are on the
  same Docker network (and that the code is not using `localhost`), then check credentials,
  TLS mode, and the database's own connection limit and allowed hosts.
- **How would you reduce a 1.2 GB Docker image?** Multi-stage build, a slim base image,
  combine and clean package installs in one layer, add a `.dockerignore`, and avoid
  copying build caches or `node_modules` from the host.
- **Why is a pod in CrashLoopBackOff and how do you investigate?** Read the previous
  container's logs, describe the pod for events and exit codes, check config and secret
  references, verify the command and entrypoint, and check whether a liveness probe is
  killing a slow starter.
- **What is the difference between liveness and readiness probes, and when does the
  difference matter?** Restart versus remove from load balancing; pointing liveness at a
  downstream dependency turns a dependency outage into a cluster-wide restart storm.
- **How do you manage Terraform state for a team?** Remote backend with locking, separate
  state per environment, split by blast radius, restricted access because state contains
  secrets, and no manual console changes.
- **What happens if two engineers run `terraform apply` at the same time?** State locking
  should block the second; without it, state corruption and conflicting changes.
- **How do you handle secrets in a pipeline?** A secret manager or the platform's secret
  store, injected at runtime, never committed, scoped per environment, rotated, and
  masked in logs. Prefer short-lived OIDC-federated credentials over static keys.
- **How would you set up monitoring for a new service?** Define SLIs first, instrument RED
  metrics, structured logs with a correlation id, traces at service boundaries,
  symptom-based alerts with runbooks, and a dashboard someone will actually look at.
- **When do you use a Deployment versus a StatefulSet?** Interchangeable stateless
  replicas versus workloads needing stable identity and stable per-pod storage.
- **How do you achieve zero-downtime deployment on Kubernetes?** Rolling update with a
  correct readiness probe, a PodDisruptionBudget, graceful `SIGTERM` handling with a
  `preStop` hook and adequate grace period, and backward-compatible schema and API
  changes.
- **How do you decide between a rolling update, blue-green, and canary?** Risk tolerance,
  infrastructure cost, ability to run two versions simultaneously, and whether you have
  metric-driven automated analysis.
- **What is the difference between a security group and a network ACL?** Stateful,
  instance-level, allow-only versus stateless, subnet-level, with explicit allow and deny
  in both directions.
- **How do you debug high CPU on a Linux server?** `top` or `htop` to find the process,
  `pidstat` or `perf` to see where it spends time, check for a runaway loop, and correlate
  with a deploy or a traffic change. Distinguish user CPU, system CPU, and I/O wait.
- **The disk is full on a production server. What now?** `df -h` to find the filesystem,
  `du -sh /*` to narrow down, check for large or unrotated logs and orphaned container
  images and volumes, free space safely, then fix log rotation or retention as the real
  fix.

---

## 7. Hard-Level Interview Knowledge

```yaml
job_field: devops_cloud
topic: hard_level_knowledge
difficulty: hard
keywords: [platform_design, reliability, scale, multi_region, distributed_systems, incident]
```

- **Design a highly available platform for a critical service.** Multi-AZ deployment,
  stateless application tier behind a load balancer with health checks, managed database
  with a standby in another AZ and automated failover, autoscaling with headroom, pod
  disruption budgets, cross-AZ spreading, and explicit RTO and RPO targets. Then state
  what still constitutes a single point of failure and what a regional outage would cost.
- **How do you handle cascading failures in a microservices platform?** Timeouts on every
  call, bounded retries with exponential backoff and jitter (unbounded retries amplify an
  outage), circuit breakers, bulkheads, load shedding at the edge, graceful degradation,
  and queue-based buffering. Explain the retry storm mechanism explicitly.
- **Design a CI/CD platform for fifty services and ten teams.** Reusable pipeline
  templates, a shared artifact registry with immutable tags and provenance, environment
  promotion, policy-as-code gates, ephemeral per-PR environments, secret federation, and a
  measurable path to fast build times. Include how you prevent one team's misconfiguration
  from affecting others.
- **How do you upgrade a production Kubernetes cluster with no downtime?** Read the version
  skew policy and deprecated API notes, upgrade the control plane before nodes, drain nodes
  respecting PodDisruptionBudgets, use surge capacity, validate workloads at each step,
  test in a non-production cluster first, and have a documented rollback for the control
  plane and for workloads.
- **How would you design multi-region disaster recovery?** Choose the pattern against RTO
  and RPO: backup and restore (cheapest, hours), pilot light, warm standby, or active-
  active (most expensive, near-zero RTO). Address data replication lag, failover
  automation and DNS TTL, split-brain prevention, and — critically — regularly *testing*
  the failover. An untested DR plan is a hypothesis.
- **How do you secure a Kubernetes cluster?** RBAC with least privilege and no cluster-
  admin for humans day to day, namespace isolation with NetworkPolicies (default deny),
  pod security standards restricting privilege and host access, image provenance and
  scanning, admission control policy, encrypted etcd with restricted access, short-lived
  credentials, and audit logging.
- **How do you diagnose intermittent latency spikes across a distributed system?**
  Distributed tracing to find which span grows, correlate with garbage collection, node
  saturation, noisy neighbours, connection pool exhaustion, DNS lookups, TLS renegotiation,
  or cross-AZ traffic. Distinguish per-request latency from queueing delay under load.
- **How do you manage Terraform at scale across many teams?** Module registry with
  versioned modules, state split by ownership and blast radius, plan review in CI with
  policy-as-code checks, drift detection on a schedule, and a clear rule about who may
  apply to production.
- **Explain the distributed systems constraints that shape your designs.** CAP during
  partitions and the PACELC latency-versus-consistency trade-off in normal operation;
  why exactly-once delivery is effectively at-least-once plus idempotency; why clocks
  cannot be trusted for ordering; and why every remote call needs a timeout.
- **Design an observability strategy that stays affordable.** Metrics for alerting with
  controlled cardinality, sampled traces with tail-based sampling for errors and slow
  requests, log level tiering and retention policies, and a clear rule about what belongs
  in which signal type.

---

## 8. Practical Engineering Scenarios

```yaml
job_field: devops_cloud
topic: practical_scenarios
difficulty:
  - medium
  - hard
keywords: [scenario, incident, outage, kubernetes_issue, pipeline_failure, cloud_issue]
```

### Scenario A — A Kubernetes pod is OOMKilled repeatedly

- **Initial question.** What does OOMKilled tell you, and what do you check first?
- **Expected reasoning.** The container exceeded its memory limit and the kernel killed
  it (exit code 137). Check the limit, actual usage over time, and whether usage grows
  monotonically (leak) or spikes with traffic (undersized limit).
- **Follow-up.** It is a Java service with a 512 Mi limit. What is a likely cause?
  (A JVM heap setting inconsistent with the container limit, plus non-heap memory —
  metaspace, thread stacks, direct buffers — which the limit also counts.)
- **Deeper.** Why is raising the limit not always the right fix? (It postpones a leak and
  reduces schedulable density; the correct action depends on which pattern the memory
  graph shows.)
- **Troubleshooting question.** How do you get evidence after the container has already
  restarted? (`kubectl logs --previous`, events in `describe`, and retained metrics.)
- **Trade-off.** Higher limits and fewer pods per node versus tighter limits and eviction
  risk.

### Scenario B — A pod is stuck in CrashLoopBackOff after a config change

- **Initial question.** What is your diagnostic sequence?
- **Expected reasoning.** `describe` for events and exit code, `logs --previous` for the
  application error, verify the ConfigMap and Secret keys the pod expects, and confirm the
  image tag actually changed.
- **Follow-up.** Logs show it starts, waits, then exits after 30 seconds. What does that
  suggest? (A liveness probe with too short an initial delay, or a failing dependency
  check at startup.)
- **Deeper.** How would you make a slow-starting service safe? (A startup probe rather
  than an inflated liveness delay.)
- **Trade-off.** Failing fast at startup on a missing dependency versus starting degraded
  and reporting not-ready.

### Scenario C — The CI/CD pipeline suddenly fails on the main branch

Nothing in the application changed.

- **Initial question.** What are the likely causes when code did not change?
- **Expected reasoning.** An unpinned dependency or base image pulled a new version, a
  third-party action or plugin updated, an expired credential or certificate, a runner
  image change, a rate limit, or exhausted disk on the runner.
- **Follow-up.** How do you confirm it quickly? (Re-run an older commit; if that now fails
  too, the change is external.)
- **Deeper.** How do you prevent this class of failure? (Pin base images by digest, pin
  actions to a SHA, use lock files, vendor critical dependencies, and monitor credential
  expiry.)
- **Trade-off.** Pinning everything gives reproducibility but requires deliberate update
  work and can leave known vulnerabilities in place longer.

### Scenario D — A Docker networking problem between two containers

The application container cannot reach the database container.

- **Initial question.** What is the first thing you check?
- **Expected reasoning.** Whether the application is using `localhost` (which is the
  container itself) instead of the service name; then whether both containers share a
  user-defined network; then DNS resolution and port from inside the container.
- **Follow-up.** It works with `docker run --network host`. What does that tell you?
  (A network or name resolution issue, not credentials.)
- **Deeper.** Why does the published port `-p 5432:5432` not help container-to-container
  traffic? (Port publishing exposes to the host, not between containers on a shared
  network.)

### Scenario E — An AWS connectivity problem

An EC2 instance in a private subnet cannot reach an external API.

- **Expected reasoning.** Walk the path: route table entry for `0.0.0.0/0` to a NAT
  gateway, the NAT gateway being in a public subnet with an internet gateway route,
  security group egress rules, network ACLs in both directions, DNS resolution enabled on
  the VPC, and finally the destination's own allowlist.
- **Follow-up.** It can reach some endpoints but not S3. (A VPC endpoint or its policy, or
  a route table missing the gateway endpoint entry.)
- **Deeper.** How would you prove where the packet is dropped? (Flow logs, Reachability
  Analyzer, and testing from a bastion in the same subnet.)
- **Trade-off.** NAT gateway cost versus VPC endpoints versus placing the workload in a
  public subnet with a restricted security group.

### Scenario F — A Terraform state problem

`terraform plan` wants to destroy and recreate a production database.

- **Initial question.** What do you do before anything else?
- **Expected reasoning.** Do not apply. Read the plan to find which attribute forces
  replacement, and determine whether it was a config change, a provider upgrade changing
  defaults, or drift from a manual console change.
- **Follow-up.** Someone renamed a resource block. How do you fix it without data loss?
  (A `moved` block or `terraform state mv` so the existing resource maps to the new
  address.)
- **Deeper.** Someone created the resource manually and it is not in state. (`terraform
  import`, then verify the plan is clean.)
- **Prevention.** `prevent_destroy` on stateful resources, mandatory plan review in CI,
  and separate state for data stores.

### Scenario G — High CPU and memory on a production Linux host

- **Expected reasoning.** `top` to identify the process and distinguish user CPU, system
  CPU, and I/O wait; `free -h` and swap usage; check for a fork bomb or runaway process,
  a stuck log rotation, or a backup job. Correlate with the deploy timeline.
- **Follow-up.** Load average is 40 on an 8-core box but CPU is mostly idle. (Processes
  blocked on I/O — check `iostat` and disk latency.)
- **Deeper.** How do you stabilise without losing the evidence? (Capture a process list,
  stack, and metrics snapshot before restarting.)

### Scenario H — A service outage with no obvious cause

Users report errors; dashboards are green.

- **Expected reasoning.** Suspect the monitoring blind spot: are you measuring the user's
  path or only internal health? Check the edge (DNS, certificate expiry, load balancer
  target health, CDN), then dependencies outside your dashboards, then a recent change in
  any system including infrastructure.
- **Follow-up.** How does an expired TLS certificate present? (Client-side failures with a
  healthy backend and no application errors.)
- **Deeper.** What do you change afterwards? (Synthetic checks from outside, certificate
  expiry alerting, and an SLI measured at the user's vantage point.)

### Scenario I — Log investigation after a suspected breach of behaviour

An endpoint is being hit far more than usual from a small set of IPs.

- **Expected reasoning.** Aggregate access logs by IP, user agent, path, and status code
  over time; distinguish a crawler from credential stuffing from a legitimate integration
  gone wrong. Check authentication failure rate and any `403` pattern.
- **Follow-up.** How do you mitigate quickly without blocking legitimate users? (Rate
  limiting per identity, WAF rule, or temporary IP throttle, then a durable fix.)
- **Deeper.** What logging would have made this faster? (Structured access logs with
  identity, retained long enough, and an alert on authentication failure rate.)

---

## 9. Troubleshooting Knowledge

```yaml
job_field: devops_cloud
topic: troubleshooting
difficulty:
  - medium
  - hard
keywords: [troubleshooting, methodology, incident_response, root_cause, runbook, evidence]
```

**Method beats tool knowledge.** A reliable operational method:

1. **Establish impact.** What is broken, for whom, since when, and how bad.
2. **Mitigate before diagnosing** when users are affected — roll back, scale up, fail
   over, shed load — while preserving evidence.
3. **Localise the layer.** Client, DNS, load balancer, network, orchestrator, application,
   database, or dependency. Bisect rather than guess.
4. **Correlate with change.** Most incidents follow a change: a deploy, a config edit, a
   certificate expiry, a scaled dependency, or a traffic shift.
5. **Form and test one hypothesis at a time.** Changing three things at once destroys your
   ability to attribute the fix.
6. **Fix, verify, and write it up.** Blameless review with an action item that removes the
   class of failure, not just this instance.

**Layer-specific first checks.**

- **DNS** — `dig` the name from the affected host; check TTL and whether a recent change is
  still propagating.
- **Connectivity** — `nc -zv host port`; connection refused means nothing is listening,
  timeout usually means a firewall or security group is dropping.
- **TLS** — check certificate expiry and chain; expired certificates cause total,
  sudden failures.
- **Load balancer** — target health, health check path and port, and whether the check
  passes from the balancer's own network position.
- **Kubernetes** — events first (`kubectl get events --sort-by=.lastTimestamp`), then pod
  status, then endpoints, then node conditions.
- **Disk** — `df -h` and inode exhaustion (`df -i`), which presents as "no space" with
  free bytes available.
- **Memory** — check for OOM kills in `dmesg` or the kernel log, not just current usage.
- **Time** — clock skew breaks TLS, tokens, and certificate validation.

**Evidence preservation.** Before restarting anything, capture logs, a process list,
metrics screenshots, and where possible a heap or thread dump. A restart that fixes the
symptom and destroys the evidence guarantees a repeat incident.

---

## 10. Architecture and System Design

```yaml
job_field: devops_cloud
topic: platform_architecture
difficulty:
  - medium
  - hard
keywords: [platform, architecture, environments, network_topology, gitops, service_mesh]
```

Architecture decisions a DevOps or platform engineer owns:

- **Environment topology.** Separate accounts, subscriptions, or projects per environment
  give the strongest blast-radius isolation and cleaner cost attribution than separate
  namespaces or tags within one account.
- **Network topology.** Public subnets for load balancers and NAT, private subnets for
  application and data tiers, no direct internet exposure for databases, and a bastion or
  session-manager style access path rather than public SSH.
- **Container platform choice.** Managed Kubernetes buys portability and a huge ecosystem
  at the cost of real operational complexity. A managed container service (ECS, Cloud Run,
  App Runner, Container Apps) is often the correct answer for a small team. Plain VMs with
  an autoscaling group remain valid. **Kubernetes is not a default; it is a decision with
  a staffing cost.**
- **Service mesh.** Provides mTLS, retries, traffic splitting, and detailed telemetry
  without application changes; costs a sidecar per pod, added latency, and a substantial
  operational learning curve. Justified at meaningful service count, rarely before.
- **GitOps versus pipeline-push deployment.** Pull-based reconciliation gives drift
  correction and no cluster credentials in CI; push-based is simpler and more familiar.
- **Artifact strategy.** Build once, promote the same immutable artifact through
  environments, with configuration injected per environment.
- **Golden paths.** A platform team's highest-leverage output is a paved road — templates,
  modules, and pipelines — that makes the secure, observable, reliable option the easiest
  one.

Cloud-side design (VPC sizing, HA patterns, DR strategy, serverless and event-driven
architecture, cost optimisation) is covered in depth in the cloud architecture guide.

---

## 11. Security

```yaml
job_field: devops_cloud
topic: cloud_security
difficulty:
  - medium
  - hard
keywords: [devsecops, secrets, image_scanning, rbac, network_policy, supply_chain, least_privilege]
```

Security is a pipeline and platform concern, not a final gate.

- **Identity and access.** Least privilege everywhere, roles over long-lived keys,
  short-lived credentials via OIDC federation, MFA on human access, and periodic review of
  unused permissions.
- **Secrets management.** A dedicated secret store (cloud secret manager, Vault, or the
  platform's mechanism), injected at runtime, never in images, environment files in Git, or
  Terraform variables committed to the repository. Rotate on a schedule and immediately on
  exposure. Note that Kubernetes Secrets are base64-encoded, not encrypted, unless etcd
  encryption at rest is enabled.
- **Supply chain.** Pin base images by digest, scan images and dependencies in CI, generate
  an SBOM, sign artifacts and verify signatures at deploy, and pin third-party CI actions to
  a commit SHA. Software supply chain failures are their own category in the OWASP Top
  10:2025, reflecting how much attack activity has moved here.
- **Network security.** Default-deny NetworkPolicies in the cluster, security groups scoped
  to the minimum, private subnets for data tiers, no `0.0.0.0/0` SSH, and TLS for internal
  traffic too.
- **Runtime hardening.** Non-root containers, read-only root filesystems, dropped
  capabilities, no privileged containers, and pod security standards enforced by admission
  control.
- **Audit and detection.** Cloud API audit logs enabled and retained, alerting on
  privilege escalation and policy changes, and immutable log storage so an attacker cannot
  erase their tracks.
- **Configuration scanning.** Static analysis of Terraform and Kubernetes manifests catches
  public buckets, open security groups, and missing encryption before they exist.

**The shared responsibility model** determines which of these are yours. In managed
services the provider handles more of the stack, but IAM configuration, network rules, and
data protection remain the customer's responsibility in every model.

The cybersecurity guide holds the canonical depth on cryptography, threat modelling,
detection engineering, and incident response.

---

## 12. Performance, Reliability, and Scalability

```yaml
job_field: devops_cloud
topic: reliability
difficulty:
  - medium
  - hard
keywords: [high_availability, fault_tolerance, scalability, capacity, autoscaling, dr, resilience]
```

**High availability is not fault tolerance and neither is disaster recovery.**

- **High availability** minimises downtime through redundancy and fast failover; a brief
  interruption is acceptable.
- **Fault tolerance** means the system continues operating correctly through a component
  failure, with no interruption — more expensive, and usually applied only to specific
  components.
- **Disaster recovery** is restoring service after a major failure, measured by **RTO**
  (how long until service is restored) and **RPO** (how much data loss is acceptable).

**Redundancy patterns.** Active-active spreads load across all instances and uses capacity
efficiently but requires state coordination. Active-passive keeps a standby ready, which is
simpler but wastes capacity and has untested failover risk unless drilled.

**Scaling.** Vertical scaling is simple with a ceiling and usually requires a restart.
Horizontal scaling requires statelessness and a load balancing story but scales far
further. Autoscaling needs the right signal (queue depth or request rate often beats CPU),
sensible cooldowns to avoid flapping, and headroom for the time it takes capacity to
arrive — an autoscaler that reacts in three minutes does not save you from a thirty-second
spike.

**Capacity planning.** Know your saturation point through load testing, keep headroom for
failover (if you lose an AZ, the remaining ones must absorb the load), and watch the
resource that saturates first — often database connections or a downstream rate limit
rather than CPU.

**Resilience patterns in operations.** Timeouts, retries with jitter, circuit breakers,
bulkheads, graceful degradation, and load shedding. Also: **backpressure** — a system that
accepts more work than it can process converts a slowdown into a collapse.

**Backups are not disaster recovery until restore is tested.** Verify restores on a
schedule, and store backups in a separate account or region so that whatever destroys
production cannot also destroy the backups.

**Cost as an operational dimension.** Right-sizing, autoscaling to zero where possible,
storage lifecycle policies, avoiding unnecessary cross-AZ and egress traffic, and
committed-use discounts for stable baseline load. Cost optimisation without reliability
analysis is how single-AZ production deployments happen.

---

## 13. Common Candidate Mistakes

```yaml
job_field: devops_cloud
topic: common_mistakes
difficulty:
  - easy
  - medium
  - hard
keywords: [mistakes, misconceptions, devops_pitfalls]
```

- Saying "Kubernetes is a container runtime" or "Kubernetes replaced Docker".
- Treating Docker and containerization as the same thing.
- Treating Terraform and Infrastructure as Code as the same thing.
- Treating AWS and cloud computing as the same thing.
- Describing CrashLoopBackOff as a cause rather than a symptom.
- Not knowing that `localhost` inside a container refers to the container.
- Pointing a liveness probe at a downstream dependency.
- Running containers as root and baking secrets into images.
- Storing Terraform state locally, or not knowing that state contains plaintext secrets.
- Using `latest` image tags and then being unable to say what is running in production.
- Claiming multi-AZ deployment gives disaster recovery from a regional failure.
- Having backups but never testing a restore.
- Alerting on causes (CPU) instead of symptoms (error rate), then complaining about noise.
- Adding high-cardinality labels to metrics.
- Rebuilding the artifact per environment instead of promoting one artifact.
- Retrying aggressively without backoff or jitter, amplifying an outage.
- Recommending Kubernetes or a service mesh for a three-service application with two
  engineers.
- Describing DevOps purely as a toolchain with no mention of delivery outcomes or culture.

---

## 14. Interview Evaluation Points

```yaml
job_field: devops_cloud
topic: evaluation_points
difficulty:
  - easy
  - medium
  - hard
keywords: [evaluation, rubric, devops_signals, assessment]
```

An interviewer should be able to determine whether the candidate understands:

- **Concept versus tool** — that containerization, IaC, cloud computing, and orchestration
  are concepts with multiple implementations.
- **What actually happens underneath** — namespaces and cgroups behind containers, the
  reconciliation loop behind Kubernetes, the state file behind Terraform.
- **Diagnostic method** — whether they gather evidence and bisect, or start changing
  things. This is the strongest signal in the field.
- **Failure thinking** — whether they can name the failure modes of their own design and
  what happens when each dependency is unavailable.
- **Blast radius awareness** — whether they separate environments, limit permissions, and
  think about what one bad apply or one bad deploy can reach.
- **Reliability vocabulary used precisely** — HA, fault tolerance, DR, RTO, RPO, SLO, and
  error budget used correctly rather than interchangeably.
- **Operational empathy** — whether they consider the person who will be paged at 3 a.m.:
  runbooks, actionable alerts, and debuggability.
- **Cost and complexity judgement** — whether they can recommend the *simpler* option when
  it fits, and justify the complex one when it does not.
- **Security as default** — least privilege, no secrets in images or repositories, and
  scanning in the pipeline mentioned without being prompted.

**Adaptive guidance.** A strong Kubernetes answer should escalate to cluster upgrades,
multi-region reliability, or platform design. A weak Kubernetes answer should step down to
Linux fundamentals, Docker basics, or CI/CD concepts — not to another Kubernetes
sub-topic, which is the most common bad follow-up in this field.

---

## 15. Cross-Topic Relationships

```yaml
job_field: devops_cloud
topic: cross_topic_relationships
difficulty: medium
keywords: [relationships, topic_map, devops_dependencies]
```

Distinctions that must not be collapsed:

- **Containerization is not Docker.** The OS-level isolation technique versus one
  implementation and toolchain. Alternatives include containerd, Podman, and CRI-O.
- **Kubernetes is not Docker.** An orchestration platform versus a container platform; the
  kubelet talks to a CRI runtime, and `dockershim` was removed in v1.24.
- **Infrastructure as Code is not Terraform.** The practice versus one tool; others include
  CloudFormation, Pulumi, Bicep, and OpenTofu.
- **Cloud computing is not AWS.** The delivery model versus one provider.
- **Git is not GitHub.** A distributed VCS versus a hosting platform.
- **CI is not CD, and continuous delivery is not continuous deployment.**
- **Monitoring is not observability.** Predefined signals versus the ability to ask new
  questions.
- **High availability is not disaster recovery is not fault tolerance.**
- **Configuration management is not immutable infrastructure.** Converging existing hosts
  versus replacing them.
- **A namespace is not a security boundary** in Kubernetes without RBAC and
  NetworkPolicies.
- **Deployment is not release.** Feature flags separate them.

Topic progression for adaptive interviews (easy to hard):

`linux -> bash -> networking -> git -> ci_cd -> containerization -> docker -> kubernetes -> infrastructure_as_code -> terraform -> observability -> reliability -> platform_architecture`

Breadth track when the candidate stalls on one line (use this for a forced topic change
after repeated weak answers):

- Weak on Kubernetes → `linux` or `ci_cd` fundamentals
- Weak on Terraform → `git` or `cloud provider basics`
- Weak on distributed systems → `linux` or `networking` fundamentals
- Weak on Docker → `linux` processes and filesystem
- Weak on observability → `logging` basics and `linux` log locations

Canonical depth lives elsewhere for:

- VPC design, HA and DR patterns, serverless, cost optimisation, event-driven cloud
  architecture — `cloud_architecture_interview_guide.md`
- Application-level caching, transactions, messaging semantics —
  `backend_development_interview_guide.md`
- Cryptography, threat modelling, SIEM, incident response —
  `cybersecurity_interview_guide.md`
- Kafka, Spark, Airflow, data pipeline operations —
  `data_engineering_interview_guide.md`
- Git internals, algorithms, design patterns —
  `software_engineering_interview_guide.md`
- Test automation in pipelines, flaky test triage —
  `qa_testing_interview_guide.md`
