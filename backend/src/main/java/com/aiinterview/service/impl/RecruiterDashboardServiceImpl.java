package com.aiinterview.service.impl;

import com.aiinterview.dto.RecruiterCandidateDto;
import com.aiinterview.dto.RecruiterOverviewResponse;
import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.InterviewTurn;
import com.aiinterview.entity.User;
import com.aiinterview.exception.ResourceNotFoundException;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.RecruiterDashboardService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Builds the recruiter dashboard from stored interviews.
 *
 * <p>Until interviews were persisted this page rendered a hardcoded
 * array of six invented candidates. Everything here comes from
 * interview_sessions instead - and only the ones taken through an
 * invite code to this recruiter's own jobs.
 */
@Service
@RequiredArgsConstructor
public class RecruiterDashboardServiceImpl implements RecruiterDashboardService {

    private static final Logger log =
            LoggerFactory.getLogger(RecruiterDashboardServiceImpl.class);

    /**
     * Job descriptions are free text and often several lines. The
     * dashboard shows one line per row, so take the first sentence and
     * cap it.
     */
    private static final int MAX_ROLE_LENGTH = 70;

    private final InterviewSessionRepository interviewSessionRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional(readOnly = true)
    public RecruiterOverviewResponse getOverview(String recruiterEmail, Long jobId) {

        User recruiter = userRepository.findByEmail(recruiterEmail)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User not found: " + recruiterEmail
                ));

        // Scoped by the recruiter id from the token. The optional job
        // filter narrows within that set and so can never widen it: a
        // job id belonging to someone else simply matches nothing.
        List<InterviewSession> sessions =
                interviewSessionRepository.findForRecruiter(recruiter.getId())
                        .stream()
                        .filter(s -> jobId == null
                                || (s.getJobPosting() != null
                                && jobId.equals(s.getJobPosting().getId())))
                        .toList();

        List<RecruiterCandidateDto> candidates = new ArrayList<>();

        Set<Long> candidateIds = new HashSet<>();

        int completed = 0;
        int inProgress = 0;
        long scoreTotal = 0;
        int scoredCount = 0;

        for (InterviewSession session : sessions) {

            if (session.getUser() != null) {
                candidateIds.add(session.getUser().getId());
            }

            String status = session.getStatus();

            if ("completed".equals(status)) {
                completed++;
            } else if ("active".equals(status)) {
                inProgress++;
            }

            // Only graded interviews count towards the average. An
            // unfinished one is not a zero.
            if (session.getScore() != null) {
                scoreTotal += session.getScore();
                scoredCount++;
            }

            candidates.add(toDto(session));
        }

        return RecruiterOverviewResponse.builder()
                .totalCandidates(candidateIds.size())
                .totalInterviews(sessions.size())
                .completedInterviews(completed)
                .inProgressInterviews(inProgress)
                .averageScore(
                        scoredCount == 0
                                ? null
                                : Math.round((float) scoreTotal / scoredCount)
                )
                .candidates(candidates)
                .build();
    }

    // ========================================================
    // Mapping
    // ========================================================

    private RecruiterCandidateDto toDto(InterviewSession session) {

        return RecruiterCandidateDto.builder()
                .id(session.getId())
                .candidateName(
                        session.getUser() == null
                                ? "Unknown candidate"
                                : session.getUser().getName()
                )
                .candidateEmail(
                        session.getUser() == null
                                ? null
                                : session.getUser().getEmail()
                )
                .role(
                        session.getJobPosting() != null
                                ? session.getJobPosting().getTitle()
                                : roleFrom(session.getJobDescription())
                )
                .jobId(session.getJobPosting() == null ? null : session.getJobPosting().getId())
                .status(session.getStatus())
                .score(session.getScore())
                .questionCount(
                        session.getQuestionCount() == null
                                ? 0
                                : session.getQuestionCount()
                )
                .answeredCount(answeredCount(session))
                .startedAt(session.getStartedAt())
                .completedAt(session.getCompletedAt())
                .categoryScores(categoryScores(session))
                .leftPageCount(sum(session, InterviewTurn::getLeftPageCount))
                .awaySeconds(sum(session, InterviewTurn::getAwaySeconds))
                .pasteCount(sum(session, InterviewTurn::getPasteCount))
                .pastedChars(sum(session, InterviewTurn::getPastedChars))
                .build();
    }

    /**
     * One integrity signal added up over the answers that recorded it.
     * Null when no answer did - "not recorded" must not show as 0,
     * which would read as "watched, and nothing happened".
     */
    private static Integer sum(
            InterviewSession session,
            java.util.function.Function<InterviewTurn, Integer> field
    ) {

        if (session.getTurns() == null) {
            return null;
        }

        Integer total = null;

        for (InterviewTurn turn : session.getTurns()) {
            Integer value = field.apply(turn);
            if (value != null) {
                total = (total == null ? 0 : total) + value;
            }
        }

        return total;
    }

    /**
     * A readable role from the job description's opening line.
     */
    private String roleFrom(String jobDescription) {

        if (jobDescription == null || jobDescription.isBlank()) {
            return "Interview";
        }

        String first = jobDescription.strip().split("\\R", 2)[0].strip();

        int stop = first.indexOf('.');
        if (stop > 0) {
            first = first.substring(0, stop).strip();
        }

        if (first.length() > MAX_ROLE_LENGTH) {
            first = first.substring(0, MAX_ROLE_LENGTH).strip() + "…";
        }

        return first.isBlank() ? "Interview" : first;
    }

    /**
     * Questions the candidate actually answered, which is what the
     * turns carry - the last question of an interview is usually left
     * unanswered when they finish.
     */
    private int answeredCount(InterviewSession session) {

        if (session.getTurns() == null) {
            return 0;
        }

        int answered = 0;

        for (InterviewTurn turn : session.getTurns()) {
            if (turn.getAnswer() != null && !turn.getAnswer().isBlank()) {
                answered++;
            }
        }

        return answered;
    }

    /**
     * Pulls the per-category scores out of the stored scorecard.
     *
     * <p>feedback_json holds the AI service's whole finish response.
     * Anything unreadable there is skipped rather than failing the
     * dashboard: an old row from before the scorecard existed should
     * still list.
     */
    private List<RecruiterCandidateDto.CategoryScoreDto> categoryScores(
            InterviewSession session
    ) {

        String json = session.getFeedbackJson();

        if (json == null || json.isBlank()) {
            return List.of();
        }

        try {
            JsonNode scores = objectMapper.readTree(json).path("category_scores");

            if (!scores.isArray()) {
                return List.of();
            }

            List<RecruiterCandidateDto.CategoryScoreDto> result = new ArrayList<>();

            for (JsonNode node : scores) {
                result.add(
                        RecruiterCandidateDto.CategoryScoreDto.builder()
                                .key(node.path("key").asText(""))
                                .label(node.path("label").asText(""))
                                .score(
                                        node.path("score").isNumber()
                                                ? node.path("score").asInt()
                                                : null
                                )
                                .build()
                );
            }

            return result;

        } catch (Exception e) {
            log.debug(
                    "Could not read the scorecard for session {}: {}",
                    session.getId(),
                    e.getMessage()
            );
            return List.of();
        }
    }
}
