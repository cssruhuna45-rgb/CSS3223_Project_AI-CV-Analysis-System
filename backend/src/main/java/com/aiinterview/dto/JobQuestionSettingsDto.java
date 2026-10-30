package com.aiinterview.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * A job's required skills and question count, changed before its
 * questions are approved. How a job created before V10 is made ready.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobQuestionSettingsDto {

    @NotEmpty(message = "List at least one required skill")
    @Size(max = 30, message = "List at most 30 required skills")
    private List<@Size(max = 100, message = "Keep each skill under 100 characters") String> requiredSkills;

    @Min(value = 5, message = "Ask at least 5 questions")
    @Max(value = 10, message = "Ask at most 10 questions")
    private int questionCount;
}
