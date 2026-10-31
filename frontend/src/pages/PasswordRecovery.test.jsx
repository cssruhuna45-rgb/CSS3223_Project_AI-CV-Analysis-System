import React from 'react';
import { createRoot } from 'react-dom/client';
import { act, Simulate } from 'react-dom/test-utils';
import PasswordRecovery from './PasswordRecovery';
import { authAPI } from '../services/api';

let mockLocation;
jest.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
  Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a>,
}));
jest.mock('../services/api', () => ({ authAPI: { forgotPassword: jest.fn(), resetPassword: jest.fn() } }));
let container;
let root;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  jest.clearAllMocks();
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
function render(reset = false, token = 'a'.repeat(43)) {
  mockLocation = { pathname: reset ? '/reset-password' : '/forgot-password', hash: reset ? `#token=${token}` : '', state: null };
  act(() => root.render(<PasswordRecovery reset={reset} />));
}
function change(id, value) {
  act(() => Simulate.change(container.querySelector(id), { target: { value } }));
}
async function submit() {
  await act(async () => { Simulate.submit(container.querySelector('form')); });
}
test('requests a reset and displays the acknowledgement', async () => {
  authAPI.forgotPassword.mockResolvedValue({ message: 'Check your inbox.' });
  render();
  change('#recovery-email', 'person@example.com');
  await submit();
  expect(authAPI.forgotPassword).toHaveBeenCalledWith('person@example.com');
  expect(container.querySelector('[role="status"]').textContent).toBe('Check your inbox.');
});
test('rejects mismatched passwords without calling the API', async () => {
  render(true);
  change('#new-password', 'password-one');
  change('#confirm-password', 'password-two');
  await submit();
  expect(authAPI.resetPassword).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]').textContent).toContain('do not match');
});
test('missing token provides a way to request another link', () => {
  render(true, '');
  expect(container.querySelector('form')).toBeNull();
  expect(container.querySelector('a[href="/forgot-password"]')).not.toBeNull();
});
test('expired token error stays visible', async () => {
  authAPI.resetPassword.mockRejectedValue(new Error('This reset link is invalid or expired.'));
  render(true);
  change('#new-password', 'new-password');
  change('#confirm-password', 'new-password');
  await submit();
  expect(container.querySelector('[role="alert"]').textContent).toContain('expired');
});
test('successful reset clears the local session', async () => {
  authAPI.resetPassword.mockResolvedValue({ message: 'Password reset.' });
  localStorage.setItem('token', 'old-session');
  render(true);
  change('#new-password', 'new-password');
  change('#confirm-password', 'new-password');
  await submit();
  expect(authAPI.resetPassword).toHaveBeenCalledWith('a'.repeat(43), 'new-password');
  expect(localStorage.getItem('token')).toBeNull();
  expect(container.querySelector('[role="status"]').textContent).toBe('Password reset.');
});
