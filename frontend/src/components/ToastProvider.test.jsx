import React from 'react';
import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import { ToastProvider, useToast } from './ToastProvider';

let container;
let root;
let notify;
function Actions() {
  notify = useToast();
  return <button>Page action</button>;
}

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root.render(<ToastProvider><Actions /></ToastProvider>));
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.useRealTimers();
});

test('announces success and removes it after five seconds', () => {
  act(() => notify('Signed in successfully.'));
  expect(container.querySelector('[role="status"]').textContent).toContain('Signed in successfully.');
  act(() => jest.advanceTimersByTime(5000));
  expect(container.querySelector('.app-toast')).toBeNull();
});

test('keeps an error visible until the user dismisses it', () => {
  act(() => notify('Progress was not saved.', 'error'));
  act(() => jest.advanceTimersByTime(60000));
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  act(() => container.querySelector('[aria-label="Dismiss error message"]').click());
  expect(container.querySelector('.app-toast')).toBeNull();
});

test('pauses automatic dismissal while keyboard focus is inside', () => {
  act(() => notify('Progress saved.'));
  const close = container.querySelector('.app-toast-close');
  act(() => Simulate.focus(close));
  act(() => jest.advanceTimersByTime(10000));
  expect(container.querySelector('.app-toast')).not.toBeNull();
  act(() => Simulate.blur(close, { relatedTarget: document.body }));
  act(() => jest.advanceTimersByTime(5000));
  expect(container.querySelector('.app-toast')).toBeNull();
});

test('survives page replacement without taking keyboard focus', () => {
  const action = container.querySelector('button');
  action.focus();
  act(() => notify('Account created successfully.'));
  expect(document.activeElement).toBe(action);
  act(() => root.render(<ToastProvider><h1>Destination page</h1></ToastProvider>));
  expect(container.querySelector('[role="status"]').textContent).toContain('Account created successfully.');
});

test('deduplicates repeated actions and limits the visible stack', () => {
  act(() => { notify('Progress saved.'); notify('Progress saved.'); });
  expect(container.querySelectorAll('.app-toast')).toHaveLength(1);
  act(() => { notify('One'); notify('Two'); notify('Three'); });
  expect(container.querySelectorAll('.app-toast')).toHaveLength(3);
  expect(container.querySelector('.app-toast-message').textContent).toContain('Three');
});
