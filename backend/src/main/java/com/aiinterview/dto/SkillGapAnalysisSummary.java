package com.aiinterview.dto;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * One stored skill gap analysis, as the CV Analysis page lists it.
 *
 * <p>{@code result} is the AI service's own reply, handed back
 * unchanged as JSON rather than as an escaped string, so the page
 * renders a stored analysis through exactly the same code as a fresh
 * one. The fields beside it are the ones the list itself draws, and
 * save the page parsing every snapshot to show a row.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillGapAnalysisSummary {

    private Long id;

    private Long resumeId;

    private String jobField;

    private String jobFieldName;

    private Integer matchPercentage;

    private Integer gapPercentage;

    private String summary;

    private LocalDateTime analysedAt;

    /** The whole stored response, in the shape the browser expects. */
    private JsonNode result;
}
