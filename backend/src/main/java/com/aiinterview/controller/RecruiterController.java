package com.aiinterview.controller;

import com.aiinterview.dto.RecruiterOverviewResponse;
import com.aiinterview.service.RecruiterDashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recruiter-only views over every candidate's interviews.
 *
 * <p>Every other interview endpoint is scoped to the logged-in user.
 * This one is not, so it is the one place where the role actually has
 * to be enforced - hence {@link PreAuthorize} here and
 * {@code @EnableMethodSecurity} on SecurityConfig, without which the
 * annotation would be ignored and every logged-in candidate could read
 * everyone else's results.
 */
@RestController
@RequestMapping("/api/v1/recruiter")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
public class RecruiterController {

    private final RecruiterDashboardService recruiterDashboardService;

    @Operation(
            summary = "Every candidate's interviews, with headline totals",
            description = "Requires the RECRUITER role."
    )
    @PreAuthorize("hasRole('RECRUITER')")
    @GetMapping("/overview")
    public ResponseEntity<RecruiterOverviewResponse> getOverview() {

        return ResponseEntity.ok(recruiterDashboardService.getOverview());
    }
}
