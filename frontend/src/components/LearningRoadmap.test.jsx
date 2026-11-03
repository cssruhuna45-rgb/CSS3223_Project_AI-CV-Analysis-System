import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import LearningRoadmap, { isNoSavedPlan } from './LearningRoadmap';
import { roadmapAPI } from '../services/api';
import { ApiError } from '../services/http';

jest.mock('./ToastProvider', () => ({ useToast: () => jest.fn() }));
jest.mock('../services/api', () => ({
  roadmapAPI: { getBySessionId: jest.fn(), generate: jest.fn(), updateProgress: jest.fn() },
}));

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  jest.clearAllMocks();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

async function render() {
  await act(async () => {
    root.render(<LearningRoadmap sessionId="s-1" sessionResult={{ improvements: [] }} />);
  });
}

const generateButton = () => [...container.querySelectorAll('button')]
  .find((b) => /generate/i.test(b.textContent));

test('only the documented 404 means "no saved learning plan"', () => {
  expect(isNoSavedPlan(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'x' }))).toBe(true);
  expect(isNoSavedPlan(new ApiError({ status: 500, code: 'INTERNAL_ERROR', message: 'x' }))).toBe(false);
  expect(isNoSavedPlan(new ApiError({ kind: 'network', code: 'NETWORK', message: 'x' }))).toBe(false);
  expect(isNoSavedPlan(new Error('404'))).toBe(false);
});

test('no saved plan offers to create one', async () => {
  roadmapAPI.getBySessionId.mockRejectedValue(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'x' }));

  await render();

  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(generateButton()).toBeDefined();
});

test('a failed load is reported with a retry, and does not offer to create a second plan', async () => {
  roadmapAPI.getBySessionId.mockRejectedValue(new ApiError({ kind: 'network', code: 'NETWORK', message: 'x' }));

  await render();

  const alert = container.querySelector('[role="alert"]');
  expect(alert).not.toBeNull();
  expect([...alert.querySelectorAll('button')].map((b) => b.textContent)).toContain('Try again');
  expect(generateButton()).toBeUndefined();
});

test('a failed generation uses the plain message, not the server text', async () => {
  roadmapAPI.getBySessionId.mockRejectedValue(new ApiError({ status: 404, code: 'NOT_FOUND', message: 'x' }));
  roadmapAPI.generate.mockRejectedValue(new ApiError({
    status: 502, code: 'AI_FAILED', message: 'Roadmap generation failed: JSONDecodeError at line 1',
  }));

  await render();
  await act(async () => { generateButton().click(); });

  const alert = container.querySelector('[role="alert"]');
  expect(alert.textContent).toContain("We couldn't create your 14-day learning plan. Please try again.");
  expect(alert.textContent).not.toMatch(/JSONDecodeError/);
});
