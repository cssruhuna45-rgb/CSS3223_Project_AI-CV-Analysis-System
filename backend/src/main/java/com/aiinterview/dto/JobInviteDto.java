package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * What a candidate sees behind an invite code: the job, who will see
 * the result, and where their own application for it has got to.
 * Nothing about other candidates.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobInviteDto {

    /** Needed to apply: the application is posted against the job id. */
    private Long jobId;

    private String inviteCode;
    private String title;
    private String company;
    private String jobField;
    private String jobDescription;

    /**
     * What the job asks for, in the recruiter's order. Shown on the
     * application page so the candidate knows what they are applying
     * against before choosing which CV to send.
     */
    private List<String> requiredSkills;

    /** The recruiter's name, so the candidate knows who sees the result. */
    private String recruiterName;

    /** True when this candidate has already finished this interview. */
    private boolean alreadyCompleted;

    // ---- This candidate's application (V11) -----------------------

    /**
     * This candidate's application for the job, or null when they have
     * not applied yet - which is what sends the page to the application
     * form rather than the interview.
     */
    private Long applicationId;

    /** APPLIED, SHORTLISTED, REJECTED, INTERVIEWED, or null. */
    private String applicationStatus;

    /** The wording to show for {@link #applicationStatus}, or null. */
    private String applicationStatusLabel;

    /**
     * Whether the interview can be started now. Always false before
     * the recruiter shortlists. A convenience for the page; the server
     * re-checks every condition when the interview is actually started.
     */
    private boolean interviewAvailable;

    /** Why the interview is not available yet, or null when it is. */
    private String interviewMessage;

    /**
     * False while the recruiter has not approved the job's questions:
     * the interview cannot be started yet.
     */
    private boolean interviewReady;

    /** How many questions the interview has. */
    private int questionCount;
}
