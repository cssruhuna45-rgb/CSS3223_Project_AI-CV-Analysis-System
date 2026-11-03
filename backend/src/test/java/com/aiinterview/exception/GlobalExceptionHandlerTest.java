package com.aiinterview.exception;

import com.aiinterview.dto.ErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.util.unit.DataSize;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * What reaches the browser when something fails. The rule under test:
 * the response always carries a stable code and a message written for
 * the user, and never exception text, addresses or AI detail.
 */
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler(new ObjectMapper(), DataSize.ofMegabytes(10));
        request = new MockHttpServletRequest("POST", "/api/v1/ai/resume/analyze");
    }

    private static void assertNoTechnicalText(String message) {
        for (String leak : new String[]{"Exception", "http://", "localhost", ":8000", "5432", "Traceback", "{", "}"}) {
            assertFalse(message.contains(leak), () -> "leaked '" + leak + "' in: " + message);
        }
    }

    @Test
    @DisplayName("an unexpected exception is logged, not shown")
    void generalExceptionIsGeneric() {
        ResponseEntity<ErrorResponse> response = handler.handleGeneralException(
                new IllegalStateException("org.postgresql.util.PSQLException: connection to localhost:5432 refused"),
                request);

        assertEquals(500, response.getStatusCode().value());
        assertEquals("INTERNAL_ERROR", response.getBody().getCode());
        assertEquals(GlobalExceptionHandler.SERVER_ERROR, response.getBody().getMessage());
        assertNoTechnicalText(response.getBody().getMessage());
    }

    @Test
    @DisplayName("an unreachable AI service hides its address")
    void unreachableAiServiceHidesAddress() {
        ResponseEntity<ErrorResponse> response = handler.handleAiServiceException(
                new AiServiceException("AI service is unreachable at http://localhost:8000/api/v1/resume/analyze",
                        new java.net.ConnectException("Connection refused")),
                request);

        assertEquals(502, response.getStatusCode().value());
        assertEquals("AI_UNAVAILABLE", response.getBody().getCode());
        assertNoTechnicalText(response.getBody().getMessage());
    }

    @Test
    @DisplayName("a plain-text AI detail is never forwarded")
    void plainAiDetailIsReplaced() {
        String body = "{\"detail\": \"Resume analysis failed: KeyError('skills') in app/resume/analyzer.py\"}";

        ResponseEntity<ErrorResponse> response = handler.handleAiServiceException(
                new AiServiceException("AI service returned HTTP 500", 500, body), request);

        assertEquals(502, response.getStatusCode().value());
        assertEquals("AI_FAILED", response.getBody().getCode());
        assertFalse(response.getBody().getMessage().contains("KeyError"));
        assertNoTechnicalText(response.getBody().getMessage());
    }

    @Test
    @DisplayName("a 4xx AI string detail keeps its status but not its text")
    void aiClientErrorKeepsStatusOnly() {
        String body = "{\"detail\": \"Session 3f2a-9b not found in store redis://redis:6379\"}";

        ResponseEntity<ErrorResponse> response = handler.handleAiServiceException(
                new AiServiceException("AI service returned HTTP 404", 404, body), request);

        assertEquals(404, response.getStatusCode().value());
        assertFalse(response.getBody().getMessage().contains("redis"));
        assertFalse(response.getBody().getMessage().contains("3f2a"));
    }

    @Test
    @DisplayName("an AI error marked public is passed through with its code")
    void publicAiErrorIsForwarded() {
        String body = "{\"detail\": {\"code\": \"AI_DAILY_LIMIT\", "
                + "\"message\": \"The AI service has reached today's usage limit. Please try again later.\"}}";

        ResponseEntity<ErrorResponse> response = handler.handleAiServiceException(
                new AiServiceException("AI service returned HTTP 429", 429, body), request);

        assertEquals(429, response.getStatusCode().value());
        assertEquals("AI_DAILY_LIMIT", response.getBody().getCode());
        assertTrue(response.getBody().getMessage().contains("today's usage limit"));
    }

    @Test
    @DisplayName("an unknown code in an AI detail is not trusted")
    void unknownAiCodeIsNotTrusted() {
        String body = "{\"detail\": {\"code\": \"DEBUG\", \"message\": \"Traceback (most recent call last): ...\"}}";

        ResponseEntity<ErrorResponse> response = handler.handleAiServiceException(
                new AiServiceException("AI service returned HTTP 500", 500, body), request);

        assertNoTechnicalText(response.getBody().getMessage());
    }

    @Test
    @DisplayName("the internal key check failing is not reported as the user's session")
    void internalKeyMismatchIsNotAuth() {
        ResponseEntity<ErrorResponse> response = handler.handleAiServiceException(
                new AiServiceException("AI service returned HTTP 401", 401, "{\"detail\":\"Missing or invalid internal API key\"}"),
                request);

        assertEquals(502, response.getStatusCode().value());
        assertEquals("AI_UNAVAILABLE", response.getBody().getCode());
        assertFalse(response.getBody().getMessage().contains("API key"));
    }

    @Test
    @DisplayName("a wrong password has its own code, apart from an expired session")
    void badCredentials() {
        ResponseEntity<ErrorResponse> response = handler.handleBadCredentials(
                new BadCredentialsException("Invalid email or password"), request);

        assertEquals(401, response.getStatusCode().value());
        assertEquals("AUTH_INVALID_CREDENTIALS", response.getBody().getCode());
        assertEquals("The email or password is incorrect. Please try again.", response.getBody().getMessage());
    }

    @Test
    @DisplayName("a permission refusal is a 403, not a sign-out")
    void accessDenied() {
        ResponseEntity<ErrorResponse> response = handler.handleAccessDenied(
                new AccessDeniedException("Access is denied"), request);

        assertEquals(403, response.getStatusCode().value());
        assertEquals("FORBIDDEN", response.getBody().getCode());
    }

    @Test
    @DisplayName("field errors are kept for the form, one message per field")
    void validationKeepsFieldErrors() throws Exception {
        BeanPropertyBindingResult result = new BeanPropertyBindingResult(new Object(), "registerRequest");
        result.addError(new FieldError("registerRequest", "email", "Must be a valid email address"));
        result.addError(new FieldError("registerRequest", "password", "Password must be at least 6 characters long"));
        MethodParameter parameter = new MethodParameter(
                GlobalExceptionHandlerTest.class.getDeclaredMethod("validationKeepsFieldErrors"), -1);

        ResponseEntity<ErrorResponse> response = handler.handleValidationExceptions(
                new MethodArgumentNotValidException(parameter, result), request);

        assertEquals(400, response.getStatusCode().value());
        assertEquals("VALIDATION_FAILED", response.getBody().getCode());
        assertEquals("Must be a valid email address", response.getBody().getFieldErrors().get("email"));
        assertEquals("Password must be at least 6 characters long", response.getBody().getFieldErrors().get("password"));
    }

    @Test
    @DisplayName("the upload limit in the message matches the configured one")
    void uploadLimitMatchesConfiguration() {
        GlobalExceptionHandler fiveMb = new GlobalExceptionHandler(new ObjectMapper(), DataSize.ofMegabytes(5));

        ResponseEntity<ErrorResponse> response = fiveMb.handleMaxSizeException(
                new MaxUploadSizeExceededException(5 * 1024 * 1024), request);

        assertEquals("FILE_TOO_LARGE", response.getBody().getCode());
        assertTrue(response.getBody().getMessage().contains("5 MB"));
    }

    @Test
    @DisplayName("a business rule message is passed through as written")
    void businessRulePassesThrough() {
        ResponseEntity<ErrorResponse> response = handler.handleConflict(
                new ConflictException("You have already applied for this job."), request);

        assertEquals(409, response.getStatusCode().value());
        assertEquals("CONFLICT", response.getBody().getCode());
        assertEquals("You have already applied for this job.", response.getBody().getMessage());
    }
}
