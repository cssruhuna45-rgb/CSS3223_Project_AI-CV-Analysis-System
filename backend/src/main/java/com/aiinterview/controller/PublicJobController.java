package com.aiinterview.controller;

import com.aiinterview.dto.PublicJobDetailDto;
import com.aiinterview.dto.PublicJobDto;
import com.aiinterview.service.PublicJobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The candidates' Public Jobs list (V13).
 *
 * <p>Signed-in candidates only: Public Jobs is part of the candidate's
 * Apply for a Job page, and recruiters manage their own jobs elsewhere.
 * Applying still goes through {@code POST /api/v1/jobs/{jobId}/applications},
 * so there is one application workflow, not two.
 */
@RestController
@RequestMapping("/api/v1/jobs/public")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('CANDIDATE')")
public class PublicJobController {

    private final PublicJobService publicJobService;

    @Operation(summary = "Published jobs, most recently published first")
    @GetMapping
    public ResponseEntity<List<PublicJobDto>> list() {
        return ResponseEntity.ok(publicJobService.listPublished());
    }

    @Operation(summary = "One published job, with your own application for it")
    @GetMapping("/{id}")
    public ResponseEntity<PublicJobDetailDto> get(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(publicJobService.getPublished(authentication.getName(), id));
    }
}
