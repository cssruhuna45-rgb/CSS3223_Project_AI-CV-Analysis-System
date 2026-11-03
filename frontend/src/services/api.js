import { request } from './http';

// Local development calls Spring directly; Docker sets / to use the
// frontend nginx API proxy on the same origin as the page.
export const SPRING = (process.env.REACT_APP_API_URL || 'http://localhost:8080').replace(/\/$/, '');

// The Python AI service is never called from the browser. Spring
// authenticates the user's JWT and proxies to it under /api/v1/ai,
// adding the shared internal API key server side.
const AI = `${SPRING}/api/v1/ai`;

const getToken = () => localStorage.getItem('token');

export const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

// Every call goes through request() in http.js, which turns any failure
// into an ApiError with a message that is safe to show. Re-exported for
// callers that only import this module.
export { request, ApiError, userMessage } from './http';


// ============================================================
// AUTH
// Spring Boot → /api/v1/auth
// ============================================================

export const authAPI = {
  forgotPassword: (email) =>
    request(`${SPRING}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token, password) =>
    request(`${SPRING}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    }),

  register: (name, email, password, role) =>
    request(`${SPRING}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
      }),
    }),

  login: (email, password) =>
    request(`${SPRING}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }),

  // The signed-in account as the server holds it now. A recruiter
  // waiting for approval polls this rather than logging out and in.
  me: () =>
    request(`${SPRING}/api/v1/users/me`, {
      headers: authHeaders(),
    }),

};


// ============================================================
// ADMIN
// Spring Boot -> /api/v1/admin (ADMIN role only)
// ============================================================

export const adminAPI = {

  recruiters: () =>
    request(`${SPRING}/api/v1/admin/recruiters`, {
      headers: authHeaders(),
    }),

  approve: (id) =>
    request(`${SPRING}/api/v1/admin/recruiters/${id}/approve`, {
      method: 'POST',
      headers: authHeaders(),
    }),

  reject: (id) =>
    request(`${SPRING}/api/v1/admin/recruiters/${id}/reject`, {
      method: 'POST',
      headers: authHeaders(),
    }),

};


// ============================================================
// RESUME
// Spring Boot → /api/v1/resumes
// ============================================================

export const resumeAPI = {

  upload: (file) => {
    const form = new FormData();

    form.append('file', file);

    return request(`${SPRING}/api/v1/resumes`, {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${getToken()}`,
      },

      body: form,

    });
  },


  getAll: () =>
    request(`${SPRING}/api/v1/resumes`, {
      headers: authHeaders(),
    }),


  // The analysis stored when this CV was uploaded. Lets a returning
  // candidate pick up where they left off instead of re-uploading.
  // 404 means the upload's best-effort analysis never completed.
  getAnalysis: (id) =>
    request(`${SPRING}/api/v1/resumes/${id}/analysis`, {
      headers: authHeaders(),
    }),


  getById: (id) =>
    request(`${SPRING}/api/v1/resumes/${id}`, {
      headers: authHeaders(),
    }),

  // A CV attached to a job application cannot be deleted; the server
  // says so (409) and that message is shown as it stands.
  delete: (id) =>
    request(`${SPRING}/api/v1/resumes/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),

};


// ============================================================
// AI RESUME ANALYSIS
// Spring Boot → /api/v1/ai/resume/analyze → FastAPI
// ============================================================

export const aiResumeAPI = {

  // Reviews how the CV is written, against the standards in
  // documents/cv_resume_standards_guide.md. Separate from analyze,
  // which only extracts what the CV says.
  feedback: (resumeId, resumeText) =>
    request(`${AI}/resume/feedback`, {
      method: 'POST',

      headers: authHeaders(),

      body: JSON.stringify({

        resume_id:
          Number(resumeId) || 1,

        resume_text:
          typeof resumeText === 'string'
            ? resumeText
            : (resumeText?.text || ''),

      }),

    }),

  // Rewrites one bullet in Google's XYZ form. Facts the bullet does not
  // give come back as [bracketed] gaps for the candidate to fill; the
  // AI never supplies the numbers.
  tuneBullet: (bullet, jobField = '') =>
    request(`${AI}/resume/bullet/tune`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ bullet, job_field: jobField }),
    }),

  analyze: (resumeId, resumeText) =>
    request(`${AI}/resume/analyze`, {
      method: 'POST',

      headers: authHeaders(),

      body: JSON.stringify({

        resume_id:
          Number(resumeId) || 1,

        resume_text:
          typeof resumeText === 'string'
            ? resumeText
            : (resumeText?.text || ''),

      }),

    }),

};


// ============================================================
// INTERVIEW SESSION
// Spring Boot → /api/v1/ai/interview → FastAPI
// ============================================================

export const interviewAPI = {

  // ----------------------------------------------------------
  // START INTERVIEW
  //
  // Skill Gap information is passed to the AI service.
  // ----------------------------------------------------------

  start: (
    jobDescription,
    candidateResume,
    jobField = '',
    matchedSkills = [],
    relatedSkills = [],
    missingSkills = [],
    additionalSkills = [],
    mode = null,
    inviteCode = null
  ) => {

    console.log(
      '[Frontend API] Starting interview with Skill Gap context:'
    );

    console.log(
      '[Frontend API] Job Field:',
      jobField
    );

    console.log(
      '[Frontend API] Matched Skills:',
      matchedSkills
    );

    console.log(
      '[Frontend API] Related Skills:',
      relatedSkills
    );

    console.log(
      '[Frontend API] Missing Skills:',
      missingSkills
    );

    console.log(
      '[Frontend API] Additional Skills:',
      additionalSkills
    );

    return request(
      `${AI}/interview/start`,
      {
        method: 'POST',

        headers: authHeaders(),

        body: JSON.stringify({

          // Interview information
          job_description:
            jobDescription,

          candidate_resume:
            candidateResume,

          // Which stored resume this interview is about, so the
          // backend can file the interview against it. Spring checks
          // that the resume really belongs to the signed-in user and
          // stores no resume at all when it does not, so a stale or
          // made-up value here is harmless. The AI service ignores
          // fields it does not declare.
          resume_id:
            Number(sessionStorage.getItem('resumeId')) || null,

          // Selected job field
          job_field:
            jobField,

          // Skill Gap context
          matched_skills:
            Array.isArray(matchedSkills)
              ? matchedSkills
              : [],

          related_skills:
            Array.isArray(relatedSkills)
              ? relatedSkills
              : [],

          missing_skills:
            Array.isArray(missingSkills)
              ? missingSkills
              : [],

          additional_skills:
            Array.isArray(additionalSkills)
              ? additionalSkills
              : [],

          // 'practice' or 'exam'. Spring stores it so progress can
          // compare exam scores only; the AI service ignores it.
          mode,

          // A recruiter's invite code. Spring checks it, replaces the
          // job description, field and mode with the job's own, and
          // files the interview under that job so its recruiter sees
          // it. Null for an interview the candidate takes on their own.
          invite_code:
            inviteCode,

        }),

      }
    );

  },


  // ----------------------------------------------------------
  // SUBMIT ANSWER
  // ----------------------------------------------------------

  submitAnswer: (
    sessionId,
    answer,
    integrity = null
  ) =>
    request(
      `${AI}/interview/answer`,
      {
        method: 'POST',

        headers: authHeaders(),

        body: JSON.stringify({

          session_id:
            sessionId,

          answer:
            answer,

          // Exam mode only: how often the candidate left the page and
          // pasted while writing this answer. Spring stores it on the
          // answer for the recruiter; the AI service ignores it.
          ...(integrity ? { integrity } : {}),

        }),

      }
    ),


  // ----------------------------------------------------------
  // MODEL ANSWER
  //
  // The answer the candidate should have given, built from the same
  // knowledge base the question came from. Shown right after they
  // submit, while the question is still fresh.
  // ----------------------------------------------------------

  getModelAnswer: (
    sessionId,
    question,
    answer,
    jobField
  ) =>
    request(
      `${AI}/interview/model-answer`,
      {
        method: 'POST',

        headers: authHeaders(),

        body: JSON.stringify({

          session_id:
            sessionId || '',

          question:
            question,

          answer:
            answer || '',

          job_field:
            jobField || '',

        }),

      }
    ),


  // ----------------------------------------------------------
  // FINISH INTERVIEW
  // ----------------------------------------------------------

  finish: (
    sessionId
  ) =>
    request(
      `${AI}/interview/finish`,
      {
        method: 'POST',

        headers: authHeaders(),

        body: JSON.stringify({

          session_id:
            sessionId,

        }),

      }
    ),


  // ----------------------------------------------------------
  // INTERVIEW HISTORY AND PROGRESS
  //
  // Spring Boot only - these read PostgreSQL and never reach the
  // AI service, so the data survives a restart of either service.
  //
  // Neither takes a user id: the backend uses the signed-in user
  // from the JWT, so there is nothing here that could ask for
  // somebody else's interviews.
  // ----------------------------------------------------------

  history: () =>
    request(
      `${SPRING}/api/v1/interviews/history`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    ),

  // A job interview already under way, continued after a reload. The
  // server checks the session is the signed-in candidate's and sends
  // back the question they were on.
  resume: (sessionId) =>
    request(
      `${SPRING}/api/v1/interviews/${encodeURIComponent(sessionId)}/resume`,
      { method: 'POST', headers: authHeaders() }
    ),

  // The stored scorecard for a past interview, so a result can be
  // reopened from the home page rather than only right after finishing.
  getScorecard: (sessionId) =>
    request(
      `${SPRING}/api/v1/interviews/${encodeURIComponent(sessionId)}/scorecard`,
      { headers: authHeaders() }
    ),


  progress: () =>
    request(
      `${SPRING}/api/v1/interviews/progress`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    ),


  // ----------------------------------------------------------
  // GET SESSION
  //
  // NOTE: currently unused, and not implemented on either side —
  // the AI service has no GET /api/v1/interview/{id} route and the
  // Spring proxy exposes no matching mapping, so this 404s. Kept as
  // the intended shape for when session lookup is added.
  // ----------------------------------------------------------

  getSession: (
    sessionId
  ) =>
    request(
      `${AI}/interview/${sessionId}`,
      {
        headers: authHeaders(),
      }
    ),

};


// ============================================================
// RECRUITER
// Spring Boot -> /api/v1/recruiter
// ============================================================

export const recruiterAPI = {

  // Interviews taken for this recruiter's own jobs, plus the headline
  // totals. jobId narrows to one job. Approved recruiters only: the
  // backend rejects anyone else's token with 403.
  overview: (jobId = null) =>
    request(`${SPRING}/api/v1/recruiter/overview${jobId ? `?jobId=${encodeURIComponent(jobId)}` : ''}`, {
      headers: authHeaders(),
    }),

  jobs: () =>
    request(`${SPRING}/api/v1/recruiter/jobs`, {
      headers: authHeaders(),
    }),

  // { title, company, jobField, jobDescription } -> the job with its
  // new invite code.
  createJob: (job) =>
    request(`${SPRING}/api/v1/recruiter/jobs`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(job),
    }),

  closeJob: (id) =>
    request(`${SPRING}/api/v1/recruiter/jobs/${id}/close`, {
      method: 'POST',
      headers: authHeaders(),
    }),

  reopenJob: (id) =>
    request(`${SPRING}/api/v1/recruiter/jobs/${id}/reopen`, {
      method: 'POST',
      headers: authHeaders(),
    }),

};


// ============================================================
// JOB INVITES (candidate side)
// Spring Boot -> /api/v1/jobs
// ============================================================

export const jobsAPI = {

  // The job behind an invite code, shown before the candidate agrees
  // to share an interview with its recruiter.
  preview: (code) =>
    request(`${SPRING}/api/v1/jobs/invite/${encodeURIComponent(code)}`, {
      headers: authHeaders(),
    }),

};


// ============================================================
// SKILL GAP ANALYSIS
// Spring Boot → /api/v1/ai/skill-gap/analyze → FastAPI
// ============================================================

export const skillGapAPI = {

  analyze: (
    resumeIdOrJobField,
    jobFieldOrResumeText,
    candidateResumeText
  ) => {

    let payload;


    // --------------------------------------------------------
    // FORMAT 1
    //
    // analyze({
    //   resume_id,
    //   job_field,
    //   candidate_resume
    // })
    // --------------------------------------------------------

    if (
      typeof resumeIdOrJobField === 'object' &&
      resumeIdOrJobField !== null
    ) {

      payload = {

        resume_id:
          Number(
            resumeIdOrJobField.resume_id ||
            resumeIdOrJobField.resumeId ||
            1
          ),

        job_field:
          resumeIdOrJobField.job_field ||
          resumeIdOrJobField.jobField ||
          'software_engineering',

        candidate_resume:
          resumeIdOrJobField.candidate_resume ||
          resumeIdOrJobField.candidateResume ||
          resumeIdOrJobField.resume_text ||
          '',

      };

    }


    // --------------------------------------------------------
    // FORMAT 2
    //
    // analyze(
    //   resumeId,
    //   jobField,
    //   candidateResume
    // )
    // --------------------------------------------------------

    else if (
      candidateResumeText !== undefined
    ) {

      payload = {

        resume_id:
          Number(resumeIdOrJobField) || 1,

        job_field:
          String(jobFieldOrResumeText),

        candidate_resume:
          String(candidateResumeText),

      };

    }


    // --------------------------------------------------------
    // FORMAT 3
    //
    // analyze(
    //   jobField,
    //   candidateResume
    // )
    // --------------------------------------------------------

    else {

      payload = {

        resume_id:
          Number(
            sessionStorage.getItem('resumeId')
          ) || 1,

        job_field:
          String(resumeIdOrJobField),

        candidate_resume:
          String(jobFieldOrResumeText),

      };

    }


    console.log(
      '[Frontend API] Skill Gap request:',
      payload
    );


    return request(
      `${AI}/skill-gap/analyze`,
      {
        method: 'POST',

        headers: authHeaders(),

        body: JSON.stringify(payload),

      }
    );

  },

};


// ============================================================
// HEALTH CHECK
// Spring Boot → /api/v1/ai/health → FastAPI
// ============================================================

export const healthAPI = {

  check: () =>
    request(
      `${AI}/health`,
      {
        headers: authHeaders(),
      }
    ),

};


// ============================================================
// 14-DAY LEARNING ROADMAP
// Spring Boot → /api/v1/roadmaps
// ============================================================

export const roadmapAPI = {

  generate: (data) =>
    request(`${SPRING}/api/v1/roadmaps/generate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }),

  getBySessionId: (sessionId) =>
    request(`${SPRING}/api/v1/roadmaps/session/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: authHeaders(),
    }),

  getLatest: () =>
    request(`${SPRING}/api/v1/roadmaps/latest`, {
      method: 'GET',
      headers: authHeaders(),
    }),

  getById: (id) =>
    request(`${SPRING}/api/v1/roadmaps/${id}`, {
      method: 'GET',
      headers: authHeaders(),
    }),

  updateProgress: (id, dayNumber, completed) =>
    request(`${SPRING}/api/v1/roadmaps/${id}/progress`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        day_number: dayNumber,
        completed: completed,
      }),
    }),

};

