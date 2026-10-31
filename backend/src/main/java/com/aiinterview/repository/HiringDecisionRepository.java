package com.aiinterview.repository;

import com.aiinterview.entity.HiringDecision;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface HiringDecisionRepository
        extends JpaRepository<HiringDecision, Long> {

    /**
     * The decision for one application, whatever state it is in.
     * At most one row can match; a unique constraint enforces it.
     */
    Optional<HiringDecision> findByJobApplicationId(Long applicationId);

    /**
     * The decision for one application, but only if the application is
     * on a job this recruiter owns.
     *
     * <p>Ownership is part of the query rather than a check after
     * loading, so another recruiter's application id is "not found"
     * rather than something whose decision can be read or changed.
     */
    @Query("SELECT d FROM HiringDecision d "
            + "JOIN FETCH d.jobApplication a "
            + "JOIN FETCH a.jobPosting j "
            + "WHERE a.id = :applicationId "
            + "AND j.recruiter.id = :recruiterId")
    Optional<HiringDecision> findForRecruiter(
            @Param("applicationId") Long applicationId,
            @Param("recruiterId") Long recruiterId
    );

    /**
     * The decisions for a set of applications, for the recruiter's
     * comparison page - one query rather than one per candidate.
     */
    @Query("SELECT d FROM HiringDecision d "
            + "WHERE d.jobApplication.id IN :applicationIds")
    List<HiringDecision> findByApplicationIds(
            @Param("applicationIds") List<Long> applicationIds
    );

    /**
     * The published decision for one application belonging to one
     * candidate.
     *
     * <p>Three conditions in one query, so a candidate cannot read a
     * decision that is not theirs and cannot read a draft at all. A
     * draft is not "hidden" by the DTO; it is never loaded.
     */
    @Query("SELECT d FROM HiringDecision d "
            + "JOIN FETCH d.jobApplication a "
            + "JOIN FETCH a.jobPosting j "
            + "JOIN FETCH j.recruiter "
            + "WHERE a.id = :applicationId "
            + "AND a.candidate.id = :candidateId "
            + "AND d.publicationStatus = com.aiinterview.entity.PublicationStatus.PUBLISHED")
    Optional<HiringDecision> findPublishedForCandidate(
            @Param("applicationId") Long applicationId,
            @Param("candidateId") Long candidateId
    );

    /**
     * Every published decision for one candidate, so their
     * applications list can show outcomes without a query per row.
     */
    @Query("SELECT d FROM HiringDecision d "
            + "WHERE d.jobApplication.candidate.id = :candidateId "
            + "AND d.publicationStatus = com.aiinterview.entity.PublicationStatus.PUBLISHED")
    List<HiringDecision> findPublishedForCandidate(@Param("candidateId") Long candidateId);
}
