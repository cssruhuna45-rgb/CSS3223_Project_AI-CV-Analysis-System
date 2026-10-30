package com.aiinterview.dto;

import com.aiinterview.entity.HiringDecision;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * A hiring decision as the owning recruiter sees it.
 *
 * <p>The recruiter's view, and only theirs: it carries
 * {@link #internalNotes}, which no candidate-facing response ever
 * includes. Returned exclusively from endpoints scoped to the
 * recruiter who owns the job.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HiringDecisionDto {

    private Long applicationId;

    /** PENDING, SELECTED or NOT_SELECTED. */
    private String decision;

    /** The wording to show, from the server. */
    private String decisionLabel;

    /** DRAFT or PUBLISHED. */
    private String publicationStatus;

    private boolean published;

    /**
     * Whether Publish should be offered: an actual answer that has not
     * been announced yet.
     */
    private boolean readyToPublish;

    /** Shown to the candidate once published. */
    private String candidateFeedback;

    /** The recruiter's own notes. Recruiter-facing responses only. */
    private String internalNotes;

    private String decidedByName;
    private LocalDateTime decidedAt;
    private LocalDateTime publishedAt;

    public static HiringDecisionDto from(HiringDecision decision) {

        if (decision == null) {
            return null;
        }

        return HiringDecisionDto.builder()
                .applicationId(decision.getJobApplication().getId())
                .decision(decision.getDecision().name())
                .decisionLabel(decision.getDecision().getLabel())
                .publicationStatus(decision.getPublicationStatus().name())
                .published(decision.isPublished())
                .readyToPublish(decision.isReadyToPublish())
                .candidateFeedback(decision.getCandidateFeedback())
                .internalNotes(decision.getInternalNotes())
                .decidedByName(
                        decision.getDecidedBy() == null
                                ? null
                                : decision.getDecidedBy().getName()
                )
                .decidedAt(decision.getDecidedAt())
                .publishedAt(decision.getPublishedAt())
                .build();
    }

    /**
     * The state of an application nobody has decided on yet: no row
     * exists, so there is nothing published and nothing to publish.
     */
    public static HiringDecisionDto undecided(Long applicationId) {
        return HiringDecisionDto.builder()
                .applicationId(applicationId)
                .decision(com.aiinterview.entity.HiringDecisionValue.PENDING.name())
                .decisionLabel(com.aiinterview.entity.HiringDecisionValue.PENDING.getLabel())
                .publicationStatus(com.aiinterview.entity.PublicationStatus.DRAFT.name())
                .published(false)
                .readyToPublish(false)
                .build();
    }
}
