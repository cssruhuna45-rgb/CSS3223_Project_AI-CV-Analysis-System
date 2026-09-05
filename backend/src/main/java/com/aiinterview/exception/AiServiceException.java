package com.aiinterview.exception;

import lombok.Getter;

/**
 * Thrown when the downstream Python AI service rejects a request or is
 * unreachable.
 *
 * <p>The original status code and response body are kept so the proxy
 * can pass a meaningful error back to the browser instead of collapsing
 * everything into a generic 500.
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

    public AiServiceException(
            String message,
            int downstreamStatus,
            String downstreamBody
    ) {
        super(message);
        this.downstreamStatus = downstreamStatus;
        this.downstreamBody = downstreamBody;
    }

    public AiServiceException(String message, Throwable cause) {
        super(message, cause);
        this.downstreamStatus = 0;
        this.downstreamBody = null;
    }
}
