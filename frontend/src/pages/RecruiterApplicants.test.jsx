import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import RecruiterApplicants from './RecruiterApplicants';
import { recruiterAPI } from '../services/api';
import { applicantsAPI } from '../services/jobApplicationsApi';

// react-router-dom 7's "react-router/dom" subpath export is not
// resolvable by react-scripts 5's Jest. The page uses navigation and
// the query string, so both are stubbed; mockSearch is what each test
// sets to choose which view renders.
const mockNavigate = jest.fn();
const mockSearch = { current: new URLSearchParams('job=5') };

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => [
    mockSearch.current,
    (next) => { mockSearch.current = new URLSearchParams(next); },
  ],
}));

jest.mock('../services/api', () => ({
  recruiterAPI: { jobs: jest.fn() },
}));

jest.mock('../services/jobApplicationsApi', () => ({
  ...jest.requireActual('../services/jobApplicationsApi'),
  applicantsAPI: { list: jest.fn(), get: jest.fn(), decide: jest.fn() },
}));

const JOBS = [{ id: 5, title: 'Backend Developer', applicationCount: 2 }];

const APPLICANT = {
  applicationId: 77,
  candidateId: 20,
  candidateName: 'Cara Silva',
  candidateEmail: 'cara@example.com',
  appliedAt: '2026-01-10T10:00:00',
  submittedResumeId: 31,
  submittedCvFileName: 'cara-cv.pdf',
  match: {
    matchPercentage: 75,
    requiredSkillCount: 4,
    matchedSkills: ['java', 'spring boot', 'docker'],
    relatedSkills: ['Terraform'],
    missingSkills: ['postgresql'],
  },
  experienceSummary: 'Intern · Acme · 2023',
  educationSummary: 'BSc, Computer Science · Ruhuna · 2025',
  status: 'APPLIED',
  statusLabel: 'Under review',
  interviewCompleted: false,
  interviewScore: null,
};

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  mockSearch.current = new URLSearchParams('job=5');
  recruiterAPI.jobs.mockResolvedValue(JOBS);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.clearAllMocks();
});

async function render(applicants) {
  applicantsAPI.list.mockResolvedValue(applicants);

  await act(async () => {
    root.render(<RecruiterApplicants />);
  });
}

const button = (text) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent.trim() === text);

async function click(element) {
  await act(async () => { element.click(); });
}

// ---- The list --------------------------------------------------------

test('an applicant row shows the candidate, their match and their background', async () => {
  await render([APPLICANT]);

  expect(container.textContent).toContain('Cara Silva');
  expect(container.textContent).toContain('cara@example.com');
  expect(container.textContent).toContain('75%');
  expect(container.textContent).toContain('3 of 4 required skills');
  expect(container.textContent).toContain('Intern · Acme · 2023');
  expect(container.textContent).toContain('BSc, Computer Science · Ruhuna · 2025');
  expect(container.textContent).toContain('cara-cv.pdf');
  expect(container.textContent).toContain('Under review');
});

test('matched, related and missing skills are shown as separate groups', async () => {
  await render([APPLICANT]);

  // A related skill must never be presented as a match.
  expect(container.textContent).toContain('Matched');
  expect(container.textContent).toContain('Related');
  expect(container.textContent).toContain('Missing');
  expect(container.textContent).toContain('Terraform');
  expect(container.textContent).toContain('postgresql');
});

test('an uncomputed match reads "Not available" rather than 0%', async () => {
  await render([{
    ...APPLICANT,
    match: {
      matchPercentage: null,
      requiredSkillCount: null,
      matchedSkills: [],
      relatedSkills: [],
      missingSkills: [],
    },
  }]);

  expect(container.textContent).toContain('Not available');
  expect(container.textContent).not.toContain('0%');
});

test('candidates are ordered by match, with unknown matches last', async () => {
  const strong = { ...APPLICANT, applicationId: 1, candidateName: 'Alpha', match: { ...APPLICANT.match, matchPercentage: 90 } };
  const weak = { ...APPLICANT, applicationId: 2, candidateName: 'Beta', match: { ...APPLICANT.match, matchPercentage: 20 } };
  const unknown = { ...APPLICANT, applicationId: 3, candidateName: 'Gamma', match: { ...APPLICANT.match, matchPercentage: null } };

  await render([unknown, weak, strong]);

  const names = [...container.querySelectorAll('h2')].map((h) => h.textContent);

  expect(names).toEqual(['Alpha', 'Beta', 'Gamma']);
});

test('an interviewed applicant shows their interview score separately from the CV match', async () => {
  await render([{
    ...APPLICANT,
    status: 'INTERVIEWED',
    statusLabel: 'Interview completed',
    interviewCompleted: true,
    interviewScore: 68,
  }]);

  expect(container.textContent).toContain('CV skill match');
  expect(container.textContent).toContain('75%');
  expect(container.textContent).toContain('Interview score');
  expect(container.textContent).toContain('68/100');
});

test('an interviewed applicant whose grading failed shows "not graded"', async () => {
  await render([{
    ...APPLICANT,
    status: 'INTERVIEWED',
    statusLabel: 'Interview completed',
    interviewCompleted: true,
    interviewScore: null,
  }]);

  expect(container.textContent).toContain('not graded');
});

// ---- Decisions -------------------------------------------------------

test('decision controls appear only while an application is under review', async () => {
  await render([APPLICANT]);

  expect(button('Shortlist')).not.toBeUndefined();
  expect(button('Reject')).not.toBeUndefined();
});

test('a decided application offers no decision controls', async () => {
  await render([{
    ...APPLICANT,
    status: 'SHORTLISTED',
    statusLabel: 'Shortlisted',
    decidedAt: '2026-01-12T09:00:00',
    decidedByName: 'Rita',
  }]);

  expect(button('Shortlist')).toBeUndefined();
  expect(button('Reject')).toBeUndefined();
  expect(container.textContent).toContain('Rita');
});

test('shortlisting asks for confirmation before anything is sent', async () => {
  await render([APPLICANT]);

  await click(button('Shortlist'));

  // A dialog, and no call yet: the decision is one-way.
  expect(container.querySelector('[role="dialog"]')).not.toBeNull();
  expect(container.textContent).toContain('Shortlist Cara Silva?');
  expect(applicantsAPI.decide).not.toHaveBeenCalled();
});

test('confirming a shortlist sends the decision and updates the row', async () => {
  applicantsAPI.decide.mockResolvedValue({
    ...APPLICANT,
    status: 'SHORTLISTED',
    statusLabel: 'Shortlisted',
    decidedAt: '2026-01-12T09:00:00',
    decidedByName: 'Rita',
  });

  await render([APPLICANT]);
  await click(button('Shortlist'));

  // The dialog's own confirm button.
  const dialog = container.querySelector('[role="dialog"]');
  const confirm = [...dialog.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Shortlist');

  await click(confirm);

  expect(applicantsAPI.decide).toHaveBeenCalledWith(77, 'SHORTLISTED');
  expect(container.textContent).toContain('Shortlisted');
  expect(container.querySelector('[role="dialog"]')).toBeNull();
});

test('cancelling a rejection sends nothing', async () => {
  await render([APPLICANT]);
  await click(button('Reject'));

  expect(container.textContent).toContain('Reject Cara Silva?');

  await click(button('Cancel'));

  expect(applicantsAPI.decide).not.toHaveBeenCalled();
  expect(container.querySelector('[role="dialog"]')).toBeNull();
});

test('a refused decision is reported and the row is left alone', async () => {
  applicantsAPI.decide.mockRejectedValue(new Error('This applicant has already been rejected.'));

  await render([APPLICANT]);
  await click(button('Shortlist'));

  const dialog = container.querySelector('[role="dialog"]');
  const confirm = [...dialog.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Shortlist');

  await click(confirm);

  expect(container.querySelector('[role="alert"]').textContent)
    .toContain('This applicant has already been rejected.');
  expect(container.textContent).toContain('Under review');
});

// ---- States ----------------------------------------------------------

test('a job with no applicants shows an empty state', async () => {
  await render([]);

  expect(container.textContent).toContain('Nobody has applied');
});

test('a failed load is reported', async () => {
  applicantsAPI.list.mockRejectedValue(new Error('Service unavailable'));

  await act(async () => {
    root.render(<RecruiterApplicants />);
  });

  expect(container.querySelector('[role="alert"]').textContent).toContain('Service unavailable');
});

test('the page never offers to decide for the recruiter', async () => {
  await render([APPLICANT]);

  // No bulk or automatic action exists: every decision is one
  // candidate at a time, pressed by a person.
  const labels = [...container.querySelectorAll('button')].map((b) => b.textContent.toLowerCase());

  expect(labels.some((l) => l.includes('auto'))).toBe(false);
  expect(labels.some((l) => l.includes('shortlist all'))).toBe(false);
  expect(labels.some((l) => l.includes('reject all'))).toBe(false);
});
