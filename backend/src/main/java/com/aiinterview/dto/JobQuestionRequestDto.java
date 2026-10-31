package com.aiinterview.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * One question as the editor saves it.
 *
 * <p>Only upper limits are enforced on save, so a recruiter can keep a
 * half-written draft. The lower limits (length, key point count,
 * difficulty mix) are checked at approval.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobQuestionRequestDto {

    /** Null for a question the recruiter added; else the stored id. */
    private Long id;

    @NotBlank(message = "A question cannot be empty")
    @Size(max = 600, message = "Keep each question under 600 characters")
    private String question;

    /** easy, medium or hard; checked in the service. */
    @NotBlank(message = "Choose a difficulty for every question")
    private String difficulty;

    @Size(max = 120, message = "Keep the topic under 120 characters")
    private String topic;

    @Size(max = 6, message = "A question can have at most 6 key points")
    private List<@NotBlank(message = "A key point cannot be empty")
            @Size(max = 300, message = "Keep each key point under 300 characters") String> keyPoints;
}
