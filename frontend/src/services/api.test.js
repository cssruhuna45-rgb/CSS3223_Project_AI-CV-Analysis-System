import { request, SPRING } from './api';
import { SERVER_STARTING_MESSAGE } from './http';

// What a sign-in or a page sees when the backend is not there yet or
// refuses a credential. The wording itself lives in http.js; these pin
// down the cases that went wrong before.
//
// A refused sign-in and an expired session arrive as the same status
// code, and the response to each is the opposite: one leaves the user
// on the form with the server's reason, the other throws away the
// stored login and sends them to sign in again.

function response(status, body, { raw = false } = {}) {
  const text = raw ? body : (body === undefined ? '' : JSON.stringify(body));
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: () => Promise.resolve(text),
  });
}

const nginxPage = (status) =>
  response(status, `<html><body><h1>${status}</h1>nginx</body></html>`, { raw: true });

const anonymous = { method: 'POST', headers: { 'Content-Type': 'application/json' } };
const authed = { headers: { Authorization: 'Bearer stored-token' } };

let assign;
let originalLocation;

beforeEach(() => {
  global.fetch = jest.fn();
  assign = jest.fn();

  // jsdom will not navigate, and the real location cannot be assigned
  // to. A stand-in makes the redirect observable instead.
  originalLocation = window.location;
  delete window.location;
  window.location = { pathname: '/dashboard', assign };

  localStorage.setItem('token', 'stored-token');
  localStorage.setItem('user', '{"name":"Cara"}');
});

afterEach(() => {
  window.location = originalLocation;
  localStorage.clear();
});

async function failure(promise) {
  try {
    await promise;
  } catch (err) {
    return err;
  }
  throw new Error('expected the request to fail');
}

describe('signing in', () => {

  test('a wrong password keeps the stored login and does not redirect', async () => {
    // Someone mistyping a password on a second account must not be
    // signed out of the one they already have, and must not be bounced
    // away from the form they are standing on.
    fetch.mockReturnValue(response(401, { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid email or password' }));

    const err = await failure(request(`${SPRING}/api/v1/auth/login`, anonymous));

    expect(err.message).not.toMatch(/session/i);
    expect(localStorage.getItem('token')).toBe('stored-token');
    expect(assign).not.toHaveBeenCalled();
  });

  test("a rate-limited sign-in keeps the server's own wording", async () => {
    fetch.mockReturnValue(response(429, {
      code: 'RATE_LIMITED',
      message: 'Too many sign-in attempts. Please wait 15 minutes and try again, or reset your password.',
    }));

    const err = await failure(request(`${SPRING}/api/v1/auth/login`, anonymous));

    expect(err.message).toContain('Too many sign-in attempts');
  });

  test('signing in while the backend boots says so, not "wrong password"', async () => {
    fetch.mockReturnValue(nginxPage(502));

    const err = await failure(request(`${SPRING}/api/v1/auth/login`, anonymous));

    expect(err.message).toBe(SERVER_STARTING_MESSAGE);
  });
});

describe('the backend being unreachable', () => {

  // nginx answers these, not Spring, so the body is an HTML error page
  // rather than JSON. The old message was "Request failed (502 Bad
  // Gateway)", which named the problem in words no user can act on.
  test.each([502, 503, 504])('%i says it may still be starting, and to try again', async (status) => {
    fetch.mockReturnValue(nginxPage(status));

    const err = await failure(request(`${SPRING}/api/v1/resumes`, authed));

    expect(err.message).toBe(SERVER_STARTING_MESSAGE);
    expect(err.message).not.toMatch(/gateway|nginx/i);
  });

  test('does not sign the user out', async () => {
    // A proxy returning 502 says nothing about the stored login.
    fetch.mockReturnValue(nginxPage(502));

    await failure(request(`${SPRING}/api/v1/resumes`, authed));

    expect(localStorage.getItem('token')).toBe('stored-token');
    expect(assign).not.toHaveBeenCalled();
  });

  test('an AI route still says the AI is unavailable', async () => {
    fetch.mockReturnValue(nginxPage(502));

    const err = await failure(request(`${SPRING}/api/v1/ai/resume/analyze`, { method: 'POST', ...authed }));

    expect(err.code).toBe('AI_UNAVAILABLE');
  });
});

describe('an expired session', () => {

  test('clears the useless login and redirects', async () => {
    fetch.mockReturnValue(response(401, undefined));

    await failure(request(`${SPRING}/api/v1/resumes`, authed));

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });

  test('does not redirect when already on the sign-in page', async () => {
    window.location.pathname = '/login';
    fetch.mockReturnValue(response(401, undefined));

    await failure(request(`${SPRING}/api/v1/resumes`, authed));

    expect(assign).not.toHaveBeenCalled();
  });
});
