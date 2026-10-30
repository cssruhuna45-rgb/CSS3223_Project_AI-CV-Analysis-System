package com.aiinterview.dto;

import com.aiinterview.entity.JobApplication;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * How one CV compared with a job's required skills, as computed once at
 * application time.
 *
 * <p>Read from the stored application, never recomputed: opening an
 * applicant list spends no AI quota and cannot produce a different
 * number than the one the recruiter saw yesterday.
 *
 * <p>{@link #relatedSkills} is kept apart from {@link #matchedSkills}
 * on purpose. A candidate with Terraform has useful background for a
 * job asking for Infrastructure as Code, but it is not the same claim,
 * and the percentage does not count it.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillMatchDto {

    /**
     * 0-100, or null when the match could not be computed. The UI shows
     * null as "not available": a zero would read as a weak candidate.
     */
    private Integer matchPercentage;

    /** How many required skills the percentage was taken over. */
    private Integer requiredSkillCount;

    private List<String> matchedSkills;

    /** Adjacent skills. Never counted in {@link #matchPercentage}. */
    private List<String> relatedSkills;

    private List<String> missingSkills;

    public static SkillMatchDto from(JobApplication application) {
        return SkillMatchDto.builder()
                .matchPercentage(application.getMatchPercentage())
                .requiredSkillCount(application.getRequiredSkillCount())
                .matchedSkills(List.copyOf(application.getMatchedSkills()))
                .relatedSkills(List.copyOf(application.getRelatedSkills()))
                .missingSkills(List.copyOf(application.getMissingSkills()))
                .build();
    }
}
