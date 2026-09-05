# Cybersecurity Interview Knowledge Guide

```yaml
job_field: cybersecurity
job_field_name: Cybersecurity
canonical_topics:
  - security_fundamentals
  - cia_triad
  - risk_management
  - authentication
  - authorization
  - access_control
  - cryptography
  - hashing
  - encryption
  - network_security
  - web_security
  - owasp
  - secure_coding
  - vulnerability_management
  - penetration_testing_concepts
  - security_monitoring
  - siem
  - detection_engineering
  - incident_response
  - threat_modeling
  - cloud_security
  - logging
  - security_architecture
  - compliance
difficulty:
  - easy
  - medium
  - hard
```

This document is the canonical interview knowledge base for the **cybersecurity** job
field. It owns the CIA triad and risk framing, cryptography, access control, network and
web security, the OWASP categories, vulnerability management, detection and SIEM, incident
response, threat modelling, and compliance frameworks.

**Scope note on offensive content.** This guide is written for **defensive security and
authorised assessment**. Offensive concepts appear only at the conceptual level needed to
understand and defend against them, and in the context of authorised, scoped engagements
(penetration testing, red teaming, CTFs). It deliberately contains no exploit code, no
attack tooling instructions, and no evasion techniques. Interview candidates are expected
to understand attacker behaviour in order to build defences — that is the framing used
throughout.

---

## 1. Job Field Overview

```yaml
job_field: cybersecurity
topic: security_fundamentals
subtopic: field_overview
difficulty: easy
keywords: [cybersecurity, security_role, blue_team, red_team, governance, responsibilities]
```

Cybersecurity is the practice of protecting systems, networks, and data from unauthorised
access, disruption, modification, and disclosure. It spans prevention, detection, response,
and recovery, and it is a risk management discipline as much as a technical one — perfect
security is not achievable, so the work is about reducing risk to an acceptable level at
justifiable cost.

Common functional areas:

- **Security engineering / architecture** — designing and building controls into systems.
- **Application security** — secure development, code review, dependency and supply chain
  risk.
- **Security operations (blue team)** — monitoring, detection, triage, and incident
  response.
- **Offensive security (red team, penetration testing)** — authorised, scoped simulation of
  attacks to find weaknesses before real attackers do.
- **Governance, risk, and compliance** — policy, standards, audit, and regulatory
  obligations.
- **Cloud and infrastructure security** — identity, network boundaries, and configuration.

**Defensive and offensive work are complementary but distinct.** Offensive work is only
legitimate with explicit written authorisation defining scope, timing, and rules of
engagement. Testing systems you do not own or have permission to test is unlawful in most
jurisdictions regardless of intent, and a candidate who does not raise authorisation
unprompted is signalling a serious gap.

---

## 2. Core Competencies

```yaml
job_field: cybersecurity
topic: core_competencies
difficulty: easy
keywords: [competencies, security_skills, evaluation]
```

1. **Security fundamentals** — CIA triad, risk, threat, vulnerability, defence in depth.
2. **Networking** — TCP/IP, DNS, TLS, firewalls, segmentation, common protocols and ports.
3. **Linux and Windows fundamentals** — permissions, processes, logs, privilege models.
4. **Identity and access management** — authentication factors, SSO, federation, RBAC.
5. **Cryptography** — hashing, symmetric and asymmetric encryption, PKI, TLS, key
   management.
6. **Web application security** — the OWASP categories and their defences.
7. **Secure coding** — input validation, output encoding, parameterisation, secrets.
8. **Vulnerability management** — scanning, CVE and CVSS, prioritisation, remediation.
9. **Penetration testing concepts** — methodology, scoping, authorisation, reporting.
10. **Security monitoring and SIEM** — log sources, correlation, detection rules, tuning.
11. **Incident response** — the lifecycle, containment decisions, forensics basics.
12. **Threat modelling** — STRIDE, attack surface, abuse cases.
13. **Cloud security** — shared responsibility, IAM, network isolation, configuration.
14. **Compliance and frameworks** — NIST CSF, ISO/IEC 27001, PCI DSS, GDPR obligations.

---

## 3. Foundational Knowledge

### 3.1 The CIA Triad and Core Definitions

```yaml
job_field: cybersecurity
topic: cia_triad
difficulty: easy
keywords: [confidentiality, integrity, availability, non_repudiation, authenticity, definitions]
```

**The CIA triad** is the standard framing of security objectives:

- **Confidentiality** — information is disclosed only to authorised parties. Controls:
  encryption, access control, data classification.
- **Integrity** — information is accurate and has not been altered without authorisation.
  Controls: hashing, digital signatures, checksums, change control, database constraints.
- **Availability** — systems and data are accessible when needed. Controls: redundancy,
  backups, DDoS protection, capacity planning.

Frequently added: **authenticity** (the claimed origin is genuine) and **non-repudiation**
(the originator cannot credibly deny the action), both provided by digital signatures and
robust audit logging.

**The three objectives conflict.** Encrypting everything with strict key control improves
confidentiality and can reduce availability if a key is lost. Aggressive lockout after
failed logins improves confidentiality and enables a denial-of-service. Naming the trade-off
is what distinguishes an engineer from someone reciting a definition.

**Vocabulary used precisely:**

- **Asset** — something of value worth protecting.
- **Threat** — a potential cause of an unwanted incident (an actor or an event).
- **Vulnerability** — a weakness that a threat can exploit.
- **Exploit** — the means of taking advantage of a vulnerability.
- **Risk** — the combination of likelihood and impact. Risk exists only where a threat, a
  vulnerability, and an asset intersect. **A vulnerability with no reachable path and no
  valuable asset behind it is a low risk**, which is why raw vulnerability counts are a poor
  metric.
- **Control** — a safeguard that reduces risk; preventive, detective, or corrective, and
  administrative, technical, or physical.

### 3.2 Security Principles

```yaml
job_field: cybersecurity
topic: security_fundamentals
subtopic: principles
difficulty:
  - easy
  - medium
keywords: [least_privilege, defence_in_depth, zero_trust, fail_secure, separation_of_duties]
```

- **Least privilege.** Every identity gets the minimum access needed for its function, for
  the minimum time. The most consistently violated principle in real environments.
- **Defence in depth.** Multiple independent layers, so no single control failure is
  catastrophic. Network segmentation, authentication, authorization, encryption, and
  monitoring each assume the others may fail.
- **Fail secure / fail safe.** On failure, default to denying access. A rule engine that
  allows everything when its policy store is unreachable is a serious design flaw — though
  note that for availability-critical safety systems the correct default can be the
  opposite, which is itself a deliberate decision.
- **Separation of duties.** No single person can complete a sensitive process alone
  (request and approve, develop and deploy to production).
- **Complete mediation.** Every access is checked, every time; do not cache an authorisation
  decision indefinitely.
- **Economy of mechanism.** Simple controls are verifiable; complex ones hide flaws.
- **Open design (Kerckhoffs's principle).** Security must rest on the secrecy of keys, not
  the secrecy of the design. **Security through obscurity is not a control**, though
  obscurity can be a minor supplementary layer.
- **Secure defaults.** The out-of-the-box configuration should be the safe one.
- **Zero trust.** Never trust based on network location. Authenticate and authorise every
  request, verify device and identity continuously, and assume the internal network is
  hostile. It is an architectural direction, not a product.
- **Assume breach.** Design so that a compromise of one component is contained and
  detectable, rather than assuming prevention will always hold.

### 3.3 Risk Management

```yaml
job_field: cybersecurity
topic: risk_management
difficulty:
  - medium
  - hard
keywords: [risk_assessment, likelihood, impact, treatment, residual_risk, threat_intelligence]
```

Security work is prioritisation under limited resources, and risk is the prioritisation
tool.

**Risk assessment** identifies assets, threats, and vulnerabilities, then estimates
likelihood and impact. Qualitative scoring (high/medium/low) is fast and subjective;
quantitative approaches (expected loss, or a structured method such as FAIR) support
budget conversations but demand data that is often unavailable.

**Risk treatment options** — the four choices, all legitimate:

- **Mitigate** — apply controls to reduce likelihood or impact.
- **Transfer** — insurance or contractual shifting; note that reputational and regulatory
  consequences generally cannot be transferred.
- **Avoid** — stop doing the risky activity or remove the feature.
- **Accept** — document and accept, with a named accountable owner and a review date.

**Residual risk** is what remains after controls. Accepting residual risk is a business
decision that must be recorded, not an engineering failure.

**Threat modelling versus threat intelligence.** Threat modelling reasons about what could
go wrong in *your* system's design. Threat intelligence is information about actual
adversaries, their tooling, and their techniques — commonly organised using the **MITRE
ATT&CK** framework, a publicly maintained knowledge base of adversary tactics and
techniques observed in the wild. ATT&CK is widely used to map detection coverage and
identify gaps.

---

## 4. Core Technical Topics

### 4.1 Authentication

```yaml
job_field: cybersecurity
topic: authentication
difficulty:
  - easy
  - medium
  - hard
keywords: [authentication, mfa, factors, password, sso, federation, saml, oidc, passkey]
```

**Authentication establishes identity.** It answers "who are you?" and is distinct from
authorization.

**Authentication factors:** something you know (password, PIN), something you have (token,
phone, smart card), and something you are (biometric). **Multi-factor authentication**
requires factors from different categories — a password plus a security question is still
one factor.

**MFA strength varies substantially.** SMS one-time codes are vulnerable to SIM swapping and
interception; app-based time-based codes are stronger but phishable in real time;
hardware security keys and passkeys using the FIDO2/WebAuthn standards are phishing-resistant
because the credential is cryptographically bound to the origin. Recommending "just add MFA"
without distinguishing these is a shallow answer.

**Password handling.**

- Store as a salted hash using a deliberately slow, memory-hard key derivation function —
  **Argon2, scrypt, or bcrypt**. Never a fast general-purpose hash such as SHA-256 alone,
  and never reversible encryption.
- A **salt** is a unique random value per password that defeats precomputed rainbow tables
  and ensures two identical passwords hash differently. A **pepper** is an additional secret
  stored separately from the database.
- **Current guidance emphasises length over composition rules.** NIST SP 800-63B recommends
  long passphrases, screening against known-breached password lists, and moving away from
  mandatory periodic rotation and arbitrary complexity rules, which push users toward
  predictable patterns.
- **Credential stuffing** exploits password reuse across sites; defences are breached-password
  screening, MFA, rate limiting, and anomaly detection.
- **Error messages must not reveal** whether the username or the password was wrong, and
  timing should not differ measurably either.

**Single sign-on and federation.** SAML (XML-based, common in enterprise) and OpenID Connect
(built on OAuth 2.0, common in modern and consumer applications) let an identity provider
authenticate users for many applications. Benefits: central policy, MFA in one place, and
immediate deprovisioning. Risk: the identity provider becomes a very high-value target and a
single point of failure.

**Session management.** Generate session identifiers with a cryptographically secure random
source, regenerate the identifier on privilege change to prevent session fixation, set
`HttpOnly`, `Secure`, and `SameSite` on session cookies, enforce idle and absolute timeouts,
and invalidate server-side on logout and password change.

### 4.2 Authorization and Access Control

```yaml
job_field: cybersecurity
topic: authorization
difficulty:
  - medium
  - hard
keywords: [authorization, rbac, abac, mac, dac, least_privilege, privilege_escalation, idor]
```

**Authorization determines what an authenticated identity may do.** Confusing it with
authentication is the single most common conceptual error in security interviews.

**Access control models.**

- **DAC (Discretionary)** — the resource owner grants access. Flexible, hard to govern; the
  classic filesystem model.
- **MAC (Mandatory)** — a system-enforced policy based on labels and clearances, which users
  cannot override. Used in high-assurance and military contexts; SELinux and AppArmor apply
  the idea to Linux processes.
- **RBAC (Role-Based)** — permissions attach to roles, roles attach to users. Auditable and
  manageable; coarse-grained and prone to role explosion as exceptions accumulate.
- **ABAC (Attribute-Based)** — decisions evaluate attributes of subject, resource, action,
  and environment (time, location, device posture). Expressive; harder to reason about,
  test, and audit.
- **ReBAC (Relationship-Based)** — access derives from relationships in a graph ("owner of",
  "member of team that owns"). Increasingly common for collaboration products.

**Common authorization failures.**

- **Insecure Direct Object Reference (IDOR)** — the system checks that you are logged in but
  not that the requested object is yours. Changing an identifier in the URL returns another
  user's data. This is a form of broken access control and remains extremely common.
- **Missing function-level access control** — an administrative endpoint that is merely
  hidden in the UI rather than protected on the server.
- **Privilege escalation** — vertical (a normal user gains administrative rights) and
  horizontal (a user acts as another user of the same level).
- **Confused deputy** — a privileged component performs an action on behalf of a caller
  without checking the caller's own permission. Server-side request forgery is a form of
  this.

**Design rules.** Enforce server-side on every request, deny by default, centralise the
decision so it cannot be forgotten, perform object-level ownership checks, re-check on
every access rather than caching indefinitely, and log denials.

### 4.3 Cryptography Fundamentals

```yaml
job_field: cybersecurity
topic: cryptography
difficulty:
  - medium
  - hard
keywords: [symmetric, asymmetric, aes, rsa, key_exchange, digital_signature, pki, tls, key_management]
```

**Symmetric encryption** uses one shared key for encryption and decryption. Fast, suitable
for bulk data. **AES** is the standard block cipher, and authenticated modes such as
**AES-GCM** provide both confidentiality and integrity. ChaCha20-Poly1305 is a common
alternative, especially where hardware AES acceleration is absent. The challenge is key
distribution.

**Asymmetric encryption** uses a mathematically related key pair: the public key encrypts or
verifies, the private key decrypts or signs. **RSA** and **elliptic curve** algorithms (ECDSA,
Ed25519, ECDH) are the common families; elliptic curve gives equivalent security with much
smaller keys. Asymmetric operations are far slower, so in practice they are used to exchange
a symmetric key and to sign, not to encrypt bulk data.

**Hybrid encryption** — the standard real-world pattern, used by TLS: asymmetric key
agreement establishes a symmetric session key, which then protects the data.

**Hashing.** A one-way function producing a fixed-length digest. Properties required:
preimage resistance, second-preimage resistance, and collision resistance. **SHA-256 and
SHA-3** are current general-purpose choices; **MD5 and SHA-1 are broken for collision
resistance and must not be used for signatures or integrity against an adversary.**

**Hashing is not encryption.** Hashing is one-way and has no key; encryption is reversible
with a key. Passwords are hashed (with a slow KDF), data is encrypted.

**MAC and digital signatures.** An **HMAC** proves integrity and authenticity using a shared
secret — both parties can produce it, so it gives no non-repudiation. A **digital signature**
uses a private key, so only the holder could have produced it, providing non-repudiation as
well.

**PKI and certificates.** A certificate binds a public key to an identity, signed by a
certificate authority. Trust chains from a root CA through intermediates to the leaf.
Validation checks the signature chain, validity dates, hostname match, and revocation
(CRL or OCSP). Expired certificates are one of the most common causes of self-inflicted
outages.

**TLS.** Provides confidentiality, integrity, and server authentication (and client
authentication in mutual TLS). The handshake authenticates the server via its certificate
and agrees a session key. **Forward secrecy** — using ephemeral key exchange — ensures that
compromising the long-term private key later does not decrypt previously captured traffic.
Prefer modern protocol versions and disable legacy ones.

**Encoding is not encryption.** Base64 is encoding and provides no confidentiality
whatsoever. Presenting base64 as protection is a definitive junior signal.

**Key management is where cryptography actually fails.** Generation with a proper random
source, secure storage (KMS or HSM), rotation, separation of key access from data access,
and a defined recovery path. A perfect cipher with a key in a Git repository provides no
security.

**Common cryptographic failures in practice:** hardcoded keys, reused nonces or
initialisation vectors, ECB mode (which leaks structure), encryption without
authentication, weak random number generation (`Math.random()` or `rand()` for tokens), and
home-grown algorithms. **Do not roll your own cryptography** — use vetted libraries and
standard constructions.

**Version-dependent note.** Post-quantum cryptography standards have been published by NIST
and migration guidance is active; the practical implication today is inventorying
cryptographic use and preferring crypto-agile designs. Do not overstate current deployment
status.

### 4.4 Network Security

```yaml
job_field: cybersecurity
topic: network_security
difficulty:
  - medium
  - hard
keywords: [firewall, segmentation, ids, ips, vpn, dns_security, ddos, mitm, port]
```

- **Firewalls.** Stateless packet filters check individual packets; stateful firewalls track
  connections and allow return traffic; next-generation firewalls add application awareness.
  Default deny inbound is the baseline posture.
- **Network segmentation** limits lateral movement. A flat network means one compromised
  workstation reaches the database. Segment by trust level and function; **microsegmentation**
  applies the idea per workload.
- **IDS versus IPS.** An intrusion detection system observes and alerts; an intrusion
  prevention system sits inline and blocks. IPS gives faster containment and can cause an
  outage on a false positive — a real operational trade-off.
- **VPN** provides an encrypted tunnel, historically to extend a trusted perimeter. Zero
  trust architectures reduce reliance on VPN by authenticating each request rather than
  trusting the tunnel.
- **DNS security.** DNS is both a control point and an exfiltration channel. DNSSEC provides
  origin authentication for records; DNS filtering blocks known-malicious domains; monitoring
  DNS queries detects command-and-control and tunnelling patterns.
- **Man-in-the-middle** — an attacker positioned between two parties. TLS with correct
  certificate validation is the defence; certificate pinning strengthens it for controlled
  clients. Accepting invalid certificates "to make it work" removes the protection entirely.
- **DDoS** — overwhelming a service with traffic. Mitigations: upstream scrubbing services,
  CDN absorption, anycast distribution, rate limiting, and autoscaling with a cost ceiling.
  Note that autoscaling under attack converts an availability problem into a bill.
- **Common ports** worth recognising: 22 SSH, 25/587 SMTP, 53 DNS, 80 HTTP, 443 HTTPS,
  445 SMB, 3306 MySQL, 3389 RDP, 5432 PostgreSQL, 6379 Redis. Exposure of 445, 3389, or a
  database port to the internet is a finding in itself.
- **Wireless and physical** remain in scope: rogue access points, default device
  credentials, and unattended physical access to a network port.

### 4.5 Web Application Security and OWASP

```yaml
job_field: cybersecurity
topic: owasp
difficulty:
  - medium
  - hard
keywords: [owasp_top_10, injection, access_control, xss, csrf, ssrf, misconfiguration, supply_chain]
```

The **OWASP Top 10** is a widely referenced awareness document listing the most critical web
application security risks, produced by the Open Worldwide Application Security Project. It
is an awareness and prioritisation aid, **not a complete standard** — OWASP's own Application
Security Verification Standard (ASVS) is the more complete requirements document.

**OWASP Top 10:2025 categories:**

1. **A01:2025 Broken Access Control** — remains the top risk. Includes IDOR, missing
   function-level checks, and **server-side request forgery (SSRF)**, which was consolidated
   into this category. Defences: server-side enforcement, deny by default, object-level
   ownership checks, and URL allowlisting with blocking of internal ranges and cloud
   metadata endpoints for any server-initiated fetch.
2. **A02:2025 Security Misconfiguration** — moved up from fifth in the 2021 list. Default
   credentials, unnecessary features enabled, verbose errors, missing security headers,
   permissive CORS, and unpatched components. Defences: hardened baselines, configuration
   as code, automated configuration scanning.
3. **A03:2025 Software Supply Chain Failures** — a new and broader category reflecting the
   shift of attacker attention to dependencies, build systems, and distribution. Defences:
   dependency inventory and SBOM, pinning and verification, provenance and artifact signing,
   locked-down build pipelines, and vetting of third-party scripts.
4. **A04:2025 Cryptographic Failures** — weak or missing encryption, poor key management,
   sensitive data in transit or at rest unprotected.
5. **A05:2025 Injection** — SQL, NoSQL, OS command, LDAP, and template injection, and
   cross-site scripting, which is treated as an injection class. Defences: parameterised
   queries, safe APIs, context-aware output encoding, and allowlist input validation.
6. **A06:2025 Insecure Design** — flaws in the design itself, which no amount of correct
   implementation fixes. Defences: threat modelling, secure design patterns, and abuse-case
   requirements.
7. **A07:2025 Authentication Failures** — weak credentials, broken session management,
   missing brute-force protection, insecure recovery flows.
8. **A08:2025 Software or Data Integrity Failures** — unverified updates, insecure
   deserialisation, and CI/CD pipelines that accept untrusted input.
9. **A09:2025 Security Logging and Alerting Failures** — insufficient logging, no alerting,
   and logs that cannot support an investigation.
10. **A10:2025 Mishandling of Exceptional Conditions** — a new category covering improper
    error handling, fail-open behaviour, and unexpected states that leave the system in an
    insecure condition.

**Version note.** Many organisations still reference the **OWASP Top 10:2021** list, where
the ordering was Broken Access Control, Cryptographic Failures, Injection, Insecure Design,
Security Misconfiguration, Vulnerable and Outdated Components, Identification and
Authentication Failures, Software and Data Integrity Failures, Security Logging and
Monitoring Failures, and SSRF. Being able to discuss both, and to note that Broken Access
Control has stayed at number one, is the accurate position.

### 4.6 Key Web Vulnerability Classes in Detail

```yaml
job_field: cybersecurity
topic: web_security
difficulty:
  - medium
  - hard
keywords: [sql_injection, xss, csrf, ssrf, deserialization, file_upload, open_redirect]
```

**SQL injection.** Untrusted input is concatenated into a query, so data is interpreted as
code. Impact ranges from data disclosure to authentication bypass to full database
compromise. **The defence is parameterised queries / prepared statements**, which separate
code from data structurally. Stored procedures help only if they too parameterise. Input
validation and escaping are secondary layers, not the primary control. Least-privilege
database accounts limit the blast radius.

**Cross-site scripting (XSS).** Attacker-controlled content is rendered as script in another
user's browser, running with the origin's privileges — it can read the DOM, steal tokens
accessible to script, and act as the user.

- **Stored** — the payload is persisted server-side and served to other users.
- **Reflected** — the payload comes from the request and is echoed back.
- **DOM-based** — client-side code writes untrusted data into a dangerous sink without ever
  involving the server.

Defences: context-aware output encoding (HTML body, attribute, JavaScript, URL, and CSS
contexts each require different encoding), framework auto-escaping, avoiding dangerous sinks
(`innerHTML`, `eval`, `dangerouslySetInnerHTML`), sanitising HTML with a vetted library when
rich text is genuinely required, and a strong **Content Security Policy** as defence in
depth.

**Cross-site request forgery (CSRF).** A malicious site causes the victim's browser to send
an authenticated state-changing request, relying on cookies being attached automatically.
The attacker cannot read the response; they only need the action to occur. Defences:
`SameSite` cookie attribute, anti-CSRF tokens tied to the session, and requiring a custom
header that a cross-site HTML form cannot set. Token-in-header authentication is largely
immune because nothing is attached automatically.

**XSS versus CSRF is a frequent interview discriminator.** XSS executes attacker script
inside your origin and can therefore defeat CSRF tokens; CSRF abuses automatic credential
attachment without script execution in your origin.

**Server-side request forgery (SSRF).** The server is induced to make a request to a URL the
attacker controls, reaching internal services, cloud metadata endpoints, or acting as a
proxy. Defences: allowlist destinations, resolve and validate the address (blocking private
ranges and link-local addresses), block redirects to disallowed targets, disable unused URL
schemes, and require authenticated access to instance metadata services.

**Insecure deserialisation.** Deserialising untrusted data can instantiate arbitrary objects
and lead to remote code execution in several language ecosystems. Defence: do not deserialise
untrusted input with a format that supports arbitrary object graphs; use plain data formats
(JSON) with schema validation and explicit mapping.

**File upload.** Risks include stored XSS, path traversal, and server-side execution of an
uploaded file. Defences: validate type by content rather than extension, generate the
storage name yourself, store outside the web root or in object storage, serve with a safe
content type and `Content-Disposition`, enforce size limits, and scan.

**Open redirect.** An endpoint that redirects to a user-supplied URL, used for convincing
phishing. Defence: allowlist redirect targets or use server-side keys rather than raw URLs.

**Security headers.** `Content-Security-Policy`, `Strict-Transport-Security`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy`, and `frame-ancestors` (replacing
`X-Frame-Options`) are cheap, high-value defence in depth.

### 4.7 Secure Coding and the Secure SDLC

```yaml
job_field: cybersecurity
topic: secure_coding
difficulty:
  - medium
  - hard
keywords: [secure_sdlc, code_review, sast, dast, sca, shift_left, dependency, secrets]
```

**Secure development integrates security into every phase** rather than testing at the end,
where fixes are most expensive.

- **Requirements** — include abuse cases and security requirements alongside functional ones.
- **Design** — threat model before building; insecure design cannot be patched later.
- **Implementation** — secure coding standards, safe library defaults, peer review with a
  security lens.
- **Verification** — automated and manual testing (below).
- **Release and operate** — hardened configuration, monitoring, and a patch process.

**Testing tool categories, and what each actually finds.**

- **SAST (static analysis)** reads source code. Finds injection patterns, hardcoded secrets,
  and unsafe API use early. Generates false positives and cannot see runtime configuration.
- **DAST (dynamic analysis)** tests the running application from the outside. Finds
  configuration and runtime issues with fewer false positives, later in the cycle, and with
  limited coverage of code paths it cannot reach.
- **IAST** instruments the running application for more precise findings.
- **SCA (software composition analysis)** inventories dependencies and matches them to known
  vulnerabilities. Essential given that most application code is third-party. Reachability
  analysis matters — a vulnerable function that is never called is a lower priority.
- **Secret scanning** in the repository and in CI, including history.
- **Manual code review and penetration testing** find business-logic flaws that no scanner
  detects. Automation finds known patterns; humans find design errors.

**Secure coding essentials, language-independent.**

- Validate input at the trust boundary with an allowlist; reject rather than sanitise where
  possible.
- Encode output for its destination context.
- Use parameterised queries, never string concatenation for queries or commands.
- Fail closed and handle errors explicitly without leaking internals to the user.
- Use the platform's cryptographically secure random source for anything security-relevant.
- Keep secrets out of code, configuration files in version control, logs, and error messages.
- Apply the principle of least privilege to the process, the database account, and the
  service identity.

### 4.8 Vulnerability Management

```yaml
job_field: cybersecurity
topic: vulnerability_management
difficulty:
  - medium
  - hard
keywords: [cve, cvss, scanning, patching, prioritization, kev, remediation, sla]
```

**Vulnerability management is a continuous process**, not a scan: discover assets, identify
vulnerabilities, prioritise by risk, remediate, verify, and report.

- **CVE** — a public identifier for a specific known vulnerability.
- **CWE** — a classification of weakness *types* (for example, CWE-89 SQL injection). CVE is
  an instance; CWE is the category.
- **CVSS** — the Common Vulnerability Scoring System, giving a severity score from base,
  temporal, and environmental metrics. **CVSS base score is severity, not risk.** It says
  nothing about whether the component is exposed, whether it is exploited in the wild, or how
  valuable the asset is.
- **Prioritisation should combine severity with exploitability and exposure.** Practical
  inputs: whether a public exploit exists, whether it appears in a known-exploited catalogue
  (such as the CISA Known Exploited Vulnerabilities list), whether the affected code path is
  reachable, and what the asset is worth. A medium-severity flaw on an internet-facing
  authentication service outranks a critical one in an unused internal library.
- **Patch management** requires an inventory (you cannot patch what you do not know you
  run), a testing path, defined remediation SLAs by severity, and an emergency path for
  actively exploited issues.
- **Compensating controls** when patching is not immediately possible: network restriction,
  WAF rule, feature disablement, or enhanced monitoring — with a tracked expiry.
- **Zero-day** — a vulnerability with no available patch. Defence relies on layered controls,
  detection, and rapid response rather than prevention.
- **Metrics that matter:** mean time to remediate by severity, percentage of assets scanned,
  and age of the oldest unpatched critical — not raw finding counts.

### 4.9 Penetration Testing and Offensive Concepts (Authorised Context)

```yaml
job_field: cybersecurity
topic: penetration_testing_concepts
difficulty:
  - medium
  - hard
keywords: [penetration_testing, authorization, scope, rules_of_engagement, red_team, methodology, reporting]
```

**Penetration testing is an authorised, scoped, time-bound simulation of attacks to identify
exploitable weaknesses.** The defining characteristic is written authorisation. Without it,
the same activity is unlawful in most jurisdictions.

**Engagement essentials.**

- **Written authorisation** from someone with the authority to grant it, naming systems,
  IP ranges, and applications in scope.
- **Rules of engagement** — permitted techniques, testing windows, prohibited actions
  (typically denial of service and destructive testing), data handling requirements, and an
  emergency contact and stop procedure.
- **Third-party constraints** — cloud providers and SaaS vendors have their own testing
  policies that must be respected; you cannot authorise testing of infrastructure you do not
  own.
- **Reporting** — findings with reproducible evidence, business impact, severity, and
  actionable remediation guidance. The report is the deliverable; a list of tool output is
  not.

**Methodology phases**, at the conceptual level: reconnaissance, scanning and enumeration,
vulnerability identification, exploitation to demonstrate impact, post-exploitation
assessment of what an attacker could reach, and reporting with clean-up of any artifacts
introduced.

**Engagement types.** Black box (no prior knowledge), grey box (partial, often credentials),
and white box (full source and architecture access — usually the most cost-effective for
finding real issues). A **red team** exercise is broader and goal-oriented, testing detection
and response as much as technical weaknesses; **purple teaming** runs offensive and defensive
teams collaboratively to improve detection coverage directly.

**Vulnerability assessment versus penetration testing.** An assessment identifies and reports
potential weaknesses, usually with automated scanning and broad coverage. A penetration test
attempts to demonstrate exploitability and business impact, with depth over breadth. They are
different services and are frequently confused in job descriptions.

**Understanding attacker behaviour for defence.** Frameworks such as the Cyber Kill Chain and
**MITRE ATT&CK** describe the stages and techniques adversaries use — initial access,
execution, persistence, privilege escalation, credential access, lateral movement,
collection, exfiltration, and impact. Defenders use these to map detection coverage and find
gaps. This conceptual understanding is what an interview should probe; operational offensive
tradecraft is out of scope for this guide.

### 4.10 Security Monitoring, Logging, and SIEM

```yaml
job_field: cybersecurity
topic: siem
difficulty:
  - medium
  - hard
keywords: [siem, logging, detection, correlation, soc, alert_tuning, edr, soar, use_case]
```

**A SIEM (Security Information and Event Management) platform** centralises log and event
data from across the environment, normalises it, correlates across sources, and generates
alerts for investigation. Related technologies: **EDR/XDR** for endpoint and cross-domain
telemetry and response, **SOAR** for automating response workflows, and **UEBA** for
behavioural anomaly detection.

**Log sources that matter most:** authentication and identity provider events, endpoint
process and command-line telemetry, network flow and DNS, cloud API audit logs, web server
and WAF logs, database access logs, and email security events.

**What makes logs useful for investigation:** synchronised time across sources (clock skew
destroys correlation), consistent structured format, sufficient context (who, what, from
where, outcome), sufficient retention to cover a dwell time measured in weeks or months, and
**integrity protection so an attacker with host access cannot erase their traces** — ship
logs off-host to append-only storage.

**What must never be logged:** passwords, tokens, full card numbers, and unnecessary personal
data. Logs are themselves a sensitive asset and an attacker target.

**Detection engineering.**

- **Signature-based detection** matches known indicators. Precise, cheap, and useless against
  novel activity.
- **Anomaly and behavioural detection** flags deviation from a baseline. Catches unknown
  activity and produces more false positives.
- **Threat-informed detection** builds rules mapped to ATT&CK techniques, so coverage gaps
  are visible and measurable.
- **Every detection needs a triage runbook.** An alert with no defined investigation and no
  response action is noise.

**Alert fatigue is a security risk, not an annoyance.** A queue of thousands of low-value
alerts guarantees the real one is missed. Tuning — suppressing known-benign patterns,
raising thresholds, enriching with context, and deleting detections nobody actions — is
core operational work.

**Useful signals to detect:** impossible-travel and anomalous authentication, authentication
failure spikes followed by a success, privilege escalation and role changes, new persistence
mechanisms, unusual outbound data volume, access to sensitive data outside normal patterns,
disabled logging or security tooling, and creation of new administrative identities.

### 4.11 Incident Response

```yaml
job_field: cybersecurity
topic: incident_response
difficulty:
  - medium
  - hard
keywords: [incident_response, containment, eradication, recovery, forensics, chain_of_custody, playbook]
```

**The incident response lifecycle**, as described in NIST SP 800-61: **preparation;
detection and analysis; containment, eradication, and recovery; and post-incident
activity.**

- **Preparation** — playbooks, defined roles and an incident commander, contact lists
  including legal and communications, tooling and access ready in advance, and rehearsed
  tabletop exercises. Most response failures are preparation failures.
- **Detection and analysis** — validate the alert, establish scope and timeline, classify
  severity, and determine what data and systems are affected.
- **Containment** — short-term (isolate the host, disable the account, block the indicator)
  and long-term (rebuild, apply patches). **The key judgement is containment speed versus
  evidence preservation**: pulling the network cable stops the bleeding and may destroy
  volatile memory evidence and tip off the attacker. Decide deliberately based on the type
  of incident.
- **Eradication** — remove the attacker's access comprehensively: malware, persistence
  mechanisms, created accounts, altered configuration, and **every credential the attacker
  could have touched**. Partial eradication leads directly to re-compromise.
- **Recovery** — restore from known-good state, validate integrity, monitor closely for
  return, and restore service in a controlled order.
- **Post-incident** — a blameless review producing concrete improvements: detection gaps
  closed, controls added, playbooks updated. An incident that produces no change will recur.

**Forensic basics.** Preserve volatile evidence first (memory, network connections, running
processes) before disk. Work on copies with verified hashes, maintain chain of custody, and
document actions with timestamps. If prosecution or regulatory action is possible, involve
legal early — improper handling can render evidence unusable.

**Communication.** Regulatory breach notification deadlines exist and vary by jurisdiction
and data type (GDPR sets a 72-hour authority notification obligation for qualifying personal
data breaches). Legal and communications teams own external messaging; engineers should not
improvise it.

**Key metrics.** Mean time to detect and mean time to respond, plus dwell time — how long
the attacker was present before detection.

### 4.12 Threat Modelling

```yaml
job_field: cybersecurity
topic: threat_modeling
difficulty:
  - medium
  - hard
keywords: [threat_modeling, stride, attack_surface, trust_boundary, dfd, abuse_case, mitigation]
```

**Threat modelling** is structured reasoning about what can go wrong in a system's design,
performed early enough to change the design.

**The four questions** that frame the exercise: What are we building? What can go wrong?
What are we going to do about it? Did we do a good job?

**STRIDE** categorises threats and maps neatly to security properties:

| Threat | Violates | Example mitigation |
|--------|----------|--------------------|
| **S**poofing | Authenticity | Strong authentication, MFA |
| **T**ampering | Integrity | Signatures, hashes, access control |
| **R**epudiation | Non-repudiation | Audit logging, signatures |
| **I**nformation disclosure | Confidentiality | Encryption, access control |
| **D**enial of service | Availability | Rate limiting, quotas, redundancy |
| **E**levation of privilege | Authorization | Least privilege, input validation |

**Method.** Draw a data flow diagram with components, data stores, flows, external entities,
and **trust boundaries** — the points where data crosses from less trusted to more trusted
control. Enumerate threats per element, especially at boundaries. Rate and prioritise. Decide
mitigations, and record accepted risks with an owner.

**Attack surface** is the set of points where an attacker can interact with the system:
endpoints, ports, file uploads, message consumers, third-party integrations, administrative
interfaces, and physical access. Reducing it — removing unused endpoints and features — is
the cheapest security improvement available.

**Abuse cases** complement user stories: "as an attacker, I want to enumerate valid usernames
via the password reset response". Writing these during requirements catches insecure design
before implementation.

### 4.13 Cloud Security

```yaml
job_field: cybersecurity
topic: cloud_security
difficulty:
  - medium
  - hard
keywords: [shared_responsibility, cloud_iam, misconfiguration, cspm, container_security, secrets]
```

**Shared responsibility.** The provider secures the cloud; the customer secures what they
put in it. The line moves with the service model, but **identity configuration, network
exposure, and data protection are always the customer's**. Most cloud breaches are customer
misconfiguration, not provider compromise.

Priority areas:

- **Identity is the primary perimeter.** Over-permissive roles, long-lived access keys, and
  unused administrative privileges are the leading causes of cloud incidents. Use federation
  with short-lived credentials, MFA for humans, workload identity for services, and regular
  review of unused permissions.
- **Public exposure.** Publicly readable object storage, databases with public endpoints, and
  management ports open to the internet. Account-level block-public-access controls and
  automated scanning catch these before an attacker does.
- **Configuration as code with policy checks.** Scanning Terraform and Kubernetes manifests
  in CI prevents the misconfiguration from ever existing. Cloud security posture management
  tooling continuously checks what is actually deployed.
- **Network isolation.** Private subnets for data tiers, private endpoints for managed
  services, and default-deny network policies inside clusters.
- **Secrets.** A managed secret store rather than environment files, images, or repositories.
  Kubernetes Secrets are base64-encoded, not encrypted, without etcd encryption at rest.
- **Container and workload security.** Non-root containers, minimal base images, image
  scanning and signing, dropped capabilities, read-only root filesystems, and admission
  control policies.
- **Supply chain.** Pin base images and dependencies by digest, generate an SBOM, verify
  artifact signatures at deploy, and pin CI actions to a commit rather than a mutable tag.
- **Audit logging.** Cloud API audit logs enabled everywhere and delivered to an account that
  operational identities cannot modify or delete.
- **Instance metadata protection.** Require authenticated access to metadata services so an
  SSRF cannot harvest credentials.

Infrastructure design depth lives in the cloud architecture and DevOps/Cloud guides.

### 4.14 Compliance and Governance Frameworks

```yaml
job_field: cybersecurity
topic: compliance
difficulty:
  - medium
  - hard
keywords: [nist_csf, iso_27001, pci_dss, gdpr, soc2, policy, audit, governance]
```

Frameworks structure a security programme and communicate assurance to others.

- **NIST Cybersecurity Framework (CSF) 2.0** organises cybersecurity risk management into six
  functions: **Govern, Identify, Protect, Detect, Respond, Recover.** Govern was added in
  version 2.0, elevating strategy, roles, and oversight. It is voluntary guidance, not a
  certification, and is widely used to structure and assess programmes.
- **NIST SP 800-53** is a detailed control catalogue for US federal systems, widely borrowed
  elsewhere. **NIST SP 800-61** covers incident handling. **NIST SP 800-63** covers digital
  identity and authentication.
- **ISO/IEC 27001** specifies requirements for an information security management system and
  is certifiable by accredited auditors; ISO/IEC 27002 provides control guidance.
- **SOC 2** is an attestation report on controls relevant to security, availability,
  processing integrity, confidentiality, and privacy — commonly requested by enterprise
  customers. Type I assesses design at a point in time; Type II assesses operating
  effectiveness over a period.
- **PCI DSS** applies to organisations handling payment card data, with prescriptive
  requirements on network segmentation, encryption, access control, logging, and testing.
  Reducing scope by not storing card data is the most effective compliance strategy.
- **GDPR** is a data protection regulation covering personal data of people in the EU,
  imposing lawful basis, data minimisation, subject rights (including access and erasure),
  breach notification within 72 hours to the supervisory authority where required, and
  accountability obligations. Similar regimes exist in other jurisdictions.
- **HIPAA** governs protected health information in the US healthcare context.

**Compliance is not security.** A compliant system can be insecure, and a secure system can
be non-compliant. Compliance sets a floor and creates budget and accountability; treating an
audit pass as the goal produces checkbox security. Say this explicitly — it is a maturity
signal.

---

## 5. Easy-Level Interview Knowledge

```yaml
job_field: cybersecurity
topic: easy_level_knowledge
difficulty: easy
keywords: [security_basics, definitions, junior, fundamentals]
```

- **What is the CIA triad?** Confidentiality, integrity, availability — the three core
  security objectives.
- **What is the difference between authentication and authorization?** Verifying identity
  versus determining permitted actions.
- **What is multi-factor authentication?** Requiring evidence from two or more different
  factor categories.
- **What is the difference between hashing and encryption?** One-way with no key versus
  reversible with a key.
- **Why do you salt password hashes?** To make identical passwords hash differently and
  defeat precomputed rainbow tables.
- **Which algorithms should be used for password storage?** Argon2, scrypt, or bcrypt — not
  plain SHA-256 or MD5.
- **What is SQL injection and how do you prevent it?** Untrusted input interpreted as query
  code; prevented by parameterised queries.
- **What is XSS?** Injecting script that executes in another user's browser in your origin's
  context.
- **What is the principle of least privilege?** Granting only the minimum access required.
- **What is a firewall?** A control that permits or blocks network traffic by rule.
- **What is the difference between a vulnerability and a threat?** A weakness versus a
  potential cause of harm that could exploit it.
- **What is a CVE?** A public identifier for a specific known vulnerability.
- **What does HTTPS provide?** Confidentiality, integrity, and server authentication for the
  connection.
- **What is phishing?** Deceptive communication designed to obtain credentials or induce a
  harmful action.
- **What is a security patch and why does patch timing matter?** A fix for a known flaw;
  known vulnerabilities are actively scanned for and exploited.
- **What is defence in depth?** Multiple independent layers of control so a single failure is
  not catastrophic.
- **What is the difference between symmetric and asymmetric encryption?** One shared key
  versus a public/private key pair.
- **What should never appear in application logs?** Passwords, tokens, full card numbers, and
  unnecessary personal data.

---

## 6. Medium-Level Interview Knowledge

```yaml
job_field: cybersecurity
topic: medium_level_knowledge
difficulty: medium
keywords: [applied_security, analysis, comparison, controls, investigation]
```

- **Explain XSS versus CSRF and how the defences differ.** Script execution in your origin
  versus forged authenticated requests; output encoding and CSP versus `SameSite` cookies and
  anti-CSRF tokens.
- **How would you secure a public REST API?** TLS, authentication with short-lived tokens,
  server-side authorization with object-level checks, input validation, rate limiting,
  security headers, no verbose errors, and audit logging.
- **A scanner reports 400 vulnerabilities. How do you prioritise?** Exposure and reachability
  first, then known exploitation in the wild, then asset criticality, then CVSS. Explain why
  CVSS alone is severity rather than risk.
- **How do you detect a compromised user account?** Impossible travel, unusual device or
  location, authentication failure spike followed by success, unusual data access volume,
  and out-of-hours activity. Then describe the response, not just the detection.
- **What is SSRF and how do you defend against it?** The server is coerced into making
  requests; defend with destination allowlists, blocking private and link-local ranges,
  blocking redirects, and requiring authenticated metadata access.
- **How would you approach securing a CI/CD pipeline?** Least-privilege short-lived
  credentials via OIDC, pinned actions and base images, secret scanning, dependency and image
  scanning, artifact signing, protected branches, and no untrusted pull request code
  executing with secrets.
- **What is the difference between a vulnerability assessment and a penetration test?**
  Breadth-first identification versus depth-first demonstration of exploitability, and the
  authorisation and scoping requirements of the latter.
- **How do you handle a discovered secret in a Git repository?** Rotate it immediately —
  removing the commit does not undo exposure — then determine what it accessed, review logs
  for misuse, and add secret scanning to prevent recurrence.
- **How does TLS establish a secure connection?** Certificate-based server authentication,
  key agreement producing a session key, then symmetric encryption with integrity
  protection; forward secrecy protects past sessions if the long-term key later leaks.
- **What is the difference between IDS and IPS, and which would you deploy?** Detect and
  alert versus inline block; the choice depends on tolerance for false-positive-induced
  outages.
- **What logs would you need to investigate a suspected data exfiltration?** Authentication,
  data access, network flow and DNS, cloud API audit, endpoint process telemetry, and egress
  volume — with synchronised timestamps and adequate retention.
- **How do you securely store API keys in an application?** A managed secret store injected at
  runtime, never in code, images, or client-side bundles; scoped narrowly and rotated.
- **What is threat modelling and when do you do it?** Structured analysis of what can go
  wrong, done at design time when the design can still change.
- **Why is "we have a WAF" not a sufficient answer to injection risk?** A WAF is a
  compensating control that can be bypassed; the structural fix is parameterisation in the
  code.

---

## 7. Hard-Level Interview Knowledge

```yaml
job_field: cybersecurity
topic: hard_level_knowledge
difficulty: hard
keywords: [security_architecture, zero_trust, detection_strategy, incident_command, supply_chain, identity]
```

- **Design a zero trust architecture for an organisation moving off VPN-based access.**
  Strong identity with phishing-resistant MFA, device posture as a signal, per-application
  authorisation policy at a proxy or gateway, continuous evaluation rather than
  authenticate-once, microsegmentation, comprehensive logging, and a migration sequence that
  does not lock everyone out. Name the costs: identity provider becomes critical, latency and
  complexity increase, and legacy applications need a gateway.
- **How do you build a detection strategy rather than a pile of rules?** Inventory crown-jewel
  assets and likely adversary objectives, map detections to MITRE ATT&CK techniques to expose
  coverage gaps, define log source requirements per technique, write detections with an
  explicit triage runbook and a false-positive budget, validate with purple team exercises,
  and measure detection coverage and mean time to detect.
- **A supply chain compromise is suspected in a build dependency. Walk through the response.**
  Determine which artifacts and environments include the dependency, contain by blocking
  deployment and isolating affected systems, assume any secret those builds touched is
  compromised and rotate, verify artifact integrity from a trusted baseline, rebuild from
  clean sources, hunt for post-compromise activity, and then structurally address provenance
  verification and dependency pinning.
- **How do you secure a multi-tenant SaaS platform against cross-tenant data access?**
  Tenant context enforced at the data access layer or with row-level security rather than in
  each query, cache keys including tenant id, automated cross-tenant access tests in CI,
  per-tenant encryption keys where the threat model requires it, and monitoring for anomalous
  cross-tenant patterns. Discuss the isolation levels available and their cost.
- **What is your approach when a critical vulnerability is announced with active
  exploitation?** Rapid inventory of affected assets, exposure assessment, compensating
  controls immediately (network restriction, feature disablement, WAF rule) while patching
  proceeds, prioritised patching by exposure, verification, and threat hunting for prior
  compromise — because a fast patch does not undo an earlier breach.
- **How would you design identity and access for an organisation with 5,000 employees and
  heavy contractor turnover?** Central identity provider as the single source of truth,
  automated joiner/mover/leaver provisioning tied to HR, RBAC with periodic access
  recertification, just-in-time elevation for privileged actions, phishing-resistant MFA,
  privileged access management with session recording, and comprehensive audit.
- **How do you evaluate whether a security control is worth its cost?** Estimate the risk
  reduction (likelihood times impact avoided), account for operational cost including alert
  triage time and user friction, consider whether it addresses a real observed threat or a
  hypothetical one, and check whether a cheaper structural fix removes the risk entirely.
- **How do you secure machine learning and LLM-based applications?** Treat model inputs as
  untrusted, defend against prompt injection by keeping privileged instructions and tools out
  of reach of untrusted content, apply least privilege to any tool the model can invoke,
  validate and constrain outputs, require confirmation for consequential actions, guard
  against training data poisoning and model extraction, and prevent sensitive training data
  memorisation from leaking. Note that prompt injection is not a solved problem.
- **How do you run a security programme with a small team?** Prioritise by actual risk,
  automate guardrails so the secure path is the default, focus on identity and patching as
  the highest-return areas, buy managed detection rather than building a 24/7 SOC, and be
  explicit about accepted risks.
- **What is your position on security metrics?** Prefer outcome and coverage metrics — mean
  time to detect and respond, patch latency by severity, percentage of assets with logging,
  phishing-resistant MFA coverage — over vanity counts of blocked attacks or raw finding
  totals.

---

## 8. Practical Engineering Scenarios

```yaml
job_field: cybersecurity
topic: practical_scenarios
difficulty:
  - medium
  - hard
keywords: [scenario, incident, alert, investigation, breach, response]
```

### Scenario A — A security alert indicates suspicious authentication activity

An account shows a successful login from an unusual country 20 minutes after a login from
the user's normal location.

- **Initial question.** What do you do first, and what do you avoid doing first?
- **Expected reasoning.** Validate before acting: check whether a VPN or travel explains it,
  review the authentication method (was MFA satisfied, and by which factor), look at what the
  session did after login, and check for other accounts with similar patterns. Contact the
  user through a verified out-of-band channel.
- **Follow-up.** MFA was satisfied by a push notification approved at 3 a.m. What does that
  suggest? (MFA fatigue or a real-time phishing proxy; push-based MFA is not
  phishing-resistant.)
- **Deeper.** How do you scope the compromise? (Session token reuse, mailbox rules created,
  OAuth application grants, new device registrations, and lateral authentication.)
- **Response.** Revoke sessions and tokens (not just reset the password), remove attacker
  persistence such as mail rules and app grants, and require re-enrolment of factors.
- **Trade-off.** Immediate lockout stops the attacker and disrupts a possibly innocent user;
  monitoring longer gathers intelligence and risks further damage.

### Scenario B — A web application is under injection attack

WAF logs show thousands of SQL-injection-shaped requests against one endpoint.

- **Initial question.** Is the WAF blocking them enough?
- **Expected reasoning.** No — determine whether the endpoint is actually vulnerable. Review
  the code for string-concatenated queries, check database logs for anomalous queries, and
  check whether any request succeeded.
- **Follow-up.** The endpoint concatenates a sort parameter into the query. What is the
  immediate action and the durable fix? (Immediate: block or disable, tighten the WAF rule;
  durable: parameterise, or allowlist sort columns since a column name cannot be
  parameterised.)
- **Deeper.** How do you determine whether data was exfiltrated? (Database audit logs,
  response sizes, egress volume, and timing.)
- **Prevention.** SAST in CI, code review focused on query construction, least-privilege
  database account, and a test that attempts injection against every endpoint.

### Scenario C — Ransomware is detected on a workstation

- **Initial question.** What is the containment decision?
- **Expected reasoning.** Isolate the host from the network immediately (network isolation
  rather than powering off, to preserve memory evidence), identify the strain and initial
  access vector, determine what shares and credentials that host could reach, and check
  backups for integrity and isolation.
- **Follow-up.** How do you decide whether it has spread? (Look for the same indicators
  across the estate, unusual SMB activity, and mass file modification events.)
- **Deeper.** Why is credential rotation essential even after removing the malware? (Cached
  and harvested credentials allow re-entry; eradication that skips credentials fails.)
- **Recovery.** Restore from verified offline or immutable backups, rebuild rather than clean,
  and monitor intensively for return.
- **Prevention.** Segmentation, least privilege, offline/immutable backups with tested
  restores, phishing-resistant MFA, and EDR with response capability.

### Scenario D — A penetration test report lands with critical findings

- **Expected reasoning.** Triage by exploitability and exposure rather than by the report's
  own severity labels alone, verify each finding is genuine, assign owners and remediation
  dates, apply compensating controls for anything that cannot be fixed quickly, and schedule
  retesting.
- **Follow-up.** The team disputes a finding as "low risk because it requires
  authentication". How do you respond? (Authenticated access is not a high bar in a
  compromise scenario; assess what the finding grants post-authentication.)
- **Deeper.** How do you prevent the same class of finding next time? (Root-cause analysis
  across findings — usually one missing control pattern rather than ten unrelated bugs.)

### Scenario E — Investigating suspected data exfiltration

Unusual outbound traffic volume from a database server at night.

- **Expected reasoning.** Establish a baseline first — is this a scheduled backup? Then
  examine destination, protocol, DNS queries (tunnelling), the process responsible, and which
  account initiated it. Correlate with authentication and database audit logs.
- **Follow-up.** DNS query volume to one domain is enormous with long subdomain labels. What
  does that indicate? (Likely DNS tunnelling as a covert channel.)
- **Deeper.** How do you quantify what left? (Query logs, byte volumes, and — where available
  — data loss prevention telemetry. Often the honest answer is that you can bound it but not
  determine it precisely, which is itself a lesson about logging.)
- **Prevention.** Egress filtering, DNS monitoring, database activity monitoring, and
  segmentation so the database has no direct internet route.

### Scenario F — A developer requests production database access to debug an issue

- **Expected reasoning.** Do not simply approve or refuse. Establish what they actually need,
  offer alternatives (read-only replica, masked data, better logging and tracing, a
  time-boxed just-in-time elevation with session recording), and if access is granted, scope
  it narrowly, log it, and expire it automatically.
- **Deeper.** Why does a blanket refusal fail as a security strategy? (It drives workarounds
  such as shared accounts and copied production data — worse outcomes than a governed access
  path.)

### Scenario G — A third-party vendor reports a breach affecting your data

- **Expected reasoning.** Determine what data they hold and what access they have into your
  environment, revoke or rotate any credentials or integration tokens, assess regulatory
  notification obligations, hunt for activity from vendor-associated identities and IP
  ranges, and review the contract's security and notification terms.
- **Deeper.** What changes structurally? (Vendor risk assessment before onboarding,
  least-privilege integration access, and monitoring of third-party identity activity.)

---

## 9. Troubleshooting and Investigation Knowledge

```yaml
job_field: cybersecurity
topic: security_monitoring
subtopic: investigation
difficulty:
  - medium
  - hard
keywords: [triage, false_positive, log_analysis, indicators, timeline, hunting]
```

**Alert triage method.**

1. **Validate the alert** — is the detection logic actually matching what it intends?
2. **Establish context** — who, what, when, from where, and what is normal for this
   identity and host.
3. **Determine scope** — is this one host, one account, or a pattern across the estate?
4. **Decide impact** — what could the observed activity have reached?
5. **Act or close** — escalate to incident, apply containment, or close with a tuning note so
   the same false positive does not recur.

**Building a timeline** is the core investigative artifact: ordered events across sources
with synchronised timestamps in a single timezone (UTC by convention). Clock skew between
sources is the most common obstacle and must be corrected before conclusions are drawn.

**Distinguishing false positives from real activity.** Check whether the behaviour is
consistent with the user's role and history, whether a change window or deployment explains
it, and whether corroborating evidence exists in an independent log source. **One indicator
is a hypothesis; corroboration across independent sources is evidence.**

**Threat hunting** is proactive, hypothesis-driven searching without a triggering alert:
"if an attacker had established persistence via scheduled tasks, what would that look like in
our telemetry, and is it there?" It finds what detections miss and generates new detections.

**Common investigation obstacles.** Insufficient log retention, missing log sources
(especially endpoint process telemetry and DNS), unsynchronised clocks, shared accounts that
destroy attribution, and logs that record the action but not the actor or the outcome.

**Log analysis fundamentals.** Aggregate and count before reading individual lines — outliers
by frequency, by rarity, and by first occurrence are where the signal is. Rare is more
interesting than voluminous.

---

## 10. Security Architecture

```yaml
job_field: cybersecurity
topic: security_architecture
difficulty:
  - medium
  - hard
keywords: [architecture, segmentation, trust_boundary, secure_design, control_placement, resilience]
```

Security architecture places controls deliberately rather than accumulating tools.

- **Identify trust boundaries** and put authentication, authorization, and validation at
  each one. Data crossing from less trusted to more trusted is where controls belong.
- **Segment by blast radius.** Separate environments, separate accounts, separate networks,
  and separate identities so a compromise in one does not reach the others.
- **Centralise decisions, distribute enforcement.** One policy definition, enforced
  consistently at every service, beats each team implementing its own interpretation.
- **Make the secure path the easy path.** Platform-provided templates with authentication,
  logging, encryption, and secret management already wired in produce far better outcomes
  than a policy document.
- **Design for detection, not only prevention.** Assume prevention fails; ensure the failure
  produces a signal in a log that reaches the SIEM.
- **Design for recovery.** Immutable, isolated backups; tested restores; rebuild automation;
  and a credential rotation path that can be executed under pressure.
- **Minimise the attack surface.** Every endpoint, port, feature, and integration is
  something to defend. Removal is the strongest control.
- **Avoid single points of security failure.** If compromising one identity provider,
  one CI runner, or one administrative workstation compromises everything, that is an
  architectural finding.

---

## 11. Application and Data Security Practices

```yaml
job_field: cybersecurity
topic: secure_coding
subtopic: data_protection
difficulty:
  - medium
  - hard
keywords: [data_classification, encryption_at_rest, masking, retention, dlp, privacy_by_design]
```

- **Classify data** before designing controls. Public, internal, confidential, and regulated
  categories drive encryption, access, retention, and logging decisions.
- **Minimise collection.** The safest data is data you never collected. This is also a
  regulatory principle, not just good practice.
- **Encrypt in transit and at rest**, with key management separated from data access so no
  single role can both read the ciphertext and use the key.
- **Mask and tokenise** in non-production environments. Copying raw production personal data
  into development is one of the most common real-world exposures.
- **Retention and deletion.** Automated retention policies and a workable deletion path,
  including in backups and analytical copies. Append-only data stores make erasure requests
  genuinely hard, which is a design consideration rather than an afterthought.
- **Data loss prevention** controls monitor and restrict movement of sensitive data; they
  generate false positives and require tuning like any detection.
- **Privacy by design.** Purpose limitation, lawful basis, consent handling where required,
  and subject rights supported by design rather than by manual process.

---

## 12. Security Performance and Operational Trade-offs

```yaml
job_field: cybersecurity
topic: security_fundamentals
subtopic: trade_offs
difficulty:
  - medium
  - hard
keywords: [usability, friction, false_positive, cost, availability, control_selection]
```

**Every control has a cost**, and pretending otherwise is how security teams lose influence.

- **Security versus usability.** Controls that impose excessive friction get bypassed —
  shared accounts, disabled MFA, credentials in spreadsheets. A control the organisation
  routes around provides negative security value.
- **Security versus availability.** An IPS that blocks on a false positive causes an outage.
  Aggressive lockout policies enable denial of service. Fail-secure is usually right and is
  not universally right.
- **Security versus performance.** Encryption, inspection, and logging all consume resources.
  Modern hardware makes TLS overhead negligible for most workloads; deep inspection at high
  throughput is not free.
- **Security versus cost.** Detection coverage, log retention, and 24/7 response are
  expensive. Prioritise by risk and be explicit about what is not covered.
- **Detection sensitivity versus alert volume.** Every threshold trades false positives
  against false negatives. Alert fatigue is the failure mode that causes real incidents to be
  missed, so tuning is a security activity, not housekeeping.
- **Prevention versus detection versus response.** A balanced programme invests in all three.
  Organisations that invest only in prevention discover breaches from an outside party.

**Logging cost and retention** deserve explicit mention: full-fidelity telemetry everywhere
is unaffordable at scale, so tier the data — high-value sources retained long, verbose
sources sampled or retained briefly — and know which questions you have given up the ability
to answer.

---

## 13. Common Candidate Mistakes

```yaml
job_field: cybersecurity
topic: common_mistakes
difficulty:
  - easy
  - medium
  - hard
keywords: [mistakes, misconceptions, security_pitfalls]
```

- Confusing authentication with authorization.
- Confusing hashing with encryption, or calling base64 encoding "encryption".
- Recommending SHA-256 for password storage instead of a slow, salted KDF.
- Confusing XSS with CSRF, or not knowing that XSS defeats CSRF tokens.
- Treating CVSS base score as risk rather than severity.
- Naming a tool as the answer to a threat ("we have a WAF", "we have a SIEM") instead of a
  control strategy.
- Believing a firewall or a VPN makes the internal network trustworthy.
- Claiming security through obscurity as a control.
- Proposing to test or scan systems without mentioning written authorisation and scope.
- Confusing a vulnerability assessment with a penetration test.
- Treating compliance certification as evidence of security.
- Suggesting "block the user" as a complete incident response, with no scoping, eradication,
  or credential rotation.
- Powering off a compromised machine and destroying volatile evidence without considering the
  trade-off.
- Rotating a leaked secret's *location* (deleting the commit) rather than the secret itself.
- Recommending MFA without distinguishing SMS from app-based from phishing-resistant factors.
- Ignoring alert fatigue and proposing more detections as an unqualified good.
- Presenting a control with no usability, availability, or cost consequence.
- Assuming the cloud provider secures IAM configuration and network exposure.

---

## 14. Interview Evaluation Points

```yaml
job_field: cybersecurity
topic: evaluation_points
difficulty:
  - easy
  - medium
  - hard
keywords: [evaluation, rubric, security_signals, assessment]
```

An interviewer should be able to determine whether the candidate understands:

- **Risk thinking** — whether they prioritise by exposure, exploitability, and asset value
  rather than by severity labels or finding counts.
- **Precise vocabulary** — authentication versus authorization, hashing versus encryption,
  threat versus vulnerability versus risk, assessment versus penetration test.
- **Root cause versus symptom** — whether they reach for the structural fix (parameterised
  queries, server-side authorization) rather than the compensating control (WAF rule).
- **Attacker perspective for defensive purposes** — whether they can reason about how an
  attacker would move through the system, in order to place detections and controls.
- **Authorisation and ethics** — whether written authorisation, scope, and legal boundaries
  come up unprompted whenever offensive activity is discussed. Its absence is disqualifying.
- **Incident discipline** — validate, scope, contain, eradicate completely including
  credentials, recover, and learn.
- **Trade-off awareness** — that every control costs usability, availability, or money, and
  that a bypassed control is worse than none.
- **Detection realism** — awareness of alert fatigue, false positive budgets, log source
  requirements, and the need for a runbook per detection.
- **Honesty about limits** — willingness to say "we could not determine that from the logs we
  had", which is both truthful and a good argument for better logging.
- **Defensive orientation** — the framing of offensive knowledge as a means to build better
  defences.

**Adaptive guidance.** A strong answer on web vulnerabilities should escalate toward
architecture, detection strategy, or incident command. A weak answer on cryptography or
detection engineering should step down to the CIA triad, authentication basics, or common
vulnerability classes — not to another cryptography question.

---

## 15. Cross-Topic Relationships

```yaml
job_field: cybersecurity
topic: cross_topic_relationships
difficulty: medium
keywords: [relationships, topic_map, security_dependencies]
```

Distinctions that must not be collapsed:

- **Authentication is not authorization.** Identity versus permission.
- **Hashing is not encryption**, and **encoding is neither**.
- **A threat is not a vulnerability is not a risk.** Risk requires all three plus an asset.
- **A vulnerability assessment is not a penetration test.** Breadth and identification versus
  depth and demonstrated exploitability.
- **Compliance is not security.** A floor and an attestation, not an outcome.
- **A SIEM is not detection.** A platform versus the engineered rules, tuning, and runbooks
  that make it useful.
- **XSS is not CSRF.** Script execution in your origin versus forged authenticated requests.
- **CVSS severity is not risk.** Exposure and exploitability change the answer entirely.
- **Zero trust is not a product.** An architectural principle implemented across identity,
  network, and application layers.
- **Prevention is not detection is not response.** All three are required.
- **Red team is not penetration test.** Goal-oriented adversary simulation testing detection
  and response versus scoped technical assessment.

Topic progression for adaptive interviews (easy to hard):

`cia_triad -> authentication -> authorization -> network_security -> web_security -> owasp -> cryptography -> vulnerability_management -> security_monitoring -> incident_response -> threat_modeling -> security_architecture`

Breadth track when the candidate stalls (use after repeated weak answers):

- Weak on cryptography → `authentication` basics or `cia_triad`
- Weak on detection engineering → `logging` fundamentals or `network_security`
- Weak on incident response → `security_monitoring` basics
- Weak on cloud security → `authorization` and `access_control`
- Weak on web security → `secure_coding` fundamentals and input validation

Canonical depth lives elsewhere for:

- Cloud IAM design, VPC topology, DR patterns —
  `cloud_architecture_interview_guide.md`
- Kubernetes hardening, CI/CD pipeline security, secret management operations —
  `devops_cloud_interview_guide.md`
- API security implementation, session and token handling in code —
  `backend_development_interview_guide.md`
- Browser security model, CSP implementation, XSS in frontend frameworks —
  `frontend_development_interview_guide.md`
- Adversarial ML, prompt injection, model privacy —
  `ai_machine_learning_interview_guide.md`
- Security testing within a QA strategy —
  `qa_testing_interview_guide.md`
