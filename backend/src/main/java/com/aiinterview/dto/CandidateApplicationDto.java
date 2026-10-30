package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * One of the candidate's own applications, as their status page shows
 * it.
 *
 * <p>Carries nothing about other candidates and nothing from the
 * recruiter's side of the review: no match percentage, no skill gap, no
 * reviewer name. The match is the recruiter's decision support, and a
 * candidate who could read it would learn how they were scored against
 * requirements they are not shown.
 *
 * <p>{@link #interviewAvailable} is a convenience for the UI, not a
 * permission. The server re-checks every condition when the interview
 * is actually started, so a candidate who forges this flag gains
 * nothing.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateApplicationDto {

    private Long applicationId;

    private Long jobId;
    private String jobTitle;
    private String company;

    /** Who will read this application, so the candidate knows. */
    private String recruiterName;

    /** Needed to start the interview, which still goes through the code. */
    private String inviteCode;

    /** APPLIED, SHORTLISTED, REJECTED or INTERVIEWED. */
    private String status;

    /**
     * The wording to show: "Under review", "Shortlisted", "Not
     * selected", "Interview completed". Comes from the server so both
     * sides say the same thing and "REJECTED" is never shown raw.
     */
    private String statusLabel;

    /** The CV this application was made with. */
    private String submittedCvFileName;

    private LocalDateTime appliedAt;
    private LocalDateTime decidedAt;
    private LocalDateTime interviewCompletedAt;

    /**
     * Whether the Start Interview action should be enabled. True only
     * for a shortlisted candidate whose job is open, whose questions
     * are approved, and who has not already finished their attempt.
     */
    private boolean interviewAvailable;

    /**
     * True when an attempt is already under way, so the action reads
     * "Resume interview" rather than "Start interview".
     */
    private boolean interviewResumable;

    /**
     * Why the interview cannot be started yet, in words meant for the
     * candidate - "Your application is under review", "The interview
     * is not ready yet". Null when it can be started.
     *
     * <p>Says nothing about internal state: not which check failed,
     * not whether the recruiter has looked at the application, not
     * whether questions exist in draft.
     */
    private String interviewMessage;
}
