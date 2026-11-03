import React from 'react';
import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import RecruiterJobs from './RecruiterJobs';
import { recruiterAPI } from '../services/api';
import { jobPublicationAPI } from '../services/publicJobsApi';

// Stubbed for the same reason as in JobApplication.test.jsx: react-scripts
// 5's Jest cannot resolve react-router-dom 7's subpath export.
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}));

jest.mock('../services/api', () => ({
  recruiterAPI: { jobs: jest.fn() },
}));

jest.mock('../services/publicJobsApi', () => ({
  jobPublicationAPI: { archive: jest.fn(), unarchive: jest.fn(), publish: jest.fn(), unpublish: jest.fn() },
}));

jest.mock('../components/ToastProvider', () => ({
  useToast: () => jest.fn(),
}));

// Not under test here, and each loads data of its own.
jest.mock('../components/JobQuestionEditor', () => () => null);
jest.mock('../components/PublishJobDialog', () => () => null);

const job = (id, title, archived) => ({
  id,
  title,
  company: 'Example Company',
  jobField: 'backend_development',
  inviteCode: `CODE${id}`,
  open: true,
  archived,
  publicationStatus: 'DRAFT',
  questionsApproved: true,
  questionCount: 5,
  interviewCount: 0,
  completedCount: 0,
});

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  recruiterAPI.jobs.mockResolvedValue([
    job(1, 'Backend Developer', false),
    job(2, 'Old Data Role', true),
  ]);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.clearAllMocks();
});

async function render() {
  await act(async () => {
    root.render(<RecruiterJobs />);
  });
}

const button = (text) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent.includes(text));

const titles = () => [...container.querySelectorAll('article h2')].map((h) => h.textContent);

test('archived jobs are kept out of the working list', async () => {
  await render();

  expect(titles()).toEqual(['Backend Developer']);
  expect(button('Active (1)').getAttribute('aria-pressed')).toBe('true');
  expect(button('Archived (1)')).toBeTruthy();
});

test('archived jobs can be listed on their own and brought back', async () => {
  await render();

  await act(async () => { Simulate.click(button('Archived (1)')); });

  expect(titles()).toEqual(['Old Data Role']);
  expect(button('Unarchive')).toBeTruthy();
});

test('archiving a job moves it out of the active list', async () => {
  jobPublicationAPI.archive.mockResolvedValue({ publicationStatus: 'DRAFT', publishedAt: null, archived: true });
  await render();

  await act(async () => {
    Simulate.click(container.querySelector('[aria-label="Archive Backend Developer"]'));
  });

  expect(jobPublicationAPI.archive).toHaveBeenCalledWith(1);
  expect(titles()).toEqual([]);
  expect(button('Archived (2)')).toBeTruthy();
  expect(container.textContent).toContain('Every job is archived.');
});
