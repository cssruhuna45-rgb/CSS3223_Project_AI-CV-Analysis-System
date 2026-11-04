import React from 'react';
import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import Register from './Register';
import { authAPI } from '../services/api';
import { ApiError } from '../services/http';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useLocation: () => ({ state: null }),
}));
jest.mock('../components/ToastProvider', () => ({ useToast: () => jest.fn() }));
jest.mock('../services/api', () => ({ authAPI: { register: jest.fn() } }));

let container;
let root;

beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  jest.clearAllMocks();
  act(() => root.render(<Register onLogin={jest.fn()} />));
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const input = (field) => container.querySelector(`#register-${field}`);

function fill(name, email, password) {
  act(() => Simulate.change(input('name'), { target: { value: name } }));
  act(() => Simulate.change(input('email'), { target: { value: email } }));
  act(() => Simulate.change(input('password'), { target: { value: password } }));
}

async function submit() {
  await act(async () => { Simulate.submit(container.querySelector('form')); });
}

test("the server's field errors appear beside their inputs", async () => {
  authAPI.register.mockRejectedValue(new ApiError({
    status: 400, code: 'VALIDATION_FAILED',
    message: 'Please correct the highlighted fields and try again.',
    serverMessage: 'Please correct the highlighted fields and try again.',
    fieldErrors: { email: 'Must be a valid email address' },
  }));

  fill('Ana', 'ana@example', 'secret123');
  await submit();

  const email = input('email');
  expect(email.getAttribute('aria-invalid')).toBe('true');
  const describedBy = email.getAttribute('aria-describedby');
  expect(document.getElementById(describedBy).textContent).toContain('Must be a valid email address');
  // The other fields are not marked.
  expect(input('password').getAttribute('aria-invalid')).toBeNull();
  // Focus lands on what needs fixing.
  expect(document.activeElement).toBe(email);
  expect(container.querySelector('[role="alert"]').textContent).toContain('highlighted fields');
});

test('field errors with no matching input are summarised instead of lost', async () => {
  authAPI.register.mockRejectedValue(new ApiError({
    status: 400, code: 'VALIDATION_FAILED', message: 'x',
    fieldErrors: { role: 'Choose candidate or recruiter' },
  }));

  fill('Ana', 'ana@example.com', 'secret123');
  await submit();

  expect(container.querySelector('[role="alert"]').textContent).toContain('Choose candidate or recruiter');
});

test('the password guidance matches the server rule of 6 characters', async () => {
  // Worded once, in constants/passwordRules.js.
  expect(container.textContent).toContain('Use at least 6 characters.');
  expect(container.textContent).not.toMatch(/8 characters/);

  fill('Ana', 'ana@example.com', '12345');
  await submit();

  expect(authAPI.register).not.toHaveBeenCalled();
  expect(input('password').getAttribute('aria-invalid')).toBe('true');
});

test('a password over 72 bytes is refused in plain words', async () => {
  // 30 two-byte characters: 30 characters, 60 bytes - allowed.
  fill('Ana', 'ana@example.com', 'é'.repeat(37)); // 74 bytes
  await submit();

  expect(authAPI.register).not.toHaveBeenCalled();
  expect(container.textContent).toContain('This password is too long. Try a shorter password.');
  expect(container.textContent).not.toMatch(/UTF-8|bytes/);
});
