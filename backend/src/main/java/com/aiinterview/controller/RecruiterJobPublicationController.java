package com.aiinterview.controller;

import com.aiinterview.dto.JobPostingDto;
import com.aiinterview.service.JobPublicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recruiter-only: listing their own jobs under Public Jobs, and
 * archiving them (V13).
 *
 * <p>Same two guards as {@link RecruiterController}: approved
 * recruiters only, and every change scoped to the recruiter from the
 * token, so one recruiter cannot publish or archive another's job.
 */
@RestController
@RequestMapping("/api/v1/recruiter/jobs")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('RECRUITER')")
public class RecruiterJobPublicationController {

    private final JobPublicationService jobPublicationService;

    @Operation(summary = "List a job under Public Jobs")
    @PostMapping("/{id}/publish")
    public ResponseEntity<JobPostingDto> publish(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(jobPublicationService.publish(authentication.getName(), id));
    }

    @Operation(summary = "Take a job off Public Jobs; its invite code keeps working")
    @PostMapping("/{id}/unpublish")
    public ResponseEntity<JobPostingDto> unpublish(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(jobPublicationService.unpublish(authentication.getName(), id));
    }

    @Operation(summary = "Archive a job: hidden, invite code retired, history kept")
    @PostMapping("/{id}/archive")
    public ResponseEntity<JobPostingDto> archive(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(jobPublicationService.archive(authentication.getName(), id));
    }

    @Operation(summary = "Bring an archived job back")
    @PostMapping("/{id}/unarchive")
    public ResponseEntity<JobPostingDto> unarchive(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(jobPublicationService.unarchive(authentication.getName(), id));
    }
}
