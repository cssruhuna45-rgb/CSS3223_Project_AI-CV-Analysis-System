import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import Scorecard, { NOT_SCORED_MESSAGE, gradingUnavailable } from './Scorecard';
import { interviewAPI } from '../services/api';
import { ApiError } from '../services/http';

let mockParams = new URLSearchParams();
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useSearchParams: () => [mockParams],
}));
jest.mock('../components/ToastProvider', () => ({ useToast: () => jest.fn() }));
jest.mock('../components/InterviewProgress', () => () => null);
jest.mock('../components/LearningRoadmap', () => () => null);
jest.mock('../services/api', () => ({
  interviewAPI: { history: jest.fn(), getScorecard: jest.fn() },
}));

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  sessionStorage.clear();
  mockParams = new URLSearchParams();
  jest.clearAllMocks();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render() {
  await act(async () => { root.render(<Scorecard />); });
}

// A failed grading run comes back with zeros in every score field.
const UNSCORED = {
  session_id: 's-1',
  evaluated: false,
  evaluation_error: 'Scoring failed: google.api_core.exceptions.ResourceExhausted: 429 quota',
  overall_score: 0,
  category_scores: [{ key: 'technical', label: 'Technical', score: 0 }],
  per_question: [],
};

test('failed grading is never shown as a score of zero', async () => {
  sessionStorage.setItem('interviewResult', JSON.stringify(UNSCORED));

  await render();

  expect(container.textContent).toContain(NOT_SCORED_MESSAGE);
  expect(container.textContent).not.toMatch(/\b0\s*\/\s*100\b/);
  // The stored technical reason stays off the page.
  expect(container.textContent).not.toMatch(/ResourceExhausted|429|Scoring failed/);
});

test('a real zero is a graded result, not a grading failure', () => {
  expect(gradingUnavailable({ evaluated: true, overall_score: 0 })).toBe(false);
  expect(gradingUnavailable(UNSCORED)).toBe(true);
});

test('history that fails to load is reported, not shown as having no interviews', async () => {
  interviewAPI.history.mockRejectedValue(new ApiError({ kind: 'network', code: 'NETWORK', message: 'x' }));

  await render();

  const alert = container.querySelector('[role="alert"]');
  expect(alert).not.toBeNull();
  expect(container.textContent).not.toContain('No interview to show');
  expect([...container.querySelectorAll('button')].map((b) => b.textContent)).toContain('Try again');
});

test('genuinely no interviews shows the empty state', async () => {
  interviewAPI.history.mockResolvedValue([]);

  await render();

  expect(container.textContent).toContain('No interview to show');
  expect(container.querySelector('[role="alert"]')).toBeNull();
});
