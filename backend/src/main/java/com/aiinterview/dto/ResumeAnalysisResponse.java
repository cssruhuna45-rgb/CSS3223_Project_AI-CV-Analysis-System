package com.aiinterview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Mirrors the AI service's ResumeAnalysisResponse schema.
 *
 * <p>Field names must stay in step with
 * {@code ai-service/app/resume/schemas.py}. They drifted apart once
 * already: this DTO asked for score, strengths, weaknesses,
 * missing_skills and recommendations, none of which the service sends,
 * so every field deserialized to null.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeAnalysisResponse {

    @JsonProperty("resume_id")
    private Long resumeId;

    private String summary;

    private List<String> skills;

    private List<ExperienceItem> experience;

    private List<EducationItem> education;

    private List<ProjectItem> projects;

    private List<String> certifications;

    @JsonProperty("recommended_job_fields")
    private List<RecommendedJobField> recommendedJobFields;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExperienceItem {

        private String company;
        private String role;
        private String duration;
        private String description;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EducationItem {

        private String institution;
        private String degree;
        private String field;
        private String year;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProjectItem {

        private String name;
        private String description;
        private List<String> technologies;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendedJobField {

        private String field;
        private String name;

        @JsonProperty("match_percentage")
        private Integer matchPercentage;
    }
}
