package com.aiinterview.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeAnalysisRequest {

    @JsonProperty("resume_id")
    private Long resumeId;

    /**
     * Must serialize as "resume_text": that is the field name the
     * FastAPI ResumeAnalysisRequest schema requires.
     */
    @JsonProperty("resume_text")
    private String text;
}