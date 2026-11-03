package com.aiinterview.service;

import com.aiinterview.dto.JobPostingDto;

/**
 * A recruiter listing their own jobs under Public Jobs, and archiving
 * them (V13).
 *
 * <p>Every method looks the job up together with the recruiter from the
 * token, so another recruiter's job id is "not found" rather than
 * something that can be published or archived. None of these touch
 * Open/Closed, which stays with {@link JobPostingService#setOpen}.
 */
public interface JobPublicationService {

    /** List the job under Public Jobs. Refused while it is archived. */
    JobPostingDto publish(String recruiterEmail, Long jobId);

    /** Take the job off Public Jobs. Its invite code keeps working. */
    JobPostingDto unpublish(String recruiterEmail, Long jobId);

    /**
     * Retire the job: never listed, invite code stops working, no
     * interview can start or resume. Nothing is deleted.
     */
    JobPostingDto archive(String recruiterEmail, Long jobId);

    /** Bring an archived job back exactly as it was. */
    JobPostingDto unarchive(String recruiterEmail, Long jobId);
}
