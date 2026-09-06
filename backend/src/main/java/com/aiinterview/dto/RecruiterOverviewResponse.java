package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Everything the recruiter dashboard renders, in one call.
 *
 * <p>The totals are computed server side rather than in the browser so
 * that the numbers stay right when the list is later paged and the
 * frontend no longer holds every row.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecruiterOverviewResponse {

    private int totalCandidates;

    private int totalInterviews;

    private int completedInterviews;

    private int inProgressInterviews;

    /**
     * Mean score over graded interviews only, or null when none have
     * been graded yet. An average of zero would read as "everyone
     * scored nothing".
     */
    private Integer averageScore;

    private List<RecruiterCandidateDto> candidates;
}
