package com.aiinterview.security;

import com.aiinterview.exception.TooManyRequestsException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RateLimiterTest {

    private static final Duration MINUTE = Duration.ofMinutes(1);

    /** A clock the test moves by hand. */
    private static final class TestClock extends Clock {

        private Instant now = Instant.parse("2026-11-01T10:00:00Z");

        void advance(Duration by) {
            now = now.plus(by);
        }

        @Override
        public Instant instant() {
            return now;
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }
    }

    private final TestClock clock = new TestClock();

    private final RateLimiter limiter = new RateLimiter(clock);

    private void hit(String key) {
        limiter.check(key, 3, MINUTE, "Slow down.");
    }

    @Test
    void allowsUpToTheLimitAndRefusesTheNext() {
        hit("k");
        hit("k");
        hit("k");

        TooManyRequestsException refused = assertThrows(TooManyRequestsException.class, () -> hit("k"));

        assertEquals("Slow down.", refused.getMessage());
        assertEquals(60, refused.getRetryAfterSeconds());
    }

    @Test
    void retryAfterCountsDownToTheEndOfTheWindow() {
        hit("k");
        hit("k");
        hit("k");
        clock.advance(Duration.ofSeconds(45));

        TooManyRequestsException refused = assertThrows(TooManyRequestsException.class, () -> hit("k"));

        assertEquals(15, refused.getRetryAfterSeconds());
    }

    @Test
    void theCountStartsAgainInTheNextWindow() {
        hit("k");
        hit("k");
        hit("k");
        clock.advance(MINUTE);

        assertDoesNotThrow(() -> hit("k"));
    }

    @Test
    void keysAreCountedSeparately() {
        hit("login:cara@example.com");
        hit("login:cara@example.com");
        hit("login:cara@example.com");

        assertDoesNotThrow(() -> hit("login:olly@example.com"));
    }

    @Test
    void resetClearsTheCount() {
        hit("k");
        hit("k");
        hit("k");
        limiter.reset("k");

        assertDoesNotThrow(() -> hit("k"));
    }
}
