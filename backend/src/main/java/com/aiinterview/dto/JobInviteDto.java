package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * What a candidate sees before joining a job interview: the job, and
 * who will see the result. Nothing about other candidates.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobInviteDto {

    private String inviteCode;
    private String title;
    private String company;
    private String jobField;
    private String jobDescription;

    /** The recruiter's name, so the candidate knows who sees the result. */
    private String recruiterName;

    /** True when this candidate has already finished this interview. */
    private boolean alreadyCompleted;
}
