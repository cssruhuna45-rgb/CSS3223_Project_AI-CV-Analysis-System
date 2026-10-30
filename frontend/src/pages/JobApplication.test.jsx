import React from 'react';
import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import JobApplication from './JobApplication';
import { jobsAPI, resumeAPI } from '../services/api';
import { applicationsAPI } from '../services/jobApplicationsApi';

// react-router-dom 7's "react-router/dom" subpath export is not
// resolvable by react-scripts 5's Jest, so the three things this page
// uses from it are stubbed rather than changing the shared Jest config.
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ code: 'ABCD-EF23' }),
  Link: ({ children }) => children,
}));

jest.mock('../services/api', () => ({
  jobsAPI: { preview: jest.fn() },
  resumeAPI: { getAll: jest.fn(), getAnalysis: jest.fn() },
}));

jest.mock('../services/jobApplicationsApi', () => ({
  ...jest.requireActual('../services/jobApplicationsApi'),
  applicationsAPI: { apply: jest.fn() },
}));

const JOB = {
  jobId: 5,
  inviteCode: 'ABCD-EF23',
  title: 'Backend Developer',
  company: 'Example Company',
  jobField: 'backend_development',
  jobDescription: 'Build REST APIs in Spring Boot.',
  requiredSkills: ['java', 'docker'],
  recruiterName: 'Rita',
  interviewReady: true,
  questionCount: 5,
  applicationStatus: null,
};

const CV = {
  id: 31,
  originalFileName: 'cara-cv.pdf',
  extractedText: 'Java, Docker, Spring',
  uploadedAt: '2026-01-01T09:00:00',
};

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);

  jobsAPI.preview.mockResolvedValue(JOB);
  resumeAPI.getAll.mockResolvedValue([CV]);
  resumeAPI.getAnalysis.mockResolvedValue({
    summary: 'Backend developer with Spring experience.',
    skills: ['Java', 'Docker'],
  });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.clearAllMocks();
});

async function render(overrides = {}) {
  jobsAPI.preview.mockResolvedValue({ ...JOB, ...overrides });

  await act(async () => {
    root.render(<JobApplication />);
  });
}

const consentBox = () => container.querySelector('#consent');

const applyButton = () =>
  [...container.querySelectorAll('button')].find((b) => b.textContent.includes('Apply for this job'));

async function click(element) {
  await act(async () => {
    element.click();
  });
}

async function tickConsent() {
  const box = consentBox();

  // Set the property, then let React see a synthetic change for it -
  // the same way ToastProvider.test.jsx drives its controls.
  await act(async () => {
    box.checked = true;
    Simulate.change(box);
  });
}

// ---- Consent ---------------------------------------------------------

test('the consent box starts unchecked', async () => {
  await render();

  // The candidate has to tick it themselves. Nothing defaults it, and
  // nothing else they did implies it.
  expect(consentBox().checked).toBe(false);
});

test('apply is disabled until consent is given', async () => {
  await render();

  expect(applyButton().disabled).toBe(true);

  await tickConsent();

  expect(applyButton().disabled).toBe(false);
});

test('pressing apply without consent does not submit', async () => {
  await render();

  await click(applyButton());

  expect(applicationsAPI.apply).not.toHaveBeenCalled();
});

test('applying sends the chosen CV with consent granted', async () => {
  applicationsAPI.apply.mockResolvedValue({
    applicationId: 77,
    jobTitle: 'Backend Developer',
    status: 'APPLIED',
    statusLabel: 'Under review',
  });

  await render();
  await tickConsent();
  await click(applyButton());

  expect(applicationsAPI.apply).toHaveBeenCalledWith(5, {
    resumeId: 31,
    consentGranted: true,
  });
});

// ---- States ----------------------------------------------------------

test('the job, its required skills and the CV analysis are shown before applying', async () => {
  await render();

  expect(container.textContent).toContain('Backend Developer');
  expect(container.textContent).toContain('Build REST APIs in Spring Boot.');
  expect(container.textContent).toContain('java');
  expect(container.textContent).toContain('docker');
  expect(container.textContent).toContain('Backend developer with Spring experience.');
});

test('a successful application reports that it is under review', async () => {
  applicationsAPI.apply.mockResolvedValue({
    applicationId: 77,
    jobTitle: 'Backend Developer',
    status: 'APPLIED',
    statusLabel: 'Under review',
  });

  await render();
  await tickConsent();
  await click(applyButton());

  expect(container.textContent).toContain('Application submitted successfully');
  expect(container.textContent).toContain('Under review');
});

test('a rejected submission shows the server message and stays on the form', async () => {
  applicationsAPI.apply.mockRejectedValue(new Error('You have already applied for this job.'));

  await render();
  await tickConsent();
  await click(applyButton());

  expect(container.querySelector('[role="alert"]').textContent)
    .toContain('You have already applied for this job.');
  expect(container.textContent).not.toContain('Application submitted successfully');
});

test('a candidate with no analysed CV is sent to upload one instead', async () => {
  resumeAPI.getAll.mockResolvedValue([]);

  await render();

  expect(container.textContent).toContain('You have no analysed CV to apply with yet.');
  expect(applyButton().disabled).toBe(true);
});

test('an existing application shows its status rather than the form again', async () => {
  await render({ applicationStatus: 'SHORTLISTED', applicationStatusLabel: 'Shortlisted' });

  expect(container.textContent).toContain('You have already applied for this job.');
  expect(container.textContent).toContain('Shortlisted');
  expect(consentBox()).toBeNull();
});

test('a job whose questions are not approved can still be applied for', async () => {
  await render({ interviewReady: false });

  expect(container.textContent).toContain('still being prepared');
  expect(applyButton()).not.toBeUndefined();
});

test('an invalid invite code is reported', async () => {
  jobsAPI.preview.mockRejectedValue(new Error('This invite code is not valid.'));

  await act(async () => {
    root.render(<JobApplication />);
  });

  expect(container.querySelector('[role="alert"]').textContent)
    .toContain('This invite code is not valid.');
});
