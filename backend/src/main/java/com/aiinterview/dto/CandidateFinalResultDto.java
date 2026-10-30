package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * The candidate's own final result for one job.
 *
 * <p>There is deliberately <strong>no field for the recruiter's
 * internal notes</strong>. They are not blanked out here or filtered by
 * a serializer setting that somebody could later change - this shape
 * simply has nowhere to put them, so they cannot be leaked by
 * accident.
 *
 * <p>It carries nothing about other candidates either: no comparison,
 * no ranking, no interview scores of anybody else.
 *
 * <p>{@link #announced} is false while the recruiter has not published.
 * A draft decision never reaches this DTO at all - the query that
 * builds it only matches published rows - so "not announced" and "the
 * recruiter has written a draft" are indistinguishable from here, which
 * is the point.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateFinalResultDto {

    private Long applicationId;

    private Long jobId;
    private String jobTitle;
    private String company;

    /** Who made the decision's organisation is represented by this. */
    private String recruiterName;

    /** APPLIED, SHORTLISTED, REJECTED or INTERVIEWED - unchanged. */
    private String applicationStatus;
    private String applicationStatusLabel;

    private LocalDateTime interviewCompletedAt;

    /**
     * False while no decision has been published. The page then shows
     * that the result is still to come, with no hint of whether a
     * draft exists.
     */
    private boolean announced;

    /**
     * SELECTED or NOT_SELECTED once announced; PENDING while not.
     */
    private String decision;

    /** The wording to show, from the server. */
    private String decisionLabel;

    /** True only for a published SELECTED, so the UI can celebrate. */
    private boolean selected;

    /**
     * The recruiter's message to this candidate, if they wrote one.
     * Only ever populated for a published decision.
     */
    private String feedback;

    /** When the decision was announced. Null while not announced. */
    private LocalDateTime announcedAt;

    /**
     * What the page says when no decision has been published yet.
     * Supplied by the server so both sides word it the same way.
     */
    private String message;
}
