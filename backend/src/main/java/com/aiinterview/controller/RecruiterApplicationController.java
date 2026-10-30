package com.aiinterview.controller;

import com.aiinterview.dto.ApplicantDetailDto;
import com.aiinterview.dto.ApplicantSummaryDto;
import com.aiinterview.dto.ApplicationDecisionRequestDto;
import com.aiinterview.dto.JobComparisonDto;
import com.aiinterview.service.RecruiterApplicationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Recruiter-only: who applied for their jobs, the decision on each, and
 * the comparison of the candidates who interviewed.
 *
 * <p>Two guards, as on {@link RecruiterController}. {@link PreAuthorize}
 * on the class keeps out everyone but approved recruiters, and it only
 * works because {@code SecurityConfig} enables method security. Then
 * every service call is scoped by the recruiter from the token, so a
 * job, application or result id belonging to another recruiter is "not
 * found" - which is what closes the direct-object-reference hole that
 * class-level role checks alone would leave open.
 */
@RestController
@RequestMapping("/api/v1/recruiter")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('RECRUITER')")
public class RecruiterApplicationController {

    private final RecruiterApplicationService recruiterApplicationService;

    @Operation(summary = "Applicants for one of your jobs, best CV match first")
    @GetMapping("/jobs/{jobId}/applications")
    public ResponseEntity<List<ApplicantSummaryDto>> listApplicants(
            @PathVariable Long jobId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                recruiterApplicationService.listApplicants(authentication.getName(), jobId)
        );
    }

    @Operation(summary = "One applicant, with the CV analysis they applied with")
    @GetMapping("/applications/{applicationId}")
    public ResponseEntity<ApplicantDetailDto> getApplicant(
            @PathVariable Long applicationId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                recruiterApplicationService.getApplicant(authentication.getName(), applicationId)
        );
    }

    @Operation(summary = "Shortlist or reject an applicant")
    @PatchMapping("/applications/{applicationId}/decision")
    public ResponseEntity<ApplicantSummaryDto> decide(
            @PathVariable Long applicationId,
            @Valid @RequestBody ApplicationDecisionRequestDto request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                recruiterApplicationService.decide(
                        authentication.getName(),
                        applicationId,
                        request
                )
        );
    }

    @Operation(summary = "Completed assessments for one job, side by side")
    @GetMapping("/jobs/{jobId}/comparison")
    public ResponseEntity<JobComparisonDto> compare(
            @PathVariable Long jobId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                recruiterApplicationService.compare(authentication.getName(), jobId)
        );
    }
}
