package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * One candidate's completed assessment, as a column of the comparison.
 *
 * <p>Carries two numbers that must not be confused with each other:
 * {@link #matchPercentage} is how the CV read against the job's
 * required skills, and {@link #interviewScore} is how the candidate
 * actually answered. They measure different things and the UI labels
 * them separately.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ComparisonCandidateDto {

    private Long applicationId;

    private Long candidateId;
    private String candidateName;
    private String candidateEmail;

    private String status;
    private String statusLabel;

    /** CV skill match, from the application. Decision support only. */
    private Integer matchPercentage;

    /**
     * Final interview score out of 100, or null when grading did not
     * run. Null is shown as "not graded" rather than as a zero, which
     * would read as a candidate who answered nothing.
     */
    private Integer interviewScore;

    private String feedbackSummary;

    private LocalDateTime completedAt;

    /**
     * Per-question grading, in the order the questions were asked.
     * Aligned across candidates by {@code questionId}.
     */
    private List<ComparisonAnswerDto> answers;
}
