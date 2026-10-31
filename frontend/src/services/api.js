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

export async function handleResponse(res) {
  if (!res.ok) {
    // 401: no valid session (missing, expired or tampered token). The
    // stored login is useless, so it is cleared and the user signs in.
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
      throw new Error('Your session has expired. Please log in again.');
    }

    // 403: signed in, but this account may not do this - a recruiter
    // whose access was just revoked, say. Signing them out would be the
    // wrong answer and lose their place; the page shows the message.
    // The backend answers 401 and 403 separately for exactly this
    // (SecurityConfig's authentication entry point).
    if (res.status === 403) {
      const denied = await res.json().catch(() => ({}));
      throw new Error(denied.message || 'You do not have permission to do that.');
    }

    const err = await res.json().catch(() => ({}));
    // FastAPI uses `detail`, Spring Boot uses `message`/`error`
    const msg =
      err.message ||
      (typeof err.detail === 'string' ? err.detail : null) ||
      (Array.isArray(err.detail) ? err.detail.map((d) => d.msg).join(', ') : null) ||
      err.error ||
      `Request failed (${res.status} ${res.statusText})`;
    throw new Error(msg);
  }

  return res.json();
}


// ============================================================
// AUTH
// Spring Boot → /api/v1/auth
// ============================================================

export const authAPI = {
  forgotPassword: (email) =>
    fetch(`${SPRING}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(handleResponse),

  resetPassword: (token, password) =>
    fetch(`${SPRING}/api/v1/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    }).then(handleResponse),

  register: (name, email, password, role) =>
    fetch(`${SPRING}/api/v1/auth/register`, {
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
    }).then(handleResponse),

  login: (email, password) =>
    fetch(`${SPRING}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    }).then(handleResponse),

  // The signed-in account as the server holds it now. A recruiter
  // waiting for approval polls this rather than logging out and in.
  me: () =>
    fetch(`${SPRING}/api/v1/users/me`, {
      headers: authHeaders(),
    }).then(handleResponse),

};


// ============================================================
// ADMIN
// Spring Boot -> /api/v1/admin (ADMIN role only)
// ============================================================

export const adminAPI = {

  recruiters: () =>
    fetch(`${SPRING}/api/v1/admin/recruiters`, {
      headers: authHeaders(),
    }).then(handleResponse),

  approve: (id) =>
    fetch(`${SPRING}/api/v1/admin/recruiters/${id}/approve`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handleResponse),

  reject: (id) =>
    fetch(`${SPRING}/api/v1/admin/recruiters/${id}/reject`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handleResponse),

};


// ============================================================
// RESUME
// Spring Boot → /api/v1/resumes
// ============================================================

export const resumeAPI = {

  upload: (file) => {
    const form = new FormData();

    form.append('file', file);

    return fetch(`${SPRING}/api/v1/resumes`, {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${getToken()}`,
      },

      body: form,

    }).then(handleResponse);
  },


  getAll: () =>
    fetch(`${SPRING}/api/v1/resumes`, {
      headers: authHeaders(),
    }).then(handleResponse),


  // The analysis stored when this CV was uploaded. Lets a returning
  // candidate pick up where they left off instead of re-uploading.
  // 404 means the upload's best-effort analysis never completed.
  getAnalysis: (id) =>
    fetch(`${SPRING}/api/v1/resumes/${id}/analysis`, {
      headers: authHeaders(),
    }).then(handleResponse),


  getById: (id) =>
    fetch(`${SPRING}/api/v1/resumes/${id}`, {
      headers: authHeaders(),
    }).then(handleResponse),

  delete: (id) =>
    fetch(`${SPRING}/api/v1/resumes/${id}`, {
      method: 'DELETE',

      headers: authHeaders(),

    }).then((res) => {

      if (!res.ok) {
        throw new Error('Delete failed');
      }

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
    fetch(`${AI}/resume/feedback`, {
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

    }).then(handleResponse),

  // Rewrites one bullet in Google's XYZ form. Facts the bullet does not
  // give come back as [bracketed] gaps for the candidate to fill; the
  // AI never supplies the numbers.
  tuneBullet: (bullet, jobField = '') =>
    fetch(`${AI}/resume/bullet/tune`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ bullet, job_field: jobField }),
    }).then(handleResponse),

  analyze: (resumeId, resumeText) =>
    fetch(`${AI}/resume/analyze`, {
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

    }).then(handleResponse),

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

    return fetch(
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
    ).then(handleResponse);

  },


  // ----------------------------------------------------------
  // SUBMIT ANSWER
  // ----------------------------------------------------------

  submitAnswer: (
    sessionId,
    answer,
    integrity = null
  ) =>
    fetch(
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
    ).then(handleResponse),


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
    fetch(
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
    ).then(handleResponse),


  // ----------------------------------------------------------
  // FINISH INTERVIEW
  // ----------------------------------------------------------

  finish: (
    sessionId
  ) =>
    fetch(
      `${AI}/interview/finish`,
      {
        method: 'POST',

        headers: authHeaders(),

        body: JSON.stringify({

          session_id:
            sessionId,

        }),

      }
    ).then(handleResponse),


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
    fetch(
      `${SPRING}/api/v1/interviews/history`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    ).then(handleResponse),

  // The stored scorecard for a past interview, so a result can be
  // reopened from the home page rather than only right after finishing.
  getScorecard: (sessionId) =>
    fetch(
      `${SPRING}/api/v1/interviews/${encodeURIComponent(sessionId)}/scorecard`,
      { headers: authHeaders() }
    ).then(handleResponse),


  progress: () =>
    fetch(
      `${SPRING}/api/v1/interviews/progress`,
      {
        method: 'GET',
        headers: authHeaders(),
      }
    ).then(handleResponse),


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
    fetch(
      `${AI}/interview/${sessionId}`,
      {
        headers: authHeaders(),
      }
    ).then(handleResponse),

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
    fetch(`${SPRING}/api/v1/recruiter/overview${jobId ? `?jobId=${encodeURIComponent(jobId)}` : ''}`, {
      headers: authHeaders(),
    }).then(handleResponse),

  jobs: () =>
    fetch(`${SPRING}/api/v1/recruiter/jobs`, {
      headers: authHeaders(),
    }).then(handleResponse),

  // { title, company, jobField, jobDescription } -> the job with its
  // new invite code.
  createJob: (job) =>
    fetch(`${SPRING}/api/v1/recruiter/jobs`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(job),
    }).then(handleResponse),

  closeJob: (id) =>
    fetch(`${SPRING}/api/v1/recruiter/jobs/${id}/close`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handleResponse),

  reopenJob: (id) =>
    fetch(`${SPRING}/api/v1/recruiter/jobs/${id}/reopen`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handleResponse),

};


// ============================================================
// JOB INVITES (candidate side)
// Spring Boot -> /api/v1/jobs
// ============================================================

export const jobsAPI = {

  // The job behind an invite code, shown before the candidate agrees
  // to share an interview with its recruiter.
  preview: (code) =>
    fetch(`${SPRING}/api/v1/jobs/invite/${encodeURIComponent(code)}`, {
      headers: authHeaders(),
    }).then(handleResponse),

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


    return fetch(
      `${AI}/skill-gap/analyze`,
      {
        method: 'POST',

        headers: authHeaders(),

        body: JSON.stringify(payload),

      }
    ).then(handleResponse);

  },

};


// ============================================================
// HEALTH CHECK
// Spring Boot → /api/v1/ai/health → FastAPI
// ============================================================

export const healthAPI = {

  check: () =>
    fetch(
      `${AI}/health`,
      {
        headers: authHeaders(),
      }
    ).then(handleResponse),

};


// ============================================================
// 14-DAY LEARNING ROADMAP
// Spring Boot → /api/v1/roadmaps
// ============================================================

export const roadmapAPI = {

  generate: (data) =>
    fetch(`${SPRING}/api/v1/roadmaps/generate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse),

  getBySessionId: (sessionId) =>
    fetch(`${SPRING}/api/v1/roadmaps/session/${encodeURIComponent(sessionId)}`, {
      method: 'GET',
      headers: authHeaders(),
    }).then(handleResponse),

  getLatest: () =>
    fetch(`${SPRING}/api/v1/roadmaps/latest`, {
      method: 'GET',
      headers: authHeaders(),
    }).then(handleResponse),

  getById: (id) =>
    fetch(`${SPRING}/api/v1/roadmaps/${id}`, {
      method: 'GET',
      headers: authHeaders(),
    }).then(handleResponse),

  updateProgress: (id, dayNumber, completed) =>
    fetch(`${SPRING}/api/v1/roadmaps/${id}/progress`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({
        day_number: dayNumber,
        completed: completed,
      }),
    }).then(handleResponse),

};

