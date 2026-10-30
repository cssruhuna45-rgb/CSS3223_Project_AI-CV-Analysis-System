package com.aiinterview.repository;

import com.aiinterview.entity.ApplicationStatus;
import com.aiinterview.entity.JobApplication;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface JobApplicationRepository
        extends JpaRepository<JobApplication, Long> {

    /**
     * This candidate's application for this job, the lookup behind
     * every eligibility check.
     */
    Optional<JobApplication> findByJobPostingIdAndCandidateId(
            Long jobPostingId,
            Long candidateId
    );

    /**
     * Whether the candidate has already applied. Checked before the
     * insert so a duplicate submit is a clear 409 rather than a
     * constraint violation; the unique constraint is still what makes
     * it safe under a race.
     */
    boolean existsByJobPostingIdAndCandidateId(Long jobPostingId, Long candidateId);

    /**
     * The candidate's own applications, newest first, with the job and
     * its recruiter already loaded - the status page shows the job
     * title and company on every row.
     */
    @Query("SELECT a FROM JobApplication a "
            + "JOIN FETCH a.jobPosting j "
            + "JOIN FETCH j.recruiter "
            + "WHERE a.candidate.id = :candidateId "
            + "ORDER BY a.appliedAt DESC")
    List<JobApplication> findForCandidate(@Param("candidateId") Long candidateId);

    /**
     * The applicants for one of a recruiter's own jobs, best match
     * first.
     *
     * <p>Scoped by recruiter as well as job, so another recruiter's job
     * id returns nothing rather than their candidates. Null matches sort
     * last: an application whose match could not be computed is not a
     * 0% candidate.
     *
     * <p>Candidate and resume are fetched here because the list shows a
     * name and a file name for every row.
     */
    @Query("SELECT a FROM JobApplication a "
            + "JOIN FETCH a.candidate "
            + "JOIN FETCH a.submittedResume "
            + "WHERE a.jobPosting.id = :jobId "
            + "AND a.jobPosting.recruiter.id = :recruiterId "
            + "ORDER BY CASE WHEN a.matchPercentage IS NULL THEN 1 ELSE 0 END, "
            + "a.matchPercentage DESC, a.appliedAt ASC")
    List<JobApplication> findForRecruiterJob(
            @Param("jobId") Long jobId,
            @Param("recruiterId") Long recruiterId
    );

    /**
     * One application, only if it belongs to a job this recruiter owns.
     *
     * <p>The ownership test is part of the query rather than a check
     * after loading: an application id belonging to someone else is
     * then simply "not found", which is also what the caller reports.
     */
    @Query("SELECT a FROM JobApplication a "
            + "JOIN FETCH a.candidate "
            + "JOIN FETCH a.jobPosting j "
            + "JOIN FETCH a.submittedResume "
            + "WHERE a.id = :applicationId "
            + "AND j.recruiter.id = :recruiterId")
    Optional<JobApplication> findByIdForRecruiter(
            @Param("applicationId") Long applicationId,
            @Param("recruiterId") Long recruiterId
    );

    /**
     * Applications for one of a recruiter's jobs that have reached a
     * given status - the comparison page asks for INTERVIEWED.
     */
    @Query("SELECT a FROM JobApplication a "
            + "JOIN FETCH a.candidate "
            + "WHERE a.jobPosting.id = :jobId "
            + "AND a.jobPosting.recruiter.id = :recruiterId "
            + "AND a.status = :status "
            + "ORDER BY a.appliedAt ASC")
    List<JobApplication> findForRecruiterJobWithStatus(
            @Param("jobId") Long jobId,
            @Param("recruiterId") Long recruiterId,
            @Param("status") ApplicationStatus status
    );

    /**
     * Per job of one recruiter: [job id, applications, still under
     * review, shortlisted]. Lets the jobs list show where each job's
     * review has got to without a query per job.
     */
    @Query("SELECT a.jobPosting.id, COUNT(a), "
            + "SUM(CASE WHEN a.status = 'APPLIED' THEN 1 ELSE 0 END), "
            + "SUM(CASE WHEN a.status = 'SHORTLISTED' THEN 1 ELSE 0 END) "
            + "FROM JobApplication a "
            + "WHERE a.jobPosting.recruiter.id = :recruiterId "
            + "GROUP BY a.jobPosting.id")
    List<Object[]> countByJobForRecruiter(@Param("recruiterId") Long recruiterId);
}
