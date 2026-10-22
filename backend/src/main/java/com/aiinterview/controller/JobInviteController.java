package com.aiinterview.controller;

import com.aiinterview.dto.JobInviteDto;
import com.aiinterview.service.JobPostingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The candidate's side of an invite code: read the job before agreeing
 * to share an interview with its recruiter.
 *
 * <p>Requires a signed-in account but no particular role, so the page
 * can tell a recruiter who opens the link that it is for candidates.
 * The interview itself is started through /api/v1/ai/interview/start
 * with the code, where only candidates are accepted.
 */
@RestController
@RequestMapping("/api/v1/jobs")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class JobInviteController {

    private final JobPostingService jobPostingService;

    @Operation(summary = "The job behind an invite code")
    @GetMapping("/invite/{code}")
    public ResponseEntity<JobInviteDto> preview(
            @PathVariable String code,
            Authentication authentication
    ) {
        return ResponseEntity.ok(jobPostingService.previewInvite(authentication.getName(), code));
    }
}
