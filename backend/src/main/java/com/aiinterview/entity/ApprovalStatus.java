package com.aiinterview.entity;

/**
 * Whether an administrator has accepted the account.
 *
 * <p>Only recruiter accounts are ever reviewed. Candidates and
 * administrators are created APPROVED, and a recruiter starts PENDING:
 * picking "recruiter" on a public sign-up form proves nothing, and the
 * recruiter dashboard shows other people's results.
 *
 * <p>Persisted as its name, matching the CHECK constraint on
 * {@code users.approval_status} (V6).
 */
public enum ApprovalStatus {

    PENDING,

    APPROVED,

    REJECTED;

    /**
     * The lowercase form the frontend compares against.
     */
    public String toWireValue() {
        return name().toLowerCase();
    }
}
