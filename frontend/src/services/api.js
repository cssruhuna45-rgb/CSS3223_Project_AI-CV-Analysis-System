const SPRING = 'http://localhost:8080';
const FASTAPI = 'http://localhost:8000';

const getToken = () => localStorage.getItem('token');

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
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
  analyze: (resumeId, text) =>
    fetch(`${FASTAPI}/api/v1/resume/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resume_id: resumeId, text }),
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
  analyze: (jobDescription, candidateResume) =>
    fetch(`${FASTAPI}/api/v1/skill-gap/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_description: jobDescription, candidate_resume: candidateResume }),
    }).then(handleResponse),
};

// ── Health Check  →  FastAPI /health ───────────────────────────────────────
export const healthAPI = {
  check: () => fetch(`${FASTAPI}/health`).then(handleResponse),
};
