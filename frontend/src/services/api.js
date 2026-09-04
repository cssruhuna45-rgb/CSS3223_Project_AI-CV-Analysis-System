const SPRING = 'http://localhost:8080';
const FASTAPI = 'http://localhost:8000';

const getToken = () => localStorage.getItem('token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

async function handleResponse(res) {
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
      throw new Error('Your session has expired. Please log in again.');
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

// ── Auth  →  Spring Boot /api/v1/auth ──────────────────────────────────────
export const authAPI = {
  register: (name, email, password, role) =>
    fetch(`${SPRING}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role }),
    }).then(handleResponse),

  login: (email, password) =>
    fetch(`${SPRING}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse),
};

// ── Resume  →  Spring Boot /api/v1/resumes ─────────────────────────────────
export const resumeAPI = {
  upload: (file) => {
    const form = new FormData();
    form.append('file', file);
    return fetch(`${SPRING}/api/v1/resumes`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: form,
    }).then(handleResponse);
  },

  getAll: () =>
    fetch(`${SPRING}/api/v1/resumes`, { headers: authHeaders() }).then(handleResponse),

  getById: (id) =>
    fetch(`${SPRING}/api/v1/resumes/${id}`, { headers: authHeaders() }).then(handleResponse),

  delete: (id) =>
    fetch(`${SPRING}/api/v1/resumes/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(res => { if (!res.ok) throw new Error('Delete failed'); }),
};

// ── AI Resume Analysis  →  FastAPI /api/v1/resume/analyze ──────────────────
export const aiResumeAPI = {
  analyze: (resumeId, resumeText) =>
    fetch(`${FASTAPI}/api/v1/resume/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resume_id: Number(resumeId) || 1,
        resume_text: typeof resumeText === 'string' ? resumeText : (resumeText?.text || ''),
      }),
    }).then(handleResponse),
};

// ── Interview Session  →  FastAPI /api/v1/interview ────────────────────────
export const interviewAPI = {
  start: (jobDescription, candidateResume) =>
    fetch(`${FASTAPI}/api/v1/interview/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_description: jobDescription, candidate_resume: candidateResume }),
    }).then(handleResponse),

  submitAnswer: (sessionId, answer) =>
    fetch(`${FASTAPI}/api/v1/interview/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, answer }),
    }).then(handleResponse),

  finish: (sessionId) =>
    fetch(`${FASTAPI}/api/v1/interview/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    }).then(handleResponse),

  getSession: (sessionId) =>
    fetch(`${FASTAPI}/api/v1/interview/${sessionId}`).then(handleResponse),
};

// ── Skill Gap Analysis  →  FastAPI /api/v1/skill-gap/analyze ─────────────
export const skillGapAPI = {
  analyze: (resumeIdOrJobField, jobFieldOrResumeText, candidateResumeText) => {
    let payload;
    if (typeof resumeIdOrJobField === 'object' && resumeIdOrJobField !== null) {
      payload = {
        resume_id: Number(resumeIdOrJobField.resume_id || resumeIdOrJobField.resumeId || 1),
        job_field: resumeIdOrJobField.job_field || resumeIdOrJobField.jobField || 'software_engineering',
        candidate_resume: resumeIdOrJobField.candidate_resume || resumeIdOrJobField.candidateResume || resumeIdOrJobField.resume_text || '',
      };
    } else if (candidateResumeText !== undefined) {
      // Called with (resumeId, jobField, candidateResume)
      payload = {
        resume_id: Number(resumeIdOrJobField) || 1,
        job_field: String(jobFieldOrResumeText),
        candidate_resume: String(candidateResumeText),
      };
    } else {
      // Called with (jobField, candidateResume)
      payload = {
        resume_id: Number(sessionStorage.getItem('resumeId')) || 1,
        job_field: String(resumeIdOrJobField),
        candidate_resume: String(jobFieldOrResumeText),
      };
    }

    return fetch(`${FASTAPI}/api/v1/skill-gap/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(handleResponse);
  },
};

// ── Health Check  →  FastAPI /health ───────────────────────────────────────
export const healthAPI = {
  check: () => fetch(`${FASTAPI}/health`).then(handleResponse),
};

