package com.aiinterview.repository;

import com.aiinterview.entity.JobPosting;
import com.aiinterview.entity.JobPublicationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JobPostingRepository extends JpaRepository<JobPosting, Long> {

    Optional<JobPosting> findByInviteCode(String inviteCode);

    boolean existsByInviteCode(String inviteCode);

    /** Newest first. Scoped to one recruiter: nobody lists another's jobs. */
    List<JobPosting> findByRecruiterIdOrderByCreatedAtDesc(Long recruiterId);

    Optional<JobPosting> findByIdAndRecruiterId(Long id, Long recruiterId);

    // ---- Public Jobs (V13) -----------------------------------------

    /** Every listed job, most recently published first. */
    List<JobPosting> findByPublicationStatusAndArchivedFalseOrderByPublishedAtDesc(
            JobPublicationStatus publicationStatus
    );

    /** One job, only if it is listed: anything else is "not found". */
    Optional<JobPosting> findByIdAndPublicationStatusAndArchivedFalse(
            Long id,
            JobPublicationStatus publicationStatus
    );
}
