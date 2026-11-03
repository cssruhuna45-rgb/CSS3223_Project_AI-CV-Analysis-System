import { SPRING, authHeaders } from './api';
import { request } from './http';

// ============================================================
// PUBLIC JOBS
//
// A recruiter publishes a job to list it under Public Jobs, where
// signed-in candidates can find it and apply without an invite code.
// Publication is separate from Open/Closed: a published job that is
// closed stays listed but takes no applications. Archiving hides a job
// everywhere and retires its invite code, keeping its history.
//
// Kept out of api.js, like jobApplicationsApi.js, so this feature does
// not keep editing one shared file. Applying itself is not here: it is
// applicationsAPI.apply, the one application workflow.
//
// Nothing here is a permission. The server checks ownership and
// visibility on every call; these helpers only decide what is drawn.
// ============================================================

const id = (value) => encodeURIComponent(value);

// ---- Candidate -----------------------------------------------------

export const publicJobsAPI = {

  // Published jobs, most recently published first, closed ones
  // included: [{ id, title, company, jobField, jobDescription,
  // requiredSkills, publishedAt, open }]. No invite codes.
  list: () =>
    request(`${SPRING}/api/v1/jobs/public`, {
      headers: authHeaders(),
    }),

  // One published job, shaped like jobsAPI.preview's answer but without
  // the invite code, plus the candidate's own application if any.
  // A job that is not published is "not found".
  get: (jobId) =>
    request(`${SPRING}/api/v1/jobs/public/${id(jobId)}`, {
      headers: authHeaders(),
    }),

};

// ---- Recruiter -----------------------------------------------------

// change is one of publish, unpublish, archive, unarchive. Only the
// recruiter's own jobs: another's id is "not found". Returns the job
// without its counts, like closing one does.
const changeJob = (change) => (jobId) =>
  request(`${SPRING}/api/v1/recruiter/jobs/${id(jobId)}/${change}`, {
    method: 'POST',
    headers: authHeaders(),
  });

export const jobPublicationAPI = {
  publish: changeJob('publish'),
  unpublish: changeJob('unpublish'),
  archive: changeJob('archive'),
  unarchive: changeJob('unarchive'),
};
