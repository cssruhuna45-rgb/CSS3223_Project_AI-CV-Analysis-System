import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import InterviewProgress from './InterviewProgress';
import { interviewAPI } from '../services/api';

// What the Completed tile says about the interviews it did not count.
//
// The server's scoredInterviews means "counted toward the trend", and it
// drops practice interviews before it drops ungraded ones. Deriving
// "could not be graded" from totalInterviews - scoredInterviews
// therefore reported a perfectly graded practice interview as a grading
// failure - which is a worrying thing to tell a candidate about work
// they have already done.

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('../services/api', () => ({
  interviewAPI: { progress: jest.fn() },
}));

const interview = (over = {}) => ({
  sessionId: `s${Math.random()}`,
  score: 70,
  status: 'completed',
  mode: 'exam',
  completedAt: '2026-11-03T10:00:00',
  ...over,
});

let container;
let root;

const render = async (progress) => {
  interviewAPI.progress.mockResolvedValue(progress);

  await act(async () => {
    root.render(<InterviewProgress />);
  });
};

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

test('a graded practice interview is not called a grading failure', async () => {
  // Eight completed, every one of them graded, one of them practice.
  // The server counts seven toward the trend, so the old arithmetic
  // reported "1 could not be graded".
  await render({
    totalInterviews: 8,
    scoredInterviews: 7,
    latestScore: 74,
    previousScore: 94,
    scoreDifference: -20,
    bestScore: 94,
    trend: 'DECREASING',
    interviews: [
      ...Array.from({ length: 4 }, () => interview({ score: 0, mode: null })),
      interview({ score: 85, mode: 'practice' }),
      interview({ score: 49 }),
      interview({ score: 94 }),
      interview({ score: 74 }),
    ],
  });

  expect(container.textContent).not.toContain('could not be graded');
  expect(container.textContent).toContain('1 practice, not counted in the trend');
});

test('an interview that really was not graded still says so', async () => {
  await render({
    totalInterviews: 3,
    scoredInterviews: 2,
    latestScore: 74,
    previousScore: 60,
    scoreDifference: 14,
    bestScore: 74,
    trend: 'IMPROVING',
    interviews: [
      interview({ score: 60 }),
      interview({ score: null }),
      interview({ score: 74 }),
    ],
  });

  expect(container.textContent).toContain('1 could not be graded');
});

test('an ungraded interview is reported ahead of a practice one', async () => {
  // Both present: the failure is the one worth surfacing.
  await render({
    totalInterviews: 3,
    scoredInterviews: 1,
    latestScore: 74,
    previousScore: null,
    scoreDifference: null,
    bestScore: 74,
    trend: 'FIRST_INTERVIEW',
    interviews: [
      interview({ score: null }),
      interview({ score: 85, mode: 'practice' }),
      interview({ score: 74 }),
    ],
  });

  expect(container.textContent).toContain('1 could not be graded');
  expect(container.textContent).not.toContain('not counted in the trend');
});

test('nothing is said when every interview counted', async () => {
  await render({
    totalInterviews: 2,
    scoredInterviews: 2,
    latestScore: 74,
    previousScore: 60,
    scoreDifference: 14,
    bestScore: 74,
    trend: 'IMPROVING',
    interviews: [interview({ score: 60 }), interview({ score: 74 })],
  });

  expect(container.textContent).not.toContain('could not be graded');
  expect(container.textContent).not.toContain('not counted in the trend');
});

test('a genuine zero is shown as a score, not as a missing one', async () => {
  await render({
    totalInterviews: 2,
    scoredInterviews: 2,
    latestScore: 0,
    previousScore: 40,
    scoreDifference: -40,
    bestScore: 40,
    trend: 'DECREASING',
    interviews: [interview({ score: 40 }), interview({ score: 0 })],
  });

  // Zero is a real result and reads as one; it is not "--".
  expect(container.textContent).toContain('0');
  expect(container.textContent).not.toContain('could not be graded');
});
