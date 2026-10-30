package com.aiinterview.dto;

import com.aiinterview.entity.JobPosting;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * One of the recruiter's own jobs, with how many candidates have used
 * its invite code.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobPostingDto {

    private Long id;
    private String title;
    private String company;
    private String jobField;
    private String jobDescription;
    private String inviteCode;
    private boolean open;
    private LocalDateTime createdAt;

    private List<String> requiredSkills;
    private int questionCount;

    /**
     * False until the recruiter approves the question set. A job that
     * is not ready cannot be interviewed for.
     */
    private boolean questionsApproved;
    private LocalDateTime questionsApprovedAt;

    private long interviewCount;
    private long completedCount;

    public static JobPostingDto from(JobPosting job, long interviews, long completed) {
        return JobPostingDto.builder()
                .id(job.getId())
                .title(job.getTitle())
                .company(job.getCompany())
                .jobField(job.getJobField())
                .jobDescription(job.getJobDescription())
                .inviteCode(job.getInviteCode())
                .open(job.isOpen())
                .createdAt(job.getCreatedAt())
                .requiredSkills(List.copyOf(job.getRequiredSkills()))
                .questionCount(job.getQuestionCount())
                .questionsApproved(job.isQuestionsApproved())
                .questionsApprovedAt(job.getQuestionsApprovedAt())
                .interviewCount(interviews)
                .completedCount(completed)
                .build();
    }
}
