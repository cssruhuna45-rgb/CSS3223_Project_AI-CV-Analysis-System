# CV and Resume Standards Knowledge Guide

```yaml
document_type: cv_standards
document_name: CV and Resume Standards
purpose: reference material for reviewing a candidate CV
canonical_topics:
  - cv_structure
  - ats_compatibility
  - action_verbs
  - quantified_achievements
  - contact_information
  - professional_summary
  - skills_section
  - experience_section
  - education_section
  - projects_section
  - certifications
  - formatting
  - length
  - common_mistakes
  - fresher_cv
  - experienced_cv
  - tailoring
```

---

## 1. What This Guide Is For

This guide is the reference used when reviewing a candidate's CV. It
describes what a strong technical CV contains, how applicant tracking
systems read it, and the mistakes that most often cost an interview.

Feedback given to a candidate should point at a rule in this guide, so
that "this needs work" is always followed by "here is the standard it
falls short of".

---

## 2. The Purpose of a CV

A CV has one job: to get an interview. It is not a biography and not a
complete record of everything a person has done.

A recruiter spends roughly six to eight seconds on the first pass. In
that time they look for the target role, recent relevant experience, and
recognisable technologies. Anything that makes those three hard to find
is working against the candidate.

A CV is read twice: once by software, once by a person. It must satisfy
both.

---

## 3. Applicant Tracking Systems

### 3.1 What an ATS Does

Most medium and large employers run submitted CVs through an applicant
tracking system before a human sees them. The system parses the file
into structured fields — name, contact details, employment history,
education, skills — and scores it against the job description.

If parsing fails, the CV is often rejected without ever being read.

### 3.2 What Breaks Parsing

**Multi-column layouts.** Parsers read left to right across the full
page width. A two-column CV interleaves the columns and produces
nonsense.

**Tables for layout.** Cell contents are frequently read out of order or
dropped entirely.

**Text inside images or graphics.** An ATS cannot read a skills chart, a
logo, or a headshot. Any information that exists only as a picture is
invisible.

**Headers and footers.** Many parsers skip them. Contact details placed
in a header may be lost completely.

**Unusual section names.** "Where I've Worked" is not recognised;
"Experience" or "Work Experience" is.

**Non-standard file formats.** PDF and DOCX are safe. Pages, ODT, and
image formats are not.

**Decorative fonts and icons.** Unicode icons for phone and email often
parse as noise.

### 3.3 What Parses Reliably

- A single-column layout
- Standard section headings: Summary, Skills, Experience, Education,
  Projects, Certifications
- Plain bullet points
- Standard fonts: Arial, Calibri, Helvetica, Georgia, Times New Roman
- Dates in a consistent format, such as `Jan 2023 – Mar 2024`
- A PDF exported from a word processor rather than scanned

### 3.4 Keywords

An ATS matches the CV against the job description. A candidate who has
used PostgreSQL but wrote only "SQL databases" may not match a
requirement that names PostgreSQL.

Use the exact terms the job advert uses, provided they are true. Write
the expansion and the acronym together the first time: "Continuous
Integration (CI)". Never hide keywords in white text or tiny fonts —
systems detect this and reject the application.

---

## 4. Required Sections

### 4.1 Contact Information

Must contain: full name, phone number with country code, a professional
email address, city and country, and a LinkedIn URL. A GitHub or
portfolio URL is expected for technical roles.

Must not contain: photograph, date of birth, marital status, national
identity number, religion, or full street address. In most Western
markets these invite discrimination claims and are routinely stripped.

An email like `coolguy2000@example.com` reads as careless. Use
`firstname.lastname@example.com`.

### 4.2 Professional Summary

Three or four lines at the top stating who the candidate is, their
strongest relevant skills, and what they are looking for.

A summary is not an objective statement. "Seeking a challenging role in
a reputed organisation to utilise my skills" says nothing and is a
recognised red flag. Replace it with something specific:

> Final-year Information Technology undergraduate with hands-on
> experience building REST APIs in Spring Boot and PostgreSQL. Built and
> deployed three full-stack projects. Looking for a backend engineering
> internship.

### 4.3 Skills

Group skills by category rather than listing them in one block:

```
Languages:  Java, Python, JavaScript, SQL
Frameworks: Spring Boot, React, FastAPI
Databases:  PostgreSQL, MongoDB, Redis
Tools:      Git, Docker, Maven, Postman
```

List only skills the candidate could discuss in an interview. Every item
here is a question the interviewer may ask.

Avoid self-assessed proficiency bars and star ratings. They are
subjective, they do not parse, and "Java ★★★★☆" invites the question of
what the missing star represents.

### 4.4 Experience

Reverse chronological order. Each entry carries job title, company,
location, and start and end dates.

Each bullet should follow the pattern **action verb → what was done →
measurable result**.

Weak:

> - Responsible for the backend of the company website

Strong:

> - Built 12 REST endpoints in Spring Boot serving 8,000 daily requests,
>   cutting average response time from 800 ms to 210 ms

Three to five bullets per role. Recent and relevant roles get more space
than older ones.

### 4.5 Education

Degree, institution, graduation year. Include GPA only if it is strong —
typically 3.0/4.0 or higher, or a second-class upper and above.

Students and recent graduates place education above experience.
Everyone else places it below.

Relevant coursework is worth listing only when the candidate has little
professional experience.

### 4.6 Projects

For students and career changers this is often the most important
section, because it is the only evidence of practical ability.

Each project needs a name, one or two lines of description, the
technologies used, and a link to source or a live deployment. State what
problem it solves, not only what it is built with.

Weak:

> - E-commerce website using React and Node.js

Strong:

> **StockTrack** — inventory system for a 3-branch retailer, replacing a
> shared spreadsheet. React, Node.js, PostgreSQL. Handles 1,200 SKUs and
> reduced weekly stock reconciliation from 4 hours to 20 minutes.
> github.com/user/stocktrack

### 4.7 Certifications

Name, issuing body, and year. Include the credential ID or verification
link where one exists. Omit expired certifications unless the field
still values them.

Course completion certificates from video platforms carry little weight
next to vendor certifications such as AWS, Azure, Oracle or CompTIA.

---

## 5. Action Verbs

Every bullet should begin with a verb describing what the candidate did.

**Building:** built, developed, implemented, designed, architected,
engineered, created, programmed

**Improving:** optimised, refactored, reduced, improved, accelerated,
streamlined, automated, migrated

**Leading:** led, coordinated, mentored, supervised, delivered, drove

**Analysing:** analysed, diagnosed, investigated, debugged, resolved,
identified

Avoid opening with "Responsible for", "Worked on", "Helped with", or
"Involved in". These describe presence rather than contribution and
leave the reader unable to tell what the candidate actually produced.

Use past tense for previous roles and present tense for the current one.

---

## 6. Quantified Achievements

A number turns a claim into evidence. Bullets without numbers read as
job descriptions rather than accomplishments.

Things that can be measured:

- Scale: users, requests per day, records processed, data volume
- Time: latency before and after, build duration, hours saved per week
- Money: cost reduced, revenue supported
- Quality: bug count, test coverage, uptime, error rate
- Team: people mentored, teams coordinated with

Where exact figures are unavailable, an honest approximation is
acceptable: "roughly 500 daily users". Inventing numbers is not — they
will be probed in the interview.

A CV with no numbers anywhere is one of the most common and most costly
weaknesses.

---

## 7. Formatting and Length

### 7.1 Length

One page for students, graduates, and anyone with under five years of
experience. Two pages is acceptable beyond that. Three pages is
justified only for senior or academic profiles with publications.

Long does not read as experienced. It reads as unable to prioritise.

### 7.2 Layout

- Single column
- Font size 10 to 12 for body text
- Consistent margins between 1.5 cm and 2.5 cm
- Clear white space between sections
- Bold used for job titles and company names, not scattered for emphasis
- Consistent date format throughout
- Bullets, not paragraphs, in the experience section

### 7.3 File

Export as PDF unless the employer asks for DOCX. Name the file
`Firstname_Lastname_CV.pdf`, never `cv_final_v3_updated.pdf`.

---

## 8. Common Mistakes

**Spelling and grammar errors.** The single most cited reason for
rejection. A CV is a writing sample.

**One CV sent everywhere.** The skills and summary should be adjusted
for each application to match the advert's wording.

**Unexplained employment gaps.** A gap is fine; an unexplained gap
invites speculation. A single line covering study, caregiving, or
freelance work resolves it.

**Personal pronouns.** CVs are written without "I" or "my".

**Listing every technology ever touched.** A skills section with sixty
entries signals that none of them are strong.

**Duties instead of achievements.** Describing the job rather than what
the candidate accomplished in it.

**Irrelevant hobbies.** "Reading, music, travelling" adds nothing. A
hobby earns space only when it demonstrates something relevant, such as
competitive programming or maintaining an open-source library.

**References available on request.** Assumed. The line wastes space.

**Missing links.** A technical CV without a GitHub or portfolio link
loses the strongest available evidence.

---

## 9. Fresh Graduate CVs

With little professional history, the CV must lead with what does exist.

**Order:** Contact → Summary → Education → Projects → Skills →
Internships → Certifications → Achievements

**Projects carry the weight.** Two or three substantial projects,
described with the problem solved and the outcome, are worth more than a
long list of small tutorials. Anything followed step by step from a
video is not evidence of independent ability.

**Internships count as experience.** Format them exactly as employment,
with the same action-verb and quantified-result structure.

**Academic work counts** when it is substantial: a final-year project, a
research assistantship, a published paper, a hackathon placement.

**University involvement counts** where it shows initiative — running a
society, organising an event, teaching a workshop.

What to avoid: listing every course taken, padding with school results,
claiming years of experience with a technology used only in one
assignment.

---

## 10. Experienced Candidate CVs

**Order:** Contact → Summary → Skills → Experience → Education →
Certifications

**Experience carries the weight.** Education shrinks to degree,
institution and year.

**Scope and impact matter more than tools.** Systems owned, scale
handled, teams led, decisions made, incidents resolved.

**Recency is weighted.** The last two roles get the most detail. Roles
older than ten years can be reduced to a single line or dropped.

**Progression should be visible.** Promotions and increasing scope
should read clearly, listed under one company where applicable.

**Technology lists still need pruning.** Keep what is current and
relevant; a decade-old framework no longer earns its space.

---

## 11. Tailoring for a Role

For each application:

1. Read the advert and list its required and preferred skills.
2. Ensure every requirement the candidate genuinely meets appears in the
   CV, using the advert's own wording.
3. Reorder the skills section so matching skills appear first.
4. Rewrite the summary to name the target role.
5. Promote the most relevant projects and experience.

A CV matching an advert's language passes both the ATS and the recruiter
scan. Tailoring is editing, never fabricating: every claim must survive
an interview.

---

## 12. Review Checklist

**Structure** — Contact details complete and parseable · Summary
specific to a target role · Standard section headings · Sensible order
for experience level

**Content** — Bullets open with action verbs · Achievements carry
numbers · Projects state the problem solved · Skills list is honest and
defensible · GitHub or portfolio link present

**Format** — Single column · Length appropriate to experience · Fonts
and dates consistent · Exported as PDF · Sensible filename

**Language** — No spelling or grammar errors · No personal pronouns · No
"Responsible for" openings · Past tense for previous roles

**Red flags** — Objective statement instead of a summary · No numbers
anywhere · Photograph or date of birth · Skill rating bars · "References
available on request" · Generic hobbies · Multi-column or table layout
