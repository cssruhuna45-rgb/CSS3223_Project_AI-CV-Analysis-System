import { SPRING, authHeaders, handleResponse } from './api';

// ============================================================
// JOB QUESTIONS (recruiter)
// Spring Boot -> /api/v1/recruiter/jobs/{id}/questions
//
// A job's fixed interview: the questions every candidate for the job
// is asked, in order, and the key points their answers are graded
// against. Kept out of api.js so the question and application work do
// not keep editing one shared file.
//
// Every call returns the whole assessment: { jobId, title,
// requiredSkills, questionCount, approved, approvedAt, approvedBy,
// questions: [{ id, position, question, difficulty, topic, keyPoints,
// source }], issues: [string] }.
// ============================================================

const base = (jobId) => `${SPRING}/api/v1/recruiter/jobs/${encodeURIComponent(jobId)}`;

export const jobQuestionsAPI = {

  get: (jobId) =>
    fetch(`${base(jobId)}/questions`, {
      headers: authHeaders(),
    }).then(handleResponse),

  // { requiredSkills: [string], questionCount: 5-10 }. Before approval only.
  updateSettings: (jobId, settings) =>
    fetch(`${base(jobId)}/question-settings`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(settings),
    }).then(handleResponse),

  // Drafts a full set from the job's skills and description, replacing
  // the current draft. Can take a minute while the AI writes.
  generate: (jobId) =>
    fetch(`${base(jobId)}/questions/generate`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handleResponse),

  regenerate: (jobId, questionId) =>
    fetch(`${base(jobId)}/questions/${encodeURIComponent(questionId)}/regenerate`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handleResponse),

  // The whole draft, in the order it should be asked. A question
  // without an id is new.
  save: (jobId, questions) =>
    fetch(`${base(jobId)}/questions`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ questions }),
    }).then(handleResponse),

  approve: (jobId) =>
    fetch(`${base(jobId)}/questions/approve`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handleResponse),

};
