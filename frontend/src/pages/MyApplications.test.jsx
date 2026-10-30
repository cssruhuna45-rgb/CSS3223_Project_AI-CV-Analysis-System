import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import MyApplications from './MyApplications';
import { applicationsAPI } from '../services/jobApplicationsApi';

// react-router-dom 7 reaches for the "react-router/dom" subpath
// export, which react-scripts 5's Jest resolver cannot follow. The page
// only navigates, so the hook is stubbed rather than pulling the real
// router - and rather than changing the shared Jest configuration for
// one test.
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../services/jobApplicationsApi', () => ({
  ...jest.requireActual('../services/jobApplicationsApi'),
  applicationsAPI: { mine: jest.fn() },
}));

const base = {
  applicationId: 1,
  jobId: 5,
  jobTitle: 'Backend Developer',
  company: 'Example Company',
  recruiterName: 'Rita',
  inviteCode: 'ABCD-EF23',
  submittedCvFileName: 'cara-cv.pdf',
  appliedAt: '2026-01-10T10:00:00',
};

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.clearAllMocks();
});

async function render(applications) {
  applicationsAPI.mine.mockResolvedValue(applications);

  await act(async () => {
    root.render(<MyApplications />);
  });
}

const buttonLabels = () =>
  [...container.querySelectorAll('button')].map((b) => b.textContent);

// The candidate's status page. What matters is that the interview
// action appears only when the server said it may, and that the
// wording the server sent is what gets shown.

test('an application under review shows the status and no interview action', async () => {
  await render([{
    ...base,
    status: 'APPLIED',
    statusLabel: 'Under review',
    interviewAvailable: false,
    interviewResumable: false,
    interviewMessage: 'Your application is still under review.',
  }]);

  expect(container.textContent).toContain('Backend Developer');
  expect(container.textContent).toContain('Under review');
  expect(container.textContent).toContain('Your application is still under review.');
  expect(buttonLabels()).not.toContain('Start interview');
});

test('a shortlisted application offers the interview', async () => {
  await render([{
    ...base,
    status: 'SHORTLISTED',
    statusLabel: 'Shortlisted',
    interviewAvailable: true,
    interviewResumable: false,
    interviewMessage: null,
  }]);

  expect(container.textContent).toContain('Shortlisted');
  expect(buttonLabels()).toContain('Start interview');
});

test('a shortlisted application whose job is not ready does not offer the interview', async () => {
  await render([{
    ...base,
    status: 'SHORTLISTED',
    statusLabel: 'Shortlisted',
    interviewAvailable: false,
    interviewResumable: false,
    interviewMessage: 'The interview for this job is not ready yet. Please check back later.',
  }]);

  expect(container.textContent).toContain('not ready yet');
  expect(buttonLabels()).not.toContain('Start interview');
});

test('a rejected application shows "Not selected" and no interview action', async () => {
  await render([{
    ...base,
    status: 'REJECTED',
    statusLabel: 'Not selected',
    interviewAvailable: false,
    interviewResumable: false,
    interviewMessage: 'This application was not selected, so its interview is not available.',
  }]);

  // The server's wording, never the raw REJECTED.
  expect(container.textContent).toContain('Not selected');
  expect(container.textContent).not.toContain('REJECTED');
  expect(buttonLabels()).not.toContain('Start interview');
});

test('a completed interview shows as completed and cannot be restarted', async () => {
  await render([{
    ...base,
    status: 'INTERVIEWED',
    statusLabel: 'Interview completed',
    interviewAvailable: false,
    interviewResumable: false,
    interviewCompletedAt: '2026-01-20T12:00:00',
    interviewMessage: 'You have already completed the interview for this job.',
  }]);

  expect(container.textContent).toContain('Interview completed');
  expect(buttonLabels()).not.toContain('Start interview');
});

test('an attempt already under way is offered as a resume', async () => {
  await render([{
    ...base,
    status: 'SHORTLISTED',
    statusLabel: 'Shortlisted',
    interviewAvailable: true,
    interviewResumable: true,
    interviewMessage: null,
  }]);

  expect(buttonLabels()).toContain('Resume interview');
  expect(buttonLabels()).not.toContain('Start interview');
});

test('no applications shows an empty state rather than a blank page', async () => {
  await render([]);

  expect(container.textContent).toContain('You have not applied for any jobs yet.');
});

test('a failed load is reported instead of showing an empty list', async () => {
  applicationsAPI.mine.mockRejectedValue(new Error('Service unavailable'));

  await act(async () => {
    root.render(<MyApplications />);
  });

  expect(container.querySelector('[role="alert"]').textContent).toContain('Service unavailable');
});
