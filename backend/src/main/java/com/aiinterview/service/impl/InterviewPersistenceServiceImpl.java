package com.aiinterview.service.impl;

import com.aiinterview.entity.InterviewSession;
import com.aiinterview.entity.InterviewTurn;
import com.aiinterview.entity.Resume;
import com.aiinterview.entity.User;
import com.aiinterview.repository.InterviewSessionRepository;
import com.aiinterview.repository.ResumeRepository;
import com.aiinterview.repository.UserRepository;
import com.aiinterview.service.InterviewPersistenceService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Persists interviews as the AI service reports them.
 *
 * <p>A separate bean with its own transaction, for the same reason
 * {@code ResumeAnalysisServiceImpl} is one. When a best-effort write
 * shares the caller's transaction, a failed insert marks that
 * transaction rollback-only; the caller catches the exception and
 * carries on, and the commit then fails with "Transaction silently
 * rolled back" - turning a survivable persistence problem into a
 * failed request. {@code AiProxyController} runs no transaction of its
 * own, so each method below begins and ends one, and a failure here
 * can reach no further than the row it was writing.
 *
 * <p>Nothing in this class throws at the caller on purpose: every
 * method either records what it was given or logs why it could not.
 * The exception is an unexpected failure, which propagates so the
 * controller can log it - never so the request fails.
 */
@Service
@RequiredArgsConstructor
public class InterviewPersistenceServiceImpl implements InterviewPersistenceService {

    private static final Logger log =
            LoggerFactory.getLogger(InterviewPersistenceServiceImpl.class);

    private final InterviewSessionRepository interviewSessionRepository;
    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;
    private final ObjectMapper objectMapper;

    // ========================================================
    // Start
    // ========================================================

    @Override
    @Transactional
    public void recordStart(
            String userEmail,
            JsonNode request,
            JsonNode aiResponse
    ) {

        String sessionId = sessionIdOf(aiResponse);

        if (sessionId == null) {
            log.warn("AI start response carried no session_id; nothing to persist");
            return;
        }

        // A retried start must not create a second row for the same
        // interview; session_id is unique and the insert would fail.
        if (interviewSessionRepository.findBySessionId(sessionId).isPresent()) {
            log.debug("Interview session {} is already stored", sessionId);
            return;
        }

        User user = userRepository.findByEmail(userEmail).orElse(null);

        if (user == null) {
            log.warn(
                    "No user for {}, cannot store interview session {}",
                    userEmail,
                    sessionId
            );
            return;
        }

        InterviewSession session = InterviewSession.builder()
                .sessionId(sessionId)
                .user(user)
                .resume(resolveResume(request, user))
                .jobDescription(text(request, "job_description"))
                .status(InterviewSession.STATUS_ACTIVE)
                .startedAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        JsonNode question = aiResponse.get("question");

        if (question != null) {
            session.addTurn(toTurn(question));
        }

        session.setQuestionCount(session.getTurns().size());
        session.setCurrentQuestionNumber(session.getTurns().size());

        interviewSessionRepository.save(session);

        log.info(
                "Stored interview session {} for user {}",
                sessionId,
                user.getId()
        );
    }

    // ========================================================
    // Answer
    // ========================================================

    @Override
    @Transactional
    public void recordAnswer(
            String userEmail,
            JsonNode request,
            JsonNode aiResponse
    ) {

        String sessionId = text(request, "session_id");

        InterviewSession session = loadOwnedSession(userEmail, sessionId);

        if (session == null) {
            return;
        }

        String answer = text(request, "answer");

        InterviewTurn answered = session.currentUnansweredTurn();

        if (answered == null) {
            // The transcript and the live session have drifted apart -
            // worth knowing about, but the next question below is
            // still worth keeping.
            log.warn(
                    "Interview session {} had no unanswered question to record against",
                    sessionId
            );
        } else {
            answered.setAnswer(answer);
            answered.setAnsweredAt(LocalDateTime.now());
            answered.setAnswerMode(text(request, "answer_mode"));
        }

        JsonNode nextQuestion = aiResponse.get("question");

        if (nextQuestion != null) {
            session.addTurn(toTurn(nextQuestion));
        }

        session.setQuestionCount(session.getTurns().size());
        session.setCurrentQuestionNumber(session.getTurns().size());
        session.setUpdatedAt(LocalDateTime.now());

        interviewSessionRepository.save(session);

        log.debug(
                "Stored answer for interview session {} ({} turns)",
                sessionId,
                session.getTurns().size()
        );
    }

    // ========================================================
    // Finish
    // ========================================================

    @Override
    @Transactional
    public void recordFinish(
            String userEmail,
            JsonNode request,
            JsonNode aiResponse
    ) {

        String sessionId = text(request, "session_id");

        InterviewSession session = loadOwnedSession(userEmail, sessionId);

        if (session == null) {
            return;
        }

        if (session.isCompleted()) {
            log.debug("Interview session {} is already completed", sessionId);
            return;
        }

        // evaluated=false means grading did not run and the scores are
        // zeros. Storing that zero would be recorded as a real result:
        // it would drag the candidate's best score and trend down for
        // an interview that was never graded. Null keeps it out of the
        // progress calculation entirely.
        // Absent counts as not evaluated: a response that does not say
        // it graded the interview has not earned a stored score.
        boolean evaluated = Boolean.TRUE.equals(bool(aiResponse, "evaluated"));

        session.setScore(evaluated ? integer(aiResponse, "overall_score") : null);
        session.setFeedbackSummary(summaryOf(aiResponse, evaluated));
        session.setFeedbackJson(toJson(aiResponse));
        session.setStatus(InterviewSession.STATUS_COMPLETED);
        session.setCompletedAt(LocalDateTime.now());
        session.setUpdatedAt(LocalDateTime.now());

        Integer totalQuestions = integer(aiResponse, "total_questions");

        if (totalQuestions != null) {
            session.setQuestionCount(totalQuestions);
        }

        interviewSessionRepository.save(session);

        log.info(
                "Completed interview session {} with score {}",
                sessionId,
                session.getScore()
        );
    }

    // ========================================================
    // Internals
    // ========================================================

    /**
     * Finds a session and refuses it unless the authenticated user
     * owns it.
     *
     * <p>The session id travels through the browser, so it must never
     * be enough on its own to write into somebody else's interview.
     */
    private InterviewSession loadOwnedSession(String userEmail, String sessionId) {

        if (sessionId == null) {
            log.warn("Interview request carried no session_id; nothing to persist");
            return null;
        }

        InterviewSession session =
                interviewSessionRepository.findBySessionId(sessionId).orElse(null);

        if (session == null) {
            // Normal for interviews that began before this feature
            // existed, or whose start could not be stored.
            log.debug("No stored interview session {}", sessionId);
            return null;
        }

        User user = userRepository.findByEmail(userEmail).orElse(null);

        if (user == null || !user.getId().equals(session.getUser().getId())) {
            log.warn(
                    "User {} does not own interview session {}; refusing to modify it",
                    userEmail,
                    sessionId
            );
            return null;
        }

        return session;
    }

    /**
     * Resolves the resume the interview was run against.
     *
     * <p>The id comes from the browser, where it is only a
     * sessionStorage value - {@code CVUpload} even falls back to
     * {@code Date.now()} when an upload returns no id. It is therefore
     * looked up scoped to the owner, and anything that does not
     * resolve to a resume this user owns is stored as no resume at
     * all rather than failing the interview over a foreign key.
     */
    private Resume resolveResume(JsonNode request, User user) {

        Long resumeId = resumeId(request);

        if (resumeId == null) {
            return null;
        }

        Resume resume = resumeRepository
                .findByIdAndUserId(resumeId, user.getId())
                .orElse(null);

        if (resume == null) {
            log.debug(
                    "Resume {} is not owned by user {}; storing interview without one",
                    resumeId,
                    user.getId()
            );
        }

        return resume;
    }

    private InterviewTurn toTurn(JsonNode question) {

        return InterviewTurn.builder()
                .question(text(question, "question"))
                .category(text(question, "category"))
                .difficulty(text(question, "difficulty"))
                .reason(text(question, "reason"))
                .followUp(bool(question, "is_follow_up"))
                .build();
    }

    /**
     * A one-line summary for history lists. When grading failed the
     * reason is more useful than an empty line.
     */
    private String summaryOf(JsonNode aiResponse, boolean evaluated) {

        if (!evaluated) {
            String error = text(aiResponse, "evaluation_error");
            return error == null ? "This interview could not be graded." : error;
        }

        JsonNode strengths = aiResponse.get("strengths");

        if (strengths != null && strengths.isArray() && !strengths.isEmpty()) {
            return strengths.get(0).asText(null);
        }

        return null;
    }

    private String toJson(JsonNode aiResponse) {

        try {
            return objectMapper.writeValueAsString(aiResponse);
        } catch (Exception e) {
            // The scorecard is worth having but not worth losing the
            // completed status over.
            log.warn("Could not serialize interview scorecard: {}", e.getMessage());
            return null;
        }
    }

    private static String sessionIdOf(JsonNode aiResponse) {

        String sessionId = text(aiResponse, "session_id");

        if (sessionId != null) {
            return sessionId;
        }

        // Older start responses only carried it on the question.
        return text(aiResponse.get("question"), "session_id");
    }

    private static Long resumeId(JsonNode request) {

        for (String field : List.of("resume_id", "resumeId")) {

            JsonNode value = request == null ? null : request.get(field);

            if (value == null || value.isNull()) {
                continue;
            }

            if (value.canConvertToLong()) {
                return value.asLong();
            }

            // Sent as a string by some callers.
            try {
                return Long.parseLong(value.asText().trim());
            } catch (NumberFormatException ignored) {
                // Not an id; treated as absent.
            }
        }

        return null;
    }

    /**
     * Null-safe field read. {@code JsonNode.asText()} answers the
     * string "null" for a JSON null, which would otherwise be stored
     * as literal text.
     */
    private static String text(JsonNode node, String field) {

        JsonNode value = node == null ? null : node.get(field);

        if (value == null || value.isNull() || !value.isValueNode()) {
            return null;
        }

        String text = value.asText();

        return text.isBlank() ? null : text;
    }

    private static Integer integer(JsonNode node, String field) {

        JsonNode value = node == null ? null : node.get(field);

        return value != null && value.isNumber() ? value.asInt() : null;
    }

    private static Boolean bool(JsonNode node, String field) {

        JsonNode value = node == null ? null : node.get(field);

        return value != null && value.isBoolean() ? value.asBoolean() : null;
    }
}
