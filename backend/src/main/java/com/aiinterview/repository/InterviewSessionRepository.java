package com.aiinterview.repository;

import com.aiinterview.entity.InterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface InterviewSessionRepository
        extends JpaRepository<InterviewSession, Long> {

    /**
     * Looks a session up by the AI service's identifier, which is what
     * the answer and finish calls carry.
     */
    Optional<InterviewSession> findBySessionId(String sessionId);

    /**
     * Newest first - the order the history page shows.
     */
    List<InterviewSession> findByUserIdOrderByStartedAtDesc(Long userId);

    /**
     * Oldest first, for progress: the trend is read forwards through
     * time, and "previous score" means the one before the latest.
     *
     * <p>Scoped by user id as well as status so a caller cannot ask
     * for somebody else's interviews by accident.
     */
    List<InterviewSession> findByUserIdAndStatusOrderByStartedAtAsc(
            Long userId,
            String status
    );

    /**
     * The interviews one recruiter may see, newest first: those taken
     * through an invite code to one of that recruiter's own jobs.
     *
     * <p>This is the only query that crosses candidates, and it is
     * scoped by the recruiter. It used to return every interview on the
     * platform, so any recruiter saw every candidate - including people
     * practising on their own who had shared nothing. An interview with
     * no job is now never returned here, and the exam-mode condition is
     * a second guard: a practice answer, revised after reading the model
     * answer, is not something a recruiter should judge.
     *
     * <p>Candidate and job are fetched in the same query so the
     * dashboard does not fire an extra select per row to read them.
     */
    @Query("SELECT s FROM InterviewSession s "
            + "JOIN FETCH s.user "
            + "JOIN FETCH s.jobPosting j "
            + "WHERE j.recruiter.id = :recruiterId "
            + "AND s.mode = 'exam' "
            + "ORDER BY s.startedAt DESC")
    List<InterviewSession> findForRecruiter(@Param("recruiterId") Long recruiterId);

    /**
     * Whether this candidate already finished an interview for this
     * job. One completed attempt per job: a candidate who could retake
     * it until the score looked good would make the comparison
     * between candidates meaningless.
     */
    boolean existsByUserIdAndJobPostingIdAndStatus(
            Long userId,
            Long jobPostingId,
            String status
    );

    /**
     * Whether this user has a job interview that is still running -
     * started or answered since {@code since}. Expected answers are
     * refused while one is, so they cannot be read during the exam.
     */
    boolean existsByUserIdAndJobPostingIsNotNullAndStatusAndUpdatedAtAfter(
            Long userId,
            String status,
            LocalDateTime since
    );

    /**
     * Per job of one recruiter: [job id, interviews, completed].
     */
    @Query("SELECT s.jobPosting.id, COUNT(s), "
            + "SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) "
            + "FROM InterviewSession s "
            + "WHERE s.jobPosting.recruiter.id = :recruiterId "
            + "GROUP BY s.jobPosting.id")
    List<Object[]> countByJobForRecruiter(@Param("recruiterId") Long recruiterId);
}
