package com.aiinterview.repository;

import com.aiinterview.entity.HiringDecisionEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * The audit trail of hiring decisions.
 *
 * <p>Append-only by convention: nothing in the application updates or
 * deletes an event, which is what makes the trail worth keeping.
 */
public interface HiringDecisionEventRepository
        extends JpaRepository<HiringDecisionEvent, Long> {

    /** One decision's history, oldest first - the order it happened. */
    List<HiringDecisionEvent> findByHiringDecisionIdOrderByCreatedAtAsc(Long hiringDecisionId);
}
