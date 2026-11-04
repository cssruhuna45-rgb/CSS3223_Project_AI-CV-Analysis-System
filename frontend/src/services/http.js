// ============================================================
// HTTP REQUESTS AND USER-FACING ERRORS
//
// Every call to the backend goes through request(). It turns each
// way a request can fail into an ApiError whose .message is always
// safe to show: never "Failed to fetch", a status line, HTML, JSON,
// an internal address or an exception's text.
//
// Pages show errors with userMessage(err, 'What failed, and what to
// do next.'). The server's own message is used only when it is a
// business rule the user can act on ("You have already applied for
// this job"); anything else gets the page's action-specific wording.
//
// Kept apart from api.js so page tests that mock api.js still get the
// real error handling.
// ============================================================

// Shown when the server never answered.
export const NETWORK_MESSAGE =
  "We couldn't reach the server. Check your internet connection and try again.";

export const TIMEOUT_MESSAGE =
  'The server took too long to respond. Please try again.';

export const SESSION_EXPIRED_MESSAGE =
  'Your session has expired. Please sign in again.';

export const INVALID_LOGIN_MESSAGE =
  'The email or password is incorrect. Please try again.';

export const PERMISSION_MESSAGE =
  "You don't have permission to do that.";

export const UNEXPECTED_RESPONSE_MESSAGE =
  'We received an unexpected response from the server. Please try again.';

export const SERVER_ERROR_MESSAGE =
  'Something went wrong on our side. Please try again in a moment.';

export const SERVER_STARTING_MESSAGE =
  'The server is not responding yet. It may still be starting up - please wait a few seconds and try again.';

export const AI_UNAVAILABLE_MESSAGE =
  'The AI service is temporarily unavailable. Please try again in a few minutes.';

export const AI_BUSY_MESSAGE =
  'The AI service is busy right now. Please wait a moment and try again.';

export const AI_DAILY_LIMIT_MESSAGE =
  "The AI service has reached today's usage limit. Please try again later.";

// Server error codes whose message is written for the user and is
// shown as it stands. Any other response falls back to the page's own
// wording, so a new server error can never leak text by default.
const PUBLIC_CODES = new Set([
  'BAD_REQUEST',
  'VALIDATION_FAILED',
  'CONFLICT',
  'NOT_FOUND',
  'FORBIDDEN',
  'RATE_LIMITED',
  'INVALID_FILE',
  'FILE_TOO_LARGE',
  'DUPLICATE_EMAIL',
  'AUTH_INVALID_CREDENTIALS',
  'AI_BAD_REQUEST',
]);

// Codes with fixed wording, whatever the server's message says.
const FIXED_MESSAGES = {
  AUTH_INVALID_CREDENTIALS: INVALID_LOGIN_MESSAGE,
  SESSION_EXPIRED: SESSION_EXPIRED_MESSAGE,
  SERVER_STARTING: SERVER_STARTING_MESSAGE,
  AI_UNAVAILABLE: AI_UNAVAILABLE_MESSAGE,
  AI_RATE_LIMITED: AI_BUSY_MESSAGE,
  AI_DAILY_LIMIT: AI_DAILY_LIMIT_MESSAGE,
};

/**
 * A failed request.
 *
 * kind        'http' (the server answered with an error), 'network'
 *             (no answer), 'timeout', or 'parse' (an answer that was
 *             not the JSON expected)
 * status      the HTTP status, 0 when there was none
 * code        the server's stable error code, e.g. 'CONFLICT'
 * message     always safe to show
 * serverMessage  the server's message when it is meant for the user,
 *             otherwise null
 * fieldErrors { fieldName: message } from a form validation failure
 * retryAfter  seconds until a rate-limited request may be retried
 */
export class ApiError extends Error {
  constructor({
    kind = 'http', status = 0, code = null, message, serverMessage = null,
    fieldErrors = null, retryAfter = null,
  }) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.serverMessage = serverMessage;
    this.fieldErrors = fieldErrors;
    this.retryAfter = retryAfter;
  }

  /** True when the server never answered, so the outcome is unknown. */
  get uncertain() {
    return this.kind === 'network' || this.kind === 'timeout';
  }
}

export const isApiError = (err) => err instanceof ApiError;

// A server message is shown only when it reads as a sentence: no
// markup, no JSON, nothing long enough to be a stack trace. This is a
// second line of defence behind the server, not the only one.
const looksSafe = (text) => typeof text === 'string'
  && text.trim().length > 0
  && text.length <= 300
  && !/[<>{}[\]]|https?:\/\/|Exception|\bat [\w$.]+\(/.test(text);

/** The stable code for a response, from the body or else the status. */
function codeFor(status, body) {
  if (body && typeof body.code === 'string') return body.code;
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 413) return 'FILE_TOO_LARGE';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 502 || status === 503 || status === 504) return 'AI_UNAVAILABLE';
  return 'INTERNAL_ERROR';
}

function retryAfterSeconds(res) {
  const raw = res.headers && typeof res.headers.get === 'function'
    ? res.headers.get('Retry-After')
    : null;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

function cleanFieldErrors(fieldErrors) {
  if (!fieldErrors || typeof fieldErrors !== 'object' || Array.isArray(fieldErrors)) return null;
  const out = {};
  Object.entries(fieldErrors).forEach(([field, msg]) => {
    if (looksSafe(msg)) out[field] = msg;
  });
  return Object.keys(out).length ? out : null;
}

/**
 * The ApiError for an error response. `authenticated` says whether
 * the request carried the user's session, which decides what a 401
 * means: an expired session, or a wrong password at sign-in.
 */
export async function errorFromResponse(res, { authenticated, url = '' }) {
  const text = await res.text().catch(() => '');
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null; // HTML error page, proxy text - never shown
  }
  if (body !== null && typeof body !== 'object') body = null;

  const status = res.status;
  let code = codeFor(status, body);
  const raw = body && typeof body.message === 'string' ? body.message : null;
  const fieldErrors = cleanFieldErrors(body && body.fieldErrors);
  const retryAfter = retryAfterSeconds(res);

  // A 502/503/504 with no JSON body is nginx answering for a backend
  // that is not up yet - in development, the seconds it takes to boot
  // after a restart. Spring's own AI failures carry a JSON body, and an
  // AI route keeps saying the AI is unavailable.
  if (!body && status >= 502 && status <= 504 && !/\/api\/v1\/ai\//.test(url)) {
    code = 'SERVER_STARTING';
  }

  // A 401 is a wrong password only when the server says so, or when it
  // answers the sign-in form. Anything else is a session that is no
  // longer accepted (or never existed) and needs a fresh sign-in.
  let signInNeeded = false;
  if (status === 401) {
    const atSignIn = !authenticated && /\/auth\/login$/.test(url);
    if (code === 'AUTH_INVALID_CREDENTIALS' || atSignIn) {
      code = 'AUTH_INVALID_CREDENTIALS';
    } else {
      code = 'SESSION_EXPIRED';
      signInNeeded = !authenticated;
    }
  }

  let serverMessage = null;
  if (signInNeeded) {
    serverMessage = 'Please sign in to continue.';
  } else if (FIXED_MESSAGES[code]) {
    serverMessage = FIXED_MESSAGES[code];
  } else if (PUBLIC_CODES.has(code) && looksSafe(raw)) {
    serverMessage = raw;
  }

  let message = serverMessage;
  if (!message) {
    if (status === 403) message = PERMISSION_MESSAGE;
    else if (status === 429) message = AI_BUSY_MESSAGE;
    else if (status >= 500) message = SERVER_ERROR_MESSAGE;
    else message = 'That request could not be completed. Please check the details and try again.';
  }

  return new ApiError({ kind: 'http', status, code, message, serverMessage, fieldErrors, retryAfter });
}

function signOutExpiredSession() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
}

// Reads time out; anything that changes data does not, because giving
// up on the browser side would not stop it on the server and the user
// could end up doing it twice.
const READ_TIMEOUT_MS = 30000;

/**
 * fetch, with every failure turned into an ApiError. Resolves to the
 * parsed JSON body, or null for an empty one.
 */
export async function request(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = options.headers || {};
  const authorization = headers.Authorization || headers.authorization || '';
  const authenticated = /^Bearer\s+(?!null$|undefined$)\S+/.test(authorization);
  const timeoutMs = options.timeoutMs !== undefined
    ? options.timeoutMs
    : (method === 'GET' ? READ_TIMEOUT_MS : 0);

  const { timeoutMs: _ignored, ...fetchOptions } = options;
  let timer = null;
  let controller = null;
  if (timeoutMs > 0 && typeof AbortController !== 'undefined' && !fetchOptions.signal) {
    controller = new AbortController();
    fetchOptions.signal = controller.signal;
    timer = setTimeout(() => controller.abort(), timeoutMs);
  }

  let res;
  try {
    res = await fetch(url, fetchOptions);
  } catch (err) {
    const timedOut = controller && controller.signal.aborted;
    throw new ApiError(timedOut
      ? { kind: 'timeout', code: 'TIMEOUT', message: TIMEOUT_MESSAGE }
      : { kind: 'network', code: 'NETWORK', message: NETWORK_MESSAGE });
  } finally {
    if (timer) clearTimeout(timer);
  }

  if (!res.ok) {
    const error = await errorFromResponse(res, { authenticated, url });
    // Only a session the server no longer accepts is cleared. A 403 is
    // a signed-in user without permission and keeps their session.
    if (error.code === 'SESSION_EXPIRED') signOutExpiredSession();
    throw error;
  }

  if (res.status === 204) return null;

  const text = await res.text().catch(() => null);
  if (text === null) {
    throw new ApiError({ kind: 'network', code: 'NETWORK', message: NETWORK_MESSAGE });
  }
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError({ kind: 'parse', status: res.status, code: 'BAD_RESPONSE', message: UNEXPECTED_RESPONSE_MESSAGE });
  }
}

/**
 * What to show for a failure.
 *
 * fallback   the page's own wording for this action, used for anything
 *            that is not a business rule the server spelled out
 * uncertain  for a change whose outcome is unknown when the server
 *            never answered: "We couldn't confirm ..." rather than
 *            claiming it failed
 */
export function userMessage(err, fallback = SERVER_ERROR_MESSAGE, { uncertain } = {}) {
  if (!isApiError(err)) return fallback;
  if (err.uncertain) return uncertain || err.message;
  if (err.kind === 'parse') return fallback;
  if (err.serverMessage) return err.serverMessage;
  if (err.status === 403) return PERMISSION_MESSAGE;
  return fallback;
}

/**
 * A fallback for when the form has field errors the page could not
 * place beside an input: one line naming each problem.
 */
export function fieldErrorSummary(err, knownFields = []) {
  if (!isApiError(err) || !err.fieldErrors) return '';
  const unplaced = Object.entries(err.fieldErrors)
    .filter(([field]) => !knownFields.includes(field))
    .map(([, msg]) => msg);
  return unplaced.join(' ');
}
