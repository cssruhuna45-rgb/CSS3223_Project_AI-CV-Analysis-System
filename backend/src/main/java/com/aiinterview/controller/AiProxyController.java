package com.aiinterview.controller;

import com.aiinterview.exception.UnauthorizedAccessException;
import com.aiinterview.service.AiServiceClient;
import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authenticated gateway in front of the Python AI service.
 *
 * <p>The browser never talks to the AI service directly. It calls these
 * endpoints with the user's JWT; Spring Security authenticates the
 * request and {@link AiServiceClient} forwards it with the shared
 * internal API key. That keeps Gemini usage behind a login.
 *
 * <p>Routes are declared explicitly rather than as a wildcard so that
 * only the endpoints the product actually needs are exposed. In
 * particular {@code /api/v1/rag/index} stays unreachable from here: a
 * reindex is an expensive operator action, not something any logged-in
 * user should be able to trigger.
 *
 * <p>Bodies pass through as {@link JsonNode}. The AI service owns the
 * request and response schemas; mirroring them as Java DTOs would only
 * create a second copy to keep in sync.
 */
@RestController
@RequestMapping("/api/v1/ai")
@RequiredArgsConstructor
public class AiProxyController {

    private final AiServiceClient aiServiceClient;

    // ========================================================
    // Resume analysis
    // ========================================================

    @Operation(
            summary = "Analyze a resume with AI",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @PostMapping("/resume/analyze")
    public ResponseEntity<JsonNode> analyzeResume(
            @RequestBody JsonNode body,
            Authentication authentication
    ) {
        return forward("/api/v1/resume/analyze", body, authentication);
    }

    // ========================================================
    // Skill gap
    // ========================================================

    @Operation(
            summary = "Analyze the candidate's skill gap",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @PostMapping("/skill-gap/analyze")
    public ResponseEntity<JsonNode> analyzeSkillGap(
            @RequestBody JsonNode body,
            Authentication authentication
    ) {
        return forward("/api/v1/skill-gap/analyze", body, authentication);
    }

    // ========================================================
    // Interview
    // ========================================================

    @Operation(
            summary = "Start an adaptive interview session",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @PostMapping("/interview/start")
    public ResponseEntity<JsonNode> startInterview(
            @RequestBody JsonNode body,
            Authentication authentication
    ) {
        return forward("/api/v1/interview/start", body, authentication);
    }

    @Operation(
            summary = "Submit an answer and get the next question",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @PostMapping("/interview/answer")
    public ResponseEntity<JsonNode> submitAnswer(
            @RequestBody JsonNode body,
            Authentication authentication
    ) {
        return forward("/api/v1/interview/answer", body, authentication);
    }

    @Operation(
            summary = "Finish an interview and get the scorecard",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @PostMapping("/interview/finish")
    public ResponseEntity<JsonNode> finishInterview(
            @RequestBody JsonNode body,
            Authentication authentication
    ) {
        return forward("/api/v1/interview/finish", body, authentication);
    }

    @Operation(
            summary = "Generate a single interview question",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @PostMapping("/interview/question")
    public ResponseEntity<JsonNode> generateQuestion(
            @RequestBody JsonNode body,
            Authentication authentication
    ) {
        return forward("/api/v1/interview/question", body, authentication);
    }

    // ========================================================
    // RAG
    // ========================================================

    @Operation(
            summary = "Query the RAG knowledge base",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @PostMapping("/rag/query")
    public ResponseEntity<JsonNode> queryRag(
            @RequestBody JsonNode body,
            Authentication authentication
    ) {
        return forward("/api/v1/rag/query", body, authentication);
    }

    // ========================================================
    // Health
    //
    // Still authenticated: it is a diagnostic for logged-in users,
    // and Spring's own public probe lives at /api/v1/health.
    // ========================================================

    @Operation(
            summary = "Check AI service health",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @GetMapping("/health")
    public ResponseEntity<JsonNode> aiHealth(
            Authentication authentication
    ) {
        requireAuthenticated(authentication);

        return ResponseEntity.ok(
                aiServiceClient.get("/api/v1/health")
        );
    }

    // ========================================================
    // Internals
    // ========================================================

    private ResponseEntity<JsonNode> forward(
            String path,
            JsonNode body,
            Authentication authentication
    ) {
        requireAuthenticated(authentication);

        return ResponseEntity.ok(
                aiServiceClient.post(path, body)
        );
    }

    /**
     * Defence in depth. SecurityConfig already requires authentication
     * for everything outside the permit-all list, so reaching this with
     * an anonymous principal would mean the filter chain was
     * misconfigured.
     */
    private void requireAuthenticated(Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedAccessException(
                    "Authentication is required to use the AI service."
            );
        }
    }
}
