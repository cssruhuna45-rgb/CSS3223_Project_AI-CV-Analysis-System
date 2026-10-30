package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * A job's interview as its recruiter edits it: the settings, the
 * questions in order, and what still stops approval.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobAssessmentDto {

    private Long jobId;
    private String title;

    private List<String> requiredSkills;
    private int questionCount;

    private boolean approved;
    private LocalDateTime approvedAt;
    private String approvedBy;

    private List<JobQuestionDto> questions;

    /**
     * Why the set cannot be approved yet, worded for the recruiter.
     * Empty when it can (or already is).
     */
    private List<String> issues;
}
