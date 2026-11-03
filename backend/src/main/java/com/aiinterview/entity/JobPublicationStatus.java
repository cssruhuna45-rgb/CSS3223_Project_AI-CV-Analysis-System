package com.aiinterview.entity;

/**
 * Whether a job is listed under Public Jobs (V13).
 *
 * <p>Separate from {@link PublicationStatus}, which is about announcing
 * hiring decisions. Separate from {@link JobPosting#isOpen()} too: this
 * only decides whether candidates can find the job, not whether it
 * takes them.
 *
 * <p>Persisted as its name, matching the CHECK constraint on
 * {@code job_postings.publication_status} (V13).
 */
public enum JobPublicationStatus {

    /** Reachable only through its invite code. Every new job starts here. */
    DRAFT,

    /** Listed under Public Jobs, unless the job is archived. */
    PUBLISHED
}
