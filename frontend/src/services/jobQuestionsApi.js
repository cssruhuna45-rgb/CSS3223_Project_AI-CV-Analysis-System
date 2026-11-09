import { SPRING, authHeaders } from './api';
import { request } from './http';

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
    request(`${base(jobId)}/questions`, {
      headers: authHeaders(),
    }),

  // { requiredSkills: [string], questionCount: 5-10 }. Before approval only.
  updateSettings: (jobId, settings) =>
    request(`${base(jobId)}/question-settings`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(settings),
    }),

  // Drafts a full set from the job's skills and description, replacing
  // the current draft. Can take a minute while the AI writes.
  generate: (jobId) =>
    request(`${base(jobId)}/questions/generate`, {
      method: 'POST',
      headers: authHeaders(),
    }),

  // Replaces one question. { difficulty, topic } is optional: when given,
  // the new question is written at that difficulty, about that topic.
  regenerate: (jobId, questionId, { difficulty, topic } = {}) =>
    request(`${base(jobId)}/questions/${encodeURIComponent(questionId)}/regenerate`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ difficulty: difficulty || null, topic: (topic || '').trim() || null }),
    }),

  // Writes one new question at { difficulty } (and { topic }, when given)
  // and adds it after the saved questions; nothing else in the set
  // changes. draftQuestions is the text in the editor, saved or not, so
  // the new question repeats none of it.
  add: (jobId, { difficulty, topic, draftQuestions = [] }) =>
    request(`${base(jobId)}/questions/add`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        difficulty,
        topic: (topic || '').trim() || null,
        draftQuestions: draftQuestions.map((q) => (q || '').trim()).filter(Boolean),
      }),
    }),

  // The whole draft, in the order it should be asked. A question
  // without an id is new.
  save: (jobId, questions) =>
    request(`${base(jobId)}/questions`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ questions }),
    }),

  approve: (jobId) =>
    request(`${base(jobId)}/questions/approve`, {
      method: 'POST',
      headers: authHeaders(),
    }),

};
