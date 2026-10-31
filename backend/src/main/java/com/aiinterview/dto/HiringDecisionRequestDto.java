package com.aiinterview.dto;

import com.aiinterview.entity.HiringDecision;
import com.aiinterview.entity.HiringDecisionValue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * What a recruiter saves as a hiring decision draft.
 *
 * <p>Saving is never publishing. This endpoint only writes a draft;
 * announcing it to the candidate is a separate, confirmed call, so
 * choosing SELECTED here tells nobody anything yet.
 *
 * <p>The application and the recruiter both come from elsewhere - the
 * path and the authenticated token - so neither can be set from here.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HiringDecisionRequestDto {

    /**
     * SELECTED, NOT_SELECTED, or PENDING to park the draft while still
     * deciding. Only the first two can go on to be published.
     */
    @NotNull(message = "Choose whether this candidate is selected")
    private HiringDecisionValue decision;

    /**
     * What the candidate will read once this is published. Optional:
     * a decision with no message still publishes, and the UI offers a
     * sensible default the recruiter can edit.
     */
    @Size(
            max = HiringDecision.MAX_FEEDBACK_LENGTH,
            message = "Keep candidate feedback under 2000 characters"
    )
    private String candidateFeedback;

    /**
     * The recruiter's own reasoning. Never shown to the candidate -
     * the candidate-facing DTO has no field for it at all.
     */
    @Size(
            max = HiringDecision.MAX_NOTES_LENGTH,
            message = "Keep internal notes under 2000 characters"
    )
    private String internalNotes;
}
