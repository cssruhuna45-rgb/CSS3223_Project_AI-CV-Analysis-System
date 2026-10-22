package com.aiinterview.controller;

import com.aiinterview.dto.JobPostingDto;
import com.aiinterview.dto.JobPostingRequestDto;
import com.aiinterview.dto.RecruiterOverviewResponse;
import com.aiinterview.service.JobPostingService;
import com.aiinterview.service.RecruiterDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Recruiter-only: their jobs, and the interviews candidates took for
 * them.
 *
 * <p>Two guards. {@link PreAuthorize} on the class keeps out everyone
 * but recruiters - and only approved ones, because
 * CustomUserDetailsService withholds ROLE_RECRUITER until an
 * administrator approves the account. It needs
 * {@code @EnableMethodSecurity} on SecurityConfig, without which the
 * annotation would be silently ignored. Then every service call is
 * scoped by the recruiter from the token, so one recruiter never sees
 * another's jobs or candidates.
 */
@RestController
@RequestMapping("/api/v1/recruiter")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('RECRUITER')")
public class RecruiterController {

    private final RecruiterDashboardService recruiterDashboardService;

    private final JobPostingService jobPostingService;

    @Operation(summary = "Interviews taken for this recruiter's jobs, with headline totals")
    @GetMapping("/overview")
    public ResponseEntity<RecruiterOverviewResponse> getOverview(
            @RequestParam(required = false) Long jobId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                recruiterDashboardService.getOverview(authentication.getName(), jobId)
        );
    }

    @Operation(summary = "This recruiter's jobs, newest first, with candidate counts")
    @GetMapping("/jobs")
    public ResponseEntity<List<JobPostingDto>> listJobs(Authentication authentication) {
        return ResponseEntity.ok(jobPostingService.listMine(authentication.getName()));
    }

    @Operation(summary = "Create a job and get its invite code")
    @PostMapping("/jobs")
    public ResponseEntity<JobPostingDto> createJob(
            @Valid @RequestBody JobPostingRequestDto request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(jobPostingService.create(authentication.getName(), request));
    }

    @Operation(summary = "Stop accepting candidates for a job; its results are kept")
    @PostMapping("/jobs/{id}/close")
    public ResponseEntity<JobPostingDto> closeJob(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(jobPostingService.setOpen(authentication.getName(), id, false));
    }

    @Operation(summary = "Accept candidates for a closed job again")
    @PostMapping("/jobs/{id}/reopen")
    public ResponseEntity<JobPostingDto> reopenJob(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return ResponseEntity.ok(jobPostingService.setOpen(authentication.getName(), id, true));
    }
}
