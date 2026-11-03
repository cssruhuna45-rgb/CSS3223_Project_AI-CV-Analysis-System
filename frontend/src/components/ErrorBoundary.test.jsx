import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { ErrorBoundary } from './ErrorBoundary';

// react-scripts 5's Jest resolver cannot follow react-router-dom 7's
// "react-router/dom" export. Only the route wrapper uses the router, so
// it is stubbed, as in the page tests.
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/' }),
}));

let container;
let root;

function Broken() {
  throw new Error('render failed');
}

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  // React and the boundary both log the caught error; keep the test output clean.
  jest.spyOn(console, 'error').mockImplementation(() => {});
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  console.error.mockRestore();
});

test('shows the page when nothing fails', () => {
  act(() => root.render(<ErrorBoundary><p>Page content</p></ErrorBoundary>));
  expect(container.textContent).toContain('Page content');
  expect(container.querySelector('[role="alert"]')).toBeNull();
});

test('replaces a crashed page with a way out instead of a blank screen', () => {
  act(() => root.render(<ErrorBoundary><Broken /></ErrorBoundary>));
  const alert = container.querySelector('[role="alert"]');
  expect(alert.textContent).toContain('Something went wrong');
  // It cannot know whether anything was saved, so it must not promise it.
  expect(alert.textContent).not.toMatch(/safe/i);
  expect(alert.querySelector('button').textContent).toBe('Reload page');
  expect(alert.querySelector('a').getAttribute('href')).toBe('/');
});
