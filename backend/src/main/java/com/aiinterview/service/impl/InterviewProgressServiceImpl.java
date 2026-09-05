package com.aiinterview.service.impl;

import com.aiinterview.dto.InterviewHistoryItemDto;
import com.aiinterview.dto.InterviewProgressResponse;
import com.aiinterview.dto.ProgressTrend;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.InterviewProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Turns a candidate's stored interviews into history and progress.
 *
 * <p>All of the comparison logic lives here rather than in the
 * controller, and reads only from the database - never from anything
 * the browser reports - so the numbers survive a restart of every
 * service and cannot be influenced by the caller.
 */
@Service
@RequiredArgsConstructor
public class InterviewProgressServiceImpl implements InterviewProgressService {

    private final InterviewSessionRepository interviewSessionRepository;
    private final UserRepository userRepository;

    // ========================================================
    // History
    // ========================================================

    @Override
    @Transactional(readOnly = true)
    public List<InterviewHistoryItemDto> getHistory(String userEmail) {

        List<InterviewHistoryItemDto> chronological =
                toChronologicalDtos(completedSessions(userEmail));

        // Stored oldest first so each entry can be compared with the
        // one before it; the list reads newest first.
        Collections.reverse(chronological);

        return chronological;
    }

    // ========================================================
    // Progress
    // ========================================================

    @Override
    @Transactional(readOnly = true)
    public InterviewProgressResponse getProgress(String userEmail) {

        List<InterviewSession> completed = completedSessions(userEmail);

        List<InterviewHistoryItemDto> chronological =
                toChronologicalDtos(completed);

        // An interview that could not be graded is still an interview
        // the candidate sat, so it stays in the list and in the total.
        // It carries no score, so it takes no part in the comparison.
        List<Integer> scores = chronological.stream()
                .map(InterviewHistoryItemDto::getScore)
                .filter(java.util.Objects::nonNull)
                .toList();

        Integer latest = scores.isEmpty()
                ? null
                : scores.get(scores.size() - 1);

        Integer previous = scores.size() < 2
                ? null
                : scores.get(scores.size() - 2);

        Integer difference = (latest == null || previous == null)
                ? null
                : latest - previous;

        return InterviewProgressResponse.builder()
                .totalInterviews(completed.size())
                .scoredInterviews(scores.size())
                .latestScore(latest)
                .previousScore(previous)
                .bestScore(scores.stream().max(Integer::compareTo).orElse(null))
                .averageScore(average(scores))
                .scoreDifference(difference)
                .trend(trendOf(scores.size(), difference))
                .interviews(chronological)
                .build();
    }

    // ========================================================
    // Calculation
    // ========================================================

    /**
     * The trend is about the last two scored interviews only.
     *
     * <p>One score is a baseline rather than a direction, and no
     * scores at all is not a flat line - both say so explicitly
     * instead of reporting STABLE, which would read as "you are
     * holding steady" to someone who has never been graded.
     */
    private static ProgressTrend trendOf(int scoredCount, Integer difference) {

        if (scoredCount == 0) {
            return ProgressTrend.NO_DATA;
        }

        if (difference == null) {
            return ProgressTrend.FIRST_INTERVIEW;
        }

        if (difference > 0) {
            return ProgressTrend.IMPROVING;
        }

        if (difference < 0) {
            return ProgressTrend.DECREASING;
        }

        return ProgressTrend.STABLE;
    }

    private static Integer average(List<Integer> scores) {

        if (scores.isEmpty()) {
            return null;
        }

        double mean = scores.stream()
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0);

        return (int) Math.round(mean);
    }

    /**
     * Maps oldest first, filling in each interview's change against
     * the previous <em>scored</em> one.
     *
     * <p>Skipping ungraded interviews when carrying the previous score
     * forward keeps a failed grading from showing up as a dramatic
     * drop and then an equally false recovery.
     */
    private static List<InterviewHistoryItemDto> toChronologicalDtos(
            List<InterviewSession> sessions
    ) {

        List<InterviewHistoryItemDto> items = new ArrayList<>(sessions.size());

        Integer previousScore = null;

        for (InterviewSession session : sessions) {

            Integer score = session.getScore();

            Integer change = (score == null || previousScore == null)
                    ? null
                    : score - previousScore;

            items.add(InterviewHistoryItemDto.builder()
                    .sessionId(session.getSessionId())
                    .score(score)
                    .status(session.getStatus())
                    .scoreChange(change)
                    .feedbackSummary(session.getFeedbackSummary())
                    .startedAt(session.getStartedAt())
                    .completedAt(session.getCompletedAt())
                    .build());

            if (score != null) {
                previousScore = score;
            }
        }

        return items;
    }

    // ========================================================
    // Internals
    // ========================================================

    /**
     * This user's completed interviews, oldest first.
     *
     * <p>The query is scoped by the id of the authenticated user, so
     * there is no path here that can reach another candidate's rows.
     */
    private List<InterviewSession> completedSessions(String userEmail) {

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found: " + userEmail
                ));

        return interviewSessionRepository
                .findByUserIdAndStatusOrderByStartedAtAsc(
                        user.getId(),
                        InterviewSession.STATUS_COMPLETED
                );
    }
}
