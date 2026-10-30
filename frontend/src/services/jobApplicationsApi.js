import { SPRING, authHeaders, handleResponse } from './api';

// ============================================================
// JOB APPLICATIONS
//
// A candidate applies for a job with one of their own CVs and explicit
// consent to share it; the recruiter reviews the application and
// shortlists or rejects by hand; only a shortlisted candidate can
// start the job's approved interview.
//
// Kept out of api.js for the same reason jobQuestionsApi.js is: the
// question and application work should not keep editing one shared
// file.
//
// Nothing here is a permission. The server re-checks ownership,
// consent, status and eligibility on every call; these helpers only
// decide what the page draws.
// ============================================================

const candidateBase = `${SPRING}/api/v1/candidate/applications`;
const recruiterBase = `${SPRING}/api/v1/recruiter`;

const id = (value) => encodeURIComponent(value);

// ---- Candidate -----------------------------------------------------

export const applicationsAPI = {

  // { resumeId, consentGranted }. consentGranted must be the
  // candidate's own tick: the server refuses the application without
  // it, and pressing Apply is not consent.
  //
  // Returns the created application: { applicationId, jobId, jobTitle,
  // company, recruiterName, inviteCode, status, statusLabel,
  // submittedCvFileName, appliedAt, decidedAt, interviewCompletedAt,
  // interviewAvailable, interviewResumable, interviewMessage }.
  apply: (jobId, { resumeId, consentGranted }) =>
    fetch(`${SPRING}/api/v1/jobs/${id(jobId)}/applications`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ resumeId, consentGranted }),
    }).then(handleResponse),

  // The candidate's own applications, newest first.
  mine: () =>
    fetch(candidateBase, {
      headers: authHeaders(),
    }).then(handleResponse),

  get: (applicationId) =>
    fetch(`${candidateBase}/${id(applicationId)}`, {
      headers: authHeaders(),
    }).then(handleResponse),

};

// ---- Recruiter -----------------------------------------------------

export const applicantsAPI = {

  // Applicants for one of the recruiter's own jobs, best CV match
  // first, with unknown matches last. Each row:
  // { applicationId, candidateId, candidateName, candidateEmail,
  //   appliedAt, submittedResumeId, submittedCvFileName,
  //   match: { matchPercentage, requiredSkillCount, matchedSkills,
  //            relatedSkills, missingSkills },
  //   experienceSummary, educationSummary, status, statusLabel,
  //   decidedAt, decidedByName, interviewCompleted, interviewScore }.
  //
  // match.matchPercentage may be null, which means "not available" -
  // not 0%.
  list: (jobId) =>
    fetch(`${recruiterBase}/jobs/${id(jobId)}/applications`, {
      headers: authHeaders(),
    }).then(handleResponse),

  // One applicant with the CV analysis they applied with:
  // { summary, jobId, jobTitle, requiredSkills, cvSnapshot,
  //   decisionOpen, consentVersion }.
  get: (applicationId) =>
    fetch(`${recruiterBase}/applications/${id(applicationId)}`, {
      headers: authHeaders(),
    }).then(handleResponse),

  // decision is 'SHORTLISTED' or 'REJECTED'. The server refuses
  // anything else, refuses reversing a decision already made, and
  // treats re-sending the same decision as a no-op.
  decide: (applicationId, decision) =>
    fetch(`${recruiterBase}/applications/${id(applicationId)}/decision`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ decision }),
    }).then(handleResponse),

  // Completed assessments for one job, side by side:
  // { jobId, jobTitle, company, questions: [...], candidates: [...] }.
  comparison: (jobId) =>
    fetch(`${recruiterBase}/jobs/${id(jobId)}/comparison`, {
      headers: authHeaders(),
    }).then(handleResponse),

  // ---- Final hiring decision ----
  //
  // Saving and announcing are separate calls on purpose: choosing an
  // option tells the candidate nothing until publish() is called.

  // { applicationId, decision, decisionLabel, publicationStatus,
  //   published, readyToPublish, candidateFeedback, internalNotes,
  //   decidedByName, decidedAt, publishedAt }.
  // internalNotes is recruiter-only and never reaches the candidate.
  getDecision: (applicationId) =>
    fetch(`${recruiterBase}/applications/${id(applicationId)}/hiring-decision`, {
      headers: authHeaders(),
    }).then(handleResponse),

  // decision is 'SELECTED', 'NOT_SELECTED' or 'PENDING'. Saves a
  // private draft; the candidate is told nothing.
  saveDecision: (applicationId, { decision, candidateFeedback, internalNotes }) =>
    fetch(`${recruiterBase}/applications/${id(applicationId)}/hiring-decision`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ decision, candidateFeedback, internalNotes }),
    }).then(handleResponse),

  // Announces the saved decision and notifies the candidate.
  // Idempotent: a repeated call returns the decision unchanged and
  // creates no second notification.
  publishDecision: (applicationId) =>
    fetch(`${recruiterBase}/applications/${id(applicationId)}/hiring-decision/publish`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handleResponse),

};

// ---- Notifications -------------------------------------------------
//
// Scoped to the signed-in user by the server, which takes the identity
// from the token rather than from anything sent here.

export const notificationsAPI = {

  // [{ id, type, title, message, applicationId, read, createdAt }]
  mine: () =>
    fetch(`${SPRING}/api/v1/notifications`, {
      headers: authHeaders(),
    }).then(handleResponse),

  unreadCount: () =>
    fetch(`${SPRING}/api/v1/notifications/unread-count`, {
      headers: authHeaders(),
    }).then(handleResponse),

  markRead: (notificationId) =>
    fetch(`${SPRING}/api/v1/notifications/${id(notificationId)}/read`, {
      method: 'POST',
      headers: authHeaders(),
    }).then(handleResponse),

};

// ---- Hiring decision display helpers -------------------------------

// Decision -> Badge tone. As everywhere else, the label itself comes
// from the server, so colour is never the only signal.
export function decisionTone(decision) {
  if (decision === 'SELECTED') return 'success';
  if (decision === 'NOT_SELECTED') return 'danger';
  return 'neutral';
}

// The wording a recruiter starts from. Deliberately editable: these are
// a courtesy, not a template the recruiter is stuck with.
export function defaultFeedback(decision, jobTitle) {
  const role = jobTitle || 'this position';

  if (decision === 'SELECTED') {
    return `Congratulations! You have been selected for the ${role} position. `
      + 'Our recruitment team will contact you regarding the next steps.';
  }

  if (decision === 'NOT_SELECTED') {
    return 'Thank you for attending the interview. After reviewing all '
      + `applications, we have decided not to proceed with your application for ${role}. `
      + 'We appreciate your interest and wish you success in future opportunities.';
  }

  return '';
}

// ---- Shared display helpers ----------------------------------------

// Status -> Badge tone. The label itself always comes from the server
// (statusLabel), so colour is never the only signal and the two sides
// never disagree about wording.
export const STATUS_TONES = {
  APPLIED: 'info',
  SHORTLISTED: 'success',
  REJECTED: 'danger',
  INTERVIEWED: 'neutral',
};

export function statusTone(status) {
  return STATUS_TONES[status] || 'neutral';
}

// A match percentage as text. Null is "Not available", never "0%": a
// zero would read as a weak candidate rather than a missing number.
export function matchLabel(percentage) {
  return percentage === null || percentage === undefined
    ? 'Not available'
    : `${percentage}%`;
}

// Bands for the match figure, so a strong CV match is not shown in the
// same colour as a weak one. Thresholds match the AI service's own
// wording in skill_gap/analyzer.py.
export function matchTone(percentage) {
  if (percentage === null || percentage === undefined) return 'neutral';
  if (percentage >= 80) return 'success';
  if (percentage >= 60) return 'info';
  if (percentage >= 40) return 'warning';
  return 'danger';
}
