package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * One row of a recruiter's applicant list for a job.
 *
 * <p>Enough to triage on: who applied, when, how their CV compares with
 * the job's requirements, and a one-line read of their background. The
 * full CV analysis is only loaded when the recruiter opens the
 * applicant, so a job with eighty candidates does not ship eighty
 * analyses to the browser.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicantSummaryDto {

    private Long applicationId;

    private Long candidateId;
    private String candidateName;
    private String candidateEmail;

    private LocalDateTime appliedAt;

    /** The CV as submitted, for the "view CV" action. */
    private Long submittedResumeId;
    private String submittedCvFileName;

    /** Computed once at application time. Decision support only. */
    private SkillMatchDto match;

    /**
     * Longest-running or most recent role from the CV snapshot, as one
     * line. Null when the snapshot has no experience.
     */
    private String experienceSummary;

    /** Highest or most recent qualification, as one line. */
    private String educationSummary;

    private String status;
    private String statusLabel;

    private LocalDateTime decidedAt;

    /** The recruiter who decided, for a job reviewed by more than one. */
    private String decidedByName;

    /**
     * Whether this applicant has a comparable interview result yet, so
     * the list can link straight to the comparison.
     */
    private boolean interviewCompleted;

    /**
     * Final interview score out of 100, or null when the interview is
     * not finished or grading did not run.
     *
     * <p>Kept clearly apart from {@code match.matchPercentage}: one is
     * how the CV reads against the requirements, the other is how the
     * candidate actually answered. They are not comparable numbers.
     */
    private Integer interviewScore;
}
