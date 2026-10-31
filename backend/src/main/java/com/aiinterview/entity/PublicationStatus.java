package com.aiinterview.entity;

/**
 * Whether a hiring decision has been announced to the candidate (V12).
 *
 * <p>The whole point of the two states is that a recruiter can think
 * about a decision, write it down, change their mind and come back to
 * it, without the candidate seeing any of that. Only
 * {@link #PUBLISHED} is ever visible outside the recruiter's own
 * account, and publishing is a separate, confirmed action - never a
 * side effect of choosing an option.
 *
 * <p>Persisted as its name, matching the CHECK constraint on
 * {@code hiring_decisions.publication_status} (V12).
 */
public enum PublicationStatus {

    /** Private to the owning recruiter. The candidate sees nothing. */
    DRAFT,

    /** Announced. The candidate can read it, and has been notified. */
    PUBLISHED;

    public boolean isPublished() {
        return this == PUBLISHED;
    }
}
