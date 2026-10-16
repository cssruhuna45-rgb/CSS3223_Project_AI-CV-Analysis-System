"""
App Roadmap Generator module.
Generates structured 14-day personalized learning roadmaps based on interview
feedback, candidate weaknesses, and skill gaps using Gemini LLM and RAG context,
with deterministic domain-specific fallback for maximum resilience.
"""

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Set

from langchain_core.prompts import PromptTemplate

from app.ai_errors import is_rate_limit_error
from app.llm_config import build_llm
from app.roadmap.schemas import (
    DayPlan,
    Milestone,
    RoadmapGenerateRequest,
    RoadmapResponse,
)

logger = logging.getLogger("roadmap.generator")

ROADMAP_PROMPT = PromptTemplate(
    input_variables=[
        "target_role",
        "job_field",
        "duration_days",
        "overall_score",
        "strengths_text",
        "weaknesses_text",
        "rag_context",
    ],
    template="""You are a principal engineer and technical career mentor designing an intensive, personalized {duration_days}-day upskilling roadmap for a candidate targeting a {target_role} role ({job_field}).

Candidate Background & Interview Evaluation:
- Overall Score: {overall_score} / 100
- Demonstrated Strengths:
{strengths_text}
- Identified Gaps, Weaknesses & Missing Concepts:
{weaknesses_text}

Curriculum & Reference Insights:
{rag_context}

INSTRUCTIONS:
1. Design a rigorous, day-by-day learning schedule spanning exactly {duration_days} days.
2. Group the {duration_days} days into 4 progressive milestones:
   - Phase 1 (Days 1 to 4): Core Foundations & Bridging Interview Gaps
   - Phase 2 (Days 5 to 7): Deep-Dive Architecture & Data Systems
   - Phase 3 (Days 8 to 11): Practical Hands-on Projects & Scalability
   - Phase 4 (Days 12 to 14): System Design Synthesis & Mock Interview Readiness
3. Focus intensively on fixing the candidate's exact weaknesses and missed questions. Do not waste time reteaching their strengths.
4. Each day must include:
   - day: integer from 1 to {duration_days}
   - title: concise title
   - phase: name of the milestone phase
   - focus_area: concise domain area (e.g., Concurrency, Database Indexing, Distributed Systems)
   - objective: specific learning outcome
   - tasks: 2 to 4 actionable, hands-on tasks (coding exercises, architecture diagrams, benchmark analysis)
   - resources: 2 to 3 high-quality learning resources (official documentation, guides, practice problem topics)
   - estimated_hours: realistic study commitment (typically 2-3 hours)
   - completed: false

RETURN ONLY VALID JSON matching this exact structure with NO markdown fences, NO preamble, and NO extra commentary:
{{
  "title": "14-Day Accelerated Upskilling Roadmap: {target_role}",
  "target_role": "{target_role}",
  "duration_days": {duration_days},
  "summary": "Detailed strategic overview of this 14-day path addressing the candidate's gaps.",
  "focus_areas": [
    "Focus Area 1",
    "Focus Area 2",
    "Focus Area 3"
  ],
  "milestones": [
    {{
      "phase": 1,
      "title": "Core Foundations & Bridging Interview Gaps",
      "day_range": "Days 1 - 4",
      "description": "Milestone goal description."
    }},
    {{
      "phase": 2,
      "title": "Deep-Dive Architecture & Data Systems",
      "day_range": "Days 5 - 7",
      "description": "Milestone goal description."
    }},
    {{
      "phase": 3,
      "title": "Practical Hands-on Projects & Scalability",
      "day_range": "Days 8 - 11",
      "description": "Milestone goal description."
    }},
    {{
      "phase": 4,
      "title": "System Design Synthesis & Mock Readiness",
      "day_range": "Days 12 - 14",
      "description": "Milestone goal description."
    }}
  ],
  "days": [
    {{
      "day": 1,
      "title": "...",
      "phase": "Core Foundations & Bridging Interview Gaps",
      "focus_area": "...",
      "objective": "...",
      "tasks": ["Task 1", "Task 2"],
      "resources": ["Resource 1", "Resource 2"],
      "estimated_hours": 2,
      "completed": false
    }}
  ]
}}
""",
)


def _get_llm():
    return build_llm(temperature=0.3)


def _clean_json_str(raw: str) -> str:
    cleaned = raw.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    return cleaned.strip()


def _extract_rag_context(query: str, k: int = 3) -> str:
    try:
        from app.rag.retriever import retrieve_relevant_chunks
        from app.rag.vector_store import get_or_create_vector_store
        store = get_or_create_vector_store()
        docs = retrieve_relevant_chunks(vector_store=store, query=query, k=k)
        if not docs:
            return "No additional curriculum chunks found in knowledge base."
        return "\n---\n".join([d.page_content[:500] for d in docs])
    except Exception as exc:
        logger.warning("RAG retrieval skipped for roadmap: %s", exc)
        return "Standard technical competency framework applied."


def _build_fallback_roadmap(request: RoadmapGenerateRequest) -> RoadmapResponse:
    """
    Deterministic, highly specific fallback roadmap that ensures the feature
    works completely without external LLM dependencies or during rate limits.
    """
    role = request.target_role or "Software Engineer"
    duration = request.duration_days or 14

    # Extract all weakness concepts
    gaps: List[str] = []
    if request.weaknesses:
        gaps.extend(request.weaknesses)
    if request.missing_skills:
        gaps.extend(request.missing_skills)
    if request.per_question_feedback:
        for item in request.per_question_feedback:
            missing = item.get("what_was_missing")
            if missing and isinstance(missing, str) and missing.strip():
                gaps.append(missing.strip())

    if not gaps:
        gaps = [
            "Concurrency control, thread safety, and memory management",
            "Database indexing strategies and query execution plan optimization",
            "Distributed caching, event streaming, and API resilience patterns",
            "System design scalability, load balancing, and high availability",
        ]

    focus_areas = [
        "Core Engineering & Weakness Remediation",
        "Data Architecture & High-Performance Persistence",
        "Distributed Systems, Microservices & Reliability",
        "System Architecture & Live Technical Interview Mastery",
    ]

    milestones = [
        Milestone(
            phase=1,
            title="Core Foundations & Bridging Interview Gaps",
            day_range="Days 1 - 4",
            description="Deepen fundamental knowledge in specific weak areas identified during the interview evaluation.",
        ),
        Milestone(
            phase=2,
            title="Deep-Dive Architecture & Data Systems",
            day_range="Days 5 - 7",
            description="Master database internals, relational schema design, indexing, and transaction isolation levels.",
        ),
        Milestone(
            phase=3,
            title="Practical Hands-on Projects & Scalability",
            day_range="Days 8 - 11",
            description="Implement resilient cloud-native patterns, distributed caching, and asynchronous messaging pipelines.",
        ),
        Milestone(
            phase=4,
            title="System Design Synthesis & Mock Readiness",
            day_range="Days 12 - 14",
            description="End-to-end architectural synthesis, code review practices, and timed mock interview drills.",
        ),
    ]

    days: List[DayPlan] = []

    # Map the candidate's gaps directly into Days 1 to 4
    gap_samples = gaps[:4] if len(gaps) >= 4 else (gaps + ["Core language internals and runtime execution"] * 4)[:4]

    # Day 1
    days.append(
        DayPlan(
            day=1,
            title=f"Day 1: Bridging Gap — {gap_samples[0][:50]}",
            phase="Core Foundations & Bridging Interview Gaps",
            focus_area="Core Weakness Remediation",
            objective=f"Develop comprehensive mastery of {gap_samples[0]}.",
            tasks=[
                f"Study fundamental concepts and anti-patterns regarding {gap_samples[0]}.",
                "Write working unit and integration tests verifying correct behavior and boundary conditions.",
                "Review interview question transcripts and draft a revised, complete technical model answer.",
            ],
            resources=[
                "Official Language / Framework Documentation & Specifications",
                "Deep-Dive Architecture Guide on Core Runtime Fundamentals",
            ],
            estimated_hours=2,
        )
    )

    # Day 2
    days.append(
        DayPlan(
            day=2,
            title=f"Day 2: Bridging Gap — {gap_samples[1][:50]}",
            phase="Core Foundations & Bridging Interview Gaps",
            focus_area="Core Weakness Remediation",
            objective=f"Deepen practical knowledge of {gap_samples[1]}.",
            tasks=[
                f"Analyze common pitfalls and edge cases in {gap_samples[1]}.",
                "Build a standalone reproduction script demonstrating failure vs correct handling.",
                "Refactor codebase to eliminate identified anti-patterns.",
            ],
            resources=[
                "Baeldung / High-Performance Java & System Engineering Guides",
                "Clean Architecture & Resilient Engineering Standards",
            ],
            estimated_hours=2,
        )
    )

    # Day 3
    days.append(
        DayPlan(
            day=3,
            title=f"Day 3: Memory Models, Concurrency & Thread Safety",
            phase="Core Foundations & Bridging Interview Gaps",
            focus_area="Concurrency & Internals",
            objective="Master thread synchronization primitives, locks, and non-blocking data structures.",
            tasks=[
                "Implement a thread-safe bounded queue using mutexes and condition variables.",
                "Identify race conditions and deadlocks using thread profiling tools.",
                "Study volatile variable semantics and hardware memory barriers.",
            ],
            resources=[
                "Java Concurrency in Practice / Systems Concurrency Handbook",
                "Modern Multi-Threading and Deadlock Prevention Principles",
            ],
            estimated_hours=3,
        )
    )

    # Day 4
    days.append(
        DayPlan(
            day=4,
            title=f"Day 4: Deep Concept Consolidation — {gap_samples[2][:50]}",
            phase="Core Foundations & Bridging Interview Gaps",
            focus_area="Core Weakness Remediation",
            objective="Consolidate core competencies and review self-assessment quiz.",
            tasks=[
                f"Synthesize comprehensive summary notes on {gap_samples[2]}.",
                "Solve 3 technical algorithmic or architectural problems covering this domain.",
                "Conduct a 30-minute self-paced verbal explanation drill.",
            ],
            resources=[
                "Curated Technical Interview Question Bank & System Reference",
                "Engineering Best Practices & Code Review Checklist",
            ],
            estimated_hours=2,
        )
    )

    # Day 5
    days.append(
        DayPlan(
            day=5,
            title="Day 5: Relational Schema Design & Index Optimization",
            phase="Deep-Dive Architecture & Data Systems",
            focus_area="Data Systems",
            objective="Understand B-Tree indexes, composite keys, and EXPLAIN ANALYZE query planning.",
            tasks=[
                "Set up a sample database with 100,000+ rows and benchmark unindexed vs indexed queries.",
                "Inspect query execution plans for sequential scans vs index scans.",
                "Optimize slow N+1 query patterns using eager fetching and joins.",
            ],
            resources=[
                "Use The Index, Luke! Guide to Database Performance",
                "PostgreSQL / MySQL Query Optimization & Execution Engine Docs",
            ],
            estimated_hours=2,
        )
    )

    # Day 6
    days.append(
        DayPlan(
            day=6,
            title="Day 6: Transactions, ACID Guarantees & Isolation Levels",
            phase="Deep-Dive Architecture & Data Systems",
            focus_area="Data Systems",
            objective="Master Read Committed, Repeatable Read, and Serializable isolation anomalies.",
            tasks=[
                "Reproduce Dirty Read, Non-Repeatable Read, and Phantom Read in concurrent database sessions.",
                "Implement optimistic locking with version columns in JPA/Hibernate.",
                "Analyze pessimistic locking strategies for high-contention balance transfers.",
            ],
            resources=[
                "Designing Data-Intensive Applications (Kleppmann) - Chapter 7",
                "Martin Fowler's Patterns of Enterprise Application Architecture",
            ],
            estimated_hours=3,
        )
    )

    # Day 7
    days.append(
        DayPlan(
            day=7,
            title="Day 7: Caching Strategies & Cache-Aside Invalidation",
            phase="Deep-Dive Architecture & Data Systems",
            focus_area="Performance & Caching",
            objective="Implement multi-layer caching with Redis, write-through, and TTL invalidation.",
            tasks=[
                "Design a Redis cache-aside layer with fallback to primary database.",
                "Mitigate cache stampede, cache penetration, and cache avalanche scenarios.",
                "Measure P99 latency before and after caching implementation.",
            ],
            resources=[
                "Redis Best Practices & High-Performance Architecture Documentation",
                "System Design Primer: Caching Strategies and Eviction Policies",
            ],
            estimated_hours=2,
        )
    )

    # Day 8
    days.append(
        DayPlan(
            day=8,
            title="Day 8: RESTful API Contract Design, Idempotency & Rate Limiting",
            phase="Practical Hands-on Projects & Scalability",
            focus_area="API Architecture",
            objective="Build resilient API contracts with idempotency keys and token bucket rate limits.",
            tasks=[
                "Design an idempotent payment processing endpoint using unique idempotency tokens.",
                "Implement rate limiting using leaky bucket or token bucket algorithm.",
                "Draft OpenAPI 3.0 specification with complete error response schemas.",
            ],
            resources=[
                "Stripe Engineering: Designing Idempotent APIs",
                "RFC 7807: Problem Details for HTTP APIs Specification",
            ],
            estimated_hours=2,
        )
    )

    # Day 9
    days.append(
        DayPlan(
            day=9,
            title="Day 9: Event-Driven Architecture & Message Queues",
            phase="Practical Hands-on Projects & Scalability",
            focus_area="Distributed Systems",
            objective="Integrate asynchronous event streams using Kafka or RabbitMQ.",
            tasks=[
                "Implement a producer-consumer workflow with at-least-once delivery guarantees.",
                "Handle poison pill messages with Dead Letter Queues (DLQ) and retry backoff.",
                "Design an outbox pattern to guarantee transactional message publishing.",
            ],
            resources=[
                "Apache Kafka Fundamentals & Event-Driven Architecture Guide",
                "Enterprise Integration Patterns: Messaging Channels & Routers",
            ],
            estimated_hours=3,
        )
    )

    # Day 10
    days.append(
        DayPlan(
            day=10,
            title="Day 10: Containerization, Docker & Multi-Stage Builds",
            phase="Practical Hands-on Projects & Scalability",
            focus_area="DevOps & Deployment",
            objective="Package applications securely with minimal attack surfaces and optimized layers.",
            tasks=[
                "Create a multi-stage Dockerfile reducing final image footprint by >70%.",
                "Configure non-root container users and health check probes.",
                "Write a docker-compose environment orchestrating backend, database, and cache.",
            ],
            resources=[
                "Docker Best Practices for Production Containerization",
                "OWASP Docker Container Security Cheat Sheet",
            ],
            estimated_hours=2,
        )
    )

    # Day 11
    days.append(
        DayPlan(
            day=11,
            title="Day 11: Distributed Observability: Metrics, Tracing & Logging",
            phase="Practical Hands-on Projects & Scalability",
            focus_area="Observability",
            objective="Instrument distributed traces with OpenTelemetry and structured logging.",
            tasks=[
                "Implement correlation IDs across HTTP requests and asynchronous log entries.",
                "Export Prometheus metrics for request count, latency distribution, and error rates.",
                "Formulate an alert threshold strategy for SLA breach prevention.",
            ],
            resources=[
                "OpenTelemetry Documentation & Distributed Tracing Standards",
                "Google Site Reliability Engineering (SRE) Book: Monitoring Systems",
            ],
            estimated_hours=2,
        )
    )

    # Day 12
    days.append(
        DayPlan(
            day=12,
            title="Day 12: High-Level System Design Workshop (URL Shortener / Feed)",
            phase="System Design Synthesis & Mock Readiness",
            focus_area="System Design",
            objective="Perform end-to-end system design covering traffic estimation, data modeling, and scaling.",
            tasks=[
                "Calculate QPS, storage requirements, and bandwidth for a scalable service.",
                "Diagram high-level architecture: DNS, CDN, Load Balancer, App Cluster, Sharded DB.",
                "Document trade-offs (CAP theorem, PACELC theorem, consistency vs latency).",
            ],
            resources=[
                "System Design Primer (Donne Martin) - High Scalability Case Studies",
                "Grokking Modern System Design for Engineers",
            ],
            estimated_hours=3,
        )
    )

    # Day 13
    days.append(
        DayPlan(
            day=13,
            title="Day 13: Behavioral Framing, STAR Technique & Technical Communication",
            phase="System Design Synthesis & Mock Readiness",
            focus_area="Communication",
            objective="Frame technical decisions, trade-offs, and past project challenges using the STAR method.",
            tasks=[
                "Write 3 detailed STAR stories: a complex technical bug, an architectural conflict, and a scaling challenge.",
                "Record a 5-minute verbal walkthrough of a past engineering accomplishment.",
                "Review clarity, conciseness, and structural delivery.",
            ],
            resources=[
                "The Effective Engineer - Communicating High-Impact Technical Work",
                "STAR Technique for Senior Engineering Behavioral Interviews",
            ],
            estimated_hours=2,
        )
    )

    # Day 14
    days.append(
        DayPlan(
            day=14,
            title="Day 14: Simulated AI Technical Interview & Final Readiness Audit",
            phase="System Design Synthesis & Mock Readiness",
            focus_area="Interview Simulation",
            objective="Execute a full mock interview session and verify remediation of all initial weaknesses.",
            tasks=[
                "Complete a full adaptive mock interview session on the platform.",
                "Compare new category scores and per-question verdicts against Day 1 baseline.",
                "Document personal technical strengths portfolio and finalize interview day checklist.",
            ],
            resources=[
                "AI Interview Platform Real-time Adaptive Evaluation Session",
                "Final Technical Checklist & Confident Interview Delivery Guide",
            ],
            estimated_hours=2,
        )
    )

    summary = (
        f"This tailored {duration}-day curriculum accelerates candidate preparation for {role} roles. "
        f"The program starts by aggressively addressing core weaknesses identified in the interview, "
        f"advances through deep data systems and distributed architecture patterns, and concludes "
        f"with system design mastery and simulated interview practice."
    )

    return RoadmapResponse(
        title=f"{duration}-Day Accelerated Upskilling Roadmap: {role}",
        target_role=role,
        duration_days=duration,
        summary=summary,
        focus_areas=focus_areas,
        milestones=milestones,
        days=days[:duration],
    )


def generate_roadmap(request: RoadmapGenerateRequest) -> RoadmapResponse:
    """
    Main entry point for generating a personalized 14-day roadmap.
    Tries Gemini LLM with RAG context first, then seamlessly falls back
    to deterministic domain-expert generation on rate limits or errors.
    """
    role = request.target_role or "Software Engineer"
    field = request.job_field or "software_engineering"
    duration = request.duration_days or 14

    strengths = request.strengths or ["General engineering background"]
    weaknesses = request.weaknesses or []
    if request.missing_skills:
        weaknesses.extend(request.missing_skills)
    if request.per_question_feedback:
        for q in request.per_question_feedback:
            missing = q.get("what_was_missing")
            if missing and isinstance(missing, str) and missing.strip():
                weaknesses.append(missing.strip())

    if not weaknesses:
        weaknesses = ["In-depth architecture trade-offs", "Production concurrency & indexing"]

    gemini_key = os.getenv("GEMINI_API_KEY")
    if not gemini_key:
        logger.info("GEMINI_API_KEY not set. Using domain-specific fallback roadmap generator.")
        return _build_fallback_roadmap(request)

    rag_query = f"{role} {' '.join(weaknesses[:3])}"
    rag_context = _extract_rag_context(rag_query)

    try:
        llm = _get_llm()
        prompt_val = ROADMAP_PROMPT.format(
            target_role=role,
            job_field=field,
            duration_days=duration,
            overall_score=request.overall_score if request.overall_score is not None else "N/A",
            strengths_text="\n".join([f"- {s}" for s in strengths]),
            weaknesses_text="\n".join([f"- {w}" for w in weaknesses]),
            rag_context=rag_context,
        )

        response = llm.invoke(prompt_val)
        raw_text = response.content if hasattr(response, "content") else str(response)
        cleaned_json = _clean_json_str(raw_text)

        # Parse JSON
        parsed = json.loads(cleaned_json)

        # Build Milestone objects
        milestones = [
            Milestone(
                phase=m.get("phase", i + 1),
                title=m.get("title", f"Phase {i + 1}"),
                day_range=m.get("day_range", f"Days {i * 3 + 1} - {(i + 1) * 3}"),
                description=m.get("description", ""),
            )
            for i, m in enumerate(parsed.get("milestones", []))
        ]

        # Build DayPlan objects
        raw_days = parsed.get("days", [])
        days: List[DayPlan] = []
        for i, d in enumerate(raw_days):
            day_num = d.get("day", i + 1)
            days.append(
                DayPlan(
                    day=day_num,
                    title=d.get("title", f"Day {day_num}: Core Competencies"),
                    phase=d.get("phase", "Foundation"),
                    focus_area=d.get("focus_area", "Engineering"),
                    objective=d.get("objective", "Master key topic."),
                    tasks=d.get("tasks", ["Read documentation", "Complete practice exercises"]),
                    resources=d.get("resources", ["Official Documentation"]),
                    estimated_hours=d.get("estimated_hours", 2),
                    completed=d.get("completed", False),
                )
            )

        # If LLM generated fewer days than requested, supplement with fallback
        if len(days) < duration:
            fallback = _build_fallback_roadmap(request)
            for missing_day in range(len(days) + 1, duration + 1):
                days.append(fallback.days[missing_day - 1])

        return RoadmapResponse(
            title=parsed.get("title", f"{duration}-Day Accelerated Upskilling Roadmap: {role}"),
            target_role=parsed.get("target_role", role),
            duration_days=duration,
            summary=parsed.get("summary", f"Personalized {duration}-day learning path for {role}."),
            focus_areas=parsed.get("focus_areas", ["Core Skills", "Architecture", "Hands-on Practice"]),
            milestones=milestones if milestones else _build_fallback_roadmap(request).milestones,
            days=days[:duration],
        )

    except Exception as exc:
        logger.warning("Gemini roadmap generation encountered error: %s. Using resilient fallback.", exc)
        return _build_fallback_roadmap(request)
