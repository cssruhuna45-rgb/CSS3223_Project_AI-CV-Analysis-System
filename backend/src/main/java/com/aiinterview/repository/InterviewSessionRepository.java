package com.aiinterview.repository;

import com.aiinterview.entity.InterviewSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

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
     * Every candidate's interviews, newest first, for the recruiter
     * dashboard.
     *
     * <p>Deliberately not scoped to one user: this is the only query
     * that crosses candidates, so the endpoint exposing it has to be
     * restricted to recruiters.
     *
     * <p>The candidate is fetched in the same query. Without the join
     * the dashboard would fire one extra select per row just to read
     * each candidate's name.
     */
    @Query("SELECT s FROM InterviewSession s "
            + "JOIN FETCH s.user "
            + "ORDER BY s.startedAt DESC")
    List<InterviewSession> findAllWithUser();
}
