package com.aiinterview.controller;

import com.aiinterview.dto.CandidateApplicationDto;
import com.aiinterview.dto.CandidateFinalResultDto;
import com.aiinterview.dto.JobApplicationRequestDto;
import com.aiinterview.service.HiringDecisionService;
import com.aiinterview.service.JobApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.Authentication;

import java.util.List;

/**
 * The candidate's side of applying for a job.
 *
 * <p>Requires a signed-in account, and the service refuses anything but
 * a candidate - rather than {@code @PreAuthorize} on the class, so that
 * a recruiter who follows an invite link gets a message explaining the
 * page is for candidates instead of a bare 403.
 *
 * <p>The candidate is always taken from the authenticated token. No
 * endpoint here accepts a candidate id, so one account cannot apply as
 * or read the applications of another.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class JobApplicationController {

    private final JobApplicationService jobApplicationService;

    private final HiringDecisionService hiringDecisionService;

    @Operation(summary = "Apply for a job with one of your own CVs")
    @PostMapping("/jobs/{jobId}/applications")
    public ResponseEntity<CandidateApplicationDto> apply(
            @PathVariable Long jobId,
            @Valid @RequestBody JobApplicationRequestDto request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                jobApplicationService.apply(authentication.getName(), jobId, request)
        );
    }

    @Operation(summary = "Your own job applications and their statuses, newest first")
    @GetMapping("/candidate/applications")
    public ResponseEntity<List<CandidateApplicationDto>> listMine(
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                jobApplicationService.listMine(authentication.getName())
        );
    }

    @Operation(summary = "One of your own job applications")
    @GetMapping("/candidate/applications/{applicationId}")
    public ResponseEntity<CandidateApplicationDto> getMine(
            @PathVariable Long applicationId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                jobApplicationService.getMine(authentication.getName(), applicationId)
        );
    }

    /**
     * The candidate's final hiring result for one of their own
     * applications (V12).
     *
     * <p>Only an announced decision is ever loaded, so a recruiter's
     * private draft cannot be read here, and the response has no field
     * for internal recruiter notes at all.
     */
    @Operation(summary = "Your announced hiring result for one of your applications")
    @GetMapping("/candidate/applications/{applicationId}/final-result")
    public ResponseEntity<CandidateFinalResultDto> finalResult(
            @PathVariable Long applicationId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                hiringDecisionService.getFinalResult(authentication.getName(), applicationId)
        );
    }
}
