package com.aiinterview.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * What a candidate submits to apply for a job.
 *
 * <p>Deliberately only two fields. The candidate's identity is taken
 * from the authenticated token, never from here, and the job comes from
 * the path - so a request cannot apply on somebody else's behalf, and
 * the CV is checked against the signed-in candidate's own CVs before
 * anything is stored.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JobApplicationRequestDto {

    /**
     * One of the candidate's own uploaded CVs. Ownership is verified
     * server side; an id belonging to another account is "not found".
     */
    @NotNull(message = "Choose the CV to apply with")
    private Long resumeId;

    /**
     * The candidate's agreement to share the chosen CV with this
     * recruiter.
     *
     * <p>Must be true: pressing Apply is not consent, and the box is
     * unchecked until the candidate ticks it. Rejected here as well as
     * in the service so a request that omits it never reaches the
     * database, where a CHECK constraint refuses it too.
     */
    @AssertTrue(message = "Agree to share your CV with this recruiter before applying")
    private boolean consentGranted;
}
