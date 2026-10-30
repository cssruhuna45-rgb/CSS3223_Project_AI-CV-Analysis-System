import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import MyApplications from './MyApplications';
import { applicationsAPI, notificationsAPI } from '../services/jobApplicationsApi';

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
  notificationsAPI: { mine: jest.fn(), markRead: jest.fn() },
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

async function render(applications, notifications = []) {
  applicationsAPI.mine.mockResolvedValue(applications);
  notificationsAPI.mine.mockResolvedValue(notifications);

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

// ---- Final hiring result ---------------------------------------------

const INTERVIEWED = {
  ...base,
  status: 'INTERVIEWED',
  statusLabel: 'Interview completed',
  interviewAvailable: false,
  interviewResumable: false,
  interviewCompletedAt: '2026-01-20T12:00:00',
};

test('an interviewed candidate with no announcement is told the recruiter is reviewing', async () => {
  await render([{
    ...INTERVIEWED,
    resultAnnounced: false,
    hiringDecision: 'PENDING',
    hiringDecisionLabel: 'Awaiting recruiter decision',
    selected: false,
  }]);

  expect(container.textContent).toContain('Awaiting recruiter decision');
  expect(container.textContent).toContain('recruiter is reviewing your application');
  // A draft must look exactly like no decision at all.
  expect(container.textContent).not.toContain('Selected');
  expect(container.textContent).not.toContain('Not selected');
});

test('a selected candidate is congratulated and shown the recruiter message', async () => {
  await render([{
    ...INTERVIEWED,
    resultAnnounced: true,
    hiringDecision: 'SELECTED',
    hiringDecisionLabel: 'Selected',
    selected: true,
    recruiterFeedback: 'We were impressed by your system design answers.',
    resultAnnouncedAt: '2026-02-01T10:00:00',
  }]);

  expect(container.textContent).toContain('you have been selected');
  expect(container.textContent).toContain('will contact you regarding the next steps');
  expect(container.textContent).toContain('We were impressed by your system design answers.');
});

test('a selected result does not claim an offer has been made', async () => {
  await render([{
    ...INTERVIEWED,
    resultAnnounced: true,
    hiringDecision: 'SELECTED',
    hiringDecisionLabel: 'Selected',
    selected: true,
  }]);

  const text = container.textContent.toLowerCase();

  // Selection is not a contract, and must not read like one.
  expect(text).not.toContain('offer letter');
  expect(text).not.toContain('employment contract');
  expect(text).not.toContain('you are hired');
});

test('a not-selected candidate is thanked, respectfully', async () => {
  await render([{
    ...INTERVIEWED,
    resultAnnounced: true,
    hiringDecision: 'NOT_SELECTED',
    hiringDecisionLabel: 'Not selected',
    selected: false,
    recruiterFeedback: 'Please do apply again in future.',
  }]);

  expect(container.textContent).toContain('Thank you for your participation');
  expect(container.textContent).toContain('wish you success in future opportunities');
  expect(container.textContent).toContain('Please do apply again in future.');
  expect(container.textContent).not.toContain('REJECTED');
});

test('the result never shows internal recruiter notes', async () => {
  await render([{
    ...INTERVIEWED,
    resultAnnounced: true,
    hiringDecision: 'NOT_SELECTED',
    hiringDecisionLabel: 'Not selected',
    selected: false,
    recruiterFeedback: 'Thank you for attending.',
    // The server never sends this field; if it somehow did, the page
    // still has nowhere that renders it.
    internalNotes: 'Weak on SQL, do not progress.',
  }]);

  expect(container.textContent).not.toContain('Weak on SQL');
});

test('an application still under review shows no final result section', async () => {
  await render([{
    ...base,
    status: 'APPLIED',
    statusLabel: 'Under review',
    interviewAvailable: false,
    interviewResumable: false,
    interviewMessage: 'Your application is still under review.',
    resultAnnounced: false,
  }]);

  expect(container.textContent).not.toContain('Final hiring decision');
});

test('a failed load is reported instead of showing an empty list', async () => {
  applicationsAPI.mine.mockRejectedValue(new Error('Service unavailable'));
  notificationsAPI.mine.mockResolvedValue([]);

  await act(async () => {
    root.render(<MyApplications />);
  });

  expect(container.querySelector('[role="alert"]').textContent).toContain('Service unavailable');
});

// ---- Notifications ---------------------------------------------------

test('an unread announcement is surfaced without giving away the outcome', async () => {
  await render([INTERVIEWED], [{
    id: 1,
    type: 'HIRING_DECISION',
    title: 'Your interview result is available',
    message: 'The final hiring decision for your Backend Developer application has been announced.',
    applicationId: 1,
    read: false,
  }]);

  expect(container.textContent).toContain('Your interview result is available');
  // The notification points at the result; it does not contain it.
  expect(container.textContent).not.toContain('SELECTED');
});

test('an already-read notification is not shown again', async () => {
  await render([INTERVIEWED], [{
    id: 1,
    type: 'HIRING_DECISION',
    title: 'Your interview result is available',
    message: 'Announced.',
    applicationId: 1,
    read: true,
  }]);

  expect(container.textContent).not.toContain('New for you');
});

test('a notifications outage still leaves the applications readable', async () => {
  applicationsAPI.mine.mockResolvedValue([INTERVIEWED]);
  notificationsAPI.mine.mockRejectedValue(new Error('down'));

  await act(async () => {
    root.render(<MyApplications />);
  });

  expect(container.textContent).toContain('Backend Developer');
  expect(container.textContent).not.toContain('New for you');
});
