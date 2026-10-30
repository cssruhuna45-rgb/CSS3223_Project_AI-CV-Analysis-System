package com.aiinterview.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
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
import java.util.ArrayList;
import java.util.List;

/**
 * One candidate's application for one job (V11).
 *
 * <p>An invite code used to take a candidate straight into the
 * interview. Now it takes them here: they choose a CV, agree to share
 * it, and apply. The recruiter reads the application and shortlists or
 * rejects by hand, and only a shortlisted candidate can start the job's
 * approved interview.
 *
 * <p><strong>The CV is evidence.</strong> {@link #submittedResume} is
 * the CV as chosen at application time and
 * {@link #analysisSnapshot} is the analysis the recruiter was shown,
 * copied here verbatim. A candidate who later re-uploads or re-analyses
 * their CV does not change what a recruiter already reviewed, and a
 * recruiter's decision stays attached to the evidence it was made on.
 *
 * <p>{@link #matchPercentage} and the three skill lists are computed
 * once, deterministically, when the application is submitted - never
 * recomputed when a recruiter opens the list, and never used to decide
 * anything automatically.
 */
@Entity
@Table(
        name = "job_applications",
        uniqueConstraints = {
                // One application per candidate per job. Enforced here
                // as well as in the database so a replayed submit is a
                // clean 409 rather than a constraint violation.
                @UniqueConstraint(
                        name = "uk_job_applications_job_candidate",
                        columnNames = {"job_posting_id", "candidate_id"}
                )
        },
        indexes = {
                // The recruiter's applicant list: one job, best match first.
                @Index(
                        name = "idx_job_applications_job_match",
                        columnList = "job_posting_id, match_percentage"
                ),
                // The candidate's own list of applications.
                @Index(
                        name = "idx_job_applications_candidate",
                        columnList = "candidate_id, applied_at"
                )
        }
)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = {
        "jobPosting", "candidate", "submittedResume", "decidedBy",
        "analysisSnapshot", "matchedSkills", "relatedSkills", "missingSkills"
})
@EqualsAndHashCode(of = "id")
public class JobApplication {

    /**
     * Which consent wording the candidate agreed to. Stored so that a
     * later change to the wording does not misrepresent what an
     * existing applicant actually accepted.
     */
    public static final String CURRENT_CONSENT_VERSION = "v1";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_posting_id", nullable = false)
    private JobPosting jobPosting;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private User candidate;

    // ---- CV evidence ----------------------------------------------

    /**
     * The CV this application was made with.
     *
     * <p>Not nullable: an application without a CV is nothing for a
     * recruiter to review. The database refuses to delete a resume
     * while an application points at it (ON DELETE RESTRICT), so the
     * evidence cannot disappear from under a recruiter's decision.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submitted_resume_id", nullable = false)
    private Resume submittedResume;

    /**
     * The CV analysis as it stood when the candidate applied, stored as
     * the AI service's own JSON: summary, skills, experience,
     * education, certifications.
     *
     * <p>A copy rather than a join to {@code resume_analysis} because
     * re-analysing a CV replaces that row, which would silently rewrite
     * the evidence behind every application made with it. Null only
     * when the chosen CV had not been analysed yet.
     */
    @Column(name = "analysis_snapshot", columnDefinition = "TEXT")
    private String analysisSnapshot;

    // ---- Consent --------------------------------------------------

    /**
     * Always true on a stored row: the service refuses to create an
     * application without consent. Kept as a column so the record
     * itself carries the proof, next to its timestamp and version.
     */
    @Column(name = "consent_granted", nullable = false)
    @Builder.Default
    private boolean consentGranted = false;

    @Column(name = "consent_at")
    private LocalDateTime consentAt;

    @Column(name = "consent_version", length = 16)
    private String consentVersion;

    // ---- Deterministic skill match --------------------------------

    /**
     * Share of the job's required skills the CV demonstrates, 0-100.
     *
     * <p>Decision support only. Null when the match could not be
     * computed, which is shown as "not available" rather than as 0% -
     * a zero would read as a bad candidate.
     */
    @Column(name = "match_percentage")
    private Integer matchPercentage;

    /** How many required skills the percentage was taken over. */
    @Column(name = "required_skill_count")
    private Integer requiredSkillCount;

    /** Required skills the CV demonstrates outright. */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "job_application_matched_skills",
            joinColumns = @JoinColumn(name = "application_id")
    )
    @Column(name = "skill", nullable = false, length = 100)
    @Builder.Default
    private List<String> matchedSkills = new ArrayList<>();

    /**
     * Candidate skills that are adjacent to a missing requirement.
     * Reported separately and never counted as matches.
     */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "job_application_related_skills",
            joinColumns = @JoinColumn(name = "application_id")
    )
    @Column(name = "skill", nullable = false, length = 100)
    @Builder.Default
    private List<String> relatedSkills = new ArrayList<>();

    /** Required skills the CV does not demonstrate. */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "job_application_missing_skills",
            joinColumns = @JoinColumn(name = "application_id")
    )
    @Column(name = "skill", nullable = false, length = 100)
    @Builder.Default
    private List<String> missingSkills = new ArrayList<>();

    // ---- Status and decision --------------------------------------

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    @Builder.Default
    private ApplicationStatus status = ApplicationStatus.APPLIED;

    @Column(name = "applied_at", nullable = false, updatable = false)
    private LocalDateTime appliedAt;

    /** When the recruiter shortlisted or rejected. */
    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    /**
     * Who decided. Kept when that account is deleted - the decision
     * still happened - so this is set null rather than cascaded.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "decided_by")
    private User decidedBy;

    @Column(name = "interview_completed_at")
    private LocalDateTime interviewCompletedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ========================================================
    // Behaviour
    // ========================================================

    /**
     * Whether this application, on its own, permits the job's
     * interview. The job being open and its questions approved are
     * separate checks the eligibility service makes alongside this one.
     */
    public boolean allowsInterview() {
        return status == ApplicationStatus.SHORTLISTED;
    }
}
