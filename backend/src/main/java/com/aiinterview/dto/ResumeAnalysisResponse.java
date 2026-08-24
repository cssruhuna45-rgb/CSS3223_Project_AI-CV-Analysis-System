package com.aiinterview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeAnalysisResponse {

    @JsonProperty("resume_id")
    private Long resumeId;

    private Integer score;

    private String summary;

    private List<String> skills;

    private List<ExperienceItem> experience;

    private List<EducationItem> education;

    private List<String> strengths;

    private List<String> weaknesses;

    @JsonProperty("missing_skills")
    private List<String> missingSkills;

    private List<String> recommendations;

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
}