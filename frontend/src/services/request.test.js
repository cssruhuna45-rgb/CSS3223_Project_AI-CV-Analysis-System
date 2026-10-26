import { apiFetch } from './request';

afterEach(() => { jest.useRealTimers(); delete global.fetch; });

test('explains transport errors without exposing browser jargon', async () => {
  global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
  await expect(apiFetch('/api/test')).rejects.toThrow('Check your connection');
});

test('preserves HTTP responses for status-specific recovery', async () => {
  const response = { status: 404, ok: false };
  global.fetch = jest.fn().mockResolvedValue(response);
  await expect(apiFetch('/api/test')).resolves.toBe(response);
});

test('cancellation aborts the request without showing a network error', async () => {
  const controller = new AbortController();
  global.fetch = jest.fn((url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  const result = apiFetch('/api/test', { signal: controller.signal });
  controller.abort();
  await expect(result).rejects.toHaveProperty('name', 'AbortError');
});

test('timeouts explain the delay and allow retry', async () => {
  jest.useFakeTimers();
  global.fetch = jest.fn((url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  }));
  const result = apiFetch('/api/test', { timeoutMs: 100 });
  const assertion = expect(result).rejects.toThrow('taking too long');
  jest.advanceTimersByTime(100);
  await assertion;
});
