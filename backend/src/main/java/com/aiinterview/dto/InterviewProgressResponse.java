package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * A candidate's performance across their completed interviews.
 *
 * <p>Every score field is nullable rather than defaulted to zero. A
 * candidate with one interview has no previous score, and a zero there
 * would be read as "you scored nothing last time" - which is a
 * different statement from "there was no last time".
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewProgressResponse {

    /**
     * Completed interviews, including any that could not be graded.
     */
    private int totalInterviews;

    /**
     * Completed interviews that carry a score. Only these are compared.
     */
    private int scoredInterviews;

    private Integer latestScore;

    private Integer previousScore;

    private Integer bestScore;

    /**
     * Average across scored interviews, rounded to the nearest point.
     */
    private Integer averageScore;

    /**
     * latestScore - previousScore. Null when there is no previous one.
     */
    private Integer scoreDifference;

    private ProgressTrend trend;

    /**
     * Oldest first, so a chart can plot it straight through.
     */
    @Builder.Default
    private List<InterviewHistoryItemDto> interviews = new ArrayList<>();
}
