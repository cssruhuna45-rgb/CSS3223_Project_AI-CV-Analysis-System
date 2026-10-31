package com.aiinterview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * One applicant as the recruiter reviews them before deciding.
 *
 * <p>The summary row plus the CV analysis snapshot and the job's
 * requirements side by side, which is what the decision is actually
 * made on. Only ever returned for an application on a job the
 * requesting recruiter owns.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicantDetailDto {

    private ApplicantSummaryDto summary;

    private Long jobId;
    private String jobTitle;

    /**
     * What the job asks for, in the recruiter's own order, so the
     * comparison can be read requirement by requirement.
     */
    private List<String> requiredSkills;

    /**
     * The CV analysis as it stood when the candidate applied - not as
     * it is now. A candidate who has since re-analysed their CV does
     * not change what this decision was made on.
     */
    private CvSnapshotDto cvSnapshot;

    /**
     * Whether the decision controls should be live. False once the
     * application has been decided or interviewed: a decision is made
     * once and not quietly reversed.
     */
    private boolean decisionOpen;

    /**
     * The consent the candidate gave, so the recruiter can see the CV
     * was shared deliberately. Wording version, not the wording.
     */
    private String consentVersion;
}
