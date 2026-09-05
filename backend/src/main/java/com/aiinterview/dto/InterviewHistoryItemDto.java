package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * One completed interview, as the history and progress views show it.
 *
 * <p>Carries only what those views render. The transcript, the full
 * scorecard and the job description stay in the database: the history
 * list has no use for them, and shipping them would put every question
 * and answer of every past interview into a list response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewHistoryItemDto {

    /**
     * The AI service's session identifier, which is what the frontend
     * already uses to refer to an interview.
     */
    private String sessionId;

    /**
     * Out of 100, or null when grading failed for this interview.
     */
    private Integer score;

    private String status;

    /**
     * Points gained or lost against the previous scored interview.
     * Null for the earliest one, which has nothing to compare to.
     */
    private Integer scoreChange;

    private String feedbackSummary;

    private LocalDateTime startedAt;

    private LocalDateTime completedAt;
}
