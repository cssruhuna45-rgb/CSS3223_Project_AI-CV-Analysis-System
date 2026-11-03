package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * One published job, opened from Public Jobs to apply for (V13).
 *
 * <p>Field names match {@link JobInviteDto}, so the same application
 * page reads either. What it leaves out is the invite code: the
 * candidate is shown their job's code on their applications page once
 * they have applied, which is where the interview is started from.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicJobDetailDto {

    /** Needed to apply: the application is posted against the job id. */
    private Long jobId;

    private String title;
    private String company;
    private String jobField;
    private String jobDescription;
    private List<String> requiredSkills;
    private LocalDateTime publishedAt;
    private boolean open;

    /**
     * The recruiter's name only, so the consent wording can say who the
     * CV goes to. Never their email.
     */
    private String recruiterName;

    /** False while the recruiter has not approved the job's questions. */
    private boolean interviewReady;

    private int questionCount;

    // ---- This candidate's own application, if any -----------------

    private Long applicationId;

    /** APPLIED, SHORTLISTED, REJECTED, INTERVIEWED, or null. */
    private String applicationStatus;

    private String applicationStatusLabel;

    private boolean interviewAvailable;

    private String interviewMessage;
}
