package com.aiinterview.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AiRateLimitFilterTest {

    private final AiRateLimitFilter filter = new AiRateLimitFilter(
            new RateLimiter(),
            new ObjectMapper().registerModule(new JavaTimeModule())
    );

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private void signIn(String email) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                email, null, List.of(new SimpleGrantedAuthority("ROLE_CANDIDATE"))));
    }

    /** Sends one request; returns the response, or null if it went through. */
    private MockHttpServletResponse send(String method, String path) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, path);
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        return chain.getRequest() == null ? response : null;
    }

    @Test
    void refusesAnAccountOverTheLimitWithA429() throws Exception {
        signIn("cara@example.com");

        for (int i = 0; i < AiRateLimitFilter.MAX_REQUESTS; i++) {
            assertNull(send("POST", "/api/v1/ai/interview/answer"));
        }

        MockHttpServletResponse refused = send("POST", "/api/v1/ai/interview/answer");

        assertNotNull(refused);
        assertEquals(429, refused.getStatus());
        assertNotNull(refused.getHeader("Retry-After"));
        assertTrue(refused.getContentAsString().contains("too quickly"));
    }

    @Test
    void anotherAccountKeepsItsOwnLimit() throws Exception {
        signIn("cara@example.com");
        for (int i = 0; i <= AiRateLimitFilter.MAX_REQUESTS; i++) {
            send("POST", "/api/v1/ai/interview/answer");
        }

        signIn("olly@example.com");

        assertNull(send("POST", "/api/v1/ai/interview/answer"));
    }

    @Test
    void countsEveryPathThatSpendsTheAiQuota() throws Exception {
        signIn("cara@example.com");
        List<String> paths = List.of(
                "/api/v1/resumes",
                "/api/v1/roadmaps/generate",
                "/api/v1/recruiter/jobs/5/questions/generate",
                "/api/v1/recruiter/jobs/5/questions/9/regenerate"
        );

        for (int i = 0; i < AiRateLimitFilter.MAX_REQUESTS; i++) {
            send("POST", paths.get(i % paths.size()));
        }

        assertNotNull(send("POST", "/api/v1/resumes"));
    }

    @Test
    void leavesReadsAndOtherPathsAlone() throws Exception {
        signIn("cara@example.com");

        for (int i = 0; i <= AiRateLimitFilter.MAX_REQUESTS; i++) {
            assertNull(send("GET", "/api/v1/ai/health"));
            assertNull(send("POST", "/api/v1/interviews/abc/resume"));
        }
    }

    @Test
    void anUnauthenticatedRequestIsLeftToTheSecurityRules() throws Exception {
        for (int i = 0; i <= AiRateLimitFilter.MAX_REQUESTS; i++) {
            assertNull(send("POST", "/api/v1/ai/interview/start"));
        }
    }
}
