package com.aiinterview.dto;

import com.aiinterview.entity.ApplicationStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A recruiter's manual decision on one application.
 *
 * <p>Only SHORTLISTED and REJECTED are accepted; INTERVIEWED is set by
 * the system when an interview finishes, and nothing may put an
 * application back to APPLIED. The service checks the value against
 * {@link ApplicationStatus#RECRUITER_DECISIONS} rather than trusting
 * that deserialisation alone narrowed it.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationDecisionRequestDto {

    @NotNull(message = "Choose to shortlist or reject this applicant")
    private ApplicationStatus decision;
}
