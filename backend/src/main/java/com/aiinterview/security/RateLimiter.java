package com.aiinterview.security;

import com.aiinterview.exception.TooManyRequestsException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Counts requests per key in fixed time windows and refuses the ones
 * over the limit.
 *
 * <p>A key names what is being counted - "login:cara@example.com",
 * "ai:cara@example.com" - so one account's limit never uses up
 * another's. A window opens with the first request for its key and
 * lasts its full length; the count starts again after it.
 *
 * <p>Kept in this process's memory. That is enough for one backend
 * container, which is how the project runs; a restart clears the
 * counts. Several backend copies would each count separately and would
 * need a shared store such as Redis instead.
 */
@Component
public class RateLimiter {

    /**
     * Above this many keys, expired windows are swept out on the next
     * request, so memory stays bounded without a background thread.
     */
    private static final int SWEEP_ABOVE = 10_000;

    private final Clock clock;

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    @Autowired
    public RateLimiter() {
        this(Clock.systemUTC());
    }

    /** For tests, which move the clock themselves. */
    RateLimiter(Clock clock) {
        this.clock = clock;
    }

    /**
     * Counts one request for the key and refuses it if that makes more
     * than {@code max} in the current window.
     *
     * @param message what the caller is told, written for the user
     * @throws TooManyRequestsException over the limit
     */
    public void check(String key, int max, Duration window, String message) {

        long now = clock.millis();

        // compute runs atomically per key, so two requests at the same
        // moment cannot both read the old count.
        Window current = windows.compute(key, (k, existing) ->
                existing == null || now >= existing.resetAt()
                        ? new Window(now + window.toMillis(), 1)
                        : new Window(existing.resetAt(), existing.count() + 1)
        );

        if (windows.size() > SWEEP_ABOVE) {
            windows.values().removeIf(w -> now >= w.resetAt());
        }

        if (current.count() > max) {
            long retryAfter = Math.max(1, (current.resetAt() - now + 999) / 1000);
            throw new TooManyRequestsException(message, retryAfter);
        }
    }

    /** Forgets the key's count - after a successful sign-in, say. */
    public void reset(String key) {
        windows.remove(key);
    }

    private record Window(long resetAt, int count) {
    }
}
