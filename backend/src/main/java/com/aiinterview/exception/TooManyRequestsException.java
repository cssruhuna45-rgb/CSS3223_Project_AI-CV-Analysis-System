package com.aiinterview.exception;

/**
 * Too many requests of one kind in a short time (429): sign-in
 * attempts for one account, reset emails, or calls that spend the
 * Gemini quota.
 */
public class TooManyRequestsException extends RuntimeException {

    /** When the caller may try again, for the Retry-After header. */
    private final long retryAfterSeconds;

    public TooManyRequestsException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
