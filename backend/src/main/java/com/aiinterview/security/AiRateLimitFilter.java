package com.aiinterview.security;

import com.aiinterview.dto.ErrorResponse;
import com.aiinterview.exception.TooManyRequestsException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Caps how fast one account can spend the Gemini quota.
 *
 * <p>Every request here costs a paid model call, and before this a
 * script with one valid login could repeat them until the project's
 * quota ran out for everyone. The limit is per account, not per IP:
 * behind the frontend's nginx every request arrives from the same
 * address, and the account is what a login actually proves.
 *
 * <p>Runs after JwtAuthenticationFilter, so the account is known. An
 * unauthenticated request is passed on untouched and refused by the
 * security rules as before.
 */
@Component
@RequiredArgsConstructor
public class AiRateLimitFilter extends OncePerRequestFilter {

    /**
     * A full job interview is about a dozen calls (start, one per
     * answer, finish) and a practice one about twice that with model
     * answers, so this leaves room for real use and stops a loop.
     */
    static final int MAX_REQUESTS = 60;

    static final Duration WINDOW = Duration.ofMinutes(10);

    private static final String MESSAGE =
            "You are sending AI requests too quickly. Please wait a few minutes and try again.";

    /** POST requests that reach the AI service. */
    private static final List<String> AI_PATHS = List.of(
            "/api/v1/ai/**",
            "/api/v1/resumes",
            "/api/v1/roadmaps/generate",
            "/api/v1/recruiter/jobs/*/questions/generate",
            "/api/v1/recruiter/jobs/*/questions/*/regenerate"
    );

    private static final AntPathMatcher PATHS = new AntPathMatcher();

    private final RateLimiter rateLimiter;

    private final ObjectMapper objectMapper;

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) {

        if (!"POST".equals(request.getMethod())) {
            return true;
        }

        String path = request.getRequestURI();

        return AI_PATHS.stream().noneMatch(pattern -> PATHS.match(pattern, path));
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated()) {
            try {
                rateLimiter.check("ai:" + auth.getName(), MAX_REQUESTS, WINDOW, MESSAGE);
            } catch (TooManyRequestsException e) {
                refuse(request, response, e);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Written here rather than by GlobalExceptionHandler, which only
     * sees exceptions from controllers - this runs before any.
     */
    private void refuse(
            HttpServletRequest request,
            HttpServletResponse response,
            TooManyRequestsException e) throws IOException {

        ErrorResponse error = ErrorResponse.builder()
                .timestamp(LocalDateTime.now())
                .status(HttpStatus.TOO_MANY_REQUESTS.value())
                .error(HttpStatus.TOO_MANY_REQUESTS.getReasonPhrase())
                .code("RATE_LIMITED")
                .message(e.getMessage())
                .path(request.getRequestURI())
                .build();

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setHeader(HttpHeaders.RETRY_AFTER, String.valueOf(e.getRetryAfterSeconds()));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), error);
    }
}
