package com.aiinterview.service;

import com.aiinterview.dto.InterviewHistoryItemDto;
import com.aiinterview.dto.InterviewProgressResponse;
import com.aiinterview.dto.ProgressTrend;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.impl.InterviewProgressServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Covers the progress calculation: Tests 4 to 8 of the module spec.
 */
@ExtendWith(MockitoExtension.class)
class InterviewProgressServiceTest {

    private static final String EMAIL = "candidate@example.com";

    private static final Long USER_ID = 7L;

    @Mock
    private InterviewSessionRepository interviewSessionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private InterviewProgressServiceImpl progressService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(USER_ID).email(EMAIL).build();
    }

    // ========================================================
    // Helpers
    // ========================================================

    /**
     * A completed session. Started times are spaced a day apart in the
     * order given so the chronological ordering is unambiguous.
     */
    private InterviewSession completed(int dayOffset, Integer score) {

        return InterviewSession.builder()
                .id((long) dayOffset)
                .sessionId("session-" + dayOffset)
                .user(user)
                .status(InterviewSession.STATUS_COMPLETED)
                .score(score)
                .startedAt(LocalDateTime.of(2026, 1, 1, 9, 0).plusDays(dayOffset))
                .completedAt(LocalDateTime.of(2026, 1, 1, 10, 0).plusDays(dayOffset))
                .build();
    }

    /**
     * The repository returns them oldest first, as the query says.
     */
    private void givenCompleted(InterviewSession... sessions) {

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.of(user));

        when(interviewSessionRepository.findByUserIdAndStatusOrderByStartedAtAsc(
                eq(USER_ID),
                eq(InterviewSession.STATUS_COMPLETED)
        )).thenReturn(List.of(sessions));
    }

    // ========================================================
    // Test 4 - first interview
    // ========================================================

    @Test
    @DisplayName("A single interview is a baseline, not a trend")
    void firstInterview() {

        givenCompleted(completed(1, 70));

        InterviewProgressResponse progress = progressService.getProgress(EMAIL);

        assertEquals(1, progress.getTotalInterviews());
        assertEquals(70, progress.getLatestScore());
        assertNull(progress.getPreviousScore());
        assertNull(progress.getScoreDifference());
        assertEquals(70, progress.getBestScore());
        assertEquals(ProgressTrend.FIRST_INTERVIEW, progress.getTrend());
    }

    // ========================================================
    // Test 5 - improved
    // ========================================================

    @Test
    @DisplayName("A higher latest score reads as improving")
    void improving() {

        givenCompleted(completed(1, 70), completed(2, 82));

        InterviewProgressResponse progress = progressService.getProgress(EMAIL);

        assertEquals(82, progress.getLatestScore());
        assertEquals(70, progress.getPreviousScore());
        assertEquals(12, progress.getScoreDifference());
        assertEquals(82, progress.getBestScore());
        assertEquals(ProgressTrend.IMPROVING, progress.getTrend());
    }

    // ========================================================
    // Test 6 - decreased
    // ========================================================

    @Test
    @DisplayName("A lower latest score reads as decreasing, and best score stands")
    void decreasing() {

        givenCompleted(completed(1, 82), completed(2, 75));

        InterviewProgressResponse progress = progressService.getProgress(EMAIL);

        assertEquals(75, progress.getLatestScore());
        assertEquals(82, progress.getPreviousScore());
        assertEquals(-7, progress.getScoreDifference());

        // The best score is a personal best, not the most recent one.
        assertEquals(82, progress.getBestScore());
        assertEquals(ProgressTrend.DECREASING, progress.getTrend());
    }

    // ========================================================
    // Test 7 - stable
    // ========================================================

    @Test
    @DisplayName("An unchanged score reads as stable")
    void stable() {

        givenCompleted(completed(1, 75), completed(2, 75));

        InterviewProgressResponse progress = progressService.getProgress(EMAIL);

        assertEquals(0, progress.getScoreDifference());
        assertEquals(ProgressTrend.STABLE, progress.getTrend());
    }

    // ========================================================
    // Test 8 - several interviews
    // ========================================================

    @Test
    @DisplayName("Several interviews are ordered oldest first with per-interview change")
    void multipleInterviews() {

        givenCompleted(
                completed(1, 65),
                completed(2, 70),
                completed(3, 78),
                completed(4, 84)
        );

        InterviewProgressResponse progress = progressService.getProgress(EMAIL);

        assertEquals(4, progress.getTotalInterviews());
        assertEquals(4, progress.getScoredInterviews());
        assertEquals(84, progress.getLatestScore());
        assertEquals(78, progress.getPreviousScore());
        assertEquals(6, progress.getScoreDifference());
        assertEquals(84, progress.getBestScore());

        // (65 + 70 + 78 + 84) / 4 = 74.25 -> 74
        assertEquals(74, progress.getAverageScore());

        List<InterviewHistoryItemDto> interviews = progress.getInterviews();

        assertEquals(
                List.of("session-1", "session-2", "session-3", "session-4"),
                interviews.stream().map(InterviewHistoryItemDto::getSessionId).toList()
        );

        // The first has nothing to compare against; the rest do.
        assertNull(interviews.get(0).getScoreChange());
        assertEquals(5, interviews.get(1).getScoreChange());
        assertEquals(8, interviews.get(2).getScoreChange());
        assertEquals(6, interviews.get(3).getScoreChange());
    }

    // ========================================================
    // Ungraded interviews
    // ========================================================

    @Test
    @DisplayName("An ungraded interview is listed but never scored or compared")
    void ungradedInterviewIsExcludedFromComparison() {

        // The middle interview failed to grade, so it has no score.
        givenCompleted(
                completed(1, 70),
                completed(2, null),
                completed(3, 76)
        );

        InterviewProgressResponse progress = progressService.getProgress(EMAIL);

        // It still happened, so it is counted and listed.
        assertEquals(3, progress.getTotalInterviews());
        assertEquals(3, progress.getInterviews().size());

        // But it takes no part in any score maths: the comparison
        // reaches past it to the last interview that was graded.
        assertEquals(2, progress.getScoredInterviews());
        assertEquals(76, progress.getLatestScore());
        assertEquals(70, progress.getPreviousScore());
        assertEquals(6, progress.getScoreDifference());
        assertEquals(73, progress.getAverageScore());
        assertEquals(ProgressTrend.IMPROVING, progress.getTrend());

        assertNull(progress.getInterviews().get(1).getScoreChange());
        assertEquals(6, progress.getInterviews().get(2).getScoreChange());
    }

    @Test
    @DisplayName("No scored interviews reports no data rather than a flat trend")
    void noScoresAtAll() {

        givenCompleted(completed(1, null));

        InterviewProgressResponse progress = progressService.getProgress(EMAIL);

        assertEquals(1, progress.getTotalInterviews());
        assertEquals(0, progress.getScoredInterviews());
        assertNull(progress.getLatestScore());
        assertNull(progress.getBestScore());
        assertNull(progress.getAverageScore());
        assertEquals(ProgressTrend.NO_DATA, progress.getTrend());
    }

    @Test
    @DisplayName("A candidate with no interviews gets an empty progress report")
    void noInterviews() {

        givenCompleted();

        InterviewProgressResponse progress = progressService.getProgress(EMAIL);

        assertEquals(0, progress.getTotalInterviews());
        assertEquals(ProgressTrend.NO_DATA, progress.getTrend());
        assertTrue(progress.getInterviews().isEmpty());
    }

    // ========================================================
    // History
    // ========================================================

    @Test
    @DisplayName("History reads newest first and keeps each score change")
    void historyIsNewestFirst() {

        givenCompleted(completed(1, 65), completed(2, 70), completed(3, 78));

        List<InterviewHistoryItemDto> history = progressService.getHistory(EMAIL);

        assertEquals(
                List.of("session-3", "session-2", "session-1"),
                history.stream().map(InterviewHistoryItemDto::getSessionId).toList()
        );

        // Reversing the list must not reverse the comparisons with it.
        assertEquals(8, history.get(0).getScoreChange());
        assertEquals(5, history.get(1).getScoreChange());
        assertNull(history.get(2).getScoreChange());
    }

    // ========================================================
    // Test 9 - user isolation
    // ========================================================

    @Test
    @DisplayName("Progress is only ever queried for the authenticated user's own id")
    void queriesOnlyTheAuthenticatedUsersInterviews() {

        givenCompleted(completed(1, 70));

        progressService.getProgress(EMAIL);

        // No user id crosses the API, so the only id that can reach
        // the query is the one resolved from the authenticated email.
        org.mockito.Mockito.verify(interviewSessionRepository)
                .findByUserIdAndStatusOrderByStartedAtAsc(
                        eq(USER_ID),
                        eq(InterviewSession.STATUS_COMPLETED)
                );
    }

    @Test
    @DisplayName("An unknown user is rejected rather than answered with someone else's data")
    void unknownUserIsRejected() {

        when(userRepository.findByEmail(EMAIL)).thenReturn(Optional.empty());

        assertThrows(
                ResourceNotFoundException.class,
                () -> progressService.getProgress(EMAIL)
        );
    }
}
