import {
  ApiError, INVALID_LOGIN_MESSAGE, NETWORK_MESSAGE, PERMISSION_MESSAGE,
  SESSION_EXPIRED_MESSAGE, request, userMessage,
} from './http';

// The one place every request's failure is turned into words. These
// pin down the cases that went wrong before: a wrong password read as
// an expired session, permission refusals signing people out, and raw
// server text ("Failed to fetch", HTML, exception messages) on screen.

const SPRING = 'http://api.test';

function response(status, body, { headers = {}, raw = false } = {}) {
  const text = raw ? body : (body === undefined ? '' : JSON.stringify(body));
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name] ?? headers[name.toLowerCase()] ?? null },
    text: () => Promise.resolve(text),
  });
}

const authed = { headers: { Authorization: 'Bearer real-token', 'Content-Type': 'application/json' } };
const anonymous = { headers: { 'Content-Type': 'application/json' } };

let originalLocation;

beforeEach(() => {
  global.fetch = jest.fn();
  localStorage.setItem('token', 'real-token');
  localStorage.setItem('user', '{"name":"Ana"}');
  originalLocation = window.location;
  delete window.location;
  window.location = { pathname: '/dashboard', assign: jest.fn() };
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

// ---- 401: wrong password versus expired session ------------------------

test('a wrong password says so and does not sign anyone out', async () => {
  fetch.mockReturnValue(response(401, {
    status: 401, code: 'AUTH_INVALID_CREDENTIALS', message: 'The email or password is incorrect. Please try again.',
  }));

  const err = await failure(request(`${SPRING}/api/v1/auth/login`, { method: 'POST', ...anonymous }));

  expect(err).toBeInstanceOf(ApiError);
  expect(err.message).toBe(INVALID_LOGIN_MESSAGE);
  expect(err.message).not.toMatch(/session/i);
  expect(window.location.assign).not.toHaveBeenCalled();
  expect(localStorage.getItem('token')).toBe('real-token');
});

test('a 401 from sign-in is a wrong password even without an error code', async () => {
  fetch.mockReturnValue(response(401, undefined));

  const err = await failure(request(`${SPRING}/api/v1/auth/login`, { method: 'POST', ...anonymous }));

  expect(err.message).toBe(INVALID_LOGIN_MESSAGE);
});

test('an expired session clears the stored login and sends the user to sign in', async () => {
  // Spring's entry point answers an expired token with an empty 401.
  fetch.mockReturnValue(response(401, undefined));

  const err = await failure(request(`${SPRING}/api/v1/resumes`, authed));

  expect(err.code).toBe('SESSION_EXPIRED');
  expect(err.message).toBe(SESSION_EXPIRED_MESSAGE);
  expect(localStorage.getItem('token')).toBeNull();
  expect(localStorage.getItem('user')).toBeNull();
  expect(window.location.assign).toHaveBeenCalledWith('/login');
});

// ---- 403 -----------------------------------------------------------------

test('a permission refusal keeps the user signed in', async () => {
  fetch.mockReturnValue(response(403, {
    status: 403, code: 'FORBIDDEN', message: 'You do not have permission to view this interview.',
  }));

  const err = await failure(request(`${SPRING}/api/v1/interviews/x/scorecard`, authed));

  expect(err.status).toBe(403);
  expect(err.message).toBe('You do not have permission to view this interview.');
  expect(localStorage.getItem('token')).toBe('real-token');
  expect(window.location.assign).not.toHaveBeenCalled();
});

test('a 403 without a body still gets a plain message', async () => {
  fetch.mockReturnValue(response(403, undefined));

  const err = await failure(request(`${SPRING}/api/v1/recruiter/jobs`, authed));

  expect(err.message).toBe(PERMISSION_MESSAGE);
  expect(localStorage.getItem('token')).toBe('real-token');
});

// ---- No answer, or an answer that is not JSON ---------------------------

test('a network failure never shows "Failed to fetch"', async () => {
  fetch.mockReturnValue(Promise.reject(new TypeError('Failed to fetch')));

  const err = await failure(request(`${SPRING}/api/v1/resumes`, authed));

  expect(err.kind).toBe('network');
  expect(err.uncertain).toBe(true);
  expect(err.message).toBe(NETWORK_MESSAGE);
  expect(err.message).not.toMatch(/fetch/i);
  // The outcome of a change is unknown, so the page can say so.
  expect(userMessage(err, 'fallback', { uncertain: "We couldn't confirm it was saved." }))
    .toBe("We couldn't confirm it was saved.");
});

test('an HTML error page from a proxy is never shown', async () => {
  fetch.mockReturnValue(response(502, '<html><body><h1>502 Bad Gateway</h1>nginx</body></html>', { raw: true }));

  const err = await failure(request(`${SPRING}/api/v1/ai/resume/analyze`, { method: 'POST', ...authed }));

  expect(err.message).not.toMatch(/<|nginx|Bad Gateway/);
  expect(userMessage(err, "We couldn't analyse your CV right now. Please try again."))
    .toBe('The AI service is temporarily unavailable. Please try again in a few minutes.');
});

test('a successful response that is not JSON is reported safely', async () => {
  fetch.mockReturnValue(response(200, 'Internal proxy page', { raw: true }));

  const err = await failure(request(`${SPRING}/api/v1/resumes`, authed));

  expect(err.kind).toBe('parse');
  expect(userMessage(err, "We couldn't load your CVs. Please try again."))
    .toBe("We couldn't load your CVs. Please try again.");
});

test('an empty success body resolves to null', async () => {
  fetch.mockReturnValue(response(204, undefined));

  await expect(request(`${SPRING}/api/v1/resumes/1`, { method: 'DELETE', ...authed })).resolves.toBeNull();
});

// ---- What the server says --------------------------------------------------

test('a business rule from the server is shown as written', async () => {
  fetch.mockReturnValue(response(409, {
    status: 409, code: 'CONFLICT', message: 'You have already applied for this job.',
  }));

  const err = await failure(request(`${SPRING}/api/v1/jobs/1/applications`, { method: 'POST', ...authed }));

  expect(userMessage(err, 'fallback')).toBe('You have already applied for this job.');
});

test('a server error never shows its technical text, even if the server sent some', async () => {
  fetch.mockReturnValue(response(500, {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred: org.postgresql.util.PSQLException: connection refused at db:5432',
  }));

  const err = await failure(request(`${SPRING}/api/v1/resumes`, authed));

  expect(err.message).not.toMatch(/PSQLException|5432|unexpected error occurred/);
  expect(userMessage(err, "We couldn't load your CVs. Please try again."))
    .toBe("We couldn't load your CVs. Please try again.");
});

test('an AI failure detail inside an unknown code falls back to the page wording', async () => {
  fetch.mockReturnValue(response(502, {
    status: 502, code: 'AI_FAILED', message: 'Resume analysis failed: KeyError(\'skills\')',
  }));

  const err = await failure(request(`${SPRING}/api/v1/ai/resume/analyze`, { method: 'POST', ...authed }));

  expect(userMessage(err, "We couldn't analyse your CV right now. Please try again."))
    .toBe("We couldn't analyse your CV right now. Please try again.");
});

test('a daily AI limit is told apart from a short wait', async () => {
  fetch.mockReturnValueOnce(response(429, { status: 429, code: 'AI_DAILY_LIMIT', message: 'x' }));
  fetch.mockReturnValueOnce(response(429, { status: 429, code: 'AI_RATE_LIMITED', message: 'x' }));

  const daily = await failure(request(`${SPRING}/api/v1/ai/x`, { method: 'POST', ...authed }));
  const busy = await failure(request(`${SPRING}/api/v1/ai/x`, { method: 'POST', ...authed }));

  expect(daily.message).toMatch(/today's usage limit/);
  expect(busy.message).toMatch(/busy right now/);
  expect(`${daily.message} ${busy.message}`).not.toMatch(/API key|minute/i);
});

test('status, code, field errors and Retry-After are kept on the error', async () => {
  fetch.mockReturnValue(response(429, {
    status: 429, code: 'RATE_LIMITED',
    message: 'Too many sign-in attempts. Please wait 15 minutes and try again, or reset your password.',
  }, { headers: { 'Retry-After': '900' } }));

  const limited = await failure(request(`${SPRING}/api/v1/auth/login`, { method: 'POST', ...anonymous }));

  expect(limited.status).toBe(429);
  expect(limited.code).toBe('RATE_LIMITED');
  expect(limited.retryAfter).toBe(900);
  expect(limited.message).toContain('Too many sign-in attempts');

  fetch.mockReturnValue(response(400, {
    status: 400, code: 'VALIDATION_FAILED', message: 'Please correct the highlighted fields and try again.',
    fieldErrors: { email: 'Must be a valid email address', password: '<script>alert(1)</script>' },
  }));

  const invalid = await failure(request(`${SPRING}/api/v1/auth/register`, { method: 'POST', ...anonymous }));

  expect(invalid.fieldErrors).toEqual({ email: 'Must be a valid email address' });
});

test('a plain JavaScript error is never shown, only the page wording', () => {
  expect(userMessage(new TypeError("Cannot read properties of undefined (reading 'id')"), 'Page wording.'))
    .toBe('Page wording.');
});
