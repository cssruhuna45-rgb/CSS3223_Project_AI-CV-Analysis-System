package com.aiinterview.dto;

import com.aiinterview.entity.JobPosting;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

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
                .interviewCount(interviews)
                .completedCount(completed)
                .build();
    }
}
