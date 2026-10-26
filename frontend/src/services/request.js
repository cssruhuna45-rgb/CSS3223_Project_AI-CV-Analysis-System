// Preserve cancellations and HTTP responses; translate transport failures only.
export async function apiFetch(url, options = {}) {
  const { timeoutMs = 180000, signal, ...init } = options;
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  else signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    if (timedOut) throw new Error('The service is taking too long to respond. Please try again in a moment.');
    if (error instanceof TypeError) {
      throw new Error('We could not connect to the service. Check your connection, then try again. If other websites work, this service may be temporarily unavailable.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
