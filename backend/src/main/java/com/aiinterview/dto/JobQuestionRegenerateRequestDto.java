package com.aiinterview.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * What the recruiter set on one question before asking for a new one.
 * Both optional: without them the replacement is free to pick its own
 * difficulty and skill, as before.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobQuestionRegenerateRequestDto {

    @Pattern(regexp = "(?i)easy|medium|hard", message = "Difficulty must be easy, medium or hard")
    private String difficulty;

    @Size(max = 120, message = "Keep the topic under 120 characters")
    private String topic;
}
