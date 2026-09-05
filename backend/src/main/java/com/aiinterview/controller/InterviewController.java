package com.aiinterview.controller;

import com.aiinterview.dto.InterviewHistoryItemDto;
import com.aiinterview.dto.InterviewProgressResponse;
import com.aiinterview.service.InterviewProgressService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * A candidate's own interview record.
 *
 * <p>Read-only. Interviews are written by {@code AiProxyController} as
 * they happen; this exposes what was stored.
 *
 * <p>Neither endpoint takes a user id. The user comes from the
 * authenticated principal, so there is no parameter a caller could
 * change to read somebody else's interviews.
 */
@RestController
@RequestMapping("/api/v1/interviews")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class InterviewController {

    private final InterviewProgressService interviewProgressService;

    @Operation(summary = "List the signed-in candidate's completed interviews")
    @GetMapping("/history")
    public ResponseEntity<List<InterviewHistoryItemDto>> getHistory(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                interviewProgressService.getHistory(authentication.getName())
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
