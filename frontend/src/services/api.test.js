import { handleResponse } from './api';

// The two meanings of 401.
//
// A refused sign-in and an expired session arrive as the same status
// code, and the response to each is the opposite: one leaves the user
// on the form with the server's reason, the other throws away the
// stored login and sends them to sign in again. Getting them the wrong
// way round told people entering a wrong password that their "session
// has expired", which was both untrue and unhelpful.

const json = (status, body, statusText = '') => ({
  ok: false,
  status,
  statusText,
  json: () => Promise.resolve(body),
});

let assign;

beforeEach(() => {
  assign = jest.fn();

  // jsdom will not navigate, and the real location cannot be assigned
  // to. A stand-in makes the redirect observable instead.
  Object.defineProperty(window, 'location', {
    value: { pathname: '/dashboard', assign },
    writable: true,
    configurable: true,
  });

  localStorage.setItem('token', 'stored-token');
  localStorage.setItem('user', '{"name":"Cara"}');
});

afterEach(() => localStorage.clear());

describe('a 401 on a request that carries credentials', () => {

  test('reports what the server said, not an expired session', async () => {
    await expect(
      handleResponse(
        json(401, { message: 'Invalid email or password' }),
        { credentialRequest: true },
      ),
    ).rejects.toThrow('Invalid email or password');
  });

  test('keeps the stored login and does not redirect', async () => {
    // Someone mistyping a password on a second account must not be
    // signed out of the one they already have, and must not be bounced
    // away from the form they are standing on.
    await expect(
      handleResponse(json(401, { message: 'Invalid email or password' }), { credentialRequest: true }),
    ).rejects.toThrow();

    expect(localStorage.getItem('token')).toBe('stored-token');
    expect(assign).not.toHaveBeenCalled();
  });

  test('falls back to the status when the server sent no message', async () => {
    await expect(
      handleResponse(json(401, {}, 'Unauthorized'), { credentialRequest: true }),
    ).rejects.toThrow('Request failed (401 Unauthorized)');
  });

  test('a rate-limited sign-in keeps the server\'s own wording', async () => {
    await expect(
      handleResponse(
        json(429, { message: 'Too many sign-in attempts. Please wait 15 minutes and try again, or reset your password.' }),
        { credentialRequest: true },
      ),
    ).rejects.toThrow('Too many sign-in attempts');
  });
});

describe('a 401 on any other request', () => {

  test('still reports an expired session', async () => {
    await expect(handleResponse(json(401, {}))).rejects.toThrow('session has expired');
  });

  test('still clears the useless login and redirects', async () => {
    await expect(handleResponse(json(401, {}))).rejects.toThrow();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');
  });

  test('does not redirect when already on the sign-in page', async () => {
    window.location.pathname = '/login';

    await expect(handleResponse(json(401, {}))).rejects.toThrow();

    expect(assign).not.toHaveBeenCalled();
  });
});

describe('the backend being unreachable', () => {

  // nginx answers these, not Spring, so the body is an HTML error page
  // rather than JSON. The old message was "Request failed (502 Bad
  // Gateway)", which named the problem in words no user can act on.
  const html = (status, statusText) => ({
    ok: false,
    status,
    statusText,
    json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')),
  });

  test.each([
    [502, 'Bad Gateway'],
    [503, 'Service Unavailable'],
    [504, 'Gateway Timeout'],
  ])('%i says it may still be starting, and to try again', async (status, statusText) => {
    await expect(handleResponse(html(status, statusText)))
      .rejects.toThrow('may still be starting up');
  });

  test('does not name a gateway, and does not sign the user out', async () => {
    await expect(handleResponse(html(502, 'Bad Gateway'))).rejects.toThrow();

    // A proxy returning 502 says nothing about the stored login.
    expect(localStorage.getItem('token')).toBe('stored-token');
    expect(assign).not.toHaveBeenCalled();
  });

  test('a credential request gets the same treatment', async () => {
    // Signing in while the backend boots is the commonest way to meet
    // this, so it must not fall through to "Invalid email or password".
    await expect(
      handleResponse(html(502, 'Bad Gateway'), { credentialRequest: true }),
    ).rejects.toThrow('may still be starting up');
  });
});

describe('the other statuses are untouched', () => {

  test('403 explains the refusal and keeps the session', async () => {
    await expect(
      handleResponse(json(403, { message: 'You do not have permission to do that.' })),
    ).rejects.toThrow('permission');

    expect(localStorage.getItem('token')).toBe('stored-token');
  });

  test('a FastAPI detail string is used', async () => {
    await expect(handleResponse(json(422, { detail: 'resume_text is required' })))
      .rejects.toThrow('resume_text is required');
  });

  test('a successful response returns its body', async () => {
    const body = { status: 'UP' };
    await expect(handleResponse({ ok: true, json: () => Promise.resolve(body) }))
      .resolves.toEqual(body);
  });
});
