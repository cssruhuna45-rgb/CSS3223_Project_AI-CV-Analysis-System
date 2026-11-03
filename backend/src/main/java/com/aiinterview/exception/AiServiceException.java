package com.aiinterview.exception;

import lombok.Getter;

/**
 * Thrown when the downstream Python AI service rejects a request or is
 * unreachable.
 *
 * <p>The original status code and response body are kept for the
 * server log and so the proxy can choose the right status. Neither is
 * shown to the user: GlobalExceptionHandler forwards only an error the
 * AI service marked as public ({"detail": {"code", "message"}}).
 */
@Getter
public class AiServiceException extends RuntimeException {

    /**
     * HTTP status returned by the AI service, or 0 when the call never
     * completed (timeout, connection refused).
     */
    private final int downstreamStatus;

    /**
     * Raw response body from the AI service, if any.
     */
    private final String downstreamBody;

    /**
     * True when {@link #getMessage()} was written for the user and may
     * be shown as it stands.
     */
    private final boolean userFacing;

    public AiServiceException(
            String message,
            int downstreamStatus,
            String downstreamBody
    ) {
        super(message);
        this.downstreamStatus = downstreamStatus;
        this.downstreamBody = downstreamBody;
        this.userFacing = false;
    }

    public AiServiceException(String message, Throwable cause) {
        super(message, cause);
        this.downstreamStatus = 0;
        this.downstreamBody = null;
        this.userFacing = false;
    }

    private AiServiceException(String message, int downstreamStatus, boolean userFacing) {
        super(message);
        this.downstreamStatus = downstreamStatus;
        this.downstreamBody = null;
        this.userFacing = userFacing;
    }

    /** An AI failure whose message is plain English for the user. */
    public static AiServiceException userFacing(String message, int status) {
        return new AiServiceException(message, status, true);
    }
}
