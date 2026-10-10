package com.aiinterview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoadmapResponseDto {

    private Long id;

    @JsonProperty("session_id")
    private String sessionId;

    @JsonProperty("target_role")
    private String targetRole;

    @JsonProperty("job_field")
    private String jobField;

    private String title;

    private String summary;

    @JsonProperty("duration_days")
    private Integer durationDays;

    @JsonProperty("overall_score")
    private Integer overallScore;

    @JsonProperty("completed_days")
    @Builder.Default
    private List<Integer> completedDays = new ArrayList<>();

    /**
     * Parsed roadmap JSON containing milestones, days, tasks, and resources.
     */
    private JsonNode roadmap;

    @JsonProperty("created_at")
    private LocalDateTime createdAt;

    @JsonProperty("updated_at")
    private LocalDateTime updatedAt;
}
