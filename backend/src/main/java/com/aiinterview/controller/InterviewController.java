package com.aiinterview.controller;

import com.aiinterview.dto.InterviewHistoryItemDto;
import com.aiinterview.dto.InterviewProgressResponse;
import com.aiinterview.service.InterviewProgressService;
import com.aiinterview.service.InterviewResumeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * A candidate's own interview record.
 *
 * <p>Interviews are written by {@code AiProxyController} as they
 * happen; this exposes what was stored, and lets a job interview
 * interrupted by a reload carry on.
 *
 * <p>No endpoint takes a user id. The user comes from the
 * authenticated principal, so there is no parameter a caller could
 * change to read somebody else's interviews.
 */
@RestController
@RequestMapping("/api/v1/interviews")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class InterviewController {

    private final InterviewProgressService interviewProgressService;

    private final InterviewResumeService interviewResumeService;

    @Operation(summary = "List the signed-in candidate's completed interviews")
    @GetMapping("/history")
    public ResponseEntity<List<InterviewHistoryItemDto>> getHistory(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                interviewProgressService.getHistory(authentication.getName())
        );
    }

    @Operation(
            summary = "Reopen the stored scorecard for one interview",
            description = "Returns the same payload the interview "
                    + "produced when it finished, so a candidate can "
                    + "revisit a result. Their own interviews only."
    )
    @GetMapping("/{sessionId}/scorecard")
    public ResponseEntity<JsonNode> getScorecard(
            @PathVariable String sessionId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                interviewProgressService.getScorecard(
                        authentication.getName(),
                        sessionId
                )
        );
    }

    @Operation(
            summary = "Continue a job interview after a reload",
            description = "Returns the question the candidate was on. "
                    + "A session that expired on the AI service is "
                    + "rebuilt from the stored answers. Their own job "
                    + "interviews only, and only while still allowed."
    )
    @PostMapping("/{sessionId}/resume")
    public ResponseEntity<JsonNode> resume(
            @PathVariable String sessionId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                interviewResumeService.resume(
                        authentication.getName(),
                        sessionId
                )
        );
    }

    @Operation(summary = "Score progress across the candidate's interviews")
    @GetMapping("/progress")
    public ResponseEntity<InterviewProgressResponse> getProgress(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                interviewProgressService.getProgress(authentication.getName())
        );
    }
}
