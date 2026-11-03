package com.aiinterview.exception;

import com.aiinterview.dto.ErrorResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.util.unit.DataSize;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

/**
 * Every error response: a stable {@code code} the frontend switches on
 * and a {@code message} written for the user.
 *
 * <p>Messages from this application's own exceptions (BadRequest,
 * Conflict, NotFound and so on) are written for the user where they
 * are thrown and are passed through. Anything unexpected - and every
 * failure inside the AI service - is logged here with its detail and
 * answered with fixed wording, so exception text, addresses and stack
 * traces never reach a browser.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    static final String SERVER_ERROR =
            "Something went wrong on our side. Please try again in a moment.";

    static final String AI_UNAVAILABLE =
            "The AI service is temporarily unavailable. Please try again in a few minutes.";

    static final String AI_FAILED =
            "The AI service couldn't complete this request. Please try again.";

    static final String AI_INVALID =
            "Some of the information sent to the AI service was not valid. Please check it and try again.";

    /**
     * Codes the AI service may send in {"detail": {"code", "message"}}
     * whose message is written for the user. Any other detail is
     * logged and replaced.
     */
    private static final Set<String> PUBLIC_AI_CODES = Set.of(
            "AI_BAD_REQUEST", "AI_RATE_LIMITED", "AI_DAILY_LIMIT",
            "AI_UNAVAILABLE", "AI_FAILED", "NOT_FOUND", "CONFLICT", "FORBIDDEN"
    );

    private final ObjectMapper objectMapper;

    private final String maxUploadSize;

    public GlobalExceptionHandler(
            ObjectMapper objectMapper,
            @Value("${spring.servlet.multipart.max-file-size:10MB}") DataSize maxUploadSize
    ) {
        this.objectMapper = objectMapper;
        this.maxUploadSize = maxUploadSize.toMegabytes() + " MB";
    }

    // ------------------------------------------------------------------
    // Application exceptions: messages written for the user
    // ------------------------------------------------------------------

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateEmail(DuplicateEmailException ex, HttpServletRequest request) {
        return respond(HttpStatus.CONFLICT, "DUPLICATE_EMAIL", ex.getMessage(), request);
    }

    /**
     * 429, with Retry-After so a client knows when to try again. Sign-in
     * and reset-email limits come through here; the AI limit is answered
     * by AiRateLimitFilter before any controller runs.
     */
    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ErrorResponse> handleTooManyRequests(TooManyRequestsException ex, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header("Retry-After", String.valueOf(ex.getRetryAfterSeconds()))
                .body(body(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED", ex.getMessage(), request));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex, HttpServletRequest request) {
        return respond(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), request);
    }

    @ExceptionHandler(UnauthorizedAccessException.class)
    public ResponseEntity<ErrorResponse> handleUnauthorizedAccess(UnauthorizedAccessException ex, HttpServletRequest request) {
        return respond(HttpStatus.FORBIDDEN, "FORBIDDEN", ex.getMessage(), request);
    }

    /**
     * 400 for a request that cannot be carried out as asked, 409 for one
     * that clashes with stored data (a second attempt at a job
     * interview). Both carry a message the page shows as it stands.
     */
    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException ex, HttpServletRequest request) {
        return respond(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage(), request);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(ConflictException ex, HttpServletRequest request) {
        return respond(HttpStatus.CONFLICT, "CONFLICT", ex.getMessage(), request);
    }

    @ExceptionHandler(InvalidFileException.class)
    public ResponseEntity<ErrorResponse> handleInvalidFile(InvalidFileException ex, HttpServletRequest request) {
        return respond(HttpStatus.BAD_REQUEST, "INVALID_FILE", ex.getMessage(), request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxSizeException(MaxUploadSizeExceededException ex, HttpServletRequest request) {
        return respond(HttpStatus.BAD_REQUEST, "FILE_TOO_LARGE",
                "This file is too large. Upload a PDF smaller than " + maxUploadSize + ".", request);
    }

    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ErrorResponse> handleBadCredentials(BadCredentialsException ex, HttpServletRequest request) {
        return respond(HttpStatus.UNAUTHORIZED, "AUTH_INVALID_CREDENTIALS",
                "The email or password is incorrect. Please try again.", request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> errors = new LinkedHashMap<>();
        ex.getBindingResult().getAllErrors().forEach((error) -> {
            if (error instanceof FieldError fieldError) {
                // The first message per field: the one the form shows.
                errors.putIfAbsent(fieldError.getField(), error.getDefaultMessage());
            }
        });

        ErrorResponse response = body(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED",
                "Please correct the highlighted fields and try again.", request);
        response.setFieldErrors(errors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    /**
     * Thrown when @PreAuthorize refuses a request - a candidate asking
     * for the recruiter dashboard, say.
     *
     * <p>Without this it reached the catch-all below and came back as a
     * 500, which reads as "the server broke" when the server in fact
     * worked exactly as intended.
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        return respond(HttpStatus.FORBIDDEN, "FORBIDDEN", "You don't have permission to do that.", request);
    }

    @ExceptionHandler(JwtException.class)
    public ResponseEntity<ErrorResponse> handleJwtException(JwtException ex, HttpServletRequest request) {
        return respond(HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED",
                "Your session has expired. Please sign in again.", request);
    }

    // ------------------------------------------------------------------
    // AI service
    // ------------------------------------------------------------------

    @ExceptionHandler(AiServiceException.class)
    public ResponseEntity<ErrorResponse> handleAiServiceException(AiServiceException ex, HttpServletRequest request) {

        // A 4xx from the AI service is normally the caller's fault (bad
        // payload, unknown session), so its status is passed through.
        //
        // 401/403 are the one exception: those come from the internal
        // X-Internal-Api-Key check between this backend and the AI
        // service (see ai-service/app/security.py), which has nothing
        // to do with the end user's own session. Passing that through
        // unchanged would look identical to an expired JWT and the
        // frontend would log the user out - hiding what is actually a
        // server misconfiguration (INTERNAL_API_KEY mismatch). Report
        // it as a gateway failure instead.
        HttpStatus status = HttpStatus.BAD_GATEWAY;

        int downstreamStatus = ex.getDownstreamStatus();

        if (downstreamStatus >= 400 && downstreamStatus < 500
                && downstreamStatus != 401 && downstreamStatus != 403) {
            status = HttpStatus.valueOf(downstreamStatus);
        }

        String code;
        String message;

        JsonNode publicError = publicDetail(ex.getDownstreamBody());

        if (ex.isUserFacing()) {
            code = "AI_FAILED";
            message = ex.getMessage();
        } else if (publicError != null) {
            code = publicError.get("code").asText();
            message = publicError.get("message").asText();
        } else if (downstreamStatus == 0 || downstreamStatus == 401 || downstreamStatus == 403
                || downstreamStatus == 502 || downstreamStatus == 503 || downstreamStatus == 504) {
            // Unreachable, timed out, or misconfigured between the two
            // services: nothing the user did, and nothing they can fix.
            code = "AI_UNAVAILABLE";
            message = AI_UNAVAILABLE;
        } else if (downstreamStatus == 429) {
            code = "AI_RATE_LIMITED";
            message = "The AI service is busy right now. Please wait a moment and try again.";
        } else if (status.is4xxClientError()) {
            code = "AI_INVALID_REQUEST";
            message = AI_INVALID;
        } else {
            code = "AI_FAILED";
            message = AI_FAILED;
        }

        // The full story stays in the log, never in the response.
        log.warn("AI service call failed for {} {}: downstream status {}, {}; body: {}",
                request.getMethod(), request.getRequestURI(), downstreamStatus,
                ex.getMessage(), truncate(ex.getDownstreamBody()));

        return respond(status, code, message, request);
    }

    /**
     * The AI service's {"detail": {"code", "message"}} when the code is
     * one it uses for messages written for the user; null otherwise -
     * a plain-text detail may be exception text and is never forwarded.
     */
    private JsonNode publicDetail(String body) {

        if (body == null || body.isBlank()) {
            return null;
        }

        try {
            JsonNode detail = objectMapper.readTree(body).get("detail");

            if (detail != null && detail.isObject()
                    && detail.path("code").isTextual() && detail.path("message").isTextual()
                    && PUBLIC_AI_CODES.contains(detail.get("code").asText())
                    && !detail.get("message").asText().isBlank()) {
                return detail;
            }
        } catch (Exception ignored) {
            // Non-JSON body: logged by the caller, never shown.
        }

        return null;
    }

    // ------------------------------------------------------------------
    // Everything else
    // ------------------------------------------------------------------

    /**
     * An unknown URL is a 404, not a server error. Without this the
     * catch-all below turns every typo into a 500.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(NoResourceFoundException ex, HttpServletRequest request) {
        return respond(HttpStatus.NOT_FOUND, "NOT_FOUND",
                "We couldn't find what you were looking for.", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneralException(Exception ex, HttpServletRequest request) {
        log.error("Unhandled error for {} {}", request.getMethod(), request.getRequestURI(), ex);
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", SERVER_ERROR, request);
    }

    // ------------------------------------------------------------------

    private ResponseEntity<ErrorResponse> respond(
            HttpStatus status, String code, String message, HttpServletRequest request) {
        return ResponseEntity.status(status).body(body(status, code, message, request));
    }

    private static ErrorResponse body(
            HttpStatus status, String code, String message, HttpServletRequest request) {
        return ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(status.value())
                .error(status.getReasonPhrase())
                .code(code)
                .message(message)
                .path(request.getRequestURI())
                .build();
    }

    private static String truncate(String value) {
        if (value == null) {
            return "(none)";
        }
        return value.length() <= 500 ? value : value.substring(0, 500) + "...";
    }
}
