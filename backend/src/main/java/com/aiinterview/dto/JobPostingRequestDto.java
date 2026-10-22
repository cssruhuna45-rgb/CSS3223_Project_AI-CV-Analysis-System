package com.aiinterview.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * What a recruiter fills in to create a job.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobPostingRequestDto {

    @NotBlank(message = "Give the job a title")
    @Size(max = 150, message = "Keep the title under 150 characters")
    private String title;

    @Size(max = 150, message = "Keep the company name under 150 characters")
    private String company;

    /** One of JobPosting.JOB_FIELDS; checked in the service. */
    @NotBlank(message = "Choose a job field")
    private String jobField;

    /**
     * Every candidate is interviewed against this text. The AI service
     * refuses a job description under 20 characters, so that is the
     * floor here too, and 8000 is where it starts truncating.
     */
    @NotBlank(message = "Describe the job")
    @Size(min = 20, max = 8000, message = "The job description must be between 20 and 8000 characters")
    private String jobDescription;
}
