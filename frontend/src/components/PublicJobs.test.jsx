import React from 'react';
import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import PublicJobs from './PublicJobs';
import { publicJobsAPI } from '../services/publicJobsApi';

// Stubbed for the same reason as in JobApplication.test.jsx: react-scripts
// 5's Jest cannot resolve react-router-dom 7's subpath export.
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../services/publicJobsApi', () => ({
  publicJobsAPI: { list: jest.fn() },
}));

const OPEN_JOB = {
  id: 5,
  title: 'Backend Developer',
  company: 'Example Company',
  jobField: 'backend_development',
  jobDescription: 'Build REST APIs in Spring Boot.',
  requiredSkills: ['java', 'docker'],
  publishedAt: '2026-10-28T09:00:00',
  open: true,
};

const CLOSED_JOB = {
  id: 6,
  title: 'Data Engineer',
  company: null,
  jobField: 'data_engineering',
  jobDescription: 'Maintain the nightly pipelines.',
  requiredSkills: ['python', 'airflow'],
  publishedAt: '2026-10-20T09:00:00',
  open: false,
};

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  publicJobsAPI.list.mockResolvedValue([OPEN_JOB, CLOSED_JOB]);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.clearAllMocks();
});

async function render() {
  await act(async () => {
    root.render(<PublicJobs />);
  });
}

const button = (text) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent.includes(text));

const cards = () => container.querySelectorAll('article');

test('published jobs from the server are listed', async () => {
  await render();

  expect(publicJobsAPI.list).toHaveBeenCalled();
  expect(cards()).toHaveLength(2);
  expect(container.textContent).toContain('Backend Developer');
  expect(container.textContent).toContain('Data Engineer');
});

test('apply now opens the existing application page for that job', async () => {
  await render();

  await act(async () => {
    button('Apply now').click();
  });

  expect(mockNavigate).toHaveBeenCalledWith('/apply/job/5');
});

test('a closed job is listed but cannot be applied for', async () => {
  await render();

  const closed = button('Closed');
  expect(closed).not.toBeUndefined();
  expect(closed.disabled).toBe(true);
});

test('search narrows the list by title, company or skill', async () => {
  await render();

  const search = container.querySelector('#public-jobs-search');
  await act(async () => {
    search.value = 'airflow';
    Simulate.change(search);
  });

  expect(cards()).toHaveLength(1);
  expect(container.textContent).toContain('Data Engineer');
});

test('an empty list says nothing has been published yet', async () => {
  publicJobsAPI.list.mockResolvedValue([]);

  await render();

  expect(container.textContent).toContain('No jobs have been published yet.');
});

test('a failed load is reported', async () => {
  // A raw error's text never reaches the page; the page's own wording does.
  publicJobsAPI.list.mockRejectedValue(new Error('TypeError: Failed to fetch'));

  await render();

  const alert = container.querySelector('[role="alert"]').textContent;
  expect(alert).toContain("We couldn't load public jobs. Please try again.");
  expect(alert).not.toContain('Failed to fetch');
});
