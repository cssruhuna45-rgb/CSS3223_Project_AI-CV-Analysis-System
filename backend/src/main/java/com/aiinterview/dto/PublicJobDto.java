package com.aiinterview.dto;

import com.aiinterview.entity.JobPosting;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * One job in the candidates' Public Jobs list (V13).
 *
 * <p>Only what a job advert would say. No invite code - a private
 * job's code must not leak through a job that was once published - and
 * nothing about the recruiter, other candidates or the interview
 * questions.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicJobDto {

    private Long id;
    private String title;
    private String company;
    private String jobField;
    private String jobDescription;
    private List<String> requiredSkills;
    private LocalDateTime publishedAt;

    /** False: still listed, marked closed, and takes no applications. */
    private boolean open;

    public static PublicJobDto from(JobPosting job) {
        return PublicJobDto.builder()
                .id(job.getId())
                .title(job.getTitle())
                .company(job.getCompany())
                .jobField(job.getJobField())
                .jobDescription(job.getJobDescription())
                .requiredSkills(List.copyOf(job.getRequiredSkills()))
                .publishedAt(job.getPublishedAt())
                .open(job.isOpen())
                .build();
    }
}
