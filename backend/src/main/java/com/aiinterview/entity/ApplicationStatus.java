package com.aiinterview.entity;

import java.util.Set;

/**
 * Where a candidate's application for a job has got to (V11).
 *
 * <p>Only a recruiter moves an application off {@link #APPLIED}, and
 * only by hand: a skill-match percentage is decision support and never
 * shortlists or rejects anyone on its own. {@link #INTERVIEWED} is the
 * one status the system sets itself, when the candidate's interview for
 * the job actually finishes.
 *
 * <p>Persisted as its name, matching the CHECK constraint on
 * {@code job_applications.status} (V11).
 */
public enum ApplicationStatus {

    /** Submitted, waiting for the recruiter to look at it. */
    APPLIED("Under review"),

    /** The recruiter picked this candidate; the interview opens up. */
    SHORTLISTED("Shortlisted"),

    /** The recruiter passed on this candidate. Final. */
    REJECTED("Not selected"),

    /** The shortlisted candidate finished the job's interview. Final. */
    INTERVIEWED("Interview completed");

    /**
     * What the candidate and recruiter read on screen. Kept here rather
     * than in the frontend so both sides say the same thing, and so
     * "REJECTED" is never shown to a candidate as-is.
     */
    private final String label;

    ApplicationStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }

    /**
     * The statuses a recruiter may move an application to, and the only
     * ones {@code PATCH .../decision} accepts.
     */
    public static final Set<ApplicationStatus> RECRUITER_DECISIONS =
            Set.of(SHORTLISTED, REJECTED);

    /**
     * Whether this status may become {@code next}.
     *
     * <p>Decisions are made once: a shortlisted or rejected candidate is
     * not quietly moved back to review, and an application whose
     * interview is done is finished with. Re-applying the status an
     * application already has is not a transition and is handled by the
     * caller as a no-op, so it is refused here.
     */
    public boolean canTransitionTo(ApplicationStatus next) {

        if (next == null || next == this) {
            return false;
        }

        return switch (this) {
            case APPLIED -> next == SHORTLISTED || next == REJECTED;
            case SHORTLISTED -> next == INTERVIEWED;
            case REJECTED, INTERVIEWED -> false;
        };
    }

    /** A decision the recruiter has already made and cannot take back. */
    public boolean isDecided() {
        return this != APPLIED;
    }
}
