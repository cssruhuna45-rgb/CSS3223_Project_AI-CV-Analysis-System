package com.aiinterview.controller;

import com.aiinterview.dto.SkillGapAnalysisSummary;
import com.aiinterview.entity.Resume;
import com.aiinterview.entity.SkillGapAnalysis;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.exception.UnauthorizedAccessException;
import com.aiinterview.repository.ResumeRepository;
import com.aiinterview.repository.SkillGapAnalysisRepository;
import com.aiinterview.repository.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * The skill gap analyses stored against one CV.
 *
 * <p>What the CV Analysis page reads to show a candidate what each of
 * their uploads has been compared against, without re-running
 * anything. An empty list is a normal answer: a CV uploaded but never
 * taken to the skill gap page has none.
 */
@RestController
@RequestMapping("/api/v1/resumes")
@RequiredArgsConstructor
public class SkillGapAnalysisController {

    private static final Logger log =
            LoggerFactory.getLogger(SkillGapAnalysisController.class);

    private final ResumeRepository resumeRepository;
    private final SkillGapAnalysisRepository skillGapAnalysisRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Operation(
            summary = "List the skill gap analyses stored for one CV",
            description = "Newest first. Owned by the authenticated user.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @Transactional(readOnly = true)
    @GetMapping("/{id}/skill-gaps")
    public ResponseEntity<List<SkillGapAnalysisSummary>> getSkillGaps(
            @PathVariable Long id,
            Authentication authentication
    ) {

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new UnauthorizedAccessException("Authentication is required.");
        }

        User user = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "We couldn't find your account. Please sign in again."
                ));

        Resume resume = resumeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "We couldn't find that CV. It may have been deleted."
                ));

        // The id comes from the browser, so owning the CV is checked
        // here and not inferred from having asked for it.
        if (!resume.getUser().getId().equals(user.getId())) {
            throw new UnauthorizedAccessException(
                    "You do not have permission to access this resume."
            );
        }

        List<SkillGapAnalysisSummary> analyses = skillGapAnalysisRepository
                .findByResumeIdOrderByAnalysedAtDesc(id)
                .stream()
                .map(this::toSummary)
                .toList();

        return ResponseEntity.ok(analyses);
    }

    private SkillGapAnalysisSummary toSummary(SkillGapAnalysis analysis) {

        return SkillGapAnalysisSummary.builder()
                .id(analysis.getId())
                .resumeId(analysis.getResume().getId())
                .jobField(analysis.getJobField())
                .jobFieldName(analysis.getJobFieldName())
                .matchPercentage(analysis.getMatchPercentage())
                .gapPercentage(analysis.getGapPercentage())
                .summary(analysis.getSummary())
                .analysedAt(analysis.getAnalysedAt())
                .result(parsed(analysis))
                .build();
    }

    /**
     * The stored snapshot as JSON.
     *
     * <p>A row whose snapshot cannot be parsed still lists: the
     * columns beside it carry the percentages and the field, which is
     * what the list itself draws. Only the detail view is lost, and
     * that is better than one bad row hiding every analysis the
     * candidate has.
     */
    private JsonNode parsed(SkillGapAnalysis analysis) {

        try {
            return objectMapper.readTree(analysis.getResultJson());
        } catch (Exception e) {
            log.warn(
                    "Stored skill gap analysis {} is not readable JSON: {}",
                    analysis.getId(),
                    e.getMessage()
            );
            return null;
        }
    }
}
