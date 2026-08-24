package com.aiinterview.controller;

import com.aiinterview.dto.ResumeAnalysisResponse;
import com.aiinterview.entity.Resume;
import com.aiinterview.entity.ResumeAnalysis;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.exception.UnauthorizedAccessException;
import com.aiinterview.repository.ResumeAnalysisRepository;
import com.aiinterview.repository.ResumeRepository;
import com.aiinterview.repository.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/resumes")
@RequiredArgsConstructor
public class ResumeAnalysisController {

    private final ResumeRepository resumeRepository;
    private final ResumeAnalysisRepository resumeAnalysisRepository;
    private final UserRepository userRepository;

    @Operation(
            summary = "Get resume analysis",
            description = "Get AI analysis for a resume owned by the authenticated user",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @GetMapping("/{id}/analysis")
    public ResponseEntity<ResumeAnalysisResponse> getResumeAnalysis(
            @PathVariable Long id,
            Authentication authentication
    ) {

        // 1. Check authentication
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedAccessException(
                    "Authentication is required."
            );
        }

        // 2. Get logged-in user's email from JWT
        String userEmail = authentication.getName();

        // 3. Find user
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found with email: " + userEmail
                ));

        // 4. Find resume
        Resume resume = resumeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Resume not found with id: " + id
                ));

        // 5. Check ownership
        if (!resume.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedAccessException(
                    "You do not have permission to access this resume."
            );
        }

        // 6. Find AI analysis
        ResumeAnalysis analysis = resumeAnalysisRepository
                .findByResumeId(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Resume analysis not found for resume id: " + id
                ));

        // 7. Convert entity to DTO
        ResumeAnalysisResponse response =
                ResumeAnalysisResponse.builder()
                        .resumeId(resume.getId())
                        .score(analysis.getScore())
                        .summary(analysis.getSummary())
                        .skills(analysis.getSkills())
                        .strengths(analysis.getStrengths())
                        .weaknesses(analysis.getWeaknesses())
                        .missingSkills(analysis.getMissingSkills())
                        .recommendations(analysis.getRecommendations())
                        .build();

        // 8. Return response
        return ResponseEntity.ok(response);
    }
}