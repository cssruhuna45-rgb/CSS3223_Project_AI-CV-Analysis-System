package com.aiinterview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoadmapGenerateRequestDto {

    @JsonProperty("session_id")
    private String sessionId;

    @JsonProperty("target_role")
    private String targetRole;

    @JsonProperty("job_field")
    private String jobField;

    @JsonProperty("candidate_resume")
    private String candidateResume;

    @Builder.Default
    private List<String> weaknesses = new ArrayList<>();

    @Builder.Default
    private List<String> strengths = new ArrayList<>();

    @JsonProperty("missing_skills")
    @Builder.Default
    private List<String> missingSkills = new ArrayList<>();

    @JsonProperty("per_question_feedback")
    @Builder.Default
    private List<Map<String, Object>> perQuestionFeedback = new ArrayList<>();

    @JsonProperty("overall_score")
    private Integer overallScore;

    @JsonProperty("duration_days")
    @Builder.Default
    private Integer durationDays = 14;
}
