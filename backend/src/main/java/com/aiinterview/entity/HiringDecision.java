package com.aiinterview.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * The recruiter's final answer on one candidate, and whether it has
 * been announced to them (V12).
 *
 * <p>One row per application, created when the recruiter first saves a
 * draft. It is kept apart from {@link JobApplication#getStatus()} on
 * purpose: the application stays INTERVIEWED, because that is how far
 * the candidate got, while the hiring outcome is tracked here. Mixing
 * the two would lose the distinction between "has not been decided"
 * and "has not been interviewed".
 *
 * <p>Two fields carry text and they are not interchangeable.
 * {@link #internalNotes} is the recruiter's own reasoning and never
 * leaves their account. {@link #candidateFeedback} is written to be
 * read by the candidate and is only shown once the decision is
 * published.
 *
 * <p>Publishing is explicit. Choosing SELECTED does not announce it;
 * the recruiter publishes separately, and a published decision is
 * final - changing it means an authorised, audited correction, not a
 * quiet overwrite. {@link HiringDecisionEvent} records every step.
 */
@Entity
@Table(name = "hiring_decisions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {"jobApplication", "decidedBy", "internalNotes", "candidateFeedback"})
@EqualsAndHashCode(of = "id")
public class HiringDecision {

    /** Longest message a recruiter may write to a candidate. */
    public static final int MAX_FEEDBACK_LENGTH = 2000;

    /** Longest private note a recruiter may keep. */
    public static final int MAX_NOTES_LENGTH = 2000;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * The application this decides. One decision per application: a
     * unique constraint enforces it, so a double-clicked save cannot
     * leave a candidate with two conflicting outcomes.
     */
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false, unique = true)
    private JobApplication jobApplication;

    @Enumerated(EnumType.STRING)
    @Column(name = "decision", nullable = false, length = 16)
    @Builder.Default
    private HiringDecisionValue decision = HiringDecisionValue.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "publication_status", nullable = false, length = 16)
    @Builder.Default
    private PublicationStatus publicationStatus = PublicationStatus.DRAFT;

    /**
     * The recruiter's private reasoning. Never returned by any
     * candidate-facing endpoint, and not included in the DTO the
     * candidate receives at all - so it cannot be leaked by a field
     * being left in by accident.
     */
    @Column(name = "internal_notes", columnDefinition = "TEXT")
    private String internalNotes;

    /**
     * What the candidate reads. Visible only once published.
     */
    @Column(name = "candidate_feedback", columnDefinition = "TEXT")
    private String candidateFeedback;

    /**
     * The recruiter who last saved this. Kept when that account is
     * deleted - the decision still happened - so it is set null rather
     * than cascaded.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by")
    private User decidedBy;

    /** When the current decision value was last chosen. */
    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    /**
     * When it was announced. Null while a draft, and the single thing
     * that makes the decision visible to the candidate.
     */
    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ========================================================
    // Behaviour
    // ========================================================

    public boolean isPublished() {
        return publicationStatus.isPublished();
    }

    /**
     * Whether this decision is in a state that can be announced: an
     * actual answer, not yet published.
     */
    public boolean isReadyToPublish() {
        return !isPublished() && decision.isPublishable();
    }
}
