package com.aiinterview.controller;

import com.aiinterview.dto.JobAssessmentDto;
import com.aiinterview.dto.JobQuestionSettingsDto;
import com.aiinterview.dto.JobQuestionsSaveRequestDto;
import com.aiinterview.service.JobQuestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Recruiter-only: a job's interview questions - generate, review, edit,
 * approve.
 *
 * <p>Kept apart from RecruiterController so the question and
 * application work do not share one controller. Same two guards:
 * {@link PreAuthorize} admits approved recruiters only, and every
 * service call is scoped by the recruiter from the token.
 */
@RestController
@RequestMapping("/api/v1/recruiter/jobs/{jobId}")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('RECRUITER')")
public class JobQuestionController {

    private final JobQuestionService jobQuestionService;

    @Operation(summary = "The job's questions, settings and what still stops approval")
    @GetMapping("/questions")
    public ResponseEntity<JobAssessmentDto> get(
            @PathVariable Long jobId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(jobQuestionService.getAssessment(authentication.getName(), jobId));
    }

    @Operation(summary = "Change required skills and question count, before approval")
    @PutMapping("/question-settings")
    public ResponseEntity<JobAssessmentDto> updateSettings(
            @PathVariable Long jobId,
            @Valid @RequestBody JobQuestionSettingsDto settings,
            Authentication authentication
    ) {
        return ResponseEntity.ok(jobQuestionService.updateSettings(authentication.getName(), jobId, settings));
    }

    @Operation(summary = "Draft the question set with AI from the job's skills, replacing any draft")
    @PostMapping("/questions/generate")
    public ResponseEntity<JobAssessmentDto> generate(
            @PathVariable Long jobId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(jobQuestionService.generate(authentication.getName(), jobId));
    }

    @Operation(summary = "Replace one draft question with a newly generated one")
    @PostMapping("/questions/{questionId}/regenerate")
    public ResponseEntity<JobAssessmentDto> regenerate(
            @PathVariable Long jobId,
            @PathVariable Long questionId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(jobQuestionService.regenerate(authentication.getName(), jobId, questionId));
    }

    @Operation(summary = "Save the edited draft, in the order given")
    @PutMapping("/questions")
    public ResponseEntity<JobAssessmentDto> save(
            @PathVariable Long jobId,
            @Valid @RequestBody JobQuestionsSaveRequestDto request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(
                jobQuestionService.saveDraft(authentication.getName(), jobId, request.getQuestions())
        );
    }

    @Operation(summary = "Approve and lock the question set")
    @PostMapping("/questions/approve")
    public ResponseEntity<JobAssessmentDto> approve(
            @PathVariable Long jobId,
            Authentication authentication
    ) {
        return ResponseEntity.ok(jobQuestionService.approve(authentication.getName(), jobId));
    }
}
