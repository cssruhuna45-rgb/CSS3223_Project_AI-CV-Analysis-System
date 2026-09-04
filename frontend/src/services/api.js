const SPRING = 'http://localhost:8080';
const FASTAPI = 'http://localhost:8000';

const getToken = () => localStorage.getItem('token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ message: res.statusText }));

    throw new Error(
      err.message ||
      err.detail ||
      'Request failed'
    );
  }

  return res.json();
}


// ============================================================
// AUTH
// Spring Boot → /api/v1/auth
// ============================================================

export const authAPI = {

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
// FastAPI → /api/v1/resume/analyze
// ============================================================

export const aiResumeAPI = {

  analyze: (resumeId, resumeText) =>
    fetch(`${FASTAPI}/api/v1/resume/analyze`, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

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
// FastAPI → /api/v1/interview
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
    additionalSkills = []
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
      `${FASTAPI}/api/v1/interview/start`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({

          // Interview information
          job_description:
            jobDescription,

          candidate_resume:
            candidateResume,

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

        }),

      }
    ).then(handleResponse);

  },


  // ----------------------------------------------------------
  // SUBMIT ANSWER
  // ----------------------------------------------------------

  submitAnswer: (
    sessionId,
    answer
  ) =>
    fetch(
      `${FASTAPI}/api/v1/interview/answer`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({

          session_id:
            sessionId,

          answer:
            answer,

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
      `${FASTAPI}/api/v1/interview/finish`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({

          session_id:
            sessionId,

        }),

      }
    ).then(handleResponse),


  // ----------------------------------------------------------
  // GET SESSION
  // ----------------------------------------------------------

  getSession: (
    sessionId
  ) =>
    fetch(
      `${FASTAPI}/api/v1/interview/${sessionId}`
    ).then(handleResponse),

};


// ============================================================
// SKILL GAP ANALYSIS
// FastAPI → /api/v1/skill-gap/analyze
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
      `${FASTAPI}/api/v1/skill-gap/analyze`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify(payload),

      }
    ).then(handleResponse);

  },

};


// ============================================================
// HEALTH CHECK
// FastAPI → /health
// ============================================================

export const healthAPI = {

  check: () =>
    fetch(
      `${FASTAPI}/health`
    ).then(handleResponse),

};